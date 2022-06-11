// => Language detection uses franc-cli: https://github.com/wooorm/franc
// npm install franc-cli --global
//
// => Text extraction uses w3m: https://w3m.sourceforge.io
// brew install w3m
//
// => Timeout (gtimeout on MacOS) for w3m uses coreutils: https://formulae.brew.sh/formula/coreutils
// brew install coreutils
//
// => IP geolocation with mmdbinspect: https://github.com/maxmind/mmdbinspect
// Build from source or grab binary on github
//
// => The ip checker uses the ipdata.co cli: https://pypi.org/project/ipdata/
// pip install ipdata
//
// => jq to parse json from the command line: https://github.com/stedolan/jq
// brew install jq
//
// => dos2unix is used to fix line endings: https://waterlan.home.xs4all.nl/dos2unix.html
// brew install dos2unix
//
// For used node packages see package.json.

/**
 * USAGE: $ node index.js <filename.{txt|csv}> <limit>
 * 
 * If limit=0 then no buckets will be created and
 * the provided file will be fully checked.
 */

const fs = require('fs');
const _ = require('lodash');
const sprintf = require('sprintf-js').sprintf
const shell = require('shelljs');
const franc = require('franc');

const ALLOWED_TLDS_PREF = ['nl','be','de','eu','es','se','no','fi','ch','fr','ir','dk','it','lu','io'];
const ALLOWED_TLDS_ALT  = ['uk','org','net','edu','info','com'];

// If pref=true then priority will be given to TLDs
// in ALLOWED_TLDS_PREF when creating buckets.
const BUCKET_RANGES = [
    { start: 1,      end: 1000,    pref: true  },
    { start: 1001,   end: 10000,   pref: true  },
    { start: 10001,  end: 100000,  pref: false },
    { start: 100001, end: 1000000, pref: false }
];

const DNS_UPSTREAMS = [
    '127.0.0.1',       //1  AGH
    '9.9.9.9',         //2  Quad9
    '208.67.222.123',  //3  OpenDNS Family Shield
    '1.1.1.3',         //4  Cloudflare Malware+Adult
    '185.228.168.9',   //5  CleanBrowsing Security
    '8.26.56.26',      //6  Comodo Secure DNS
    '156.154.70.2',    //7  Neustar Threat Protection               
    '149.112.121.30',  //8  CIRA Shield DNS Family
    '76.76.2.1',       //9  ControlD Block malware
    '94.140.14.15',    //10 AdGuard Family Protection
];

const TMP_FILEPATH = "./tmp.txt";

/* 
 * #############################################################
 * ##### END OF CONFIGURATION - DON'T EDIT BELOW THIS LINE #####
 * #############################################################
 */

// For testing ipv4 addresses
const ipv4pattern = '(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}';
const ipv4regex = new RegExp(`^${ipv4pattern}$`);

// Colors
const NC='\033[0m';
const Red='\033[0;31m';
const Green='\033[0;32m';
const Gray='\033[0;37m';
const BoldBlack='\033[1;30m';
const BoldBlue='\033[1;34m';

// Running globals
const bucketsGlobal = [];
let isOkGlobal;
let allEntriesGlobal;
let filePathGlobal;
let limitGlobal;
let ipGlobal;

// Start main program
const startTime = new Date();
try {
    main();
} catch(e) {
    println('ERROR');
    println(e);
} finally {
    shellExec(`rm ${TMP_FILEPATH}`, false);
    // Print elapsed time
    const seconds = Math.round((new Date() - startTime) / 1000);
    const minutes = Math.round(seconds / 60);
    println(`Finally! Program took ${seconds} seconds (≈ ${minutes} minutes) to complete.`);
}

/**
 * MAIN
 * Note: Javascript does not have a main function naturally. 
 * It starts at the top and works its way down to the bottom.
 */
function main() {
    validateCommandLineArguments();
    getSanitizedEntriesFromFile();
    if (limitGlobal !== 0) {
        createBuckets();
        checkBuckets();
    } else {
        checkEntries(allEntriesGlobal, 0);
    }
}

