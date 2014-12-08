var async_steps = require('futoin-asyncsteps');

var root_as = async_steps();

root_as.add(
	function( as ){
		as.repeat( 3, function( as, i ) {
			console.log( "> Repeat: " + i );
		} );
		
		as.forEach( [ 1, 2, 3 ], function( as, k, v ) {
			console.log( "> forEach: " + k + " = " + v );
		} );
		
		as.forEach( { a: 1, b: 2, c: 3 }, function( as, k, v ) {
			console.log( "> forEach: " + k + " = " + v );
		} );
	}
);

root_as.execute();
