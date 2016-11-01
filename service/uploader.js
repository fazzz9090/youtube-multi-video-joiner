'use strict';
const authenticator = require('./authenticator'),
    persistencache = require('./persistencache'),
    fs = require("fs"),
    Youtube = require("youtube-api"),
    uuid = require('node-uuid'),
    Promise = require('bluebird');

function uploadVideo(uploadObject) {
    return new Promise(function (resolve, reject) {
        persistencache.get('gAuthToken').then(function (gAuthToken) {
            console.log('Token found from cache. Lets not re-authenticate : ' + gAuthToken);
            authenticator.authorizeWithToken(JSON.parse(gAuthToken));
            plainUploadVideo(uploadObject).then(function (success) {
                resolve('success');
            }, function (err) {
                reject(err);
            });
        }, function (err) {
            console.log('Error fetching gAuthToken from cache. Lets re-authenticate : ' + err);
            let pathId = uuid.v4();
            return persistencache.set(pathId, JSON.stringify(uploadObject)).then(function (newDoc) {
                authenticator.authenticate(pathId).then(function (success) {
                    console.log('Successfully authenticated');
                    resolve('success');
                }, function (err) {
                    console.log('Authentication failed');
                    reject(err);
                })
            }, function (err) {
                console.log('GToken was not set');
                reject(err);
            });
        })
    });
}
/**
 * Assumes that authentication is complete
 */
function plainUploadVideo(uploadObject) {
    return new Promise(function (resolve, reject) {
        Youtube.videos.insert({
            resource: {
                snippet: {
                    title: uploadObject.title,
                    description: uploadObject.description,
                    tags: uploadObject.tags
                }, status: {
                    privacyStatus: uploadObject.privacyStatus
                }
            },
            part: "snippet,status",
            notifySubscribers: uploadObject.notifySubscribers,
            media: {
                body: fs.createReadStream(uploadObject.relativePath)
            }
        }, (err, data) => {
            if (err) {
                console.log('Error uploading video : ' + JSON.stringify(uploadObject) + JSON.stringify(err));
                return reject(err, uploadObject);
            }
            console.log('Successfully uploaded video : ' + JSON.stringify(uploadObject));
            resolve(uploadObject);
        });
    });
}

module.exports = {
    uploadVideo: uploadVideo,
    plainUploadVideo: plainUploadVideo
}