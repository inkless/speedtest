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
      setTimeout(reloadPage, 10);
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
      showImagesLoadingTime();
      console.log('Loading time ' + (Date.now() - page.startTime) + ' msec');
    }

    reloadPage();
  };

  function reloadPage() {
    if (--args.count > 0) {
      page.reload();
    } else {
      phantom.exit();
    }
  }

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
          consoleTimer(data);
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

  function showImagesLoadingTime() {

    var total = imageResources.length,
      allDone = false,
      mostDone = false,
      halfDone = false;

    // sort by timestamp asc
    imageResources.sort(function(a, b) {
      return a.timestamp > b.timestamp;
    });

    // show hero images
    imageResources.forEach(function(img, index) {
      if (img.width > HERO_IMAGE_WIDTH || img.height > HERO_IMAGE_WIDTH) {
        consoleTimer({
          name: 'HeroImageLoaded',
          ts: img.timestamp,
          ext: "with width " + img.width + ", height " + img.height + ", src " + img.src
        });
      }
      var i = index+1;

      if ((i > total / 2) && !halfDone) {
        consoleTimer({
          name: 'HalfImagesLoaded',
          ts: img.timestamp
        });
        halfDone = true;
      }

      if ((i > total * 0.8) && !mostDone) {
        consoleTimer({
          name: 'EightyPercentsImagesLoaded',
          ts: img.timestamp
        });
        mostDone = true;
      }

      if ((i === total) && !allDone) {
        consoleTimer({
          name: 'AllImagesLoaded',
          ts: img.timestamp
        });
        allDone = true;
      }

    });

    var initialImageResouces = imageResources.filter(function(v) {
      return v.initial;
    });

    var initialImagesCount = initialImageResouces.length,
      initialHalfDone = false,
      initialAllDone = false;

    initialImageResouces.forEach(function(img, index) {
      var i = index+1;

      if ((i > initialImagesCount / 2) && !initialHalfDone) {
        consoleTimer({
          name: 'HalfInitialImagesLoaded',
          ts: img.timestamp
        });
        initialHalfDone = true;
      }

      if ((i === initialImagesCount) && !initialAllDone) {
        consoleTimer({
          name: 'AllInitialImagesLoaded',
          ts: img.timestamp
        });
        initialAllDone = true;
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
      docHeight,
      totalImagesCount,
      allImages,
      needLoad;

    document.addEventListener('DOMContentLoaded', function() {

      docWidth = document.body.offsetWidth;
      docHeight = document.body.offsetHeight;
      allImages = [];
      totalImagesCount = needLoad = 0;

      // call phantom
      window.callPhantom({
        type: 'timer',
        name: 'DOMContentLoaded'
      });

      throttle(function() {
        checkImageLoading(document.getElementsByTagName('img'));
      }, 500);

    }, false);

    function throttle(func, t, total) {
      t = t || 1000;
      total = total || 10;
      var _f = function() {
        func();
        if (--total === 0) {
          return;
        }
        setTimeout(_f, t);
      };
      _f();
    }

    function addToAllImages(imgs) {
      var added = [];

      // if we have new images
      if (imgs.length > allImages.length) {
        imgs = Array.prototype.slice.apply(imgs);
        imgs.forEach(function(img) {
          // img not in our allImages,
          // we need to add it into allImages
          if (!~allImages.indexOf(img)) {
            allImages.push(img);
            added.push(img);
          }
        });
      }
      return added;
    }

    function checkImageLoading(imgs) {
      var initialCheck = totalImagesCount === 0;
      var added = addToAllImages(imgs);
      // if nothing added, just return
      if (!added.length) {
        return;
      }

      totalImagesCount += added.length;
      needLoad += added.length;

      // show images number
      window.callPhantom('Adding ' + added.length + ' images, total remain:' + needLoad);

      added.forEach(function(img, index) {
        img.initial = initialCheck;
        if (img.complete) {
          --needLoad;
          logImage(img);
          return;
        }

        img.onload = function() {
          --needLoad;
          logImage(img);
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
            src: img.src,
            initial: img.initial
          });
        }
      }
    }
  }

  function consoleTimer(data) {
    var ts = data.ts || Date.now(),
      ext = data.ext || "";
    console.log(data.name + ' time ' + (ts - page.startTime)  + ' msec ' + ext);
  }

  page.open(page.address);
};