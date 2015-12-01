#!/usr/local/bin/node
const exec = require('child_process').exec;

const forExcel = Boolean(process.argv[1]);

const ALL_SITES = [
	"https://www.petermillar.com/",
	"https://www.neffheadwear.com/",
	"https://www.bollandbranch.com/",
	"https://www.diamondcandles.com/",
	"https://store.fijiwater.com/",
	"https://www.theelephantpants.com/",
	"https://www.drinkhint.com/"
];

const REQUEST_TIME = 3;

var allResults = {};

function analyzeResult(result) {
	const matches = result.match(/Average[\s\S]+?msec/mig);
	var output = {};
	matches.forEach(match => {
		const rows = match.match(/Average (\w+) time is:\s+([\d\.]+) msec/mi);
		output[rows[1]] = rows[2];
	});
	return output;
}

function doSpeedTestForSite(site) {
	return new Promise((resolve, reject) => {
		const cmd = `${__dirname}/speedtest.sh -c=${REQUEST_TIME} ${site}`;
		console.log(`Executing cmd ${cmd}...`);
		const child = exec(cmd, (error, stdout, stderr) => {
	    if (error !== null) {
	      console.log('exec error: ' + error);
				reject(stderr);
	    } else {
				resolve(stdout);
			}
		});
	});
}

function doAllSpeedTest(sites) {
	if (!sites.length) {
		if (forExcel) {
			printResultForExcel(ALL_SITES);
		} else {
			printResult();
		}
		return;
	}
	const site = sites.shift();
	doSpeedTestForSite(site).then(stdout => {
		const result = analyzeResult(stdout);
		addResult(site, result);
		doAllSpeedTest(sites);
	});
}

function addResult(site, result) {
	allResults[site] = result;
}

function printResult() {
	console.log('----------');
	for (var site in allResults) {
		console.log(site);
		console.log('load time:', allResults[site].OnloadEvent);
		console.log('dom ready time:', allResults[site].DOMContentLoaded);
		console.log('hero image:', allResults[site].HeroImageLoaded);
		console.log('----------');
	}
}

function printResultForExcel() {
	console.log('----------');
	ALL_SITES.forEach(site => {
		console.log('onLoad:', allResults[site].OnloadEvent);
		console.log('domReady:', allResults[site].DOMContentLoaded);
		console.log('heroImage:', allResults[site].HeroImageLoaded);
	});
}

doAllSpeedTest(ALL_SITES.slice());
