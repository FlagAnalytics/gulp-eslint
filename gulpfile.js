'use strict';

const {src, task} = require('gulp');
const eslint = require('.');

task('default', () => {
	return src(['**/*.js', '!node_modules/**', '!test/fixtures/**'])
		.pipe(eslint({fix: true}))
		.pipe(eslint.format())
		.pipe(eslint.failAfterError());
});
