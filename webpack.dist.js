'use strict';

module.exports = [
    {
        mode: 'production',
        entry: {
            'futoin-asyncsteps': './es5/lib/browser.js',
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
            'futoin-asyncsteps-dev': './es5/lib/browser.js',
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
