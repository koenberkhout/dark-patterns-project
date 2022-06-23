import { shuffle, union } from 'lodash-es';
import { performance } from 'perf_hooks';
import { getPublicSuffix, getDomain } from 'tldts';
import fse from 'fs-extra';
import emoji from 'node-emoji';
import { Config } from '../modules.js';

/**
 * [class] Bucket
 */
const Bucket = class {
  static createBuckets(useBuckets: boolean, excludePath: string, entries: {rank: number, domain: string}[]): {rank: number, domain: string}[][] {
    console.log(`${emoji.get('stopwatch')}  Creating buckets... `);
    const startTime = performance.now();
    const exclusions = this.getExclusions(excludePath);

    if (!useBuckets) {
      console.log(`${emoji.get('heavy_check_mark')} (${Math.round(performance.now() - startTime)} ms)`);
      const entriesExceptExclusions = entries.filter((entry) => !exclusions.includes(entry.domain));
      return [entriesExceptExclusions];
    }

    const buckets = [];
    for (let i = 0; i < Config.Bucket.RANGES.length && entries.length; i++) {
      const range = Config.Bucket.RANGES[i];
      const lastEntryIndex = range!.end - range!.start;
      const result = entries.splice(0, lastEntryIndex);

      const filtered = result
        .filter((entry) => {
          const { rank, domain } = entry;
          const tld = getPublicSuffix(domain);
          const isAllowedTld = Config.Bucket.ALLOWED_TLDS.includes(tld ?? 'undefined');
          return isAllowedTld
          && rank >= range!.start
          && rank <= range!.end
          && domain.length <= Config.Bucket.DOMAIN_LENGTH_LIMIT
          && !/\d/.test(domain)
          && !exclusions.includes(domain);
        });
      const shuffled = shuffle(filtered);
      const limitedBucketEntries = shuffled.slice(0, Config.Bucket.SIZE_LIMIT);
      buckets.push(limitedBucketEntries);
    }
    process.stdout.moveCursor(0, -1);
    console.log(`${emoji.get('heavy_check_mark')}  Creating buckets... (${Math.round(performance.now() - startTime)} ms)`);
    return buckets;
  }

  private static getExclusions(excludePath: string): string[] {
    if (!excludePath || !excludePath.length) {
      return [];
    }
    if (!fse.pathExistsSync(excludePath)) {
      throw new Error(`The exclusions file at ${excludePath} does not exist.`);
    }
    const exclusionsString = fse.readFileSync(excludePath).toString();
    if (exclusionsString.includes(';') || exclusionsString.includes(',')) {
      throw new Error('The list of exclusions should have one domain per line and nothing else.');
    }
    return exclusionsString
      .split(/\r?\n/)
      .map((entry) => entry.replace(/\s/g, ''))
      .filter((entry) => typeof entry === 'string' && !!entry.length && getDomain(entry) === entry)
      .map((entry) => getDomain(entry) ?? '')
      .filter((entry) => entry !== '');
  }
};
export default Bucket;
