"use strict";

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
var ASPProto = {
    _root : null,
    _queue : null,
    _onerror : null,
    _oncancel : null,
    _limit_event : null,
};

/* istanbul ignore next */
function dummy_step_func( as ) // jshint ignore:line
{
}

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
 * @alias module:futoin-asyncsteps.AsyncSteps#success
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
 * If sub-steps have been added then add dummy step with as.success() call.
 * Otherwise, simply call as.success();
 * @alias module:futoin-asyncsteps.AsyncSteps#successStep
 */
ASPProto.successStep = function( )
{
    var q = this._queue;

    if ( q !== null )
    {
        this.add( dummy_step_func );
        q[ q.length - 1 ][ 0 ] = null; // optimize execute
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
 * @private
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
            _this._root._handle_error( futoin_errors.Timeout );
        },
        timeout_ms
    );
};

/**
 * @private
 */
ASPProto.setCancel = function( oncancel )
{
    this._oncancel = oncancel;
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

AsyncStepProtector.prototype = ASPProto;
exports.AsyncStepProtector = AsyncStepProtector;
