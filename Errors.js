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
    static get ConnectError() {
        return "ConnectError";
    }

    /**
     * Communication error at any stage after request is sent
     * and before response is received.
     * Must be generated on Invoker side
     * @const
     * @default
     * @memberof FutoInErrors
     */
    static get CommError() {
        return "CommError";
    }

    /**
     * Unknown interface requested.
     * Must be generated only on Executor side
     * @const
     * @default
     * @memberof FutoInErrors
     */
    static get UnknownInterface() {
        return "UnknownInterface";
    }

    /**
     * Not supported interface version.
     * Must be generated only on Executor side
     * @const
     * @default
     * @memberof FutoInErrors
     */
    static get NotSupportedVersion() {
        return "NotSupportedVersion";
    }

    /**
     * In case interface function is not implemented on Executor side
     * Must be generated on Executor side
     * @const
     * @default
     * @memberof FutoInErrors
     */
    static get NotImplemented() {
        return "NotImplemented";
    }

    /**
     * Security policy on Executor side does not allow to
     * access interface or specific function.
     * Must be generated only on Executor side
     * @const
     * @default
     * @memberof FutoInErrors
     */
    static get Unauthorized() {
        return "Unauthorized";
    }

    /**
     * Unexpected internal error on Executor side, including internal CommError.
     * Must be generated only on Executor side
     * @const
     * @default
     * @memberof FutoInErrors
     */
    static get InternalError() {
        return "InternalError";
    }

    /**
     * Unexpected internal error on Invoker side, not related to CommError.
     * Must be generated only on Invoker side
     * @const
     * @default
     * @memberof FutoInErrors
     */
    static get InvokerError() {
        return "InvokerError";
    }

    /**
     * Invalid data is passed as FutoIn request.
     * Must be generated only on Executor side
     * @const
     * @default
     * @memberof FutoInErrors
     */
    static get InvalidRequest() {
        return "InvalidRequest";
    }

    /**
     * Defense system has triggered rejection
     * Must be generated on Executor side, but also possible to be triggered on Invoker
     * @const
     * @default
     * @memberof FutoInErrors
     */
    static get DefenseRejected() {
        return "DefenseRejected";
    }

    /**
     * Executor requests re-authorization
     * Must be generated only on Executor side
     * @const
     * @default
     * @memberof FutoInErrors
     */
    static get PleaseReauth() {
        return "PleaseReauth";
    }

    /**
     * 'sec' request section has invalid data or not SecureChannel
     * Must be generated only on Executor side
     * @const
     * @default
     * @memberof FutoInErrors
     */
    static get SecurityError() {
        return "SecurityError";
    }

    /**
     * Timeout occurred in any stage
     * Must be used only internally and should never travel in request message
     * @const
     * @default
     * @memberof FutoInErrors
     */
    static get Timeout() {
        return "Timeout";
    }

    /**
     * Loop Break called
     * Must not be used directly.
     * @const
     * @default
     * @private
     * @memberof FutoInErrors
     */
    static get LoopBreak() {
        return "LoopBreak";
    }

    /**
     * Loop Continue called
     * Must not be used directly.
     * @const
     * @default
     * @private
     * @memberof FutoInErrors
     */
    static get LoopCont() {
        return "LoopCont";
    }
}

module.exports = Errors;