/**
 * Create buckets using BUCKET_RANGES
 * and the provided file.
 */
function createBuckets() {
    // Create buckets
    for (let i = 0; i < BUCKET_RANGES.length && allEntriesGlobal.length; i++) { 
        const range = BUCKET_RANGES[i];
        const lastEntryIndex = range.end - range.start;
        const result = allEntriesGlobal.splice(0, lastEntryIndex);
        const filtered = result
            .filter(entry => {
                const tld = entry.substring(entry.lastIndexOf('.') + 1);
                const isAllowedTld = ALLOWED_TLDS_PREF.includes(tld) || ALLOWED_TLDS_ALT.includes(tld);
                return isAllowedTld && entry.split(',')[1].length <= 30;
            });
        const shuffled = _.shuffle(filtered);
        // Stable sort, so it preserves the original sort order of equal elements
        // pref can be configured in BUCKET_RANGES to prioritize certain TLDs.
        const preffed = !range.pref ? shuffled : _.sortBy(shuffled, [function(entry) { 
                const tld = entry.substring(entry.lastIndexOf('.') + 1);
                return ALLOWED_TLDS_PREF.includes(tld) ? ALLOWED_TLDS_PREF.indexOf(tld) : Number.MAX_SAFE_INTEGER;
            }]);
        const maxEntriesToLimitFileSize = 10000;
        const bucketEntries = preffed.slice(0, maxEntriesToLimitFileSize);
        bucketsGlobal.push(bucketEntries);
    }
}

/**
 * Read the entries (lines) from the file and ensure
 * they are formatted like rank:domain.
 */
