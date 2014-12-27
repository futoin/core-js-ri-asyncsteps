
(function( window ){
    'use strict';

    var futoin = window.FutoIn || {};

    if ( typeof futoin.AsyncSteps === 'undefined' )
    {
        var $as = require( './asyncsteps.js' );

        /**
         * Browser-only reference to futoin-asyncsteps module
         * @global
         * @name window.$as
         */
        window.$as = $as;

        /**
         * Browser-only reference to futoin-asyncsteps module
         * @global
         * @name window.FutoIn.$as
         */
        futoin.$as = $as;
        
        /**
         * Browser-only reference to futoin-asyncsteps.FutoInError
         * @global
         * @name window.FutoInError
         */
        window.FutoInError = $as.FutoInError;

        /**
         * Browser-only reference to futoin-asyncsteps.AsyncSteps
         * @global
         * @name window.AsyncSteps
         */
        futoin.AsyncSteps = $as.AsyncSteps;
        window.FutoIn = futoin;
        
        if ( module )
        {
            module.exports = $as;
        }
    }
})( window ); // jshint ignore:line
