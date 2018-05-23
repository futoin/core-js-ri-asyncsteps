'use strict';

// ensure it works with frozen one
Object.freeze( Object.prototype );

const chai = require( 'chai' );

//
const $as = ( typeof window !== 'undefined' )
    ? require( 'futoin-asyncsteps' )
    : module.require( '../lib/asyncsteps-full' );

const { assert, expect } = chai;

const { ISync } = $as;
const $as_test = $as.testcase;

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
