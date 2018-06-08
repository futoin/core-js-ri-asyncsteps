'use strict';

const {
    InternalError,
    LoopCont,
    LoopBreak,
} = require( '../Errors' );

//---
const makeSym = ( typeof Symbol === 'undefined' )
    ? ( name ) => name
    : ( name ) => Symbol( name );

//---
const LOOP_TERM_LABEL = makeSym( '_loop_term_label' );

const loop_error = ( as, err, outer_as, state, label ) => {
    if ( err === LoopCont ) {
        const term_label = state[LOOP_TERM_LABEL];

        if ( !term_label || ( term_label === label ) ) {
            state.last_exception = null;
            // Continue to next iteration
            as._root._handle_success();
        }
    } else if ( err === LoopBreak ) {
        const term_label = state[LOOP_TERM_LABEL];

        if ( !term_label || ( term_label === label ) ) {
            state.last_exception = null;
            outer_as._queue.length = 0;
            as._root._handle_success();
        }
    }
};

const loop = ( asi, root, func, label, end_cond ) => {
    if ( end_cond && end_cond() ) {
        return;
    }

    asi.add( ( outer_as ) => {
        const { state } = outer_as;
        const exec_stack = root._exec_stack;
        const es_len = exec_stack.length;

        const step1 = [
            func,
            ( as, err ) => loop_error( as, err, outer_as, state, label ),
        ];
        const step2 = [
            ( as ) => {
                if ( !end_cond || !end_cond() ) {
                    exec_stack.length = es_len; // truncate iteration
                    create_iteration();
                }
            },
            null,
        ];

        const create_iteration = () => {
            outer_as._queue = [
                step1,
                step2,
            ];
        };

        create_iteration();
    } );
};

//---
const repeat = ( asi, root, count, func, label ) => {
    let i = 0;
    const c = count;

    loop(
        asi,
        root,
        ( as ) => {
            func( as, i++ );
        },
        label,
        () => i >= c
    );
};

//---
const forEach = ( asi, root, map_or_list, func, label ) => {
    if ( Array.isArray( map_or_list ) ) {
        const arr = map_or_list;

        repeat(
            asi,
            root,
            arr.length,
            ( as, i ) => {
                func( as, i, arr[i] );
            },
            label
        );
    } else if ( typeof Map !== 'undefined' && map_or_list instanceof Map ) {
        const iter = map_or_list.entries();

        loop(
            asi,
            root,
            ( as ) => {
                const next = iter.next();

                if ( next.done ) {
                    as.break();
                }

                const [ key, value ] = next.value;
                func( as, key, value );
            },
            label
        );
    } else {
        const obj = map_or_list;
        const keys = Object.keys( obj );

        repeat(
            asi,
            root,
            keys.length,
            ( as, i ) => {
                func( as, keys[i], obj[ keys[i] ] );
            },
            label
        );
    }
};

//---
const await_async_error = ( asi, root, reason ) => {
    const { state } = asi;

    if ( state ) {
        const default_error = 'PromiseReject';

        asi._on_cancel = null;

        if ( reason instanceof Error ) {
            state.last_exception = reason;
            state.error_info = undefined;
            root._handle_error( default_error );
        } else {
            state.last_exception = null;
            state.error_info = undefined;
            root._handle_error( reason || default_error );
        }
    }
};

const as_await = ( asi, root, promise, onerror ) => {
    let step_as;
    let complete;

    // Attach handlers on the same tick
    promise.then(
        ( result ) => {
            if ( step_as ) {
                step_as._root._handle_success( [ result ] );
            } else {
                complete = ( asi ) => {
                    asi._root._handle_success( [ result ] );
                };
            }
        },
        ( reason ) => {
            if ( step_as ) {
                await_async_error( step_as, root, reason );
            } else {
                // prevent cancel logic
                step_as = null;

                if ( reason instanceof Error ) {
                    complete = () => {
                        throw reason;
                    };
                } else {
                    complete = ( asi ) => asi.error( reason || 'PromiseReject' );
                }
            }
        }
    );

    asi.add(
        ( as ) => {
            if ( complete ) {
                complete( as );
            } else {
                step_as = as;

                as.setCancel( () => {
                    if ( step_as ) {
                        step_as = null;

                        try {
                            // BlueBird cancellation
                            promise.cancel();
                        } catch ( _ ) {
                            // ignore
                        }
                    }
                } );
            }
        },
        onerror
    );
};

//---
const EMPTY_ARRAY = [];
Object.freeze( EMPTY_ARRAY );

//---
const noop = () => {};

//---
module.exports = exports = {
    noop,
    makeSym,
    loop,
    repeat,
    forEach,
    LOOP_TERM_LABEL,
    as_await,
    EMPTY_ARRAY,
};

if ( process.env.NODE_ENV === 'production' ) {
    exports.isProduction = true;
    exports.checkFunc = noop;
    exports.checkOnError = noop;

    const fake_exec_stack = new class {
        push() {}
        get length() {
            return 0;
        }
        set length( l ) {}
    };
    Object.freeze( fake_exec_stack );
    exports.newExecStack = () => fake_exec_stack;
} else {
    exports.isProduction = false;
    exports.checkFunc = ( asi, func ) => {
        if ( func.length < 1 ) {
            asi.error( InternalError,
                "Step function must expect at least AsyncStep interface" );
        }
    };

    exports.checkOnError = ( asi, onerror ) => {
        if ( onerror &&
            ( onerror.length !== 2 ) ) {
            asi.error( InternalError, "Error handler must take exactly two arguments" );
        }
    };

    exports.newExecStack = () => [];
}

