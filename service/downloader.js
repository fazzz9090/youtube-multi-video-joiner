'use strict';
const fs = require('fs'),
    Promise = require('bluebird'),
    youtubedl = require('youtube-dl'),
    config = require('config');

function downloadVideo(url, downloadPath) {
    return new Promise(function (resolve, reject) {
        var video = youtubedl(url, [], {});
        if (typeof downloadPath === 'undefined' || downloadPath === null || downloadPath === '') {
            downloadPath = config.get('downloadVideoPath');
        }
        var videoId = getVideoId(url);
        downloadPath += '/' + videoId + '.mp4';
        if (typeof videoId === 'undefined' || videoId === null || videoId === '') {
            return reject('Invalid url, video id not found');
        }
        video.on('error', function (err) {
            reject(err);
        });
        video.on('end', function () {
            resolve(downloadPath);
        });
        video.pipe(fs.createWriteStream(downloadPath));
    });
}

function getVideoId(url) {
    var regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    var match = url.match(regExp);
    if (match && match[2].length == 11) {
        return match[2];
    }
    return null;
}

module.exports = {
    downloadVideo: downloadVideo,
    getVideoId: getVideoId,
};