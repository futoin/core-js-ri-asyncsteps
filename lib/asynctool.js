"use strict";

/* istanbul ignore if */

if ( typeof setImmediate === 'undefined' )
{
    exports.callLater = setTimeout;
    exports.cancelCall = clearTimeout;
}
else
{
    exports.callLater = function( func, timeout_ms )
    {
        if ( timeout_ms )
        {
            return setTimeout( func, timeout_ms );
        }

        return setImmediate( func );
    };

    exports.cancelCall = function( handler )
    {
        if ( typeof handler._onImmediate !== 'undefined' )
        {
            clearImmediate( handler );
        }
        else
        {
            clearTimeout( handler );
        }
    };
}
