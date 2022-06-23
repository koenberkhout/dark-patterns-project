import { getDomain, getHostname } from 'tldts';
import { performance } from 'perf_hooks';
import fse from 'fs-extra';
import emoji from 'node-emoji';

/**
 * [class] Parser
 */
const Parser = class {
  static getEntries(filePath: string): Array<{ rank: number, domain: string }> {
    if (!fse.pathExistsSync(filePath)) {
      throw new Error(`The source file at ${filePath} does not exist.`);
    }
    console.log(`${emoji.get('stopwatch')}  Reading entries from '${filePath}'... `);
    const startTime = performance.now();

    const entries = fse
      .readFileSync(filePath)
      .toString()
      .replace(/;/g, ',')
      .split(/\r?\n/)
      .map((entry) => entry.replace(/\s/g, ''))
      .filter((entry) => {
        const [rank, domain] = entry.split(',');
        return (
          typeof rank === 'string'
          && typeof domain === 'string'
          && !!rank.length
          && !!domain.length
          && /^\d+$/.test(rank)
          && getHostname(domain) === domain
        );
      })
      .map((entry) => {
        const [rank, domain] = entry.split(',');
        const parsedDomain = getDomain(domain!);
        return { rank: parseInt(`${rank}`, 10), domain: `${parsedDomain}` };
      });
    if (!entries.length) {
      throw new Error('The source file is empty or malformatted.');
    }
    process.stdout.moveCursor(0, -1);
    console.log(`${emoji.get('heavy_check_mark')}  Reading entries from '${filePath}'... (${Math.round(performance.now() - startTime)} ms)`);
    return entries;
  }
};
export default Parser;
