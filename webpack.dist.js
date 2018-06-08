'use strict';

const package_json = require( './package' );

module.exports = [
    {
        mode: 'production',
        entry: {
            'futoin-asyncsteps': `./${package_json.browser}`,
            'futoin-asyncsteps-lite': './es5/lib/browser-lite.js',
        },
        output: {
            library: {
                root: "$as",
                amd: "futoin-asyncsteps",
                commonjs: "futoin-asyncsteps",
            },
            libraryTarget: "umd",
            filename: "[name].js",
            path: __dirname + '/dist',
        },
        node : false,
    },
    {
        mode: 'development',
        entry: {
            'futoin-asyncsteps-dev': `./${package_json.browser}`,
        },
        output: {
            library: {
                root: "$as",
                amd: "futoin-asyncsteps",
                commonjs: "futoin-asyncsteps",
            },
            libraryTarget: "umd",
            filename: "[name].js",
            path: __dirname + '/dist',
        },
        node : false,
    },
    {
        mode: 'production',
        entry: {
            'polyfill-asyncsteps': './lib/polyfill.js',
        },
        output: {
            filename: "[name].js",
            path: __dirname + '/dist',
        },
        node : false,
    },
];
