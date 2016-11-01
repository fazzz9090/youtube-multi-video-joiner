"use strict";
const Youtube = require("youtube-api"),
    Nightmare = require('nightmare'),
    persistencache = require('./persistencache'),
    config = require('config'),
    CREDENTIALS = config.get('credentials'),
    Promise = require('bluebird');

// Authenticate
// You can access the Youtube resources via OAuth2 only.
// https://developers.google.com/youtube/v3/guides/moving_to_oauth#service_accounts
function authenticate(pathId) {
    return new Promise(function (resolve, reject) {
        var oauth = Youtube.authenticate({
            type: "oauth"
            , client_id: CREDENTIALS.web.client_id
            , client_secret: CREDENTIALS.web.client_secret
            , redirect_url: CREDENTIALS.web.redirect_uris[0]
        });

        var url = oauth.generateAuthUrl({
            access_type: "offline",
            scope: ["https://www.googleapis.com/auth/youtube.upload"
            ,'https://www.googleapis.com/auth/youtube'
            ,'https://www.googleapis.com/auth/youtube.force-ssl'
            ,'https://www.googleapis.com/auth/youtube.readonly'
            ,'https://www.googleapis.com/auth/youtubepartner'
            ,'https://www.googleapis.com/auth/youtubepartner-channel-audit']
        }) + '&state=' + pathId;

        new Nightmare({ show: false })
            .cookies.clearAll()
            .useragent('a')
            .goto(url)
            .type('#Email', CREDENTIALS.login.email)
            .click('#next')
            .wait('#Passwd')
            .wait(2000)
            .type('#Passwd', CREDENTIALS.login.password)
            .wait(2000)
            .click('#signIn')
            .wait('#submit_approve_access')
            .wait(2000)
            .click('#submit_approve_access')
            .wait(1000)
            .end()
            .then(function (result) {
                resolve('success');
            })
            .catch(function (error) {
                reject(error);
            });
    });
}

function authorizeWithCode(code) {
    return new Promise(function (resolve, reject) {
        let oauth = Youtube.authenticate({
            type: "oauth"
            , client_id: CREDENTIALS.web.client_id
            , client_secret: CREDENTIALS.web.client_secret
            , redirect_url: CREDENTIALS.web.redirect_uris[0]
        });
        oauth.getToken(code, (err, token) => {
            if (err) {
                console.log('Could not fetch tokens from google : ' + JSON.stringify(err));
                return reject('Could not fetch tokens from google : ' + JSON.stringify(err));
            }
            console.log("Got the tokens.");
            oauth.setCredentials(token);
            persistencache.set('gAuthToken', JSON.stringify(token), (token.expiry_date - 10000));
            resolve('authorized');
        });
    });
}
function authorizeWithToken(token) {
    let oauth = Youtube.authenticate({
        type: "oauth"
        , client_id: CREDENTIALS.web.client_id
        , client_secret: CREDENTIALS.web.client_secret
        , redirect_url: CREDENTIALS.web.redirect_uris[0]
    });
    oauth.setCredentials(token);
}

/**
 * Adds commas to a number
 * @param {number} number
 * @param {string} locale
 * @return {string}
 */
module.exports = {
    authenticate: authenticate,
    authorizeWithCode: authorizeWithCode,
    authorizeWithToken: authorizeWithToken,
};