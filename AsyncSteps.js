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

const AsyncTool = require( './lib/AsyncTool' );
const { InternalError } = require( './Errors' );

const AsyncStepProtector = require( './lib/AsyncStepProtector' );
const ParallelStep = require( './lib/ParallelStep' );

const {
    checkFunc,
    checkOnError,
    noop,
    loop,
    repeat,
    forEach,
    as_await,
    EMPTY_ARRAY,
} = require( './lib/common' );

const sanityCheck = noop ? noop : ( as ) => {
    if ( as._stack.length > 0 ) {
        as.error( InternalError, "Top level add in execution" );
    }
};
const sanityCheckAdd = noop ? noop : ( as, func, onerror ) => {
    sanityCheck( as );
    checkFunc( as, func );
    checkOnError( as, onerror );
};

/**
 * Root AsyncStep implementation
 */
class AsyncSteps {
    constructor( state = null ) {
        if ( state === null ) {
            state = function() {
                return this.state;
            };
        }

        this.state = state;
        this._queue = [];
        this._stack = [];
        this._exec_stack = [];
        this._in_exec = false;
        this._exec_event = null;
        this._next_args = EMPTY_ARRAY;

        this._execute_cb = () => this.execute();
    }


    /**
     * Add sub-step. Can be called multiple times.
     * @param {ExecFunc} func - function defining non-blocking step execution
     * @param {ErrorFunc=} onerror - Optional, provide error handler
     * @returns {AsyncSteps} self
     * @alias AsyncSteps#add
     */
    add( func, onerror ) {
        sanityCheckAdd( this, func, onerror );

        this._queue.push( [ func, onerror ] );

        return this;
    }

    /**
     * Creates a step internally and returns specialized AsyncSteps interfaces all steps
     * of which are executed in quasi-parallel.
     * @param {ErrorFunc=} onerror - Optional, provide error handler
     * @returns {AsyncSteps} interface for parallel step adding
     * @alias AsyncSteps#parallel
     */
    parallel( onerror ) {
        const p = new ParallelStep( this, this );

        this.add(
            ( as ) => p.executeParallel( as ),
            onerror
        );

        return p;
    }

    /**
     * Add sub-step with synchronization against supplied object.
     * @param {ISync} object - Mutex, Throttle or other type of synchronization implementation.
     * @param {ExecFunc} func - function defining non-blocking step execution
     * @param {ErrorFunc=} onerror - Optional, provide error handler
     * @returns {AsyncSteps} self
     * @alias AsyncSteps#sync
     */
    sync( object, func, onerror ) {
        sanityCheckAdd( this, func, onerror );

        object.sync( this, func, onerror );

        return this;
    }

    /**
     * Set error and throw to abort execution.
     *
     * *NOTE: If called outside of AsyncSteps stack (e.g. by external event), make sure you catch the exception*
     * @param {string} name - error message, expected to be identifier "InternalError"
     * @param {string=} error_info - optional descriptive message assigned to as.state.error_info
     * @throws {Error}
     * @alias AsyncSteps#error
     */
    error( name, error_info ) {
        this.state.error_info = error_info;

        if ( !this._in_exec ) {
            this._handle_error( name );
        }

        throw new Error( name );
    }

    /**
     * Copy steps and not yet defined state variables from "model" AsyncSteps instance
     * @param {AsyncSteps} other - model instance, which must get be executed
     * @returns {AsyncSteps} self
     * @alias AsyncSteps#copyFrom
     */
    copyFrom( other ) {
        this._queue.push.apply( this._queue, other._queue );

        const os = other.state;
        const s = this.state;

        for ( let k in os ) {
            if ( !( k in s ) ) {
                s[k] = os[k];
            }
        }

        return this;
    }

