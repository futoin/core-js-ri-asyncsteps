'use strict';

// ensure it works with frozen one
Object.freeze( Object.prototype );

const chai = require( 'chai' );

//
const $as = ( typeof window !== 'undefined' )
    ? require( 'futoin-asyncsteps' )
    : module.require( '../lib/main-full' );

const { assert, expect } = chai;

const $as_test = $as.testcase;

describe( '$as_test', function() {
    it ( 'should handle possitive test', $as_test(
        ( as ) => {}
    ) );

    it ( 'should handle negative test', $as_test(
        ( as ) => {
            as.error( 'MyError' );
        },
        ( as, err ) => {
            if ( err === 'MyError' ) {
                as.success();
            }
        }
    ) );

    it ( 'should handle failure', ( done ) => {
        $as_test(
            ( as ) => {
                as.error( 'MyError' );
            }
        )( ( err ) => {
            try {
                expect( err.message ).to.equal( 'MyError' );
                done();
            } catch ( err ) {
                done( err );
            }
        } );
    } );

    it ( 'should handle failure without exception', ( done ) => {
        $as_test(
            ( as ) => {
                as.error( 'MyError' );
            },
            ( as, err ) => {
                delete as.state.last_exception;
            }
        )( ( err ) => {
            try {
                expect( err.message ).to.equal( 'Generic Fail' );
                done();
            } catch ( err ) {
                done( err );
            }
        } );
    } );

    it ( 'should pass Mocha this', $as_test(
        function( as ) {
            this.timeout( 1e3 ); // calls Mocha
        }
    ) );

    it ( 'should force failure on negative test', ( done ) => {
        $as_test(
            ( as ) => {},
            ( as, err ) => {}
        )( ( err ) => {
            try {
                expect( err.message ).to.equal( 'NegativeTestMustThrow' );
                done();
            } catch ( err ) {
                done( err );
            }
        } );
    } );
} );

