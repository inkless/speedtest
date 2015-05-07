#!/bin/bash
useCache=0
count=1

for i in "$@"
do
case $i in
    -e|--cache)
    useCache=1
    shift
    ;;
    -c=*|--count=*)
    count="${i#*=}"
    shift
    ;;
    *)
    # unknown option
    ;;
esac
done

target=$1;

if [[ ! $target ]]; then
    echo "Usage: ./speedtest.sh [options] [target]"
    echo "Options:"
    echo "  -e, --cache         use cache"
    echo "  -c, --count=val     how many times do you want to request"
    exit
fi

scripts="eval.js"
if [ $useCache -eq 1 ]; then
  scripts="reload.js"
fi

cat /dev/null > speedtest.log

for i in `seq 1 ${count}`;
do
  echo "Downloading page, time: ${i} ..."
  phantomjs $scripts $target >> speedtest.log
done

echo "Average DOMContentLoaded time is:"
cat speedtest.log| grep DOMContentLoaded \
  | awk '{ sum += $3; n++  } END { if (n > 0) print sum / n " msec"; }'

echo "Average Loading time is:"
cat speedtest.log| grep Loading \
  | awk '{ sum += $3; n++  } END { if (n > 0) print sum / n "msec"; }'

echo "You can check the log to get more information."
#cat speedtest.log | grep -e 'Loading\|DOMContent'

