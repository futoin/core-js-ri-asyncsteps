"use strict";

/**
 * @file Implementation of parallel step
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

const {
    checkFunc,
    checkOnError,
} = require( './common' );


/**
 * ParallelStep
 * @private
 * @constructor
 * @param {AsyncSteps} [root] reference to current root object
 * @param {AsyncSteps} [as] reference to current step object
 */
class ParallelStep {
    constructor( root, as ) {
        this._root = root;
        this._as = as;
        this._queue = [];
        this._psteps = [];
        this._complete_count = 0;
    }

    /**
    * @private
    * @override
    */
    add( func, onerror ) {
        checkFunc( this, func );
        checkOnError( this, onerror );

        this._queue.push( [ func, onerror ] );

        return this;
    }

    /**
    * @private
    */
    _complete( ) {
        this._complete_count += 1;

        if ( this._complete_count === this._psteps.length ) {
            this._as._root._handle_success();
            this._cleanup();
        }
    }

    /**
    * @private
    * @param {string} [name] Error name
    * @param {string} [info] Error info
    */
    _error( name, info ) {
        try {
            this._as.error( name, info );
        } catch ( _ ) {
            // ignore
        }
    }

    /**
    * @private
    * @param {AsyncSteps} [as] current step interface
    */
    executeParallel( as ) {
        const q = this._queue;
        const root = this._root;

        if ( root !== as._root ) {
            const p = new ParallelStep( as._root, as );
            p._queue.push.apply( p._queue, q );
            p.executeParallel( as );
            return;
        }

        this._as = as;

        if ( !q.length ) {
            this._complete();
            return;
        }

        as._on_cancel = () => {
            this.cancel();
        };

        /* */
        const plist = this._psteps;
        const success_func = ( as ) => {
            this._complete();
        };
        const error_func = ( as, err ) => {
            this._error( err, as.state.error_info );
        };
        const AsyncSteps = root.constructor;

        q.forEach( ( p ) => {
            const pa = new AsyncSteps( as.state, root._async_tool );

            pa._queue.push(
                [
                    ( as ) => {
                        as._queue = [
                            [ p[0], p[1] ],
                        ];
                    },
                    error_func,
                ],
                [ success_func, undefined ]
            );

            plist.push( pa );
        } );

        // Should be separate from the previous loop for
        // in case cancel() arrives in the middle
        plist.forEach( ( p ) => {
            p._execute();
        } );
    }

    /**
    * @private
    */
    cancel() {
        this._psteps.forEach( ( p ) => {
            p.cancel();
        } );
        this._cleanup();
    }

    /**
     * @private
     * @override
     */
    isAsyncSteps() {
        return true;
    }

    /**
    * @private
    */
    _cleanup() {
        this._root = null;
        this._as = null;
        this._psteps = null;
    }
}

module.exports = ParallelStep;
