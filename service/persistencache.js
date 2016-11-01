'use strict';
const db = require('monk')('localhost/mydb').get('cache'),
    Promise = require('bluebird');

function remove(key) {
    return new Promise(function (resolve, reject) {
        db.remove({ 'key': key }, { multi: true }, function (err, numRemoved) {
            if (err) {
                return reject(err);
            }
            resolve(numRemoved);
        });
    });
}
function get(key) {
    return new Promise(function (resolve, reject) {
        db.findOne({ key: key }, function (err, doc) {
            if (err || doc === null) {
                console.log('doc was null for key : ', key);
                return reject(err);
            }
            console.log('doc was not null for key : ', key);
            if (typeof doc.expiry === 'undefined' || doc.expiry === null) {
                return resolve(doc.value);
            }
            if (new Date().getTime() > doc.expiry) {
                return remove(key).then(function () {
                    reject('key expired');
                }, function () {
                    reject('key expired');
                });
            }
            resolve(doc.value);
        })
    });
}
function set(key, value, expiryInLongDateTime) {
    return new Promise(function (resolve, reject) {
        var obj = {
            key: key,
            value: value,
            expiry: expiryInLongDateTime
        };
        db.insert(obj, function (err, newDoc) {
            if (err) {
                return reject(err);
            }
            resolve(newDoc);
        });
    });
}

module.exports = {
    set: set,
    get: get,
    remove: remove
}