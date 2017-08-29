'use strict';

/**
 * @file
 * @author Andrey Galkin <andrey@futoin.eu>
 */

const ISync = require( './ISync' );

/**
 * Mutual exclusion mechanism for AsyncSteps
 */
class Mutex extends ISync
{
    /**
     * C-tor
     * @param {integer} [max=1] - maximum number of simultaneous critical section entries
     */
    constructor( max = 1 )
    {
        super();

        this._max = max;
        this._locked = 0;
        this._owners = new WeakMap();
        this._queue = [];
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
            this._queue.push( as );
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

            if ( idx < 0 )
            {
                as.error( 'InternalError', 'Must be in Mutex queue' );
            }

            this._queue.splice( idx, 1 );
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
