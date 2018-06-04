'use strict';

const makeSym = ( typeof Symbol === 'undefined' )
    ? ( name ) => name
    : ( name ) => Symbol( name );

module.exports = {
    ASYNC_TOOL : makeSym( '_async_tool' ),
    EXECUTE_CB : makeSym( '_execute_cb' ),
    EXECUTE_EVENT : makeSym( '_execute_event' ),
    EXEC_STACK : makeSym( '_exec_stack' ),
    IN_EXECUTE : makeSym( '_in_execute' ),
    LIMIT_EVENT : makeSym( '_limit_event' ),
    NEXT_ARGS : makeSym( '_next_args' ),
    QUEUE : makeSym( '_queue' ),
    ROOT : makeSym( '_root' ),
    STACK : makeSym( '_stack' ),
    STATE : makeSym( 'state' ),
    ON_CANCEL : makeSym( '_oncancel' ),
    ON_ERROR : makeSym( '_onerror' ),
    WAIT_EXTERNAL : makeSym( '_wait_external' ),
    CHECK_FUNC : makeSym( '_check_func' ),
    CHECK_ONERROR : makeSym( '_check_onerror' ),
    SANITY_CHECK : makeSym( '_sanityCheck' ),
    SCHEDULE_EXECUTE : makeSym( '_scheduleExecute' ),
    CLEANUP : makeSym( '_cleanup' ),
    CANCEL_EXECUTE : makeSym( '_cancelExecute' ),
    HANDLE_ERROR : makeSym( '_handle_error' ),
    HANDLE_SUCCESS : makeSym( '_handle_success' ),
    LOOP_TERM_LABEL : makeSym( '_loop_term_label' ),
    AS : makeSym( '_as' ),
    PSTEPS : makeSym( '_psteps' ),
    COMPLETE_COUNT : makeSym( '_complete_count' ),
    MUTEX : makeSym( '_mutex' ),
    THROTTLE : makeSym( '_throttle' ),
    MAX : makeSym( '_max' ),
    LOCKED : makeSym( '_locked' ),
    OWNERS : makeSym( '_owners' ),
    MAX_QUEUE : makeSym( '_max_queue' ),
    CURRENT : makeSym( '_current' ),
    TIMER : makeSym( '_timer' ),
    PERIOD_MS : makeSym( '_period_ms' ),
};
