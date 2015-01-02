"use strict";

/**
 * @file AsyncTool test aid for easier debugging
 * @author Andrey Galkin <andrey@futoin.eu>
 */

var performance_now = require( "performance-now" );
var q = [];

/**
 * Special event scheduler for testing to be installed with installAsyncToolTest()
 * @class
 * @alias AsyncToolTest
 */
exports = module.exports =
{};

/**
 * Adds callback to internal queue
 * @param {Function} func - callback to execute
 * @param {number} [timeout_ms=0] - optional timeout in ms
 * @returns {Object} - timer handle
 * @alias AsyncToolTest.callLater
 */
exports.callLater = function( func, timeout_ms )
{
    var t = performance_now() * 1e3;

    if ( timeout_ms )
    {
        t += timeout_ms;
    }

    var e = {
        f : func,
        t : t
    };

    for ( var i = 0; i < q.length; ++i )
    {
        if ( q[i].t > t )
        {
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
exports.cancelCall = function( handle )
{
    var i = q.indexOf( handle );

    if ( i >= 0 )
    {
        q.splice( i, 1 );
    }
};

/**
 * Process next even in the internal queue
 * @alias AsyncToolTest.nextEvent
 */
exports.nextEvent = function()
{
    var e = q.shift();
    // We do not wait for timeout, there is little practical use for that
    // even in scope of testing. If we come to the point, where we need to sleep
    // then no other event would get earlier under normal conditions.
    e.f();
};

/**
 * Check if there are any events scheduled
 * @alias AsyncToolTest.hasEvents
 */
exports.hasEvents = function()
{
    return q.length > 0;
};

/**
 * Get internal even queue
 * @alias AsyncToolTest.getEvents
 */
exports.getEvents = function()
{
    return q;
};

/**
 * Clear internal event queue
 * @alias AsyncToolTest.resetEvents
 */
exports.resetEvents = function()
{
    q.splice( 0, q.length );
};

/**
 * Execute all remaining events in the internal queue
 * @alias AsyncToolTest.run
 */
exports.run = function()
{
    while ( this.hasEvents() )
    {
        this.nextEvent();
    }
};
