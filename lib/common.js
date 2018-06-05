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
const LOOP_TERM_LABEL = makeSym( '_loop_term_label' );

module.exports = exports = {
    makeSym,

    LOOP_TERM_LABEL,
};

//---
exports.loop = ( asi, root, func, label ) => {
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
