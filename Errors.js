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
 * @namespace FutoInErrors
 */
class Errors {}

/**
 * Connection error before request is sent.
 * Must be generated on Invoker side
 * @constant {string} ConnectError
 * @memberof FutoInErrors
 */

/**
 * Communication error at any stage after request is sent
 * and before response is received.
 * Must be generated on Invoker side
 * @constant {string} CommError
 * @memberof FutoInErrors
 */

/**
 * Unknown interface requested.
 * Must be generated only on Executor side
 * @constant {string} UnknownInterface
 * @memberof FutoInErrors
 */

/**
 * Not supported interface version.
 * Must be generated only on Executor side
 * @constant {string} NotSupportedVersion
 * @memberof FutoInErrors
 */

/**
 * In case interface function is not implemented on Executor side
 * Must be generated on Executor side
 * @constant {string} NotImplemented
 * @memberof FutoInErrors
 */

/**
 * Security policy on Executor side does not allow to
 * access interface or specific function.
 * Must be generated only on Executor side
 * @constant {string} Unauthorized
 * @memberof FutoInErrors
 */

/**
 * Unexpected internal error on Executor side, including internal CommError.
 * Must be generated only on Executor side
 * @constant {string} InternalError
 * @memberof FutoInErrors
 */

/**
 * Unexpected internal error on Invoker side, not related to CommError.
 * Must be generated only on Invoker side
 * @constant {string} InvokerError
 * @memberof FutoInErrors
 */

/**
 * Invalid data is passed as FutoIn request.
 * Must be generated only on Executor side
 * @constant {string} InvalidRequest
 * @memberof FutoInErrors
 */

/**
 * Defense system has triggered rejection
 * Must be generated on Executor side, but also possible to be triggered on Invoker
 * @constant {string} DefenseRejected
 * @memberof FutoInErrors
 */

/**
 * Executor requests re-authorization
 * Must be generated only on Executor side
 * @constant {string} PleaseReauth
 * @memberof FutoInErrors
 */

/**
 * 'sec' request section has invalid data or not SecureChannel
 * Must be generated only on Executor side
 * @constant {string} SecurityError
 * @memberof FutoInErrors
 */

/**
 * Timeout occurred in any stage
 * Must be used only internally and should never travel in request message
 * @constant {string} Timeout
 * @memberof FutoInErrors
 */

/**
 * Loop Break called
 * Must not be used directly.
 * @constant {string} LoopBreak
 * @private
 * @memberof FutoInErrors
 */

/**
 * Loop Continue called
 * Must not be used directly.
 * @constant {string} LoopCont
 * @private
 * @memberof FutoInErrors
 */

error_list.forEach( ( v ) => Object.defineProperty( Errors, v, {
    enumerable: true,
    value: v,
} ) );

module.exports = Errors;
