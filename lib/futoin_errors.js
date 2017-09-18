"use strict";

/**
 * @file
 * @author Andrey Galkin <andrey@futoin.org>
 */

/**
 * List of standard FutoIn Core errors. It may get extended in runtime.
 * @var FutoInErrors
 */
exports = module.exports =
{
    /**
     * Connection error before request is sent.
     * Must be generated on Invoker side
     * @const
     * @default
     * @memberof FutoInErrors
     */
    ConnectError : "ConnectError",

    /**
     * Communication error at any stage after request is sent
     * and before response is received.
     * Must be generated on Invoker side
     * @const
     * @default
     * @memberof FutoInErrors
     */
    CommError : "CommError",

    /**
     * Unknown interface requested.
     * Must be generated only on Executor side
     * @const
     * @default
     * @memberof FutoInErrors
     */
    UnknownInterface : "UnknownInterface",

    /**
     * Not supported interface version.
     * Must be generated only on Executor side
     * @const
     * @default
     * @memberof FutoInErrors
     */
    NotSupportedVersion : "NotSupportedVersion",

    /**
     * In case interface function is not implemented on Executor side
     * Must be generated on Executor side
     * @const
     * @default
     * @memberof FutoInErrors
     */
    NotImplemented : "NotImplemented",

    /**
     * Security policy on Executor side does not allow to
     * access interface or specific function.
     * Must be generated only on Executor side
     * @const
     * @default
     * @memberof FutoInErrors
     */
    Unauthorized : "Unauthorized",

    /**
     * Unexpected internal error on Executor side, including internal CommError.
     * Must be generated only on Executor side
     * @const
     * @default
     * @memberof FutoInErrors
     */
    InternalError : "InternalError",

    /**
     * Unexpected internal error on Invoker side, not related to CommError.
     * Must be generated only on Invoker side
     * @const
     * @default
     * @memberof FutoInErrors
     */
    InvokerError : "InvokerError",

    /**
     * Invalid data is passed as FutoIn request.
     * Must be generated only on Executor side
     * @const
     * @default
     * @memberof FutoInErrors
     */
    InvalidRequest : "InvalidRequest",

    /**
     * Defense system has triggered rejection
     * Must be generated on Executor side, but also possible to be triggered on Invoker
     * @const
     * @default
     * @memberof FutoInErrors
     */
    DefenseRejected : "DefenseRejected",

    /**
     * Executor requests re-authorization
     * Must be generated only on Executor side
     * @const
     * @default
     * @memberof FutoInErrors
     */
    PleaseReauth : "PleaseReauth",

    /**
     * 'sec' request section has invalid data or not SecureChannel
     * Must be generated only on Executor side
     * @const
     * @default
     * @memberof FutoInErrors
     */
    SecurityError : "SecurityError",

    /**
     * Timeout occurred in any stage
     * Must be used only internally and should never travel in request message
     * @const
     * @default
     * @memberof FutoInErrors
     */
    Timeout : "Timeout",

    /**
     * Loop Break called
     * Must not be used directly.
     * @const
     * @default
     * @private
     * @memberof FutoInErrors
     */
    LoopBreak : "LoopBreak",

    /**
     * Loop Continue called
     * Must not be used directly.
     * @const
     * @default
     * @private
     * @memberof FutoInErrors
     */
    LoopCont : "LoopCont",
};
