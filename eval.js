var page = require('webpage').create(),
system = require('system'),
t, address;


if (system.args.length === 1) {
  console.log('Usage: phantomjs eval.js <some URL>');
  phantom.exit(1);
} else {
  t = Date.now();
  address = system.args[1];

  page.onInitialized = function() {
    page.evaluate(function(domContentLoadedMsg) {
      document.addEventListener('DOMContentLoaded', function() {
        window.callPhantom('DOMContentLoaded');
      }, false);
    });
  };

  page.onCallback = function(data) {
    if (data === 'DOMContentLoaded') {
      console.log('DOMContentLoaded time ' + (Date.now() - t) + ' msec');
    }
  };

  page.open(address, function (status) {
    if (status !== 'success') {
      console.log('FAIL to load the address');
    } else {
      console.log('Loading time ' + (Date.now() - t) + ' msec');
    }
    phantom.exit();
  });
};

