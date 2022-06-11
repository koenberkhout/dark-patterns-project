# Domainchecker
## Rationale
Early experiments using Tranco show that there are a lot of 'bad' websites in the list. Some may be known to spread malware, host porn, are unreachable or serve no content at all. Some are in a language that we are not able to understand without the use of a translation service. When using a fully automated solution this may be acceptable, but when manually inspecting websites it becomes cumbersome. That's why this tool has been developed.

## The tool
The main script is in `index.js`, which makes use of `geoip.sh`, `ipdata.sh` and `w3m.sh`.
For an example see `screenshot.png`.

Run `$ node index.js <filename.{txt|csv}> <limit>` to create buckets from the source file using the BUCKET_RANGES defined in index.js. The `<limit>` parameter defines how many domains go in each bucket.

When creating buckets, domains are progressively filtered using various ([OSINT](https://en.wikipedia.org/wiki/Open-source_intelligence)) sources:
- **Sanitization:** The first step is domain sanitization using JavaScript's URL object constructor. Invalid domains throw an error upon instantiation and are automatically discarded.
- **Public DNS resolvers:** By default the domains are filtered using these DNS upstreams: Quad9, OpenDNS Family Shield, Cloudfalre Malware+Adult, CleanBrowsing Security, Comodo Secure DNS, Neustar Threat Protection, CIRA Shield DNS Family, ControlD Block Malware, AdGuard Family Protection. These can be specified in DNS_UPSTREAMS.
- **Continent:** If desired, websites can be filtered by country or continent of the server location.
- **Reachability:** Domain headers are queried using `curl` and redirects are followed. The final destination must return a 200 status code, and the original domain must still be a substring of the final url (to prevent sneaky redirects).
- **Iframes:** Iframes do not pose a direct threat, but it is not possible to attach click handlers to content that is loaded in an iframe. This is problematic for our experiment, as one of the data points is the number of clicks needed to deny consent.
- **Content:** The content is inspected using w3m, a text-based web browser and screen reader. To discard websites that serve empty content, the minimum length is set to 1000 characters. Additionally, the content language is detected using Franc and anything except *nld* or *eng* is discarded.
- **Ipdata:** Finally, the IP address returned by the first public DNS resolver is checked using ipdata.co's free API. If it is a known threat, the domain is discarded.

*This may seem restrictive, but after filtering out all the garbage there are more than enough domains left to use.*
