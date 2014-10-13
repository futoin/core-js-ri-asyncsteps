
/**
 * Semantically, not the correct place to define,
 * but Core JS Api package would be an overkill for now as there is
 * no concept of interfaces in JS.
 */

exports = module.exports =
{
    /**
     * Connection error before request is sent.
     * Must be generated on Invoker side
     */
    ConnectError : "ConnectError",

    /**
     * Communication error at any stage after request is sent
     * and before response is received.
     * Must be generated on Invoker side
     */
    CommError : "CommError",

    /**
     * Unknown interface requested.
     * Must be generated only on Executor side
     */
    UnknownInterface : "UnknownInterface",

    /**
     * Not supported interface version.
     * Must be generated only on Executor side
     */
    NotSupportedVersion : "NotSupportedVersion",

    /**
     * In case interface function is not implemented on Executor side
     * Must be generated on Executor side
     */
    NotImplemented : "NotImplemented",

    /**
     * Security policy on Executor side does not allow to
     * access interface or specific function.
     * Must be generated only on Executor side
     */
    Unauthorized : "Unauthorized",

    /**
     * Unexpected internal error on Executor side, including internal CommError.
     * Must be generated only on Executor side
     */
    InternalError : "InternalError",

    /**
     * Unexpected internal error on Invoker side, not related to CommError.
     * Must be generated only on Invoker side
     */
    InvokerError : "InvokerError",

    /**
     * Invalid data is passed as FutoIn request.
     * Must be generated only on Executor side
     */
    InvalidRequest : "InvalidRequest",

    /**
     * Defense system has triggered rejection
     * Must be generated on Executor side, but also possible to be triggered on Invoker
     */
    DefenseRejected : "DefenseRejected",

    /**
     * Executor requests re-authorization
     * Must be generated only on Executor side
     */
    PleaseReauth : "PleaseReauth",

    /**
     * 'sec' request section has invalid data or not SecureChannel
     * Must be generated only on Executor side
     */
    SecurityError : "SecurityError",

    /**
     * Timeout occurred in any stage
     * Must be used only internally and should never travel in request message
     */
    Timeout : "Timeout"
};
