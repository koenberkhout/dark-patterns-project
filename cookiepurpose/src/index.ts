/* eslint-disable dot-notation */
import fse from 'fs-extra';
import { config } from 'dotenv';
import got, { OptionsOfTextResponseBody } from 'got';
import { setTimeout } from 'timers/promises';
import puppeteer from 'puppeteer-extra';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

/* ########################################################################## */

// Vendor URLs
const QUERY_URL = {
  COOKIEPEDIA: 'https://cookiepedia.co.uk/cookies/',
  COOKIE_DATABASE: 'https://cookiedatabase.org/wp-json/cookiedatabase/v2/cookies/',
  OPEN_COOKIE_DATABASE: '../lib/ocd.csv',
};

/* ########################################################################## */

const parsedConfig = config({ path: '../.env' })?.parsed;
const apiKey = parsedConfig?.['API_KEY'] as string;
const urlUnpurposedCookieNames = parsedConfig?.['URL_UNPURPOSED_COOKIE_NAMES'] as string;
const urlReportCookiePurposes = parsedConfig?.['URL_REPORT_COOKIE_PURPOSES'] as string;

const CookiePurpose = class {
  /**
   * START
   */
  static async start(): Promise<void> {
    const {
      cookieNamesCookiepedia,
      cookieNamesCookieDatabase,
      cookieNamesOpenCookieDatabase,
    } = await this.getCookieNamesToDetermine();

    const promises = [
      this.determinePurposesCookiepedia(cookieNamesCookiepedia),
      this.determinePurposesCookieDatabase(cookieNamesCookieDatabase),
      this.determinePurposesOpenCookieDatabase(cookieNamesOpenCookieDatabase),
    ];

    await Promise.allSettled(promises);
    console.log('DONE');
  }

  /**
   * COOKIEPEDIA
   * Determine the purposes of the provided list
   * of cookieNames by querying cookiepedia.co.uk.
   * @param cookieNames
   */
  private static async determinePurposesCookiepedia(cookieNames: string[]): Promise<void> {
    if (!cookieNames.length) {
      console.log('determinePurposesCookiepedia: cookieNames[] is empty.');
      return;
    }
    let browser;
    try {
      browser = await puppeteer
        .use(AdblockerPlugin({ blockTrackers: true }))
        .use(StealthPlugin())
        .launch({ headless: true });
      const page = await browser.newPage();

      for (const cookieName of cookieNames) {
        let purpose: string = 'N/A';
        try {
          const httpResponse = await page.goto(QUERY_URL.COOKIEPEDIA + cookieName, { waitUntil: 'domcontentloaded', timeout: 10000 });
          if (httpResponse?.ok) {
            const body = await httpResponse?.text() ?? '';
            if (!body.includes('Sorry, your search returned no matches')) {
              const purposeElement = await page.waitForSelector('#content-left strong', { timeout: 2000 });
              const cpPurpose = await purposeElement?.evaluate((el) => el.textContent);
              if (cpPurpose !== 'Unknown') purpose = cpPurpose;
            }
            await this.reportCookiePurposes([{ cookieName, purpose }], 'cookiepedia');
          }
        } catch (e: any) {
          console.log(`ERROR in loop in determinePurposesCookiepedia(): ${e.message}`);
        }
        await page.waitForTimeout(CookiePurpose.randomIntBetween(3000, 10000));
      }
    } catch (e: any) {
      console.log(`ERROR in determinePurposesCookiepedia(): ${e.message}`);
    } finally {
      await browser?.close();
    }
  }

  /**
   * COOKIE DATABASE
   * Determine the purposes of the provided list
   * of cookieNames by querying cookiedatabase.org.
   * @param cookieNames
   */
  private static async determinePurposesCookieDatabase(cookieNames: string[]): Promise<void> {
    if (!cookieNames.length) {
      console.log('determinePurposesCookieDatabase: cookieNames[] is empty.');
      return;
    }
    while (cookieNames.length) {
      const chunkSize = this.randomIntBetween(3, 8);
      const cookieNamesChunk = cookieNames.splice(0, chunkSize);
      try {
        const response: any = await got(QUERY_URL.COOKIE_DATABASE, this.composeRequestOptions(cookieNamesChunk)).json();
        const resultData = response?.data?.en?.['no-service-set'];
        const cookiePurposes: any[] = [];
        for (const cookieName of cookieNamesChunk) {
          const purpose = resultData?.[cookieName]?.purpose ?? 'N/A';
          cookiePurposes.push({ cookieName, purpose });
        }
        await this.reportCookiePurposes(cookiePurposes, 'cookiedatabase');
      } catch (e: any) {
        console.log(`ERROR in determinePurposesCookieDatabase(): ${e.message}`);
      }
      await setTimeout(30000 - (chunkSize * 1000));
    }
  }

  /**
   * OPEN COOKIE DATABASE
   * Determine the purposes of the provided list
   * of cookieNames by searching the Open Cookie Database.
   * @param cookieNames
   */
  private static async determinePurposesOpenCookieDatabase(cookieNames: string[]): Promise<void> {
    if (!cookieNames.length) {
      console.log('determinePurposesOpenCookieDatabase: cookieNames[] is empty.');
    }
    if (!fse.existsSync(QUERY_URL.OPEN_COOKIE_DATABASE)) {
      throw new Error('The Open Cookie Database file could not be found.');
    }
    const purposes: any[] = fse
      .readFileSync(QUERY_URL.OPEN_COOKIE_DATABASE)
      .toString()
      .split(/\r?\n/)
      .filter((result) => result.includes(','))
      .map((result) => {
        const [purpose, cookieName] = result.split(',');
        return { cookieName, purpose };
      });
    const cookiePurposes: any[] = [];
    for (const cookieName of cookieNames) {
      const purpose = purposes.find((purposee) => purposee.cookieName === cookieName)?.purpose ?? 'N/A';
      cookiePurposes.push({ cookieName, purpose });
    }
    await this.reportCookiePurposes(cookiePurposes, 'opencookiedatabase');
  }

  /**
   * GET COOKIE NAMES TO DETERMINE
   * @returns the list of cookieNames
   */
  private static async getCookieNamesToDetermine(): Promise<any> {
    const response: any = await got(urlUnpurposedCookieNames, {
      searchParams: { api_key: apiKey },
      timeout: { request: 5000 },
      retry: { limit: 0 },
    }).json();

    const cookieNamesCookiepedia: string[] = [];
    const cookieNamesCookieDatabase: string[] = [];
    const cookieNamesOpenCookieDatabase: string[] = [];

    for (const entry of response) {
      // eslint-disable-next-line object-curly-newline
      const { cookie_name: cookieName, cookiepedia, cookiedatabase: cookieDatabase, opencookiedatabase: openCookieDatabase } = entry;
      if (!cookiepedia) cookieNamesCookiepedia.push(cookieName);
      if (!cookieDatabase) cookieNamesCookieDatabase.push(cookieName);
      if (!openCookieDatabase) cookieNamesOpenCookieDatabase.push(cookieName);
    }
    return { cookieNamesCookiepedia, cookieNamesCookieDatabase, cookieNamesOpenCookieDatabase };
  }

  /**
   * REPORT COOKIE PURPOSES
   * @param cookiePurposes list of { cookieName, purpose }
   * @param which vendor
   */
  private static async reportCookiePurposes(cookiePurposes: any[], which: string) {
    try {
      await got(`${urlReportCookiePurposes}/${which}`, {
        method: 'POST',
        json: cookiePurposes,
        searchParams: { api_key: apiKey },
        timeout: { request: 5000 },
        retry: { limit: 0 },
      });
    } catch (e: any) {
      console.log(`Error reporting cookie purposes: ${e.message}`);
    }
  }

  /**
   * RANDOM INT BETWEEN
   * Generates a random integer between two provided numbers.
   * @param min the minimum value
   * @param max the maximum value
   * @returns number between min and max
   */
  private static randomIntBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  /**
   * COMPOSE REQUEST OPTIONS
   * For querying cookiedatabase.org.
   */
  private static composeRequestOptions(cookieNames: string[]): OptionsOfTextResponseBody {
    const jsonBody = {
      en: { 'no-service-set': cookieNames },
      thirdpartyCookies: [],
      localstorageCookies: [],
      plugins: '<pre>complianz-gdpr/complianz-gpdr.php</pre>',
      website: '<a href="https://vaf.ou.nl">https://vaf.ou.nl</a>',
    };

    return {
      method: 'POST',
      hooks: {
        beforeRequest: [
          (options: any) => {
            // eslint-disable-next-line no-param-reassign
            options.headers = {
              'content-length': options.headers['content-length'],
              'content-type': options.headers['content-type'],
              accept: '*/*',
            };
          },
        ],
      },
      json: jsonBody,
      timeout: { request: 5000 },
      retry: { limit: 0 },
      throwHttpErrors: false,
    };
  }
};

await CookiePurpose.start();
