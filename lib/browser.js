/**
 * @file Browser-specific entry point
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

( function( window ) {
    'use strict';

    var futoin = window.FutoIn || {};

    if ( typeof futoin.AsyncSteps === 'undefined' )
    {
        var $as = require( './asyncsteps-full.js' );

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
