
var async_steps = require( '../asyncsteps' );
var futoin_errors = require( './futoin_errors' );

exports = module.exports = function( root, as )
{
    return new  module.exports.ParallelStep( root, as );
};

/**
 * ParallelStep
 */
var ParallelStep = function( root, as )
{
    this._root = root;
    this._as = as;
    this._psteps = [];
    this._complete_count = 0;
};

/**
 * Parallel step prototype
 */
var ParallelStepProto = {};

ParallelStepProto._root = null;
ParallelStepProto._as = null;
ParallelStepProto._psteps = null;
ParallelStepProto._complete_count = null;
ParallelStepProto._error = null;

ParallelStepProto.add = function( func, onerror )
{
    this._root._check_func( func );
    this._root._check_onerror( onerror );
    this._psteps.push( [ func, onerror ] );
    return this;
};

ParallelStepProto._complete = function( )
{
    if ( this._complete_count == this._psteps.length )
    {
        if ( this._error !== null )
        {
            this._root._handle_error( this._error );
        }
        else
        {
            this._as.success();
        }

        this._cleanup();
    }
};

ParallelStepProto._error = function( error, error_info )
{
    this._error = error;
    this._complete();
};

ParallelStepProto.executeParallel = function( as )
{
    this._as = as;
    var p;

    if ( this._root !== as._root )
    {
        p = new ParallelStep( as._root, as );
        p._psteps.push.apply( p._psteps, this._psteps );
        p.executeParallel( as );
        this._cleanup();
        return;
    }

    var _this = this;

    if ( !this._psteps.length )
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
    var plist = this._psteps;
    this._psteps = [];

    var success_func = function( as )
    {
        as.success();
        _this._complete();
    };

    var error_func = function( as, error )
    {
        _this._error( error );
    };

    var step_func_gen = function( pi )
    {
        return function( as )
        {
            as.add( pi[0], pi[1] );
            as.add( success_func );
        };
    };

    plist.forEach( function( p )
    {
        var pa = new async_steps.AsyncSteps( as.state );

        pa.add(
            step_func_gen( p ),
            error_func
        );

        this._psteps.push( pa );

        pa.execute();
    }, this );
};

ParallelStepProto.cancel = function()
{
    this._psteps.forEach( function( p )
    {
        p.cancel();
    } );

    this._cleanup();
};

ParallelStepProto._cleanup = function()
{
    this._root = null;
    this._as = null;
    this._psteps = null;
};

/* */

ParallelStep.prototype = ParallelStepProto;
exports.ParallelStep = ParallelStep;
