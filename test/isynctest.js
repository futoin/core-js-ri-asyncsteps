'use strict';

let $as;
let chai;

if ( typeof window !== 'undefined' ) {
    $as = window.$as;
    chai = window.chai;
} else {
    $as = module.require( '../lib/asyncsteps-full.js' );
    chai = module.require( 'chai' );
}

const expect = chai.expect;
const { ISync } = $as;

describe( 'ISync', function() {
    it ( 'should throw default errors', function( done ) {
        const is = new ISync();
        const as = $as();

        as.add(
            ( as ) => {
                as.sync( is, ( as, err ) => done( 'Fail' ) );
            },
            ( as, err ) => {
                if ( err === 'NotImplemented' ) {
                    done();
                } else {
                    done( 'Fail' );
                }
            }
        );
        as.execute();
    } );
} );
