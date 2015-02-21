"use strict";

/**
 * @file Protector against AsyncSteps concept violation in use
 * @author Andrey Galkin <andrey@futoin.eu>
 */

var async_steps = require( './asyncsteps' );
var parallel_step = require( './parallel_step' );
var futoin_errors = require( './futoin_errors' );

exports = module.exports = function( root, as )
{
    return new  module.exports.AsyncStepProtector( root, as );
};

/**
 * AsyncStepProtector
 * @private
 */
var AsyncStepProtector = function( root )
{
    this._root = root;
    this.state = root.state;
};

/**
 * AsyncStepProtector prototype
 * @private
 */
var ASPProto = {};
AsyncStepProtector.prototype = ASPProto;
ASPProto._root = null;
ASPProto._queue = null;
ASPProto._onerror = null;
ASPProto._oncancel = null;
ASPProto._limit_event = null;

/**
 * @private
 */
ASPProto.add = function( func, onerror )
{
    this._sanityCheck();
    this._root._check_func( func );
    this._root._check_onerror( onerror );

    var q = this._queue;

    if ( q === null )
    {
        q = [];
        this._queue = q;
    }

    q.push( [ func, onerror ] );

    return this;
};

/**
 * @private
 */
ASPProto.parallel = function( onerror )
{
    var p = parallel_step( this._root, this );

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
 * Successfully complete current step execution, optionally passing result variables to the next step.
 * @param {...*} [arg] - unlimited number of result variables with no type constraint
 * @alias AsyncSteps#success
 */
ASPProto.success = function( arg ) // jshint ignore:line
{
    this._sanityCheck();

    if ( this._queue !== null )
    {
        this.error( futoin_errors.InternalError, "Invalid success() call" );
    }

    this._root._handle_success( Array.prototype.slice.call( arguments ) );
};

/**
 * Deprecated with FTN12 v1.5
 * If sub-steps have been added then add efficient dummy step which behavior of as.success();
 * Otherwise, simply call *as.success();*
 * @alias AsyncSteps#successStep
 * @deprecated
 */
ASPProto.successStep = function( )
{
    this._sanityCheck();

    var q = this._queue;

    if ( q !== null )
    {
        q.push( [ null, null ] );
    }
    else
    {
        this.success();
    }
};

/**
 * @private
 */
ASPProto.error = function( name, error_info )
{
    this._sanityCheck();

    this._root.error( name, error_info );
};

/**
 * Set timeout for external event completion with async *as.success()* or *as.error()* call.
 * If step is not finished until timeout is reached then Timeout error is raised.
 *
 * *Note: Can be used only within **ExecFunc** body.*
 * @param {number} timeout_ms - Timeout in ms
 * @alias AsyncSteps#setTimeout
 */
ASPProto.setTimeout = function( timeout_ms )
{
    this._sanityCheck();

    if ( this._limit_event !== null )
    {
        async_steps.AsyncTool.cancelCall( this._limit_event );
    }

    var _this = this;

    this._limit_event = async_steps.AsyncTool.callLater(
        function( )
        {
            _this._limit_event = null;
            try
            {
                _this._root.error( futoin_errors.Timeout );
            }
            catch ( e )
            {}
        },
        timeout_ms
    );

    return this;
};

/**
 * Set cancellation handler to properly handle timeouts and external cancellation.
 *
 * *Note: Can be used only within **ExecFunc** body.*
 * @param {CancelFunc} oncancel - cleanup/cancel logic of external processing
 * @alias AsyncSteps#setCancel
 */
ASPProto.setCancel = function( oncancel )
{
    this._oncancel = oncancel;
    return this;
};

/**
 * @private
 */
ASPProto.copyFrom = function( other )
{
    this._sanityCheck();

    if ( other._queue.length )
    {
        var q = this._queue;

        if ( q === null )
        {
            q = [];
            this._queue = q;
        }

        q.push.apply( q, other._queue );
    }

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
 * @alias AsyncSteps#loop
 */
ASPProto.loop = function( func, label )
{
    this._sanityCheck();

    this.add(
        function( outer_as )
        {
            var model_as = new async_steps.AsyncSteps();
            var inner_as;

            var create_iteration = function()
            {
                inner_as = new async_steps.AsyncSteps( outer_as.state );
                inner_as.copyFrom( model_as );
                inner_as.execute();
            };

            model_as.add(
                function( as )
                {
                    func( as );
                },
                function( as, err )
                {
                    var term_label;

                    if ( err === futoin_errors.LoopCont )
                    {
                        term_label = as.state._loop_term_label;

                        if ( term_label &&
                             ( term_label !== label ) )
                        {
                            // Unroll loops continue
                            async_steps.AsyncTool.callLater( function()
                            {
                                try
                                {
                                    outer_as.continue( term_label );
                                }
                                catch ( ex )
                                {}
                            } );
                        }
                        else
                        {
                            // Continue to next iteration
                            as.success();
                            return; // DO not destroy model_as
                        }
                    }
                    else if ( err === futoin_errors.LoopBreak )
                    {
                        term_label = as.state._loop_term_label;

                        if ( term_label &&
                             ( term_label !== label ) )
                        {
                            // Unroll loops and break
                            async_steps.AsyncTool.callLater( function()
                            {
                                try
                                {
                                    outer_as.break( term_label );
                                }
                                catch ( ex )
                                {}
                            } );
                        }
                        else
                        {
                            // Continue linear execution
                            async_steps.AsyncTool.callLater( function()
                            {
                                try
                                {
                                    outer_as.success();
                                }
                                catch ( ex )
                                {
                                    // can fail sanity check on race condition after cancel()
                                }
                            } );
                        }
                    }
                    else
                    {
                        // Forward regular error
                        async_steps.AsyncTool.callLater( function()
                        {
                            try
                            {
                                outer_as.error( err );
                            }
                            catch ( ex )
                            {}
                        } );
                    }

                    // Destroy recursive reference
                    model_as.cancel();
                }
            ).add(
                function( as )
                {
                    void as;
                    // schedule new iteration
                    // NOTE: recursive model_as -> potential mem leak -> destroy model_as on exit
                    async_steps.AsyncTool.callLater( create_iteration );
                }
            );

            outer_as.setCancel( function( as )
            {
                void as;
                inner_as.cancel();
                model_as.cancel();
            } );

            create_iteration();
        }
    );

    return this;
};

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
 * @alias AsyncSteps#repeat
 */
ASPProto.repeat = function( count, func, label )
{
    var i = 0;
    this.loop(
        function( as )
        {
            if ( i < count )
            {
                func( as, i++ );
            }
            else
            {
                as.break();
            }
        },
        label
    );

    return this;
};

/**
 * It is just a subset of *ExecFunc*
 * @callback ForEachFunc
 * @param {AsyncSteps} as - the only valid reference to AsyncSteps with required level of protection
 * @param {integer} i - current iteration starting from 0
 * @alias foreach_callback
 * @see ExecFunc
 */

/**
 * For each *map* or *list* element call *func( as, key, value )*
 * @param {integer} map_or_list - map or list to iterate over
 * @param {ForEachFunc} func - loop body
 * @param {string=} label - optional label to use for *as.break()* and *as.continue()* in inner loops
 * @alias AsyncSteps#forEach
 */
ASPProto.forEach = function( map_or_list, func, label )
{
    if ( Array.isArray( map_or_list ) )
    {
        this.repeat(
            map_or_list.length,
            function( as, i )
            {
                func( as, i, map_or_list[i] );
            },
            label
        );
    }
    else
    {
        var keys = Object.keys( map_or_list );

        this.repeat(
            keys.length,
            function( as, i )
            {
                func( as, keys[i], map_or_list[ keys[i] ] );
            },
            label
        );
    }

    return this;
};

/**
 * Break execution of current loop, throws exception
 * @param {string=} label - Optional. unwind loops, until *label* named loop is exited
 * @alias AsyncSteps#break
 */
ASPProto.break = function( label )
{
    this._sanityCheck();
    this.state._loop_term_label = label;
    this._root.error( futoin_errors.LoopBreak );
};

/**
 * Continue loop execution from the next iteration, throws exception
 * @param {string=} label - Optional. unwind loops, until *label* named loop is found
 * @alias AsyncSteps#continue
 */
ASPProto.continue = function( label )
{
    this._sanityCheck();
    this.state._loop_term_label = label;
    this._root.error( futoin_errors.LoopCont );
};

/**
 * @private
 */
ASPProto._cleanup = function()
{
    this._root = null;
    this._queue = null;
    this._onerror = null;
    this._oncancel = null;
    this.state = null;
};

/**
 * @private
 */
ASPProto._sanityCheck = function()
{
    if ( this._root === null )
    {
        throw Error( futoin_errors.InternalError, 'Unexpected call, object is out of service' );
    }

    var stack = this._root._stack;

    if ( stack[stack.length - 1] !== this )
    {
        this._root.error( futoin_errors.InternalError, "Invalid call (sanity check)" );
    }
};

/* */

exports.AsyncStepProtector = AsyncStepProtector;
