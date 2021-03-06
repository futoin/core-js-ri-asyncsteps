'use strict';


// ensure it works with frozen one
Object.freeze( Object.prototype );

const chai = require( 'chai' );
const performance_now = require( "performance-now" );

//
const in_browser = ( typeof window !== 'undefined' );
const async_steps = in_browser
    ? require( 'futoin-asyncsteps' )
    : module.require( '../lib/main-full' );
const production_mode = async_steps.isProduction;

const { assert, expect } = chai;

const {
    HANDLE_SUCCESS,
} = require( '../lib/common' );


describe( 'AsyncTool', function() {
    describe(
        '#callLater()', function() {
            it( "should call later", function( done ) {
                async_steps.AsyncTool.callLater( done );
            } );

            it( "should call later timeout", function( done ) {
                var t = performance_now() * 1e3;

                async_steps.AsyncTool.callLater(
                    function() {
                        var s = performance_now() * 1e3;

                        expect( s ).be.greaterThan( t + 9 );
                        done();
                    },
                    10,
                );
            } );
        },
    );
    describe(
        '#cancelCall()', function() {
            it( "should cancel call", function( done ) {
                var h = async_steps.AsyncTool.callLater( done );

                async_steps.AsyncTool.cancelCall( h );
                done();
            } );

            it( "should cancel call timeout", function( done ) {
                var h = async_steps.AsyncTool.callLater( done, 100 );

                async_steps.AsyncTool.cancelCall( h );
                done();
            } );
        },
    );
} );

describe( 'AsyncToolTest', function() {
    describe(
        '#callLater()', function() {
            it( "should call later", function( done ) {
                async_steps.AsyncToolTest.callLater( done );
                async_steps.AsyncToolTest.nextEvent();
            } );

            it( "should call later timeout", function( done ) {
                async_steps.AsyncToolTest.callLater(
                    function() {
                        done();
                    },
                    100,
                );
                async_steps.AsyncToolTest.run();
            } );

            it( 'should insert event', function() {
                var f = function( as ) {};

                async_steps.AsyncToolTest.callLater( function() {}, 100 );
                async_steps.AsyncToolTest.callLater( f, 10 );

                expect( async_steps.AsyncToolTest.getEvents()[0].f ).eql( f );
                async_steps.AsyncToolTest.resetEvents();
                expect( async_steps.AsyncToolTest.getEvents().length ).equal( 0 );
            } );
        },
    );
    describe(
        '#cancelCall()', function() {
            it( "should cancel call", function( done ) {
                var h = async_steps.AsyncToolTest.callLater( done );

                expect( async_steps.AsyncToolTest.hasEvents() ).be.true;
                async_steps.AsyncToolTest.cancelCall( h );
                expect( async_steps.AsyncToolTest.hasEvents() ).be.false;
                done();
            } );

            it( "should cancel call timeout", function( done ) {
                var h = async_steps.AsyncToolTest.callLater( done, 100 );

                expect( async_steps.AsyncToolTest.hasEvents() ).be.true;
                async_steps.AsyncToolTest.cancelCall( h );
                expect( async_steps.AsyncToolTest.hasEvents() ).be.false;
                done();
            } );
        },
    );
} );

