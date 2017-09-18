/**
 * @file Browser-specific entry point
 * @author Andrey Galkin <andrey@futoin.org>
 */

( function( window ) {
    'use strict';

    var futoin = window.FutoIn || {};

    if ( typeof futoin.AsyncSteps === 'undefined' )
    {
        var $as = require( './asyncsteps.js' );

        /**
         * **window.$as** - browser-only reference to futoin-asyncsteps module
         * @global
         * @name window.$as
         */
        window.$as = $as;

        /**
         * **window.FutoIn.$as** - browser-only reference to futoin-asyncsteps module
         * @global
         * @name window.FutoIn.$as
         */
        futoin.$as = $as;

        /**
         * **window.FutoInError** - browser-only reference to futoin-asyncsteps.FutoInError
         * @global
         * @name window.FutoInError
         */
        window.FutoInError = $as.FutoInError;

        /**
         * **window.futoin.AsyncSteps** - browser-only reference to futoin-asyncsteps.AsyncSteps
         * @global
         * @name window.futoin.AsyncSteps
         */
        futoin.AsyncSteps = $as.AsyncSteps;
        window.FutoIn = futoin;

        if ( typeof module !== 'undefined' )
        {
            module.exports = $as;
        }
    } else if ( typeof module !== 'undefined' ) {
        module.exports = futoin.$as;
    }
} )( window );
