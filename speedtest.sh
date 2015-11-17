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

timestamp=$(date +%s)
logName=speedtest_${timestamp}.log

cat /dev/null > $logName

if [ $useCache -eq 1 ]; then
  echo "You are estimating pages using cache, it may take a while..."
  echo "There might be no output in the terminal until it's done..."
  echo "Please be patient, or you can check the log to see what's going on..."
  echo "Use command: tail -f $logName"
  phantomjs eval.js $target $count true >> $logName
else
  echo "You are estimating pages without cache, it may take a while..."
  for i in `seq 1 ${count}`;
  do
    echo "Fetching page, time: ${i} ..."
    phantomjs eval.js $target >> $logName
  done
fi

keywords=(HeroImageLoaded HalfInitialImagesLoaded AllInitialImagesLoaded \
  HalfImagesLoaded EightyPercentsImagesLoaded AllImagesLoaded \
  DOMContentLoaded Loading OnloadEvent)

for i in "${keywords[@]}"
do
  echo "Average ${i} time is:"
  cat $logName| grep $i \
    | awk '{ sum += $3; n++  } END { if (n > 0) print sum / n " msec"; }'
done

failCounts=`cat $logName| grep 'FAIL to load the address' | wc -l`
echo "Fail counts: $failCounts"

echo "You can check the log to get more information."
#cat $logName | grep -e 'Loading\|DOMContent'
