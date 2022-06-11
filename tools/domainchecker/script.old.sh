#!/bin/bash

# NOTE 
# THIS IS AN OLD VERSION
# THE NEW SCRIPT USES NODE
# PLEASE REFER TO index.js



SOURCE="$1"
LIMIT="$2"

# Check provided arguments
[ "$#" -eq 2 ] || exit "2 arguments required, $# provided. Example: ./app <domains.txt> <limit>"
[[ -f "$1" ]] || exit "File '$1' does not exist. Example: ./app <domains.txt> <limit>"
echo $2 | grep -E -q '^[0-9]+$' || exit "Numeric argument required, '$2' provided. Example: ./app <domains.txt> <limit>"

# Copy contents of original file to tmp.txt
# and fix line endings using dos2unix.
cat "$SOURCE" > tmp.txt
sed -i '' 's/;/,/g' tmp.txt
dos2unix tmp.txt
DOMAINS="tmp.txt"


# DNS UPSTREAMS
# =============
declare -a DNS_UPSTREAMS=(
    "127.0.0.1"                             #1  AGH
    "9.9.9.9"                               #2  Quad9
    "208.67.222.123"                        #3  OpenDNS Family Shield
    "1.1.1.3"                               #4  Cloudflare Malware+Adult
    "185.228.168.9"                         #5  CleanBrowsing Security
    "8.26.56.26"                            #6  Comodo Secure DNS
    "156.154.70.2"                          #7  Neustar Threat Protection               
    "149.112.121.30"                        #8  CIRA Shield DNS Family
    "76.76.2.1"                             #9  ControlD Block malware
    "101.226.4.6"                           #10 360 Secure DNS
    "94.140.14.15"                          #11 AdGuard Family Protection
    "https://doh-de.blahdns.com/dns-query"  #12 BlahDNS Filtered
)

# =================================================================== #

# Colors
NC='\033[0m'
Red='\033[0;31m'
Green='\033[0;32m'
Gray='\033[0;37m'
BBlack='\033[1;30m'

declare -a GOOD_DOMAINS=()
declare -a BAD_DOMAINS=()

echo "Running..."
killall dnsproxy &>/dev/null
sleep 1

# Run a dns proxy for each upstream
# on localhost from port 5300 onwards
port=5300
for upstream in "${DNS_UPSTREAMS[@]}"; do
    ./dnsproxy -l 127.0.0.1 -p $port -u "$upstream" &>/dev/null &
    ((port++))
done

# Wait for proxies to start
while ! pgrep -f "dnsproxy" > /dev/null; do
    sleep 0.1
done
sleep 2

# Get length of the longest domain in source file
ll_length=$(awk '{print length}' ${DOMAINS} |sort -nr|head -1)

