import { setTimeout } from 'timers/promises';
import got, { OptionsOfTextResponseBody } from 'got';
import type Reporter from './Reporter.js';

/**
 * COOKIE DATABASE
 * Determine the purposes of the provided list
 * of cookieNames by querying cookiedatabase.org.
 */
const CookieDatabase = class {
  static async determinePurposes(cookieNames: string[], queryUrl: string, reporter: InstanceType<typeof Reporter>): Promise<void> {
    if (!cookieNames.length) {
      console.log('determinePurposesCookieDatabase: cookieNames[] is empty.');
      return;
    }
    console.log(`Checking ${cookieNames.length} cookies in determinePurposesCookieDatabase()`);
    while (cookieNames.length) {
      const chunkSize = this.randomIntBetween(3, 8);
      const cookieNamesChunk = cookieNames.splice(0, chunkSize);
      try {
        const response: any = await got(queryUrl, this.composeRequestOptions(cookieNamesChunk)).json();
        const resultData = response?.data?.en?.['no-service-set'];
        const cookiePurposes: any[] = [];
        for (const cookieName of cookieNamesChunk) {
          const purposeRaw = resultData?.[cookieName]?.purpose ?? 'N/A';
          const purpose = purposeRaw === false ? 'N/A' : purposeRaw;
          cookiePurposes.push({ cookieName, purpose });
        }
        await reporter.reportCookiePurposes(cookiePurposes, 'cookiedatabase');
      } catch (e: any) {
        console.log(`ERROR in determinePurposesCookieDatabase(): ${e.message}`);
      }
      await setTimeout(30000 - (chunkSize * 1000));
    }
  }

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

  private static randomIntBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }
};

export default CookieDatabase;
