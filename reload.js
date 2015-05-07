if (!Date.prototype.toISOString) {
    Date.prototype.toISOString = function () {
        function pad(n) { return n < 10 ? '0' + n : n; }
        function ms(n) { return n < 10 ? '00' + n : n < 100 ? '0' + n : n }
        return this.getFullYear() + '-' +
            pad(this.getMonth() + 1) + '-' +
            pad(this.getDate()) + 'T' +
            pad(this.getHours()) + ':' +
            pad(this.getMinutes()) + ':' +
            pad(this.getSeconds()) + '.' +
            ms(this.getMilliseconds()) + 'Z';
    }
}

function createHAR(address, title, startTime, resources) {
    var entries = [];

    resources.forEach(function (resource) {
        var request = resource.request,
            startReply = resource.startReply,
            endReply = resource.endReply;

        if (!request || !startReply || !endReply) {
            return;
        }

        // Exclude Data URI from HAR file because
        // they aren't included in specification
        if (request.url.match(/(^data:image\/.*)/i)) {
            return;
        }

        entries.push({
            startedDateTime: request.time.toISOString(),
            time: endReply.time - request.time,
            request: {
                method: request.method,
                url: request.url,
                httpVersion: "HTTP/1.1",
                cookies: [],
                headers: request.headers,
                queryString: [],
                headersSize: -1,
                bodySize: -1
            },
            response: {
                status: endReply.status,
                statusText: endReply.statusText,
                httpVersion: "HTTP/1.1",
                cookies: [],
                headers: endReply.headers,
                redirectURL: "",
                headersSize: -1,
                bodySize: startReply.bodySize,
                content: {
                    size: startReply.bodySize,
                    mimeType: endReply.contentType || ""
                }
            },
            cache: {},
            timings: {
                blocked: 0,
                dns: -1,
                connect: -1,
                send: 0,
                wait: startReply.time - request.time,
                receive: endReply.time - startReply.time,
                ssl: -1
            },
            pageref: address
        });
    });

    return {
        log: {
            version: '1.2',
            creator: {
                name: "PhantomJS",
                version: phantom.version.major + '.' + phantom.version.minor +
                '.' + phantom.version.patch
            },
            pages: [{
                startedDateTime: startTime.toISOString(),
                id: address,
                title: title,
                pageTimings: {
                    onLoad: page.endTime - page.startTime
                }
            }],
            entries: entries
        }
    };
}

var fs = require('fs'),
    page = require('webpage').create(),
    system = require('system'),
    har;

if (system.args.length === 1) {
    console.log('Usage: phantomjs reload.js <some URL>');
    phantom.exit(1);
} else {
    page.isReload = false;
    page.address = system.args[1];
    page.resources = [];

    page.onLoadStarted = function (status) {
        page.startTime = new Date();
    };

    page.onLoadFinished = function (status) {
        page.endTime = new Date();

        if (page.isReload) {
            page.title = page.evaluate(function () {
                return document.title;
            });

            har = createHAR(page.address, page.title, page.startTime, page.resources);
//            console.log(JSON.stringify(har, undefined, 4));
            console.log('Loading time ' + (Date.now() - page.reloadStartTime) + ' msec');
            phantom.exit();
        }
    };

    page.onResourceRequested = function (req) {
        page.resources[req.id] = {
            request: req,
            startReply: null,
            endReply: null
        };
    };

    page.onResourceReceived = function (res) {
        if (res.stage === 'start') {
            page.resources[res.id].startReply = res;
        }
        if (res.stage === 'end') {
            page.resources[res.id].endReply = res;
        }
    };

    page.onInitialized = function () {
        if (!page.isReload) return;
        page.evaluate(function () {
            document.addEventListener('DOMContentLoaded', function () {
                window.callPhantom('DOMContentLoaded');
            }, false);
        });
    };

    page.onCallback = function (data) {
        if (data === 'DOMContentLoaded') {
            console.log('DOMContentLoaded time ' + (Date.now() - page.reloadStartTime) + ' msec');
        }
    };

    page.open(page.address, function (status) {
        if (status !== 'success') {
            console.log('FAIL to load the address');
            phantom.exit(1);
        } else {
            page.isReload = true;
            page.reloadStartTime = Date.now();
            page.reload();
        }

    });
}