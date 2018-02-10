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
const $as_test = require( '../testcase' );

describe( 'ISync', function() {
    it ( 'should throw default errors', $as_test(
        ( as ) => {
            const is = new ISync();
            as.sync( is, ( as, err ) => as.error( 'MyError' ) );
        },
        ( as, err ) => {
            if ( err === 'NotImplemented' ) {
                as.success();
            }
        }
    ) );
} );
