/* global describe, it, beforeEach */
'use strict';

import File from 'vinyl'
import path from 'path'
import should from 'should'
import eslint from '..'
import 'mocha'

describe('gulp-eslint failOnError', () =>  {
	it('should fail a file immediately if an error is found', done =>  {
		const lintStream = eslint({useEslintrc: false, rules: {'no-undef': 2}})

		function endWithoutError() {
			done(new Error('An error was not thrown before ending'));
		}

		lintStream.pipe(eslint.failOnError())
			.on('error', function(err)  {
				this.removeListener('finish', endWithoutError)
				should.exists(err)
				err.message.should.equal('\'x\' is not defined.')
				err.fileName.should.equal(path.resolve('test/fixtures/invalid.js'))
				err.plugin.should.equal('gulp-eslint')
				done()
			})
			.on('finish', endWithoutError)

		lintStream.write(new File({
			path: 'test/fixtures/invalid.js',
			contents: Buffer.from('x = 1;')
		}))

		lintStream.end();
	})

	it('should pass a file if only warnings are found', done =>  {

		const lintStream = eslint({useEslintrc: false, rules: {'no-undef': 1, 'strict': 0}})

		lintStream.pipe(eslint.failOnError())
			.on('error', done)
			.on('finish', done)

		lintStream.end(new File({
			path: 'test/fixtures/invalid.js',
			contents: Buffer.from('x = 0;')
		}))
	})

	it('should handle ESLint reports without messages', done =>  {

		const file = new File({
			path: 'test/fixtures/invalid.js',
			contents: Buffer.from('#invalid!syntax}')
		});
		file.eslint = {};

		eslint.failOnError()
			.on('error', (err) =>  {
				this.removeListener('finish', done);
				done(err);
			})
			.on('finish', done)
			.end(file);
	});

});

describe('gulp-eslint failAfterError', () =>  {

	it('should fail when the file stream ends if an error is found', done =>  {
		const lintStream = eslint({useEslintrc: false, rules: {'no-undef': 2}});

		function endWithoutError() {
			done(new Error('An error was not thrown before ending'));
		}

		lintStream.pipe(eslint.failAfterError())
			.on('error', function(err)  {
				this.removeListener('finish', endWithoutError);
				should.exists(err);
				err.message.should.equal('Failed with 1 error');
				err.name.should.equal('ESLintError');
				err.plugin.should.equal('gulp-eslint');
				done();
			})
			.on('finish', endWithoutError);

		lintStream.end(new File({
			path: 'test/fixtures/invalid.js',
			contents: Buffer.from('x = 1;')
		}));
	});

	it('should fail when the file stream ends if multiple errors are found', done =>  {
		const lintStream = eslint({useEslintrc: false, rules: {'no-undef': 2}});

		lintStream.pipe(eslint.failAfterError().on('error', (err) =>  {
			should.exists(err);
			err.message.should.equal('Failed with 2 errors');
			err.name.should.equal('ESLintError');
			err.plugin.should.equal('gulp-eslint');
			done();
		}));

		lintStream.end(new File({
			path: 'test/fixtures/invalid.js',
			contents: Buffer.from('x = 1; a = false;')
		}));
	});

	it('should pass when the file stream ends if only warnings are found', done =>  {
		const lintStream = eslint({useEslintrc: false, rules: {'no-undef': 1, strict: 0}});

		lintStream.pipe(eslint.failAfterError())
			.on('error', done)
			.on('finish', done);

		lintStream.end(new File({
			path: 'test/fixtures/invalid.js',
			contents: Buffer.from('x = 0;')
		}));
	});

	it('should handle ESLint reports without messages', done =>  {
		const file = new File({
			path: 'test/fixtures/invalid.js',
			contents: Buffer.from('#invalid!syntax}')
		});
		file.eslint = {};

		eslint.failAfterError()
			.on('error', done)
			.on('finish', done)
			.end(file);
	});

});

