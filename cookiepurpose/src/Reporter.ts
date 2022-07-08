import got from 'got';

const Reporter = class {
  private urlReportCookiePurposes: string;
  private apiKey: string;

  constructor(urlReportCookiePurposes: string, apiKey: string) {
    this.urlReportCookiePurposes = urlReportCookiePurposes;
    this.apiKey = apiKey;
  }

  /**
   * REPORT COOKIE PURPOSES
   * @param cookiePurposes list of { cookieName, purpose }
   * @param which vendor
   */
  async reportCookiePurposes(cookiePurposes: any[], which: string) {
    try {
      await got(`${this.urlReportCookiePurposes}/${which}`, {
        method: 'POST',
        json: cookiePurposes,
        searchParams: { api_key: this.apiKey },
        timeout: { request: 5000 },
        retry: { limit: 0 },
      });
    } catch (e: any) {
      console.log(`Error reporting cookie purposes: ${e.message}`);
    }
  }
};

export default Reporter;
