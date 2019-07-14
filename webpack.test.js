'use strict';

module.exports = {
    mode: 'development',
    entry: {
        unittest : './es5/test/unittest.js',
        isynctest : './es5/test/isynctest.js',
        mutextest : './es5/test/mutextest.js',
        throttletest : './es5/test/throttletest.js',
        limitertest : './es5/test/limitertest.js',
    },
    output: {
        filename: "[name].js",
        path: __dirname + '/dist',
        libraryTarget: "umd",
    },
    externals: {
        'futoin-asyncsteps' : {
            root: "$as",
            amd: "futoin-asyncsteps",
            commonjs: "futoin-asyncsteps",
            commonjs2: "futoin-asyncsteps",
        },
    },
    node : false,
};
