const $as = require('futoin-asyncsteps');

const root_as = $as();

root_as.add( ( as ) => {
    as.success( "MyValue" );
    // as.success() is implicit, if not called
} ).add(
    ( as, arg ) => {
        if ( arg === 'MyValue' ) {
            as.add( ( as ) => {
                as.error( 'MyError', 'Something bad has happened' );
            });
        }
    },
    ( as, err ) => {
        if ( err === 'MyError' ) {
            as.success( 'NotSoBad' );
            // as.add() acts as implicit as.success()
        }
    }
);

root_as.add( ( as, arg ) => {
    if ( arg === 'NotSoBad' ) {
        console.log( 'MyError was ignored: ' + as.state.error_info );
    }
    
    as.state.p1arg = 'abc';
    as.state.p2arg = 'xyz';
    
    const p = as.parallel();
    
    p.add( ( as ) => {
        console.log( 'Parallel Step 1' );
        
        as.add( ( as ) => {
            console.log( 'Parallel Step 1.1' );
            as.state.p1 = as.state.p1arg + '1';
        } );
    } );
    p.add( ( as ) =>{
        console.log( 'Parallel Step 2' );
        
        as.add( ( as ) => {
            console.log( 'Parallel Step 2.1' );
            as.state.p2 = as.state.p2arg + '2';
        } );
    } );
} ).add( ( as ) => {
    console.log( 'Parallel 1 result: ' + as.state.p1 );
    console.log( 'Parallel 2 result: ' + as.state.p2 );
} );
            
root_as.execute();
