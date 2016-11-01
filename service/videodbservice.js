'use strict';
const db = require('monk')('localhost/mydb').get('videos'),
    Promise = require('bluebird');

function getVideos(query, pageNumber, pageSize) {
    query = query || '';
    pageNumber = pageNumber || 1;
    pageSize = pageSize || 10;
    return new Promise(function (resolve, reject) {
        db.find({ 'title': new RegExp('\.*' + query + '\.*', 'i') }, { skip: (pageNumber - 1) * pageSize, limit: pageSize },
            function (err, docs) {
                if (err) {
                    return reject(err);
                }
                console.log(docs);
                resolve(docs);
            });
    });
}
function isAnyVideoInProgress() {
    return new Promise(function (resolve, reject) {
        db.find({ 'status': { $in: ['IN_PROGRESS', 'IN_PROGRESS_DOWNLOADED', 'IN_PROGRESS_CONVERTED', 'IN_PROGRESS_UPLOADED'] } },
            function (err, docs) {
                if (err) {
                    return reject(err);
                }
                resolve(docs.length > 0 ? docs[0] : undefined);
            });
    });
}
function findOldestInitialized() {
    return new Promise(function (resolve, reject) {
        db.find({ 'status': 'INITIALIZED' }, { sort: { dateCreated: 1, limit: 1 } },
            function (err, docs) {
                if (err) {
                    return reject(err);
                }
                if (docs.length > 0) {
                    return resolve(docs[0]);
                }
                reject('No entries found for query');
            });
    });
}
function updateStatus(_id, newStatus) {
    return new Promise(function (resolve, reject) {
        db.findOneAndUpdate({ _id: _id }, { $set: { status: newStatus, lastModified : new Date().getTime() } }, function (err, newDoc) {
            if (err) {
                return reject(err);
            }
            resolve(newDoc);
        });
    });
}
function updateStatusWithError(_id, newStatus, err) {
    return new Promise(function (resolve, reject) {
        db.findOneAndUpdate({ _id: _id }, { $set: { status: newStatus, error: err, lastModified : new Date().getTime() } }, function (err, newDoc) {
            if (err) {
                return reject(err);
            }
            resolve(newDoc);
        });
    });
}
function saveVideo(video) {
    return new Promise(function (resolve, reject) {
        db.insert(video, function (err, newDoc) {
            if (err) {
                return reject(err);
            }
            resolve(newDoc);
        });
    });
}

module.exports = {
    getVideos: getVideos,
    saveVideo: saveVideo,
    isAnyVideoInProgress: isAnyVideoInProgress,
    findOldestInitialized: findOldestInitialized,
    updateStatus: updateStatus,
    updateStatusWithError: updateStatusWithError
}