    /**
     * @private
     * @param {array} [args] List of success() args
     */
    _handle_success( args = EMPTY_ARRAY ) {
        const stack = this._stack;
        const exec_stack = this._exec_stack;
        const async_tool = this._async_tool;

        if ( !stack.length ) {
            this.error( InternalError, 'Invalid success completion' );
        }

        this._next_args = args;

        for ( let asp = stack[ stack.length - 1 ];; ) {
            const limit_event = asp._limit_event;

            if ( limit_event ) {
                async_tool.cancelCall( limit_event );
                asp._limit_event = null;
            }

            asp._cleanup(); // aid GC
            stack.pop();
            exec_stack.pop();

            // ---
            if ( !stack.length ) {
                break;
            }

            asp = stack[ stack.length - 1 ];

            if ( asp._queue.length ) {
                break;
            }
        }

        if ( stack.length ||
            this._queue.length ) {
            this._scheduleExecute();
        }
    }

    /**
     * @private
     * @param {string} [name] Error to handle
     */
    _handle_error( name ) {
        this._next_args = EMPTY_ARRAY;

        const stack = this._stack;
        const exec_stack = this._exec_stack;
        const async_tool = this._async_tool;

        this.state.async_stack = exec_stack.slice( 0 );

        for ( ; stack.length; stack.pop(), exec_stack.pop() ) {
            const asp = stack[ stack.length - 1 ];
            const limit_event = asp._limit_event;
            const on_cancel = asp._on_cancel;
            const on_error = asp._on_error;

            if ( limit_event ) {
                async_tool.cancelCall( limit_event );
                asp._limit_event = null;
            }

            if ( on_cancel ) {
                on_cancel.call( null, asp );
                asp._on_cancel = null;
            }

            if ( on_error ) {
                const slen = stack.length;
                asp._queue = null; // suppress non-empty queue for success() in onerror

                try {
                    this._in_exec = true;
                    on_error.call( null, asp, name );

                    if ( slen !== stack.length ) {
                        return; // override with success()
                    }

                    if ( asp._queue !== null ) {
                        exec_stack[ exec_stack.length - 1 ] = on_error;
                        asp._on_error = null;
                        this._scheduleExecute();
                        return;
                    }
                } catch ( e ) {
                    this.state.last_exception = e;
                    name = e.message;
                } finally {
                    this._in_exec = false;
                }
            }

            asp._cleanup(); // aid GC
        }

        // Clear queue on finish
        this._queue = [];

        this._cancelExecute();
    }

    /**
     * Use only on root AsyncSteps instance. Abort execution of AsyncSteps instance in progress.
     * @returns {AsyncSteps} self
     * @alias AsyncSteps#cancel
     */
    cancel() {
        this._next_args = EMPTY_ARRAY;

        this._cancelExecute();

        const stack = this._stack;
        const async_tool = this._async_tool;

        while ( stack.length ) {
            const asp = stack.pop();
            const limit_event = asp._limit_event;
            const on_cancel = asp._on_cancel;

            if ( limit_event ) {
                async_tool.cancelCall( limit_event );
                asp._limit_event = null;
            }

            if ( on_cancel ) {
                on_cancel.call( null, asp );
                asp._on_cancel = null;
            }

            asp._cleanup(); // aid GC
        }

        // Clear queue on finish
        this._queue = [];

        return this;
    }

    /**
     * Start execution of AsyncSteps using AsyncTool
     *
     * It must not be called more than once until cancel/complete (instance can be re-used)
     * @returns {AsyncSteps} self
     * @alias AsyncSteps#execute
     */
    execute() {
        this._cancelExecute();

        const stack = this._stack;
        let q;

        if ( stack.length ) {
            q = stack[ stack.length - 1 ]._queue;
        } else {
            q = this._queue;
        }

        if ( !q.length ) {
            return;
        }

        const curr = q.shift();
        const func = curr[0];

        if ( !func ) {
            this._handle_success();
            return;
        }

        const asp = new AsyncStepProtector( this );

        const call_args = [ asp ];
        const next_args = this._next_args;
        const na_len = next_args.length;

        if ( na_len > 0 ) {
            //Array.prototype.push.apply( call_args, next_args );
            for ( let i = 0; i < na_len; ++i ) {
                call_args.push( next_args[i] );
            }

            this._next_args = EMPTY_ARRAY;
        }

        try {
            asp._on_error = curr[1];
            stack.push( asp );

            this._exec_stack.push( func );

            const oc = stack.length;

            this._in_exec = true;
            func( ...call_args );

            if ( oc === stack.length ) {
                if ( asp._queue !== null ) {
                    this._scheduleExecute();
                } else if ( ( asp._limit_event === null ) &&
                        ( asp._on_cancel === null ) &&
                        !asp._wait_external ) {
                    // Implicit success
                    this._handle_success( this._next_args );
                }
            }
        } catch ( e ) {
            this._in_exec = false;
            this.state.last_exception = e;
            this._handle_error( e.message );
        } finally {
            this._in_exec = false;
        }

        return this;
    }

