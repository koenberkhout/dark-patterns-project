import got from 'got';
import chalk from 'chalk';
import { getHostname } from 'tldts';
import type { HorizontalTableRow } from 'cli-table3';
import { Config } from '../modules.js';

/**
 * [class] Reachability
 */
const Reachability = class {
  static async ensure(domain: string, tableRow: HorizontalTableRow): Promise<void> {
    try {
      const { statusCode, url } = await got(`https://${domain}`, {
        method: 'HEAD',
        timeout: { request: Config.Reachability.REQUEST_TIMEOUT * 1000 },
        retry: { limit: Config.Reachability.MAX_RETRIES },
        throwHttpErrors: false,
      });
      const finalHostname = getHostname(url);
      if (statusCode === 200 && finalHostname !== null && finalHostname.includes(domain)) {
        tableRow.push(chalk.green('v'));
        return;
      }
    // eslint-disable-next-line no-empty
    } catch (e) {}
    tableRow.push(chalk.red('x'));
    throw new Error('reachability');
  }
};
export default Reachability;
