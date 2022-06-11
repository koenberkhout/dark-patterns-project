
/**
 * Start DNS proxy for each of the upstreams
 * defined in DNS_UPSTREAMS.
 */
 function startDnsProxies() {
    let runningDnsProxyCount = Number.MAX_SAFE_INTEGER;

    // Kill all running dnsproxy processes
    shellExec('killall dnsproxy', false, true);
    for (let i = 0; i < 10 && runningDnsProxyCount > 0; i++) {
        runningDnsProxyCount = shellExec('sleep 1; ps -ax | grep dnsproxy')
            .split("\n")
            .filter(process => process.length && !process.includes('grep'))
            .length;
    }
    // Start dns proxies based on number of upstreams
    for (let i = 0; i < DNS_UPSTREAMS.length; i++) {
        const listenPort = FIRST_LISTEN_PORT + i;
        const upstream   = DNS_UPSTREAMS[i];
        shellExec(`./dnsproxy -l 127.0.0.1 -p ${listenPort} -u ${upstream} &>/dev/null &`);
    }
    // Wait until all proxies are running
    for (let i = 0; i < 10 && runningDnsProxyCount < DNS_UPSTREAMS.length; i++) {
        runningDnsProxyCount = shellExec('sleep 1; ps -ax | grep dnsproxy')
            .split("\n")
            .filter(process => process.length && !process.includes('grep'))
            .length;
    }
    if (runningDnsProxyCount < DNS_UPSTREAMS.length) {
        throw 'DNS proxies could not be started.';
    }
}