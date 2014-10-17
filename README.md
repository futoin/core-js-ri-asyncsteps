
[![Build Status](https://travis-ci.org/futoin/core-js-ri-asyncsteps.svg)](https://travis-ci.org/futoin/core-js-ri-asyncsteps)

Reference implementation of:
 
    FTN12: FutoIn Async API
    Version: 1.2
    
Spec: [FTN12: FutoIn Async API v1.x](http://specs.futoin.org/final/preview/ftn12_async_api-1.html)

[Web Site](http://futoin.org/)


# About

Adds classical linear program flow structure to async programming
supporting exceptions. error handlers, timeouts, unlimited number of sub-steps,
execution parallelism and job state/context variables.

Current version is targeted at Node.js, but should be easily used in
web browser environment as well [not yet tested].

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
    "futoin-asyncsteps" : ">=0.99 <2.00"
}
```
    
# Examples


    
# API documentation

The concept is described in FutoIn specification: [FTN12: FutoIn Async API v1.x](http://specs.futoin.org/final/preview/ftn12_async_api-1.html)


**Members**

* [futoin-asyncsteps](#module_futoin-asyncsteps)
  * [futoin-asyncsteps.installAsyncToolTest([install])](#module_futoin-asyncsteps.installAsyncToolTest)
  * [class: futoin-asyncsteps.AsyncSteps](#module_futoin-asyncsteps.AsyncSteps)
    * [new futoin-asyncsteps.AsyncSteps([state])](#new_module_futoin-asyncsteps.AsyncSteps)
    * [module:futoin-asyncsteps.AsyncSteps.success([...arg])](#module_futoin-asyncsteps.AsyncSteps#success)
    * [module:futoin-asyncsteps.AsyncSteps.successStep()](#module_futoin-asyncsteps.AsyncSteps#successStep)
    * [module:futoin-asyncsteps.AsyncSteps.add(func, [onerror])](#module_futoin-asyncsteps.AsyncSteps#add)
    * [module:futoin-asyncsteps.AsyncSteps.parallel([onerror])](#module_futoin-asyncsteps.AsyncSteps#parallel)
    * [module:futoin-asyncsteps.AsyncSteps.error(name, [error_info])](#module_futoin-asyncsteps.AsyncSteps#error)
    * [module:futoin-asyncsteps.AsyncSteps.copyFrom(other)](#module_futoin-asyncsteps.AsyncSteps#copyFrom)
    * [module:futoin-asyncsteps.AsyncSteps.cancel()](#module_futoin-asyncsteps.AsyncSteps#cancel)
    * [module:futoin-asyncsteps.AsyncSteps.execute()](#module_futoin-asyncsteps.AsyncSteps#execute)
  * [class: futoin-asyncsteps.FutoInErrors](#module_futoin-asyncsteps.FutoInErrors)
    * [new futoin-asyncsteps.FutoInErrors()](#new_module_futoin-asyncsteps.FutoInErrors)
    * [const: module:futoin-asyncsteps.FutoInErrors.ConnectError](#module_futoin-asyncsteps.FutoInErrors.ConnectError)
    * [const: module:futoin-asyncsteps.FutoInErrors.CommError](#module_futoin-asyncsteps.FutoInErrors.CommError)
    * [const: module:futoin-asyncsteps.FutoInErrors.UnknownInterface](#module_futoin-asyncsteps.FutoInErrors.UnknownInterface)
    * [const: module:futoin-asyncsteps.FutoInErrors.NotSupportedVersion](#module_futoin-asyncsteps.FutoInErrors.NotSupportedVersion)
    * [const: module:futoin-asyncsteps.FutoInErrors.NotImplemented](#module_futoin-asyncsteps.FutoInErrors.NotImplemented)
    * [const: module:futoin-asyncsteps.FutoInErrors.Unauthorized](#module_futoin-asyncsteps.FutoInErrors.Unauthorized)
    * [const: module:futoin-asyncsteps.FutoInErrors.InternalError](#module_futoin-asyncsteps.FutoInErrors.InternalError)
    * [const: module:futoin-asyncsteps.FutoInErrors.InvokerError](#module_futoin-asyncsteps.FutoInErrors.InvokerError)
    * [const: module:futoin-asyncsteps.FutoInErrors.InvalidRequest](#module_futoin-asyncsteps.FutoInErrors.InvalidRequest)
    * [const: module:futoin-asyncsteps.FutoInErrors.DefenseRejected](#module_futoin-asyncsteps.FutoInErrors.DefenseRejected)
    * [const: module:futoin-asyncsteps.FutoInErrors.PleaseReauth](#module_futoin-asyncsteps.FutoInErrors.PleaseReauth)
    * [const: module:futoin-asyncsteps.FutoInErrors.SecurityError](#module_futoin-asyncsteps.FutoInErrors.SecurityError)
    * [const: module:futoin-asyncsteps.FutoInErrors.Timeout](#module_futoin-asyncsteps.FutoInErrors.Timeout)

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
  * [module:futoin-asyncsteps.AsyncSteps.success([...arg])](#module_futoin-asyncsteps.AsyncSteps#success)
  * [module:futoin-asyncsteps.AsyncSteps.successStep()](#module_futoin-asyncsteps.AsyncSteps#successStep)
  * [module:futoin-asyncsteps.AsyncSteps.add(func, [onerror])](#module_futoin-asyncsteps.AsyncSteps#add)
  * [module:futoin-asyncsteps.AsyncSteps.parallel([onerror])](#module_futoin-asyncsteps.AsyncSteps#parallel)
  * [module:futoin-asyncsteps.AsyncSteps.error(name, [error_info])](#module_futoin-asyncsteps.AsyncSteps#error)
  * [module:futoin-asyncsteps.AsyncSteps.copyFrom(other)](#module_futoin-asyncsteps.AsyncSteps#copyFrom)
  * [module:futoin-asyncsteps.AsyncSteps.cancel()](#module_futoin-asyncsteps.AsyncSteps#cancel)
  * [module:futoin-asyncsteps.AsyncSteps.execute()](#module_futoin-asyncsteps.AsyncSteps#execute)

<a name="new_module_futoin-asyncsteps.AsyncSteps"></a>
###new futoin-asyncsteps.AsyncSteps([state])
Root AsyncStep implementation

**Params**

- \[state\] `Object` - For internal use. State variable sharing  

<a name="module_futoin-asyncsteps.AsyncSteps#success"></a>
###module:futoin-asyncsteps.AsyncSteps.success([...arg])
Successfully complete current step execution, optionally passing result variables to the next step.

**Params**

- \[...arg\] `*` - unlimited number of result variables with no type constraint  

<a name="module_futoin-asyncsteps.AsyncSteps#successStep"></a>
###module:futoin-asyncsteps.AsyncSteps.successStep()
If sub-steps have been added then add dummy step with as.success() call.
Otherwise, simply call as.success();

<a name="module_futoin-asyncsteps.AsyncSteps#add"></a>
###module:futoin-asyncsteps.AsyncSteps.add(func, [onerror])
Add root level step. Can be called multiple times.

**Params**

- func <code>[ExecFunc](#ExecFunc)</code> - function defining non-blocking step execution  
- \[onerror\] <code>[ErrorFunc](#ErrorFunc)</code> - Optional, provide error handler  

**Returns**: `AsyncSteps`  
<a name="module_futoin-asyncsteps.AsyncSteps#parallel"></a>
###module:futoin-asyncsteps.AsyncSteps.parallel([onerror])
Creates a step internally and returns specialized AsyncSteps interfaces all steps
of which are executed in parallel.

**Params**

- \[onerror\] <code>[ErrorFunc](#ErrorFunc)</code> - Optional, provide error handler  

**Returns**: `AsyncSteps`  
<a name="module_futoin-asyncsteps.AsyncSteps#error"></a>
###module:futoin-asyncsteps.AsyncSteps.error(name, [error_info])
Set error and throw to abort execution

**Params**

- name `string` - error message, expected to be identifier "InternalError"  
- \[error_info\] `string` - optional descriptive message assigned to as.state.error_info  

**Type**: `Error`  
<a name="module_futoin-asyncsteps.AsyncSteps#copyFrom"></a>
###module:futoin-asyncsteps.AsyncSteps.copyFrom(other)
Copy steps and not yet defined state variables from "model" AsyncSteps instance

**Params**

- other `AsyncSteps` - model instance, which must get be executed  

<a name="module_futoin-asyncsteps.AsyncSteps#cancel"></a>
###module:futoin-asyncsteps.AsyncSteps.cancel()
NOT standard. Use only on root AsyncSteps instance. Abort execution of AsyncSteps instance in progress.

<a name="module_futoin-asyncsteps.AsyncSteps#execute"></a>
###module:futoin-asyncsteps.AsyncSteps.execute()
Start execution of AsyncSteps using {module:futoin-asyncsteps.AsyncTool}

<a name="module_futoin-asyncsteps.FutoInErrors"></a>
##class: futoin-asyncsteps.FutoInErrors
**Members**

* [class: futoin-asyncsteps.FutoInErrors](#module_futoin-asyncsteps.FutoInErrors)
  * [new futoin-asyncsteps.FutoInErrors()](#new_module_futoin-asyncsteps.FutoInErrors)
  * [const: module:futoin-asyncsteps.FutoInErrors.ConnectError](#module_futoin-asyncsteps.FutoInErrors.ConnectError)
  * [const: module:futoin-asyncsteps.FutoInErrors.CommError](#module_futoin-asyncsteps.FutoInErrors.CommError)
  * [const: module:futoin-asyncsteps.FutoInErrors.UnknownInterface](#module_futoin-asyncsteps.FutoInErrors.UnknownInterface)
  * [const: module:futoin-asyncsteps.FutoInErrors.NotSupportedVersion](#module_futoin-asyncsteps.FutoInErrors.NotSupportedVersion)
  * [const: module:futoin-asyncsteps.FutoInErrors.NotImplemented](#module_futoin-asyncsteps.FutoInErrors.NotImplemented)
  * [const: module:futoin-asyncsteps.FutoInErrors.Unauthorized](#module_futoin-asyncsteps.FutoInErrors.Unauthorized)
  * [const: module:futoin-asyncsteps.FutoInErrors.InternalError](#module_futoin-asyncsteps.FutoInErrors.InternalError)
  * [const: module:futoin-asyncsteps.FutoInErrors.InvokerError](#module_futoin-asyncsteps.FutoInErrors.InvokerError)
  * [const: module:futoin-asyncsteps.FutoInErrors.InvalidRequest](#module_futoin-asyncsteps.FutoInErrors.InvalidRequest)
  * [const: module:futoin-asyncsteps.FutoInErrors.DefenseRejected](#module_futoin-asyncsteps.FutoInErrors.DefenseRejected)
  * [const: module:futoin-asyncsteps.FutoInErrors.PleaseReauth](#module_futoin-asyncsteps.FutoInErrors.PleaseReauth)
  * [const: module:futoin-asyncsteps.FutoInErrors.SecurityError](#module_futoin-asyncsteps.FutoInErrors.SecurityError)
  * [const: module:futoin-asyncsteps.FutoInErrors.Timeout](#module_futoin-asyncsteps.FutoInErrors.Timeout)

<a name="new_module_futoin-asyncsteps.FutoInErrors"></a>
###new futoin-asyncsteps.FutoInErrors()
Semantically, not the correct place to define,
but Core JS Api package would be an overkill for now as there is
no concept of interfaces in JS.

<a name="module_futoin-asyncsteps.FutoInErrors.ConnectError"></a>
###const: module:futoin-asyncsteps.FutoInErrors.ConnectError
Connection error before request is sent.
Must be generated on Invoker side

**Default**: `ConnectError`  
<a name="module_futoin-asyncsteps.FutoInErrors.CommError"></a>
###const: module:futoin-asyncsteps.FutoInErrors.CommError
Communication error at any stage after request is sent
and before response is received.
Must be generated on Invoker side

**Default**: `CommError`  
<a name="module_futoin-asyncsteps.FutoInErrors.UnknownInterface"></a>
###const: module:futoin-asyncsteps.FutoInErrors.UnknownInterface
Unknown interface requested.
Must be generated only on Executor side

**Default**: `UnknownInterface`  
<a name="module_futoin-asyncsteps.FutoInErrors.NotSupportedVersion"></a>
###const: module:futoin-asyncsteps.FutoInErrors.NotSupportedVersion
Not supported interface version.
Must be generated only on Executor side

**Default**: `NotSupportedVersion`  
<a name="module_futoin-asyncsteps.FutoInErrors.NotImplemented"></a>
###const: module:futoin-asyncsteps.FutoInErrors.NotImplemented
In case interface function is not implemented on Executor side
Must be generated on Executor side

**Default**: `NotImplemented`  
<a name="module_futoin-asyncsteps.FutoInErrors.Unauthorized"></a>
###const: module:futoin-asyncsteps.FutoInErrors.Unauthorized
Security policy on Executor side does not allow to
access interface or specific function.
Must be generated only on Executor side

**Default**: `Unauthorized`  
<a name="module_futoin-asyncsteps.FutoInErrors.InternalError"></a>
###const: module:futoin-asyncsteps.FutoInErrors.InternalError
Unexpected internal error on Executor side, including internal CommError.
Must be generated only on Executor side

**Default**: `InternalError`  
<a name="module_futoin-asyncsteps.FutoInErrors.InvokerError"></a>
###const: module:futoin-asyncsteps.FutoInErrors.InvokerError
Unexpected internal error on Invoker side, not related to CommError.
Must be generated only on Invoker side

**Default**: `InvokerError`  
<a name="module_futoin-asyncsteps.FutoInErrors.InvalidRequest"></a>
###const: module:futoin-asyncsteps.FutoInErrors.InvalidRequest
Invalid data is passed as FutoIn request.
Must be generated only on Executor side

**Default**: `InvalidRequest`  
<a name="module_futoin-asyncsteps.FutoInErrors.DefenseRejected"></a>
###const: module:futoin-asyncsteps.FutoInErrors.DefenseRejected
Defense system has triggered rejection
Must be generated on Executor side, but also possible to be triggered on Invoker

**Default**: `DefenseRejected`  
<a name="module_futoin-asyncsteps.FutoInErrors.PleaseReauth"></a>
###const: module:futoin-asyncsteps.FutoInErrors.PleaseReauth
Executor requests re-authorization
Must be generated only on Executor side

**Default**: `PleaseReauth`  
<a name="module_futoin-asyncsteps.FutoInErrors.SecurityError"></a>
###const: module:futoin-asyncsteps.FutoInErrors.SecurityError
'sec' request section has invalid data or not SecureChannel
Must be generated only on Executor side

**Default**: `SecurityError`  
<a name="module_futoin-asyncsteps.FutoInErrors.Timeout"></a>
###const: module:futoin-asyncsteps.FutoInErrors.Timeout
Timeout occurred in any stage
Must be used only internally and should never travel in request message

**Default**: `Timeout`  




*documented by [jsdoc-to-markdown](https://github.com/75lb/jsdoc-to-markdown)*.


