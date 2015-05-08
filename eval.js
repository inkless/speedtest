var page = require('webpage').create(),
  system = require('system'),
  args = {};

const HERO_IMAGE_WIDTH = 500;


if (system.args.length === 1) {
  console.log('Usage: phantomjs eval.js <some URL>');
  phantom.exit(1);
} else {

  var imageResources = [];

  page.viewportSize = {
    width: 1280,
    height: 800
  };

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
    imageResources = [];
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
      showHeroImageLog();
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

    page.evaluate(evalFunction);
  };

  page.onCallback = function(data) {
    if (typeof data === "object") {
      switch (data.type) {
        case 'timer':
          console.log(data.name + ' time ' + (Date.now() - page.startTime) + ' msec');
          break;
        case 'image':
          data.timestamp = Date.now();
          imageResources.push(data);
          break;
      }
      return;
    }

    console.log(data);
  };

  function showHeroImageLog() {
    imageResources.forEach(function(img) {
      if (img.width > HERO_IMAGE_WIDTH || img.height > HERO_IMAGE_WIDTH) {
        console.log("HeroImageLoaded time " + (img.timestamp - page.startTime) + " msec with width " + img.width + ", height " + img.height + ", src " + img.src);
      }
    });
  }

  /**
   * eval function
   * the scope is different from current scope,
   * it's using browser's scope
   */
  function evalFunction() {
    var docWidth,
      docHeight;

    document.addEventListener('DOMContentLoaded', function() {

      docWidth = document.body.offsetWidth;
      docHeight = document.body.offsetHeight;

      // call phantom
      window.callPhantom({
        type: 'timer',
        name: 'DOMContentLoaded'
      });

      // Specific for Compose:
      if (typeof COMPOSE_DATA === 'object') {
        Loader(function() {

          // wait angular
          setTimeout(function() {
            checkImageLoading();
          }, 500);
        });
      } else {
        checkImageLoading();
      }

    }, false);

    function checkImageLoading() {
      var imgs = document.getElementsByTagName('img'),
        imgCount = imgs.length,
        needLoad = imgCount;

      // show images number
      window.callPhantom('Initial images need to be loaded: ' + imgs.length);

      imgs = Array.prototype.slice.apply(imgs);

      imgs.forEach(function(img, index) {
        if (img.complete) {
          --needLoad;
          logImage(img);
          checkNeedLoad(needLoad, imgCount);
          return;
        }

        img.onload = function() {
          --needLoad;
          logImage(img);
          checkNeedLoad(needLoad, imgCount);
        };
      });
    }

    function logImage(img) {
      if (img.offsetWidth) {
        var rect = img.getBoundingClientRect();
        // images which are really showing in the website
        if (rect.top > 0
          && rect.top + img.offsetHeight / 2 < docHeight
          && rect.left > 0
          && rect.left + img.offsetWidth / 2 < docWidth) {

          window.callPhantom({
            type: 'image',
            width: img.offsetWidth,
            height: img.offsetHeight,
            src: img.src
          });
        }
      }
    }

    var allDone = false,
      halfDone = false,
      mostDone = false;

    function checkNeedLoad(needLoad, imgCount) {
      // window.callPhantom('image loaded, remain: ' + needLoad);
      if (needLoad < imgCount / 2 && !halfDone) {
        window.callPhantom({
          type: 'timer',
          name: 'HalfImagesLoaded'
        });
        halfDone = true;
      } else if (needLoad < imgCount / 5 && !mostDone) {
        window.callPhantom({
          type: 'timer',
          name: 'EightyPercentsImagesLoaded'
        });
        mostDone = true;
      } else if (needLoad === 0 && !allDone) {
        window.callPhantom({
          type: 'timer',
          name: 'AllImagesLoaded'
        });
        allDone = true;
      }
    }
  }

  page.open(page.address);
};