describe( 'AsyncSteps', function() {
    before( function() {
        async_steps.installAsyncToolTest();
    } );

    after( function() {
        async_steps.installAsyncToolTest( false );
    } );

    beforeEach( function( done ) {
        this.as = async_steps();

        // reset burst counter
        try {
            async_steps.AsyncToolTest.resetEvents();
            async_steps().add( break_burst ).add( ( as ) => done() ).execute();
            async_steps.AsyncToolTest.run();
        } catch ( e ) {
            console.log( e );
        }
    } );

    function assertNoEvents() {
        expect( async_steps.AsyncToolTest.getEvents().length ).equal( 0 );
    }

    function assertHasEvents() {
        expect( async_steps.AsyncToolTest.getEvents().length ).be.above( 0 );
    }

    const break_burst = ( as ) => {
        as.waitExternal();
        async_steps.AsyncToolTest.callLater( () => {
            as.state && as.success();
        }, 0 );
    };

    describe(
        '#add()', function() {
            it( "should add steps sequentially", function() {
                var as = this.as;

                as.add(
                    function( as ) {
                        as.success();
                    },
                    function( as, err ) {
                        as.success();
                    },
                ).add(
                    function( as ) {
                        as.success();
                    },
                );

                expect( as._queue.length ).equal( 2 );
                expect( as._queue[0][0] ).be.instanceof( Function );
                expect( as._queue[0][1] ).be.instanceof( Function );
                expect( as._queue[1][0] ).be.instanceof( Function );
                assert.isUndefined( as._queue[1][1] );
            } );

            it( "should call steps and errors in correct order", function() {
                var as = this.as;

                as.state.order = [];
                as.add(
                    function( as ) {
                        as.state.order.push( '1' );
                        as.add(
                            function( as ) {
                                as.state.order.push( '1_1' );
                                as.error( "MyError" );
                            },
                            function( as, err ) {
                                as.state.order.push( '1_1e' );
                                expect( err ).eql( "MyError" );
                                as.success( '1_1e' );
                            },
                        );
                        as.add(
                            function( as, val ) {
                                as.state.order.push( '1_2' );
                                expect( val ).eql( '1_1e' );
                                as.error( "MyError2" );
                            },
                            function( as, err ) {
                                as.state.order.push( '1_2e' );
                                expect( err ).eql( "MyError2" );
                                as.success( '1_2e' );
                            },
                        ).add(
                            function( as, val ) {
                                as.state.order.push( '1_3' );
                                expect( val ).eql( '1_2e' );
                                as.success( '1_3', 'yes' );
                            },
                            function( as, err ) {
                                as.state.order.push( '1_3e' );
                                expect( err ).eql( "MyError2" );
                                as.success();
                            },
                        );
                    },
                    function( as, err ) {
                        as.state.order.push( '1e' );
                        as.success();
                    },
                ).add(
                    function( as, val1, val2 ) {
                        as.state.order.push( '2' );
                        expect( val1 ).eql( "1_3" );
                        expect( val2 ).eql( "yes" );
                        as.success();
                    },
                ).add(
                    function( as ) {
                        as.state.order.push( '3' );
                    },
                    function( as, err ) {
                        as.state.order.push( '3e' );
                        expect( err ).eql( "InternalError" );
                        as.success();
                    },
                );
                as.add(
                    function( as ) {
                        as.state.order.push( '4' );
                        as.add( function( as ) {
                            as.state.order.push( '4_1' );
                            as.add( function( as ) {
                                as.state.order.push( '4_2' );
                            } );
                        } );
                    },
                    function( as, err ) {
                        as.state.order.push( '4e' );
                        expect( err ).eql( "InternalError" );
                        as.success();
                    },
                );
                as.add(
                    function( as ) {
                        as.state.order.push( '5' );
                        as.add(
                            function( as ) {
                                as.state.order.push( '5_1' );
                                as.add(
                                    function( as ) {
                                        as.state.order.push( '5_2' );
                                        expect( undefined ).eql( "InternalError" );
                                    },
                                    function( as, err ) {
                                        as.state.order.push( '5_2e' );
                                        as.add(
                                            function( as ) {
                                                as.state.order.push( '5_3' );
                                                expect( err ).eql( "InternalError" );
                                            },
                                            function( as, err ) {
                                                as.state.order.push( '5_3e' );
                                            },
                                        );
                                    },
                                );
                            },
                            function( as, err ) {
                                as.state.order.push( '5_1e' );
                            },
                        );
                    },
                    function( as, err ) {
                        as.state.order.push( '5e' );
                        as.success();
                    },
                );

                as.execute();
                async_steps.AsyncToolTest.run();
                expect( as.state.order ).eql( [
                    '1',
                    '1_1',
                    '1_1e',
                    '1_2',
                    '1_2e',
                    '1_3',
                    '2',
                    '3'/*, '3e'*/,
                    '4',
                    '4_1',
                    '4_2'/*, '4e'*/,
                    '5',
                    '5_1',
                    '5_2',
                    '5_2e',
                    '5_3',
                    '5_3e',
                    '5_1e',
                    '5e',
                ] );
            } );

            if ( !production_mode ) {
                it( 'should fail on add in execution', function() {
                    var as = this.as;

                    as.add( function( as ) {
                        as.waitExternal();
                    } );
                    as.execute();

                    assert.throws(
                        function() {
                            as.add( function( as ) {} );
                        }, 'InternalError' );

                    async_steps.AsyncToolTest.run();
                } );

                it( 'should fail on invalid step func', function() {
                    var as = this.as;

                    assert.throws(
                        function() {
                            as.add( function() {} );
                        }, 'InternalError' );

                    as.add( function( as ) {} );
                    as.add( function( as, val ) {} );
                    as.cancel();
                } );

                it( 'should fail on invalid error handler', function() {
                    var as = this.as;

                    assert.throws(
                        function() {
                            as.add(
                                function( as ) {},
                                function() {},
                            );
                        }, 'InternalError' );

                    assert.throws(
                        function() {
                            as.add(
                                function( as ) {},
                                function( as ) {},
                            );
                        }, 'InternalError' );

                    assert.throws(
                        function() {
                            as.add(
                                function( as ) {},
                                function( as, error, val ) {},
                            );
                        }, 'InternalError' );

                    as.add( function( as ) {}, function( as, error ) {} );
                    as.cancel();
                } );
            }
        },
    );
    describe(
        '#parallel()', function() {
            it( "should add steps sequentially", function() {
                var as = this.as;

                as.parallel(
                    function( as, err ) {
                        as.success();
                    },
                );

                as.parallel();
                as.add( function( as ) {
                    as.success();
                } );

                expect( as._queue.length ).equal( 3 );
                expect( as._queue[0][0] ).be.instanceof( Function );
                expect( as._queue[0][1] ).be.instanceof( Function );
                expect( as._queue[1][0] ).be.instanceof( Function );
                assert.isUndefined( as._queue[1][1] );

                as.execute();
                async_steps.AsyncToolTest.run();
            } );

            it( "should run in parallel", function() {
                var as = this.as;

                as.state.order = [];

                as.parallel(
                    function( as, err ) {
                        console.dir( as );
                    } )
                    .add( function( as ) {
                        as.state.order.push( 1 );
                        as.add( break_burst );
                        as.add( function( as ) {
                            as.state.order.push( 4 );
                            as.success();
                        } );
                    } )
                    .add( function( as ) {
                        as.state.order.push( 2 );
                        as.add( break_burst );
                        as.add( function( as ) {
                            as.state.order.push( 5 );
                            as.success();
                        } );
                    } )
                    .add( function( as ) {
                        as.state.order.push( 3 );
                        as.add( break_burst );
                        as.add( function( as ) {
                            as.state.order.push( 6 );
                            as.success();
                        } );
                    } );
                as.add( function( as ) {
                    as.state.order.push( 7 );
                    as.success();
                } );

                as.execute();
                async_steps.AsyncToolTest.run();
                expect( as.state.order ).eql( [
                    1,
                    2,
                    3,
                    4,
                    5,
                    6,
                    7,
                ] );
            } );

            it( "should run in parallel (inner)", function() {
                var as = this.as;

                as.state.order = [];

                as.add( function( as ) {
                    as.parallel( function( as, err ) {
                        console.dir( err );
                    } )
                        .add( function( as ) {
                            as.state.order.push( 1 );
                            as.add( break_burst );
                            as.add( function( as ) {
                                as.state.order.push( 4 );
                                as.success();
                            } );
                        } )
                        .add( function( as ) {
                            as.state.order.push( 2 );
                            as.add( break_burst );
                            as.add( function( as ) {
                                as.state.order.push( 5 );
                                as.success();
                            } );
                        } )
                        .add( function( as ) {
                            as.state.order.push( 3 );
                            as.add( break_burst );
                            as.add( function( as ) {
                                as.state.order.push( 6 );
                                as.success();
                            } );
                        } );
                } );
                as.add( function( as ) {
                    as.state.order.push( 7 );
                    as.success();
                } );


                as.execute();
                async_steps.AsyncToolTest.run();
                expect( as.state.order ).eql( [
                    1,
                    2,
                    3,
                    4,
                    5,
                    6,
                    7,
                ] );
            } );

            it( "should cancel on error in parallel (inner)", function() {
                var as = this.as;

                as.state.order = [];

                as.add( function( as ) {
                    as.parallel(
                        function( as, err ) {
                            if ( err === 'MyError' ) as.success();
                        } )
                        .add( function( as ) {
                            as.state.order.push( 1 );
                            as.add( break_burst );
                            as.add( function( as ) {
                                as.state.order.push( 4 );
                                as.success();
                            } );
                        } )
                        .add( function( as ) {
                            as.state.order.push( 2 );
                            as.add( break_burst );
                            as.add( function( as ) {
                                as.state.order.push( 5 );
                                as.error( 'MyError' );
                            } );
                        } )
                        .add( function( as ) {
                            as.state.order.push( 3 );
                            as.add( break_burst );
                            as.add( function( as ) {
                                as.state.order.push( 6 );
                                as.success();
                            } );
                        } );
                } );
                as.add( function( as ) {
                    as.state.order.push( 7 );
                    as.success();
                } );


                as.execute();
                async_steps.AsyncToolTest.run();
                expect( as.state.order ).eql( [
                    1,
                    2,
                    3,
                    4,
                    5,
                    7,
                ] );
            } );

            it( "should cancel on cancel in parallel (inner)", function() {
                var as = this.as;

                as.state.order = [];

                as.add( function( as ) {
                    as.parallel(
                        function( as, err ) {
                            console.dir( err );

                            if ( err === 'MyError' ) as.success();
                        } )
                        .add( function( as ) {
                            as.state.order.push( 1 );
                            as.add( break_burst );
                            as.add( function( as ) {
                                as.state.order.push( 4 );
                                as.success();
                            } );
                        } )
                        .add( function( as ) {
                            as.state.order.push( 2 );
                            as.add( break_burst );
                            as.add( function( as ) {
                                as.state.order.push( 5 );
                                as.success();
                            } );
                        } )
                        .add( function( as ) {
                            as.state.order.push( 3 );
                            as.add( break_burst );
                            as.add( function( as ) {
                                as.state.order.push( 6 );
                                as.success();
                            } );
                        } );
                } );
                as.add( function( as ) {
                    as.state.order.push( 7 );
                    as.success();
                } );


                as.execute();
                expect( as.state.order ).eql( [
                    1,
                    2,
                    3,
                ] );

                // burst
                async_steps.AsyncToolTest.nextEvent();
                async_steps.AsyncToolTest.nextEvent();
                async_steps.AsyncToolTest.nextEvent();

                // step 4
                async_steps.AsyncToolTest.nextEvent();

                as.cancel();

                async_steps.AsyncToolTest.run();
                expect( as.state.order ).eql( [
                    1,
                    2,
                    3,
                    4,
                ] );
            } );

            it( "should not loose error_info (bug #1)", function() {
                var as = this.as;

                as.add( function( as ) {
                    as.parallel( function( as, err ) {
                        expect( err ).equal( "MyError" );
                        expect( as.state.error_info ).equal( "MyInfo" );
                    } )
                        .add( function( as ) {
                        } )
                        .add( function( as ) {
                            as.error( "MyError", "MyInfo" );
                        } )
                        .add( function( as ) {
                        } );
                } );
                as.add( function( as ) {
                    expect( false ).be.true;
                } );


                as.execute();
                async_steps.AsyncToolTest.run();
            } );
        },
    );
    describe(
        '#success()', function() {
            it( 'should work', function() {
                var as = this.as;

                as.state.second_called = false;
                as.add(
                    break_burst,
                    function( as, error ) {
                        expect( error ).equal( "Does not work" );
                    },
                ).add(
                    function( as ) {
                        as.state.second_called = true;
                        as.success();
                    },
                );

                as.execute();
                expect( as.state.second_called ).be.false;
                assertHasEvents();

                // burst
                async_steps.AsyncToolTest.nextEvent();
                expect( as.state.second_called ).be.false;
                assertHasEvents();

                async_steps.AsyncToolTest.nextEvent();
                expect( as.state.second_called ).be.true;

                assertNoEvents();
            } );

            it( 'should work in onerror', function() {
                var as = this.as;

                as.state.second_called = false;
                as.add(
                    function( as ) {
                        as.add( break_burst );
                        as.add( ( as ) => as.error( false ) );
                    },
                    function( as, error ) {
                        as.success( 'Value1', 'Value2' );
                    },
                )
                    .add(
                        function( as, val1, val2 ) {
                            as.state.second_called = true;
                            expect( val1 ).equal( 'Value1' );
                            expect( val2 ).equal( 'Value2' );
                            as.success();
                        },
                    );

                as.execute();
                expect( as.state.second_called ).be.false;
                assertHasEvents();

                // burst
                async_steps.AsyncToolTest.nextEvent();
                expect( as.state.second_called ).be.false;
                assertHasEvents();

                async_steps.AsyncToolTest.nextEvent();
                expect( as.state.second_called ).be.true;

                assertNoEvents();
            } );

            it( 'should work in depth', function() {
                var as = this.as;

                as.state.second_called = false;
                as.add(
                    function( as ) {
                        as.add( function( as ) {
                            as.success();
                        } );
                    },
                    function( as, error ) {
                        console.dir( as );
                        expect( error ).equal( "Does not work" );
                    },
                );
                as.add( break_burst );
                as.add(
                    function( as ) {
                        as.state.second_called = true;
                        as.success();
                    },
                );

                as.execute();
                expect( as.state.second_called ).be.false;
                assertHasEvents();

                // burst
                async_steps.AsyncToolTest.nextEvent();
                expect( as.state.second_called ).be.false;
                assertHasEvents();

                async_steps.AsyncToolTest.nextEvent();
                expect( as.state.second_called ).be.true;

                assertNoEvents();
            } );

            it( 'should fail on invalid success', function() {
                var as = this.as;

                assert.throws(
                    function() {
                        as._handle_success();
                    }, 'InternalError' );
            } );

            it( 'should disables timeout', function() {
                var as = this.as;

                as.add(
                    function( as ) {
                        as.setTimeout( 1000 );
                        as.success();
                    } );

                as.execute();
                assertNoEvents();
            } );

            it( 'should fail on success with inner steps', function() {
                var as = this.as;

                as.state.executed = false;

                as.add(
                    function( as ) {
                        as.add( function( as ) {
                            as.error( 'MyError' );
                        } );
                        as.success();
                    },
                    function( as, err ) {
                        as.state.executed = true;
                        expect( err ).be.equal( 'InternalError' );
                    },
                );

                as.execute();
                async_steps.AsyncToolTest.run();
                expect( as.state.executed ).be.true;
            } );

            it( 'should be possible to make async success', function() {
                var as = this.as;
                var _this = this;

                as.state.myerror = false;
                as.state.executed = false;

                as.add(
                    function( as ) {
                        async_steps.AsyncToolTest.callLater( function() {
                            as.success();
                        } );
                        as.waitExternal();
                    },
                    function( as, err ) {
                        as.state.myerror = true;
                    },
                );
                as.add( function( as ) {
                    as.state.executed = true;
                    as.success();
                } );

                as.execute();

                // async success
                async_steps.AsyncToolTest.nextEvent();
                expect( as.state.executed ).be.false;
                assertHasEvents();

                // continue
                async_steps.AsyncToolTest.nextEvent();
                assertNoEvents();

                expect( as.state.myerror ).be.false;
                expect( as.state.executed ).be.true;
            } );

            it( 'should ignore unexpected success', function() {
                var as = this.as;
                var _this = this;
                var root_as = as;

                as.state.myerror = false;
                as.state.executed = false;

                as.add(
                    function( as ) {
                        async_steps.AsyncToolTest.callLater( function() {
                            if ( production_mode ) {
                                try {
                                    as.success();
                                    throw new Error( 'Fail' );
                                } catch ( e ) {
                                    expect( e.message ).not.equal( 'Fail' );
                                }
                            } else {
                                assert.throws( function() {
                                    as.success();
                                }, Error, 'InternalError' );
                            }
                        } );

                        as.success();
                    },
                    function( as, err ) {
                        console.log( err );
                        as.state.myerror = true;
                    },
                );
                as.add( break_burst );
                as.add(
                    function( as ) {
                        as.state.executed = true;
                        as.success();
                    },
                    function( as, err ) {
                        console.dir( err );
                    },
                );

                as.execute();
                assertHasEvents();
                async_steps.AsyncToolTest.nextEvent();

                // burst
                async_steps.AsyncToolTest.nextEvent();
                expect( as.state.executed ).be.false;
                assertHasEvents();

                async_steps.AsyncToolTest.nextEvent();
                assertNoEvents();

                expect( as.state.myerror ).be.false;
                expect( as.state.executed ).be.true;
            } );
        },
    );
    describe(
        '#successStep()', function() {
            it( 'should work', function() {
                var as = this.as;

                as.state.second_called = false;
                as.successStep( 'a', 'b', 'c' );
                as.add(
                    function( as, a, b, c ) {
                        expect( a ).equal( 'a' );
                        expect( b ).equal( 'b' );
                        expect( c ).equal( 'c' );

                        as.successStep( 'abc' );
                        as.add( function( as, abc ) {
                            expect( abc ).to.equal( 'abc' );
                        } );
                        as.add( break_burst );
                        as.add( ( as ) => as.successStep() );
                        as.successStep( 1, 2, 3 );
                    },
                    function( as, error ) {
                        console.log( as.state.last_exception );
                        expect( error ).equal( "Does not work" );
                    },
                ).add(
                    function( as, a, b, c ) {
                        expect( [ a, b, c ] ).to.eql( [ 1, 2, 3 ] );
                        as.state.second_called = true;
                        as.success();
                    },
                );
                as.successStep();

                as.execute();

                // first step + burst break;
                expect( as.state.second_called ).be.false;
                assertHasEvents();

                // burst async complete
                async_steps.AsyncToolTest.nextEvent();
                assertHasEvents();
                expect( as.state.second_called ).be.false;
                // continue to end
                async_steps.AsyncToolTest.nextEvent();
                expect( as.state.second_called ).be.true;
                assertNoEvents();
            } );
        },
    );
    describe(
        '#error()', function() {
            it( 'should throw error', function() {
                var as = this.as;

                assert.isUndefined( as.state.error_info );

                assert.throws( function() {
                    as.error( "MyError" );
                }, Error, "MyError" );

                assert.isUndefined( as.state.error_info );

                assert.throws( function() {
                    as.error( "MyError", 'My Info' );
                }, Error, "MyError" );

                expect( as.state.error_info ).equal( 'My Info' );
            } );


            it( 'should be possible to change error code', function() {
                var as = this.as;

                as.add(
                    function( as ) {
                        as.add(
                            function( as ) {
                                as.error( 'Orig' );
                            },
                            function( as, err ) {
                                expect( err ).eql( 'Orig' );
                                as.error( 'Changed' );
                            },
                        );
                    },
                    function( as, err ) {
                        expect( err ).eql( 'Changed' );
                    },
                );

                as.execute();
                async_steps.AsyncToolTest.run();
            } );

            it( 'should be possible to make async error', function() {
                var as = this.as;
                var _this = this;

                as.state.myerror = false;

                as.add(
                    function( as ) {
                        async_steps.AsyncToolTest.callLater( function() {
                            try {
                                as.error( 'MyError' );
                            } catch ( e ) {
                                // pass
                            }
                        } );
                        as.waitExternal();
                    },
                    function( as, err ) {
                        as.state.myerror = ( err === 'MyError' );
                    },
                ).
                    add( function( as ) {
                        as.success();
                    } );

                as.execute();
                async_steps.AsyncToolTest.nextEvent();
                assertNoEvents();

                expect( as.state.myerror ).be.true;
            } );

            it( 'should be possible to make async error in execute', function() {
                var as = this.as;
                var _this = this;
                var root_as = as;

                as.state.myerror = false;
                as.state.executed = false;

                as.add(
                    break_burst,
                    ( as, err ) => {
                        as.state.myerror = ( err === 'MyError' );
                    },
                );
                as.add( function( as ) {
                    as.state.executed = true;
                    as.success();
                } );

                as.execute();

                try {
                    as.error( 'MyError' );
                } catch ( e ) {
                    // pass
                }

                async_steps.AsyncToolTest.nextEvent();
                assertNoEvents();

                expect( as.state.myerror ).be.true;
                expect( as.state.executed ).be.false;
            } );

            it( 'should ignore unexpected error', function() {
                var as = this.as;
                var _this = this;
                var root_as = as;

                as.state.myerror = false;
                as.state.executed = false;

                as.add(
                    function( as ) {
                        async_steps.AsyncToolTest.callLater( function() {
                            if ( production_mode ) {
                                try {
                                    as.error( 'MyError' );
                                } catch ( e ) {
                                    expect( e.message ).not.equal( 'MyError' );
                                }
                            } else {
                                assert.throws( function() {
                                    as.error( 'MyError' );
                                }, Error, 'InternalError' );
                            }
                        } );

                        as.success();
                    },
                    function( as, err ) {
                        as.state.myerror = ( err === 'MyError' );
                    },
                );
                as.add( break_burst );
                as.add( function( as ) {
                    as.state.executed = true;
                    as.success();
                } );

                as.execute();
                async_steps.AsyncToolTest.nextEvent();
                assertHasEvents();
                async_steps.AsyncToolTest.nextEvent();
                assertHasEvents();
                async_steps.AsyncToolTest.nextEvent();
                assertNoEvents();

                expect( as.state.myerror ).be.false;
                expect( as.state.executed ).be.true;
            } );
        },
    );
    describe(
        '#setTimeout()', function() {
            it( 'should properly timeout, calling cancel', function( done ) {
                var done_wrap = function( order ) {
                    try {
                        expect( order ).eql( [
                            '1',
                            '2',
                            '3',
                            '4',
                        ] );
                        done();
                    } catch ( e ) {
                        done( e );
                    }
                };

                const as = new async_steps.AsyncSteps( null, async_steps.AsyncTool );

                as.state.order = [];
                as.add(
                    function( as ) {
                        as.state.order.push( '1' );
                        as.setTimeout( 20 );
                        as.setTimeout( 20 ); // reset
                        as.add( function( as ) {
                            as.state.order.push( '2' );
                            as.setTimeout( 5 );
                        } );
                        as.setCancel( function( as ) {
                            as.state.order.push( '3' );
                        } );
                    },
                    function( as, err ) {
                        as.state.order.push( '4' );
                        expect( err ).equal( 'Timeout' );
                        assert.isUndefined( as.state.error_info );
                        done_wrap( as.state.order );
                    },
                );

                as.execute();
            } );
        },
    );
    describe(
        '#setCancel()', function() {
            it( 'should cancel in reverse order silently', function() {
                var as = this.as;

                as.state.order = [];
                as.add(
                    function( as ) {
                        as.state.order.push( '1' );
                        as.add( function( as ) {
                            as.state.order.push( '2' );
                            as.setCancel( function( as ) {
                                as.state.order.push( '2c' );
                            } );
                            as.add( function( as ) {
                                as.state.order.push( '3' );
                                as.setCancel( function( as ) {
                                    as.state.order.push( '3c' );
                                } );
                            } );
                        } );
                        as.setCancel( function( as ) {
                            as.state.order.push( '1c' );
                        } );
                    },
                    function( as, err ) {
                        as.state.order.push( 'e' );
                    },
                );

                as.execute();
                async_steps.AsyncToolTest.run();
                expect( as.state.order ).eql( [
                    '1',
                    '2',
                    '3',
                ] );
                as.cancel();
                async_steps.AsyncToolTest.run();
                expect( as.state.order ).eql( [
                    '1',
                    '2',
                    '3',
                    '3c',
                    '2c',
                    '1c',
                ] );
            } );
        },
    );
    describe(
        '#copyFrom()', function() {
            beforeEach( function() {
                this.as = async_steps();
            } );

            it( 'should copy steps and state', function() {
                var as = this.as;

                as.state.old_v = false;
                as.state.executed = false;
                as.state.parallel1 = false;
                as.state.parallel2 = false;

                var model_as = async_steps();

                model_as.state.new_v = true;
                model_as.state.old_v = true;

                model_as.add(
                    function( as ) {
                    },
                    function( as, error ) {
                        as.success();
                    },
                ).add( function( as ) {
                    as.state.executed = true;
                    as.success();
                } );

                model_as.parallel()
                    .add( function( as ) {
                        as.state.parallel1 = true;
                        as.success();
                    } )
                    .add( function( as ) {
                        as.state.parallel2 = true;
                        as.success();
                    } );

                as.copyFrom( model_as );
                expect( as.state ).have.property( 'old_v', false );
                expect( as.state ).have.property( 'new_v', true );

                as.execute();
                async_steps.AsyncToolTest.run();
                expect( as.state.executed ).be.true;
                expect( as.state.parallel1 ).be.true;
                expect( as.state.parallel2 ).be.true;

                as.state.executed = false;
                as.state.parallel1 = false;
                as.state.parallel2 = false;


                as.add( function( as ) {
                    model_as.state.new_v2 = true;
                    as.copyFrom( model_as );

                    expect( as.state ).have.property( 'old_v', false );
                    expect( as.state ).have.property( 'new_v', true );
                    expect( as.state ).have.property( 'new_v2', true );

                    var m = async_steps();

                    as.copyFrom( m );
                    m.add( function( as ) {
                        as.success();
                    } );
                    as.copyFrom( m );
                } );

                as.execute();
                async_steps.AsyncToolTest.run();
                expect( as.state.executed ).be.true;
                expect( as.state.parallel1 ).be.true;
                expect( as.state.parallel2 ).be.true;
            } );
        },
    );
    describe(
        '#execute()', function() {
            it( 'should silently exit', function() {
                var as = this.as;

                as.execute();
                assertNoEvents();
            } );

            it( 'should trigger ASP sanity check', function() {
                var as = this.as;

                as.state.error_code = '';

                as.add(
                    function( as ) {
                        var oas = as;

                        as.add( function( as ) {
                            oas.success();
                        } );
                    },
                    function( as, err ) {
                        as.state.error_code = err;
                    },
                );

                as.execute();
                async_steps.AsyncToolTest.run();
                expect( as.state.error_code ).be.equal( 'InternalError' );
                expect( as.state.error_info ).equal(
                    production_mode ? 'Invalid success() call' : 'Invalid call (sanity check)' );
            } );

            it( 'should implicitly success', function() {
                var as = this.as;

                as.add(
                    function( as ) {
                        as.state.ok = true;
                    },
                );
                as.execute();
                async_steps.AsyncToolTest.run();
                assertNoEvents();

                expect( as.state.ok ).be.true;
            } );
        },
    );
    describe(
        '#cancel()', function() {
            it( 'should cancel execution', function() {
                var as = this.as;

                as.add( function( as ) {
                    as.success();
                } ).add( function( as ) {
                    as.success();
                } );

                as.execute();
                as.cancel();
                assertNoEvents();
            } );

            it( 'should cancel timeout', function() {
                var as = this.as;

                as.add( function( as ) {
                    as.setTimeout( 1000 );
                } ).add( function( as ) {
                    as.success();
                } );

                as.execute();
                as.cancel();
                assertNoEvents();
            } );
        },
    );

    describe(
        '#loop()', function() {
            it( 'should complex loop', function() {
                var as = this.as;
                var i = 0;
                var icheck = 1;
                var s = [];

                as.add(
                    function( as ) {
                        as.loop( function( as ) {
                            s.push( 'OUTER' );
                            ++i;

                            as.loop( function( as ) {
                                s.push( 'MEDIUM' );
                                expect( i ).equal( icheck );

                                as.loop( function( as ) {
                                    s.push( 'INNER1' );

                                    if ( i > 2 ) {
                                        as.break();
                                    } else if ( i == 1 ) {
                                        ++i;
                                        as.continue();
                                    }

                                    ++i;
                                }, "INNER1" );

                                as.loop( function( as ) {
                                    s.push( 'INNER2' );

                                    if ( i == 3 ) {
                                        icheck = 4;
                                        as.break( "MEDIUM" );
                                    }

                                    as.break();
                                }, "INNER2" );

                                as.loop( function( as ) {
                                    s.push( 'INNER3' );
                                    ++i;
                                    as.break( "OUTER" );
                                }, "INNER3" );
                            }, "MEDIUM" );
                        }, "OUTER" );
                    },
                    function( as, err ) {
                        console.dir( s );
                        console.dir( err + ": " + as.state.error_info );
                    },
                );

                as.execute();
                async_steps.AsyncToolTest.run();
                assertNoEvents();

                expect( s ).eql( [
                    'OUTER',
                    'MEDIUM',
                    'INNER1',
                    'INNER1',
                    'INNER1',
                    'INNER2',
                    'OUTER',
                    'MEDIUM',
                    'INNER1',
                    'INNER2',
                    'INNER3',
                ] );

                expect( i ).equal( 5 );
            } );

            it( 'should forward regular error', function() {
                var as = this.as;
                var reserr;

                as.add(
                    function( as ) {
                        as.loop( function( as ) {
                            as.error( "MyError", 'Info' );
                        } );
                    },
                    function( as, err ) {
                        reserr = err;
                    },
                );

                as.execute();
                async_steps.AsyncToolTest.run();
                assertNoEvents();

                expect( reserr ).equal( 'MyError' );
                expect( as.state.error_info ).equal( 'Info' );
            } );

            it( 'should continue outer loop', function() {
                var as = this.as;
                var reserr = null;

                as.add(
                    function( as ) {
                        var i = 0;

                        as.loop( function( as ) {
                            ++i;

                            if ( i === 3 ) {
                                as.break();
                            }

                            as.loop( function( as ) {
                                ++i;
                                as.continue( "OUTER" );
                            } );
                        }, "OUTER" );
                    },
                    function( as, err ) {
                        reserr = err;
                    },
                );

                as.execute();
                async_steps.AsyncToolTest.run();
                assertNoEvents();

                assert.equal( reserr, null );
            } );

            it( 'should repeat count times', function() {
                var as = this.as;
                var reserr = null;
                var i = 0;

                as.add(
                    function( as ) {
                        as.repeat( 3, function( as ) {
                            ++i;

                            if ( i == 2 ) {
                                as.continue();
                            }
                        } );
                    },
                    function( as, err ) {
                        reserr = err;
                    },
                );

                as.execute();
                async_steps.AsyncToolTest.run();
                assertNoEvents();

                assert.equal( reserr, null );
                expect( i ).equal( 3 );
            } );

            it( 'should repeat break', function() {
                var as = this.as;
                var reserr = null;
                var i = 0;

                as.add(
                    function( as ) {
                        as.repeat( 3, function( as ) {
                            if ( i == 2 ) {
                                as.break();
                            }

                            ++i;
                        } );
                    },
                    function( as, err ) {
                        reserr = err;
                    },
                );

                as.execute();
                async_steps.AsyncToolTest.run();
                assertNoEvents();

                assert.equal( reserr, null );
                expect( i ).equal( 2 );
            } );

            it( 'should repeat zero times', function() {
                var as = this.as;
                var reserr = null;
                var i = 0;

                as.add(
                    function( as ) {
                        as.repeat( 0, function( as ) {
                            ++i;
                        } );
                    },
                    function( as, err ) {
                        reserr = err;
                    },
                );

                as.execute();
                async_steps.AsyncToolTest.run();
                assertNoEvents();

                assert.equal( reserr, null );
                expect( i ).equal( 0 );
            } );

            it( 'should forEach array', function() {
                var as = this.as;
                var reserr = null;
                var i = 0;

                as.forEach( [], function( as ) {
                    ++i;
                } );
                as.add(
                    function( as ) {
                        as.forEach( [
                            1,
                            2,
                            3,
                        ], function( as, k, v ) {
                            assert.equal( v, k + 1 );
                            i += v;
                        } );
                    },
                    function( as, err ) {
                        reserr = err;
                    },
                );

                as.execute();
                async_steps.AsyncToolTest.run();
                assertNoEvents();

                assert.equal( reserr, null );
                expect( i ).equal( 6 );
            } );

            it( 'should forEach object', function() {
                var as = this.as;
                var reserr = null;
                var i = 0;

                as.forEach( {}, function( as ) {
                    ++i;
                } );
                as.add(
                    function( as ) {
                        as.forEach( {
                            a: 1,
                            b: 2,
                            c: 3,
                        }, function( as, k, v ) {
                            if ( v == 1 ) assert.equal( k, "a" );

                            if ( v == 2 ) assert.equal( k, "b" );

                            if ( v == 3 ) assert.equal( k, "c" );

                            i += v;
                        } );
                    },
                    function( as, err ) {
                        reserr = err;
                    },
                );

                as.execute();
                async_steps.AsyncToolTest.run();
                assertNoEvents();

                assert.equal( reserr, null );
                expect( i ).equal( 6 );
            } );

            if ( !in_browser ) {
                it( 'should forEach Map', function() {
                    var as = this.as;
                    var reserr = null;
                    var i = 0;

                    as.forEach( new Map, function( as ) {
                        ++i;
                    } );
                    as.add(
                        function( as ) {
                            as.forEach( new Map( [
                                [ 'a', 1 ],
                                [ 'b', 2 ],
                                [ 'c', 3 ],
                            ] ), function( as, k, v ) {
                                if ( v == 1 ) assert.equal( k, "a" );

                                if ( v == 2 ) assert.equal( k, "b" );

                                if ( v == 3 ) assert.equal( k, "c" );

                                i += v;
                            } );
                        },
                        function( as, err ) {
                            reserr = err;
                        },
                    );

                    as.execute();
                    async_steps.AsyncToolTest.run();
                    assertNoEvents();

                    assert.equal( reserr, null );
                    expect( i ).equal( 6 );
                } );
            }

            it( 'should continue after break()+next error()', function() {
                // Spotted bug after burst optimization.
                var as = this.as;
                var _this = this;
                var root_as = as;

                as.state.myerror = false;
                as.state.executed = false;

                as.add(
                    ( as ) => {
                        as.loop( ( as ) => as.break() );
                        as.add( ( as ) => {
                            as.error( 'MyError' );
                        } );
                    },
                    ( as, err ) => {
                        as.state.myerror = ( err === 'MyError' );
                        as.success();
                    },
                );
                as.add( function( as ) {
                    as.state.executed = true;
                    as.success();
                } );

                as.execute();

                async_steps.AsyncToolTest.run();

                expect( as.state.myerror ).be.true;
                expect( as.state.executed ).be.true;
            } );
        },
    );
    describe(
        '#state()', function() {
            it( 'should return state', function() {
                var as = this.as;

                expect( as.state() ).equal( as.state );
            } );

            it( 'should set error_info, last_exception and async_stack', function() {
                var as = this.as;
                var step_func;
                var error_func;

                as.add(
                    step_func = function( as ) {
                        if ( !production_mode ) {
                            const async_stack = as._root._exec_stack;
                            expect( async_stack[async_stack.length - 1] ).eql( step_func );
                        }

                        as.error( 'FirstError', 'FirstInfo' );
                    },
                    error_func = function( as, err ) {
                        try {
                            const { state } = as;
                            expect( err ).equal( 'FirstError' );
                            expect( state.error_info ).equal( 'FirstInfo' );
                            expect( state.last_exception.message ).equal( 'FirstError' );

                            if ( !production_mode ) {
                                const { async_stack } = state;
                                expect( async_stack[async_stack.length - 1] ).eql( error_func );
                            }
                        } catch( e ) {
                            console.log( e );
                            throw e;
                        }

                        as.error( 'SecondError', 'SecondInfo' );
                    },
                );
                as.execute();
                async_steps.AsyncToolTest.run();
                assertNoEvents();
                expect( as.state.error_info ).equal( 'SecondInfo' );
                expect( as.state.last_exception.message ).equal( 'SecondError' );
            } );

            it( 'should set error_info, last_exception and async_stack in async', function() {
                var as = this.as;
                var step_func;
                var error_func;

                as.add(
                    step_func = function( as ) {
                        if ( !production_mode ) {
                            const async_stack = as._root._exec_stack;
                            expect( async_stack[async_stack.length - 1] ).eql( step_func );
                        }

                        as.waitExternal();
                        async_steps.AsyncToolTest.callImmediate( () => {
                            try {
                                as.error( 'FirstError', 'FirstInfo' );
                            } catch ( _ ) {
                                // ignore
                            }
                        } );
                    },
                    error_func = function( as, err ) {
                        try {
                            const { state } = as;
                            expect( err ).equal( 'FirstError' );
                            expect( state.error_info ).equal( 'FirstInfo' );
                            expect( state.last_exception.message ).equal( 'FirstError' );

                            if ( !production_mode ) {
                                const { async_stack } = state;
                                expect( async_stack[async_stack.length - 1] ).eql( error_func );
                            }
                        } catch( e ) {
                            console.log( e );
                            throw e;
                        }

                        as.error( 'SecondError', 'SecondInfo' );
                    },
                );
                as.execute();
                async_steps.AsyncToolTest.run();
                assertNoEvents();
                expect( as.state.error_info ).equal( 'SecondInfo' );
                expect( as.state.last_exception.message ).equal( 'SecondError' );
            } );
        },
    );

    it( 'should support chaining', function( done ) {
        var as = this.as;

        var empty_as = async_steps();
        var model_as = async_steps();

        model_as.add(
            function( as ) {
                as.state.count++;
                as
                    .add( function( as ) {
                        as.state.count++;
                    } )
                    .loop( function( as ) {
                        as.state.count++;
                        as.break();
                    } )
                    .repeat( 2, function( as ) {
                        as.state.count++;
                    } )
                    .forEach( [ 1, 2 ], function( as ) {
                        as.state.count++;
                    } )
                    .forEach( {
                        a:1,
                        b:2,
                    }, function( as ) {
                        as.state.count++;
                    } )
                    .copyFrom( empty_as )
                    .add( function( as ) {
                        as.state.count++;
                    } );
            },
            function( as, err ) {
                console.dir( err + ": " + as.state.error_info );
                console.log( as.state.last_exception );
            },
        );


        as
            .add( function( as ) {
                as.state.count++;
            } )
            .copyFrom( model_as )
            .loop( function( as ) {
                as.state.count++;
                as.break();
            } )
            .repeat( 2, function( as ) {
                as.state.count++;
            } )
            .forEach( [ 1, 2 ], function( as ) {
                as.state.count++;
            } )
            .forEach( {
                a:1,
                b:2,
            }, function( as ) {
                as.state.count++;
            } )
            .add( function( as ) {
                as.state.count++;

                try {
                    expect( as.state.count ).equal( 19 );
                    done();
                } catch ( e ) {
                    done( e );
                }
            } );

        as.state.count = 0;
        as.execute();
        async_steps.AsyncToolTest.run();
        assertNoEvents();
    } );

    describe( '#waitExternal', function() {
        it( 'should disable implicit #success()', function( done ) {
            var as = this.as;

            as.add(
                function( as ) {
                    as.waitExternal();
                    as.state.cb = function() {
                        try {
                            as.error( 'OK' );
                        } catch ( e ) {
                            // pass
                        }
                    };
                },
                function( as, err ) {
                    if ( err === 'OK' ) {
                        done();
                    } else {
                        done( as.state.last_exception );
                    }
                },
            );
            as.add( function( as ) {
                done( 'Fail' );
            } );
            as.execute();
            async_steps.AsyncToolTest.run();
            assertNoEvents();

            as.state.cb();
            async_steps.AsyncToolTest.run();
            assertNoEvents();
        } );
    } );

    describe( '#sync', function() {
        it( 'should use sync object', function( done ) {
            var as = this.as;
            var mutex = {
                sync: function( as, func, onerror ) {
                    as.add( func, onerror );
                },
            };

            as.sync(
                mutex,
                function( as ) {
                    as.sync(
                        mutex,
                        function( as ) {
                            as.error( 'Wrong' );
                        },
                        function( as, err ) {
                            if ( err === 'Wrong' ) {
                                as.error( 'OK' );
                            }
                        },
                    );

                    as.add( function( as ) {
                        done( 'Fail' );
                    } );
                },
                function( as, err ) {
                    if ( err === 'OK' ) {
                        done();
                    } else {
                        done( as.state.last_exception );
                    }
                },
            );
            as.execute();
            async_steps.AsyncToolTest.run();
            assertNoEvents();
        } );
    } );
} );

