'use strict';
const videodbservice = require('./service/videodbservice'),
	downloader = require('./service/downloader'),
	ffmpegservice = require('./service/ffmpegservice'),
	Promise = require('bluebird'),
	uuid = require('node-uuid'),
	uploader = require('./service/uploader'),
	config = require('config');
setTimeout(function () {
	videodbservice.isAnyVideoInProgress().then(function (inProgressVideo) {
		if (inProgressVideo) {
			console.log('In progress : ', inProgressVideo);
			return console.log('will start in next hour');
		}
		videodbservice.findOldestInitialized().then(function (oldestInitialized) {
			
			videodbservice.updateStatus(oldestInitialized._id, 'IN_PROGRESS').then(function (newDoc) {
				console.log('Validating urls', oldestInitialized);
				var err = getErrors(oldestInitialized.videos);
				if (err != null) {
					console.log('Video urls validation failed');
					return videodbservice.updateStatusWithError(oldestInitialized._id, 'FAILED', err)
						.then(function (newDoc) {
							console.log('Job failed with errors : ', err);
							return console.log('will start in next hour');
						}).catch(function (err) {
							console.log('updateStatusWithError: error occurred while accessing data base for job : ', err);
							return console.log('will start in next hour');
						});
				}
				console.log('Starting download of urls');
				let downloadPromises = oldestInitialized.videos.map(function (videoUrl, index) {
					return downloader.downloadVideo(videoUrl);
				});
				Promise.all(downloadPromises).then(function (downloadPaths) {
					console.log('Download of videos completed');
					return videodbservice.updateStatus(oldestInitialized._id, 'IN_PROGRESS_DOWNLOADED', err)
						.then(function (newDoc) {
							console.log('Starting conversion of downloaded urls');
							let convertedVideoPath = config.get('convertedVideoPath');
							convertedVideoPath += '/' + uuid.v4() + '.mp4';
							return ffmpegservice.joinFiles(downloadPaths, convertedVideoPath)
								.then(function (convertedVideoPath) {
									console.log('Video joined and converted : ', convertedVideoPath);
									return videodbservice.updateStatus(oldestInitialized._id, 'IN_PROGRESS_CONVERTED', err)
										.then(function (newDoc) {
											uploader.uploadVideo({
												relativePath: convertedVideoPath,
												tags: oldestInitialized.tags,
												title: oldestInitialized.title,
												description: oldestInitialized.description,
												privacyStatus: 'private',
												notifySubscribers: false
											}).then(function (msg) {
												return videodbservice.updateStatus(oldestInitialized._id, 'COMPLETED', err)
													.then(function (newDoc) {
														console.log('Done... Good job.');
														return console.log('will start in next hour');
													}).catch(function (err) {
														console.log('updateStatus: error occurred while accessing data base for job : ', err);
														return console.log('will start in next hour');
													})
											}).catch(function (err) {
												console.log('Error uploading video. ', err);
												return console.log('will start in next hour');
											});
										}).catch(function (err) {
											console.log('updateStatus: error occurred while accessing data base for job : ', err);
											return console.log('will start in next hour');
										});

								}).catch(function (err) {
									console.log('Error converting and joining videos. ', err);
									return console.log('will start in next hour');
								});
						}).catch(function (err) {
							console.log('updateStatus: error occurred while accessing data base for job : ', err);
							return console.log('will start in next hour');
						});
				}).catch(function (err) {
					// return console.log('Error downloading some of the videos : ', err);
					// return console.log('will start in next hour');
					return videodbservice.updateStatusWithError(oldestInitialized._id, 'FAILED', err)
						.then(function (newDoc) {
							console.log('Job failed with errors : ', err);
							return console.log('will start in next hour');
						}).catch(function (err) {
							console.log('updateStatusWithError: error occurred while accessing data base for job : ', err);
							return console.log('will start in next hour');
						});
				});

			}).catch(function (err) {
				console.log('updateStatus: error occurred while accessing data base for job : ', err);
				return console.log('will start in next hour');
			});
		}).catch(function (err) {
			console.log('findOldestInitialized: error occurred while accessing data base for job : ', err);
			return console.log('will start in next hour');
		});
	}).catch(function (err) {
		console.log('isAnyVideoInProgress: error occurred while accessing data base for job : ', err);
		return console.log('will start in next hour');
	});
}, 3600);

function getErrors(videoUrls) {
	let err = null;
	if (typeof videoUrls === 'undefined' || videoUrls === null || videoUrls.length === 0) {
		return 'No video urls found';
	}
	videoUrls.forEach(function (videoUrl, index) {
		if (downloader.getVideoId(videoUrl) === null) {
			err += 'Video id not present for videoUrl : ' + videoUrl + ', \n';
		}
	});
	return err;
}