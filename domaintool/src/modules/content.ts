import got from 'got';
import { franc } from 'franc';
import { htmlToText } from 'html-to-text';
import chalk from 'chalk';
import type { HorizontalTableRow } from 'cli-table3';
import { Config } from '../modules.js';

/**
 * [class] Content
 */
const Content = class {
  static async check(domain: string, tableRow: HorizontalTableRow) {
    const rawContent = await this.getRawContent(domain, tableRow);

    // check iframes
    if (rawContent.includes('iframe')) {
      tableRow.push(chalk.red('x'));
      throw new Error('content:2/4:iframes');
    }
    tableRow.push(chalk.green('v'));
    const contentText = this.getSanitizedReadableContent(rawContent);

    // check content-length
    if (contentText.length < Config.Content.MIN_LENGTH) {
      tableRow.push(chalk.red('x'));
      throw new Error('content:3/4:length');
    }
    tableRow.push(chalk.green('v'));

    // check language
    const contentLanguage = franc(contentText);
    if (!Config.Content.ALLOWED_LANGUAGES.includes(contentLanguage)) {
      tableRow.push(chalk.red('x'));
      throw new Error('content:4/4:language');
    }
    tableRow.push(chalk.green('v'));
  }

  private static async getRawContent(domain: string, tableRow: HorizontalTableRow) {
    try {
      const rawContent = await got(`https://${domain}`, {
        method: 'GET',
        timeout: { request: Config.Content.REQUEST_TIMEOUT * 1000 },
        retry: { limit: 0 },
      }).text();
      tableRow.push(chalk.green('v'));
      return rawContent;
    } catch (e) {
      tableRow.push(chalk.red('x'));
      throw new Error('content:1/4:fetch');
    }
  }

  private static getSanitizedReadableContent(content: string): string {
    return htmlToText(content, { wordwrap: false })
      .replace(/\s/g, ' ')
      .replace(/ +/g, ' ')
      .toLowerCase()
      .split(' ')
      .map((word) => word.replace(/[^a-z]/g, ''))
      .filter((word) => word.length > 2
      && word.length < 25
      && !word.includes('http')
      && !word.includes('javascript'))
      .join(' ');
  }
};
export default Content;
