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

    ASYNC_TOOL,
    CANCEL_EXECUTE,
    CLEANUP,
    EXECUTE_CB,
    EXECUTE_EVENT,
    EXEC_STACK,
    HANDLE_ERROR,
    HANDLE_SUCCESS,
    IN_EXECUTE,
    LIMIT_EVENT,
    NEXT_ARGS,
    ON_CANCEL,
    ON_ERROR,
    QUEUE,
    ROOT,
    SCHEDULE_EXECUTE,
    STACK,
    STATE,
    WAIT_EXTERNAL,
} = require( './lib/common' );

const sanityCheck = noop ? noop : ( as ) => {
    if ( as[STACK].length > 0 ) {
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
                return this[STATE];
            };
        }

        this[STATE] = this.state = state;
        this[QUEUE] = [];
        this[STACK] = [];
        this[EXEC_STACK] = [];
        this[IN_EXECUTE] = false;
        this[EXECUTE_EVENT] = null;
        this[NEXT_ARGS] = [];

        this[EXECUTE_CB] = () => this.execute();
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

        this[QUEUE].push( [ func, onerror ] );

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
        this[STATE].error_info = error_info;

        if ( !this[IN_EXECUTE] ) {
            this[HANDLE_ERROR]( name );
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
        this[QUEUE].push.apply( this[QUEUE], other[QUEUE] );

        const os = other[STATE];
        const s = this[STATE];

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
    [HANDLE_SUCCESS]( args ) {
        const stack = this[STACK];
        const exec_stack = this[EXEC_STACK];
        const async_tool = this[ASYNC_TOOL];

        if ( !stack.length ) {
            this.error( InternalError, 'Invalid success completion' );
        }

        this[NEXT_ARGS] = args;

        for ( let asp = stack[ stack.length - 1 ];; ) {
            const limit_event = asp[LIMIT_EVENT];

            if ( limit_event ) {
                async_tool.cancelCall( limit_event );
                asp[LIMIT_EVENT] = null;
            }

            asp[CLEANUP](); // aid GC
            stack.pop();
            exec_stack.pop();

            // ---
            if ( !stack.length ) {
                break;
            }

            asp = stack[ stack.length - 1 ];

            if ( asp[QUEUE].length ) {
                break;
            }
        }

        if ( stack.length ||
            this[QUEUE].length ) {
            this[SCHEDULE_EXECUTE]();
        }
    }

    /**
     * @private
     * @param {string} [name] Error to handle
     */
    [HANDLE_ERROR]( name ) {
        this[NEXT_ARGS] = [];

        const stack = this[STACK];
        const exec_stack = this[EXEC_STACK];
        const async_tool = this[ASYNC_TOOL];

        this[STATE].async_stack = exec_stack.slice( 0 );

        for ( ; stack.length; stack.pop(), exec_stack.pop() ) {
            const asp = stack[ stack.length - 1 ];
            const limit_event = asp[LIMIT_EVENT];
            const on_cancel = asp[ON_CANCEL];
            const on_error = asp[ON_ERROR];

            if ( limit_event ) {
                async_tool.cancelCall( limit_event );
                asp[LIMIT_EVENT] = null;
            }

            if ( on_cancel ) {
                on_cancel.call( null, asp );
                asp[ON_CANCEL] = null;
            }

            if ( on_error ) {
                const slen = stack.length;
                asp[QUEUE] = null; // suppress non-empty queue for success() in onerror

                try {
                    this[IN_EXECUTE] = true;
                    on_error.call( null, asp, name );

                    if ( slen !== stack.length ) {
                        return; // override with success()
                    }

                    if ( asp[QUEUE] !== null ) {
                        exec_stack[ exec_stack.length - 1 ] = on_error;
                        asp[ON_ERROR] = null;
                        this[SCHEDULE_EXECUTE]();
                        return;
                    }
                } catch ( e ) {
                    this[STATE].last_exception = e;
                    name = e.message;
                } finally {
                    this[IN_EXECUTE] = false;
                }
            }

            asp[CLEANUP](); // aid GC
        }

        // Clear queue on finish
        this[QUEUE] = [];

        this[CANCEL_EXECUTE]();
    }

    /**
     * Use only on root AsyncSteps instance. Abort execution of AsyncSteps instance in progress.
     * @returns {AsyncSteps} self
     * @alias AsyncSteps#cancel
     */
    cancel() {
        this[NEXT_ARGS] = [];

        this[CANCEL_EXECUTE]();

        const stack = this[STACK];
        const async_tool = this[ASYNC_TOOL];

        while ( stack.length ) {
            const asp = stack.pop();
            const limit_event = asp[LIMIT_EVENT];
            const on_cancel = asp[ON_CANCEL];

            if ( limit_event ) {
                async_tool.cancelCall( limit_event );
                asp[LIMIT_EVENT] = null;
            }

            if ( on_cancel ) {
                on_cancel.call( null, asp );
                asp[ON_CANCEL] = null;
            }

            asp[CLEANUP](); // aid GC
        }

        // Clear queue on finish
        this[QUEUE] = [];

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
        this[CANCEL_EXECUTE]();

        const stack = this[STACK];
        let q;

        if ( stack.length ) {
            q = stack[ stack.length - 1 ][QUEUE];
        } else {
            q = this[QUEUE];
        }

        if ( !q.length ) {
            return;
        }

        const curr = q.shift();

        if ( curr[0] === null ) {
            this[HANDLE_SUCCESS]( [] );
            return;
        }

        const asp = new AsyncStepProtector( this );

        const next_args = this[NEXT_ARGS];

        this[NEXT_ARGS] = [];
        next_args.unshift( asp );

        try {
            asp[ON_ERROR] = curr[1];
            stack.push( asp );
            const cb = curr[0];

            this[EXEC_STACK].push( cb );

            const oc = stack.length;

            this[IN_EXECUTE] = true;
            cb.apply( null, next_args );

            if ( oc === stack.length ) {
                if ( asp[QUEUE] !== null ) {
                    this[SCHEDULE_EXECUTE]();
                } else if ( ( asp[LIMIT_EVENT] === null ) &&
                        ( asp[ON_CANCEL] === null ) &&
                        !asp[WAIT_EXTERNAL] ) {
                    // Implicit success
                    this[HANDLE_SUCCESS]( [] );
                }
            }
        } catch ( e ) {
            this[IN_EXECUTE] = false;
            this[STATE].last_exception = e;
            this[HANDLE_ERROR]( e.message );
        } finally {
            this[IN_EXECUTE] = false;
        }

        return this;
    }

    /**
     * @private
     */
    [SCHEDULE_EXECUTE]() {
        this[EXECUTE_EVENT] = this[ASYNC_TOOL].callLater( this[EXECUTE_CB] );
    }

    /**
     * @private
     */
    [CANCEL_EXECUTE]() {
        if ( this[EXECUTE_EVENT] ) {
            this[ASYNC_TOOL].cancelCall( this[EXECUTE_EVENT] );
            this[EXECUTE_EVENT] = null;
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
        let i = 0;

        this.loop(
            ( as ) => {
                if ( i < count ) {
                    func( as, i++ );
                } else {
                    as.break();
                }
            },
            label
        );

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
        if ( Array.isArray( map_or_list ) ) {
            this.repeat(
                map_or_list.length,
                ( as, i ) => {
                    func( as, i, map_or_list[i] );
                },
                label
            );
        } else if ( typeof Map !== 'undefined' && map_or_list instanceof Map ) {
            const iter = map_or_list.entries();

            this.loop(
                ( as ) => {
                    const next = iter.next();

                    if ( next.done ) {
                        as.break();
                    }

                    const [ key, value ] = next.value;
                    func( as, key, value );
                },
                label
            );
        } else {
            const keys = Object.keys( map_or_list );

            this.repeat(
                keys.length,
                ( as, i ) => {
                    func( as, keys[i], map_or_list[ keys[i] ] );
                },
                label
            );
        }

        return this;
    }

    /**
     * Shortcut for `this.add( ( as ) => as.success( ...args ) )`
     * @param {any} [args...] - argument to pass, if any
     * @alias AsyncSteps#successStep
     */
    successStep( ...args ) {
        this.add( ( as ) => as.success( ...args ) );
    }

    /**
     * Integrate a promise as a step.
     * @param {Promise} promise - promise to add as a step
     * @param {function} [onerror] error handler to check
     * @alias AsyncSteps#await
     * @returns {AsyncSteps} self
     */
    await( promise, onerror ) {
        const promise_state = {
            step_as : null,
            complete : false,
        };

        const convert_error = ( as, reason ) => {
            const state = as[STATE];

            if ( state ) {
                const default_error = 'PromiseReject';

                if ( reason instanceof Error ) {
                    state.last_exception = reason;
                    state.error_info = undefined;
                    ( this[ROOT] || this )[HANDLE_ERROR]( default_error );
                } else {
                    try {
                        this.error( reason || default_error );
                    } catch ( _ ) {
                        // ignore
                    }
                }
            }
        };

        // Attach handlers on the same tick
        promise.then(
            ( result ) => {
                const step_as = promise_state.step_as;

                if ( step_as ) {
                    step_as.success( result );
                } else {
                    promise_state.complete = ( step_as ) => {
                        step_as.success( result );
                    };
                }
            },
            ( reason ) => {
                const step_as = promise_state.step_as;

                if ( step_as ) {
                    convert_error( step_as, reason );
                } else {
                    // prevent cancel logic
                    promise_state.step_as = null;

                    promise_state.complete = ( step_as ) => {
                        convert_error( step_as, reason );
                    };
                }
            }
        );

        this.add(
            ( as ) => {
                const { complete } = promise_state;

                if ( complete ) {
                    complete( as );
                } else {
                    promise_state.step_as = as;

                    as.setCancel( () => {
                        if ( promise_state.step_as ) {
                            promise_state.step_as = null;

                            try {
                                // BlueBird cancellation
                                promise.cancel();
                            } catch ( _ ) {
                                // ignore
                            }
                        }
                    } );
                }
            },
            onerror
        );

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

const ASProto = AsyncSteps.prototype;

Object.assign(
    AsyncStepProtector.prototype,
    {
        repeat : ASProto.repeat,
        forEach : ASProto.forEach,
        successStep : ASProto.successStep,
        await : ASProto.await,
        isAsyncSteps: ASProto.isAsyncSteps,
    }
);
ParallelStep.prototype.isAsyncSteps = ASProto.isAsyncSteps;

ASProto[ASYNC_TOOL] = AsyncTool;

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
