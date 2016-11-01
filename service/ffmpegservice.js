'use strict';
const FfmpegCommand = require('fluent-ffmpeg'),
    Promise = require('bluebird'),
    config = require('config'),
    fs = require('fs'),
    uuid = require('node-uuid');

/**
 * ffmpeg -i abc.mp4.mpg -i abc2.mp4.mpg \
 * -filter_complex '[0:0] [0:1] [1:0] [1:1] concat=n=2:v=1:a=1 [v] [a]' \
 * -map '[v]' -map '[a]' output.mp4
 */
function joinFiles(inputArr, outPath) {
    return new Promise(function (resolve, reject) {
        let tempPath = config.get('tempVideoPath');
        let mpgPromises = inputArr.map(function (inPath) {
            let pathSplit = inPath.split('/');
            var resultingOutPath = tempPath + '/' + pathSplit[pathSplit.length - 1];
            console.log('tmp path : ', resultingOutPath);
            return convertToMpg(inPath, resultingOutPath);
        });
        Promise.all(mpgPromises).then(function (tmpOutPaths) {
            console.log('paths', tmpOutPaths);
            let inputFileText = '';
            tmpOutPaths.forEach(function (tmpOutPath, i) {
                console.log('path', tmpOutPath);
                inputFileText += 'file \'' + tmpOutPath + '\'';
                if(i !== tmpOutPaths.length-1) {
                    inputFileText += '\n';
                } 
            });
            let tmpInputPath = tempPath + '/' + uuid.v4() + '.txt';
            let concatCommand = new FfmpegCommand();
            fs.writeFileSync(tmpInputPath, inputFileText);
            concatCommand.input(tmpInputPath)
                .inputOptions(['-f', 'concat', '-safe 0'])
                .outputOptions(['-codec copy'])
                .on('start', function (commandLine) {
                    console.log(commandLine);
                })
                .on('end', function () {
                    console.log('Finished processing');
                    fs.unlinkSync(tmpInputPath);
                    tmpOutPaths.forEach(function (tmpOutPath) {
                        fs.unlinkSync(tmpOutPath);
                    });
                    resolve(outPath);
                })
                .on('error', function (err, stdout, stderr) {
                    console.log('Cannot process video: ' + err.message);
                    reject(err);
                })
                .output(outPath)
                .run()
        }).catch(function (err) {
            reject(err)
        })
    });
}

/**
 * Converts video to same format
 * ffmpeg -i abc.mp4.mpg -filter_complex "scale=1280:720, setdar=16:9, fps=30" -preset ultrafast -y processed0.mp4
 */
function convertToMpg(filePath, outPath) {
    return new Promise(function (resolve, reject) {
        new FfmpegCommand(filePath)
            .outputOptions(['-preset ultrafast'])
            .complexFilter(['scale=1280:720, setdar=16:9, fps=30'])
            .output(outPath)
            .on('start', function (commandLine) {
                console.log(commandLine);
            })
            .on('end', function () {
                console.log('Finished processing');
                resolve(outPath);
            })
            .on('error', function (err, stdout, stderr) {
                console.log('Cannot process video: ' + err.message);
                reject(err);
            })
            .run();
    });

}
module.exports = {
    joinFiles: joinFiles
}