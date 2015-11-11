#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var spawn = require('child_process').spawn;

var chokidar = require('chokidar');
var debounce = require('lodash.debounce');
var uniq = require('lodash.uniq');

var configPath = path.resolve(process.cwd(), process.argv[2] || './config.json');

if (fs.existsSync(configPath)) {
    try {
        var config = require(configPath);
    } catch (e) {
        console.error('Can\'t parse config file: %s', e.message);
        process.exit(1);
    }
} else {
    console.error('Can\'t find config file');
    process.exit(1);
}

var watchedDir = path.resolve(config.cwd);
var watcher = chokidar.watch(watchedDir, {
    ignored: config.ignore,
    ignoreInitial: true,
    cwd: watchedDir
});

var changedFiles = [];
watcher
    .on('ready', function() {
        console.log('Watching %s', this.options.cwd);
    })
    .on('change', function (path) {
        console.log('%s has been changed', path);
        changedFiles.push(path);
    })
    .on('all', debounce(function () {
        changedFiles = uniq(changedFiles);

        var command = config.command.replace(/%files%/g, changedFiles.join(' '));

        // TODO: What if we run this again before first child finished?
        var child = spawn('sh', ['-c'].concat(command), {
            cwd: watchedDir,
            stdio: 'inherit'
        });

        changedFiles = [];
    }, config.debounce));
