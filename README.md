
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

# Installation

Command line:

    npm install futoin-asyncsteps --save
    
and/or package.json:
    
    "dependencies" : {
        "futoin-asyncsteps" : ">=0.99 <2.00"
    }
    
# API documentation

The concept is described in FutoIn specification: [FTN12: FutoIn Async API v1.x](http://specs.futoin.org/final/preview/ftn12_async_api-1.html)

Particular JS implementation API is described in [API JSDoc](./doc/api.md)

# Examples