# Print table headers
echo -e -n "\n${BBlack}#    "
printf "%-${ll_length}s " "domain"
number_of_upstreams=${#DNS_UPSTREAMS[@]}
for (( i=1; i<=${number_of_upstreams}; i++ )); do
    printf " $i "
done
echo -e " continent  reachable  iframe-less  content-length  language  threat   is_eu${NC}"


good_count=0
i=1

while read rank_domain; do
    domain=$(echo "${rank_domain}" | cut -d "," -f 2)
    ok=1
    port=5300
    j=1
    domain_results=""

    # Check current domain against DNS upstreams
    for upstream in "${DNS_UPSTREAMS[@]}"; do
        ip=$(dig @127.0.0.1 -p $port +short +time=3 +tries=1 "$domain" | tail -n1)
        if (( $j >= 10 )); then domain_results+=" "; fi
        if ! [[ -z "$ip" || "$ip" == "0.0.0.0" ]]; then
            domain_results+=$(printf " ${Green}v ")
        else
            domain_results+=$(printf " ${Red}x ")
            ok=0
            # Stop checking remaining upstreams whenever one fails 
            # and print remaining dashes.
            for (( remaining=$j; remaining<${number_of_upstreams}; remaining++ )); do
                if (( $remaining >= 9 )); then domain_results+=" "; fi
                domain_results+=$(printf " ${Gray}- ")
            done
            break
        fi
        ((port++))
        ((j++))
    done

    # Check continent with GeoLite2
    ip=""
    if [ $ok -eq 1 ]; then
        ip=$(dig @8.8.8.8 +short +time=3 +tries=1 "$domain" | tail -n1)
        continent=$(gtimeout 10s mmdbinspect --db GeoLite2-Country.mmdb "$ip" 2> /dev/null | jq -r '.[0].Records | .[0].Record.continent.code' 2> /dev/null)
        if [[ "$continent" == "NA" || "$continent" == "EU" ]]; then
            domain_results+=$(printf "${Green}%7s" $continent)
        elif [[ -z "$continent" || "$continent" == "" || "$continent" == "null" ]]; then
            domain_results+=$(printf "${Gray}%7s" "?")
        else
            domain_results+=$(printf "${Red}%7s" $continent)
            ok=0
        fi
    else
        domain_results+=$(printf "      ${Gray}-")
    fi
    
    # Check reachability
    final_url=""
    if [ $ok -eq 1 ]; then
        final_url=$(curl -sL -I --connect-timeout 3 --max-time 5 -w "%{url_effective}\\n" "$domain" -o /dev/null)
        final_url="${final_url/http:/https:}" # upgrade final_url to https
        http_code=$(curl -s -I --connect-timeout 3 --max-time 5 -w "%{http_code}\\n" "$final_url" -o /dev/null)
        # Final status must be 'ok' and %like% the same original domain
        if [[ $http_code == 200 && $final_url == *"$domain"* ]]; then
            domain_results+=$(printf "         ${Green}v")
        else
            domain_results+=$(printf "         ${Red}x")
            ok=0
        fi
    else
        domain_results+=$(printf "         ${Gray}-")
    fi

    # # Check if website source contains 'iframe'
    # if [ $ok -eq 1 ]; then
    #     raw_content=$(curl -s --connect-timeout 5 --max-time 8 "$final_url")
    #     if [[ $raw_content != *"iframe"* ]]; then
    #         domain_results+=$(printf "           ${Green}v")
    #     else
    #         domain_results+=$(printf "           ${Red}x")
    #         ok=0
    #     fi
    # else
    #     domain_results+=$(printf "           ${Gray}-")
    # fi
    domain_results+=$(printf "           ${Gray}?") #Skip for now

    # Check content length
    content=""
    if [ $ok -eq 1 ]; then
        content=$(gtimeout 10s w3m -dump "$final_url" 2> /dev/null)
        content_length=${#content}
        if (( $content_length >= 1000 )); then
            domain_results+=$(printf "${Green}%16s" $content_length)
        else
            domain_results+=$(printf "${Red}%16s" $content_length)
            ok=0
        fi
    else
        domain_results+=$(printf "${Gray}%16s" "-")
    fi

    # Detect language
    if [ $ok -eq 1 ]; then
        language=$(echo "$content" | franc | tail -n1)
        if [[ "$language" == "nld" || "$language" == "eng" ]]; then
            domain_results+=$(printf "${Green}          %3s" $language)
        else
            domain_results+=$(printf "${Red}          %3s" $language)
            ok=0
        fi
    else
        domain_results+=$(printf "${Gray}          %2s " "-")
    fi

    # ipdata
    if [ $ok -eq 1 ]; then
        ipdata=$(gtimeout 10s ipdata "$ip" 2> /dev/null)
        is_eu=$(echo $ipdata | jq  -r '.is_eu' 2> /dev/null)
        is_threat=$(echo $ipdata | jq  -r '.threat.is_threat' 2> /dev/null)

        if [[ "$is_threat" == "false" ]]; then
            domain_results+=$(printf "${Green}%10s" $is_threat)
        else
            domain_results+=$(printf "${Red}%10s" $is_threat)
            ok=0
        fi

        if [[ "$is_eu" == "true" ]]; then
            domain_results+=$(printf "${Gray}%8s" $is_eu)
        else
            domain_results+=$(printf "${Gray}%8s" $is_eu)
        fi
    else
        domain_results+=$(printf "${Gray}%10s%8s" "-" "-")
    fi

    # Separate the good from the bad domains
    domain_color=${Red}
    if [ $ok -eq 1 ]; then
        domain_color=${Green}
        GOOD_DOMAINS+=($rank_domain)
        ((good_count++))
    fi

    # Print results
    printf "${NC}%-5s${domain_color}%-${ll_length}s %s" $i "$domain"
    echo -e "${domain_results}"

    if (( "$good_count" == "$LIMIT" )); then
        break
    fi

    ((i++))
    sleep 0.1
done <$DOMAINS

echo ""
echo "Goodbye."
killall dnsproxy
exit