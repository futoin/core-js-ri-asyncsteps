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

const AsyncTool = require( './asynctool' );
const AsyncToolTest = require( './asynctool_test' );
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
 * Get AsyncSteps state object.
 *
 * *Note: There is a JS-specific improvement: as.state === as.state()*
 *
 * The are the following pre-defined state variables:
 *
 * * **error_info** - error description, if provided to *as.error()*
 * * **last_exception** - the last exception caught
 * * **async_stack** - array of references to executed step handlers in current stack
 * @returns {object}
 * @alias AsyncSteps#state
 */

exports.AsyncSteps = AsyncSteps;
