/* eslint-disable dot-notation */
import { config } from 'dotenv';
import got from 'got';
import Reporter from './Reporter.js';
import CookiePedia from './CookiePedia.js';
import CookieDatabase from './CookieDatabase.js';
import OpenCookieDatabase from './OpenCookieDatabase.js';

/* ########################################################################## */

// Config
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

const App = class {
  /**
   * START
   */
  static async start(): Promise<void> {
    const reporter = new Reporter(urlReportCookiePurposes, apiKey);
    const {
      cookieNamesCookiepedia,
      cookieNamesCookieDatabase,
      cookieNamesOpenCookieDatabase,
    } = await this.getCookieNamesToDetermine();

    const promises = [
      CookiePedia.determinePurposes(cookieNamesCookiepedia, QUERY_URL.COOKIEPEDIA, reporter),
      CookieDatabase.determinePurposes(cookieNamesCookieDatabase, QUERY_URL.COOKIE_DATABASE, reporter),
      OpenCookieDatabase.determinePurposes(cookieNamesOpenCookieDatabase, QUERY_URL.OPEN_COOKIE_DATABASE, reporter),
    ];

    await Promise.allSettled(promises);
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
      if (cookiepedia === null) cookieNamesCookiepedia.push(cookieName);
      if (cookieDatabase === null) cookieNamesCookieDatabase.push(cookieName);
      if (openCookieDatabase === null) cookieNamesOpenCookieDatabase.push(cookieName);
    }
    return { cookieNamesCookiepedia, cookieNamesCookieDatabase, cookieNamesOpenCookieDatabase };
  }
};

export default App;
