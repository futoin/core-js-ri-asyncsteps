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
const Errors = require( './lib/futoin_errors' );

/**
 * Mutual exclusion mechanism for AsyncSteps
 */
class Mutex extends ISync
{
    /**
     * C-tor
     * @param {integer} [max=1] - maximum number of simultaneous critical section entries
     * @param {integer} [max_queue=null] - limit queue length, if set
     */
    constructor( max = 1, max_queue = null )
    {
        super();

        this._max = max;
        this._locked = 0;
        this._owners = new WeakMap();
        this._queue = [];
        this._max_queue = max_queue;
    }

    _lock( as )
    {
        const key = as._root;
        const owners = this._owners;
        const owned = owners.get( key );

        if ( owned )
        {
            owners.set( key, owned + 1 );
            as.success();
        }
        else if ( this._locked >= this._max )
        {
            const queue = this._queue;
            const max_queue = this._max_queue;

            if ( ( max_queue !== null ) && ( queue.length >= max_queue ) )
            {
                as.error( Errors.DefenseRejected, 'Mutex queue limit' );
            }

            queue.push( as );
        }
        else
        {
            this._locked += 1;
            owners.set( key, 1 );
            as.success();
        }
    }

    _release( as )
    {
        const key = as._root;
        const owners = this._owners;
        const owned = owners.get( key );

        if ( owned )
        {
            if ( owned > 1 )
            {
                owners.set( key, owned - 1 );
                return;
            }

            owners.delete( key );

            if ( this._locked <= 0 )
            {
                as.error( 'InternalError', 'Mutex must be in locked state' );
            }

            this._locked -= 1;
            const queue = this._queue;

            while ( queue.length )
            {
                let other_as = queue.shift();

                if ( other_as.state )
                {
                    this._lock( other_as );
                    break;
                }
            }
        }
        else
        {
            const idx = this._queue.indexOf( as );

            if ( idx >= 0 )
            {
                this._queue.splice( idx, 1 );
            }
        }
    }

    sync( as, step, onerror )
    {
        let incoming_args;

        as.add( ( as, ...success_args ) =>
        {
            incoming_args = success_args;
            as.setCancel( ( as ) => this._release( as ) );
            this._lock( as );
        } );
        as.add( ( as ) =>
        {
            as.setCancel( ( as ) => this._release( as ) );

            if ( incoming_args.length )
            {
                as.add( ( as ) => as.success( ...incoming_args ) );
            }

            as.add( step, onerror );
        } );
        as.add( ( as, ...success_args ) =>
        {
            this._release( as );
            as.success( ...success_args );
        } );
    }
}

module.exports = Mutex;
