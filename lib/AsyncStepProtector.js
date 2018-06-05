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

const ParallelStep = require( './ParallelStep' );
const {
    InternalError,
    Timeout,
    LoopBreak,
    LoopCont,
} = require( '../Errors' );

const {
    checkFunc,
    checkOnError,
    noop,
    loop,
    repeat,
    forEach,
    LOOP_TERM_LABEL,
    as_await,
} = require( './common' );

const sanityCheck = noop ? noop : ( asp ) => {
    const root = asp._root;

    if ( root ) {
        const stack = root._stack;

        if ( stack ) {
            if ( stack[stack.length - 1] === asp ) {
                return;
            }

            root.error( InternalError, "Invalid call (sanity check)" );
        }
    }

    throw new Error( `InternalError: Unexpected call, object is out of service` );
};
const sanityCheckAdd = noop ? noop : ( asp, func, onerror ) => {
    sanityCheck( asp );
    checkFunc( asp, func );
    checkOnError( asp, onerror );
};

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
        this._on_error = null;
        this._on_cancel = null;
        this._limit_event = null;
        this._wait_external = false;
    }

    /**
     * @private
     * @override
     */
    add( func, onerror ) {
        sanityCheckAdd( this, func, onerror );

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
        sanityCheck( this );

        if ( this._queue !== null ) {
            this.error( InternalError, "Invalid success() call" );
        }

        this._root._handle_success( Array.prototype.slice.call( arguments ) );
    }

    /**
     * @private
     * @override
     */
    error( name, error_info ) {
        sanityCheck( this );

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
        sanityCheck( this );

        const async_tool = this._root._async_tool;

        if ( this._limit_event !== null ) {
            async_tool.cancelCall( this._limit_event );
        }

        this._limit_event = async_tool.callLater(
            ( ) => {
                this._limit_event = null;

                try {
                    this._root.error( Timeout );
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
        this._on_cancel = oncancel;
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
        sanityCheck( this );

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
     * @private
     * @override
     */
    loop( func, label ) {
        sanityCheckAdd( this, func );

        loop( this, this._root, func, label );

        return this;
    }

    /**
     * @private
     * @override
     */
    repeat( count, func, label ) {
        checkFunc( this, func );

        repeat( this, this._root, count, func, label );

        return this;
    }

    /**
     * @private
     * @override
     */
    forEach( map_or_list, func, label ) {
        checkFunc( this, func );

        forEach( this, this._root, map_or_list, func, label );

        return this;
    }

    /**
     * Break execution of current loop, throws exception
     * @param {string=} label - Optional. unwind loops, until *label* named loop is exited
     * @alias AsyncSteps#break
     */
    break( label ) {
        sanityCheck( this );
        this.state[LOOP_TERM_LABEL] = label;
        this._root.error( LoopBreak );
    }

    /**
     * Continue loop execution from the next iteration, throws exception
     * @param {string=} label - Optional. unwind loops, until *label* named loop is found
     * @alias AsyncSteps#continue
     */
    continue( label ) {
        sanityCheck( this );
        this.state[LOOP_TERM_LABEL] = label;
        this._root.error( LoopCont );
    }

    /**
     * @private
     * @override
     */
    successStep( ...args ) {
        this.add( ( as ) => as.success( ...args ) );
    }

    /**
     * @private
     * @override
     */
    await( promise, onerror ) {
        as_await( this, this._root, promise, onerror );

        return this;
    }

    /**
     * @private
     * @override
     */
    sync( object, func, onerror ) {
        sanityCheckAdd( this, func, onerror );

        object.sync( this, func, onerror );

        return this;
    }

    /**
     * @private
     * @override
     */
    isAsyncSteps() {
        return true;
    }

    /**
     * @private
     */
    _cleanup() {
        this._root = null;
        this._queue = null;
        this._on_error = null;
        this._on_cancel = null;
        this.state = null;
    }
}

module.exports = AsyncStepProtector;
