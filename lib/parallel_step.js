"use strict";

/**
 * @file Implementation of parallel step
 * @author Andrey Galkin <andrey@futoin.org>
 *
 *
 * Copyright 2014-2017 FutoIn Project (https://futoin.org)
 * Copyright 2014-2017 Andrey Galkin <andrey@futoin.org>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var async_steps = require( './asyncsteps' );

/**
 * @private
 * @param {AsyncSteps} [root] reference to current root object
 * @param {AsyncSteps} [as] reference to current step object
 * @returns {AsyncSteps} new instance of parallel step
 */
exports = module.exports = function( root, as )
{
    return new module.exports.ParallelStep( root, as );
};

/**
 * ParallelStep
 * @private
 * @constructor
 * @param {AsyncSteps} [root] reference to current root object
 * @param {AsyncSteps} [as] reference to current step object
 */
var ParallelStep = function( root, as )
{
    this._root = root;
    this._as = as;
    this._queue = [];
    this._psteps = [];
    this._complete_count = 0;
};

/**
 * Parallel step prototype
 * @private
 */
var ParallelStepProto = {};

ParallelStep.prototype = ParallelStepProto;

ParallelStepProto._root = null;
ParallelStepProto._as = null;
ParallelStepProto._psteps = null;
ParallelStepProto._complete_count = null;
ParallelStepProto._error = null;

/**
 * @private
 * @override
 */
ParallelStepProto.add = function( func, onerror )
{
    this._root._check_func( func );
    this._root._check_onerror( onerror );
    this._queue.push( [ func, onerror ] );
    return this;
};

/**
 * @private
 */
ParallelStepProto._complete = function( )
{
    this._complete_count += 1;

    if ( this._complete_count === this._psteps.length )
    {
        this._as.success();
        this._cleanup();
    }
};

/**
 * @private
 * @param {string} [name] Error name
 * @param {string} [info] Error info
 */
ParallelStepProto._error = function( name, info )
{
    try
    {
        this._as.error( name, info );
    }
    catch ( e )
    {
        // ignore
    }
};

/**
 * @private
 * @param {AsyncSteps} [as] current step interface
 */
ParallelStepProto.executeParallel = function( as )
{
    var p;

    if ( this._root !== as._root )
    {
        p = new ParallelStep( as._root, as );
        p._queue.push.apply( p._queue, this._queue );
        p.executeParallel( as );
        return;
    }

    this._as = as;

    var _this = this;

    if ( !this._queue.length )
    {
        this._complete();
        return;
    }

    as.setCancel(
        function()
        {
            _this.cancel();
        }
    );

    /* */
    var q = this._queue;
    var plist = this._psteps;

    var success_func = function( as )
    {
        void as;
        _this._complete();
    };

    var error_func = function( as, err )
    {
        _this._error( err, as.state.error_info );
    };

    var step_func_gen = this._step_func_gen;

    q.forEach( function( p )
    {
        var pa = new async_steps.AsyncSteps( as.state );

        pa.add(
            step_func_gen( p ),
            error_func
        );
        pa.add( success_func );

        plist.push( pa );
    } );

    // Should be separate from the previous loop for
    // in case cancel() arrives in the middle
    plist.forEach( function( p )
    {
        p.execute();
    } );
};

/**
 * @private
 * @param {array} [pi] tuple of step handlers
 * @returns {function} step generator bound to actual param
 */
ParallelStepProto._step_func_gen = function( pi )
{
    return function( as )
    {
        as.add( pi[0], pi[1] );
    };
};

/**
 * @private
 */
ParallelStepProto.cancel = function()
{
    this._psteps.forEach( function( p )
    {
        p.cancel();
    } );

    this._cleanup();
};

/**
 * @private
 */
ParallelStepProto._cleanup = function()
{
    this._root = null;
    this._as = null;
    this._psteps = null;
};

/* */

exports.ParallelStep = ParallelStep;
