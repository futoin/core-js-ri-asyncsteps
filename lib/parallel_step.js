"use strict";

/**
 * @file Implementation of parallel step
 * @author Andrey Galkin <andrey@futoin.eu>
 */

var async_steps = require( './asyncsteps' );

/**
 * @private
 */
exports = module.exports = function( root, as )
{
    return new  module.exports.ParallelStep( root, as );
};

/**
 * ParallelStep
 * @private
 */
var ParallelStep = function( root, as )
{
    this._root = root;
    this._as = as;
    this._queue = [];
    this._psteps = [];
    this._complete_count = 0;
};

/**
 * Parallel step prototype
 * @private
 */
var ParallelStepProto = {};

ParallelStepProto._root = null;
ParallelStepProto._as = null;
ParallelStepProto._psteps = null;
ParallelStepProto._complete_count = null;
ParallelStepProto._error = null;

/**
 * @private
 */
ParallelStepProto.add = function( func, onerror )
{
    this._root._check_func( func );
    this._root._check_onerror( onerror );
    this._queue.push( [ func, onerror ] );
    return this;
};

/**
 * @private
 */
ParallelStepProto._complete = function( )
{
    this._complete_count += 1;

    if ( this._complete_count === this._psteps.length )
    {
        this._as.success();
        this._cleanup();
    }
};

/**
 * @private
 */
ParallelStepProto._error = function( name, info )
{
    try
    {
        this._as.error( name, info );
    }
    catch ( e )
    {}
};

/**
 * @private
 */
ParallelStepProto.executeParallel = function( as )
{
    var p;

    if ( this._root !== as._root )
    {
        p = new ParallelStep( as._root, as );
        p._queue.push.apply( p._queue, this._queue );
        p.executeParallel( as );
        return;
    }

    this._as = as;

    var _this = this;

    if ( !this._queue.length )
    {
        this._complete();
        return;
    }

    as.setCancel(
        function()
        {
            _this.cancel();
        }
    );

    /* */
    var q = this._queue;
    var plist = this._psteps;

    var success_func = function( as )
    {
        void as;
        _this._complete();
    };

    var error_func = function( as, err )
    {
        _this._error( err, as.state.error_info );
    };

    var step_func_gen = this._step_func_gen;

    q.forEach( function( p )
    {
        var pa = new async_steps.AsyncSteps( as.state );

        pa.add(
            step_func_gen( p ),
            error_func
        );
        pa.add( success_func );

        plist.push( pa );
    } );

    // Should be separate from the previous loop for
    // in case cancel() arrives in the middle
    plist.forEach( function( p )
    {
        p.execute();
    } );
};

/**
 * @private
 */
ParallelStepProto._step_func_gen = function( pi )
{
    return function( as )
    {
        as.add( pi[0], pi[1] );
    };
};

/**
 * @private
 */
ParallelStepProto.cancel = function()
{
    this._psteps.forEach( function( p )
    {
        p.cancel();
    } );

    this._cleanup();
};

/**
 * @private
 */
ParallelStepProto._cleanup = function()
{
    this._root = null;
    this._as = null;
    this._psteps = null;
};

/* */

ParallelStep.prototype = ParallelStepProto;
exports.ParallelStep = ParallelStep;
