'use strict';
import PluginError = require("../node_modules/plugin-error");
import { CLIEngine } from 'eslint';

import {
    createIgnoreResult,
    filterResult,
    firstResultMessage,
    handleCallback,
    isErrorMessage,
    isWarningMessage,
    migrateOptions,
    resolveFormatter,
    resolveWritable,
    transform,
    tryResultAction,
    writeResults
} from './util';
import { relative } from 'path';

/**
 * Append ESLint result to each file
 *
 * @param {(Object|String)} [options] - Configure rules, env, global, and other options for running ESLint
 * @returns {stream} gulp file stream
 */
function gulpEslint(options:typeof $TSFixMe): typeof $TSFixMe {
    options = migrateOptions(options) || {};
    const linter = new CLIEngine(options);

    return transform((file: typeof $TSFixMe, enc: typeof $TSFixMe, cb: typeof $TSFixMe) => {
        const filePath = relative(file.cwd, file.path);
        if (file.isNull()) {
            cb(null, file);
            return;
        }
        if (file.isStream()) {
            cb(new PluginError('gulp-eslint', 'gulp-eslint doesn\'t support vinyl files with Stream contents.'));
            return;
        }
        if (linter.isPathIgnored(filePath)) {
            // Note:
            // Vinyl files can have an independently defined cwd, but ESLint works relative to `process.cwd()`.
            // (https://github.com/gulpjs/gulp/blob/master/docs/recipes/specifying-a-cwd.md)
            // Also, ESLint doesn't adjust file paths relative to an ancestory .eslintignore path.
            // E.g., If ../.eslintignore has "foo/*.js", ESLint will ignore ./foo/*.js, instead of ../foo/*.js.
            // Eslint rolls this into `CLIEngine.executeOnText`. So, gulp-eslint must account for this limitation.
            if (linter.isPathIgnored(filePath) && options.warnFileIgnored) {
                // Warn that gulp.src is needlessly reading files that ESLint ignores
                file.eslint = createIgnoreResult(file);
            }
            cb(null, file);
            return;
        }
        let result;
        try {
            result = linter.executeOnText(file.contents.toString(), file.path).results[0];
        }
        catch (e) {
            cb(new PluginError('gulp-eslint', e));
            return;
        }
        // Note: Fixes are applied as part of "executeOnText".
        // Any applied fix messages have been removed from the result.
        if (options.quiet) {
            // ignore warnings
            file.eslint = filterResult(result, options.quiet);
        }
        else {
            file.eslint = result;
        }
        // Update the fixed output; otherwise, fixable messages are simply ignored.
        if (file.eslint.hasOwnProperty('output')) {
            file.contents = Buffer.from(file.eslint.output);
            file.eslint.fixed = true;
        }
        cb(null, file);
    });
}

/**
 * Handle each ESLint result as it passes through the stream.
 *
 * @param {Function} action - A function to handle each ESLint result
 * @returns {stream} gulp file stream
 */
gulpEslint.result = (action: Function): typeof $TSFixMe => {
    if (typeof action !== 'function') {
        throw new Error('Expected callable argument');
    }
    return transform((file: typeof $TSFixMe, enc: typeof $TSFixMe, done: typeof $TSFixMe) => {
        if (file.eslint) {
            tryResultAction(action, file.eslint, handleCallback(done, file));
        }
        else {
            done(null, file);
        }
    });
};

/**
 * Handle all ESLint results at the end of the stream.
 *
 * @param {Function} action - A function to handle all ESLint results
 * @returns {stream} gulp file stream
 */
gulpEslint.results = (action: Function): typeof $TSFixMe => {
    if (typeof action !== 'function') {
        throw new Error('Expected callable argument');
    }
    const results: typeof $TSFixMe = [];
    (results as any).errorCount = 0;
    (results as any).warningCount = 0;
    return transform((file: typeof $TSFixMe, enc: typeof $TSFixMe, done: typeof $TSFixMe) => {
        if (file.eslint) {
            results.push(file.eslint);
            (results as any).errorCount += file.eslint.errorCount;
            (results as any).warningCount += file.eslint.warningCount;
        }
        done(null, file);
    }, (done: typeof $TSFixMe) => {
        tryResultAction(action, results, handleCallback(done));
    });
};

/**
 * Fail when an ESLint error is found in ESLint results.
 *
 * @returns {stream} gulp file stream
 */
gulpEslint.failOnError = (): typeof $TSFixMe => {
    return gulpEslint.result((result: typeof $TSFixMe) => {
        const error = firstResultMessage(result, isErrorMessage);
        if (!error) {
            return;
        }
        throw new PluginError('gulp-eslint', {
            name: 'ESLintError',
            fileName: result.filePath,
            message: error.message,
            lineNumber: error.line
        });
    });
};

/**
 * Fail when the stream ends if any ESLint error(s) occurred
 *
 * @returns {stream} gulp file stream
 */
gulpEslint.failAfterError = (): typeof $TSFixMe => {
    return gulpEslint.results((results: typeof $TSFixMe) => {
        const count = results.errorCount;
        if (!count) {
            return;
        }
        throw new PluginError('gulp-eslint', {
            name: 'ESLintError',
            message: 'Failed with ' + count + (count === 1 ? ' error' : ' errors')
        });
    });
};

/**
 * Fail when an ESLint warning is found in ESLint results.
 *
 * @returns {stream} gulp file stream
 */
gulpEslint.failOnWarning = (): typeof $TSFixMe => {
    return gulpEslint.result((result: typeof $TSFixMe) => {
        const warning = firstResultMessage(result, isWarningMessage);
        if (!warning) {
            return;
        }
        throw new PluginError('gulp-eslint', {
            name: 'ESLintWarning',
            fileName: result.filePath,
            message: warning.message,
            lineNumber: warning.line
        });
    });
};

/**
 * Fail when the stream ends if any ESLint warning(s) occurred
 *
 * @returns {stream} gulp file stream
 */
gulpEslint.failAfterWarning = (): typeof $TSFixMe => {
    return gulpEslint.results((results: typeof $TSFixMe) => {
        const count = results.warningCount + results.errorCount;
        if (!count) {
            return;
        }
        throw new PluginError('gulp-eslint', {
            name: 'ESLintWarning',
            message: 'Failed with ' + count + (count === 1 ? ' warning' : ' warnings')
        });
    });
};

/**
 * Format the results of each file individually.
 *
 * @param {(String|Function)} [formatter=stylish] - The name or function for a ESLint result formatter
 * @param {(Function|Stream)} [writable=fancy-log] - A funtion or stream to write the formatted ESLint results.
 * @returns {stream} gulp file stream
 */
gulpEslint.formatEach = (formatter: String | Function, writable: Function | String): typeof $TSFixMe => {
    formatter = resolveFormatter(formatter);
    writable = resolveWritable(writable);
    return gulpEslint.result((result: typeof $TSFixMe) => writeResults([result], formatter, writable));
};

/**
 * Wait until all files have been linted and format all results at once.
 *
 * @param {(String|Function)} [formatter=stylish] - The name or function for a ESLint result formatter
 * @param {(Function|stream)} [writable=fancy-log] - A funtion or stream to write the formatted ESLint results.
 * @returns {stream} gulp file stream
 */
gulpEslint.format = (formatter: String | Function, writable: Function | typeof $TSFixMe): typeof $TSFixMe => {
    formatter = resolveFormatter(formatter);
    writable = resolveWritable(writable);
    return gulpEslint.results((results: typeof $TSFixMe) => {
        // Only format results if files has been lint'd
        if (results.length) {
            writeResults(results, formatter, writable);
        }
    });
};
module.exports = gulpEslint;
