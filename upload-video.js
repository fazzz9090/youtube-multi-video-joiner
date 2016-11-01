'use strict';
const uploader = require('./service/uploader');

uploader.uploadVideo({
    relativePath: 'abc.mp4',
    tags: ['asd', 'sdggg'],
    title: 'T1',
    description: 'D1',
    privacyStatus: 'private',
    notifySubscribers: false
}).then(function(success) {
    process.exit();
}, function(err) {
    process.exit();
});