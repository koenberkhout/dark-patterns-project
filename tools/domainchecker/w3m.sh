#!/bin/bash
url="$1"
content=$(gtimeout 15s w3m -dump "$url" 2> /dev/null)
echo "$content"