'use strict';

const UglifyJsPlugin = require( 'uglifyjs-webpack-plugin' );

module.exports = {
    entry: {
        'futoin-asyncsteps': './lib/browser.js',
    },
    output: {
        filename: "[name].min.js",
        path: __dirname + '/dist',
    },
    node : false,
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /(node_modules|bower_components)/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [ 'babel-preset-env' ],
                        plugins: [ "transform-object-assign" ],
                    },
                },
            },
        ],
    },
    plugins: [
        new UglifyJsPlugin( {
            sourceMap: true,
        } ),
    ],
};
