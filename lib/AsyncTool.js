"use strict";

/**
 * @file
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
 * Neutral interface to event scheduler
 * @var AsyncTool
 */
exports = module.exports = {};

/* istanbul ignore if */
if ( typeof setImmediate === 'undefined' ) {
    // Note: requires to avoid security warnings
    const callLater = exports.callLater = function( func, timeout_ms ) {
        return setTimeout( func, timeout_ms );
    };

    const cancelCall = exports.cancelCall = function( func ) {
        return clearTimeout( func );
    };

    exports.callImmediate = ( func ) => {
        return callLater( func, 0 );
    };
    exports.cancelImmediate = cancelCall;
} else {
    /**
     * Wrapper for setTimeout()
     * @param {Function} func - callback to execute
     * @param {number} [timeout_ms=0] - optional timeout in ms
     * @returns {Object} - timer handle
     * @alias AsyncTool.callLater
     */
    exports.callLater = ( func, timeout_ms ) => setTimeout( func, timeout_ms );

    /**
     * Wrapper for clearTimeout()/clearImmediate()
     * @param {Object} handle - Handle returned from AsyncTool.callLater
     * @alias AsyncTool.cancelCall
     */
    exports.cancelCall = ( handle ) => {
        clearTimeout( handle );
    };

    /**
     * Wrapper for setImmediate()
     * @param {Function} func - callback to execute
     * @returns {Object} - timer handle
     * @alias AsyncTool.callImmediate
     */
    exports.callImmediate = ( func ) => setImmediate( func );

    /**
     * Wrapper for clearImmediate()
     * @param {Object} handle - Handle returned from AsyncTool.callImmediate
     * @alias AsyncTool.cancelImmediate
     */
    exports.cancelImmediate = ( handle ) => {
        clearImmediate( handle );
    };
}
