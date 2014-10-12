
var asp = require( './lib/asyncstep_protector' );
var parallel_step = require( './lib/parallel_step' );
var async_tool = require( './lib/asynctool' );

/**
 * Call to get a new instance of AsyncSteps
 */
exports = module.exports = function( )
{
    return new this.AsyncSteps();
};

exports.AsyncTool = async_tool;

/* Use for unit testing */
exports.installAsyncToolTest = function( install )
{
    if ( install === false )
    {
        exports.AsyncTool = require( './lib/asynctool' );
    }
    else
    {
        exports.AsyncTool = require( './lib/asynctool_test' );
    }
};

/**
 * AsyncSteps instance itself
 */
function AsyncSteps( state )
{
    this.state = state || { error_info : "" };
    this._queue = [];
    this._stack = [];
}

/**
 * Prototype for AsyncSteps
 */
function AsyncStepsProto()
{
    this.success.apply( this, arguments );
}

AsyncStepsProto._limit_event = null;
AsyncStepsProto._oncancel = null;

AsyncStepsProto.add = function( func, onerror )
{
    if ( this._stack.length )
    {
        this.error( "InternalError", "Top level add in execution" );
    }

    this._queue.push( [ func, onerror ] );
};

AsyncStepsProto.parallel = function( onerror )
{
};

AsyncStepsProto.success = function( )
{
    this.error( "InternalError", "Invalid success() call" );
};

AsyncStepsProto.successStep = function( )
{
    this.error( "InternalError", "Invalid successStep() call" );
};

AsyncStepsProto.error = function( error, error_info )
{
    if ( error_info )
    {
        this.state.error_info = error_info;
    }

    throw error;
};

AsyncStepsProto.setTimeout = function( timeout_ms )
{
    if ( this._limit_event )
    {
        exports.AsyncTool.cancelCall( this._limit_event );
        this._limit_event = null;
    }

    var _this = this;

    exports.AsyncTool.callLater(
        function()
        {
            _this._limit_event = null;
            _this._handle_error( "Timeout" );
        },
        timeout_ms
    );
};

AsyncStepsProto.setCancel = function( oncancel )
{
    var _this = this;
    this._oncancel = function()
    {
        oncancel.call( _this );
    };
};

AsyncStepsProto.execute = function( )
{
};

AsyncStepsProto.copyFrom = function( other )
{
    this._queue.push.apply( this._queue, other._queue );
};

AsyncStepsProto._handle_error = function( error )
{
};

AsyncSteps.prototype = AsyncStepsProto;
exports.AsyncSteps = AsyncSteps;
