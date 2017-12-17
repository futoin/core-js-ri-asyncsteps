'use strict';

const UglifyJsPlugin = require( 'uglifyjs-webpack-plugin' );

module.exports = {
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
    plugins: [
        new UglifyJsPlugin( {
            sourceMap: true,
        } ),
    ],
};
