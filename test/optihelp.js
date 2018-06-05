'use strict';

const $as = require( '../lib/main-full' );
const optihelp = require( '@futoin/optihelp' );

const {
    THROTTLE,
} = require( '../lib/common' );


//---
const test_array = [];
const test_object = {};
const test_map = new Map();

for ( let i = 1000; i > 0; --i ) {
    test_array.push( i );
    test_object[`key_${i}`] = i;
    test_map.set( `key_${i}`, i );
}

//---
const { Mutex, Limiter, Throttle } = $as;
const mtx = new Mutex;
const trtl = new Throttle( 1 );
const lmtr = new Limiter;

optihelp( 'AsyncSteps', { test_time : 3 } )
    .test( 'Add step', () => {
        $as().add( ( as ) => {} );
    } )
    .test( 'Add step with error handler', () => {
        $as().add( ( as ) => {}, ( as, err ) => {} );
    } )
    .test( 'Simple execute', () => {
        $as().add( ( as ) => {} ).execute();
    } )
    .test( 'Simple error handling', () => {
        $as().add( ( as ) => as.error( 'SomeError', 'SomeInfo' ) ).execute();
    } )
    .test( 'Inner add step', ( done ) => {
        $as()
            .add( ( as ) => {
                as.add( ( as ) => {} );
            } )
            .add( ( as ) => done() )
            .execute();
    } )
    .test( 'Parallel', ( done ) => {
        const as = $as();
        const p = as.parallel();
        p.add( ( as ) => {} );
        p.add( ( as ) => {} );
        as.add( ( as ) => done() );
        as.execute();
    } )
    .test( 'Simple error recovery', ( done ) => {
        $as()
            .add(
                ( as ) => as.error( 'SomeError', 'SomeInfo' ),
                ( as, err ) => as.success()
            )
            .add( ( as ) => done() )
            .execute();
    } )
    .test( 'Complex error recovery', ( done ) => {
        $as()
            .add(
                ( as ) => {
                    as.add(
                        ( as ) => as.add(
                            ( as ) => as.error( 'SomeError', 'SomeInfo' )
                        )
                    );
                },
                ( as, err ) => as.success()
            )
            .add( ( as ) => done() )
            .execute();
    } )
    .test( 'Simple cancel', () => {
        $as()
            .add( ( as ) => {} )
            .add( ( as ) => {} )
            .execute()
            .cancel();
    } )
    .test( 'Single repeat loop', ( done ) => {
        $as()
            .repeat( 1, ( as, i ) => {} )
            .add( ( as ) => done() )
            .execute();
    } )
    .test( '1000 repeat loop', ( done ) => {
        $as()
            .repeat( 1000, ( as, i ) => {} )
            .add( ( as ) => done() )
            .execute();
    } )
    .test( 'forEach Array', ( done ) => {
        $as()
            .forEach( test_array, ( as, k, v ) => {} )
            .add( ( as ) => done() )
            .execute();
    } )
    .test( 'forEach Object', ( done ) => {
        $as()
            .forEach( test_object, ( as, k, v ) => {} )
            .add( ( as ) => done() )
            .execute();
    } )
    .test( 'forEach Map', ( done ) => {
        $as()
            .forEach( test_map, ( as, k, v ) => {} )
            .add( ( as ) => done() )
            .execute();
    } )
    .test( 'await resolved', ( done ) => {
        $as()
            .await( Promise.resolve( true ) )
            .add( ( as ) => done() )
            .execute();
    } )
    .test( 'await rejected', ( done ) => {
        $as()
            .await( Promise.reject( 'Fail' ), ( as, err ) => as.success() )
            .add( ( as ) => done() )
            .execute();
    } )
    .test( 'await deferred', ( done ) => {
        $as()
            .await( new Promise( ( resolve, _ ) => resolve( true ) ) )
            .add( ( as ) => done() )
            .execute();
    } )
    .test( 'sync Mutex', ( done ) => {
        $as()
            .sync( mtx, ( as ) => {} )
            .add( ( as ) => done() )
            .execute();
    } )
    .test( 'sync Mutex blocking', ( done ) => {
        $as()
            .sync( mtx, ( as ) => {
                $as()
                    .sync( mtx, ( as ) => {} )
                    .add( ( as ) => done() )
                    .execute();
            } )
            .execute();
    } )
    .test( 'sync Throttle', ( done ) => {
        trtl._resetPeriod();
        $as()
            .sync( trtl, ( as ) => {} )
            .add( ( as ) => done() )
            .execute();
    } )
    .test( 'sync Throttle blocking', ( done ) => {
        trtl._resetPeriod();
        $as()
            .sync( trtl, ( as ) => {
                $as()
                    .sync( trtl, ( as ) => {} )
                    .add( ( as ) => done() )
                    .execute();
                trtl._resetPeriod();
            } )
            .execute();
    } )
    .test( 'sync Limiter', ( done ) => {
        lmtr._throttle._resetPeriod();
        $as()
            .sync( lmtr, ( as ) => {} )
            .add( ( as ) => done() )
            .execute();
    } )
    .start();
