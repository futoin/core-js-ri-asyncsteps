'use strict';

module.exports = {
    entry: {
        unittest : './es5/test/unittest.js',
    },
    output: {
        filename: "[name].js",
        path: __dirname + '/dist',
        libraryTarget: "umd",
    },
    externals: {
        chai : {
            root: "chai",
            amd: "chai",
            commonjs: "chai",
            commonjs2: "chai",
        },
        mocha : {
            root: "mocha",
            amd: "mocha",
            commonjs: "mocha",
            commonjs2: "mocha",
        },
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
};
