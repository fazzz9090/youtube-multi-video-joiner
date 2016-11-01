"use strict";
const Youtube = require("youtube-api"),
    persistencache = require('./service/persistencache'),
    express = require('express'),
    server = express(),
    path = require('path'),
    authenticator = require('./service/authenticator'),
    videodbservice = require('./service/videodbservice'),
    uploader = require('./service/uploader'),
    bodyParser = require('body-parser');

server.set('views', path.join(__dirname, './views'));
server.set('view engine', 'ejs');
server.use(express.static(path.join(__dirname, './public'), {}));
server.use(bodyParser.json());       // to support JSON-encoded bodies
server.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));
server.listen(5000, function () {
    console.log('Listening on port 5000!');
});

server.get('/videos', (req, res) => {
    videodbservice.getVideos().then(function (result) {
        return res.json(result);
    }, function (err) {
        return res.status(400).json(err);
    });
});
server.post('/videos', (req, res) => {
    console.log('/videos called', req.body);
    let video = JSON.parse(JSON.stringify(req.body));
    var now = new Date().getTime();
    video.status = 'INITIALIZED';
    video.dateCreated = now;
    video.lastModified = now;
    videodbservice.saveVideo(video).then(function (result) {
        return res.json(result);
    }, function (err) {
        return res.status(400).json(err);
    });
});
server.get('/search', (req, res) => {
    Youtube.search.list({
        q: req.query.q || '',
        part: 'snippet',
        order: req.query.order || 'relevance',
        maxResults: 50,
        key: 'AIzaSyCVaOk5N-XYqA16IzbxfdjGYrT3hWgD5b0'
    }, function (err, searchResponse) {
        if (err) {
            return res.status(400).json(err);
        }
        res.json(searchResponse.items);
    });
});

server.get("/oauth2callback", (req, res) => {
    let pathId = req.query.state;
    console.log("oauth2callback api hit: " + pathId);
    if (typeof pathId === 'undefined' || pathId === null || pathId === 'nope') {
        console.log('just authenticating');
        return authenticator.authorizeWithCode(req.query.code).then(function (response) {
            res.end("Auth done.");
        }, function (err) {
            return res.status(400).end(JSON.stringify(err));
        });
    }
    persistencache.get(pathId).then(function(uploadObject) {
        if (typeof uploadObject === 'undefined') {
            console.log("File to upload not found.");
            res.end("File to upload not found.");
            return;
        }
        persistencache.remove(pathId).then(function(){}, function(){});
        uploadObject = JSON.parse(uploadObject);
        console.log("Video found in cache: " + pathId + ":" + JSON.stringify(uploadObject));
        authenticator.authorizeWithCode(req.query.code).then(function (response) {
            res.end("The video is being uploaded. Check out the logs in the terminal.");
            uploader.plainUploadVideo(uploadObject);
        }, function (err) {
            return res.status(400).end(JSON.stringify(err));
        });
    }, function(err) {
            console.log("File to upload not found.", err);
            res.end("File to upload not found.");
    });
});

server.get('/', (req, res) => {
    res.render('index');
});