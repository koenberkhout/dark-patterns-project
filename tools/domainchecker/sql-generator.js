const fs = require('fs');
const _ = require('lodash');
const psl = require('psl');

const BUCKET_FOLDER = './buckets/';
let allEntries = [];
let sqlLines = [];

const bucketFilePaths = fs.readdirSync(BUCKET_FOLDER);
for (const bucketFilePath of bucketFilePaths) {
    bucketEntries = fs
        .readFileSync(`./buckets/${bucketFilePath}`)
        .toString()
        .replace(/;/g, ',')
        .split("\n")
        .filter(entry => {
            const splitted = entry.trim().split(',');
            if (splitted.length !== 2 || !/^\d+$/.test(splitted[0])) {
                return false;
            }
            return true;
        })
        .map(entry => {
            const [rank, hostname] = entry.trim().split(',');
            const domain = psl.parse(hostname).domain;
            return { rank: parseInt(rank), url_orig: domain, url: hostname };
        })
        .forEach(entry => allEntries.push(entry));
}
allEntries = _.sortBy(allEntries, [function(entry) { 
    return entry.rank;
}]);

allEntries = _.uniqBy(allEntries, 'rank').slice(0, 800);

sqlLines.push(
    'SET FOREIGN_KEY_CHECKS = 0;',
    'TRUNCATE `cookie`;',
    'TRUNCATE `recording`;',
    'TRUNCATE `website`;',
    'ALTER TABLE `cookie` AUTO_INCREMENT = 1;',
    'ALTER TABLE `recording` AUTO_INCREMENT = 1;',
    'ALTER TABLE `website` AUTO_INCREMENT = 1;',
    'SET FOREIGN_KEY_CHECKS = 1;'
);
allEntries.forEach(entry => {
    const sqlLine = `INSERT INTO \`website\` (\`rank\`, \`url_orig\`, \`url\`) VALUES ('${entry.rank}', '${entry.url_orig}', '${entry.url}');`;
    sqlLines.push(sqlLine);
});
fs.writeFileSync(`./sql-inserts.sql`, sqlLines.join('\n'));




// fs.readdirSync(BUCKET_FOLDER).forEach(file => {
//     excluded = fs
//             .readFileSync(excludedPath).toString()
//             .replace(/;/g, ',')
//             .split("\n")
//             .map(entry => entry.trim().split(',')[1]);
// });