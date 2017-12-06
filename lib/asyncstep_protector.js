"use strict";

/**
 * @file Protector against AsyncSteps concept violation in use
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

const ParallelStep = require( './parallel_step' );
const Errors = require( '../Errors' );

/**
 * AsyncStepProtector
 * @private
 * @constructor
 * @param {AsyncSteps} [root] main object
 */
class AsyncStepProtector {
    constructor( root ) {
        this._root = root;
        this.state = root.state;
        this._queue = null;
        this._onerror = null;
        this._oncancel = null;
        this._limit_event = null;
        this._wait_external = false;
    }

    /**
    * @private
    * @override
    */
    add( func, onerror ) {
        this._sanityCheck();
        this._check_func( func );
        this._check_onerror( onerror );

        let q = this._queue;

        if ( q === null ) {
            q = [];
            this._queue = q;
        }

        q.push( [ func, onerror ] );

        return this;
    }

    /**
    * @private
    * @override
    */
    parallel( onerror ) {
        var p = new ParallelStep( this._root, this );

        this.add(
            ( as ) => p.executeParallel( as ),
            onerror
        );

        return p;
    }


    /**
    * Successfully complete current step execution, optionally passing result variables to the next step.
    * @param {...*} [_arg] - unlimited number of result variables with no type constraint
    * @alias AsyncSteps#success
    */
    success( _arg ) {
        this._sanityCheck();

        if ( this._queue !== null ) {
            this.error( Errors.InternalError, "Invalid success() call" );
        }

        this._root._handle_success( Array.prototype.slice.call( arguments ) );
    }

    /**
    * Deprecated with FTN12 v1.5
    * If sub-steps have been added then add efficient dummy step which behavior of as.success();
    * Otherwise, simply call *as.success();*
    * @alias AsyncSteps#successStep
    * @deprecated
    */
    successStep( ) {
        this._sanityCheck();

        const q = this._queue;

        if ( q !== null ) {
            q.push( [ null, null ] );
        } else {
            this.success();
        }
    }

    /**
    * @private
    * @override
    */
    error( name, error_info ) {
        this._sanityCheck();

        this._root.error( name, error_info );
    }

    /**
    * Set timeout for external event completion with async *as.success()* or *as.error()* call.
    * If step is not finished until timeout is reached then Timeout error is raised.
    *
    * @note Can be used only within **ExecFunc** body.
    * @param {number} timeout_ms - Timeout in ms
    * @returns {AsyncSteps} self
    * @alias AsyncSteps#setTimeout
    */
    setTimeout( timeout_ms ) {
        this._sanityCheck();

        const async_tool = this._root._async_tool;

        if ( this._limit_event !== null ) {
            async_tool.cancelCall( this._limit_event );
        }

        this._limit_event = async_tool.callLater(
            ( ) => {
                this._limit_event = null;

                try {
                    this._root.error( Errors.Timeout );
                } catch ( e ) {
                    // ignore
                }
            },
            timeout_ms
        );

        return this;
    }

    /**
    * Set cancellation handler to properly handle timeouts and external cancellation.
    *
    * @note Can be used only within **ExecFunc** body.
    * @param {CancelFunc} oncancel - cleanup/cancel logic of external processing
    * @returns {AsyncSteps} self
    * @alias AsyncSteps#setCancel
    */
    setCancel( oncancel ) {
        this._oncancel = oncancel;
        return this;
    }

    /**
    * Mark currently executing step as waiting for external event.
    *
    * @note Can be used only within **ExecFunc** body.
    * @returns {AsyncSteps} self
    * @alias AsyncSteps#waitExternal
    */
    waitExternal( ) {
        this._wait_external = true;
        return this;
    }

    /**
    * @private
    * @override
    */
    copyFrom( other ) {
        this._sanityCheck();

        if ( other._queue.length ) {
            let q = this._queue;

            if ( q === null ) {
                q = [];
                this._queue = q;
            }

            q.push.apply( q, other._queue );
        }

        const os = other.state;
        const s = this.state;

        for ( let k in os ) {
            if ( s[k] === undefined ) {
                s[k] = os[k];
            }
        }

        return this;
    }

    /**
    * Break execution of current loop, throws exception
    * @param {string=} label - Optional. unwind loops, until *label* named loop is exited
    * @alias AsyncSteps#break
    */
    break( label ) {
        this._sanityCheck();
        this.state._loop_term_label = label;
        this._root.error( Errors.LoopBreak );
    }

    /**
    * Continue loop execution from the next iteration, throws exception
    * @param {string=} label - Optional. unwind loops, until *label* named loop is found
    * @alias AsyncSteps#continue
    */
    continue( label ) {
        this._sanityCheck();
        this.state._loop_term_label = label;
        this._root.error( Errors.LoopCont );
    }

    /**
    * @private
    */
    _cleanup() {
        this._root = null;
        this._queue = null;
        this._onerror = null;
        this._oncancel = null;
        this.state = null;
    }

    /**
    * @private
    */
    _sanityCheck() {
        try {
            const stack = this._root._stack;

            if ( stack[stack.length - 1] !== this ) {
                this._root.error( Errors.InternalError, "Invalid call (sanity check)" );
            }
        } catch ( _ ) {
            throw Error( Errors.InternalError, 'Unexpected call, object is out of service' );
        }
    }
}

module.exports = AsyncStepProtector;
