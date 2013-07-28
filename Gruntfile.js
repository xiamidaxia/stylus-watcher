/*
 * webfront-watcher
 * 
 * http://github.com/xiamidaxia
 *
 * Copyright (c) 2013 xiamidaxia
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {
    // 配置
    grunt.initConfig({
        pkg : grunt.file.readJSON('package.json'),
        concat : {
            domop : {
                src: ['src/test1.js', 'src/test2.js'],
                dest: 'dest/domop.js'
            }
        },
        uglify : {
            options : {
                banner : '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
            },
            build : {
                src : 'dest/domop.js',
                dest : 'dest/domop.min.js'
            }
        }
    });
    // 载入concat和uglify插件，分别对于合并和压缩
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    // 注册任务
    grunt.registerTask('default', ['concat', 'uglify']);
}; 
