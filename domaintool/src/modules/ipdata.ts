import maxmind, { CountryResponse, Reader } from 'maxmind';
import fse from 'fs-extra';
import IPCIDR from 'ip-cidr';
import chalk from 'chalk';
import emoji from 'node-emoji';
import { performance } from 'perf_hooks';
import type { HorizontalTableRow } from 'cli-table3';
import { Config } from '../modules.js';

/**
 * [class] IpData
 */
const IpData = class {
  ipRangesBlocklist: Array<[bigint, bigint]>;
  geoip!: Reader<CountryResponse>;

  constructor() {
    console.log(`${emoji.get('stopwatch')}  Parsing IP blocklists... `);
    const startTime = performance.now();

    this.ipRangesBlocklist = fse
      .readFileSync(Config.IpData.BLOCKLIST_PATH)
      .toString()
      .split(/\r?\n/)
      .map((line) => line.replace(/\s/g, ''))
      .filter((line) => !!line.trim())
      .map(IpData.toRange);

    process.stdout.moveCursor(0, -1);
    console.log(`${emoji.get('heavy_check_mark')}  Parsing IP blocklists... (${Math.round(performance.now() - startTime)} ms)`);
  }

  async init(): Promise<void> {
    this.geoip = await maxmind.open<CountryResponse>('../lib/geoip-country.mmdb');
  }

  private static toRange(ipOrCidr: string): [bigint, bigint] {
    const cidr = ipOrCidr.includes('/') ? ipOrCidr : `${ipOrCidr}/32`;
    const [low, high] = new IPCIDR(cidr).toRange({ type: 'bigInteger' }).map(BigInt);
    if (typeof low !== 'bigint' || typeof high !== 'bigint') {
      throw new Error('low and/or high is not of type \'bigint\', which implies that the blocklist is malformatted.');
    }
    return [low, high];
  }

  checkMultiple(ips: string[], tableRow: HorizontalTableRow): void {
    // eslint-disable-next-line no-restricted-syntax
    for (const ip of ips) {
      const continentCode = this.geoip.get(ip)?.continent?.code || 'UNKNOWN';
      if (!Config.IpData.ALLOWED_CONTINENTS.includes(continentCode)) {
        tableRow.push(chalk.red('x'));
        throw new Error('ipdata:continent');
      }
      const ipBigInt = IpData.ipToBigInt(ip);
      const ipOnBlocklist = this.ipRangesBlocklist.some((range) => {
        const [low, high] = range;
        return ipBigInt >= low && ipBigInt <= high;
      });
      if (ipOnBlocklist) {
        tableRow.push(chalk.red('x'));
        throw new Error('ipdata:blocklist');
      }
    }
    tableRow.push(chalk.green('v'));
  }

  private static ipToBigInt(ip: string): bigint {
    return BigInt(new IPCIDR(`${ip}/32`).address.bigInteger());
  }
};
export default IpData;
