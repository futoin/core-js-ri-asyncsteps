'use strict';

module.exports = {
    entry: {
        'futoin-asyncsteps': './lib/browser.js',
        unittest : './test/unittest.js',
    },
    output: {
        filename: "[name].js",
        path: __dirname + '/dist',
    },
    node : false,
};
