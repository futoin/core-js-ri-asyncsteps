var async_steps = require('futoin-asyncsteps');

var root_as = async_steps();

root_as.add(
    function( as ){
        as.success( "MyValue" );
    }
).add(
    function( as, arg ){
        if ( arg === 'MyValue' )
        {
            as.add( function( as ){
                as.error( 'MyError', 'Something bad has happened' );
            });
        }
    },
    function( as, err )
    {
        if ( err === 'MyError' )
        {
            as.success( 'NotSoBad' );
        }
    }
);

root_as.add(
    function( as, arg )
    {
        if ( arg === 'NotSoBad' )
        {
            console.log( 'MyError was ignored: ' + as.state.error_info );
        }
        
        as.state.p1arg = 'abc';
        as.state.p2arg = 'xyz';
        
        var p = as.parallel();
        
        p.add( function( as ){
            console.log( 'Parallel Step 1' );
            
            as.add( function( as ){
                console.log( 'Parallel Step 1.1' );
                as.state.p1 = as.state.p1arg + '1';
            } );
        } )
        .add( function( as ){
            console.log( 'Parallel Step 2' );
            
            as.add( function( as ){
                console.log( 'Parallel Step 2.1' );
                as.state.p2 = as.state.p2arg + '2';
            } );
        } );
    }
).add( function( as ){
    console.log( 'Parallel 1 result: ' + as.state.p1 );
    console.log( 'Parallel 2 result: ' + as.state.p2 );
} );
            
root_as.execute();
