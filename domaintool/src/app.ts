/* eslint-disable object-curly-newline */
// import { config } from 'dotenv';
import chalk from 'chalk';
import { performance } from 'perf_hooks';
import { chunk } from 'lodash-es';
import Table, { HorizontalTableRow } from 'cli-table3';
import emoji from 'node-emoji';
import Redis from 'ioredis';
import { sprintf } from 'sprintf-js';
import { EventEmitter } from 'events';
import { Queue, Worker, QueueScheduler, Job, QueueEvents } from 'bullmq';
import { Parser, Bucket, Reachability, Content, Dns, IpData, Config } from './modules.js';

const connection = Config.App.CONNECTION;

// // dotenv
// console.log(config({ path: '../.env' })?.parsed);

const App = class {
  private static readonly selectedDomainsDict: { [bucketIndex: string] : string[]; } = {};
  private static table: Table.Table;

  static async start() {
    const entries = Parser.getEntries(Config.App.SOURCE_FILE_PATH);
    const buckets = Bucket.createBuckets(Config.App.USE_BUCKETS, Config.App.EXCLUDE_PATH, entries);
    const { queue, queueEvents } = await this.init(buckets.length);

    // Check and select domains
    // eslint-disable-next-line no-restricted-syntax
    for (const [bucketIndex, bucketEntries] of buckets.entries()) {
      this.printBucketNumber(bucketIndex);
      const bucketChunks = chunk(bucketEntries, Config.App.CHUNK_SIZE);
      const { selectLimit } = Config.Bucket.RANGES[bucketIndex]!;

      // Process in chunks
      for (let chunkIndex = 0; chunkIndex < bucketChunks.length && this.selectedDomainsDict[bucketIndex]!.length < selectLimit; chunkIndex++) {
        const bucketChunk = bucketChunks[chunkIndex]!;
        console.log(chalk.underline.cyan(`\nbucket ${bucketIndex + 1}, chunk ${chunkIndex + 1}`));
        this.table = this.createTable();
        const jobs = await queue.addBulk(bucketChunk.map((chunkEntry, indexInChunk) => {
          const sequenceNumber = chunkIndex * Config.App.CHUNK_SIZE + indexInChunk + 1;
          const { rank, domain } = chunkEntry;
          this.table.push([sequenceNumber, rank, '', domain, '']);
          return { name: 'job', data: { indexInChunk, domain, bucketIndex, selectLimit } };
        }));
        console.log(this.table.toString());
        await Promise.allSettled(jobs.map((job) => job.waitUntilFinished(queueEvents)));
      }
      const selectedDomains = this.selectedDomainsDict[bucketIndex]!;
      console.log(selectedDomains);
      // this.printSqlInserts(selectedDomains, bucketEntries);
    }
    await queue.obliterate();
    await queue.close();
    // Dns.printTotalTimes();
  }

  static async printSqlInserts(selectedDomains: string[], bucketEntries: { rank: number, domain: string }[]) {
    // eslint-disable-next-line no-restricted-syntax
    for (const selectedDomain of selectedDomains) {
      const entry = bucketEntries.find((bucketEntry) => bucketEntry.domain === selectedDomain);
      const rank = entry?.rank ?? -1;
      console.log(`INSERT INTO \`website\` (\`rank\`, \`url\`) VALUES (${rank}, '${selectedDomain}');`);
    }
  }

  /**
   * Perform checks on domain
   * @param job
   * @param ipData
   * @returns domain and bucketIndex
   */
  static async doChecks(job: Job, ipData: InstanceType<typeof IpData>): Promise<void> {
    const startTime = performance.now();
    const { indexInChunk, domain, bucketIndex, selectLimit } = job.data;
    const tableRow = this.table[indexInChunk] as HorizontalTableRow;

    try {
      const ips = await Dns.check(domain, tableRow);
      ipData.checkMultiple(ips, tableRow);
      await Reachability.ensure(domain, tableRow);
      await Content.check(domain, tableRow);
      const selectedDomains: string[] = this.selectedDomainsDict[bucketIndex]!;
      if (selectedDomains.length < selectLimit) {
        selectedDomains.push(domain);
        tableRow.splice(2, 1, emoji.get('trophy'));
        tableRow.splice(3, 1, chalk.bold.green(domain));
        tableRow.push(chalk.gray(`${selectedDomains.length}/${selectLimit}`));
      } else {
        tableRow.splice(3, 1, chalk.green(domain));
      }
    } catch (e: any) {
      tableRow.splice(3, 1, chalk.red(domain));
    } finally {
      tableRow.splice(4, 1, sprintf('%5s ms', Math.round(performance.now() - startTime)));
      tableRow.push(...Array(20 - tableRow.length).fill(chalk.gray('-')));
      this.updateTable();
    }
  }

  /**
   * Create table
   * @returns table
   */
  static createTable(): Table.Table {
    const head: string[] = ['#', 'rank', '', 'domain', 'elapsed'];
    const colAligns: Table.HorizontalAlignment[] = ['right', 'right', 'center', 'left', 'right'];
    const colWidths: (number | null)[] = [5, 7, 4, 30, 9];
    Config.Dns.UPSTREAMS.forEach((_, i) => {
      head.push(`${i}`);
      colAligns.push('center');
      colWidths.push(null);
    });
    head.push('ipdata', 'reachable', 'parsable', 'iframeless', 'content-length', 'language', '');
    colAligns.push(...Array(6).fill('center'));
    colAligns.push('right');
    colWidths.push(...Array(6).fill(null));
    colWidths.push(10);

    return new Table({
      head: head.map((h) => chalk.bold(h)),
      rowAligns: Array(Config.App.CHUNK_SIZE + 1).fill('center'),
      colAligns,
      colWidths,
      style: { head: [], border: [], compact: true, 'padding-left': 0, 'padding-right': 0 },
      chars: { top: '', 'top-mid': '', 'top-left': '', 'top-right': '', bottom: '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': '', left: '', 'left-mid': '', mid: '', 'mid-mid': '', right: '', 'right-mid': '', middle: ' ' },
    });
  }

  /**
   * Initialize
   * @param numberOfBuckets
   * @returns queue, queueEvents
   */
  static async init(numberOfBuckets: number): Promise<{queue: Queue, queueEvents: QueueEvents}> {
    EventEmitter.setMaxListeners(Number.MAX_SAFE_INTEGER);
    await this.flushRedisDb();
    const { queue, queueEvents } = this.createQueue();
    const ipData = new IpData();
    await ipData.init();
    this.initSelectedDomainsDict(numberOfBuckets);
    this.createWorker(ipData);
    return { queue, queueEvents };
  }

  /**
   * Flush redis db
   */
  static async flushRedisDb(): Promise<void> {
    const redis = new Redis();
    await redis.flushdb();
    await redis.quit();
  }

  /**
   * Create job queue
   * @returns queue
   */
  static createQueue(): { queue: Queue, queueEvents: QueueEvents } {
    const queue = new Queue('main', {
      connection,
      defaultJobOptions: { removeOnComplete: true, removeOnFail: true },
    });
    // eslint-disable-next-line no-new
    new QueueScheduler('main', { connection });
    const queueEvents = new QueueEvents('main', { connection });
    return { queue, queueEvents };
  }

  /**
   * Create job worker
   */
  static createWorker(ipData: InstanceType<typeof IpData>): Worker {
    const workerOptionsRatelimited = { connection, limiter: { max: 1, duration: Config.App.RATE_LIMIT_MS }, concurrency: Config.App.CHUNK_SIZE };
    return new Worker('main', (job) => this.doChecks(job, ipData), workerOptionsRatelimited);
  }

  /**
   * Move cursor to the uppermost row
   * of the table, then reprint.
   */
  static updateTable() {
    process.stdout.moveCursor(0, -(Config.App.CHUNK_SIZE + 1));
    console.log(this.table.toString());
  }

  /**
   * Initialize selected domain 'dictionary'
   * @param numberOfBuckets
   */
  static initSelectedDomainsDict(numberOfBuckets: number): void {
    for (let i = 0; i < numberOfBuckets; i++) {
      const domains: string[] = [];
      this.selectedDomainsDict[i] = domains;
    }
  }

  /**
   * Print bucket icon + number
   * @param bucketIndex
   */
  static printBucketNumber(bucketIndex: number): void {
    const bucketNumber = `${bucketIndex + 1}`;
    const hashTags = chalk.cyan('#'.repeat(15 + bucketNumber.length));
    console.log(chalk.bold.cyan(`\n${hashTags}\n${emoji.get('bucket')}  BUCKET ${bucketNumber} ###\n${hashTags}`));
  }
};
export default App;
