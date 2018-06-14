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

const mtx_sync = ( asp, mtx, step, on_error, args ) => {
    const root = asp._root;
    const release_step = ( _, ...next_args ) => {
        mtx._release( root );
        root._handle_success( next_args );
    };

    asp._on_cancel = mtx._release_handler;
    root._next_args = args;

    if ( mtx._lock( asp, root ) ) {
        asp._queue = [
            [ step, on_error ],
            [ release_step, undefined ],
        ];
    } else {
        prev_queue( root ).unshift(
            [ step, on_error ],
            [ release_step, undefined ]
        );
    }
};

/**
 * Mutual exclusion mechanism for AsyncSteps
 */
class Mutex extends ISync {
    /**
     * C-tor
     * @param {integer} [max=1] - maximum number of simultaneous critical section entries
     * @param {integer} [max_queue=null] - limit queue length, if set
     */
    constructor( max = 1, max_queue = null ) {
        super();

        this._max = max;
        this._locked = 0;
        this._owners = new WeakMap();
        this._queue = [];
        this._max_queue = max_queue;
        this._release_handler = ( asi ) => {
            this._release( asi._root );
        };
    }

    _lock( asi, key ) {
        const owners = this._owners;
        const owned = owners.get( key );

        if ( owned ) {
            owners.set( key, owned + 1 );
            return true;
        } else if ( this._locked >= this._max ) {
            const queue = this._queue;
            const max_queue = this._max_queue;

            if ( ( max_queue !== null ) && ( queue.length >= max_queue ) ) {
                asi.error( DefenseRejected, 'Mutex queue limit' );
            }

            queue.push( asi );
            return false;
        } else {
            this._locked += 1;
            owners.set( key, 1 );
            return true;
        }
    }

    _release( key ) {
        const owners = this._owners;
        const owned = owners.get( key );

        if ( owned ) {
            if ( owned > 1 ) {
                owners.set( key, owned - 1 );
                return;
            }

            owners.delete( key );

            this._locked -= 1;
            const queue = this._queue;

            while ( queue.length ) {
                const other_as = queue.shift();

                if ( other_as.state ) {
                    const other_root = other_as._root;
                    this._lock( other_as, other_root );
                    other_root._handle_success( other_root._next_args );
                    break;
                }
            }
        } else {
            const idx = this._queue.indexOf( key );

            if ( idx >= 0 ) {
                this._queue.splice( idx, 1 );
            }
        }
    }

    sync( as, step, onerror ) {
        as.add(
            ( as, ...success_args ) => {
                mtx_sync( as, this, step, onerror, success_args );
            }
        );
    }
}

module.exports = Mutex;
