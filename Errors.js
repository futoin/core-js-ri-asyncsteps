"use strict";

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

const error_list = [
    'ConnectError',
    'CommError',
    'UnknownInterface',
    'NotSupportedVersion',
    'NotImplemented',
    'Unauthorized',
    'InternalError',
    'InvokerError',
    'InvalidRequest',
    'DefenseRejected',
    'PleaseReauth',
    'SecurityError',
    'Timeout',
    'LoopBreak',
    'LoopCont',
];

/**
 * List of standard FutoIn Core errors. It may static get extended in runtime.
 * @var FutoInErrors
 */
class Errors {
    /**
     * Connection error before request is sent.
     * Must be generated on Invoker side
     * @const
     * @default
     * @memberof FutoInErrors
     */

    /**
     * Communication error at any stage after request is sent
     * and before response is received.
     * Must be generated on Invoker side
     * @const
     * @default
     * @memberof FutoInErrors
     */

    /**
     * Unknown interface requested.
     * Must be generated only on Executor side
     * @const
     * @default
     * @memberof FutoInErrors
     */

    /**
     * Not supported interface version.
     * Must be generated only on Executor side
     * @const
     * @default
     * @memberof FutoInErrors
     */

    /**
     * In case interface function is not implemented on Executor side
     * Must be generated on Executor side
     * @const
     * @default
     * @memberof FutoInErrors
     */

    /**
     * Security policy on Executor side does not allow to
     * access interface or specific function.
     * Must be generated only on Executor side
     * @const
     * @default
     * @memberof FutoInErrors
     */

    /**
     * Unexpected internal error on Executor side, including internal CommError.
     * Must be generated only on Executor side
     * @const
     * @default
     * @memberof FutoInErrors
     */

    /**
     * Unexpected internal error on Invoker side, not related to CommError.
     * Must be generated only on Invoker side
     * @const
     * @default
     * @memberof FutoInErrors
     */

    /**
     * Invalid data is passed as FutoIn request.
     * Must be generated only on Executor side
     * @const
     * @default
     * @memberof FutoInErrors
     */

    /**
     * Defense system has triggered rejection
     * Must be generated on Executor side, but also possible to be triggered on Invoker
     * @const
     * @default
     * @memberof FutoInErrors
     */

    /**
     * Executor requests re-authorization
     * Must be generated only on Executor side
     * @const
     * @default
     * @memberof FutoInErrors
     */

    /**
     * 'sec' request section has invalid data or not SecureChannel
     * Must be generated only on Executor side
     * @const
     * @default
     * @memberof FutoInErrors
     */

    /**
     * Timeout occurred in any stage
     * Must be used only internally and should never travel in request message
     * @const
     * @default
     * @memberof FutoInErrors
     */

    /**
     * Loop Break called
     * Must not be used directly.
     * @const
     * @default
     * @private
     * @memberof FutoInErrors
     */

    /**
     * Loop Continue called
     * Must not be used directly.
     * @const
     * @default
     * @private
     * @memberof FutoInErrors
     */
}

error_list.forEach( ( v ) => Object.defineProperty( Errors, v, {
    enumerable: true,
    value: v,
} ) );

module.exports = Errors;
