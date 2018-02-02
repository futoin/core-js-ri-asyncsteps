
  [![NPM Version](https://img.shields.io/npm/v/futoin-asyncsteps.svg?style=flat)](https://www.npmjs.com/package/futoin-asyncsteps)
  [![NPM Downloads](https://img.shields.io/npm/dm/futoin-asyncsteps.svg?style=flat)](https://www.npmjs.com/package/futoin-asyncsteps)
  [![Build Status](https://travis-ci.org/futoin/core-js-ri-asyncsteps.svg)](https://travis-ci.org/futoin/core-js-ri-asyncsteps)
  [![stable](https://img.shields.io/badge/stability-stable-green.svg?style=flat)](https://www.npmjs.com/package/futoin-asyncsteps)

  [![NPM](https://nodei.co/npm/futoin-asyncsteps.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/futoin-asyncsteps/)

**Stability: 3 - Stable**

Reference implementation of:
 
    FTN12: FutoIn Async API
    Version: 1.11
    
Spec: [FTN12: FutoIn Async API v1.x](https://specs.futoin.org/final/preview/ftn12_async_api-1.html)

Author: [Andrey Galkin](mailto:andrey@futoin.org)

[Documentation](https://futoin.org/)


# About

Adds classical linear program flow structure to async programming
supporting exceptions. error handlers, timeouts, unlimited number of sub-steps,
execution parallelism, loops and job state/context variables.

The source itself is a Node.js module in CommonJS format, but it is friendly to `webpack`.
Browser version also provides `$as` global variable. Since v1.10, all code is ES6 and requires
transpiler for browser's ES5 unless default pre-compiled entry point is used. ES5 standalone
modules are available under es5/ path.

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

Since FTN12 v1.8, `Mutex` and `Throttle` synchronization primitive have been provided.

Since FTN12 v1.10, `Limiter` synchronization primitive have been provided.

# Installation for Node.js

Command line:
```sh
$ npm install futoin-asyncsteps --save
```
or
```sh
$ yarn add futoin-asyncsteps
```

*Hint: checkout [FutoIn CID](https://github.com/futoin/cid-tool) for all tools setup.*

# Browser installation

Pre-built ES5 CJS modules are available under `es5/`. These modules
can be used with `webpack` without transpiler - default "browser" entry point
points to ES5 version.

Webpack dists are also available under `dist/` folder, but their usage should be limited
to sites without build process.

*Warning: older browsers should use `dist/polyfill-asyncsteps.js` for `WeakMap` polyfill used in synchronization primitives.*

*The following globals are available*:

* $as - global reference to futoin-asyncsteps module
* futoin - global namespace-like object for name clashing cases
* futoin.$as - another reference to futoin-asyncsteps module
* FutoInError - global reference to standard FutoIn error codes object
* futoin.AsyncSteps - global reference to futoin-asyncsteps.AsyncSteps class

# Examples

## Simple steps

```javascript
const $as = require('futoin-asyncsteps');

const root_as = $as();

root_as.add( ( as ) => {
    as.success( "MyValue" );
    // as.success() is implicit, if not called
} ).add(
    ( as, arg ) => {
        if ( arg === 'MyValue' ) {
            as.add( ( as ) => {
                as.error( 'MyError', 'Something bad has happened' );
            });
        }
    },
    ( as, err ) => {
        if ( err === 'MyError' ) {
            as.success( 'NotSoBad' );
            // as.add() acts as implicit as.success()
        }
    }
);

root_as.add( ( as, arg ) => {
    if ( arg === 'NotSoBad' ) {
        console.log( 'MyError was ignored: ' + as.state.error_info );
    }
    
    as.state.p1arg = 'abc';
    as.state.p2arg = 'xyz';
    
    const p = as.parallel();
    
    p.add( ( as ) => {
        console.log( 'Parallel Step 1' );
        
        as.add( ( as ) => {
            console.log( 'Parallel Step 1.1' );
            as.state.p1 = as.state.p1arg + '1';
        } );
    } );
    p.add( ( as ) =>{
        console.log( 'Parallel Step 2' );
        
        as.add( ( as ) => {
            console.log( 'Parallel Step 2.1' );
            as.state.p2 = as.state.p2arg + '2';
        } );
    } );
} ).add( ( as ) => {
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

## Mutex example

```javascript
'use strict';

const $as = require('futoin-asyncsteps');
// Note: Mutex requires ES6 and is not provided as member of $as
const Mutex = require( 'futoin-asyncsteps/Mutex' );

const mtx = new Mutex();
let curr_concurrency = 0;

for ( let i = 0; i < 3; ++i )
{
    $as()
        .sync(mtx, (as) => {
            // regular AsyncSteps in critical section
            ++curr_concurrency;
            
            as.add((as) => {
                as.success(curr_concurrency--);
            });
        })
        .add((as, val) => {
            console.log(`Max concurrency ${i}: ${val}`);
        })
        .execute();
}

// Max concurrency 0: 1
// Max concurrency 1: 1
// Max concurrency 2: 1
```

## Throttle example

```javascript
const thrtl = new Throttle(10, 100);
const as = $as();
const p = as.parallel();
let passed = 0;

for ( let i = 0; i < 100; ++i ) {
    p.add((as) => {
        as.sync(thrtl, (as) => { passed += 1 });
    });
}

as.execute();

setTimeout(() => {
    expect(passed).to.equal(50);
}, 450);
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
* **async_stack** - array of references step handler functions to avoid debugging of errors

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

## Modules

<dl>
<dt><a href="#module_futoin-asyncsteps">futoin-asyncsteps</a></dt>
<dd></dd>
<dt><a href="#module_futoin-asyncsteps">futoin-asyncsteps</a></dt>
<dd></dd>
</dl>

## Classes

<dl>
<dt><a href="#ISync">ISync</a></dt>
<dd><p>Base interface for synchronization primitives</p>
</dd>
<dt><a href="#Limiter">Limiter</a></dt>
<dd><p>Limiter - complex processing limit for AsyncSteps</p>
</dd>
<dt><a href="#Mutex">Mutex</a></dt>
<dd><p>Mutual exclusion mechanism for AsyncSteps</p>
</dd>
<dt><a href="#Throttle">Throttle</a></dt>
<dd><p>Throttling for AsyncSteps</p>
</dd>
</dl>

## Members

<dl>
<dt><a href="#FutoInErrors">FutoInErrors</a></dt>
<dd><p>List of standard FutoIn Core errors. It may static get extended in runtime.</p>
</dd>
<dt><a href="#AsyncToolTest">AsyncToolTest</a></dt>
<dd><p>Special event scheduler for testing to be installed with installAsyncToolTest()</p>
</dd>
<dt><a href="#AsyncTool">AsyncTool</a></dt>
<dd><p>Neutral interface to event scheduler</p>
</dd>
<dt><a href="#$as">$as</a></dt>
<dd><p><strong>window.$as</strong> - browser-only reference to futoin-asyncsteps module</p>
</dd>
<dt><a href="#$as">$as</a></dt>
<dd><p><strong>window.FutoIn.$as</strong> - browser-only reference to futoin-asyncsteps module</p>
</dd>
<dt><a href="#FutoInError">FutoInError</a></dt>
<dd><p><strong>window.FutoInError</strong> - browser-only reference to futoin-asyncsteps.FutoInError</p>
</dd>
<dt><a href="#AsyncSteps">AsyncSteps</a></dt>
<dd><p><strong>window.futoin.AsyncSteps</strong> - browser-only reference to futoin-asyncsteps.AsyncSteps</p>
</dd>
<dt><a href="#$as">$as</a></dt>
<dd><p><strong>window.$as</strong> - browser-only reference to futoin-asyncsteps module</p>
</dd>
<dt><a href="#$as">$as</a></dt>
<dd><p><strong>window.FutoIn.$as</strong> - browser-only reference to futoin-asyncsteps module</p>
</dd>
<dt><a href="#FutoInError">FutoInError</a></dt>
<dd><p><strong>window.FutoInError</strong> - browser-only reference to futoin-asyncsteps.FutoInError</p>
</dd>
<dt><a href="#AsyncSteps">AsyncSteps</a></dt>
<dd><p><strong>window.futoin.AsyncSteps</strong> - browser-only reference to futoin-asyncsteps.AsyncSteps</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#installAsyncToolTest">installAsyncToolTest([install])</a></dt>
<dd><p>Use for unit testing to fine control step execution.
It installs AsyncToolTest in place of AsyncTool</p>
</dd>
<dt><a href="#assertAS">assertAS(as)</a></dt>
<dd><p>Ensure parameter is instance of AsyncSteps interfaces</p>
</dd>
</dl>

<a name="module_futoin-asyncsteps"></a>

## futoin-asyncsteps
<a name="module_futoin-asyncsteps"></a>

## futoin-asyncsteps
<a name="ISync"></a>

## ISync
Base interface for synchronization primitives

**Kind**: global class  
<a name="Limiter"></a>

## Limiter
Limiter - complex processing limit for AsyncSteps

**Kind**: global class  
<a name="new_Limiter_new"></a>

### new Limiter([options])
C-tor


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [options] | <code>object</code> | <code>{}</code> | option map |
| [options.concurrent] | <code>integer</code> | <code>1</code> | maximum concurrent flows |
| [options.max_queue] | <code>integer</code> | <code>0</code> | maximum queued |
| [options.rate] | <code>integer</code> | <code>1</code> | maximum entries in period |
| [options.period_ms] | <code>integer</code> | <code>1000</code> | period length |
| [options.burst] | <code>integer</code> | <code>0</code> | maximum queue for rate limiting |

<a name="Mutex"></a>

## Mutex
Mutual exclusion mechanism for AsyncSteps

**Kind**: global class  
<a name="new_Mutex_new"></a>

### new Mutex([max], [max_queue])
C-tor


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [max] | <code>integer</code> | <code>1</code> | maximum number of simultaneous critical section entries |
| [max_queue] | <code>integer</code> | <code></code> | limit queue length, if set |

<a name="Throttle"></a>

## Throttle
Throttling for AsyncSteps

**Kind**: global class  
<a name="new_Throttle_new"></a>

### new Throttle([max], [period_ms], [max_queue])
C-tor


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [max] | <code>integer</code> | <code>1</code> | maximum number of simultaneous critical section entries |
| [period_ms] | <code>intger</code> | <code>1000</code> | time period in milliseconds |
| [max_queue] | <code>integer</code> | <code></code> | limit queue length, if set |

<a name="FutoInErrors"></a>

## FutoInErrors
List of standard FutoIn Core errors. It may static get extended in runtime.

**Kind**: global variable  
<a name="AsyncToolTest"></a>

## AsyncToolTest
Special event scheduler for testing to be installed with installAsyncToolTest()

**Kind**: global variable  

* [AsyncToolTest](#AsyncToolTest)
    * [.callLater(func, [timeout_ms])](#AsyncToolTest.callLater) ⇒ <code>Object</code>
    * [.callLater(handle)](#AsyncToolTest.callLater)
    * [.nextEvent()](#AsyncToolTest.nextEvent)
    * [.hasEvents()](#AsyncToolTest.hasEvents) ⇒ <code>boolean</code>
    * [.getEvents()](#AsyncToolTest.getEvents) ⇒ <code>array</code>
    * [.resetEvents()](#AsyncToolTest.resetEvents)
    * [.run()](#AsyncToolTest.run)

<a name="AsyncToolTest.callLater"></a>

### AsyncToolTest.callLater(func, [timeout_ms]) ⇒ <code>Object</code>
Adds callback to internal queue

**Kind**: static method of [<code>AsyncToolTest</code>](#AsyncToolTest)  
**Returns**: <code>Object</code> - timer handle  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| func | <code>function</code> |  | callback to execute |
| [timeout_ms] | <code>number</code> | <code>0</code> | optional timeout in ms |

<a name="AsyncToolTest.callLater"></a>

### AsyncToolTest.callLater(handle)
Removed callback from internal queue

**Kind**: static method of [<code>AsyncToolTest</code>](#AsyncToolTest)  

| Param | Type | Description |
| --- | --- | --- |
| handle | <code>Object</code> | Handle returned from AsyncToolTest.callLater |

<a name="AsyncToolTest.nextEvent"></a>

### AsyncToolTest.nextEvent()
Process next even in the internal queue

**Kind**: static method of [<code>AsyncToolTest</code>](#AsyncToolTest)  
<a name="AsyncToolTest.hasEvents"></a>

### AsyncToolTest.hasEvents() ⇒ <code>boolean</code>
Check if there are any events scheduled

**Kind**: static method of [<code>AsyncToolTest</code>](#AsyncToolTest)  
**Returns**: <code>boolean</code> - true, if pending events  
<a name="AsyncToolTest.getEvents"></a>

### AsyncToolTest.getEvents() ⇒ <code>array</code>
Get internal even queue

**Kind**: static method of [<code>AsyncToolTest</code>](#AsyncToolTest)  
**Returns**: <code>array</code> - event queue  
<a name="AsyncToolTest.resetEvents"></a>

### AsyncToolTest.resetEvents()
Clear internal event queue

**Kind**: static method of [<code>AsyncToolTest</code>](#AsyncToolTest)  
<a name="AsyncToolTest.run"></a>

### AsyncToolTest.run()
Execute all remaining events in the internal queue

**Kind**: static method of [<code>AsyncToolTest</code>](#AsyncToolTest)  
<a name="AsyncTool"></a>

## AsyncTool
Neutral interface to event scheduler

**Kind**: global variable  

* [AsyncTool](#AsyncTool)
    * [.callLater(func, [timeout_ms])](#AsyncTool.callLater) ⇒ <code>Object</code>
    * [.cancelCall(handle)](#AsyncTool.cancelCall)

<a name="AsyncTool.callLater"></a>

### AsyncTool.callLater(func, [timeout_ms]) ⇒ <code>Object</code>
Wrapper for setTimeout()/setImmediate()

**Kind**: static method of [<code>AsyncTool</code>](#AsyncTool)  
**Returns**: <code>Object</code> - - timer handle  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| func | <code>function</code> |  | callback to execute |
| [timeout_ms] | <code>number</code> | <code>0</code> | optional timeout in ms |

<a name="AsyncTool.cancelCall"></a>

### AsyncTool.cancelCall(handle)
Wrapper for clearTimeout()/clearImmediate()

**Kind**: static method of [<code>AsyncTool</code>](#AsyncTool)  

| Param | Type | Description |
| --- | --- | --- |
| handle | <code>Object</code> | Handle returned from AsyncTool.callLater |

<a name="$as"></a>

## $as
**window.$as** - browser-only reference to futoin-asyncsteps module

**Kind**: global variable  
<a name="$as"></a>

## $as
**window.FutoIn.$as** - browser-only reference to futoin-asyncsteps module

**Kind**: global variable  
<a name="FutoInError"></a>

## FutoInError
**window.FutoInError** - browser-only reference to futoin-asyncsteps.FutoInError

**Kind**: global variable  
<a name="AsyncSteps"></a>

## AsyncSteps
**window.futoin.AsyncSteps** - browser-only reference to futoin-asyncsteps.AsyncSteps

**Kind**: global variable  

* [AsyncSteps](#AsyncSteps)
    * [.state](#AsyncSteps+state) ⇒ <code>object</code>
    * [.add(func, [onerror])](#AsyncSteps+add) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
    * [.parallel([onerror])](#AsyncSteps+parallel) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
    * [.sync(object, func, [onerror])](#AsyncSteps+sync) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
    * [.error(name, [error_info])](#AsyncSteps+error)
    * [.copyFrom(other)](#AsyncSteps+copyFrom) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
    * [.cancel()](#AsyncSteps+cancel) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
    * [.execute()](#AsyncSteps+execute) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
    * [.loop(func, [label])](#AsyncSteps+loop) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
    * [.repeat(count, func, [label])](#AsyncSteps+repeat) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
    * [.forEach(map_or_list, func, [label])](#AsyncSteps+forEach) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
    * [.successStep()](#AsyncSteps+successStep)
    * [.await(promise, [onerror])](#AsyncSteps+await)
    * [.success([..._arg])](#AsyncSteps+success)
    * [.setTimeout(timeout_ms)](#AsyncSteps+setTimeout) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
    * [.setCancel(oncancel)](#AsyncSteps+setCancel) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
    * [.waitExternal()](#AsyncSteps+waitExternal) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
    * [.break([label])](#AsyncSteps+break)
    * [.continue([label])](#AsyncSteps+continue)

<a name="AsyncSteps+state"></a>

### asyncSteps.state ⇒ <code>object</code>
Get AsyncSteps state object.

*Note: There is a JS-specific improvement: as.state === as.state()*

The are the following pre-defined state variables:

* **error_info** - error description, if provided to *as.error()*
* **last_exception** - the last exception caught
* **async_stack** - array of references to executed step handlers in current stack

**Kind**: instance property of [<code>AsyncSteps</code>](#AsyncSteps)  
<a name="AsyncSteps+add"></a>

### asyncSteps.add(func, [onerror]) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
Add sub-step. Can be called multiple times.

**Kind**: instance method of [<code>AsyncSteps</code>](#AsyncSteps)  
**Returns**: [<code>AsyncSteps</code>](#AsyncSteps) - self  

| Param | Type | Description |
| --- | --- | --- |
| func | <code>ExecFunc</code> | function defining non-blocking step execution |
| [onerror] | <code>ErrorFunc</code> | Optional, provide error handler |

<a name="AsyncSteps+parallel"></a>

### asyncSteps.parallel([onerror]) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
Creates a step internally and returns specialized AsyncSteps interfaces all steps
of which are executed in quasi-parallel.

**Kind**: instance method of [<code>AsyncSteps</code>](#AsyncSteps)  
**Returns**: [<code>AsyncSteps</code>](#AsyncSteps) - interface for parallel step adding  

| Param | Type | Description |
| --- | --- | --- |
| [onerror] | <code>ErrorFunc</code> | Optional, provide error handler |

<a name="AsyncSteps+sync"></a>

### asyncSteps.sync(object, func, [onerror]) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
Add sub-step with synchronization against supplied object.

**Kind**: instance method of [<code>AsyncSteps</code>](#AsyncSteps)  
**Returns**: [<code>AsyncSteps</code>](#AsyncSteps) - self  

| Param | Type | Description |
| --- | --- | --- |
| object | [<code>ISync</code>](#ISync) | Mutex, Throttle or other type of synchronization implementation. |
| func | <code>ExecFunc</code> | function defining non-blocking step execution |
| [onerror] | <code>ErrorFunc</code> | Optional, provide error handler |

<a name="AsyncSteps+error"></a>

### asyncSteps.error(name, [error_info])
Set error and throw to abort execution.

*NOTE: If called outside of AsyncSteps stack (e.g. by external event), make sure you catch the exception*

**Kind**: instance method of [<code>AsyncSteps</code>](#AsyncSteps)  
**Throws**:

- <code>Error</code> 


| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | error message, expected to be identifier "InternalError" |
| [error_info] | <code>string</code> | optional descriptive message assigned to as.state.error_info |

<a name="AsyncSteps+copyFrom"></a>

### asyncSteps.copyFrom(other) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
Copy steps and not yet defined state variables from "model" AsyncSteps instance

**Kind**: instance method of [<code>AsyncSteps</code>](#AsyncSteps)  
**Returns**: [<code>AsyncSteps</code>](#AsyncSteps) - self  

| Param | Type | Description |
| --- | --- | --- |
| other | [<code>AsyncSteps</code>](#AsyncSteps) | model instance, which must get be executed |

<a name="AsyncSteps+cancel"></a>

### asyncSteps.cancel() ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
Use only on root AsyncSteps instance. Abort execution of AsyncSteps instance in progress.

**Kind**: instance method of [<code>AsyncSteps</code>](#AsyncSteps)  
**Returns**: [<code>AsyncSteps</code>](#AsyncSteps) - self  
<a name="AsyncSteps+execute"></a>

### asyncSteps.execute() ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
Start execution of AsyncSteps using AsyncTool

It must not be called more than once until cancel/complete (instance can be re-used)

**Kind**: instance method of [<code>AsyncSteps</code>](#AsyncSteps)  
**Returns**: [<code>AsyncSteps</code>](#AsyncSteps) - self  
<a name="AsyncSteps+loop"></a>

### asyncSteps.loop(func, [label]) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
Execute loop until *as.break()* or *as.error()* is called

**Kind**: instance method of [<code>AsyncSteps</code>](#AsyncSteps)  
**Returns**: [<code>AsyncSteps</code>](#AsyncSteps) - self  

| Param | Type | Description |
| --- | --- | --- |
| func | <code>LoopFunc</code> | loop body |
| [label] | <code>string</code> | optional label to use for *as.break()* and *as.continue()* in inner loops |

<a name="AsyncSteps+repeat"></a>

### asyncSteps.repeat(count, func, [label]) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
Call *func(as, i)* for *count* times

**Kind**: instance method of [<code>AsyncSteps</code>](#AsyncSteps)  
**Returns**: [<code>AsyncSteps</code>](#AsyncSteps) - self  

| Param | Type | Description |
| --- | --- | --- |
| count | <code>integer</code> | how many times to call the *func* |
| func | <code>RepeatFunc</code> | loop body |
| [label] | <code>string</code> | optional label to use for *as.break()* and *as.continue()* in inner loops |

<a name="AsyncSteps+forEach"></a>

### asyncSteps.forEach(map_or_list, func, [label]) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
For each *map* or *list* element call *func( as, key, value )*

**Kind**: instance method of [<code>AsyncSteps</code>](#AsyncSteps)  
**Returns**: [<code>AsyncSteps</code>](#AsyncSteps) - self  

| Param | Type | Description |
| --- | --- | --- |
| map_or_list | <code>integer</code> | map or list to iterate over |
| func | <code>ForEachFunc</code> | loop body |
| [label] | <code>string</code> | optional label to use for *as.break()* and *as.continue()* in inner loops |

<a name="AsyncSteps+successStep"></a>

### asyncSteps.successStep()
Shortcut for `this.add( ( as ) => as.success( ...args ) )`

**Kind**: instance method of [<code>AsyncSteps</code>](#AsyncSteps)  

| Param | Type | Description |
| --- | --- | --- |
| [args...] | <code>any</code> | argument to pass, if any |

<a name="AsyncSteps+await"></a>

### asyncSteps.await(promise, [onerror])
Integrate a promise as a step.

**Kind**: instance method of [<code>AsyncSteps</code>](#AsyncSteps)  

| Param | Type | Description |
| --- | --- | --- |
| promise | <code>Promise</code> | promise to add as a step |
| [onerror] | <code>function</code> | error handler to check |

<a name="AsyncSteps+success"></a>

### asyncSteps.success([..._arg])
Successfully complete current step execution, optionally passing result variables to the next step.

**Kind**: instance method of [<code>AsyncSteps</code>](#AsyncSteps)  

| Param | Type | Description |
| --- | --- | --- |
| [..._arg] | <code>\*</code> | unlimited number of result variables with no type constraint |

<a name="AsyncSteps+setTimeout"></a>

### asyncSteps.setTimeout(timeout_ms) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
Set timeout for external event completion with async *as.success()* or *as.error()* call.
If step is not finished until timeout is reached then Timeout error is raised.

**Kind**: instance method of [<code>AsyncSteps</code>](#AsyncSteps)  
**Returns**: [<code>AsyncSteps</code>](#AsyncSteps) - self  
**Note**: Can be used only within **ExecFunc** body.  

| Param | Type | Description |
| --- | --- | --- |
| timeout_ms | <code>number</code> | Timeout in ms |

<a name="AsyncSteps+setCancel"></a>

### asyncSteps.setCancel(oncancel) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
Set cancellation handler to properly handle timeouts and external cancellation.

**Kind**: instance method of [<code>AsyncSteps</code>](#AsyncSteps)  
**Returns**: [<code>AsyncSteps</code>](#AsyncSteps) - self  
**Note**: Can be used only within **ExecFunc** body.  

| Param | Type | Description |
| --- | --- | --- |
| oncancel | <code>CancelFunc</code> | cleanup/cancel logic of external processing |

<a name="AsyncSteps+waitExternal"></a>

### asyncSteps.waitExternal() ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
Mark currently executing step as waiting for external event.

**Kind**: instance method of [<code>AsyncSteps</code>](#AsyncSteps)  
**Returns**: [<code>AsyncSteps</code>](#AsyncSteps) - self  
**Note**: Can be used only within **ExecFunc** body.  
<a name="AsyncSteps+break"></a>

### asyncSteps.break([label])
Break execution of current loop, throws exception

**Kind**: instance method of [<code>AsyncSteps</code>](#AsyncSteps)  

| Param | Type | Description |
| --- | --- | --- |
| [label] | <code>string</code> | Optional. unwind loops, until *label* named loop is exited |

<a name="AsyncSteps+continue"></a>

### asyncSteps.continue([label])
Continue loop execution from the next iteration, throws exception

**Kind**: instance method of [<code>AsyncSteps</code>](#AsyncSteps)  

| Param | Type | Description |
| --- | --- | --- |
| [label] | <code>string</code> | Optional. unwind loops, until *label* named loop is found |

<a name="$as"></a>

## $as
**window.$as** - browser-only reference to futoin-asyncsteps module

**Kind**: global variable  
<a name="$as"></a>

## $as
**window.FutoIn.$as** - browser-only reference to futoin-asyncsteps module

**Kind**: global variable  
<a name="FutoInError"></a>

## FutoInError
**window.FutoInError** - browser-only reference to futoin-asyncsteps.FutoInError

**Kind**: global variable  
<a name="AsyncSteps"></a>

## AsyncSteps
**window.futoin.AsyncSteps** - browser-only reference to futoin-asyncsteps.AsyncSteps

**Kind**: global variable  

* [AsyncSteps](#AsyncSteps)
    * [.state](#AsyncSteps+state) ⇒ <code>object</code>
    * [.add(func, [onerror])](#AsyncSteps+add) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
    * [.parallel([onerror])](#AsyncSteps+parallel) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
    * [.sync(object, func, [onerror])](#AsyncSteps+sync) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
    * [.error(name, [error_info])](#AsyncSteps+error)
    * [.copyFrom(other)](#AsyncSteps+copyFrom) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
    * [.cancel()](#AsyncSteps+cancel) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
    * [.execute()](#AsyncSteps+execute) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
    * [.loop(func, [label])](#AsyncSteps+loop) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
    * [.repeat(count, func, [label])](#AsyncSteps+repeat) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
    * [.forEach(map_or_list, func, [label])](#AsyncSteps+forEach) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
    * [.successStep()](#AsyncSteps+successStep)
    * [.await(promise, [onerror])](#AsyncSteps+await)
    * [.success([..._arg])](#AsyncSteps+success)
    * [.setTimeout(timeout_ms)](#AsyncSteps+setTimeout) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
    * [.setCancel(oncancel)](#AsyncSteps+setCancel) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
    * [.waitExternal()](#AsyncSteps+waitExternal) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
    * [.break([label])](#AsyncSteps+break)
    * [.continue([label])](#AsyncSteps+continue)

<a name="AsyncSteps+state"></a>

### asyncSteps.state ⇒ <code>object</code>
Get AsyncSteps state object.

*Note: There is a JS-specific improvement: as.state === as.state()*

The are the following pre-defined state variables:

* **error_info** - error description, if provided to *as.error()*
* **last_exception** - the last exception caught
* **async_stack** - array of references to executed step handlers in current stack

**Kind**: instance property of [<code>AsyncSteps</code>](#AsyncSteps)  
<a name="AsyncSteps+add"></a>

### asyncSteps.add(func, [onerror]) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
Add sub-step. Can be called multiple times.

**Kind**: instance method of [<code>AsyncSteps</code>](#AsyncSteps)  
**Returns**: [<code>AsyncSteps</code>](#AsyncSteps) - self  

| Param | Type | Description |
| --- | --- | --- |
| func | <code>ExecFunc</code> | function defining non-blocking step execution |
| [onerror] | <code>ErrorFunc</code> | Optional, provide error handler |

<a name="AsyncSteps+parallel"></a>

### asyncSteps.parallel([onerror]) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
Creates a step internally and returns specialized AsyncSteps interfaces all steps
of which are executed in quasi-parallel.

**Kind**: instance method of [<code>AsyncSteps</code>](#AsyncSteps)  
**Returns**: [<code>AsyncSteps</code>](#AsyncSteps) - interface for parallel step adding  

| Param | Type | Description |
| --- | --- | --- |
| [onerror] | <code>ErrorFunc</code> | Optional, provide error handler |

<a name="AsyncSteps+sync"></a>

### asyncSteps.sync(object, func, [onerror]) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
Add sub-step with synchronization against supplied object.

**Kind**: instance method of [<code>AsyncSteps</code>](#AsyncSteps)  
**Returns**: [<code>AsyncSteps</code>](#AsyncSteps) - self  

| Param | Type | Description |
| --- | --- | --- |
| object | [<code>ISync</code>](#ISync) | Mutex, Throttle or other type of synchronization implementation. |
| func | <code>ExecFunc</code> | function defining non-blocking step execution |
| [onerror] | <code>ErrorFunc</code> | Optional, provide error handler |

<a name="AsyncSteps+error"></a>

### asyncSteps.error(name, [error_info])
Set error and throw to abort execution.

*NOTE: If called outside of AsyncSteps stack (e.g. by external event), make sure you catch the exception*

**Kind**: instance method of [<code>AsyncSteps</code>](#AsyncSteps)  
**Throws**:

- <code>Error</code> 


| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | error message, expected to be identifier "InternalError" |
| [error_info] | <code>string</code> | optional descriptive message assigned to as.state.error_info |

<a name="AsyncSteps+copyFrom"></a>

### asyncSteps.copyFrom(other) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
Copy steps and not yet defined state variables from "model" AsyncSteps instance

**Kind**: instance method of [<code>AsyncSteps</code>](#AsyncSteps)  
**Returns**: [<code>AsyncSteps</code>](#AsyncSteps) - self  

| Param | Type | Description |
| --- | --- | --- |
| other | [<code>AsyncSteps</code>](#AsyncSteps) | model instance, which must get be executed |

<a name="AsyncSteps+cancel"></a>

### asyncSteps.cancel() ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
Use only on root AsyncSteps instance. Abort execution of AsyncSteps instance in progress.

**Kind**: instance method of [<code>AsyncSteps</code>](#AsyncSteps)  
**Returns**: [<code>AsyncSteps</code>](#AsyncSteps) - self  
<a name="AsyncSteps+execute"></a>

### asyncSteps.execute() ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
Start execution of AsyncSteps using AsyncTool

It must not be called more than once until cancel/complete (instance can be re-used)

**Kind**: instance method of [<code>AsyncSteps</code>](#AsyncSteps)  
**Returns**: [<code>AsyncSteps</code>](#AsyncSteps) - self  
<a name="AsyncSteps+loop"></a>

### asyncSteps.loop(func, [label]) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
Execute loop until *as.break()* or *as.error()* is called

**Kind**: instance method of [<code>AsyncSteps</code>](#AsyncSteps)  
**Returns**: [<code>AsyncSteps</code>](#AsyncSteps) - self  

| Param | Type | Description |
| --- | --- | --- |
| func | <code>LoopFunc</code> | loop body |
| [label] | <code>string</code> | optional label to use for *as.break()* and *as.continue()* in inner loops |

<a name="AsyncSteps+repeat"></a>

### asyncSteps.repeat(count, func, [label]) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
Call *func(as, i)* for *count* times

**Kind**: instance method of [<code>AsyncSteps</code>](#AsyncSteps)  
**Returns**: [<code>AsyncSteps</code>](#AsyncSteps) - self  

| Param | Type | Description |
| --- | --- | --- |
| count | <code>integer</code> | how many times to call the *func* |
| func | <code>RepeatFunc</code> | loop body |
| [label] | <code>string</code> | optional label to use for *as.break()* and *as.continue()* in inner loops |

<a name="AsyncSteps+forEach"></a>

### asyncSteps.forEach(map_or_list, func, [label]) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
For each *map* or *list* element call *func( as, key, value )*

**Kind**: instance method of [<code>AsyncSteps</code>](#AsyncSteps)  
**Returns**: [<code>AsyncSteps</code>](#AsyncSteps) - self  

| Param | Type | Description |
| --- | --- | --- |
| map_or_list | <code>integer</code> | map or list to iterate over |
| func | <code>ForEachFunc</code> | loop body |
| [label] | <code>string</code> | optional label to use for *as.break()* and *as.continue()* in inner loops |

<a name="AsyncSteps+successStep"></a>

### asyncSteps.successStep()
Shortcut for `this.add( ( as ) => as.success( ...args ) )`

**Kind**: instance method of [<code>AsyncSteps</code>](#AsyncSteps)  

| Param | Type | Description |
| --- | --- | --- |
| [args...] | <code>any</code> | argument to pass, if any |

<a name="AsyncSteps+await"></a>

### asyncSteps.await(promise, [onerror])
Integrate a promise as a step.

**Kind**: instance method of [<code>AsyncSteps</code>](#AsyncSteps)  

| Param | Type | Description |
| --- | --- | --- |
| promise | <code>Promise</code> | promise to add as a step |
| [onerror] | <code>function</code> | error handler to check |

<a name="AsyncSteps+success"></a>

### asyncSteps.success([..._arg])
Successfully complete current step execution, optionally passing result variables to the next step.

**Kind**: instance method of [<code>AsyncSteps</code>](#AsyncSteps)  

| Param | Type | Description |
| --- | --- | --- |
| [..._arg] | <code>\*</code> | unlimited number of result variables with no type constraint |

<a name="AsyncSteps+setTimeout"></a>

### asyncSteps.setTimeout(timeout_ms) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
Set timeout for external event completion with async *as.success()* or *as.error()* call.
If step is not finished until timeout is reached then Timeout error is raised.

**Kind**: instance method of [<code>AsyncSteps</code>](#AsyncSteps)  
**Returns**: [<code>AsyncSteps</code>](#AsyncSteps) - self  
**Note**: Can be used only within **ExecFunc** body.  

| Param | Type | Description |
| --- | --- | --- |
| timeout_ms | <code>number</code> | Timeout in ms |

<a name="AsyncSteps+setCancel"></a>

### asyncSteps.setCancel(oncancel) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
Set cancellation handler to properly handle timeouts and external cancellation.

**Kind**: instance method of [<code>AsyncSteps</code>](#AsyncSteps)  
**Returns**: [<code>AsyncSteps</code>](#AsyncSteps) - self  
**Note**: Can be used only within **ExecFunc** body.  

| Param | Type | Description |
| --- | --- | --- |
| oncancel | <code>CancelFunc</code> | cleanup/cancel logic of external processing |

<a name="AsyncSteps+waitExternal"></a>

### asyncSteps.waitExternal() ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
Mark currently executing step as waiting for external event.

**Kind**: instance method of [<code>AsyncSteps</code>](#AsyncSteps)  
**Returns**: [<code>AsyncSteps</code>](#AsyncSteps) - self  
**Note**: Can be used only within **ExecFunc** body.  
<a name="AsyncSteps+break"></a>

### asyncSteps.break([label])
Break execution of current loop, throws exception

**Kind**: instance method of [<code>AsyncSteps</code>](#AsyncSteps)  

| Param | Type | Description |
| --- | --- | --- |
| [label] | <code>string</code> | Optional. unwind loops, until *label* named loop is exited |

<a name="AsyncSteps+continue"></a>

### asyncSteps.continue([label])
Continue loop execution from the next iteration, throws exception

**Kind**: instance method of [<code>AsyncSteps</code>](#AsyncSteps)  

| Param | Type | Description |
| --- | --- | --- |
| [label] | <code>string</code> | Optional. unwind loops, until *label* named loop is found |

<a name="installAsyncToolTest"></a>

## installAsyncToolTest([install])
Use for unit testing to fine control step execution.
It installs AsyncToolTest in place of AsyncTool

**Kind**: global function  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [install] | <code>boolean</code> | <code>true</code> | true - install AsyncToolTest, false - AsyncTool as scheduler |

<a name="assertAS"></a>

## assertAS(as)
Ensure parameter is instance of AsyncSteps interfaces

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| as | <code>any</code> | paramter to check |



*documented by [jsdoc-to-markdown](https://github.com/75lb/jsdoc-to-markdown)*.


