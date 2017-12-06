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

        this._max = max;
        this._current = 0;
        this._queue = [];
        this._timer = null;
        this._period_ms = period_ms;
        this._max_queue = max_queue;
    }

    _lock( as ) {
        this._ensureTimer();

        if ( this._current >= this._max ) {
            const queue = this._queue;
            const max_queue = this._max_queue;

            if ( ( max_queue !== null ) && ( queue.length >= max_queue ) ) {
                as.error( Errors.DefenseRejected, 'Throttle queue limit' );
            }

            queue.push( as );
        } else {
            this._current += 1;
            as.success();
        }
    }

    _ensureTimer() {
        if ( !this._timer ) {
            this._timer = setInterval( () => this._resetPeriod(), this._period_ms );
        }
    }

    _resetPeriod() {
        this._current = 0;
        const queue = this._queue;

        if ( !queue.length ) {
            clearInterval( this._timer );
            return;
        }

        const max = this._max;
        let current = 0;

        while ( queue.length && ( current < max ) ) {
            let other_as = queue.shift();

            if ( other_as.state ) {
                ++current;
                other_as.success();
            }
        }

        this._current = current;
    }

    _cancel( as ) {
        const idx = this._queue.indexOf( as );

        if ( idx >= 0 ) {
            this._queue.splice( idx, 1 );
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
            if ( incoming_args.length ) {
                as.add( ( as ) => as.success( ...incoming_args ) );
            }

            as.add( step, onerror );
        } );
    }
}

module.exports = Throttle;
