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
 * @note Must be generated on Invoker side
 * @const {string} ConnectError
 * @memberof FutoInErrors
 */

/**
 * Communication error at any stage after request is sent
 * and before response is received.
 * @note Must be generated on Invoker side
 * @const {string} CommError
 * @memberof FutoInErrors
 */

/**
 * Unknown interface requested.
 * @note Must be generated only on Executor side
 * @const {string} UnknownInterface
 * @memberof FutoInErrors
 */

/**
 * Not supported interface version.
 * @note Must be generated only on Executor side
 * @const {string} NotSupportedVersion
 * @memberof FutoInErrors
 */

/**
 * In case interface function is not implemented on Executor side
 * @note Must be generated on Executor side
 * @const {string} NotImplemented
 * @memberof FutoInErrors
 */

/**
 * Security policy on Executor side does not allow to
 * access interface or specific function.
 * @note Must be generated only on Executor side
 * @const {string} Unauthorized
 * @memberof FutoInErrors
 */

/**
 * Unexpected internal error on Executor side, including internal CommError.
 * @note Must be generated only on Executor side
 * @const {string} InternalError
 * @memberof FutoInErrors
 */

/**
 * Unexpected internal error on Invoker side, not related to CommError.
 * @note Must be generated only on Invoker side
 * @const {string} InvokerError
 * @memberof FutoInErrors
 */

/**
 * Invalid data is passed as FutoIn request.
 * @note Must be generated only on Executor side
 * @const {string} InvalidRequest
 * @memberof FutoInErrors
 */

/**
 * Defense system has triggered rejection
 * @note Must be generated on Executor side, but also possible to be triggered on Invoker
 * @const {string} DefenseRejected
 * @memberof FutoInErrors
 */

/**
 * Executor requests re-authorization
 * @note Must be generated only on Executor side
 * @const {string} PleaseReauth
 * @memberof FutoInErrors
 */

/**
 * 'sec' request section has invalid data or not SecureChannel
 * @note Must be generated only on Executor side
 * @const {string} SecurityError
 * @memberof FutoInErrors
 */

/**
 * Timeout occurred in any stage
 * @note Must be used only internally and should never travel in request message
 * @const {string} Timeout
 * @memberof FutoInErrors
 */

/**
 * Loop Break called
 * @note Must not be used directly.
 * @const {string} LoopBreak
 * @private
 * @memberof FutoInErrors
 */

/**
 * Loop Continue called
 * @note Must not be used directly.
 * @const {string} LoopCont
 * @private
 * @memberof FutoInErrors
 */

error_list.forEach( ( v ) => Object.defineProperty( Errors, v, {
    enumerable: true,
    value: v,
} ) );

module.exports = Errors;
