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

        if ( term_label &&
            ( term_label !== label )
        ) {
            // Unroll loops continue
            try {
                outer_as.continue( term_label );
            } catch ( _ ) {
                // ignore
            }
        } else {
            // Continue to next iteration
            as._root._handle_success();
        }
    } else if ( err === LoopBreak ) {
        const term_label = state[LOOP_TERM_LABEL];

        if ( term_label &&
            ( term_label !== label )
        ) {
            // Unroll loops and break
            try {
                outer_as.break( term_label );
            } catch ( _ ) {
                // ignore
            }
        } else {
            // Continue linear execution
            if ( outer_as.state ) {
                outer_as._root._handle_success();
            }
        }
    } else {
        // Forward regular error
        try {
            outer_as.error( err, state.error_info );
        } catch ( _ ) {
            // ignore
        }
    }
};

const loop = ( asi, root, func, label, end_cond ) => {
    const asynctool = root._async_tool;
    const AsyncSteps = root.constructor;

    asi.add( ( outer_as ) => {
        const { state } = outer_as;
        let inner_as;

        const step1 = [
            func,
            ( as, err ) => loop_error( as, err, outer_as, state, label ),
        ];
        const step2 = [
            ( as ) => {
                if ( end_cond && end_cond() ) {
                    // Continue linear execution
                    if ( outer_as.state ) {
                        outer_as._root._handle_success();
                    }
                } else {
                    create_iteration();
                }
            },
            null,
        ];

        const create_iteration = () => {
            const asi = inner_as = new AsyncSteps( state );
            const q = asi._queue;
            q.push( step1 );
            q.push( step2 );
            asi.execute();
        };


        outer_as.setCancel( ( as ) => {
            if ( inner_as ) {
                inner_as.cancel();
            }
        } );

        asynctool.callLater( create_iteration );
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
const await_error = ( asi, root, reason ) => {
    const { state } = asi;

    if ( state ) {
        const default_error = 'PromiseReject';

        if ( reason instanceof Error ) {
            state.last_exception = reason;
            state.error_info = undefined;
            root._handle_error( default_error );
        } else {
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
                await_error( step_as, root, reason );
            } else {
                // prevent cancel logic
                step_as = null;

                complete = ( asi ) => {
                    await_error( asi, root, reason );
                };
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
module.exports = exports = {
    makeSym,
    loop,
    repeat,
    forEach,
    LOOP_TERM_LABEL,
    as_await,
    EMPTY_ARRAY,
};

if ( process.env.NODE_ENV === 'production' ) {
    const noop = () => {};
    exports.noop,
    exports.checkFunc = noop;
    exports.checkOnError = noop;
} else {
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
}

