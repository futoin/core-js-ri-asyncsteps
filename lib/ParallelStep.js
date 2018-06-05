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

    STATE,
    QUEUE,
    ROOT,
    CLEANUP,
    AS,
    PSTEPS,
    COMPLETE_COUNT,
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
        this[ROOT] = root;
        this[AS] = as;
        this[QUEUE] = [];
        this[PSTEPS] = [];
        this[COMPLETE_COUNT] = 0;
    }

    /**
    * @private
    * @override
    */
    add( func, onerror ) {
        checkFunc( this, func );
        checkOnError( this, onerror );

        this[QUEUE].push( [ func, onerror ] );

        return this;
    }

    /**
    * @private
    */
    _complete( ) {
        this[COMPLETE_COUNT] += 1;

        if ( this[COMPLETE_COUNT] === this[PSTEPS].length ) {
            this[AS].success();
            this[CLEANUP]();
        }
    }

    /**
    * @private
    * @param {string} [name] Error name
    * @param {string} [info] Error info
    */
    _error( name, info ) {
        try {
            this[AS].error( name, info );
        } catch ( _ ) {
            // ignore
        }
    }

    /**
    * @private
    * @param {AsyncSteps} [as] current step interface
    */
    executeParallel( as ) {
        const q = this[QUEUE];

        if ( this[ROOT] !== as[ROOT] ) {
            const p = new ParallelStep( as[ROOT], as );
            p[QUEUE].push.apply( p[QUEUE], q );
            p.executeParallel( as );
            return;
        }

        this[AS] = as;

        if ( !q.length ) {
            this._complete();
            return;
        }

        as.setCancel( () => this.cancel() );

        /* */
        const plist = this[PSTEPS];
        const success_func = ( as ) => this._complete();
        const error_func = ( as, err ) => this._error( err, as[STATE].error_info );
        const AsyncSteps = this[ROOT].constructor;

        q.forEach( ( p ) => {
            const pa = new AsyncSteps( as[STATE] );

            pa.add(
                ( as ) => as.add( p[0], p[1] ),
                error_func
            );
            pa.add( success_func );

            plist.push( pa );
        } );

        // Should be separate from the previous loop for
        // in case cancel() arrives in the middle
        plist.forEach( ( p ) => p.execute() );
    }

    /**
    * @private
    */
    cancel() {
        this[PSTEPS].forEach( ( p ) => p.cancel() );
        this[CLEANUP]();
    }

    /**
    * @private
    */
    [CLEANUP]() {
        this[ROOT] = null;
        this[AS] = null;
        this[PSTEPS] = null;
    }
}

module.exports = ParallelStep;
