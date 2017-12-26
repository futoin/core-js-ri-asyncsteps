'use strict';

const UglifyJsPlugin = require( 'uglifyjs-webpack-plugin' );
const package_json = require( './package' );

module.exports = [
    {
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
        plugins: [
            new UglifyJsPlugin( {
                sourceMap: true,
            } ),
        ],
    },
    {
        entry: {
            'polyfill-asyncsteps': './lib/polyfill.js',
        },
        output: {
            filename: "[name].js",
            path: __dirname + '/dist',
        },
        node : false,
        plugins: [
            new UglifyJsPlugin( {
                sourceMap: true,
            } ),
        ],
    },
];
