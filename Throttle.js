'use strict';

/**
 * @file
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

const ISync = require( './ISync' );
const Errors = require( './Errors' );

const {
    CURRENT,
    MAX,
    MAX_QUEUE,
    NEXT_ARGS,
    PERIOD_MS,
    QUEUE,
    ROOT,
    STATE,
    TIMER,
} = require( './lib/common' );

/**
 * Throttling for AsyncSteps
 */
class Throttle extends ISync {
    /**
     * C-tor
     * @param {integer} [max=1] - maximum number of simultaneous critical section entries
     * @param {intger} [period_ms=1000] - time period in milliseconds
     * @param {integer} [max_queue=null] - limit queue length, if set
     */
    constructor( max, period_ms=1e3, max_queue = null ) {
        super();

        this[MAX] = max;
        this[CURRENT] = 0;
        this[QUEUE] = [];
        this[TIMER] = null;
        this[PERIOD_MS] = period_ms;
        this[MAX_QUEUE] = max_queue;
    }

    _lock( as ) {
        this._ensureTimer();

        if ( this[CURRENT] >= this[MAX] ) {
            const queue = this[QUEUE];
            const max_queue = this[MAX_QUEUE];

            if ( ( max_queue !== null ) && ( queue.length >= max_queue ) ) {
                as.error( Errors.DefenseRejected, 'Throttle queue limit' );
            }

            queue.push( as );
        } else {
            this[CURRENT] += 1;
            as.success();
        }
    }

    _ensureTimer() {
        if ( !this[TIMER] ) {
            this[TIMER] = setInterval( () => this._resetPeriod(), this[PERIOD_MS] );
        }
    }

    _resetPeriod() {
        this[CURRENT] = 0;
        const queue = this[QUEUE];

        if ( !queue.length ) {
            clearInterval( this[TIMER] );
            this[TIMER] = null;
            return;
        }

        const max = this[MAX];
        let current = 0;

        while ( queue.length && ( current < max ) ) {
            let other_as = queue.shift();

            if ( other_as[STATE] ) {
                ++current;
                other_as.success();
            }
        }

        this[CURRENT] = current;
    }

    _cancel( as ) {
        const idx = this[QUEUE].indexOf( as );

        if ( idx >= 0 ) {
            this[QUEUE].splice( idx, 1 );
        }
    }

    sync( as, step, onerror ) {
        let incoming_args;

        as.add( ( as, ...success_args ) => {
            incoming_args = success_args;
            as.setCancel( ( as ) => this._cancel( as ) );
            this._lock( as );
        } );
        as.add( ( as ) => {
            as[ROOT][NEXT_ARGS] = incoming_args;
            as.add( step, onerror );
        } );
    }
}

module.exports = Throttle;
