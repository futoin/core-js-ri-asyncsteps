"use strict";

/**
 * @author Andrey Galkin <andrey@futoin.eu>
 */

const futoin_errors = require( './lib/futoin_errors' );

class ISync
{
    sync( as, func, onerror )
    {
        as.error( futoin_errors.NotImplemented, '#sync() API' );
        void func;
        void onerror;
    }
}

module.exports = ISync;
