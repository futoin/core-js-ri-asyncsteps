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

    STACK,
    STATE,
    QUEUE,
    ROOT,
    ASYNC_TOOL,
    LIMIT_EVENT,
    ON_CANCEL,
    ON_ERROR,
    WAIT_EXTERNAL,
    CLEANUP,
    HANDLE_SUCCESS,
    LOOP_TERM_LABEL,
} = require( './common' );

const sanityCheck = noop ? noop : ( asp ) => {
    const root = asp[ROOT];

    if ( root ) {
        const stack = root[STACK];

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
        this[ROOT] = root;
        this[STATE] = this.state = root[STATE];
        this[QUEUE] = null;
        this[ON_ERROR] = null;
        this[ON_CANCEL] = null;
        this[LIMIT_EVENT] = null;
        this[WAIT_EXTERNAL] = false;
    }

    /**
     * @private
     * @override
     */
    add( func, onerror ) {
        sanityCheckAdd( this, func, onerror );

        let q = this[QUEUE];

        if ( q === null ) {
            q = [];
            this[QUEUE] = q;
        }

        q.push( [ func, onerror ] );

        return this;
    }

    /**
     * @private
     * @override
     */
    parallel( onerror ) {
        var p = new ParallelStep( this[ROOT], this );

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

        if ( this[QUEUE] !== null ) {
            this.error( InternalError, "Invalid success() call" );
        }

        this[ROOT][HANDLE_SUCCESS]( Array.prototype.slice.call( arguments ) );
    }

    /**
     * @private
     * @override
     */
    error( name, error_info ) {
        sanityCheck( this );

        this[ROOT].error( name, error_info );
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

        const async_tool = this[ROOT][ASYNC_TOOL];

        if ( this[LIMIT_EVENT] !== null ) {
            async_tool.cancelCall( this[LIMIT_EVENT] );
        }

        this[LIMIT_EVENT] = async_tool.callLater(
            ( ) => {
                this[LIMIT_EVENT] = null;

                try {
                    this[ROOT].error( Timeout );
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
        this[ON_CANCEL] = oncancel;
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
        this[WAIT_EXTERNAL] = true;
        return this;
    }

    /**
     * @private
     * @override
     */
    copyFrom( other ) {
        sanityCheck( this );

        if ( other[QUEUE].length ) {
            let q = this[QUEUE];

            if ( q === null ) {
                q = [];
                this[QUEUE] = q;
            }

            q.push.apply( q, other[QUEUE] );
        }

        const os = other[STATE];
        const s = this[STATE];

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

        loop( this, this[ROOT], func, label );

        return this;
    }

    /**
     * Break execution of current loop, throws exception
     * @param {string=} label - Optional. unwind loops, until *label* named loop is exited
     * @alias AsyncSteps#break
     */
    break( label ) {
        sanityCheck( this );
        this[STATE][LOOP_TERM_LABEL] = label;
        this[ROOT].error( LoopBreak );
    }

    /**
     * Continue loop execution from the next iteration, throws exception
     * @param {string=} label - Optional. unwind loops, until *label* named loop is found
     * @alias AsyncSteps#continue
     */
    continue( label ) {
        sanityCheck( this );
        this[STATE][LOOP_TERM_LABEL] = label;
        this[ROOT].error( LoopCont );
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
     */
    [CLEANUP]() {
        this[ROOT] = null;
        this[QUEUE] = null;
        this[ON_ERROR] = null;
        this[ON_CANCEL] = null;
        this[STATE] = null;
    }
}

module.exports = AsyncStepProtector;
