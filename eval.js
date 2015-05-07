var page = require('webpage').create(),
  system = require('system'),
  args = {};


if (system.args.length === 1) {
  console.log('Usage: phantomjs eval.js <some URL>');
  phantom.exit(1);
} else {

  page.address = system.args[1];
  page.isReload = false;

  args.count = parseInt(system.args[2]) || 1;
  args.useCache = system.args[3] || false;

  // if we need to check use cache, we need to load 
  // one more time to get the cache
  if (args.useCache) {
    args.count += 1;
  }
  // TODO
  // now if we call page.reload
  // it's always using cache,
  // we need to figure out how to force refresh in phantom
  // for now, we just set count=1
  else {
    args.count = 1;
  }

  page.onLoadStarted = function(status) {
    page.startTime = Date.now();
  };

  page.onLoadFinished = function(status) {
    if (status !== 'success') {
      console.log('FAIL to load the address');
      phantom.exit();
      return;
    }

    // if it's using cache, and it's the first time loading
    // we set isReload to true
    if (args.useCache && !page.isReload) {
      page.isReload = true;
    }
    // if it's not using cache or it's reload
    // we record the time
    else {
      page.endTime = Date.now();
      console.log('Loading time ' + (Date.now() - page.startTime) + ' msec');
    }
    
    if (--args.count > 0) {
      page.reload();
    } else {
      phantom.exit();
    }
  };

  page.onInitialized = function() {

    // if it's first time loading when using cache
    // we don't need to record
    if (args.useCache && !page.isReload) {
      console.log('Fetching page for the first time...');
      return;
    }

    console.log('Openning the page... ');

    page.evaluate(function(domContentLoadedMsg) {
      document.addEventListener('DOMContentLoaded', function() {
        window.callPhantom('DOMContentLoaded');
      }, false);
    });
  };

  page.onCallback = function(data) {
    if (data === 'DOMContentLoaded') {
      console.log('DOMContentLoaded time ' + (Date.now() - page.startTime) + ' msec');
    }
  };

  page.open(page.address);
};