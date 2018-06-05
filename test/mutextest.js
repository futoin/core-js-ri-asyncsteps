'use strict';

// ensure it works with frozen one
Object.freeze( Object.prototype );

const chai = require( 'chai' );

//
const $as = ( typeof window !== 'undefined' )
    ? require( 'futoin-asyncsteps' )
    : module.require( '../lib/main-full' );

const { assert, expect } = chai;

const { Mutex } = $as;

describe( 'Mutex', function() {
    it ( 'should handle re-entrancy & success params', function( done ) {
        const mtx = new Mutex();

        for ( let i = 0; i < 2; ++i ) {
            const as = $as();

            as.add( ( as ) => as.success( 'MyArgs' ) );
            as.sync(
                mtx,
                ( as, arg ) => {
                    expect( arg ).to.equal( 'MyArgs' );

                    as.sync(
                        mtx,
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
                    done( err || 'Fail' );
                }
            } );
            as.execute();
        }
    } );

    it ( 'should correctly handle concurrency limit', function( done ) {
        const limit = 3;
        const mtx = new Mutex( limit );
        let curr = 0;
        let max = 0;

        for ( let i = limit * 3; i >= 0; --i ) {
            const as = $as();
            as.sync(
                mtx,
                ( as ) => {
                    curr += 1;
                    max = ( max < curr ) ? curr : max;

                    as.add( ( as ) => {
                        curr -= 1;
                    } );
                }
            );

            if ( i === 0 ) {
                as.add( ( as ) => {
                    try {
                        expect( max ).to.equal( limit );
                        done();
                    } catch ( e ) {
                        done( e );
                    }
                } );
            }

            as.execute();
        }
    } );

    it ( 'should handle cancel', function( done ) {
        const mtx = new Mutex();
        const as1 = $as();

        as1.add(
            ( as ) => {
                as.sync( mtx, ( as ) => {
                    as.waitExternal();
                } );
            },
            ( as, err ) => {
                done( as.state.last_exception || 'Fail' );
            }
        ).execute();

        $as().add(
            ( as ) => {
                as.setTimeout( 10 );
                as.sync( mtx, ( as ) => {
                    as.waitExternal();
                } );
            },
            ( as, err ) => {
                if ( err === 'Timeout' ) {
                    as1.cancel();
                } else {
                    done( as.state.last_exception || 'Fail' );
                }
            }
        ).execute();

        $as().add(
            ( as ) => {
                as.sync( mtx, ( as ) => {
                    done();
                } );
            },
            ( as, err ) => {
                done( as.state.last_exception || 'Fail' );
            }
        ).execute();
    } );

    it ( 'should handle errors', function( done ) {
        const mtx = new Mutex();
        const as1 = $as();
        let as1p;

        as1.add(
            ( as ) => {
                as.sync( mtx, ( as ) => {
                    as.waitExternal();
                    as1p = as;
                } );
            },
            ( as, err ) => {
                if ( err === 'OK' ) {
                    as.success();
                } else {
                    done( as.state.last_exception || 'Fail' );
                }
            }
        ).execute();

        $as().add(
            ( as ) => {
                as.loop( ( as ) => {
                    if ( as1p ) {
                        try {
                            as1p.error( 'OK' );
                        } catch ( e ) {
                            // ignore
                        }

                        as.break();
                    }
                } );
                as.sync( mtx, ( as ) => {
                    done();
                } );
            },
            ( as, err ) => {
                done( as.state.last_exception || 'Fail' );
            }
        ).execute();
    } );

    it ( 'should handle parallel steps', function( done ) {
        const mtx = new Mutex();
        let curr = 0;
        let max = 0;
        const as = $as();
        const p = as.parallel();

        for ( let i = 10; i >= 0; --i ) {
            p.add( ( as ) => {
                as.sync(
                    mtx,
                    ( as ) => {
                        curr += 1;
                        max = ( max < curr ) ? curr : max;

                        as.add( ( as ) => {
                            curr -= 1;
                        } );
                    }
                );
            } );

            if ( i === 0 ) {
                as.add( ( as ) => {
                    try {
                        expect( max ).to.equal( 1 );
                        done();
                    } catch ( e ) {
                        done( e );
                    }
                } );
            }
        }

        as.execute();
    } );

    it ( 'should handle queue limit', function( done ) {
        const mtx = new Mutex( 2, 5 );
        let curr = 0;
        let max = 0;
        let total = 0;
        let rejected = 0;
        const as = $as();
        const p = as.parallel();

        for ( let i = 10; i > 0; --i ) {
            p.add( ( as ) => {
                as.add(
                    ( as ) => as.sync(
                        mtx,
                        ( as ) => {
                            curr += 1;
                            total += 1;
                            max = ( max < curr ) ? curr : max;

                            as.add( ( as ) => {
                                as.waitExternal();
                                setTimeout( () => as.success(), 100 );
                            } );
                            as.add( ( as ) => {
                                curr -= 1;
                            } );
                        }
                    ),
                    ( as, err ) => {
                        if ( err === 'DefenseRejected' ) {
                            rejected += 1;
                            as.success();
                        }
                    }
                );
            } );
        }

        as.add( ( as ) => {
            try {
                expect( max ).to.equal( 2 );
                expect( total ).to.equal( 7 );
                expect( rejected ).to.equal( 3 );
                done();
            } catch ( e ) {
                done( e );
            }
        } );

        as.execute();
    } );
} );
