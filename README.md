
  [![NPM Version](https://img.shields.io/npm/v/futoin-asyncsteps.svg?style=flat)](https://www.npmjs.com/package/futoin-asyncsteps)
  [![NPM Downloads](https://img.shields.io/npm/dm/futoin-asyncsteps.svg?style=flat)](https://www.npmjs.com/package/futoin-asyncsteps)
  [![Build Status](https://travis-ci.org/futoin/core-js-ri-asyncsteps.svg)](https://travis-ci.org/futoin/core-js-ri-asyncsteps)
  [![stable](https://img.shields.io/badge/stability-stable-green.svg?style=flat)](https://www.npmjs.com/package/futoin-asyncsteps)

  [![NPM](https://nodei.co/npm/futoin-asyncsteps.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/futoin-asyncsteps/)

**Stability: 3 - Stable**

# About

FutoIn AsyncSteps mimics traditional threads of execution in single threaded event loop. It
supports all features including cancellation, exit handlers, thread local storage and synchronization
primitives.

Additionally, it supports async/Promise integration as step through `as.await()` API.


**Documentation** --> [FutoIn Guide](https://futoin.org/docs/asyncsteps/)


Reference implementation of:
 
    FTN12: FutoIn Async API
    Version: 1.11
    
Spec: [FTN12: FutoIn Async API v1.x](https://specs.futoin.org/final/preview/ftn12_async_api-1.html)

Author: [Andrey Galkin](mailto:andrey@futoin.org)

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
to sites without build process. There are "full", "lite" and "development" version builds.

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

## Test case aid

```javascript
// NOTE: it's not exposed through main entry point
$as_test = require( 'futoin-asyncsteps/testcase' );

// Positive test example
it( 'should ...', $as_test(
    ( as ) => {
        // some test logic
    }
) );

// Negative test example
it( 'should ...', $as_test(
    ( as ) => {
        // some test logic
        // Forced as.error('NegativeTestMustThrow') step in the end
    },
    ( as, err ) => {
        if ( err === 'ExpectedError' ) {
            as.success();
        }
    }
) );

// Access "this" provided by Mocha
it( 'should ...', $as_test(
    function( as ) {
        // note use a full function instead of a light arrow function
        this.timeout( 1e3 );
    }
) );
```

## `async`/`await`/`Promise` integration

```javascript
const func = async () => {
    // AsyncSteps can be used as Promise
    await $as().add( (as) => {} ).promise();
};

// AsyncSteps can await Promise
$as.await(func);
```

# API reference

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
<dt><a href="#AsyncTool">AsyncTool</a></dt>
<dd><p>Neutral interface to event scheduler</p>
</dd>
<dt><a href="#AsyncToolTest">AsyncToolTest</a></dt>
<dd><p>Special event scheduler for testing to be installed with installAsyncToolTest()</p>
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

## Objects

<dl>
<dt><a href="#FutoInErrors">FutoInErrors</a> : <code>object</code></dt>
<dd><p>List of standard FutoIn Core errors. It may static get extended in runtime.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#$as_test">$as_test(func, [onerror])</a> ⇒ <code>function</code></dt>
<dd><p>Mocha-compatible test case based on AsyncSteps.</p>
<p>Example:</p>
<pre><code class="language-javascript">it(&#39;should ...&#39;, $as_test( (as) =&gt; {}, (as, err) =&gt; {} );</code></pre>
</dd>
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

<a name="AsyncTool"></a>

## AsyncTool
Neutral interface to event scheduler

**Kind**: global variable  

* [AsyncTool](#AsyncTool)
    * [.callLater(func, [timeout_ms])](#AsyncTool.callLater) ⇒ <code>Object</code>
    * [.cancelCall(handle)](#AsyncTool.cancelCall)
    * [.callImmediate(func)](#AsyncTool.callImmediate) ⇒ <code>Object</code>
    * [.cancelImmediate(handle)](#AsyncTool.cancelImmediate)

<a name="AsyncTool.callLater"></a>

### AsyncTool.callLater(func, [timeout_ms]) ⇒ <code>Object</code>
Wrapper for setTimeout()

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

<a name="AsyncTool.callImmediate"></a>

### AsyncTool.callImmediate(func) ⇒ <code>Object</code>
Wrapper for setImmediate()

**Kind**: static method of [<code>AsyncTool</code>](#AsyncTool)  
**Returns**: <code>Object</code> - - timer handle  

| Param | Type | Description |
| --- | --- | --- |
| func | <code>function</code> | callback to execute |

<a name="AsyncTool.cancelImmediate"></a>

### AsyncTool.cancelImmediate(handle)
Wrapper for clearImmediate()

**Kind**: static method of [<code>AsyncTool</code>](#AsyncTool)  

| Param | Type | Description |
| --- | --- | --- |
| handle | <code>Object</code> | Handle returned from AsyncTool.callImmediate |

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
    * [.successStep()](#AsyncSteps+successStep) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
    * [.await(promise, [onerror])](#AsyncSteps+await) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
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

### asyncSteps.successStep() ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
Shortcut for `this.add( ( as ) => as.success( ...args ) )`

**Kind**: instance method of [<code>AsyncSteps</code>](#AsyncSteps)  
**Returns**: [<code>AsyncSteps</code>](#AsyncSteps) - self  

| Param | Type | Description |
| --- | --- | --- |
| [args...] | <code>any</code> | argument to pass, if any |

<a name="AsyncSteps+await"></a>

### asyncSteps.await(promise, [onerror]) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
Integrate a promise as a step.

**Kind**: instance method of [<code>AsyncSteps</code>](#AsyncSteps)  
**Returns**: [<code>AsyncSteps</code>](#AsyncSteps) - self  

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
    * [.successStep()](#AsyncSteps+successStep) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
    * [.await(promise, [onerror])](#AsyncSteps+await) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
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

### asyncSteps.successStep() ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
Shortcut for `this.add( ( as ) => as.success( ...args ) )`

**Kind**: instance method of [<code>AsyncSteps</code>](#AsyncSteps)  
**Returns**: [<code>AsyncSteps</code>](#AsyncSteps) - self  

| Param | Type | Description |
| --- | --- | --- |
| [args...] | <code>any</code> | argument to pass, if any |

<a name="AsyncSteps+await"></a>

### asyncSteps.await(promise, [onerror]) ⇒ [<code>AsyncSteps</code>](#AsyncSteps)
Integrate a promise as a step.

**Kind**: instance method of [<code>AsyncSteps</code>](#AsyncSteps)  
**Returns**: [<code>AsyncSteps</code>](#AsyncSteps) - self  

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

<a name="FutoInErrors"></a>

## FutoInErrors : <code>object</code>
List of standard FutoIn Core errors. It may static get extended in runtime.

**Kind**: global namespace  

* [FutoInErrors](#FutoInErrors) : <code>object</code>
    * [.ConnectError](#FutoInErrors.ConnectError) : <code>string</code>
    * [.CommError](#FutoInErrors.CommError) : <code>string</code>
    * [.UnknownInterface](#FutoInErrors.UnknownInterface) : <code>string</code>
    * [.NotSupportedVersion](#FutoInErrors.NotSupportedVersion) : <code>string</code>
    * [.NotImplemented](#FutoInErrors.NotImplemented) : <code>string</code>
    * [.Unauthorized](#FutoInErrors.Unauthorized) : <code>string</code>
    * [.InternalError](#FutoInErrors.InternalError) : <code>string</code>
    * [.InvokerError](#FutoInErrors.InvokerError) : <code>string</code>
    * [.InvalidRequest](#FutoInErrors.InvalidRequest) : <code>string</code>
    * [.DefenseRejected](#FutoInErrors.DefenseRejected) : <code>string</code>
    * [.PleaseReauth](#FutoInErrors.PleaseReauth) : <code>string</code>
    * [.SecurityError](#FutoInErrors.SecurityError) : <code>string</code>
    * [.Timeout](#FutoInErrors.Timeout) : <code>string</code>

<a name="FutoInErrors.ConnectError"></a>

### FutoInErrors.ConnectError : <code>string</code>
Connection error before request is sent.

**Kind**: static constant of [<code>FutoInErrors</code>](#FutoInErrors)  
**Note**: Must be generated on Invoker side  
<a name="FutoInErrors.CommError"></a>

### FutoInErrors.CommError : <code>string</code>
Communication error at any stage after request is sent
and before response is received.

**Kind**: static constant of [<code>FutoInErrors</code>](#FutoInErrors)  
**Note**: Must be generated on Invoker side  
<a name="FutoInErrors.UnknownInterface"></a>

### FutoInErrors.UnknownInterface : <code>string</code>
Unknown interface requested.

**Kind**: static constant of [<code>FutoInErrors</code>](#FutoInErrors)  
**Note**: Must be generated only on Executor side  
<a name="FutoInErrors.NotSupportedVersion"></a>

### FutoInErrors.NotSupportedVersion : <code>string</code>
Not supported interface version.

**Kind**: static constant of [<code>FutoInErrors</code>](#FutoInErrors)  
**Note**: Must be generated only on Executor side  
<a name="FutoInErrors.NotImplemented"></a>

### FutoInErrors.NotImplemented : <code>string</code>
In case interface function is not implemented on Executor side

**Kind**: static constant of [<code>FutoInErrors</code>](#FutoInErrors)  
**Note**: Must be generated on Executor side  
<a name="FutoInErrors.Unauthorized"></a>

### FutoInErrors.Unauthorized : <code>string</code>
Security policy on Executor side does not allow to
access interface or specific function.

**Kind**: static constant of [<code>FutoInErrors</code>](#FutoInErrors)  
**Note**: Must be generated only on Executor side  
<a name="FutoInErrors.InternalError"></a>

### FutoInErrors.InternalError : <code>string</code>
Unexpected internal error on Executor side, including internal CommError.

**Kind**: static constant of [<code>FutoInErrors</code>](#FutoInErrors)  
**Note**: Must be generated only on Executor side  
<a name="FutoInErrors.InvokerError"></a>

### FutoInErrors.InvokerError : <code>string</code>
Unexpected internal error on Invoker side, not related to CommError.

**Kind**: static constant of [<code>FutoInErrors</code>](#FutoInErrors)  
**Note**: Must be generated only on Invoker side  
<a name="FutoInErrors.InvalidRequest"></a>

### FutoInErrors.InvalidRequest : <code>string</code>
Invalid data is passed as FutoIn request.

**Kind**: static constant of [<code>FutoInErrors</code>](#FutoInErrors)  
**Note**: Must be generated only on Executor side  
<a name="FutoInErrors.DefenseRejected"></a>

### FutoInErrors.DefenseRejected : <code>string</code>
Defense system has triggered rejection

**Kind**: static constant of [<code>FutoInErrors</code>](#FutoInErrors)  
**Note**: Must be generated on Executor side, but also possible to be triggered on Invoker  
<a name="FutoInErrors.PleaseReauth"></a>

### FutoInErrors.PleaseReauth : <code>string</code>
Executor requests re-authorization

**Kind**: static constant of [<code>FutoInErrors</code>](#FutoInErrors)  
**Note**: Must be generated only on Executor side  
<a name="FutoInErrors.SecurityError"></a>

### FutoInErrors.SecurityError : <code>string</code>
'sec' request section has invalid data or not SecureChannel

**Kind**: static constant of [<code>FutoInErrors</code>](#FutoInErrors)  
**Note**: Must be generated only on Executor side  
<a name="FutoInErrors.Timeout"></a>

### FutoInErrors.Timeout : <code>string</code>
Timeout occurred in any stage

**Kind**: static constant of [<code>FutoInErrors</code>](#FutoInErrors)  
**Note**: Must be used only internally and should never travel in request message  
<a name="$as_test"></a>

## $as\_test(func, [onerror]) ⇒ <code>function</code>
Mocha-compatible test case based on AsyncSteps.

Example:
```javascript
it('should ...', $as_test( (as) => {}, (as, err) => {} );
```

**Kind**: global function  
**Returns**: <code>function</code> - suitable for `it()` Mocha call  

| Param | Type | Description |
| --- | --- | --- |
| func | <code>ExecFunc</code> | function defining non-blocking step execution |
| [onerror] | <code>ErrorFunc</code> | Optional, provide error handler |

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


