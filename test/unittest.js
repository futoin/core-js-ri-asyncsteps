
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
            })
        }
    );
    describe(
        '#parallel()', function(){
        }
    );
    describe(
        '#success()', function(){
            it('should fail on top level',function(){
                assert.throws(function(){
                    this.as.success();
                }, async_steps.FutoInError.InternalError );
            });
        }
    );
    describe(
        '#successStep()', function(){
            it('should fail on top level',function(){
                assert.throws(function(){
                    this.as.successStep();
                }, async_steps.FutoInError.InternalError );
            });
        }
    );
    describe(
        '#error()', function(){
            it('should throw error',function(){
                as = this.as
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
        }
    );
    describe(
        '#setCancel()', function(){
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
