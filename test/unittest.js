
//
var async_steps = require('../asyncsteps');
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
                        s.should.be.greaterThan( t + 99 )
                        done();
                    },
                    100
                );
            });
        }
    );
    describe(
        '#callLater()', function(){
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
        }
    );
    describe(
        '#callLater()', function(){
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
                
                as._queue.length.should.equal(2);
                as._queue[0][0].should.be.instanceof( Function );
                as._queue[0][1].should.be.instanceof( Function );
                as._queue[1][0].should.be.instanceof( Function );
                assert.equal(as._queue[1][1], undefined );
            })

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
        }
    );
    describe(
        '#successStep()', function(){
            it('should work',function(){
                var as = this.as;
                as.state.second_called = false;
                as.add(
                    function( as ){
                        as.successStep();
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
        }
    );
    describe(
        '#error()', function(){
            it('should throw error',function(){
                var as = this.as
                as.state.error_info.should.equal( '' );
                
                assert.throws(function(){
                    as.error( "MyError" );
                }, "MyError" );
                
                as.state.error_info.should.equal( '' );
                
                assert.throws(function(){
                    as.error( "MyError", 'My Info' );
                }, "MyError" );
                
                as.state.error_info.should.equal( 'My Info' );
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
                as._cancel();
                async_steps.AsyncTool.run();
                as.state.order.should.eql( [ '1', '2', '3', '3c', '2c', '1c' ] );
            });
        }
    );
    describe(
        '#copyFrom()', function(){
        }
    );
    describe(
        '#execute()', function(){
        }
    );
});