describe('gulp-eslint failOnWarning', () =>  {
	it('should fail a file immediately if an error is found', done =>  {
		const lintStream = eslint({useEslintrc: false, rules: {'no-undef': 2}});

		function endWithoutError() {
			done(new Error('A warning was not thrown before ending'));
		}

		lintStream.pipe(eslint.failOnWarning())
			.on('error', function(err)  {
				this.removeListener('finish', endWithoutError);
				should.exists(err);
				err.message.should.equal('\'x\' is not defined.');
				err.fileName.should.equal(path.resolve('test/fixtures/invalid.js'));
				err.plugin.should.equal('gulp-eslint');
				done();
			})
			.on('finish', endWithoutError);

		lintStream.write(new File({
			path: 'test/fixtures/invalid.js',
			contents: Buffer.from('x = 1;')
		}));

		lintStream.end();
	});

	it('should fail a file immediately if a warning is found', done =>  {
		const lintStream = eslint({useEslintrc: false, rules: {'no-undef': 1}});

		function endWithoutWarning() {
			done(new Error('A warning was not thrown before ending'));
		}

		lintStream.pipe(eslint.failOnWarning())
			.on('error', function(err)  {
				this.removeListener('finish', endWithoutWarning);
				should.exists(err);
				err.message.should.equal('\'x\' is not defined.');
				err.fileName.should.equal(path.resolve('test/fixtures/invalid.js'));
				err.plugin.should.equal('gulp-eslint');
				done();
			})
			.on('finish', endWithoutWarning);

		lintStream.write(new File({
			path: 'test/fixtures/invalid.js',
			contents: Buffer.from('x = 1;')
		}));

		lintStream.end();
	});

	it('should handle ESLint reports without messages', done =>  {

		const file = new File({
			path: 'test/fixtures/invalid.js',
			contents: Buffer.from('#invalid!syntax}')
		});
		file.eslint = {};

		eslint.failOnWarning()
			.on('error', (err) =>  {
				this.removeListener('finish', done);
				done(err);
			})
			.on('finish', done)
			.end(file);
	});

});

describe('gulp-eslint failAfterWarning', () =>  {
	// FIXME: I am here

	it('should fail when the file stream ends if a warning is found', done =>  {
		const lintStream = eslint({useEslintrc: false, rules: {'no-undef': 1}});

		function endWithoutWarning() {
			done(new Error('An warning was not thrown before ending'));
		}

		lintStream.pipe(eslint.failAfterWarning())
			.on('error', function(err)  {
				this.removeListener('finish', endWithoutWarning);
				should.exists(err);
				err.message.should.equal('Failed with 1 warning');
				err.name.should.equal('ESLintWarning');
				err.plugin.should.equal('gulp-eslint');
				done();
			})
			.on('finish', endWithoutWarning);

		lintStream.end(new File({
			path: 'test/fixtures/invalid.js',
			contents: Buffer.from('x = 1;')
		}));
	});

	it('should fail when the file stream ends if multiple warnings are found', done =>  {
		const lintStream = eslint({useEslintrc: false, rules: {'no-undef': 1}});

		lintStream.pipe(eslint.failAfterWarning().on('error', (err) =>  {
			should.exists(err);
			err.message.should.equal('Failed with 2 warnings');
			err.name.should.equal('ESLintWarning');
			err.plugin.should.equal('gulp-eslint');
			done();
		}));

		lintStream.end(new File({
			path: 'test/fixtures/invalid.js',
			contents: Buffer.from('x = 1; a = false;')
		}));
	});

	it('should fail when the file stream ends if an error is found', done =>  {
		const lintStream = eslint({useEslintrc: false, rules: {'no-undef': 2}});

		function endWithoutError() {
			done(new Error('An error was not thrown before ending'));
		}

		lintStream.pipe(eslint.failAfterWarning())
			.on('error', function(err)  {
				this.removeListener('finish', endWithoutError);
				should.exists(err);
				err.message.should.equal('Failed with 1 warning');
				err.name.should.equal('ESLintWarning');
				err.plugin.should.equal('gulp-eslint');
				done();
			})
			.on('finish', endWithoutError);

		lintStream.end(new File({
			path: 'test/fixtures/invalid.js',
			contents: Buffer.from('x = 1;')
		}));
	});

	it('should fail when the file stream ends if multiple errors are found', done =>  {
		const lintStream = eslint({useEslintrc: false, rules: {'no-undef': 2}});

		lintStream.pipe(eslint.failAfterWarning().on('error', (err) =>  {
			should.exists(err);
			err.message.should.equal('Failed with 2 warnings');
			err.name.should.equal('ESLintWarning');
			err.plugin.should.equal('gulp-eslint');
			done();
		}));

		lintStream.end(new File({
			path: 'test/fixtures/invalid.js',
			contents: Buffer.from('x = 1; a = false;')
		}));
	});

	it('should handle ESLint reports without messages', done =>  {
		const file = new File({
			path: 'test/fixtures/invalid.js',
			contents: Buffer.from('#invalid!syntax}')
		});
		file.eslint = {};

		eslint.failAfterWarning()
			.on('error', done)
			.on('finish', done)
			.end(file);
	});

});