if ( typeof Promise !== 'undefined' ) {
    describe( '#await', function() {
        it( 'should support Promise', function( done ) {
            const as = async_steps();
            as.await( Promise.resolve( 123 ) )
                .add( ( as, res ) => {
                    try {
                        expect( res ).to.equal( 123 );
                    } catch ( e ) {
                        done( e );
                    }
                } );
            as.await( new Promise( ( resolve, reject ) => setTimeout( resolve, 100 ) ) );
            as.add( ( as ) => {
                as.await( Promise.resolve() );
                as.add( ( as, res ) => {
                    try {
                        expect( res ).to.equal( undefined );
                    } catch ( e ) {
                        done( e );
                    }
                } );
            } );
            as.add( ( as ) => done() );
            as.execute();
        } );

        it( 'should handle rejected Promise', function( done ) {
            const as = async_steps();
            const test_error = new Error( 'MyError' );

            try {
                as.await(
                    Promise.reject( test_error ),
                    ( as, res ) => {
                        try {
                            expect( res ).to.equal( 'PromiseReject' );
                            expect( as.state.last_exception ).to.equal( test_error );
                            as.success();
                        } catch ( e ) {
                            done( e );
                        }
                    },
                );
            } catch ( e ) {
                done( e );
            }

            as.await(
                new Promise( ( resolve, reject ) => setTimeout( reject, 100 ) ),
                ( as, res ) => {
                    try {
                        expect( res ).to.equal( 'PromiseReject' );
                        expect( as.state.last_exception.message ).to.equal( 'PromiseReject' );
                        as.success();
                    } catch ( e ) {
                        done( e );
                    }
                },
            );

            as.add(
                ( as ) => {
                    as.await(
                        Promise.reject(),
                        ( as, res ) => {
                            try {
                                expect( res ).to.equal( 'PromiseReject' );
                                as.success();
                            } catch ( e ) {
                                done( e );
                            }
                        },
                    );
                },
                ( as, err ) => {
                    done( as.state.last_exception || 'Fail' );
                },
            );
            as.add( ( as ) => {
                as.await(
                    Promise.reject( 'SomeError' ),
                    ( as, res ) => {
                        try {
                            expect( res ).to.equal( 'SomeError' );
                            as.success();
                        } catch ( e ) {
                            done( e );
                        }
                    },
                );
            } );
            as.add( ( as ) => done() );
            as.execute();
        } );

        it( 'should handle cancel', function( done ) {
            const as = async_steps();
            as.add( ( as ) => {
                as.setCancel( ( as ) => done() );
                as.add( ( as ) => {
                    as.await( new Promise( () => {} ) );
                } );
            } );
            as.add( ( as ) => done( 'Fail' ) );
            as.execute();

            setTimeout( () => as.cancel(), 100 );
        } );
    } );

    describe( '#promise', function() {
        it( 'should wrap in Promise', function( done ) {
            const as = async_steps();
            as.add( ( as ) => {
                as.add( ( as ) => {
                    as.success( 'Some result' );
                } );
            } );
            as.add( ( as, res ) => {
                as.successStep( res + ' more' );
            } );
            as.promise().then(
                ( res ) => {
                    try {
                        expect( res ).equal( 'Some result more' );
                        done();
                    } catch ( e ) {
                        done( e );
                    }
                } );
        } );

        it( 'should handle error as Promise reject', function( done ) {
            const as = async_steps();
            as.add( ( as ) => {
                as.add( ( as ) => {
                    as.success( 'Some result' );
                } );
            } );
            as.add( ( as, res ) => {
                as.error( res + ' more' );
            } );
            as.promise().catch(
                ( err ) => {
                    try {
                        expect( err.message ).equal( 'Some result more' );
                        done();
                    } catch ( e ) {
                        done( e );
                    }
                } );
        } );
    } );

    describe( '#newInstance', function() {
        it( 'should create on root object', function( done ) {
            const as = async_steps();
            const as2 = as.newInstance();
            expect( as2 ).not.equal( as );
            expect( as2 ).instanceof( async_steps.AsyncSteps );
            as2.add( ( as ) => done() ).execute();
        } );

        it( 'should create on ASP object', function( done ) {
            const as = async_steps();
            as.add( ( as ) => {
                try {
                    const as2 = as.newInstance();
                    expect( as2 ).not.equal( as._root );
                    expect( as2 ).instanceof( async_steps.AsyncSteps );
                    as2.add( ( as ) => done() ).execute();
                } catch ( e ) {
                    done( e );
                }
            } );
            as.execute();
        } );
    } );
}

