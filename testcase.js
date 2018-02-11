"use strict";

/**
 * @file Module's entry point and AsyncSteps class itself
 * @author Andrey Galkin <andrey@futoin.org>
 *
 *
 * Copyright 2018 FutoIn Project (https://futoin.org)
 * Copyright 2018 Andrey Galkin <andrey@futoin.org>
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

const AsyncSteps = require( './AsyncSteps' );

/**
 * Mocha-compatible test case based on AsyncSteps.
 *
 * Example:
 * ```javascript
 * it('should ...', $as_test( (as) => {}, (as, err) => {} );
 * ```
 *
 * @param {ExecFunc} func - function defining non-blocking step execution
 * @param {ErrorFunc=} onerror - Optional, provide error handler
 * @return {Function} suitable for `it()` Mocha call
 *
 * @alias $as_test
 */
module.exports = function( func, onerror ) {
    return function( done ) {
        const as = new AsyncSteps();
        as.add(
            ( as ) => {
                as.add(
                    ( as ) => {
                        func.call( this, as );

                        if ( onerror ) {
                            as.add( ( as ) => as.error( 'NegativeTestMustThrow' ) );
                        }
                    },
                    onerror
                );
            },
            ( as, err ) => {
                // eslint-disable-next-line no-console
                console.log( `ERRPR: ${err} (${as.state.error_info})` );
                done( as.state.last_exception || new Error( 'Generic Fail' ) );
            }
        );
        as.add( as => done() );
        as.execute();
    };
};
