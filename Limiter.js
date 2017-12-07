'use strict';

/**
 * @file
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

const ISync = require( './ISync' );
const Mutex = require( './Mutex' );
const Throttle = require( './Throttle' );

/**
 * Limiter - complex processing limit for AsyncSteps
 */
class Limiter extends ISync {
    /**
     * C-tor
     * @param {object} [options={}] - option map
     * @param {integer} [options.concurrent=1]  - maximum concurrent flows
     * @param {integer} [options.max_queue=0] - maximum queued
     * @param {integer} [options.rate=1]  - maximum entries in period
     * @param {integer} [options.period_ms=1000]  - period length
     * @param {integer} [options.burst=0]  - maximum queue for rate limiting
     */
    constructor( options = {} ) {
        super();

        this._mutex = new Mutex(
            options.concurrent || 1,
            options.max_queue || 0
        );
        this._throttle = new Throttle(
            options.rate || 1,
            options.period_ms || 1000,
            options.burst || 0
        );
    }

    sync( as, step, onerror ) {
        as.sync( this._mutex, ( as, ...args ) => {
            as._root._next_args = args;
            as.sync( this._throttle, step, onerror );
        } );
    }
}

module.exports = Limiter;
