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
const { Limiter } = $as;

describe( 'Limiter', function() {
    it ( 'should have correct defaults', function() {
        const lim = new Limiter();

        expect( lim._mutex._max ).to.equal( 1 );
        expect( lim._mutex._max_queue ).to.equal( 0 );

        expect( lim._throttle._max ).to.equal( 1 );
        expect( lim._throttle._period_ms ).to.equal( 1e3 );
        expect( lim._throttle._max_queue ).to.equal( 0 );
    } );

    it ( 'should have correct defaults', function() {
        const lim = new Limiter( {
            concurrent : 12,
            max_queue : 23,
            rate : 34,
            period_ms : 1234,
            burst : 45,
        } );

        expect( lim._mutex._max ).to.equal( 12 );
        expect( lim._mutex._max_queue ).to.equal( 23 );

        expect( lim._throttle._max ).to.equal( 34 );
        expect( lim._throttle._period_ms ).to.equal( 1234 );
        expect( lim._throttle._max_queue ).to.equal( 45 );
    } );

    it ( 'should handle limits', function( done ) {
        if ( typeof window !== 'undefined' ) {
            // Quite lags in browser
            done();
            return;
        }

        const lim = new Limiter( {
            concurrent : 20,
            max_queue : 77,
            rate : 5,
            period_ms : 100,
            burst : 12,
        } );

        const as = $as();
        const p = as.parallel( ( as, err ) => {
            done( as.state.last_exception || err || 'Fail' );
        } );
        let passed = 0;
        let rejected = 0;

        for ( let i = 0; i < 100; ++i ) {
            p.add( ( as ) => {
                as.add(
                    ( as ) => as.sync( lim, ( as ) => {
                        passed += 1;
                    } ),
                    ( as, err ) => {
                        if ( err === 'DefenseRejected' ) {
                            rejected += 1;
                            as.success();
                        }
                    }
                );
            } );
        }

        as.execute();

        setTimeout( () => {
            expect( passed ).to.equal( 5 );
            expect( rejected ).to.equal( 83 );
        }, 75 );

        setTimeout( () => {
            expect( passed ).to.equal( 10 );
            expect( rejected ).to.equal( 83 );
        }, 150 );

        setTimeout( () => {
            expect( passed ).to.equal( 5 + 12 );
            expect( rejected ).to.equal( 83 );
            as.cancel();
            done();
        }, 350 );
    } );

    it ( 'should handle re-entrancy & success params', function( done ) {
        const lim = new Limiter( {
            concurrent : 1,
            max_queue : 77,
            rate : 5,
            period_ms : 100,
            burst : 12,
        } );

        for ( let i = 0; i < 2; ++i ) {
            const as = $as();

            as.add( ( as ) => as.success( 'MyArgs' ) );
            as.sync(
                lim,
                ( as, arg ) => {
                    expect( arg ).to.equal( 'MyArgs' );

                    as.sync(
                        lim,
                        ( as ) => as.error( 'Wrong' ),
                        ( as, err ) => {
                            if ( err === 'Wrong' ) {
                                as.error( 'OK' );
                            }
                        }
                    );
                },
                ( as, err ) => {
                    as.success( err );
                }
            );
            as.add( ( as, err ) => {
                if ( err === 'OK' ) {
                    if ( i ) {
                        done();
                    }
                } else {
                    done( 'Fail' );
                }
            } );
            as.execute();
        }
    } );
} );
