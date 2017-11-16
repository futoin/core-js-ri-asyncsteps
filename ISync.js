"use strict";

/**
 * @file
 * @author Andrey Galkin <andrey@futoin.org>
 */

const futoin_errors = require( './lib/futoin_errors' );

/**
 * Base interface for synchronization primitives
 * @class
 */
class ISync
{
    sync( as, _func, _onerror )
    {
        as.error( futoin_errors.NotImplemented, '#sync() API' );
    }
}

module.exports = ISync;
