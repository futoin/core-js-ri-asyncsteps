"use strict";

/* istanbul ignore if */

if ( typeof setImmediate === 'undefined' )
{
    exports.callLater = setTimeout;
    exports.cancelCall = clearTimeout;
}
else
{
    /**
     * Neutral interface to event scheduler
     * @class
     * @alias module:futoin-asyncsteps.AsyncTool
     */

    /**
     * Wrapper for setTimeout()/setImmediate()
     * @param {Function} func - callback to execute
     * @param {number} [timeout_ms=0] - optional timeout in ms
     * @returns {Object} - timer handle
     * @alias module:futoin-asyncsteps.AsyncTool.callLater
     */
    exports.callLater = function( func, timeout_ms )
    {
        if ( timeout_ms )
        {
            return setTimeout( func, timeout_ms );
        }

        return setImmediate( func );
    };

    /**
     * Wrapper for clearTimeout()/clearImmediate()
     * @param {Object} handle - Handle returned from module:futoin-asyncsteps.AsyncTool.callLater
     * @alias module:futoin-asyncsteps.AsyncTool.callLater
     */
    exports.cancelCall = function( handle )
    {
        // WARNING: A dirty hack, which may break at some time
        if ( typeof handle._onImmediate !== 'undefined' )
        {
            clearImmediate( handle );
        }
        else
        {
            clearTimeout( handle );
        }
    };
}
