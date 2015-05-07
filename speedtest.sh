#!/bin/bash
if [ "$#" -ne 2  ]; then
  echo "Usage: ./speedtest.sh http://example.com 10"
  exit
fi

url=$1
times=$2

cat /dev/null > test.log

for i in `seq 1 ${times}`;
do
  echo "Downloading page, time: ${i} ..."
  phantomjs eval.js $url >> speedtest.log
done

echo "Average DOMContentLoaded time is:"
cat speedtest.log| grep DOMContentLoaded \
  | awk '{ sum += $3; n++  } END { if (n > 0) print sum / n " msec"; }'

echo "Average Loading time is:"
cat speedtest.log| grep Loading \
  | awk '{ sum += $3; n++  } END { if (n > 0) print sum / n "msec"; }'

echo "You can check the log to get more information."
#cat speedtest.log | grep -e 'Loading\|DOMContent'

