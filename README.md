
  [![NPM Version](https://img.shields.io/npm/v/futoin-asyncsteps.svg?style=flat)](https://www.npmjs.com/package/futoin-asyncsteps)
  [![NPM Downloads](https://img.shields.io/npm/dm/futoin-asyncsteps.svg?style=flat)](https://www.npmjs.com/package/futoin-asyncsteps)
  [![Build Status](https://travis-ci.org/futoin/core-js-ri-asyncsteps.svg)](https://travis-ci.org/futoin/core-js-ri-asyncsteps)
  [![stable](https://img.shields.io/badge/stability-stable-green.svg?style=flat)](https://www.npmjs.com/package/futoin-asyncsteps)

  [![NPM](https://nodei.co/npm/futoin-asyncsteps.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/futoin-asyncsteps/)

**Stability: 3 - Stable**

Reference implementation of:
 
    FTN12: FutoIn Async API
    Version: 1.6
    
Spec: [FTN12: FutoIn Async API v1.x](http://specs.futoin.org/final/preview/ftn12_async_api-1.html)

[Web Site](http://futoin.org/)


# About

Adds classical linear program flow structure to async programming
supporting exceptions. error handlers, timeouts, unlimited number of sub-steps,
execution parallelism, loops and job state/context variables.

The source itself is a Node.js module in CommonJS format.

Starting from v1.3 a [dist/futoin-asyncsteps.js](dist/futoin-asyncsteps.js) version is provided
repacked with [pure-sjc](https://github.com/RReverser/pure-cjs). It has been tested with
[PhantomJS](http://phantomjs.org/). It should support plain inclusion and AMD.

It should be possible to use any other async framework from AsyncSteps by using
setCancel() and/or setTimeout() methods which allow step completion without success() or
error() result. Specific step-associated AsyncSteps interface will be valid for success() or error()
call on external event.

It also possible to use FutoIn AsyncSteps from any other event framework. Just make sure to notify
external framework from the top most error handler (for errors) and last step (for success).

To minimize cost of closure creation on repetitive execution, a special feature of "model" step
is available: model step is created as usual, but must never get executed. It is possible to copy steps
and state variables using AsyncSteps#copyFrom() to a newly created AsyncSteps object.

There is also a family of async loop functions for unconditional iteration, iteration over data or
iteration with count limit.

# Installation for Node.js

Command line:
```sh
$ npm install futoin-asyncsteps --save
```
and/or package.json:
```
"dependencies" : {
    "futoin-asyncsteps" : "^1"
}
```

# Installation for Browser

```sh
$ bower install futoin-asyncsteps --save
```

Note: there are the following globals available:

* $as - global reference to futoin-asyncsteps module
* futoin - global namespace-like object for name clashing cases
* futoin.$as - another reference tp futoin-asyncsteps module
* FutoInError - global reference to standard FutoIn error codes object
* futoin.AsyncSteps - global reference to futoin-asyncsteps.AsyncSteps class

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
            } );
        } )
        .add( function( as ){
            console.log( 'Parallel Step 2' );
            
            as.add( function( as ){
                console.log( 'Parallel Step 2.1' );
                as.state.p2 = as.state.p2arg + '2';
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
});

for ( var i = 0; i < 3; ++i )
{
    var root_as = async_steps();
    root_as.copyFrom( model_as );
    root_as.add( function(as){
        as.add(function( as ){
            console.log('>> The first inner step');
        });
        as.copyFrom( model_as );
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

## Simple Async Loops

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

## Browser example

```html
<script src="../dist/futoin-asyncsteps.js" type="text/javascript" charset="utf-8"></script>
<script type="text/javascript" charset="utf-8">
$as()
.add(function(as){
    console.log( 'Step1' );
})
.add(function(as){
    console.log( 'Step2' );
})
.execute();
</script>
```

Result:
```
Step1
Step2
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

## 1.6. Implicit as.success()

If there are no sub-steps added, no timeout set and no cancel handler set then
implicit as.success() call is assumed to simplify code and increase efficiency.

    as.add(func( as ){
        doSomeStuff( as );
    })

## 1.7. Error Info and Last Exception

Pre-defined state variables:

* **error_info** - value of the second parameter passed to the last *as.error()* call
* **last_exception** - the last exception caught, if feasible

Error code is not always descriptive enough, especially, if it can be generated in multiple ways.
As a convention special "error_info" state field should hold descriptive information of the last error.
Therefore, *as.error()* is extended with optional parameter error_info.

"last_exception" state variables may hold the last exception object caught, if feasible
to implement. It should be populated with FutoIn errors as well.


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


## 1.9. The Safety Rules of libraries with AsyncSteps interface

1. as.success() should be called only in top-most function of the
    step (the one passed to as.add() directly)
1. setCancel() and/or setTimeout() must be called only in top most function
    as repeated call overrides in scope of step

    
# API documentation

The concept is described in FutoIn specification: [FTN12: FutoIn Async API v1.x](http://specs.futoin.org/final/preview/ftn12_async_api-1.html)

#Index

**Modules**

* [futoin-asyncsteps](#module_futoin-asyncsteps)

**Classes**

* [class: AsyncSteps](#AsyncSteps)
  * [new AsyncSteps([state])](#new_AsyncSteps)
  * [asyncSteps.state](#AsyncSteps#state)
  * [asyncSteps.success([...arg])](#AsyncSteps#success)
  * [~~asyncSteps.successStep()~~](#AsyncSteps#successStep)
  * [asyncSteps.setTimeout(timeout_ms)](#AsyncSteps#setTimeout)
  * [asyncSteps.setCancel(oncancel)](#AsyncSteps#setCancel)
  * [asyncSteps.loop(func, [label])](#AsyncSteps#loop)
  * [asyncSteps.repeat(count, func, [label])](#AsyncSteps#repeat)
  * [asyncSteps.forEach(map_or_list, func, [label])](#AsyncSteps#forEach)
  * [asyncSteps.break([label])](#AsyncSteps#break)
  * [asyncSteps.continue([label])](#AsyncSteps#continue)
  * [asyncSteps.add(func, [onerror])](#AsyncSteps#add)
  * [asyncSteps.parallel([onerror])](#AsyncSteps#parallel)
  * [asyncSteps.error(name, [error_info])](#AsyncSteps#error)
  * [asyncSteps.copyFrom(other)](#AsyncSteps#copyFrom)
  * [asyncSteps.cancel()](#AsyncSteps#cancel)
  * [asyncSteps.execute()](#AsyncSteps#execute)
* [class: AsyncTool](#AsyncTool)
  * [new AsyncTool()](#new_AsyncTool)
  * [AsyncTool.callLater(func, [timeout_ms])](#AsyncTool.callLater)
  * [AsyncTool.cancelCall(handle)](#AsyncTool.cancelCall)
* [class: AsyncToolTest](#AsyncToolTest)
  * [new AsyncToolTest()](#new_AsyncToolTest)
  * [AsyncToolTest.callLater(func, [timeout_ms])](#AsyncToolTest.callLater)
  * [AsyncToolTest.callLater(handle)](#AsyncToolTest.callLater)
  * [AsyncToolTest.nextEvent()](#AsyncToolTest.nextEvent)
  * [AsyncToolTest.hasEvents()](#AsyncToolTest.hasEvents)
  * [AsyncToolTest.getEvents()](#AsyncToolTest.getEvents)
  * [AsyncToolTest.resetEvents()](#AsyncToolTest.resetEvents)
  * [AsyncToolTest.run()](#AsyncToolTest.run)
* [class: FutoInErrors](#FutoInErrors)
  * [new FutoInErrors()](#new_FutoInErrors)
  * [const: FutoInErrors.ConnectError](#FutoInErrors.ConnectError)
  * [const: FutoInErrors.CommError](#FutoInErrors.CommError)
  * [const: FutoInErrors.UnknownInterface](#FutoInErrors.UnknownInterface)
  * [const: FutoInErrors.NotSupportedVersion](#FutoInErrors.NotSupportedVersion)
  * [const: FutoInErrors.NotImplemented](#FutoInErrors.NotImplemented)
  * [const: FutoInErrors.Unauthorized](#FutoInErrors.Unauthorized)
  * [const: FutoInErrors.InternalError](#FutoInErrors.InternalError)
  * [const: FutoInErrors.InvokerError](#FutoInErrors.InvokerError)
  * [const: FutoInErrors.InvalidRequest](#FutoInErrors.InvalidRequest)
  * [const: FutoInErrors.DefenseRejected](#FutoInErrors.DefenseRejected)
  * [const: FutoInErrors.PleaseReauth](#FutoInErrors.PleaseReauth)
  * [const: FutoInErrors.SecurityError](#FutoInErrors.SecurityError)
  * [const: FutoInErrors.Timeout](#FutoInErrors.Timeout)

**Functions**

* [installAsyncToolTest([install])](#installAsyncToolTest)

**Members**

* [$as](#$as)
* [$as](#$as)
* [FutoInError](#FutoInError)
* [AsyncSteps](#AsyncSteps)
  * [asyncSteps.state](#AsyncSteps#state)
  * [asyncSteps.success([...arg])](#AsyncSteps#success)
  * [~~asyncSteps.successStep()~~](#AsyncSteps#successStep)
  * [asyncSteps.setTimeout(timeout_ms)](#AsyncSteps#setTimeout)
  * [asyncSteps.setCancel(oncancel)](#AsyncSteps#setCancel)
  * [asyncSteps.loop(func, [label])](#AsyncSteps#loop)
  * [asyncSteps.repeat(count, func, [label])](#AsyncSteps#repeat)
  * [asyncSteps.forEach(map_or_list, func, [label])](#AsyncSteps#forEach)
  * [asyncSteps.break([label])](#AsyncSteps#break)
  * [asyncSteps.continue([label])](#AsyncSteps#continue)
  * [asyncSteps.add(func, [onerror])](#AsyncSteps#add)
  * [asyncSteps.parallel([onerror])](#AsyncSteps#parallel)
  * [asyncSteps.error(name, [error_info])](#AsyncSteps#error)
  * [asyncSteps.copyFrom(other)](#AsyncSteps#copyFrom)
  * [asyncSteps.cancel()](#AsyncSteps#cancel)
  * [asyncSteps.execute()](#AsyncSteps#execute)

**Typedefs**

* [callback: LoopFunc](#LoopFunc)
* [callback: RepeatFunc](#RepeatFunc)
* [callback: ForEachFunc](#ForEachFunc)
* [callback: ExecFunc](#ExecFunc)
* [callback: ErrorFunc](#ErrorFunc)
* [callback: CancelFunc](#CancelFunc)
 
<a name="module_futoin-asyncsteps"></a>
#futoin-asyncsteps
<a name="AsyncSteps"></a>
#class: AsyncSteps
**Members**

* [class: AsyncSteps](#AsyncSteps)
  * [new AsyncSteps([state])](#new_AsyncSteps)
  * [asyncSteps.state](#AsyncSteps#state)
  * [asyncSteps.success([...arg])](#AsyncSteps#success)
  * [~~asyncSteps.successStep()~~](#AsyncSteps#successStep)
  * [asyncSteps.setTimeout(timeout_ms)](#AsyncSteps#setTimeout)
  * [asyncSteps.setCancel(oncancel)](#AsyncSteps#setCancel)
  * [asyncSteps.loop(func, [label])](#AsyncSteps#loop)
  * [asyncSteps.repeat(count, func, [label])](#AsyncSteps#repeat)
  * [asyncSteps.forEach(map_or_list, func, [label])](#AsyncSteps#forEach)
  * [asyncSteps.break([label])](#AsyncSteps#break)
  * [asyncSteps.continue([label])](#AsyncSteps#continue)
  * [asyncSteps.add(func, [onerror])](#AsyncSteps#add)
  * [asyncSteps.parallel([onerror])](#AsyncSteps#parallel)
  * [asyncSteps.error(name, [error_info])](#AsyncSteps#error)
  * [asyncSteps.copyFrom(other)](#AsyncSteps#copyFrom)
  * [asyncSteps.cancel()](#AsyncSteps#cancel)
  * [asyncSteps.execute()](#AsyncSteps#execute)

<a name="new_AsyncSteps"></a>
##new AsyncSteps([state])
Root AsyncStep implementation

**Params**

- \[state\] `Object` - For internal use. State variable sharing  

<a name="AsyncSteps#state"></a>
##asyncSteps.state
Get AsyncSteps state object.

*Note: There is a JS-specific improvement: as.state === as.state()*

The are the following pre-defined state variables:

* **error_info** - error description, if provided to *as.error()*
* **last_exception** - the last exception caught

**Returns**: `object`  
<a name="AsyncSteps#success"></a>
##asyncSteps.success([...arg])
Successfully complete current step execution, optionally passing result variables to the next step.

**Params**

- \[...arg\] `*` - unlimited number of result variables with no type constraint  

<a name="AsyncSteps#successStep"></a>
##~~asyncSteps.successStep()~~
Deprecated with FTN12 v1.5
If sub-steps have been added then add efficient dummy step which behavior of as.success();
Otherwise, simply call *as.success();*

***Deprecated***  
<a name="AsyncSteps#setTimeout"></a>
##asyncSteps.setTimeout(timeout_ms)
Set timeout for external event completion with async *as.success()* or *as.error()* call.
If step is not finished until timeout is reached then Timeout error is raised.

*Note: Can be used only within **ExecFunc** body.*

**Params**

- timeout_ms `number` - Timeout in ms  

<a name="AsyncSteps#setCancel"></a>
##asyncSteps.setCancel(oncancel)
Set cancellation handler to properly handle timeouts and external cancellation.

*Note: Can be used only within **ExecFunc** body.*

**Params**

- oncancel <code>[CancelFunc](#CancelFunc)</code> - cleanup/cancel logic of external processing  

<a name="AsyncSteps#loop"></a>
##asyncSteps.loop(func, [label])
Execute loop until *as.break()* or *as.error()* is called

**Params**

- func <code>[LoopFunc](#LoopFunc)</code> - loop body  
- \[label\] `string` - optional label to use for *as.break()* and *as.continue()* in inner loops  

<a name="AsyncSteps#repeat"></a>
##asyncSteps.repeat(count, func, [label])
Call *func(as, i)* for *count* times

**Params**

- count `integer` - how many times to call the *func*  
- func <code>[RepeatFunc](#RepeatFunc)</code> - loop body  
- \[label\] `string` - optional label to use for *as.break()* and *as.continue()* in inner loops  

<a name="AsyncSteps#forEach"></a>
##asyncSteps.forEach(map_or_list, func, [label])
For each *map* or *list* element call *func( as, key, value )*

**Params**

- map_or_list `integer` - map or list to iterate over  
- func <code>[ForEachFunc](#ForEachFunc)</code> - loop body  
- \[label\] `string` - optional label to use for *as.break()* and *as.continue()* in inner loops  

<a name="AsyncSteps#break"></a>
##asyncSteps.break([label])
Break execution of current loop, throws exception

**Params**

- \[label\] `string` - Optional. unwind loops, until *label* named loop is exited  

<a name="AsyncSteps#continue"></a>
##asyncSteps.continue([label])
Continue loop execution from the next iteration, throws exception

**Params**

- \[label\] `string` - Optional. unwind loops, until *label* named loop is found  

<a name="AsyncSteps#add"></a>
##asyncSteps.add(func, [onerror])
Add sub-step. Can be called multiple times.

**Params**

- func <code>[ExecFunc](#ExecFunc)</code> - function defining non-blocking step execution  
- \[onerror\] <code>[ErrorFunc](#ErrorFunc)</code> - Optional, provide error handler  

**Returns**: [AsyncSteps](#AsyncSteps)  
<a name="AsyncSteps#parallel"></a>
##asyncSteps.parallel([onerror])
Creates a step internally and returns specialized AsyncSteps interfaces all steps
of which are executed in quasi-parallel.

**Params**

- \[onerror\] <code>[ErrorFunc](#ErrorFunc)</code> - Optional, provide error handler  

**Returns**: [AsyncSteps](#AsyncSteps)  
<a name="AsyncSteps#error"></a>
##asyncSteps.error(name, [error_info])
Set error and throw to abort execution.

*NOTE: If called outside of AsyncSteps stack (e.g. by external event), make sure you catch the exception*

**Params**

- name `string` - error message, expected to be identifier "InternalError"  
- \[error_info\] `string` - optional descriptive message assigned to as.state.error_info  

**Type**: `Error`  
<a name="AsyncSteps#copyFrom"></a>
##asyncSteps.copyFrom(other)
Copy steps and not yet defined state variables from "model" AsyncSteps instance

**Params**

- other <code>[AsyncSteps](#AsyncSteps)</code> - model instance, which must get be executed  

<a name="AsyncSteps#cancel"></a>
##asyncSteps.cancel()
Use only on root AsyncSteps instance. Abort execution of AsyncSteps instance in progress.

<a name="AsyncSteps#execute"></a>
##asyncSteps.execute()
Start execution of AsyncSteps using AsyncTool

It must not be called more than once until cancel/complete (instance can be re-used)

<a name="AsyncTool"></a>
#class: AsyncTool
**Members**

* [class: AsyncTool](#AsyncTool)
  * [new AsyncTool()](#new_AsyncTool)
  * [AsyncTool.callLater(func, [timeout_ms])](#AsyncTool.callLater)
  * [AsyncTool.cancelCall(handle)](#AsyncTool.cancelCall)

<a name="new_AsyncTool"></a>
##new AsyncTool()
Neutral interface to event scheduler

<a name="AsyncTool.callLater"></a>
##AsyncTool.callLater(func, [timeout_ms])
Wrapper for setTimeout()/setImmediate()

**Params**

- func `function` - callback to execute  
- \[timeout_ms=0\] `number` - optional timeout in ms  

**Returns**: `Object` - - timer handle  
<a name="AsyncTool.cancelCall"></a>
##AsyncTool.cancelCall(handle)
Wrapper for clearTimeout()/clearImmediate()

**Params**

- handle `Object` - Handle returned from AsyncTool.callLater  

<a name="AsyncToolTest"></a>
#class: AsyncToolTest
**Members**

* [class: AsyncToolTest](#AsyncToolTest)
  * [new AsyncToolTest()](#new_AsyncToolTest)
  * [AsyncToolTest.callLater(func, [timeout_ms])](#AsyncToolTest.callLater)
  * [AsyncToolTest.callLater(handle)](#AsyncToolTest.callLater)
  * [AsyncToolTest.nextEvent()](#AsyncToolTest.nextEvent)
  * [AsyncToolTest.hasEvents()](#AsyncToolTest.hasEvents)
  * [AsyncToolTest.getEvents()](#AsyncToolTest.getEvents)
  * [AsyncToolTest.resetEvents()](#AsyncToolTest.resetEvents)
  * [AsyncToolTest.run()](#AsyncToolTest.run)

<a name="new_AsyncToolTest"></a>
##new AsyncToolTest()
Special event scheduler for testing to be installed with installAsyncToolTest()

<a name="AsyncToolTest.callLater"></a>
##AsyncToolTest.callLater(func, [timeout_ms])
Adds callback to internal queue

**Params**

- func `function` - callback to execute  
- \[timeout_ms=0\] `number` - optional timeout in ms  

**Returns**: `Object` - - timer handle  
<a name="AsyncToolTest.callLater"></a>
##AsyncToolTest.callLater(handle)
Removed callback from internal queue

**Params**

- handle `Object` - Handle returned from AsyncToolTest.callLater  

<a name="AsyncToolTest.nextEvent"></a>
##AsyncToolTest.nextEvent()
Process next even in the internal queue

<a name="AsyncToolTest.hasEvents"></a>
##AsyncToolTest.hasEvents()
Check if there are any events scheduled

<a name="AsyncToolTest.getEvents"></a>
##AsyncToolTest.getEvents()
Get internal even queue

<a name="AsyncToolTest.resetEvents"></a>
##AsyncToolTest.resetEvents()
Clear internal event queue

<a name="AsyncToolTest.run"></a>
##AsyncToolTest.run()
Execute all remaining events in the internal queue

<a name="FutoInErrors"></a>
#class: FutoInErrors
**Members**

* [class: FutoInErrors](#FutoInErrors)
  * [new FutoInErrors()](#new_FutoInErrors)
  * [const: FutoInErrors.ConnectError](#FutoInErrors.ConnectError)
  * [const: FutoInErrors.CommError](#FutoInErrors.CommError)
  * [const: FutoInErrors.UnknownInterface](#FutoInErrors.UnknownInterface)
  * [const: FutoInErrors.NotSupportedVersion](#FutoInErrors.NotSupportedVersion)
  * [const: FutoInErrors.NotImplemented](#FutoInErrors.NotImplemented)
  * [const: FutoInErrors.Unauthorized](#FutoInErrors.Unauthorized)
  * [const: FutoInErrors.InternalError](#FutoInErrors.InternalError)
  * [const: FutoInErrors.InvokerError](#FutoInErrors.InvokerError)
  * [const: FutoInErrors.InvalidRequest](#FutoInErrors.InvalidRequest)
  * [const: FutoInErrors.DefenseRejected](#FutoInErrors.DefenseRejected)
  * [const: FutoInErrors.PleaseReauth](#FutoInErrors.PleaseReauth)
  * [const: FutoInErrors.SecurityError](#FutoInErrors.SecurityError)
  * [const: FutoInErrors.Timeout](#FutoInErrors.Timeout)

<a name="new_FutoInErrors"></a>
##new FutoInErrors()
List of standard FutoIn Core errors. It may get extended in runtime.

<a name="FutoInErrors.ConnectError"></a>
##const: FutoInErrors.ConnectError
Connection error before request is sent.
Must be generated on Invoker side

**Default**: `ConnectError`  
<a name="FutoInErrors.CommError"></a>
##const: FutoInErrors.CommError
Communication error at any stage after request is sent
and before response is received.
Must be generated on Invoker side

**Default**: `CommError`  
<a name="FutoInErrors.UnknownInterface"></a>
##const: FutoInErrors.UnknownInterface
Unknown interface requested.
Must be generated only on Executor side

**Default**: `UnknownInterface`  
<a name="FutoInErrors.NotSupportedVersion"></a>
##const: FutoInErrors.NotSupportedVersion
Not supported interface version.
Must be generated only on Executor side

**Default**: `NotSupportedVersion`  
<a name="FutoInErrors.NotImplemented"></a>
##const: FutoInErrors.NotImplemented
In case interface function is not implemented on Executor side
Must be generated on Executor side

**Default**: `NotImplemented`  
<a name="FutoInErrors.Unauthorized"></a>
##const: FutoInErrors.Unauthorized
Security policy on Executor side does not allow to
access interface or specific function.
Must be generated only on Executor side

**Default**: `Unauthorized`  
<a name="FutoInErrors.InternalError"></a>
##const: FutoInErrors.InternalError
Unexpected internal error on Executor side, including internal CommError.
Must be generated only on Executor side

**Default**: `InternalError`  
<a name="FutoInErrors.InvokerError"></a>
##const: FutoInErrors.InvokerError
Unexpected internal error on Invoker side, not related to CommError.
Must be generated only on Invoker side

**Default**: `InvokerError`  
<a name="FutoInErrors.InvalidRequest"></a>
##const: FutoInErrors.InvalidRequest
Invalid data is passed as FutoIn request.
Must be generated only on Executor side

**Default**: `InvalidRequest`  
<a name="FutoInErrors.DefenseRejected"></a>
##const: FutoInErrors.DefenseRejected
Defense system has triggered rejection
Must be generated on Executor side, but also possible to be triggered on Invoker

**Default**: `DefenseRejected`  
<a name="FutoInErrors.PleaseReauth"></a>
##const: FutoInErrors.PleaseReauth
Executor requests re-authorization
Must be generated only on Executor side

**Default**: `PleaseReauth`  
<a name="FutoInErrors.SecurityError"></a>
##const: FutoInErrors.SecurityError
'sec' request section has invalid data or not SecureChannel
Must be generated only on Executor side

**Default**: `SecurityError`  
<a name="FutoInErrors.Timeout"></a>
##const: FutoInErrors.Timeout
Timeout occurred in any stage
Must be used only internally and should never travel in request message

**Default**: `Timeout`  
<a name="installAsyncToolTest"></a>
#installAsyncToolTest([install])
Use for unit testing to fine control step execution.
It installs AsyncToolTest in place of AsyncTool

**Params**

- \[install=true\] `boolean` - true - install AsyncToolTest, false - AsyncTool as scheduler  

<a name="$as"></a>
#$as
**window.$as** - browser-only reference to futoin-asyncsteps module

<a name="$as"></a>
#$as
**window.FutoIn.$as** - browser-only reference to futoin-asyncsteps module

<a name="FutoInError"></a>
#FutoInError
**window.FutoInError** - browser-only reference to futoin-asyncsteps.FutoInError

<a name="AsyncSteps"></a>
#AsyncSteps
**window.futoin.AsyncSteps** - browser-only reference to futoin-asyncsteps.AsyncSteps

<a name="LoopFunc"></a>
#callback: LoopFunc
It is just a subset of *ExecFunc*

**Params**

- as <code>[AsyncSteps](#AsyncSteps)</code> - the only valid reference to AsyncSteps with required level of protection  

**Type**: `function`  
<a name="RepeatFunc"></a>
#callback: RepeatFunc
It is just a subset of *ExecFunc*

**Params**

- as <code>[AsyncSteps](#AsyncSteps)</code> - the only valid reference to AsyncSteps with required level of protection  
- i `integer` - current iteration starting from 0  

**Type**: `function`  
<a name="ForEachFunc"></a>
#callback: ForEachFunc
It is just a subset of *ExecFunc*

**Params**

- as <code>[AsyncSteps](#AsyncSteps)</code> - the only valid reference to AsyncSteps with required level of protection  
- i `integer` - current iteration starting from 0  

**Type**: `function`  
<a name="ExecFunc"></a>
#callback: ExecFunc
*execute_callback* as defined in **FTN12: FutoIn AsyncSteps** specification. Function must have
non-blocking body calling:  *as.success()* or *as.error()* or *as.add()/as.parallel()*.

**Params**

- as <code>[AsyncSteps](#AsyncSteps)</code> - the only valid reference to AsyncSteps with required level of protection  
- \[...val\] `*` - any result values passed to the previous as.success() call  

**Type**: `function`  
<a name="ErrorFunc"></a>
#callback: ErrorFunc
*error_callback* as defined in **FTN12: FutoIn AsyncSteps** specification.
Function can:

* do nothing
* override error message with *as.error( new_error )*
* continue execution with *as.success()*

**Params**

- as <code>[AsyncSteps](#AsyncSteps)</code> - the only valid reference to AsyncSteps with required level of protection  
- err `string` - error message  

**Type**: `function`  
<a name="CancelFunc"></a>
#callback: CancelFunc
*cancel_callback* as defined in **FTN12: FutoIn AsyncSteps** specification.

**Params**

- as <code>[AsyncSteps](#AsyncSteps)</code> - the only valid reference to AsyncSteps with required level of protection  

**Type**: `function`  



*documented by [jsdoc-to-markdown](https://github.com/75lb/jsdoc-to-markdown)*.


