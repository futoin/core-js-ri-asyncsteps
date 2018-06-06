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
    // Wrapper for simple setTimeout
    // ---
    exports.callLater = function( func, timeout_ms ) {
        return setTimeout( func, timeout_ms );
    };

    exports.cancelCall = function( func ) {
        return clearTimeout( func );
    };

    // Workaround for security-delayed setTimeout
    // ---
    const BURST_MAX = 10000;
    const TIME_LIMIT = 100;
    const queue = [];
    // eslint-disable-next-line no-undef
    const performance = window.performance;
    let process_handle = null;

    const process_queue = () => {
        process_handle = null;

        const end_time = performance.now() + TIME_LIMIT;

        for ( let i = BURST_MAX;
            ( i > 0 ) && queue.length; --i ) {
            const r = queue.shift();

            try {
                r();
            } catch ( e ) {
                process_handle = setTimeout( process_queue, 0 );
                throw e;
            }

            if ( performance.now() >= end_time ) {
                break;
            }
        }

        if ( queue.length ) {
            process_handle = setTimeout( process_queue, 0 );
        }
    };

    exports.callImmediate = ( func ) => {
        const handle = () => func(); // same func can be added multiple times
        queue.push( handle );

        if ( !process_handle ) {
            process_handle = setTimeout( process_queue, 0 );
        }

        return handle;
    };
    exports.cancelImmediate = ( handle ) => {
        const i = queue.indexOf( handle );

        if ( i >= 0 ) {
            queue.splice( i, 1 );
        }
    };
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
