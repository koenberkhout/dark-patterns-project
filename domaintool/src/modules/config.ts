import { union } from 'lodash-es';

const Config = class {
  /**
   * APP
   */
  static App = class {
    static readonly SOURCE_FILE_PATH = '../lib/top-1m_16-06-2022.csv';
    // static readonly SOURCE_FILE_PATH = '../lib/current.txt';
    static readonly EXCLUDE_PATH = '../lib/exclusions.txt';
    static readonly USE_BUCKETS = true;
    static readonly RATE_LIMIT_MS = 500;
    static readonly CHUNK_SIZE = 25;
    static readonly CONNECTION = { host: 'localhost', port: 6379 };
  };

  /**
   * BUCKET
   */
  static Bucket = class {
    static readonly RANGES = [
      { start: 0, end: 5000, selectLimit: 200 },
      { start: 5000, end: 25000, selectLimit: 200 },
      { start: 25000, end: 100000, selectLimit: 200 },
      { start: 100000, end: 1000000, selectLimit: 200 },
    ];
    static readonly SIZE_LIMIT = 50000;
    static readonly DOMAIN_LENGTH_LIMIT = 30;
    private static readonly GENERIC_TLDS = ['org', 'net', 'edu', 'info', 'com'];
    private static readonly EU_TLDS = [
      'at', 'be', 'bg', 'hr', 'cy', 'cz', 'dk', 'ee', 'fi', 'fr', 'de',
      'gr', 'hu', 'ie', 'it', 'lv', 'lt', 'lu', 'mt', 'nl', 'pl', 'pt',
      'ro', 'sk', 'si', 'es', 'se', 'gb', 'gf', 'gp', 'mq', 'me', 'yt',
      're', 'mf', 'gi', 'ax', 'pm', 'gl', 'bl', 'sx', 'aw', 'cw', 'wf',
      'pf', 'nc', 'tf', 'ai', 'bm', 'io', 'vg', 'ky', 'fk', 'ms', 'pn',
      'sh', 'gs', 'tc', 'ad', 'li', 'mc', 'sm', 'va', 'je', 'gg', 'gi',
    ];
    static readonly ALLOWED_TLDS = union(this.EU_TLDS, this.GENERIC_TLDS);
  };

  /**
   * CONTENT
   */
  static Content = class {
    static readonly ALLOWED_LANGUAGES = ['eng', 'nld'];
    static readonly REQUEST_TIMEOUT = 5;
    static readonly MIN_LENGTH = 1000;
  };

  /**
   * DNS
   */
  static Dns = class {
    static readonly TIMEOUT = 4;
    static readonly TRIES = 1;
    static readonly UPSTREAMS = [
      { ips: ['127.0.0.1'], description: 'AGH with custom NextDNS DoH upstream' },
      { ips: ['9.9.9.9', '149.112.112.112'], description: 'Quad9' },
      { ips: ['208.67.222.123', '208.67.220.123'], description: 'OpenDNS Family Shield' },
      { ips: ['1.1.1.3', '1.0.0.3'], description: 'Cloudflare Malware+Adult' },
      { ips: ['185.228.168.9', '185.228.169.9'], description: 'CleanBrowsing Security' },
      { ips: ['8.26.56.26', '8.20.247.20'], description: 'Comodo Secure DNS' },
      { ips: ['156.154.70.3', '156.154.71.3'], description: 'Neustar Family Secure' },
      { ips: ['94.140.14.15', '94.140.15.16'], description: 'AdGuard Family Protection' },
      { ips: ['76.76.2.4', '76.76.10.4'], description: 'ControlD Family Friendly' },
    ];
  };

  /**
   * IPDATA
   */
  static IpData = class {
    static readonly BLOCKLIST_PATH = '../lib/ip-blocklist-full.txt';
    static readonly ALLOWED_CONTINENTS = ['EU', 'NA', 'UNKNOWN'];
  };

  /**
   * REACHABILITY
   */
  static Reachability = class {
    static readonly REQUEST_TIMEOUT = 3;
    static readonly MAX_RETRIES = 0;
  };
};
export default Config;
