"use strict";

/**
 * @file AsyncTool test aid for easier debugging
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

const performance_now = require( "performance-now" );
const q = [];

/**
 * Special event scheduler for testing to be installed with installAsyncToolTest()
 * @var AsyncToolTest
 */
exports = module.exports =
{};

/**
 * Adds callback to internal queue
 * @param {Function} func - callback to execute
 * @param {number} [timeout_ms=0] - optional timeout in ms
 * @returns {Object} timer handle
 * @alias AsyncToolTest.callLater
 */
exports.callLater = function( func, timeout_ms ) {
    let t = performance_now() * 1e3;

    if ( timeout_ms ) {
        t += timeout_ms;
    }

    const e = {
        f : func,
        t : t,
    };

    for ( let i = 0; i < q.length; ++i ) {
        if ( q[i].t > t ) {
            q.splice( i, 0, e );
            return;
        }
    }

    q.push( e );
    return e;
};

/**
 * Removed callback from internal queue
 * @param {Object} handle - Handle returned from AsyncToolTest.callLater
 * @alias AsyncToolTest.callLater
 */
exports.cancelCall = function( handle ) {
    const i = q.indexOf( handle );

    if ( i >= 0 ) {
        q.splice( i, 1 );
    }
};

/**
 * Process next even in the internal queue
 * @alias AsyncToolTest.nextEvent
 */
exports.nextEvent = function() {
    const e = q.shift();

    // We do not wait for timeout, there is little practical use for that
    // even in scope of testing. If we come to the point, where we need to sleep
    // then no other event would get earlier under normal conditions.
    e.f();
};

/**
 * Check if there are any events scheduled
 * @returns {boolean} true, if pending events
 * @alias AsyncToolTest.hasEvents
 */
exports.hasEvents = function() {
    return q.length > 0;
};

/**
 * Get internal even queue
 * @returns {array} event queue
 * @alias AsyncToolTest.getEvents
 */
exports.getEvents = function() {
    return q;
};

/**
 * Clear internal event queue
 * @alias AsyncToolTest.resetEvents
 */
exports.resetEvents = function() {
    q.splice( 0, q.length );
};

/**
 * Execute all remaining events in the internal queue
 * @alias AsyncToolTest.run
 */
exports.run = function() {
    while ( this.hasEvents() ) {
        this.nextEvent();
    }
};

// Aliases for immediate
exports.callImmediate = exports.callLater;
exports.cancelImmediate = exports.cancelCall;