    /**
     * @private
     */
    _scheduleExecute() {
        this._exec_event = this._async_tool.callLater( this._execute_cb );
    }

    /**
     * @private
     */
    _cancelExecute() {
        if ( this._exec_event ) {
            this._async_tool.cancelCall( this._exec_event );
            this._exec_event = null;
        }
    }


    /**
     * It is just a subset of *ExecFunc*
     * @callback LoopFunc
     * @param {AsyncSteps} as - the only valid reference to AsyncSteps with required level of protection
     * @alias loop_callback
     * @see ExecFunc
     */

    /**
     * Execute loop until *as.break()* or *as.error()* is called
     * @param {LoopFunc} func - loop body
     * @param {string=} label - optional label to use for *as.break()* and *as.continue()* in inner loops
     * @returns {AsyncSteps} self
     * @alias AsyncSteps#loop
     */
    loop( func, label ) {
        sanityCheckAdd( this, func );

        loop( this, this, func, label );

        return this;
    }

    /**
     * It is just a subset of *ExecFunc*
     * @callback RepeatFunc
     * @param {AsyncSteps} as - the only valid reference to AsyncSteps with required level of protection
     * @param {integer} i - current iteration starting from 0
     * @alias repeat_callback
     * @see ExecFunc
     */

    /**
     * Call *func(as, i)* for *count* times
     * @param {integer} count - how many times to call the *func*
     * @param {RepeatFunc} func - loop body
     * @param {string=} label - optional label to use for *as.break()* and *as.continue()* in inner loops
     * @returns {AsyncSteps} self
     * @alias AsyncSteps#repeat
     */
    repeat( count, func, label ) {
        checkFunc( this, func );

        repeat( this, this, count, func, label );

        return this;
    }

    /**
     * It is just a subset of *ExecFunc*
     * @callback ForEachFunc
     * @param {AsyncSteps} as - the only valid reference to AsyncSteps with required level of protection
     * @param {integer|string} key - key ID or name
     * @param {*} value - value associated with key
     * @alias foreach_callback
     * @see ExecFunc
     */

    /**
     * For each *map* or *list* element call *func( as, key, value )*
     * @param {integer} map_or_list - map or list to iterate over
     * @param {ForEachFunc} func - loop body
     * @param {string=} label - optional label to use for *as.break()* and *as.continue()* in inner loops
     * @returns {AsyncSteps} self
     * @alias AsyncSteps#forEach
     */
    forEach( map_or_list, func, label ) {
        checkFunc( this, func );

        forEach( this, this, map_or_list, func, label );

        return this;
    }

    /**
     * Shortcut for `this.add( ( as ) => as.success( ...args ) )`
     * @param {any} [args...] - argument to pass, if any
     * @alias AsyncSteps#successStep
     * @returns {AsyncSteps} self
     */
    successStep( ...args ) {
        const queue = this._queue;

        if ( queue.length > 0 ) {
            queue.push( [
                ( as ) => as._root._handle_success( args ),
                undefined,
            ] );
        } else {
            this._next_args = args;
        }

        return this;
    }

    /**
     * Integrate a promise as a step.
     * @param {Promise} promise - promise to add as a step
     * @param {function} [onerror] error handler to check
     * @alias AsyncSteps#await
     * @returns {AsyncSteps} self
     */
    await( promise, onerror ) {
        as_await( this, this, promise, onerror );

        return this;
    }

    /**
     * Not standard API for assertion with multiple instances of the module.
     * @private
     * @returns {boolean} true
     */
    isAsyncSteps() {
        return true;
    }
}

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

AsyncSteps.prototype._async_tool = AsyncTool;

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

module.exports = AsyncSteps;
