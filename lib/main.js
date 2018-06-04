"use strict";

/**
 * @file Module's entry point and AsyncSteps class itself
 * @author Andrey Galkin <andrey@futoin.org>
 *
 *
 * Copyright 2014-2017 FutoIn Project (https://futoin.org)
 * Copyright 2014-2017 Andrey Galkin <andrey@futoin.org>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @module futoin-asyncsteps
 */

const AsyncTool = require( './AsyncTool' );
const AsyncToolTest = require( './AsyncToolTest' );
const Errors = require( '../Errors' );
const AsyncSteps = require( '../AsyncSteps' );

/**
 * @private
 * @returns {AsyncSteps} new instance
 */
exports = module.exports = function( ) {
    return new AsyncSteps();
};

exports.AsyncTool = AsyncTool;
exports.FutoInError = Errors;
exports.Errors = Errors;
exports.AsyncSteps = AsyncSteps;

/**
 * Use for unit testing to fine control step execution.
 * It installs AsyncToolTest in place of AsyncTool
 * @alias installAsyncToolTest
 * @param {boolean} [install=true] - true - install AsyncToolTest, false - AsyncTool as scheduler
 */
exports.installAsyncToolTest = function( install ) {
    if ( install === false ) {
        exports.AsyncTool = AsyncTool;
    } else {
        exports.AsyncTool = AsyncToolTest;
    }

    AsyncSteps.prototype._async_tool = exports.AsyncTool;
};

/**
 * Ensure parameter is instance of AsyncSteps interfaces
 * @param {any} as - paramter to check
 * @alias assertAS
 */
exports.assertAS = function( as ) {
    try {
        if ( as.isAsyncSteps() ) {
            return;
        }
    } catch ( _ ) {
        // pass
    }

    throw new Error( `Not an instance of AsyncSteps: ${as}` );
};
