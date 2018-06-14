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
const { DefenseRejected } = require( './Errors' );
const { prev_queue } = require( './lib/common' );

const throttle_sync = ( asp, throttle, step, on_error, args ) => {
    if ( throttle._lock( asp ) ) {
        asp._on_error = on_error;
        step( asp, ...args );
    } else {
        const root = asp._root;
        asp._on_cancel = throttle._cancel_handler;
        root._next_args = args;

        prev_queue( root ).unshift(
            [ step, on_error ]
        );
    }
};

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
        const queue = this._queue = [];
        this._timer = null;
        this._period_ms = period_ms;
        this._max_queue = max_queue;
        this._cancel_handler = ( asi ) => {
            const idx = queue.indexOf( asi );

            if ( idx >= 0 ) {
                queue.splice( idx, 1 );
            }
        };
        Object.seal( this );
    }

    _lock( asi ) {
        this._ensureTimer();

        if ( this._current >= this._max ) {
            const queue = this._queue;
            const max_queue = this._max_queue;

            if ( ( max_queue !== null ) && ( queue.length >= max_queue ) ) {
                asi.error( DefenseRejected, 'Throttle queue limit' );
            }

            queue.push( asi );
            return false;
        } else {
            this._current += 1;
            return true;
        }
    }

    _ensureTimer() {
        if ( !this._timer ) {
            this._timer = setInterval( () => {
                this._resetPeriod();
            }, this._period_ms );
        }
    }

    _resetPeriod() {
        this._current = 0;
        const queue = this._queue;

        if ( !queue.length ) {
            clearInterval( this._timer );
            this._timer = null;
            return;
        }

        const max = this._max;
        let current = 0;

        while ( queue.length && ( current < max ) ) {
            let other_as = queue.shift();

            if ( other_as.state ) {
                ++current;
                const other_root = other_as._root;
                other_root._handle_success( other_root._next_args );
            }
        }

        this._current = current;
    }

    sync( as, step, onerror ) {
        as.add(
            ( as, ...success_args ) => {
                throttle_sync( as, this, step, onerror, success_args );
            }
        );
    }
}

module.exports = Throttle;
