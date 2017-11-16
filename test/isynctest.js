'use strict';

const $as = require('../lib/asyncsteps.js');
const expect = require( 'chai' ).expect;
const ISync = require('../ISync');

describe('ISync', function(){
    it ('should throw default errors', function(done) {
        const is = new ISync();
        const as = $as();
        
        as.add(
            (as) => {
                as.sync( is, (as, err) => done('Fail') );
            },
            (as, err) => {
                if ( err === 'NotImplemented' ) {
                    done();
                } else {
                    done('Fail');
                }
            }
        );
        as.execute();
    });
});
