
[![Build Status](https://travis-ci.org/futoin/core-js-ri-asyncsteps.svg)](https://travis-ci.org/futoin/core-js-ri-asyncsteps)

Reference implementation of:
 
    FTN12: FutoIn Async API
    Version: 1.4
    
Spec: [FTN12: FutoIn Async API v1.x](http://specs.futoin.org/final/preview/ftn12_async_api-1.html)

[Web Site](http://futoin.org/)


# About

Adds classical linear program flow structure to async programming
supporting exceptions. error handlers, timeouts, unlimited number of sub-steps,
execution parallelism, loops and job state/context variables.

Current version is targeted at Node.js, but should be easily used in
web browser environment as well (not yet tested).

It should be possible to use any other async framework from AsyncSteps by using
setCancel() and/or setTimeout() methods which allow step completion without success() or
error() result. Specific step-associated AsyncSteps interface will be valid for success() or error()
call on external event.

It also possible to use FutoIn AsyncSteps from any other event framework. Just make sure to notify
external framework from the top most error handler (for errors) and last step (for success).

To minimize cost of closure creation on repetitive execution, a special feature of "model" step
is available: model step is created as usual, but must never get executed. It possible to copy steps
and state variables using AsyncSteps#copyFrom() to a newly created object.

# Installation

Command line:
```sh
$ npm install futoin-asyncsteps --save
```
and/or package.json:
```
"dependencies" : {
    "futoin-asyncsteps" : "^1.1"
}
```

# Concept

This interface was born as a secondary option for
executor concept. However, it quickly became clear that
async/reactor/proactor/light threads/etc. should be base
for scalable high performance server implementations, even though it is more difficult for understanding and/or debugging.
Traditional synchronous program flow becomes an addon
on top of asynchronous base for legacy code and/or too
complex logic.

Program flow is split into non-blocking execution steps, represented
with execution callback function. Processing Unit (eg. CPU) halting/
spinning/switching-to-another-task is seen as a blocking action in program flow.

Any step must not call any of blocking functions, except for synchronization
with guaranteed minimal period of lock acquisition.
*Note: under minimal period, it is assumed that any acquired lock is 
immediately released after action with O(1) complexity and no delay
caused by programmatic suspension/locking of executing task*

Every step is executed sequentially. Success result of any step
becomes input for the following step.

Each step can have own error handler. Error handler is called, if
AsyncSteps.error() is called within step execution or any of its 
sub-steps. Typical behavior is to ignore error and continue or
to make cleanup actions and complete job with error.

Each step can have own sequence of sub-steps. Sub-steps can be added
only during that step execution. Sub-step sequence is executed after
current step execution is finished.

If there are any sub-steps added then current step must not call
AsyncSteps.success() or AsyncSteps.error(). Otherwise, InternalError
is raised.

It is possible to create a special "parallel" sub-step and add
independent sub-steps to it. Execution of each parallel sub-step
is started all together. Parallel step completes with success
when all sub-steps complete with success. If error is raised in
any sub-step of parallel step then all other sub-steps are canceled.

Out-of-order cancel of execution can occur by timeout, 
execution control engine decision (e.g. Invoker disconnect) or
failure of sibling parallel step. Each step can install custom
on-cancel handler to free resources and/or cancel external jobs.
After cancel, it must be safe to destroy AsyncSteps object.

AsyncSteps must be used in Executor request processing. The same 
[root] AsyncSteps object must be used for all asynchronous tasks within
given request processing.

AsyncSteps may be used by Invoker implementation.

AsyncSteps must support derived classes in implementation-defined way.
Typical use case: functionality extension (e.g. request processing API).

For performance reasons, it is not economical to initialize AsyncSteps
with business logic every time. Every implementation must support
platform-specific AsyncSteps cloning/duplicating.

## 1.1. Levels

When AsyncSteps (or derived) object is created all steps are added
sequentially in Level 0 through add() and/or parallel(). Note: each
parallel() is seen as a step.

After AsyncSteps execution is initiated, each step of Level 0 is executed.
All sub-steps are added in Level n+1. Example:

    add() -> Level 0 #1
        add() -> Level 1 #1
            add() -> Level 2 #1
            parallel() -> Level 2 #2
            add() -> Level 2 #3
        parallel() -> Level 1 #2
        add() -> Level 1 #3
    parallel() -> Level 0 #2
    add() -> Level 0 #3

    
Execution cannot continue to the next step of current Level until all steps of higher Level
are executed.

The execution sequence would be:

    Level 0 add #1
    Level 1 add #1
    Level 2 add #1
    Level 2 parallel #2
    Level 2 add #3
    Level 1 parallel #2
    Level 1 add #3
    Level 0 parallel #2
    Level 0 add #3

## 1.2. Error handling

Due to not linear programming, classic try/catch blocks are converted into execute/onerror.
Each added step may have custom error handler. If error handler is not specified then
control passed to lower Level error handler. If non is defined then execution is aborted.

Example:

    add( -> Level 0
        func( as ){
            print( "Level 0 func" )
            add( -> Level 1
                func( as ){
                    print( "Level 1 func" )
                    as.error( "myerror" )
                },
                onerror( as, error ){
                    print( "Level 1 onerror: " + error )
                    as.error( "newerror" )
                }
            )
        },
        onerror( as, error ){
            print( "Level 0 onerror: " + error )
            as.success( "Prm" )
        }
    )
    add( -> Level 0
        func( as, param ){
            print( "Level 0 func2: " + param )
            as.success()
        }
    )


Output would be:

    Level 0 func
    Level 1 func
    Level 1 onerror: myerror
    Level 0 onerror: newerror
    Level 0 func2: Prm
    
In synchronous way, it would look like:

    variable = null

    try
    {
        print( "Level 0 func" )
        
        try
        {
            print( "Level 1 func" )
            throw "myerror"
        }
        catch ( error )
        {
            print( "Level 1 onerror: " + error )
            throw "newerror"
        }
    }
    catch( error )
    {
        print( "Level 0 onerror: " + error )
        variable = "Prm"
    }
    
    print( "Level 0 func2: " + variable )


## 1.3. Wait for external resources

Very often, execution of step cannot continue without waiting for external event like input from network or disk.
It is forbidden to block execution in event waiting. As a solution, there are special setTimeout() and setCancel()
methods.

Example:

    add(
        func( as ){
            socket.read( function( data ){
                as.success( data )
            } )
            
            as.setCancel( function(){
                socket.cancel_read()
            } )
            
            as.setTimeout( 30_000 ) // 30 seconds
        },
        onerror( as, error ){
            if ( error == timeout ) {
                print( "Timeout" )
            }
            else
            {
                print( "Read Error" )
            }
        }
    )

## 1.4. Parallel execution abort

Definition of parallel steps makes no sense to continue execution if any of steps fails. To avoid
excessive time and resources spent on other steps, there is a concept of canceling execution similar to 
timeout above.

Example:
    
    as.parallel()
        .add(
            func( as ){
                as.setCancel( function(){ ... } )
                
                // do parallel job #1
                as.state()->result1 = ...;
            }
        )
        .add(
            func( as ){
                as.setCancel( function(){ ... } )

                // do parallel job #1
                as.state()->result2 = ...;
            }
        )
        .add(
            func( as ){
                as.error( "Some Error" )
            }
        )
    as.add(
        func( as ){
            print( as.state()->result1 + as.state->result2 )
            as.success()
        }
    )

## 1.5. AsyncSteps cloning

In long living applications the same business logic may be re-used multiple times
during execution.

In a REST API server example, complex business logic can be defined only once and
stored in a kind of AsyncSteps object repository.
On each request, a reference object from the repository would be copied for actual
processing with minimal overhead.

However, there would be no performance difference in sub-step definition unless
its callback function is also created at initialization time, but not at parent
step execution time (the default concept). So, it should be possible to predefine
those as well and copy/inherit during step execution. Copying steps must also
involve copying of state variables.

Example:

    AsyncSteps req_repo_common;
    req_repo_common.add(func( as ){
        as.add( func( as ){ ... } );
        as.copyFrom( as.state().business_logic );
        as.add( func( as ){ ... } );
    });
    
    AsyncSteps req_repo_buslog1;
    req_repo_buslog1
        .add(func( as ){ ... })
        .add(func( as ){ ... });

    AsyncSteps actual_exec = copy req_repo_common;
    actual_exec.state().business_logic = req_repo_buslog1;
    actual_exec.execute();

However, this approach only make sense for deep performance optimizations.

## 1.6. "Success Step" and Throw

During development, when step flow is not known at coding time, but dynamically resolved
based on configuration, internal state, etc., it is common to see the following logic:

    as.add(func( as ){
        someHelperA( as ); // adds sub-step
        someHelperB( as ); // does nothing
        
        // Not effective
        as.add(func( as ){
            as->success();
        })
    })
    
The idea is that is it not known in advance if someHelper*() adds sub-steps or not. However, we must ensure
that a) only one success() call is yield b) there are no sub-steps. 

To make this elegant and efficient, a "success step" concept can be introduced:

    as.add(func( as ){
        someHelperA( as ); // adds sub-step
        someHelperB( as ); // does nothing
        
        // Runtime optimized
        as.successStep();
    })
    
As a counterpart for error handling, we must ensure that execution has stopped after error
is triggered in someHelper*() with no enclosing sub-step. The only safe way is to throw exception
what is now done in as.error()

### 1.6.1. The Safety Rules of AsyncSteps helpers

1. as.success() should be called only in top-most function of the
    step (the one passed to as.add() directly)
1. if top-most functions calls abstract helpers then it should call as.successStep()
    for safe and efficient successful termination
1. setCancel() and/or setTimeout() must be called only in top most function


## 1.7. Error Info

Error code is not always descriptive enough, especially, if it can be generated in multiple ways.
As a convention special "error_info" state field should hold descriptive information of the last error.

For convenience, error() is extended with optional parameter error_info


## 1.8. Async Loops

Almost always, async program flow is not linear. Sometimes, loops are required.

Basic principals of async loops:

        as.loop( func( as ){
            call_some_library( as );
            as.add( func( as, result ){
                if ( !result )
                {
                    // exit loop
                    as.break();
                }
            } );
        } )
        
Inner loops and identifiers:

        // start loop
        as.loop( 
            func( as ){
                as.loop( func( as ){
                    call_some_library( as );
                    as.add( func( as, result ){
                        if ( !result )
                        {
                            // exit loop
                            as.continue( "OUTER" );
                        }

                        as.success( result );
                    } );
                } );
                
                as.add( func( as, result ){
                    // use it somehow
                    as.success();
                } );
            },
            "OUTER"
        )
        
Loop n times.

        as.repeat( 3, func( as, i ){
            print( 'Iteration: ' + i )
        } )
        
Traverse through list or map:

        as.forEach(
            [ 'apple', 'banana' ],
            func( as, k, v ){
                print( k + " = " + v )
            }
        )
        
### 1.8.1. Termination

Normal loop termination is performed either by loop condition (e.g. as.forEach(), as.repeat())
or by as.break() call. Normal termination is seen as as.success() call.

Abnormal termination is possible through as.error(), including timeout, or external as.cancel().
Abnormal termination is seen as as.error() call.


# Examples

## Simple steps

```javascript
var async_steps = require('futoin-asyncsteps');

var root_as = async_steps();

root_as.add(
    function( as ){
        as.success( "MyValue" );
    }
).add(
    function( as, arg ){
        if ( arg === 'MyValue' )
        {
            as.add( function( as ){
                as.error( 'MyError', 'Something bad has happened' );
            });
        }

        as.successStep();
    },
    function( as, err )
    {
        if ( err === 'MyError' )
        {
            as.success( 'NotSoBad' );
        }
    }
);

root_as.add(
    function( as, arg )
    {
        if ( arg === 'NotSoBad' )
        {
            console.log( 'MyError was ignored: ' + as.state.error_info );
        }
        
        as.state.p1arg = 'abc';
        as.state.p2arg = 'xyz';
        
        var p = as.parallel();
        
        p.add( function( as ){
            console.log( 'Parallel Step 1' );
            
            as.add( function( as ){
                console.log( 'Parallel Step 1.1' );
                as.state.p1 = as.state.p1arg + '1';
                as.success();
            } );
        } )
        .add( function( as ){
            console.log( 'Parallel Step 2' );
            
            as.add( function( as ){
                console.log( 'Parallel Step 2.1' );
                as.state.p2 = as.state.p2arg + '2';
                as.success();
            } );
        } );
    }
).add( function( as ){
    console.log( 'Parallel 1 result: ' + as.state.p1 );
    console.log( 'Parallel 2 result: ' + as.state.p2 );
} );
            
root_as.execute();
```

Result:
```
MyError was ignored: Something bad has happened
Parallel Step 1
Parallel Step 2
Parallel Step 1.1
Parallel Step 2.1
Parallel 1 result: abc1
Parallel 2 result: xyz2
```


## External event wait

```javascript
var async_steps = require('futoin-asyncsteps');


function dummy_service_read( success, error ){
    // We expect it calles success when data is available
    // and error, if error occurs
    // Returns some request handle
}

function dummy_service_cancel( reqhandle ){
    // We assume it cancels previously scheduled reqhandle
}

var root_as = async_steps();

root_as.add( function( as ){
    setImmediate( function(){
        as.success( 'async success()' );
    } );
    
    as.setTimeout( 10 ); // ms
} ).add(
    function( as, arg ){
        console.log( arg );
        
        var reqhandle = dummy_service_read(
            function( data ){
                as.success( data );
            },
            function( err ){
                if ( err !== 'SomeSpecificCancelCode' )
                {
                    as.error( err );
                }
            }
        );
        
        as.setCancel(function(as){
            dummy_service_cancel( reqhandle );
        });
        
        // OPTIONAL. Set timeout of 1s
        as.setTimeout( 1000 );
    },
    function( as, err )
    {
        console.log( err + ": " + as.state.error_info );
    }
);

root_as.execute();
```
Result:

```
async success()
Timeout: 
```

## Model steps (avoid closure creation overhead on repetitive execution)

```javascript
var async_steps = require('futoin-asyncsteps');


var model_as = async_steps();
model_as.state.var = 'Vanilla';

model_as.add( function(as){
    console.log('-----');
    console.log( 'Hi! I am from model_as' );
    console.log( 'State.var: ' + as.state.var );
    as.state.var = 'Dirty';
    as.success();
});

for ( var i = 0; i < 3; ++i )
{
    var root_as = async_steps();
    root_as.copyFrom( model_as );
    root_as.add( function(as){
        as.add(function( as ){
            console.log('>> The first inner step');
            as.success();
        });
        as.copyFrom( model_as );
        as.successStep();
    });
    root_as.execute();
}

```
Result. Please note the order as only the first step is executed in the loop.
The rest is executed quasi-parallel by nature of async programming.
The model_as closure gets executed 6 times, but created only once.

```
-----
Hi! I am from model_as
State.var: Vanilla
-----
Hi! I am from model_as
State.var: Vanilla
-----
Hi! I am from model_as
State.var: Vanilla
>> The first inner step
>> The first inner step
>> The first inner step
-----
Hi! I am from model_as
State.var: Dirty
-----
Hi! I am from model_as
State.var: Dirty
-----
Hi! I am from model_as
State.var: Dirty
```

## Async Loops

```javascript
var async_steps = require('futoin-asyncsteps');

var root_as = async_steps();

root_as.add(
    function( as ){
        as.repeat( 3, function( as, i ) {
            console.log( "> Repeat: " + i );
        } );
        
        as.forEach( [ 1, 2, 3 ], function( as, k, v ) {
            console.log( "> forEach: " + k + " = " + v );
        } );
        
        as.forEach( { a: 1, b: 2, c: 3 }, function( as, k, v ) {
            console.log( "> forEach: " + k + " = " + v );
        } );
    }
);

root_as.execute();
```

Result:

```
> Repeat: 0
> Repeat: 1
> Repeat: 2
> forEach: 0 = 1
> forEach: 1 = 2
> forEach: 2 = 3
> forEach: a = 1
> forEach: b = 2
> forEach: c = 3
```
    
# API documentation

The concept is described in FutoIn specification: [FTN12: FutoIn Async API v1.x](http://specs.futoin.org/final/preview/ftn12_async_api-1.html)


**Members**

* [futoin-asyncsteps](#module_futoin-asyncsteps)
  * [futoin-asyncsteps.installAsyncToolTest([install])](#module_futoin-asyncsteps.installAsyncToolTest)
  * [class: futoin-asyncsteps.AsyncSteps](#module_futoin-asyncsteps.AsyncSteps)
    * [new futoin-asyncsteps.AsyncSteps([state])](#new_module_futoin-asyncsteps.AsyncSteps)
    * [AsyncSteps.success([...arg])](#module_futoin-asyncsteps.AsyncSteps#success)
    * [AsyncSteps.successStep()](#module_futoin-asyncsteps.AsyncSteps#successStep)
    * [AsyncSteps.setTimeout(timeout_ms)](#module_futoin-asyncsteps.AsyncSteps#setTimeout)
    * [AsyncSteps.setCancel()](#module_futoin-asyncsteps.AsyncSteps#setCancel)
    * [AsyncSteps.loop(func, [label])](#module_futoin-asyncsteps.AsyncSteps#loop)
    * [AsyncSteps.repeat(count, func, [label])](#module_futoin-asyncsteps.AsyncSteps#repeat)
    * [AsyncSteps.forEach(map_or_list, func, [label])](#module_futoin-asyncsteps.AsyncSteps#forEach)
    * [AsyncSteps.break([label])](#module_futoin-asyncsteps.AsyncSteps#break)
    * [AsyncSteps.continue([label])](#module_futoin-asyncsteps.AsyncSteps#continue)
    * [AsyncSteps.add(func, [onerror])](#module_futoin-asyncsteps.AsyncSteps#add)
    * [AsyncSteps.parallel([onerror])](#module_futoin-asyncsteps.AsyncSteps#parallel)
    * [AsyncSteps.error(name, [error_info])](#module_futoin-asyncsteps.AsyncSteps#error)
    * [AsyncSteps.copyFrom(other)](#module_futoin-asyncsteps.AsyncSteps#copyFrom)
    * [AsyncSteps.cancel()](#module_futoin-asyncsteps.AsyncSteps#cancel)
    * [AsyncSteps.execute()](#module_futoin-asyncsteps.AsyncSteps#execute)
  * [class: futoin-asyncsteps.AsyncTool](#module_futoin-asyncsteps.AsyncTool)
    * [new futoin-asyncsteps.AsyncTool()](#new_module_futoin-asyncsteps.AsyncTool)
    * [AsyncTool.callLater(func, [timeout_ms])](#module_futoin-asyncsteps.AsyncTool.callLater)
    * [AsyncTool.callLater(handle)](#module_futoin-asyncsteps.AsyncTool.callLater)
  * [class: futoin-asyncsteps.AsyncToolTest](#module_futoin-asyncsteps.AsyncToolTest)
    * [new futoin-asyncsteps.AsyncToolTest()](#new_module_futoin-asyncsteps.AsyncToolTest)
    * [AsyncToolTest.callLater(func, [timeout_ms])](#module_futoin-asyncsteps.AsyncToolTest.callLater)
    * [AsyncToolTest.callLater(handle)](#module_futoin-asyncsteps.AsyncToolTest.callLater)
    * [AsyncToolTest.nextEvent()](#module_futoin-asyncsteps.AsyncToolTest.nextEvent)
    * [AsyncToolTest.hasEvents()](#module_futoin-asyncsteps.AsyncToolTest.hasEvents)
    * [AsyncToolTest.getEvents()](#module_futoin-asyncsteps.AsyncToolTest.getEvents)
    * [AsyncToolTest.resetEvents()](#module_futoin-asyncsteps.AsyncToolTest.resetEvents)
    * [AsyncToolTest.run()](#module_futoin-asyncsteps.AsyncToolTest.run)
  * [class: futoin-asyncsteps.FutoInErrors](#module_futoin-asyncsteps.FutoInErrors)
    * [new futoin-asyncsteps.FutoInErrors()](#new_module_futoin-asyncsteps.FutoInErrors)
    * [const: FutoInErrors.ConnectError](#module_futoin-asyncsteps.FutoInErrors.ConnectError)
    * [const: FutoInErrors.CommError](#module_futoin-asyncsteps.FutoInErrors.CommError)
    * [const: FutoInErrors.UnknownInterface](#module_futoin-asyncsteps.FutoInErrors.UnknownInterface)
    * [const: FutoInErrors.NotSupportedVersion](#module_futoin-asyncsteps.FutoInErrors.NotSupportedVersion)
    * [const: FutoInErrors.NotImplemented](#module_futoin-asyncsteps.FutoInErrors.NotImplemented)
    * [const: FutoInErrors.Unauthorized](#module_futoin-asyncsteps.FutoInErrors.Unauthorized)
    * [const: FutoInErrors.InternalError](#module_futoin-asyncsteps.FutoInErrors.InternalError)
    * [const: FutoInErrors.InvokerError](#module_futoin-asyncsteps.FutoInErrors.InvokerError)
    * [const: FutoInErrors.InvalidRequest](#module_futoin-asyncsteps.FutoInErrors.InvalidRequest)
    * [const: FutoInErrors.DefenseRejected](#module_futoin-asyncsteps.FutoInErrors.DefenseRejected)
    * [const: FutoInErrors.PleaseReauth](#module_futoin-asyncsteps.FutoInErrors.PleaseReauth)
    * [const: FutoInErrors.SecurityError](#module_futoin-asyncsteps.FutoInErrors.SecurityError)
    * [const: FutoInErrors.Timeout](#module_futoin-asyncsteps.FutoInErrors.Timeout)

<a name="module_futoin-asyncsteps.installAsyncToolTest"></a>
##futoin-asyncsteps.installAsyncToolTest([install])
Use for unit testing to fine control step execution.
It installs AsyncToolTest in place of AsyncTool

**Params**

- \[install=true\] `boolean` - true - install AsyncToolTest, false - AsyncTool as scheduler  

<a name="module_futoin-asyncsteps.AsyncSteps"></a>
##class: futoin-asyncsteps.AsyncSteps
**Members**

* [class: futoin-asyncsteps.AsyncSteps](#module_futoin-asyncsteps.AsyncSteps)
  * [new futoin-asyncsteps.AsyncSteps([state])](#new_module_futoin-asyncsteps.AsyncSteps)
  * [AsyncSteps.success([...arg])](#module_futoin-asyncsteps.AsyncSteps#success)
  * [AsyncSteps.successStep()](#module_futoin-asyncsteps.AsyncSteps#successStep)
  * [AsyncSteps.setTimeout(timeout_ms)](#module_futoin-asyncsteps.AsyncSteps#setTimeout)
  * [AsyncSteps.setCancel()](#module_futoin-asyncsteps.AsyncSteps#setCancel)
  * [AsyncSteps.loop(func, [label])](#module_futoin-asyncsteps.AsyncSteps#loop)
  * [AsyncSteps.repeat(count, func, [label])](#module_futoin-asyncsteps.AsyncSteps#repeat)
  * [AsyncSteps.forEach(map_or_list, func, [label])](#module_futoin-asyncsteps.AsyncSteps#forEach)
  * [AsyncSteps.break([label])](#module_futoin-asyncsteps.AsyncSteps#break)
  * [AsyncSteps.continue([label])](#module_futoin-asyncsteps.AsyncSteps#continue)
  * [AsyncSteps.add(func, [onerror])](#module_futoin-asyncsteps.AsyncSteps#add)
  * [AsyncSteps.parallel([onerror])](#module_futoin-asyncsteps.AsyncSteps#parallel)
  * [AsyncSteps.error(name, [error_info])](#module_futoin-asyncsteps.AsyncSteps#error)
  * [AsyncSteps.copyFrom(other)](#module_futoin-asyncsteps.AsyncSteps#copyFrom)
  * [AsyncSteps.cancel()](#module_futoin-asyncsteps.AsyncSteps#cancel)
  * [AsyncSteps.execute()](#module_futoin-asyncsteps.AsyncSteps#execute)

<a name="new_module_futoin-asyncsteps.AsyncSteps"></a>
###new futoin-asyncsteps.AsyncSteps([state])
Root AsyncStep implementation

**Params**

- \[state\] `Object` - For internal use. State variable sharing  

<a name="module_futoin-asyncsteps.AsyncSteps#success"></a>
###AsyncSteps.success([...arg])
Successfully complete current step execution, optionally passing result variables to the next step.

**Params**

- \[...arg\] `*` - unlimited number of result variables with no type constraint  

<a name="module_futoin-asyncsteps.AsyncSteps#successStep"></a>
###AsyncSteps.successStep()
If sub-steps have been added then add efficient dummy step which behavior of as.success();
Otherwise, simply call as.success();

<a name="module_futoin-asyncsteps.AsyncSteps#setTimeout"></a>
###AsyncSteps.setTimeout(timeout_ms)
Set timeout for external event completion with async success() or error() call.
If step is not finished until timeout is reached then whole execution gets canceled.
Can be used only within execute_callback body.

**Params**

- timeout_ms `number` - Timeout in ms  

<a name="module_futoin-asyncsteps.AsyncSteps#setCancel"></a>
###AsyncSteps.setCancel()
Set cancellation handler to properly handle timeouts and external cancellation.
Can be used only within execute_callback body.

<a name="module_futoin-asyncsteps.AsyncSteps#loop"></a>
###AsyncSteps.loop(func, [label])
Execute loop until as.break() is called

**Params**

- func <code>[LoopFunc](#LoopFunc)</code> - loop body  
- \[label\] `string` - optional label to use for *as.break()* and *as.continue()* in inner loops  

<a name="module_futoin-asyncsteps.AsyncSteps#repeat"></a>
###AsyncSteps.repeat(count, func, [label])
Call *func(as, i)* for *count* times

**Params**

- count `integer` - how many times to call the *func*  
- func <code>[RepeatFunc](#RepeatFunc)</code> - loop body  
- \[label\] `string` - optional label to use for *as.break()* and *as.continue()* in inner loops  

<a name="module_futoin-asyncsteps.AsyncSteps#forEach"></a>
###AsyncSteps.forEach(map_or_list, func, [label])
For each *map* or *list* element call *func( as, key, value )*

**Params**

- map_or_list `integer` - map or list to iterate over  
- func <code>[ForEachFunc](#ForEachFunc)</code> - loop body  
- \[label\] `string` - optional label to use for *as.break()* and *as.continue()* in inner loops  

<a name="module_futoin-asyncsteps.AsyncSteps#break"></a>
###AsyncSteps.break([label])
Break execution of current loop, throws exception

**Params**

- \[label\] `string` - Optional. unwind loops, until *label* named loop is exited  

<a name="module_futoin-asyncsteps.AsyncSteps#continue"></a>
###AsyncSteps.continue([label])
Continue loop execution from the next iteration, throws exception

**Params**

- \[label\] `string` - Optional. unwind loops, until *label* named loop is found  

<a name="module_futoin-asyncsteps.AsyncSteps#add"></a>
###AsyncSteps.add(func, [onerror])
Add sub-step. Can be called multiple times.

**Params**

- func <code>[ExecFunc](#ExecFunc)</code> - function defining non-blocking step execution  
- \[onerror\] <code>[ErrorFunc](#ErrorFunc)</code> - Optional, provide error handler  

**Returns**: `AsyncSteps`  
<a name="module_futoin-asyncsteps.AsyncSteps#parallel"></a>
###AsyncSteps.parallel([onerror])
Creates a step internally and returns specialized AsyncSteps interfaces all steps
of which are executed in quasi-parallel.

**Params**

- \[onerror\] <code>[ErrorFunc](#ErrorFunc)</code> - Optional, provide error handler  

**Returns**: `AsyncSteps`  
<a name="module_futoin-asyncsteps.AsyncSteps#error"></a>
###AsyncSteps.error(name, [error_info])
Set error and throw to abort execution.

**Params**

- name `string` - error message, expected to be identifier "InternalError"  
- \[error_info\] `string` - optional descriptive message assigned to as.state.error_info  

**Type**: `Error`  
<a name="module_futoin-asyncsteps.AsyncSteps#copyFrom"></a>
###AsyncSteps.copyFrom(other)
Copy steps and not yet defined state variables from "model" AsyncSteps instance

**Params**

- other `AsyncSteps` - model instance, which must get be executed  

<a name="module_futoin-asyncsteps.AsyncSteps#cancel"></a>
###AsyncSteps.cancel()
Use only on root AsyncSteps instance. Abort execution of AsyncSteps instance in progress.

<a name="module_futoin-asyncsteps.AsyncSteps#execute"></a>
###AsyncSteps.execute()
Start execution of AsyncSteps using AsyncTool
Must not be called more than once until cancel/complete (instance can be re-used)

<a name="module_futoin-asyncsteps.AsyncTool"></a>
##class: futoin-asyncsteps.AsyncTool
**Members**

* [class: futoin-asyncsteps.AsyncTool](#module_futoin-asyncsteps.AsyncTool)
  * [new futoin-asyncsteps.AsyncTool()](#new_module_futoin-asyncsteps.AsyncTool)
  * [AsyncTool.callLater(func, [timeout_ms])](#module_futoin-asyncsteps.AsyncTool.callLater)
  * [AsyncTool.callLater(handle)](#module_futoin-asyncsteps.AsyncTool.callLater)

<a name="new_module_futoin-asyncsteps.AsyncTool"></a>
###new futoin-asyncsteps.AsyncTool()
Neutral interface to event scheduler

<a name="module_futoin-asyncsteps.AsyncTool.callLater"></a>
###AsyncTool.callLater(func, [timeout_ms])
Wrapper for setTimeout()/setImmediate()

**Params**

- func `function` - callback to execute  
- \[timeout_ms=0\] `number` - optional timeout in ms  

**Returns**: `Object` - - timer handle  
<a name="module_futoin-asyncsteps.AsyncTool.callLater"></a>
###AsyncTool.callLater(handle)
Wrapper for clearTimeout()/clearImmediate()

**Params**

- handle `Object` - Handle returned from AsyncTool.callLater  

<a name="module_futoin-asyncsteps.AsyncToolTest"></a>
##class: futoin-asyncsteps.AsyncToolTest
**Members**

* [class: futoin-asyncsteps.AsyncToolTest](#module_futoin-asyncsteps.AsyncToolTest)
  * [new futoin-asyncsteps.AsyncToolTest()](#new_module_futoin-asyncsteps.AsyncToolTest)
  * [AsyncToolTest.callLater(func, [timeout_ms])](#module_futoin-asyncsteps.AsyncToolTest.callLater)
  * [AsyncToolTest.callLater(handle)](#module_futoin-asyncsteps.AsyncToolTest.callLater)
  * [AsyncToolTest.nextEvent()](#module_futoin-asyncsteps.AsyncToolTest.nextEvent)
  * [AsyncToolTest.hasEvents()](#module_futoin-asyncsteps.AsyncToolTest.hasEvents)
  * [AsyncToolTest.getEvents()](#module_futoin-asyncsteps.AsyncToolTest.getEvents)
  * [AsyncToolTest.resetEvents()](#module_futoin-asyncsteps.AsyncToolTest.resetEvents)
  * [AsyncToolTest.run()](#module_futoin-asyncsteps.AsyncToolTest.run)

<a name="new_module_futoin-asyncsteps.AsyncToolTest"></a>
###new futoin-asyncsteps.AsyncToolTest()
Special event scheduler for testing to be installed with installAsyncToolTest()

<a name="module_futoin-asyncsteps.AsyncToolTest.callLater"></a>
###AsyncToolTest.callLater(func, [timeout_ms])
Adds callback to internal queue

**Params**

- func `function` - callback to execute  
- \[timeout_ms=0\] `number` - optional timeout in ms  

**Returns**: `Object` - - timer handle  
<a name="module_futoin-asyncsteps.AsyncToolTest.callLater"></a>
###AsyncToolTest.callLater(handle)
Removed callback from internal queue

**Params**

- handle `Object` - Handle returned from AsyncToolTest.callLater  

<a name="module_futoin-asyncsteps.AsyncToolTest.nextEvent"></a>
###AsyncToolTest.nextEvent()
Process next even in the internal queue

<a name="module_futoin-asyncsteps.AsyncToolTest.hasEvents"></a>
###AsyncToolTest.hasEvents()
Check if there are any events scheduled

<a name="module_futoin-asyncsteps.AsyncToolTest.getEvents"></a>
###AsyncToolTest.getEvents()
Get internal even queue

<a name="module_futoin-asyncsteps.AsyncToolTest.resetEvents"></a>
###AsyncToolTest.resetEvents()
Clear internal event queue

<a name="module_futoin-asyncsteps.AsyncToolTest.run"></a>
###AsyncToolTest.run()
Execute all remaining events in the internal queue

<a name="module_futoin-asyncsteps.FutoInErrors"></a>
##class: futoin-asyncsteps.FutoInErrors
**Members**

* [class: futoin-asyncsteps.FutoInErrors](#module_futoin-asyncsteps.FutoInErrors)
  * [new futoin-asyncsteps.FutoInErrors()](#new_module_futoin-asyncsteps.FutoInErrors)
  * [const: FutoInErrors.ConnectError](#module_futoin-asyncsteps.FutoInErrors.ConnectError)
  * [const: FutoInErrors.CommError](#module_futoin-asyncsteps.FutoInErrors.CommError)
  * [const: FutoInErrors.UnknownInterface](#module_futoin-asyncsteps.FutoInErrors.UnknownInterface)
  * [const: FutoInErrors.NotSupportedVersion](#module_futoin-asyncsteps.FutoInErrors.NotSupportedVersion)
  * [const: FutoInErrors.NotImplemented](#module_futoin-asyncsteps.FutoInErrors.NotImplemented)
  * [const: FutoInErrors.Unauthorized](#module_futoin-asyncsteps.FutoInErrors.Unauthorized)
  * [const: FutoInErrors.InternalError](#module_futoin-asyncsteps.FutoInErrors.InternalError)
  * [const: FutoInErrors.InvokerError](#module_futoin-asyncsteps.FutoInErrors.InvokerError)
  * [const: FutoInErrors.InvalidRequest](#module_futoin-asyncsteps.FutoInErrors.InvalidRequest)
  * [const: FutoInErrors.DefenseRejected](#module_futoin-asyncsteps.FutoInErrors.DefenseRejected)
  * [const: FutoInErrors.PleaseReauth](#module_futoin-asyncsteps.FutoInErrors.PleaseReauth)
  * [const: FutoInErrors.SecurityError](#module_futoin-asyncsteps.FutoInErrors.SecurityError)
  * [const: FutoInErrors.Timeout](#module_futoin-asyncsteps.FutoInErrors.Timeout)

<a name="new_module_futoin-asyncsteps.FutoInErrors"></a>
###new futoin-asyncsteps.FutoInErrors()
Semantically, not the correct place to define,
but Core JS Api package would be an overkill for now as there is
no concept of interfaces in JS.

<a name="module_futoin-asyncsteps.FutoInErrors.ConnectError"></a>
###const: FutoInErrors.ConnectError
Connection error before request is sent.
Must be generated on Invoker side

**Default**: `ConnectError`  
<a name="module_futoin-asyncsteps.FutoInErrors.CommError"></a>
###const: FutoInErrors.CommError
Communication error at any stage after request is sent
and before response is received.
Must be generated on Invoker side

**Default**: `CommError`  
<a name="module_futoin-asyncsteps.FutoInErrors.UnknownInterface"></a>
###const: FutoInErrors.UnknownInterface
Unknown interface requested.
Must be generated only on Executor side

**Default**: `UnknownInterface`  
<a name="module_futoin-asyncsteps.FutoInErrors.NotSupportedVersion"></a>
###const: FutoInErrors.NotSupportedVersion
Not supported interface version.
Must be generated only on Executor side

**Default**: `NotSupportedVersion`  
<a name="module_futoin-asyncsteps.FutoInErrors.NotImplemented"></a>
###const: FutoInErrors.NotImplemented
In case interface function is not implemented on Executor side
Must be generated on Executor side

**Default**: `NotImplemented`  
<a name="module_futoin-asyncsteps.FutoInErrors.Unauthorized"></a>
###const: FutoInErrors.Unauthorized
Security policy on Executor side does not allow to
access interface or specific function.
Must be generated only on Executor side

**Default**: `Unauthorized`  
<a name="module_futoin-asyncsteps.FutoInErrors.InternalError"></a>
###const: FutoInErrors.InternalError
Unexpected internal error on Executor side, including internal CommError.
Must be generated only on Executor side

**Default**: `InternalError`  
<a name="module_futoin-asyncsteps.FutoInErrors.InvokerError"></a>
###const: FutoInErrors.InvokerError
Unexpected internal error on Invoker side, not related to CommError.
Must be generated only on Invoker side

**Default**: `InvokerError`  
<a name="module_futoin-asyncsteps.FutoInErrors.InvalidRequest"></a>
###const: FutoInErrors.InvalidRequest
Invalid data is passed as FutoIn request.
Must be generated only on Executor side

**Default**: `InvalidRequest`  
<a name="module_futoin-asyncsteps.FutoInErrors.DefenseRejected"></a>
###const: FutoInErrors.DefenseRejected
Defense system has triggered rejection
Must be generated on Executor side, but also possible to be triggered on Invoker

**Default**: `DefenseRejected`  
<a name="module_futoin-asyncsteps.FutoInErrors.PleaseReauth"></a>
###const: FutoInErrors.PleaseReauth
Executor requests re-authorization
Must be generated only on Executor side

**Default**: `PleaseReauth`  
<a name="module_futoin-asyncsteps.FutoInErrors.SecurityError"></a>
###const: FutoInErrors.SecurityError
'sec' request section has invalid data or not SecureChannel
Must be generated only on Executor side

**Default**: `SecurityError`  
<a name="module_futoin-asyncsteps.FutoInErrors.Timeout"></a>
###const: FutoInErrors.Timeout
Timeout occurred in any stage
Must be used only internally and should never travel in request message

**Default**: `Timeout`  




*documented by [jsdoc-to-markdown](https://github.com/75lb/jsdoc-to-markdown)*.


