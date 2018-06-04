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
const Errors = require( './Errors' );

const AsyncStepProtector = require( './lib/AsyncStepProtector' );
const ParallelStep = require( './lib/ParallelStep' );


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
        this._in_execute = false;
        this._execute_event = null;
        this._next_args = [];


        this._execute_cb = () => {
            this.execute();
        };
    }

    /**
     * @private
     * @param {function} [func] Step function to check
     */
    _check_func( func ) {
        if ( func.length < 1 ) {
            this.error( Errors.InternalError, "Step function must expect at least AsyncStep interface" );
        }
    }

    /**
     * @private
     * @param {function} [onerror] error handler to check
     */
    _check_onerror( onerror ) {
        if ( onerror &&
            ( onerror.length !== 2 ) ) {
            this.error( Errors.InternalError, "Error handler must take exactly two arguments" );
        }
    }

    /**
     * Add sub-step. Can be called multiple times.
     * @param {ExecFunc} func - function defining non-blocking step execution
     * @param {ErrorFunc=} onerror - Optional, provide error handler
     * @returns {AsyncSteps} self
     * @alias AsyncSteps#add
     */
    add( func, onerror ) {
        this._sanityCheck();
        this._check_func( func );
        this._check_onerror( onerror );

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
        this._sanityCheck();
        this._check_func( func );
        this._check_onerror( onerror );

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

        if ( !this._in_execute ) {
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
    _handle_success( args ) {
        const stack = this._stack;
        const exec_stack = this._exec_stack;
        const async_tool = this._async_tool;

        if ( !stack.length ) {
            this.error( Errors.InternalError, 'Invalid success completion' );
        }

        this._next_args = args;

        for ( let asp = stack[ stack.length - 1 ];; ) {
            if ( asp._limit_event ) {
                async_tool.cancelCall( asp._limit_event );
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
        this._next_args = [];

        const stack = this._stack;
        const exec_stack = this._exec_stack;
        const async_tool = this._async_tool;

        this.state.async_stack = exec_stack.slice( 0 );

        for ( ; stack.length; stack.pop(), exec_stack.pop() ) {
            const asp = stack[ stack.length - 1 ];

            if ( asp._limit_event ) {
                async_tool.cancelCall( asp._limit_event );
                asp._limit_event = null;
            }

            if ( asp._oncancel ) {
                asp._oncancel.call( null, asp );
                asp._oncancel = null;
            }

            if ( asp._onerror ) {
                const slen = stack.length;
                asp._queue = null; // suppress non-empty queue for success() in onerror

                try {
                    this._in_execute = true;
                    asp._onerror.call( null, asp, name );

                    if ( slen !== stack.length ) {
                        return; // override with success()
                    }

                    if ( asp._queue !== null ) {
                        exec_stack[ exec_stack.length - 1 ] = asp._onerror;
                        asp._onerror = null;
                        this._scheduleExecute();
                        return;
                    }
                } catch ( e ) {
                    this.state.last_exception = e;
                    name = e.message;
                } finally {
                    this._in_execute = false;
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
        this._next_args = [];

        this._cancelExecute();

        const stack = this._stack;
        const async_tool = this._async_tool;

        while ( stack.length ) {
            const asp = stack.pop();

            if ( asp._limit_event ) {
                async_tool.cancelCall( asp._limit_event );
                asp._limit_event = null;
            }

            if ( asp._oncancel ) {
                asp._oncancel.call( null, asp );
                asp._oncancel = null;
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

        if ( curr[0] === null ) {
            this._handle_success( [] );
            return;
        }

        const asp = new AsyncStepProtector( this );

        const next_args = this._next_args;

        this._next_args = [];
        next_args.unshift( asp );

        try {
            asp._onerror = curr[1];
            stack.push( asp );
            const cb = curr[0];

            this._exec_stack.push( cb );

            const oc = stack.length;

            this._in_execute = true;
            cb.apply( null, next_args );

            if ( oc === stack.length ) {
                if ( asp._queue !== null ) {
                    this._scheduleExecute();
                } else if ( ( asp._limit_event === null ) &&
                        ( asp._oncancel === null ) &&
                        !asp._wait_external ) {
                    // Implicit success
                    this._handle_success( [] );
                }
            }
        } catch ( e ) {
            this._in_execute = false;
            this.state.last_exception = e;
            this._handle_error( e.message );
        } finally {
            this._in_execute = false;
        }

        return this;
    }

    /**
     * @private
     */
    _sanityCheck() {
        if ( this._stack.length ) {
            this.error( Errors.InternalError, "Top level add in execution" );
        }
    }

    /**
     * @private
     */
    _scheduleExecute() {
        this._execute_event = this._async_tool.callLater( this._execute_cb );
    }

    /**
     * @private
     */
    _cancelExecute() {
        if ( this._execute_event ) {
            this._async_tool.cancelCall( this._execute_event );
            this._execute_event = null;
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
        this._sanityCheck();

        const async_tool = this._async_tool || this._root._async_tool;

        this.add( ( outer_as ) => {
            const model_as = new AsyncSteps();
            let inner_as;

            const create_iteration = () => {
                inner_as = new AsyncSteps( outer_as.state );
                inner_as.copyFrom( model_as );
                inner_as.execute();
            };

            model_as.add(
                ( as ) => {
                    func( as );
                },
                ( as, err ) => {
                    if ( err === Errors.LoopCont ) {
                        const term_label = as.state._loop_term_label;

                        if ( term_label &&
                            ( term_label !== label ) ) {
                            // Unroll loops continue
                            async_tool.callLater( () => {
                                try {
                                    outer_as.continue( term_label );
                                } catch ( _ ) {
                                    // ignore
                                }
                            } );
                        } else {
                            // Continue to next iteration
                            as.success();
                            return; // DO not destroy model_as
                        }
                    } else if ( err === Errors.LoopBreak ) {
                        const term_label = as.state._loop_term_label;

                        if ( term_label &&
                            ( term_label !== label ) ) {
                            // Unroll loops and break
                            async_tool.callLater( () => {
                                try {
                                    outer_as.break( term_label );
                                } catch ( _ ) {
                                    // ignore
                                }
                            } );
                        } else {
                            // Continue linear execution
                            async_tool.callLater( () => {
                                try {
                                    outer_as.success();
                                } catch ( _ ) {
                                    // can fail sanity check on race condition after cancel()
                                }
                            } );
                        }
                    } else {
                        // Forward regular error
                        async_tool.callLater( () => {
                            try {
                                outer_as.error( err, outer_as.state.error_info );
                            } catch ( _ ) {
                                // ignore
                            }
                        } );
                    }

                    // Destroy recursive reference
                    model_as.cancel();
                }
            ).add(
                ( as ) => {
                    // schedule new iteration
                    // NOTE: recursive model_as -> potential mem leak -> destroy model_as on exit
                    async_tool.callLater( create_iteration );
                }
            );

            outer_as.setCancel( ( as ) => {
                inner_as.cancel();
                model_as.cancel();
            } );

            create_iteration();
        } );

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
            const state = as.state;

            if ( state ) {
                const default_error = 'PromiseReject';

                if ( reason instanceof Error ) {
                    state.last_exception = reason;
                    state.error_info = undefined;
                    ( this._root || this )._handle_error( default_error );
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
        _check_func : ASProto._check_func,
        _check_onerror : ASProto._check_onerror,
        loop : ASProto.loop,
        repeat : ASProto.repeat,
        forEach : ASProto.forEach,
        sync : ASProto.sync,
        successStep : ASProto.successStep,
        await : ASProto.await,
        isAsyncSteps: ASProto.isAsyncSteps,
    }
);
ParallelStep.prototype.isAsyncSteps = ASProto.isAsyncSteps;

ASProto._async_tool = AsyncTool;

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
