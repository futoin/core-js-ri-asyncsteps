
var async_steps = require( '../asyncsteps' );
var parallel_step = require( './parallel_step' );
var futoin_errors = require( './futoin_errors' );

exports = module.exports = function( root, as )
{
    return new  module.exports.AsyncStepProtector( root, as );
};

/**
 * AsyncStepProtector
 */
var AsyncStepProtector = function( root, as )
{
    this._root = root;
    this.state = root.state;
};

/**
 * Parallel step prototype
 */
var ASPProto = function()
{
    this.success.apply( this, arguments );
};

ASPProto._root = null;
ASPProto._queue = null;
ASPProto._onerror = null;
ASPProto._oncancel = null;
ASPProto._limit_event = null;

ASPProto.add = function( func, onerror )
{
    this._sanityCheck();

    var q = this._queue;

    if ( q === null )
    {
        q = [];
        this._queue = q;
    }

    q.push( [ func, onerror ] );

    return this;
};

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

ASPProto.success = function( )
{
    this._sanityCheck();

    if ( this._queue !== null )
    {
        this.error( futoin_errors.InternalError, "Invalid success() call" );
    }

    this._root._handle_success.call( this._root, arguments );
};

ASPProto.successStep = function( )
{
    var q = this._queue;

    if ( q !== null )
    {
        this.add();
        q[ q.length - 1 ][ 0 ] = null; // optimize execute
    }
    else
    {
        this.success();
    }
};

ASPProto.error = function( error, error_info )
{
    this._sanityCheck();

    this._root.error( error, error_info );
};

ASPProto.setTimeout = function( timeout_ms )
{
    if ( this._limit_event !== null )
    {
        async_steps.AsyncTool.cancelCall( this._limit_event );
    }

    var _this = this;

    this._limit_event = async_steps.AsyncTool.callLater(
        function( )
        {
            _this._limit_event = null;
            _this._root.handle_error( futoin_errors.Timeout );
        },
        timeout_ms
    );
};

ASPProto.setCancel = function( oncancel )
{
    this._oncancel = oncancel;
};

ASPProto.execute = function( )
{
    this.error( futoin_errors.InternalError, "Invalid execute() call" );
};

ASPProto.copyFrom = function( other )
{
    this._sanityCheck();

    if ( other._queue !== null )
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

ASPProto._cleanup = function()
{
    this._root = null;
    this._queue = null;
    this._onerror = null;
    this._oncancel = null;
    this.state = null;
};

ASPProto._sanityCheck = function()
{
    var stack = this._root._stack;

    if ( stack[stack.length - 1] !== this )
    {
        this._root.error( futoin_errors.InternalError, "Invalid copyFrom() call" );
    }
};

/* */

AsyncStepProtector.prototype = ASPProto;
exports.AsyncStepProtector = AsyncStepProtector;
