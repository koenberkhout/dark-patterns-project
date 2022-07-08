import puppeteer from 'puppeteer-extra';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import type Reporter from './Reporter.js';

/**
 * COOKIEPEDIA
 * Determine the purposes of the provided list
 * of cookieNames by querying cookiepedia.co.uk.
 */
const CookiePedia = class {
  static async determinePurposes(cookieNames: string[], queryUrl: string, reporter: InstanceType<typeof Reporter>): Promise<void> {
    if (!cookieNames.length) {
      console.log('determinePurposesCookiepedia: cookieNames[] is empty.');
      return;
    }
    console.log(`Checking ${cookieNames.length} cookies in determinePurposesCookiepedia()`);
    let browser;
    try {
      browser = await puppeteer
        .use(AdblockerPlugin({ blockTrackers: true }))
        .use(StealthPlugin())
        .launch({ headless: false });
      const page = await browser.newPage();

      for (const cookieName of cookieNames) {
        let purpose: string = 'N/A';
        try {
          const httpResponse = await page.goto(queryUrl + cookieName, { waitUntil: 'domcontentloaded', timeout: 10000 });
          if (httpResponse?.ok) {
            const body = await httpResponse?.text() ?? '';
            if (!body.includes('Sorry, your search returned no matches')) {
              const purposeElement = await page.waitForSelector('#content-left strong', { timeout: 2000 });
              const cpPurpose = await purposeElement?.evaluate((el) => el.textContent);
              if (cpPurpose !== 'Unknown') purpose = cpPurpose;
            }
            await reporter.reportCookiePurposes([{ cookieName, purpose }], 'cookiepedia');
          }
        } catch (e: any) {
          console.log(`ERROR in loop in determinePurposesCookiepedia(): ${e.message}`);
        }
        await page.waitForTimeout(this.randomIntBetween(3000, 10000));
      }
    } catch (e: any) {
      console.log(`ERROR in determinePurposesCookiepedia(): ${e.message}`);
    } finally {
      await browser?.close();
    }
  }

  private static randomIntBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }
};

export default CookiePedia;
