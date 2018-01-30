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
const { Throttle } = $as;

describe( 'Throttle', function() {
    it ( 'should handle re-entrancy & success params', function( done ) {
        const thrtl = new Throttle( 2, 10 );

        for ( let i = 0; i < 2; ++i ) {
            const as = $as();

            as.add( ( as ) => as.success( 'MyArgs' ) );
            as.sync(
                thrtl,
                ( as, arg ) => {
                    expect( arg ).to.equal( 'MyArgs' );

                    as.sync(
                        thrtl,
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

    it ( 'should correctly handle concurrency limit', function( done ) {
        const limit = 3;
        const thrtl = new Throttle( limit, 5 );
        let curr = 0;
        let max = 0;

        for ( let i = limit * 3; i >= 0; --i ) {
            const as = $as();
            as.sync(
                thrtl,
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
        const thrtl = new Throttle( 1, 20 );
        const as1 = $as();

        as1.add(
            ( as ) => {
                as.sync( thrtl, ( as ) => {
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
                as.sync( thrtl, ( as ) => {
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
                as.sync( thrtl, ( as ) => {
                    done();
                } );
            },
            ( as, err ) => {
                done( as.state.last_exception || 'Fail' );
            }
        ).execute();
    } );

    it ( 'should handle errors', function( done ) {
        const thrtl = new Throttle( 1, 10 );
        const as1 = $as();
        let as1p;

        as1.add(
            ( as ) => {
                as.sync( thrtl, ( as ) => {
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
                as.sync( thrtl, ( as ) => {
                    done();
                } );
            },
            ( as, err ) => {
                done( as.state.last_exception || 'Fail' );
            }
        ).execute();
    } );

    it ( 'should handle parallel steps', function( done ) {
        const thrtl = new Throttle( 1, 10 );
        let curr = 0;
        let max = 0;
        const as = $as();
        const p = as.parallel();

        for ( let i = 3; i >= 0; --i ) {
            p.add( ( as ) => {
                as.sync(
                    thrtl,
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

    it ( 'should have correct average throughput', function( done ) {
        const thrtl = new Throttle( 10, 100 );
        const as = $as();
        const p = as.parallel( ( as, err ) => {
            done( as.state.last_exception || err || 'Fail' );
        } );
        let passed = 0;

        for ( let i = 0; i < 100; ++i ) {
            p.add( ( as ) => {
                as.sync( thrtl, ( as ) => {
                    passed += 1;
                } );
            } );
        }

        as.execute();

        setTimeout( () => {
            expect( passed ).to.equal( 50 );
            as.cancel();
            done();
        }, 450 );
    } );


    it ( 'should handle queue limit', function( done ) {
        const thrtl = new Throttle( 10, 100, 33 );
        const as = $as();
        const p = as.parallel( ( as, err ) => {
            done( as.state.last_exception || err || 'Fail' );
        } );
        let passed = 0;
        let rejected = 0;

        for ( let i = 0; i < 100; ++i ) {
            p.add( ( as ) => {
                as.add(
                    ( as ) => as.sync( thrtl, ( as ) => {
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
            expect( passed ).to.equal( 43 );
            expect( rejected ).to.equal( 57 );
            as.cancel();
            done();
        }, 450 );
    } );


    it ( 'should must stop and resume reset timer', function( done ) {
        const thrtl = new Throttle( 2, 50, 10 );

        $as().add( ( outer_as ) => {
            const as = $as();
            const p = as.parallel( ( as, err ) => {
                done( as.state.last_exception || err || 'Fail' );
            } );
            let passed = 0;
            let rejected = 0;

            for ( let i = 0; i < 3; ++i ) {
                p.add( ( as ) => {
                    as.add(
                        ( as ) => as.sync( thrtl, ( as ) => {
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

            outer_as.waitExternal();
            setTimeout( () => {
                expect( passed ).to.equal( 3 );
                expect( rejected ).to.equal( 0 );
                as.cancel();
                outer_as.success();
            }, 75 );
        } ).add( ( outer_as ) => {
            outer_as.waitExternal();
            setTimeout( () => {
                expect( thrtl._timer ).to.be.null;
                outer_as.success();
            }, 100 );
        } ).add( ( outer_as ) => {
            const as = $as();
            const p = as.parallel( ( as, err ) => {
                done( as.state.last_exception || err || 'Fail' );
            } );
            let passed = 0;
            let rejected = 0;

            for ( let i = 0; i < 3; ++i ) {
                p.add( ( as ) => {
                    as.add(
                        ( as ) => as.sync( thrtl, ( as ) => {
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

            outer_as.waitExternal();
            setTimeout( () => {
                expect( passed ).to.equal( 3 );
                expect( rejected ).to.equal( 0 );
                as.cancel();
                outer_as.success();
            }, 75 );
        } ).add( ( as ) => done() ).execute();
    } );
} );
