
//
var async_steps = require('../lib/asyncsteps');
var assert = require('assert');

describe( 'AsyncTool', function(){
    describe(
        '#callLater()', function(){
            it("should call later", function( done ){
                async_steps.AsyncTool.callLater( done );
            });
            
            it("should call later timeout", function( done ){
                var t = process.hrtime();
                t = t[0]*1e3 + ( t[1] / 1e6 );
                
                async_steps.AsyncTool.callLater(
                    function(){
                        var s = process.hrtime();
                        s = s[0]*1e3 + ( s[1] / 1e6 );
                        s.should.be.greaterThan( t + 9 )
                        done();
                    },
                    10
                );
            });
        }
    );
    describe(
        '#cancelCall()', function(){
            it("should cancel call", function( done ){
                var h = async_steps.AsyncTool.callLater( done );
                async_steps.AsyncTool.cancelCall( h );
                done();
            });
            
            it("should cancel call timeout", function( done ){
                var h = async_steps.AsyncTool.callLater( done, 100 );
                async_steps.AsyncTool.cancelCall( h );
                done();
            });
        }
    );
    
});

describe( 'AsyncToolTest', function(){
    
    before(function(){
        async_steps.installAsyncToolTest();
    });
    
    after(function(){
        async_steps.installAsyncToolTest( false );
    });
    
    describe(
        '#callLater()', function(){
            it("should call later", function( done ){
                async_steps.AsyncTool.callLater( done );
                async_steps.AsyncTool.nextEvent();
            });
            
            it("should call later timeout", function( done ){
                async_steps.AsyncTool.callLater(
                    function(){
                        done();
                    },
                    100
                );
                async_steps.AsyncTool.run();
            });
            
            it('should insert event', function(){
                var f = function( as ){};
                async_steps.AsyncTool.callLater( function(){}, 100 );
                async_steps.AsyncTool.callLater( f, 10 );
                
                assert.equal( async_steps.AsyncTool.getEvents()[0].f, f );
                async_steps.AsyncTool.resetEvents();
                async_steps.AsyncTool.getEvents().length.should.equal( 0 );
            });
        }
    );
    describe(
        '#cancelCall()', function(){
            it("should cancel call", function( done ){
                var h = async_steps.AsyncTool.callLater( done );
                async_steps.AsyncTool.hasEvents().should.be.true;
                async_steps.AsyncTool.cancelCall( h );
                async_steps.AsyncTool.hasEvents().should.be.false;
                done();
            });
            
            it("should cancel call timeout", function( done ){
                var h = async_steps.AsyncTool.callLater( done, 100 );
                async_steps.AsyncTool.hasEvents().should.be.true;
                async_steps.AsyncTool.cancelCall( h );
                async_steps.AsyncTool.hasEvents().should.be.false;
                done();
            });
        }
    );
    
});

