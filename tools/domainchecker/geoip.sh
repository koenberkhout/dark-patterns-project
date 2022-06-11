#!/bin/bash
ip="$1"
continent=$(gtimeout 5s mmdbinspect --db ./geoip.mmdb "$ip" 2> /dev/null | jq -r '.[0].Records | .[0].Record.continent.code' 2> /dev/null)
echo "$continent"