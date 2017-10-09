'use strict';

module.exports = function(grunt) {

  require('load-grunt-tasks')(grunt);

  // project configuration
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    config: {
      sources: 'lib',
      tests: 'test'
    },

    jshint: {
      src: [
        ['<%=config.sources %>']
      ],
      gruntfile: [
        'Gruntfile.js'
      ],
      options: {
        jshintrc: true
      }
    },

    release: {
      options: {
        tagName: 'v<%= version %>',
        commitMessage: 'chore(project): release v<%= version %>',
        tagMessage: 'chore(project): tag v<%= version %>'
      }
    },

    jasmine_node: {
      options: {
        specNameMatcher: '.*Spec',
        jUnit: {
          report: true,
          savePath : 'tmp/reports/jasmine',
          useDotNotation: true,
          consolidate: true
        }
      },
      all: [ 'test/spec/' ]
    },
    watch: {
      test: {
        files: [ '<%= config.sources %>/**/*.js', '<%= config.tests %>/**/*.js'],
        tasks: [ 'jasmine_node']
      }
    }
  });

  // tasks

  grunt.registerTask('test', [ 'jasmine_node' ]);
  grunt.registerTask('auto-test', [ 'jasmine_node', 'watch:test' ]);

  grunt.registerTask('default', [ 'jshint', 'test' ]);
};