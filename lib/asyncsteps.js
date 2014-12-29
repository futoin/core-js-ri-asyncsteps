"use strict";

/**
 * @module futoin-asyncsteps
 */

var async_tool = require( './asynctool' );
var async_tool_test = require( './asynctool_test' );
var futoin_errors = require( './futoin_errors' );

/**
 * @private
 */
exports = module.exports = function( )
{
    return new module.exports.AsyncSteps();
};

// Prevent issues with cyclic deps
var asyncstep_protector = require( './asyncstep_protector' );
var parallel_step = require( './parallel_step' );

exports.AsyncTool = async_tool;
exports.FutoInError = futoin_errors;

/**
 * Use for unit testing to fine control step execution.
 * It installs AsyncToolTest in place of AsyncTool
 * @alias installAsyncToolTest
 * @param {boolean} [install=true] - true - install AsyncToolTest, false - AsyncTool as scheduler
 */
exports.installAsyncToolTest = function( install )
{
    if ( install === false )
    {
        exports.AsyncTool = async_tool;
    }
    else
    {
        exports.AsyncTool = async_tool_test;
    }
};

/**
 * Root AsyncStep implementation
 * @alias AsyncSteps
 * @class
 * @param {Object=} state - For internal use. State variable sharing
 */
function AsyncSteps( state )
{
    if ( typeof state === 'undefined' )
    {
        state = function()
        {
            return this.state;
        };
    }

    this.state = state;
    this._queue = [];
    this._stack = [];
    this._in_execute = false;

    var _this = this;
    this._execute_cb = function()
    {
        _this.execute();
    };
}

/**
 * Prototype for AsyncSteps
 * @ignore
 */
var AsyncStepsProto =
{
    _execute_event : null,
    _next_args : []
};

/**
 * execute_callback as defined in FTN12: FutoIn AsyncSteps specification. Function must have
 * non-blocking body calling:  as.success() or as.error() or as.add()/as.parallel().
 * @callback ExecFunc
 * @param {AsyncSteps} as - the only valid reference to AsyncSteps with required level of protection
 * @param {...*} [val] - any result values passed to the previous as.success() call
 * @alias execute_callback
 */

/**
 * error_callback as defined in FTN12: FutoIn AsyncSteps specification.
 * Function can:
 * a) do nothing
 * b) override error message with as.error( new_error )
 * c) continue execution with as.success()
 * @callback ErrorFunc
 * @param {AsyncSteps} as - the only valid reference to AsyncSteps with required level of protection
 * @param {string} err - error message
 * @alias error_callback
 */

/**
 * cancel_callback as defined in FTN12: FutoIn AsyncSteps specification.
 * It must be used to cancel any external processing to avoid invalidated AsyncSteps object use.
 * @param {AsyncSteps} as - the only valid reference to AsyncSteps with required level of protection
 * @alias cancel_callback
 */

/**
 * @private
 */
AsyncStepsProto._check_func = function( func )
{
    if ( func.length < 1 )
    {
        this.error( futoin_errors.InternalError, "Step function must expect at least AsyncStep interface" );
    }
};

/**
 * @private
 */
AsyncStepsProto._check_onerror = function( onerror )
{
    if ( onerror &&
         ( onerror.length !== 2 ) )
    {
        this.error( futoin_errors.InternalError, "Error handler must take exactly two arguments" );
    }
};

/**
 * Add sub-step. Can be called multiple times.
 * @param {ExecFunc} func - function defining non-blocking step execution
 * @param {ErrorFunc=} onerror - Optional, provide error handler
 * @returns {AsyncSteps}
 * @alias AsyncSteps#add
 */
AsyncStepsProto.add = function( func, onerror )
{
    this._sanityCheck();
    this._check_func( func );
    this._check_onerror( onerror );

    this._queue.push( [ func, onerror ] );
    return this;
};

/**
 * Creates a step internally and returns specialized AsyncSteps interfaces all steps
 * of which are executed in quasi-parallel.
 * @param {ErrorFunc=} onerror - Optional, provide error handler
 * @returns {AsyncSteps}
 * @alias AsyncSteps#parallel
 */
AsyncStepsProto.parallel = function( onerror )
{
    var p = parallel_step( this, this );

    this.add(
        function( as )
        {
            p.executeParallel( as );
        },
        onerror
    );

    return p;
};

/**
 * Set error and throw to abort execution.
 * @param {string} name - error message, expected to be identifier "InternalError"
 * @param {string=} error_info - optional descriptive message assigned to as.state.error_info
 * @throws {Error}
 * @alias AsyncSteps#error
 */
AsyncStepsProto.error = function( name, error_info )
{
    this.state.error_info = error_info;

    if ( !this._in_execute )
    {
        this._handle_error( name );
    }

    throw new Error( name );
};

/**
 * Copy steps and not yet defined state variables from "model" AsyncSteps instance
 * @param {AsyncSteps} other - model instance, which must get be executed
 * @alias AsyncSteps#copyFrom
 */
AsyncStepsProto.copyFrom = function( other )
{
    this._queue.push.apply( this._queue, other._queue );

    var os = other.state;
    var s = this.state;

    for ( var k in os )
    {
        if ( typeof s[k] === 'undefined' )
        {
            s[k] = os[k];
        }
    }

    return this;
};

