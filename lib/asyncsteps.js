"use strict";

/**
 * @file Module's entry point and AsyncSteps class itself
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

/**
 * @module futoin-asyncsteps
 */

var async_tool = require( './asynctool' );
var async_tool_test = require( './asynctool_test' );
var futoin_errors = require( './futoin_errors' );

/**
 * @private
 * @returns {AsyncSteps} new instance
 */
exports = module.exports = function( )
{
    return new module.exports.AsyncSteps();
};

// Prevent issues with cyclic deps
var asyncstep_protector = require( './asyncstep_protector' );
var parallel_step = require( './parallel_step' );
var AsyncTool = async_tool;

exports.AsyncTool = AsyncTool;
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
        exports.AsyncTool = AsyncTool = async_tool;
    }
    else
    {
        exports.AsyncTool = AsyncTool = async_tool_test;
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
    this._exec_stack = [];
    this._in_execute = false;
    this._next_args = [];

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
var AsyncStepsProto = {};

AsyncSteps.prototype = AsyncStepsProto;
AsyncStepsProto._execute_event = null;
AsyncStepsProto._next_args = null;

/**
 * *execute_callback* as defined in **FTN12: FutoIn AsyncSteps** specification. Function must have
 * non-blocking body calling:  *as.success()* or *as.error()* or *as.add()/as.parallel()*.
 * @callback ExecFunc
 * @param {AsyncSteps} as - the only valid reference to AsyncSteps with required level of protection
 * @param {...*} [val] - any result values passed to the previous as.success() call
 * @alias execute_callback
 */

/**
 * *error_callback* as defined in **FTN12: FutoIn AsyncSteps** specification.
 * Function can:
 *
 * * do nothing
 * * override error message with *as.error( new_error )*
 * * continue execution with *as.success()*
 * @callback ErrorFunc
 * @param {AsyncSteps} as - the only valid reference to AsyncSteps with required level of protection
 * @param {string} err - error message
 * @alias error_callback
 */

/**
 * *cancel_callback* as defined in **FTN12: FutoIn AsyncSteps** specification.
 *
 * @callback CancelFunc
 * It must be used to cancel any external processing to avoid invalidated AsyncSteps object use.
 * @param {AsyncSteps} as - the only valid reference to AsyncSteps with required level of protection
 * @alias cancel_callback
 */

/**
 * @private
 * @param {function} [func] Step function to check
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
 * @param {function} [onerror] error handler to check
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
 * @returns {AsyncSteps} self
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
 * @returns {AsyncSteps} interface for parallel step adding
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
 * Add sub-step with synchronization against supplied object.
 * @param {ISync} object - Mutex, Throttle or other type of synchronization implementation.
 * @param {ExecFunc} func - function defining non-blocking step execution
 * @param {ErrorFunc=} onerror - Optional, provide error handler
 * @returns {AsyncSteps} self
 * @alias AsyncSteps#sync
 */
AsyncStepsProto.sync = function( object, func, onerror )
{
    this._sanityCheck();
    this._check_func( func );
    this._check_onerror( onerror );

    object.sync( this, func, onerror );
    return this;
};

/**
 * Set error and throw to abort execution.
 *
 * *NOTE: If called outside of AsyncSteps stack (e.g. by external event), make sure you catch the exception*
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
 * @returns {AsyncSteps} self
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
 * @param {array} [args] List of success() args
 */
AsyncStepsProto._handle_success = function( args )
{
    var stack = this._stack;
    var exec_stack = this._exec_stack;

    if ( !stack.length )
    {
        this.error( futoin_errors.InternalError, 'Invalid success completion' );
    }

    this._next_args = args;

    for ( var asp = stack[ stack.length - 1 ];; )
    {
        if ( asp._limit_event )
        {
            AsyncTool.cancelCall( asp._limit_event );
            asp._limit_event = null;
        }

        asp._cleanup(); // aid GC
        stack.pop();
        exec_stack.pop();

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
        this._scheduleExecute();
    }
};

/**
 * @private
 * @param {string} [name] Error to handle
 */
AsyncStepsProto._handle_error = function( name )
{
    this._next_args = [];

    var stack = this._stack;
    var exec_stack = this._exec_stack;
    var asp;
    var slen;

    this.state.async_stack = exec_stack.slice( 0 );

    for ( ; stack.length; stack.pop(), exec_stack.pop() )
    {
        asp = stack[ stack.length - 1 ];

        if ( asp._limit_event )
        {
            AsyncTool.cancelCall( asp._limit_event );
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

                if ( slen !== stack.length )
                {
                    return; // override with success()
                }

                if ( asp._queue !== null )
                {
                    exec_stack[ exec_stack.length - 1 ] = asp._onerror;
                    asp._onerror = null;
                    this._scheduleExecute();
                    return;
                }
            }
            catch ( e )
            {
                this.state.last_exception = e;
                name = e.message;
            }
            finally
            {
                this._in_execute = false;
            }
        }

        asp._cleanup(); // aid GC
    }

    // Clear queue on finish
    this._queue = [];

    this._cancelExecute();
};

/**
 * Use only on root AsyncSteps instance. Abort execution of AsyncSteps instance in progress.
 * @returns {AsyncSteps} self
 * @alias AsyncSteps#cancel
 */
AsyncStepsProto.cancel = function()
{
    this._next_args = [];

    this._cancelExecute();

    var stack = this._stack;
    var asp;

    while ( stack.length )
    {
        asp = stack.pop();

        if ( asp._limit_event )
        {
            AsyncTool.cancelCall( asp._limit_event );
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
 *
 * It must not be called more than once until cancel/complete (instance can be re-used)
 * @returns {AsyncSteps} self
 * @alias AsyncSteps#execute
 */
AsyncStepsProto.execute = function( )
{
    this._cancelExecute();

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
        var cb = curr[0];

        this._exec_stack.push( cb );

        var oc = stack.length;

        this._in_execute = true;
        cb.apply( null, next_args );

        if ( oc === stack.length )
        {
            if ( asp._queue !== null )
            {
                this._scheduleExecute();
            }
            else if ( ( asp._limit_event === null ) &&
                      ( asp._oncancel === null ) &&
                      !asp._wait_external )
            {
                // Implicit success
                this._handle_success( [] );
            }
        }
    }
    catch ( e )
    {
        this._in_execute = false;
        this.state.last_exception = e;
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

/**
 * @private
 */
AsyncStepsProto._scheduleExecute = function()
{
    this._execute_event = AsyncTool.callLater( this._execute_cb );
};

/**
 * @private
 */
AsyncStepsProto._cancelExecute = function()
{
    if ( this._execute_event )
    {
        AsyncTool.cancelCall( this._execute_event );
        this._execute_event = null;
    }
};

var ASPProto = asyncstep_protector.AsyncStepProtector.prototype;

AsyncStepsProto.loop = ASPProto.loop;
AsyncStepsProto.repeat = ASPProto.repeat;
AsyncStepsProto.forEach = ASPProto.forEach;


ASPProto._check_func = AsyncStepsProto._check_func;
ASPProto._check_onerror = AsyncStepsProto._check_onerror;
ASPProto.sync = AsyncStepsProto.sync;

/**
 * Get AsyncSteps state object.
 *
 * *Note: There is a JS-specific improvement: as.state === as.state()*
 *
 * The are the following pre-defined state variables:
 *
 * * **error_info** - error description, if provided to *as.error()*
 * * **last_exception** - the last exception caught
 * * **async_stack** - array of references to executed step handlers in current stack
 * @returns {object}
 * @alias AsyncSteps#state
 */

exports.AsyncSteps = AsyncSteps;
