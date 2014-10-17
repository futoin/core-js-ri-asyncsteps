var async_steps = require('futoin-asyncsteps');


function dummy_service_read( success, error ){
    // We expect it calles success when data is available
    // and error, if error occurs
    // Returns some request handle
}

function dummy_service_cancel( reqhandle ){
    // We assume it cancels previously scheduled reqhandle
}

var root_as = async_steps();

root_as.add( function( as ){
    setImmediate( function(){
        as.success( 'async success()' );
    } );
    
    as.setTimeout( 10 ); // ms
} ).add(
    function( as, arg ){
        console.log( arg );
        
        var reqhandle = dummy_service_read(
            function( data ){
                as.success( data );
            },
            function( err ){
                if ( err !== 'SomeSpecificCancelCode' )
                {
                    as.error( err );
                }
            }
        );
        
        as.setCancel(function(as){
            dummy_service_cancel( reqhandle );
        });
        
        // OPTIONAL. Set timeout of 1s
        as.setTimeout( 1000 );
    },
    function( as, err )
    {
        console.log( err + ": " + as.state.error_info );
    }
);

root_as.execute();
