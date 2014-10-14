
var q = [];

exports.callLater = function( func, timeout_ms )
{
    var t = process.hrtime();
    t = ( t[0] * 1e3 ) + ( t[1] / 1e6 );

    if ( timeout_ms )
    {
        t += timeout_ms;
    }

    var e = {
        f : func,
        t : t
    };

    for ( var i = 0; i < q.length; ++i )
    {
        if ( q[i].t > t )
        {
            q.splice( i, 0, e );
            return;
        }
    }

    q.push( e );
    return e;
};

exports.cancelCall = function( handler )
{
    for ( var i = 0; i < q.length; ++i )
    {
        if ( q[i] === handler )
        {
            q.splice( i, 1 );
            return;
        }
    }
};

exports.nextEvent = function()
{
    var e = q.shift();
    // We do not wait for timeout, there is little practical use for that
    // even in scope of testing. If we come to the point, where we need to sleep
    // then no other event would get earlier under normal conditions.
    e.f();
};

exports.hasEvents = function()
{
    return q.length > 0;
};

exports.getEvents = function()
{
    return q;
};

exports.resetEvents = function()
{
    q.splice( 0, q.length );
};

exports.run = function()
{
    while ( this.hasEvents() )
    {
        this.nextEvent();
    }
};
