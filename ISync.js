"use strict";

/**
 * @file
 * @author Andrey Galkin <andrey@futoin.eu>
 */

const futoin_errors = require( './lib/futoin_errors' );

/**
 * Base interface for synchronization primitives
 * @class
 */
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
