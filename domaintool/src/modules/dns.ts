import { isIPv4 } from 'is-ip';
import { Resolver } from 'node:dns/promises';
import { uniq } from 'lodash-es';
import chalk from 'chalk';
import { performance } from 'node:perf_hooks';
import type { HorizontalTableRow } from 'cli-table3';
import { Config } from '../modules.js';

/**
 * [class] CustomResolver
 */
class CustomResolver extends Resolver {
  totalTime: number = 0;
  maxTime: number = 0;

  constructor(ips: string[]) {
    super({ timeout: Config.Dns.TIMEOUT * 1000, tries: Config.Dns.TRIES });
    super.setServers(ips);
  }

  async dig(domain: string): Promise<string[]> {
    const dnsStart = performance.now();
    try {
      const ips = await super.resolve4(domain);
      if (ips.length && ips.every((ip) => isIPv4(ip) && ip !== '0.0.0.0')) {
        return Promise.resolve(ips);
      }
      // eslint-disable-next-line no-empty
    } catch (e) {} finally {
      const elapsed = performance.now() - dnsStart;
      this.totalTime += elapsed;
      this.maxTime = Math.max(this.maxTime, elapsed);
    }
    return Promise.reject();
  }

  getTotalTime() {
    return this.totalTime;
  }

  getMaxTime() {
    return this.maxTime;
  }
}

/**
 * [class] Dns
 */
const Dns = class {
  static resolvers: CustomResolver[] = Config.Dns.UPSTREAMS.map((upstream) => new CustomResolver(upstream.ips));

  static async check(domain: string, tableRow: HorizontalTableRow): Promise<string[]> {
    let dnsOk = true;
    const ips: string[] = [];
    const results = await Promise.allSettled(this.resolvers.map((resolver) => resolver.dig(domain)));
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        tableRow.push(chalk.green('v'));
        ips.push(...result.value);
      } else {
        tableRow.push(chalk.red('x'));
        dnsOk = false;
      }
    });
    return dnsOk ? Promise.resolve(uniq(ips)) : Promise.reject(new Error('dns'));
  }

  static printTotalTimes() {
    this.resolvers.forEach((resolver, index) => console.log(`${index} => total: ${Math.round(resolver.getTotalTime())}, max: ${Math.round(resolver.getMaxTime())}`));
  }
};
export default Dns;
