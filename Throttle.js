'use strict';

/**
 * @file
 * @author Andrey Galkin <andrey@futoin.org>
 */

const ISync = require( './ISync' );

/**
 * Throttling for AsyncSteps
 */
class Throttle extends ISync
{
    /**
     * C-tor
     * @param {integer} [max=1] - maximum number of simultaneous critical section entries
     * @param {intger} [period_ms=1000] - time period in milliseconds
     */
    constructor( max, period_ms=1e3 )
    {
        super();

        this._max = max;
        this._current = 0;
        this._queue = [];
        this._timer = null;
        this._period_ms = period_ms;
    }

    _lock( as )
    {
        this._ensureTimer();

        if ( this._current >= this._max )
        {
            this._queue.push( as );
        }
        else
        {
            this._current += 1;
            as.success();
        }
    }

    _ensureTimer()
    {
        if ( !this._timer )
        {
            this._timer = setInterval( () => this._resetPeriod(), this._period_ms );
        }
    }

    _resetPeriod()
    {
        this._current = 0;
        const queue = this._queue;

        if ( !queue.length )
        {
            clearInterval( this._timer );
            return;
        }

        const max = this._max;
        let current = 0;

        while ( queue.length && ( current < max ) )
        {
            let other_as = queue.shift();

            if ( other_as.state )
            {
                ++current;
                other_as.success();
            }
        }

        this._current = current;
    }

    _cancel( as )
    {
        const idx = this._queue.indexOf( as );

        if ( idx < 0 )
        {
            as.error( 'InternalError', 'Must be in Throttle queue' );
        }

        this._queue.splice( idx, 1 );
    }

    sync( as, step, onerror )
    {
        let incoming_args;

        as.add( ( as, ...success_args ) =>
        {
            incoming_args = success_args;
            as.setCancel( ( as ) => this._cancel( as ) );
            this._lock( as );
        } );
        as.add( ( as ) =>
        {
            if ( incoming_args.length )
            {
                as.add( ( as ) => as.success( ...incoming_args ) );
            }

            as.add( step, onerror );
        } );
    }
}

module.exports = Throttle;
