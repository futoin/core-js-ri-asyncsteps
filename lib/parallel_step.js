
var async_steps = require( '../asyncsteps' );

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
    this._psteps.push( [ func, onerror ] );
    return this;
};

ParallelStepProto.parallel = function( onerror )
{
    this.error( futoin_errors.InternalError, "Invalid parallel() call" );
};

ParallelStepProto.success = function( )
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

ParallelStepProto.successStep = function( )
{
    this.error( futoin_errors.InternalError, "Invalid successStep() call" );
};

ParallelStepProto.error = function( error, error_info )
{
    this._error = error;
    this.success();
};

ParallelStepProto.setTimeout = function( timeout_ms )
{
    this.error( futoin_errors.InternalError, "Invalid setTimeout() call" );
};

ParallelStepProto.setCancel = function( oncancel )
{
    this.error( futoin_errors.InternalError, "Invalid setCancel() call" );
};

ParallelStepProto.execute = function( )
{
    this.error( futoin_errors.InternalError, "Invalid execute() call" );
};

ParallelStepProto.copyFrom = function( other )
{
    this.error( futoin_errors.InternalError, "Invalid copyFrom() call" );
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
        this.success();
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
        _this.success();
    };

    var error_func = function( as, error )
    {
        _this.error( error );
    };

    for ( p in plist )
    {
        var pa = new async_steps.AsyncSteps( as.state );

        /* jshint loopfunc: true */
        pa.add(
            function( as )
            {
                as.add( p[0], p[1] );
                as.add( success_func );
            },
            error_func
        );

        this._psteps.push( pa );

        pa.execute();
    }
};

ParallelStepProto.cancel = function()
{
    for ( var i in this._psteps )
    {
        i.cancel();
    }

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
