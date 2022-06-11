#!/bin/bash
ip="$1"
ipdata=$(gtimeout 5s ipdata "$ip" 2> /dev/null)
is_threat=$(echo $ipdata | jq  -r '.threat.is_threat' 2> /dev/null)
echo "$is_threat"