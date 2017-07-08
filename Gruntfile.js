'use strict';

var fs = require('fs');

module.exports = function (grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON( 'package.json' ),
        bower: grunt.file.readJSON( 'bower.json' ),
                     
        jshint: {
            options: {
                jshintrc : true,
            },
            all: ['Gruntfile.js', 'lib/**/*.js'],
        },
        jscs: {
            options : {
                config: ".jscsrc",
                fix: true,
            },
            all: ['Gruntfile.js', 'lib/**/*.js'],
        },
        mocha_istanbul: {
            coverage: {
                src: ['test'],
            }
        },
        istanbul_check_coverage: {},
                     
        pure_cjs: {
            dist: {
                files: {
                    'dist/<%= pkg.name %>.js' : 'lib/browser.js'
                },
                options: {
                    map : true,
                    exports: '$as',
                    external : {
                    }
                }
            },
            unittest: {
                files: {
                    'dist/unittest.js' : 'test/unittest.js'
                },
                options: {
                    map : true,
                    exports: 'unittest',
                    external : {
                        'chai' : true
                    }
                }
            }
        },
        uglify: {
            dist: {
                files: {
                    'dist/futoin-asyncsteps.min.js' : [ 'dist/futoin-asyncsteps.js' ]
                }
            }
        },
        connect: {
            server: {
                options: {
                    port: 8000,
                    base: '.',
                }
            }
        },
        mocha_phantomjs: {
            all: {
                options: {
                    urls: [
                        'http://localhost:8000/test/unittest.html'
                    ]
                }
            }
        },
        jsdoc2md: {
            README: {
                src: "lib/*.js",
                dest: "README.md",
                options: {
                    template: fs.readFileSync('misc/README.hbs','utf8'),
                    private: false
                }
            }
        },
        replace: {
            README: {
                src: "README.md",
                overwrite: true,
                replacements: [{
                    from: "$$pkg.version$$",
                    to: "<%= pkg.version %>"
                }]
            }
        }
    });
    
    grunt.loadNpmTasks( 'grunt-contrib-jshint' );
    grunt.loadNpmTasks( 'grunt-jscs' );
    grunt.loadNpmTasks( 'grunt-pure-cjs' );
    grunt.loadNpmTasks( 'grunt-contrib-uglify' );
    grunt.loadNpmTasks( 'grunt-contrib-connect' );
    grunt.loadNpmTasks( 'grunt-mocha-phantomjs' );
    grunt.loadNpmTasks( 'grunt-mocha-istanbul' );
    
    grunt.registerTask( 'check', [ 'jshint', 'jscs' ] );

    grunt.registerTask( 'build-browser', ['pure_cjs','uglify'] );
    grunt.registerTask( 'test-browser', ['connect','mocha_phantomjs'] );
    
    grunt.registerTask( 'node', [ 'check', 'mocha_istanbul', 'mocha_istanbul:coverage' ] );
    grunt.registerTask( 'browser', ['check', 'build-browser','test-browser'] );
    grunt.registerTask( 'test', [ 'node', 'browser' ] );
    
    grunt.loadNpmTasks( 'grunt-jsdoc-to-markdown' );
    grunt.loadNpmTasks( 'grunt-text-replace' );
    grunt.registerTask( 'doc', [ 'jsdoc2md', 'replace:README' ] );

    grunt.registerTask( 'default', ['test','doc'] );
};