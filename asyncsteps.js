
var async_tool = require( './lib/asynctool' );
var futoin_errors = require( './lib/futoin_errors' );

/**
 * Call to get a new instance of AsyncSteps
 */
exports = module.exports = function( )
{
    return new module.exports.AsyncSteps();
};

// Prevent issues with cyclic deps
var asyncstep_protector = require( './lib/asyncstep_protector' );
var parallel_step = require( './lib/parallel_step' );

exports.AsyncTool = async_tool;
exports.FutoInError = futoin_errors;

/* Use for unit testing */
exports.installAsyncToolTest = function( install )
{
    if ( install === false )
    {
        exports.AsyncTool = require( './lib/asynctool' );
    }
    else
    {
        exports.AsyncTool = require( './lib/asynctool_test' );
    }
};

/**
 * AsyncSteps instance itself
 */
function AsyncSteps( state )
{
    this.state = state || { error_info : "" };
    this._queue = [];
    this._stack = [];

    var _this = this;
    this._execute_cb = function()
    {
        _this.execute();
    };
}

/**
 * Prototype for AsyncSteps
 */
var AsyncStepsProto =
{
    _execute_event : null,
    _next_args : []
};

AsyncStepsProto._check_func = function( func )
{
    if ( func.length < 1 )
    {
        this.error( futoin_errors.InternalError, "Step function must expect at least AsyncStep interface" );
    }
};

AsyncStepsProto._check_onerror = function( onerror )
{
    if ( onerror &&
         ( onerror.length != 2 ) )
    {
        this.error( futoin_errors.InternalError, "Error handler must take exactly two arguments" );
    }
};

AsyncStepsProto.add = function( func, onerror )
{
    this._check_func( func );
    this._check_onerror( onerror );

    if ( this._stack.length )
    {
        this.error( futoin_errors.InternalError, "Top level add in execution" );
    }

    this._queue.push( [ func, onerror ] );
    return this;
};

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

AsyncStepsProto.error = function( error, error_info )
{
    if ( error_info !== undefined )
    {
        this.state.error_info = error_info;
    }

    throw error;
};

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
};

AsyncStepsProto._handle_success = function( args )
{
    var stack = this._stack;

    if ( !stack.length )
    {
        this.error( futoin_errors.InternalError, 'Invalid success completion' );
    }

    this._next_args = args;

    for ( var asp = stack[ stack.length - 1 ];; )
    {
        if ( asp._limit_event )
        {
            exports.AsyncTool.cancelCall( asp._limit_event );
            asp._limit_event = null;
        }

        asp._cleanup(); // aid GC

        if ( !stack.length )
        {
            break;
        }

        asp = stack[ stack.length - 1 ];

        if ( ( asp._queue !== null ) &&
             asp._queue.length )
        {
            break;
        }

        stack.pop();
    }

    if ( stack.length ||
         this._queue.length )
    {
        this._execute_event = exports.AsyncTool.callLater( this._execute_cb );
    }
};

AsyncStepsProto._handle_error = function( name )
{
    this._next_args = [];

    var stack = this._stack;
    var asp;
    var slen;

    for ( ; stack.length; stack.pop() )
    {
        asp = stack[ stack.length - 1 ];

        if ( asp._limit_event )
        {
            exports.AsyncTool.cancelCall( asp._limit_event );
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
                asp._onerror.call( null, asp, name );
            }
            catch ( e ) // not sure, if safe to put 'name' directly here
            {
                name = e;
            }

            if ( slen != stack.length )
            {
                return; // override with success()
            }
        }

        asp._cleanup(); // aid GC
    }

    // Clear queue on finish
    this._queue = [];

    if ( this._execute_event )
    {
        exports.AsyncTool.cancelCall( this._execute_event );
        this._execute_event = null;
    }
};

AsyncStepsProto.cancel = function()
{
    this._next_args = [];

    if ( this._execute_event )
    {
        exports.AsyncTool.cancelCall( this._execute_event );
        this._execute_event = null;
    }

    var stack = this._stack;
    var asp;

    while ( stack.length )
    {
        asp = stack.pop();

        if ( asp._limit_event )
        {
            exports.AsyncTool.cancelCall( asp._limit_event );
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
};

AsyncStepsProto.execute = function( )
{
    if ( this._execute_event )
    {
        exports.AsyncTool.cancelCall( this._execute_event );
        this._execute_event = null;
    }

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

    var asp = asyncstep_protector( this, this );

    var next_args = this._next_args;
    this._next_args = [];
    next_args.unshift( asp );

    try
    {
        asp._onerror = curr[1];
        stack.push( asp );

        var oc = stack.length;
        curr[0].apply( null, next_args );

        if ( oc === stack.length )
        {
            if ( asp._queue !== null )
            {
                this._execute_event = exports.AsyncTool.callLater( this._execute_cb );
            }
            else
                if ( ( asp._limit_event === null ) &&
                      ( asp._oncancel === null ) )
            {
                this.error( futoin_errors.InternalError, "Step executed with no result, substep, timeout or cancel" );
            }
        }
    }
    catch ( e )
    {
        this._handle_error( e );
    }
};

AsyncSteps.prototype = AsyncStepsProto;
exports.AsyncSteps = AsyncSteps;