/**
 * @private
 */
AsyncStepsProto._handle_success = function( args )
{
    var stack = this._stack;

    if ( !stack.length )
    {
        this.error( futoin_errors.InternalError, 'Invalid success completion' );
    }

    this._next_args = args;

    for ( var asp = stack[ stack.length - 1 ];; )
    {
        if ( asp._limit_event )
        {
            exports.AsyncTool.cancelCall( asp._limit_event );
            asp._limit_event = null;
        }

        asp._cleanup(); // aid GC
        stack.pop();

        // ---
        if ( !stack.length )
        {
            break;
        }

        asp = stack[ stack.length - 1 ];

        if ( asp._queue.length )
        {
            break;
        }
    }

    if ( stack.length ||
         this._queue.length )
    {
        this._execute_event = exports.AsyncTool.callLater( this._execute_cb );
    }
};

/**
 * @private
 */
AsyncStepsProto._handle_error = function( name )
{
    this._next_args = [];

    var stack = this._stack;
    var asp;
    var slen;

    for ( ; stack.length; stack.pop() )
    {
        asp = stack[ stack.length - 1 ];

        if ( asp._limit_event )
        {
            exports.AsyncTool.cancelCall( asp._limit_event );
            asp._limit_event = null;
        }

        if ( asp._oncancel )
        {
            asp._oncancel.call( null, asp );
            asp._oncancel = null;
        }

        if ( asp._onerror )
        {
            slen = stack.length;
            asp._queue = null; // suppress non-empty queue for success() in onerror

            try
            {
                this._in_execute = true;
                asp._onerror.call( null, asp, name );
            }
            catch ( e )
            {
                name = e.message;
            }
            finally
            {
                this._in_execute = false;
            }

            if ( slen !== stack.length )
            {
                return; // override with success()
            }
        }

        asp._cleanup(); // aid GC
    }

    // Clear queue on finish
    this._queue = [];

    if ( this._execute_event )
    {
        exports.AsyncTool.cancelCall( this._execute_event );
        this._execute_event = null;
    }
};

/**
 * Use only on root AsyncSteps instance. Abort execution of AsyncSteps instance in progress.
 * @alias AsyncSteps#cancel
 */
AsyncStepsProto.cancel = function()
{
    this._next_args = [];

    if ( this._execute_event )
    {
        exports.AsyncTool.cancelCall( this._execute_event );
        this._execute_event = null;
    }

    var stack = this._stack;
    var asp;

    while ( stack.length )
    {
        asp = stack.pop();

        if ( asp._limit_event )
        {
            exports.AsyncTool.cancelCall( asp._limit_event );
            asp._limit_event = null;
        }

        if ( asp._oncancel )
        {
            asp._oncancel.call( null, asp );
            asp._oncancel = null;
        }

        asp._cleanup(); // aid GC
    }

    // Clear queue on finish
    this._queue = [];

    return this;
};

/**
 * Start execution of AsyncSteps using AsyncTool
 * Must not be called more than once until cancel/complete (instance can be re-used)
 * @alias AsyncSteps#execute
 */
AsyncStepsProto.execute = function( )
{
    if ( this._execute_event )
    {
        exports.AsyncTool.cancelCall( this._execute_event );
        this._execute_event = null;
    }

    var stack = this._stack;
    var q;

    if ( stack.length )
    {
        q = stack[ stack.length - 1 ]._queue;
    }
    else
    {
        q = this._queue;
    }

    if ( !q.length )
    {
        return;
    }

    var curr = q.shift();

    if ( curr[0] === null )
    {
        this._handle_success( [] );
        return;
    }

    var asp = asyncstep_protector( this );

    var next_args = this._next_args;
    this._next_args = [];
    next_args.unshift( asp );

    try
    {
        asp._onerror = curr[1];
        stack.push( asp );

        var oc = stack.length;
        this._in_execute = true;
        curr[0].apply( null, next_args );

        if ( oc === stack.length )
        {
            if ( asp._queue !== null )
            {
                this._execute_event = exports.AsyncTool.callLater( this._execute_cb );
            }
            else
                if ( ( asp._limit_event === null ) &&
                      ( asp._oncancel === null ) )
            {
                // Implicit success
                this._handle_success( [] );
            }
        }
    }
    catch ( e )
    {
        this._in_execute = false;
        this._handle_error( e.message );
    }
    finally
    {
        this._in_execute = false;
    }

    return this;
};

/**
 * @private
 */
AsyncStepsProto._sanityCheck = function()
{
    if ( this._stack.length )
    {
        this.error( futoin_errors.InternalError, "Top level add in execution" );
    }
};

var ASPProto = asyncstep_protector.AsyncStepProtector.prototype;
AsyncStepsProto.loop = ASPProto.loop;
AsyncStepsProto.repeat = ASPProto.repeat;
AsyncStepsProto.forEach = ASPProto.forEach;

/**
 * Get AsyncSteps state object.
 * Note: As a JS-specific improvement as.state === as.state()
 * @returns {object}
 * @alias AsyncSteps#state
 */

AsyncSteps.prototype = AsyncStepsProto;
exports.AsyncSteps = AsyncSteps;
