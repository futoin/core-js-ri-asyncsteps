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

const loop = ( asi, root, func, label ) => {
    const async_tool = root._async_tool;
    const AsyncSteps = root.constructor;

    asi.add( ( outer_as ) => {
        const model_as = new AsyncSteps();
        let inner_as;

        const create_iteration = () => {
            inner_as = new AsyncSteps( outer_as.state );
            inner_as.copyFrom( model_as );
            inner_as.execute();
        };

        model_as.add(
            ( as ) => {
                func( as );
            },
            ( as, err ) => {
                if ( err === LoopCont ) {
                    const term_label = as.state[LOOP_TERM_LABEL];

                    if ( term_label &&
                        ( term_label !== label ) ) {
                        // Unroll loops continue
                        async_tool.callLater( () => {
                            try {
                                outer_as.continue( term_label );
                            } catch ( _ ) {
                                // ignore
                            }
                        } );
                    } else {
                        // Continue to next iteration
                        as.success();
                        return; // DO not destroy model_as
                    }
                } else if ( err === LoopBreak ) {
                    const term_label = as.state[LOOP_TERM_LABEL];

                    if ( term_label &&
                        ( term_label !== label ) ) {
                        // Unroll loops and break
                        async_tool.callLater( () => {
                            try {
                                outer_as.break( term_label );
                            } catch ( _ ) {
                                // ignore
                            }
                        } );
                    } else {
                        // Continue linear execution
                        async_tool.callLater( () => {
                            try {
                                outer_as.success();
                            } catch ( _ ) {
                                // can fail sanity check on race condition after cancel()
                            }
                        } );
                    }
                } else {
                    // Forward regular error
                    async_tool.callLater( () => {
                        try {
                            outer_as.error( err, outer_as.state.error_info );
                        } catch ( _ ) {
                            // ignore
                        }
                    } );
                }

                // Destroy recursive reference
                model_as.cancel();
            }
        ).add(
            ( as ) => {
                // schedule new iteration
                // NOTE: recursive model_as -> potential mem leak -> destroy model_as on exit
                async_tool.callLater( create_iteration );
            }
        );

        outer_as.setCancel( ( as ) => {
            inner_as.cancel();
            model_as.cancel();
        } );

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
            if ( i < c ) {
                func( as, i++ );
            } else {
                as.break();
            }
        },
        label
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


module.exports = exports = {
    makeSym,
    loop,
    repeat,
    forEach,

    LOOP_TERM_LABEL,
};


// TODO: step-by-step
// eslint-disable-next-line no-constant-condition
if ( false ) {
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

