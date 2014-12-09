var async_steps = require('futoin-asyncsteps');


var model_as = async_steps();
model_as.state.var = 'Vanilla';

model_as.add( function(as){
    console.log('-----');
    console.log( 'Hi! I am from model_as' );
    console.log( 'State.var: ' + as.state.var );
    as.state.var = 'Dirty';
});

for ( var i = 0; i < 3; ++i )
{
    var root_as = async_steps();
    root_as.copyFrom( model_as );
    root_as.add( function(as){
        as.add(function( as ){
            console.log('>> The first inner step');
        });
        as.copyFrom( model_as );
    });
    root_as.execute();
}