describe( '.assertAS', function( done ) {
    it( "should pass with valid objects", function() {
        const as = async_steps();

        async_steps.assertAS( as );
        async_steps.assertAS( as.parallel() );
        as.add( ( as ) => {
            async_steps.assertAS( as );
            async_steps.assertAS( as.parallel() );
        } );
        as.add( ( as ) => done() );

        as.execute();
    } );

    it( "should detect errors", function( done ) {
        for ( let v of [ undefined, null, 1, 'a', {}, [], function() {} ] ) {
            try {
                async_steps.assertAS( v );
                done( 'Fail' );
                return;
            } catch ( e ) {
                expect( e.message ).equal( `Not an instance of AsyncSteps: ${v}` );
            }
        }

        done();
    } );

    it( "should have exports", function() {
        if ( 'ISync' in async_steps ) {
            expect( async_steps ).to.have.keys( [
                'ISync',
                'Mutex',
                'Throttle',
                'Limiter',
                'testcase',

                'Errors',
                'AsyncSteps',
                'ActiveAsyncTool',
                'AsyncTool',
                'AsyncToolTest',
                'FutoInError',
                'assertAS',
                'installAsyncToolTest',
                'isProduction',
            ] );
        } else {
            expect( async_steps ).to.have.keys( [
                'Errors',
                'AsyncSteps',
                'ActiveAsyncTool',
                'AsyncTool',
                'AsyncToolTest',
                'FutoInError',
                'assertAS',
                'installAsyncToolTest',
                'isProduction',
            ] );
        }
    } );
} );

if ( typeof window !== 'undefined' && window.$as ) {
    describe(
        'FutoIn.AsyncSteps', function() {
            it( 'should be set', function() {
                expect( window.$as.AsyncSteps ).equal( window.FutoIn.AsyncSteps );
                expect( window.FutoIn.$as ).equal( window.futoin.$as );
            } );
        },
    );
}
