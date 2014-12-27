module.exports = function (grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON( 'package.json' ),
        bower: grunt.file.readJSON( 'bower.json' ),
                     
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
                    external : {
                        'chai' : true,
                        'assert' : true
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
        npm: {
            test: {
                args: ["test"]
            }
        },
        bump: {
            files: [
                'package.json',
                'bower.json'
            ],
            commitFiles: [
                'package.json',
                'bower.json'
            ],
            updateConfigs: [ 'pkg', 'bower' ],
            commitMessage: 'Updated for release v%VERSION%',
            tagMessage: 'Release %VERSION%'
        },
        sync: {
            all: {
                options: {
                    sync: ['name', 'version','description','license','keywords','homepage','repository'],
                    from: 'package.json',
                    to: 'bower.json'
                }
            }
        }
    });
    
    grunt.loadNpmTasks( 'grunt-pure-cjs' );
    grunt.loadNpmTasks( 'grunt-contrib-uglify' );
    grunt.loadNpmTasks( 'grunt-contrib-connect' );
    grunt.loadNpmTasks( 'grunt-mocha-phantomjs' );
    grunt.loadNpmTasks( 'grunt-npm-helper' );
    grunt.loadNpmTasks( 'grunt-npm2bower-sync' );

    grunt.registerTask( 'build-browser', ['pure_cjs','uglify'] );
    grunt.registerTask( 'test-browser', ['connect','mocha_phantomjs'] );
    
    grunt.registerTask( 'node', [ 'npm:test' ] );
    grunt.registerTask( 'browser', ['build-browser','test-browser'] );

    grunt.registerTask( 'default', ['sync','node','browser'] );
};