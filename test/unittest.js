
//
var async_steps = require('../asyncsteps');

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
                        s.should.be.greaterThan( t + 100 )
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
    var that = this;
    
    before(function(){
        async_steps.installAsyncToolTest();
    });
    
    after(function(){
        async_steps.installAsyncToolTest( false );
    });
    
    beforeEach(function( done ){
        //that.as = async_steps();
        done();
    });
    
    describe(
        '#add()', function(){
        }
    );
    describe(
        '#parallel()', function(){
        }
    );
    describe(
        '#success()', function(){
        }
    );
    describe(
        '#successStep()', function(){
        }
    );
    describe(
        '#error()', function(){
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