describe( 'AsyncSteps', function(){
    before(function(){
        async_steps.installAsyncToolTest();
    });
    
    after(function(){
        async_steps.installAsyncToolTest( false );
    });
    
    beforeEach(function( done ){
        this.as = async_steps();
        done();
    });
    
    function assertNoEvents()
    {
        async_steps.AsyncTool.getEvents().length.should.equal( 0 );
    }
    
    function assertHasEvents()
    {
        async_steps.AsyncTool.getEvents().length.should.be.above( 0 );
    }
    
    describe(
        '#add()', function(){
            it("should add steps sequentially",function(){
                var as = this.as;
                as.add(
                    function( as ){ as.success(); },
                    function( as,err ){ as.success(); }
                ).add(
                    function( as ){ as.success(); }
                );
                
                as._queue.length.should.equal(2);
                as._queue[0][0].should.be.instanceof( Function );
                as._queue[0][1].should.be.instanceof( Function );
                as._queue[1][0].should.be.instanceof( Function );
                assert.equal(as._queue[1][1], undefined );
            });
            
            it("should call steps and errors in correct order",function(){
                var as = this.as;
                as.state.order = [];
                as.add(
                    function( as ){
                        as.state.order.push( '1' );
                        as.add(
                            function( as ){
                                as.state.order.push( '1_1' );
                                as.error( "MyError" );
                            },
                            function( as, err ){
                                as.state.order.push( '1_1e' );
                                err.should.eql( "MyError" );
                                as.success( '1_1e' );
                            }
                        );
                        as.add(
                            function( as, val ){
                                as.state.order.push( '1_2' );
                                val.should.eql( '1_1e' );
                                as.error( "MyError2" );
                            },
                            function( as, err ){
                                as.state.order.push( '1_2e' );
                                err.should.eql( "MyError2" );
                                as.success( '1_2e' );
                            }
                        ).add(
                            function( as, val ){
                                as.state.order.push( '1_3' );
                                val.should.eql( '1_2e' );
                                as.success( '1_3', 'yes' );
                            },
                            function( as, err ){
                                as.state.order.push( '1_3e' );
                                err.should.eql( "MyError2" );
                                as.success();
                            }
                        );
                    },
                    function( as,err ){
                        as.state.order.push( '1e' );
                        as.success();
                    }
                ).add(
                    function( as, val1, val2 ){
                        as.state.order.push( '2' );
                        val1.should.eql( "1_3" );
                        val2.should.eql( "yes" );
                        as.success();
                    }
                ).add(
                    function( as ){
                        as.state.order.push( '3' );
                    },
                    function( as, err ){
                        as.state.order.push( '3e' );
                        err.should.eql( "InternalError" );
                        as.success();
                    }
                );
                as.add(
                    function( as ){
                        as.state.order.push( '4' );
                        as.add(function( as ){
                            as.state.order.push( '4_1' );
                            as.add(function( as ){
                                as.state.order.push( '4_2' );
                            });
                        });
                    },
                    function( as, err ){
                        as.state.order.push( '4e' );
                        err.should.eql( "InternalError" );
                        as.success();
                    }
                );
                
                as.execute();
                async_steps.AsyncTool.run();
                as.state.order.should.eql( [ '1', '1_1', '1_1e', '1_2', '1_2e', '1_3', '2', '3', '3e', '4', '4_1', '4_2', '4e' ] );
            });
            
            it( 'should fail on add in execution', function(){
                var as = this.as;
                
                as.add(function( as ){ as.setCancel( function(){} ) });
                as.execute();
                
                assert.throws(
                    function(){
                        as.add( function( as ){} )
                    }, 'InternalError' );
                
                async_steps.AsyncTool.run();
            });
            
            it('should fail on invalid step func', function(){
                var as = this.as;
                
                assert.throws(
                    function(){
                        as.add( function(){} );
                    }, 'InternalError' );
                
                as.add( function( as ){} );
                as.add( function( as, val ){} );
                as.cancel();
            });
            
            it('should fail on invalid error handler', function(){
                var as = this.as;
                
                assert.throws(
                    function(){
                        as.add(
                            function( as ){},
                            function(){}
                        );
                    }, 'InternalError' );
                
                assert.throws(
                    function(){
                        as.add(
                            function( as ){},
                            function( as ){}
                        );
                    }, 'InternalError' );
                
                assert.throws(
                    function(){
                        as.add(
                            function( as ){},
                            function( as, error, val ){}
                        );
                    }, 'InternalError' );
                
                as.add( function( as ){}, function( as, error ){} );
                as.cancel();
            });
        }
    );
    describe(
        '#parallel()', function(){
            it("should add steps sequentially",function(){
                var as = this.as;
                as.parallel(
                    function( as,err ){ as.success(); }
                )
                
                as.parallel();
                as.add(function(as){ as.success(); });
                
                as._queue.length.should.equal(3);
                as._queue[0][0].should.be.instanceof( Function );
                as._queue[0][1].should.be.instanceof( Function );
                as._queue[1][0].should.be.instanceof( Function );
                assert.equal(as._queue[1][1], undefined );
                
                as.execute();
                async_steps.AsyncTool.run();
            });
            
            it("should run in parallel",function(){
                var as = this.as;
                
                as.state.order = [];
                
                as.parallel(
                        function( as, err)
                        {
                            console.dir(as);
                        } )
                    .add(function(as){
                        as.state.order.push( 1 );
                        as.add(function(as){
                            as.state.order.push( 4 );
                            as.success();
                        });
                    })
                    .add(function(as){
                        as.state.order.push( 2 );
                        as.add(function(as){
                            as.state.order.push( 5 );
                            as.success();
                        });
                    })
                    .add(function(as){
                        as.state.order.push( 3 );
                        as.add(function(as){
                            as.state.order.push( 6 );
                            as.success();
                        });
                    });
                as.add(function(as){
                    as.state.order.push( 7 );
                    as.success();
                });
                    
                as.execute();
                async_steps.AsyncTool.run();
                as.state.order.should.eql( [1,2,3,4,5,6,7] );
            });
            
            it("should run in parallel (inner)",function(){
                var as = this.as;
                
                as.state.order = [];
                
                as.add(function(as){
                    as.parallel(function( as, err){ console.dir(err) } )
                        .add(function(as){
                            as.state.order.push( 1 );
                            as.add(function(as){
                                as.state.order.push( 4 );
                                as.success();
                            });
                        })
                        .add(function(as){
                            as.state.order.push( 2 );
                            as.add(function(as){
                                as.state.order.push( 5 );
                                as.success();
                            });
                        })
                        .add(function(as){
                            as.state.order.push( 3 );
                            as.add(function(as){
                                as.state.order.push( 6 );
                                as.success();
                            });
                        });
                });
                as.add(function(as){
                    as.state.order.push( 7 );
                    as.success();
                });

                    
                as.execute();
                async_steps.AsyncTool.run();
                as.state.order.should.eql( [1,2,3,4,5,6,7] );
            });
            
            it("should cancel on error in parallel (inner)",function(){
                var as = this.as;
                
                as.state.order = [];
                
                as.add(function(as){
                    as.parallel(
                        function( as, err)
                        {
                            if ( err === 'MyError' ) as.success();
                        } )
                        .add(function(as){
                            as.state.order.push( 1 );
                            as.add(function(as){
                                as.state.order.push( 4 );
                                as.success();
                            });
                        })
                        .add(function(as){
                            as.state.order.push( 2 );
                            as.add(function(as){
                                as.state.order.push( 5 );
                                as.error( 'MyError' );
                            });
                        })
                        .add(function(as){
                            as.state.order.push( 3 );
                            as.add(function(as){
                                as.state.order.push( 6 );
                                as.success();
                            });
                        });
                });
                as.add(function(as){
                    as.state.order.push( 7 );
                    as.success();
                });

                    
                as.execute();
                async_steps.AsyncTool.run();
                as.state.order.should.eql( [1,2,3,4,5,7] );
            });
            
            it("should cancel on cancel in parallel (inner)",function(){
                var as = this.as;
                var root_as = as;
                                
                as.state.order = [];
                
                as.add(function(as){
                    as.parallel(
                        function( as, err)
                        {
                            console.dir( err );
                            if ( err === 'MyError' ) as.success();
                        } )
                        .add(function(as){
                            as.state.order.push( 1 );
                            as.add(function(as){
                                as.state.order.push( 4 );
                                as.success();
                            });
                        })
                        .add(function(as){
                            as.state.order.push( 2 );
                            as.add(function(as){
                                as.state.order.push( 5 );
                                as.success();
                            });
                            as.setCancel(function(as){
                            });
                            async_steps.AsyncTool.callLater(
                                function()
                                {
                                    try
                                    {
                                        root_as.cancel();
                                    }
                                    catch ( e )
                                    {
                                        console.dir( e );
                                    }
                                } );
                        })
                        .add(function(as){
                            as.state.order.push( 3 );
                            as.add(function(as){
                                as.state.order.push( 6 );
                                as.success();
                            });
                        });
                });
                as.add(function(as){
                    as.state.order.push( 7 );
                    as.success();
                });

                    
                as.execute();
                async_steps.AsyncTool.run();
                as.state.order.should.eql( [1,2,3,4] );
            });
        }
    );
    describe(
        '#success()', function(){
            it('should work',function(){
                var as = this.as;
                as.state.second_called = false;
                as.add(
                    function( as ){
                        as.success();
                    },
                    function( as, error ){
                        error.should.equal( "Does not work" );
                    }
                ).add(
                    function( as ){
                        as.state.second_called = true;
                        as.success();
                    }
                );
                
                as.execute();
                as.state.second_called.should.be.false;
                assertHasEvents();
                
                async_steps.AsyncTool.nextEvent();
                as.state.second_called.should.be.true;
                
                assertNoEvents();
            });
            
            it('should work in onerror',function(){
                var as = this.as;
                as.state.second_called = false;
                as.add(
                    function( as ){
                        as.error( false );
                    },
                    function( as, error ){
                        as.success( 'Value1', 'Value2' );
                    }
                ).add(
                    function( as, val1, val2 ){
                        as.state.second_called = true;
                        val1.should.equal( 'Value1' );
                        val2.should.equal( 'Value2' );
                        as.success();
                    }
                );
                
                as.execute();
                as.state.second_called.should.be.false;
                assertHasEvents();
                
                async_steps.AsyncTool.nextEvent();
                as.state.second_called.should.be.true;
                
                assertNoEvents();
            });

            it('should work in depth',function(){
                var as = this.as;
                as.state.second_called = false;
                as.add(
                    function( as ){
                        as.add( function( as ){
                            as.success();
                        });
                    },
                    function( as, error ){
                        console.dir( as );
                        error.should.equal( "Does not work" );
                    }
                ).add(
                    function( as ){
                        as.state.second_called = true;
                        as.success();
                    }
                );
                
                as.execute();
                as.state.second_called.should.be.false;
                assertHasEvents();
                
                async_steps.AsyncTool.nextEvent();
                as.state.second_called.should.be.false;
                assertHasEvents();
                
                async_steps.AsyncTool.nextEvent();
                as.state.second_called.should.be.true;
                
                assertNoEvents();
            });
            
            it( 'should fail on invalid success', function(){
                var as = this.as;
                
                assert.throws(
                    function(){
                        as._handle_success();
                    }, 'InternalError' );
            });
            
            it( 'should disables timeout', function(){
                var as = this.as;
                
                as.add(
                    function(as){
                        as.setTimeout( 1000 );
                        as.success();
                    } );
                
                as.execute();
                assertNoEvents();
            });
            
            it( 'should fail on success with inner steps', function(){
                var as = this.as;
                
                as.state.executed = false;
                
                as.add(
                    function( as ) {
                        as.add(function(as){ as.error('MyError') });
                        as.success();
                    },
                    function( as, err )
                    {
                        as.state.executed = true;
                        err.should.be.equal('InternalError');
                    }
                );
                
                as.execute();
                async_steps.AsyncTool.run();
                as.state.executed.should.be.true;
            });
            
           it( 'should be possible to make async success', function(){
                var as = this.as;
                var _this = this;
                
                as.state.myerror = false;
                
                as.add(
                    function( as ){
                        async_steps.AsyncTool.callLater(function(){
                            as.success();
                        });
                        as.setCancel(function(as){});
                    },
                    function( as, err )
                    {
                        as.state.myerror = true;
                    }
                ).
                add( function( as ){
                    as.success();
                });

                as.execute();
                async_steps.AsyncTool.nextEvent();
                assertHasEvents();
                async_steps.AsyncTool.nextEvent();
                assertNoEvents();
                
                as.state.myerror.should.be.false;
            });

            it( 'should ignore unexpected success', function(){
                var as = this.as;
                var _this = this;
                var root_as = as;
                
                as.state.myerror = false;
                as.state.executed = false;
                
                as.add(
                    function( as ){
                        async_steps.AsyncTool.callLater(function(){
                            assert.throws(function(){
                                as.success();
                            }, Error, 'InternalError' );
                        });

                        as.success();
                    },
                    function( as, err )
                    {
                        console.log( err );
                        as.state.myerror = true;
                    }
                ).
                add(
                    function( as ){
                        as.state.executed = true;
                        as.success();
                    },
                    function( as, err ){
                        console.dir( err );
                    }
                );

                as.execute();
                async_steps.AsyncTool.nextEvent();
                assertHasEvents();
                async_steps.AsyncTool.nextEvent();
                assertNoEvents();
                
                as.state.myerror.should.be.false;
                as.state.executed.should.be.true;
            });
        }
    );
    describe(
        '#successStep()', function(){
            it('should work',function(){
                var as = this.as;
                as.state.second_called = false;
                as.add(
                    function( as ){
                        as.add(function(as){
                            as.successStep(); // alias for success
                        });
                        as.successStep(); // must add a step
                    },
                    function( as, error ){
                        error.should.equal( "Does not work" );
                    }
                ).add(
                    function( as ){
                        as.state.second_called = true;
                        as.success();
                    }
                );
                
                as.execute();
                as.state.second_called.should.be.false;
                assertHasEvents();
                
                async_steps.AsyncTool.nextEvent();
                as.state.second_called.should.be.false;
                assertHasEvents();
                
                async_steps.AsyncTool.run();
                as.state.second_called.should.be.true;
            });
        }
    );
    describe(
        '#error()', function(){
            it('should throw error',function(){
                var as = this.as
                as.state.error_info.should.equal( '' );
                
                assert.throws(function(){
                    as.error( "MyError" );
                }, Error, "MyError" );
                
                as.state.error_info.should.equal( '' );
                
                assert.throws(function(){
                    as.error( "MyError", 'My Info' );
                }, Error, "MyError" );
                
                as.state.error_info.should.equal( 'My Info' );
            });

        
            it( 'should be possible to change error code', function(){
                var as = this.as;
                
                as.add(
                    function(as){
                        as.add(
                            function(as)
                            {
                                as.error( 'Orig' );
                            },
                            function( as, err )
                            {                      
                                err.should.eql( 'Orig' );
                                as.error( 'Changed' );
                            }
                        )
                    },
                    function( as, err )
                    {
                        err.should.eql( 'Changed' );
                    }
                );
                
                as.execute();
                async_steps.AsyncTool.run();
            });
            
            it( 'should be possible to make async error', function(){
                var as = this.as;
                var _this = this;
                
                as.state.myerror = false;
                
                as.add(
                    function( as ){
                        async_steps.AsyncTool.callLater(function(){
                            try
                            {
                                as.error( 'MyError' );
                            }
                            catch ( e )
                            {}
                        });
                        as.setCancel(function(as){});
                    },
                    function( as, err )
                    {
                        as.state.myerror = ( err === 'MyError' );
                    }
                ).
                add( function( as ){
                    as.success();
                });

                as.execute();
                async_steps.AsyncTool.nextEvent();
                assertNoEvents();
                
                as.state.myerror.should.be.true;
            });
            
            it( 'should be possible to make async error in execute', function(){
                var as = this.as;
                var _this = this;
                var root_as = as;
                
                as.state.myerror = false;
                as.state.executed = false;
                
                as.add(
                    function( as ){
                        as.success();
                    },
                    function( as, err )
                    {
                        as.state.myerror = ( err === 'MyError' );
                    }
                ).
                add( function( as ){
                    as.state.executed = true;
                    as.success();
                });

                as.execute();
                try
                {
                    as.error( 'MyError' );
                }
                catch ( e )
                {}
                assertNoEvents();
                
                as.state.myerror.should.be.false;
                as.state.executed.should.be.false;
            });
            
            it( 'should ignore unexpected error', function(){
                var as = this.as;
                var _this = this;
                var root_as = as;
                
                as.state.myerror = false;
                as.state.executed = false;
                
                as.add(
                    function( as ){
                        async_steps.AsyncTool.callLater(function(){
                            assert.throws(function()
                            {
                                as.error( 'MyError' );
                            }, Error, 'MyError' );
                        });

                        as.success();
                    },
                    function( as, err )
                    {
                        as.state.myerror = ( err === 'MyError' );
                    }
                ).
                add( function( as ){
                    as.state.executed = true;
                    as.success();
                });

                as.execute();
                async_steps.AsyncTool.nextEvent();
                assertHasEvents();
                async_steps.AsyncTool.nextEvent();
                assertNoEvents();
                
                as.state.myerror.should.be.false;
                as.state.executed.should.be.true;
            });

        }
    );
    describe(
        '#setTimeout()', function(){
            
            after(function(){
                async_steps.installAsyncToolTest( true );
            });
            
            it('should properly timeout, calling cancel',function( done ){
                async_steps.installAsyncToolTest( false );
                
                var done_wrap = function( order ){
                    order.should.eql( ['1', '2', '3', '4' ] );
                    done();
                };
                
                var as = this.as;

                as.state.order = []
                as.add(
                    function( as ){
                        as.state.order.push( '1' );
                        as.setTimeout( 20 );
                        as.setTimeout( 20 ); // reset
                        as.add( function( as ){
                            as.state.order.push( '2' );
                            as.setTimeout( 5 );
                        });
                        as.setCancel( function( as ){
                            as.state.order.push( '3' );
                        });
                    },
                    function( as, err )
                    {
                        as.state.order.push( '4' );
                        err.should.eql( 'Timeout' );
                        done_wrap( as.state.order );
                    }
                );
                
                as.execute();
            });
        }
    );
    describe(
        '#setCancel()', function(){
            it('should cancel in reverse order silently',function(){
                var as = this.as;
                as.state.order = []
                as.add(
                    function( as ){
                        as.state.order.push( '1' );
                        as.add( function( as ){
                            as.state.order.push( '2' );
                            as.setCancel( function( as ){
                                as.state.order.push( '2c' );
                            });
                            as.add( function( as ){
                                as.state.order.push( '3' );
                                as.setCancel( function( as ){
                                    as.state.order.push( '3c' );
                                });
                            });
                        });
                        as.setCancel( function( as ){
                            as.state.order.push( '1c' );
                        });
                    },
                    function( as, err )
                    {
                        as.state.order.push( 'e' );
                    }
                );
                
                as.execute();
                async_steps.AsyncTool.run();
                as.state.order.should.eql( [ '1', '2', '3' ] );
                as.cancel();
                async_steps.AsyncTool.run();
                as.state.order.should.eql( [ '1', '2', '3', '3c', '2c', '1c' ] );
            });
        }
    );
    describe(
        '#copyFrom()', function(){
            beforeEach(function(){
                this.as = async_steps();
            });
            
            it('should copy steps and state',function(){
                var as = this.as;
                as.state.old_v = false;
                as.state.executed = false;
                as.state.parallel1 = false;
                as.state.parallel2 = false;
                
                var model_as = async_steps();
                model_as.state.new_v = true;
                model_as.state.old_v = true;
                
                model_as.add(
                    function(as){
                    },
                    function(as,error){
                        as.success();
                    }
                ).add(function(as){
                    as.state.executed = true;
                    as.success();
                });
                
                model_as.parallel()
                    .add(function(as){
                        as.state.parallel1 = true;
                        as.success();
                    })
                    .add(function(as){
                        as.state.parallel2 = true;
                        as.success();
                    });;
                
                as.copyFrom( model_as );
                as.state.should.have.property( 'old_v', false );
                as.state.should.have.property( 'new_v', true );
                
                as.execute();
                async_steps.AsyncTool.run();
                as.state.executed.should.be.true;
                as.state.parallel1.should.be.true;
                as.state.parallel2.should.be.true;
                
                as.state.executed = false;
                as.state.parallel1 = false;
                as.state.parallel2 = false;

                
                as.add(function(as){
                    model_as.state.new_v2 = true;
                    as.copyFrom( model_as );
                    
                    as.state.should.have.property( 'old_v', false );
                    as.state.should.have.property( 'new_v', true );
                    as.state.should.have.property( 'new_v2', true );
                    
                    var m = async_steps();
                    as.copyFrom( m );
                    m.add(function( as ){ as.success(); });
                    as.copyFrom( m );
                });
                
                as.execute();
                async_steps.AsyncTool.run();
                as.state.executed.should.be.true;
                as.state.parallel1.should.be.true;
                as.state.parallel2.should.be.true;
            });
        }
    );
    describe(
        '#execute()', function(){
            it('should silently exit', function(){
                var as = this.as;
                as.execute();
                assertNoEvents();
            });

            it('should trigger ASP sanity check', function(){
                var as = this.as;
                
                as.state.error_code = '';
                
                as.add(
                    function( as ){
                        var oas = as;
                        
                        as.add(function( as ) {
                            oas.success();
                        });
                    },
                    function( as, err ){
                        as.state.error_code = err;
                    }
                );
                
                as.execute();
                async_steps.AsyncTool.run();
                as.state.error_code.should.be.equal('InternalError');
            });
        }
    );
    describe(
        '#cancel()', function(){
            it('should cancel execution', function(){
                var as = this.as;
                
                as.add(function(as){
                    as.success();
                }).add(function(as){
                    as.success();
                });
                
                as.execute();
                as.cancel();
                assertNoEvents();
            });
            
            it('should cancel timeout', function(){
                var as = this.as;
                
                as.add(function(as){
                    as.setTimeout( 1000 );
                }).add(function(as){
                    as.success();
                });
                
                as.execute();
                as.cancel();
                assertNoEvents();
            });

        }
    );
});