function getSanitizedEntriesFromFile() {
    // Fix line breaks and get sanitized entries from source file
    shellExec(`cp ${filePathGlobal} ${TMP_FILEPATH}`, false);
    shellExec(`dos2unix ${TMP_FILEPATH}`, false);
    try {
        allEntriesGlobal = fs
            .readFileSync(filePathGlobal).toString()
            .replace(/;/g, ',')
            .split("\n")
            .filter(entry => {
                const splitted = entry.trim().split(',');
                if (splitted.length !== 2 || !/^\d+$/.test(splitted[0])) {
                    return false;
                }
                const urlWithoutProtocol = splitted[1].replace(/^https?:\/\//i, '');
                try {
                    new URL('https://' + urlWithoutProtocol);
                    return true;
                } catch (e) {}
                return false;
            })
            .map(entry => {
                const [rank, domain] = entry.trim().split(',');
                const urlWithoutProtocol = domain.replace(/^https?:\/\//i, '');
                const domainn = new URL('https://' + urlWithoutProtocol).hostname;
                return rank + ',' + domainn;
            });
    } catch(e) {
        println(e);
    }
    if (!allEntriesGlobal) {
        throw 'There are no (valid) entries in the specified file.';
    }
}

/**
 * Print the table headers dynamically
 * based on the data in the buckets.
 */
function printTableHeaders() {
    print(sprintf(`${BoldBlack}%-4s  `, '#'));
    print(sprintf(`%7s  `, 'rank'));
    print(sprintf(`%-30s  ` , 'domain'));
    for (let i = 1; i <= DNS_UPSTREAMS.length; i++) {
        print(`${i}  `);
    }
    const otherHeaders = ['continent','reachable','iframe-less','content-length','language','threat'];
    for (const otherHeader of otherHeaders) {
        print(`${otherHeader}  `);
    }
    println(NC);
}

/**
 * Check the entries of each bucket.
 */
function checkBuckets() {
    // Iterate over buckets
    for (const [i, bucket] of bucketsGlobal.entries()) {
        println(`\n${BoldBlue}****************\n*** BUCKET ${i+1} ***\n****************${NC}`);
        checkEntries(bucket, i+1);
    }
}

/**
 * Check the entries of the buckets
 * using various services.
 * @param {*} entries the entries to check
 * @param {*} bucketId the id of the bucket
 */
function checkEntries(entries, bucketId) {
    const validEntries = [];
    printTableHeaders();
    // Iterate over domains
    for (const [j, entry] of entries.entries()) {
        // global
        isOkGlobal = true;
        const [rank, domain] = entry.split(',');

        print(sprintf(`%-4s  `, j+1));
        print(sprintf(`%7s  `, rank));
        print(sprintf(`%-30s  ` , domain));
        checkDomainAgainstDnsUpstreams(domain);
        checkContinent(domain);
        checkReachability(domain);
        checkIframes(domain);
        checkContentLengthAndLanguage(domain);
        checkIpData(domain);

        println(NC);
        if (isOkGlobal) {
            validEntries.push(entry);
        }
        if (limitGlobal > 0 && limitGlobal === validEntries.length) {
            break;
        }
    }
    println(validEntries);
    fs.writeFileSync(`bucket_${bucketId}.txt`, validEntries.join('\n'));
}

/**
 * Check the domain agains the upstreams as
 * defined in DNS_UPSTREAMS and print results.
 * @param {*} domain the domain to check
 */
function checkDomainAgainstDnsUpstreams(domain) {
    // Check domain
    ipGlobal = '';
    let i;
    for (i = 0; i < DNS_UPSTREAMS.length && isOkGlobal; i++) {
        const upstream = DNS_UPSTREAMS[i];
        const ip = shellExec(`dig @${upstream} +short +time=3 +tries=3 ${domain} | tail -n1`);
        const padding = `${i+1}`.length;
        if (isIPv4(ip)) {
            print(sprintf(`${Green}%${padding}s  `, 'v'));
            if (i === 0) ipGlobal = ip;
        } else {
            print(sprintf(`${Red}%${padding}s  `, 'x'));
            isOkGlobal = false;
        }
    }
    // If !isOkGlobal, fill the rest of the line with question marks
    for (i; i < DNS_UPSTREAMS.length; i++) {
        const padding = `${i+1}`.length;
        print(sprintf(`${Gray}%${padding}s  `, '?'));
    }
    print(NC);
}

/**
 * Check the continent of the ip on which
 * the domain (website) is hosted.
 * @param {*} domain the domain to check
 */
function checkContinent(domain) {
    if (!isOkGlobal) {
        print(sprintf(`${Gray}%6s  `, '?'));
        return;
    }
    const continent = shellExec(`./geoip.sh ${ipGlobal}`).trim();
    if (continent === 'NA' || continent == 'EU' || continent === 'null' || continent === '') {
        print(sprintf(`${Green}%6s  `, continent));
        return;
    }
    print(sprintf(`${Red}%6s  `, continent));
    isOkGlobal = false;
}

/**
 * Check that the domain is reachable within 5 seconds
 * and that there are no redirects to non-related domains.
 * @param {*} domain the domain to check
 */
function checkReachability(domain) {
    if (!isOkGlobal) {
        print(sprintf(`${Gray}%8s  `, '?'));
        return;
    }
    const result = shellExec(`curl -sL -I --connect-timeout 4 --max-time 6 -w "%{http_code}|%{url_effective}\\n" ${domain} -o /dev/null`);
    const [httpCode, urlEffective] = result.trim().split('|');
    if (parseInt(httpCode) !== 200) {
        print(sprintf(`${Red}%8s  `, 'x'));
        isOkGlobal = false;
        return;
    }
    let finalHostname;
    try {
        // Validate url by creating an URL object (throws on failure)
        finalHostname = new URL(urlEffective).hostname;
    } catch (e) {
        print(sprintf(`${Red}%8s  `, 'x'));
        isOkGlobal = false;
        return;
    }
    // The final hostname (with or without www)
    // must still contain the original domain.
    if (!finalHostname.includes(domain)) {
        print(sprintf(`${Red}%8s  `, 'x'));
        isOkGlobal = false;
        return;
    }
    print(sprintf(`${Green}%8s  `, 'v'));
}


/**
 * Check if the website contains iframes.
 * Iframes prevent clickhandlers from being.
 * @param {*} domain the domain to check
 */
function checkIframes(domain) {
    if (!isOkGlobal) {
        print(sprintf(`${Gray}%10s  `, '?'));
        return;
    }
    const rawHtml = shellExec(`curl -sL --connect-timeout 5 --max-time 8 ${domain}`);
    if (rawHtml.includes('iframe')) {
        print(sprintf(`${Red}%10s  `, 'x'));
        isOkGlobal = false;
        return;
    }
    print(sprintf(`${Green}%10s  `, 'v'));
}

/**
 * Check the content length of the website
 * and detect the language based on the content.
 * @param {*} domain 
 */
function checkContentLengthAndLanguage(domain) {
    if (!isOkGlobal) {
        print(sprintf(`${Gray}%13s  %12s  `, '?', '?'));
        return;
    }
    const textContent = shellExec(`./w3m.sh ${domain}`);
    if (textContent.length < 1000) {
        print(sprintf(`${Red}%13s  ${Gray}%12s  `, textContent.length, '?'));
        isOkGlobal = false;
        return;
    }
    print(sprintf(`${Green}%13s  `, textContent.length));

    const language = franc(textContent.replace(/["'`]/g, ' '));
    if (language === 'nld' || language === 'eng') {
        print(sprintf(`${Green}%12s  `, language));
        return;
    }
    print(sprintf(`${Red}%12s  `, language));
    isOkGlobal = false;
}

/**
 * Use the ipdata.co webservice to check that
 * the ip address does not pose a threat.
 * @param {*} domain the domain to check
 */
function checkIpData(domain) {
    if (!isOkGlobal) {
        print(sprintf(`${Gray}%6s`, '?'));
        return;
    }
    const ipdata = shellExec(`./ipdata.sh ${ipGlobal}`);
    const isThreat = ipdata.trim();
    if (!isThreat.length && isThreat !== 'true' && isThreat !== 'false') {
        print(sprintf(`${Gray}%6s`, '?'));
        return;
    }
    if (isThreat === 'true') {
        print(sprintf(`${Red}%6s`, 'v'));
        isOkGlobal = false;
        return;
    }
    print(sprintf(`${Green}%6s`, 'x'));
}

/**
 * Run shell script.
 * @param {*} cmd the command to execute
 * @param {*} print to the standard console
 * @returns the stdout output
 */
function shellExec(cmd, ignoreErrors = true) {
    const { stdout, stderr, code } = shell.exec(cmd, { silent: true });
    if (code !== 0) {
        if (ignoreErrors) return '';
        println('Something went wrong while executing "' + cmd + '".');
        throw stderr;
    }
    return stdout;
}

/**
 * Validate the provided command line arguments.
 * Shape: <filename.{txt|csv}> <limit>
 * "param {*}" filename to the source file (txt/csv) with domains
 * "param {*}" limit the number of domains to select per chunk
 */
function validateCommandLineArguments() {
    const args = process.argv.slice(2);
    if (!(args.length === 2 && (args[0].endsWith('.txt') || args[0].endsWith('.csv')) && checkFileExistsSync(args[0]) && /^\d+$/.test(args[1]))) {
        throw 'Please start this program like "node index.js <filename.{txt|csv}> <limit>". If limit=0 then no buckets will be created an the file will be checked as-is.';
    }
    filePathGlobal = args[0];
    limitGlobal    = parseInt(args[1]);
}

/**
 * Check if a file exists at the given path.
 * @param {*} path 
 * @returns true if file exists
 */
function checkFileExistsSync(path) {
    let flag = true;
    try {
        fs.accessSync(path, fs.constants.F_OK);
    } catch(e) {
        flag = false;
    }
    return flag;
}

/**
 * Test if ipv4 adress is valid and
 * not a NULLIP (0.0.0.0).
 * @param {*} ip the ip address to test
 * @returns true if valid ipv4
 */
function isIPv4(ip) {
    const trimmedIp = ip.trim();
    return trimmedIp !== '0.0.0.0' && ipv4regex.test(trimmedIp);
}

/**
 * Provide two custom wrappers for printing to
 * the console without/with trailing newline.
 * @param {*} message 
 */
function print(message = '')   { process.stdout.write(message) }
function println(message = '') { console.log(message) }