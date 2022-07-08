import fse from 'fs-extra';
import type Reporter from './Reporter.js';

/**
 * OPEN COOKIE DATABASE
 * Determine the purposes of the provided list
 * of cookieNames by searching the Open Cookie Database.
 */
const OpenCookieDatabase = class {
  static async determinePurposes(cookieNames: string[], queryUrl: string, reporter: InstanceType<typeof Reporter>): Promise<void> {
    if (!cookieNames.length) {
      console.log('determinePurposesOpenCookieDatabase: cookieNames[] is empty.');
      return;
    }
    if (!fse.existsSync(queryUrl)) {
      throw new Error('The Open Cookie Database file could not be found.');
    }
    console.log(`Checking ${cookieNames.length} cookies in determinePurposesOpenCookieDatabase()`);
    const purposes: any[] = fse
      .readFileSync(queryUrl)
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
    await reporter.reportCookiePurposes(cookiePurposes, 'opencookiedatabase');
  }
};

export default OpenCookieDatabase;
