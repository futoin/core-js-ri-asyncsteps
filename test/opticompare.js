'use strict';

const $as = require( '../lib/main-full' );
const optihelp = require( '@futoin/optihelp' );

const REPEAT_COUNT = 10000;
let as_i = 0;
let await_i = 0;

optihelp( 'Compare', { test_time : 10 } )
    .test( 'AsyncSteps', ( done ) => {
        $as()
            .add( ( as ) => {
                ++as_i;
                as.add( ( as ) => {
                    ++as_i;
                } );
            } )
            .add( ( as ) => done() )
            .execute();
    } )
    .test( 'async-await', ( done ) => {
        ( async () => {
            ++await_i;
            await ( async () => {
                ++await_i;
            } );
        } )().then( done );
    } )
    .test( 'as-repeat', ( done ) => {
        $as()
            .repeat( REPEAT_COUNT, ( as, i ) => {
                as_i += i;
            } )
            .add( ( as ) => done() )
            .execute();
    } )
    .test( 'await-for', ( done ) => {
        ( async () => {
            const inner = async ( i ) => {
                await_i += i;
            };

            for ( let i = 0; i < REPEAT_COUNT; ++i ) {
                await inner( i );
            }
        } )().then( done );
    } )
    .start( () => {
        console.log( `as_i:    ${as_i}` );
        console.log( `await_i: ${await_i}` );
    } );
