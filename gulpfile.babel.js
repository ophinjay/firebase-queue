'use strict';

import gulp from 'gulp';
import exit from 'gulp-exit';
import mocha from 'gulp-mocha';
import istanbul from 'gulp-istanbul';
import babel from 'gulp-babel';
import {
  addBabelifyTasks,
  getTaskNames as getBabelifyTasks,
} from './gulp-tasks/babelify';
import copy from './gulp-tasks/copy';
import jsonEdit from './gulp-tasks/jsoneditor';
import clean from './gulp-tasks/clean';


const buildRoot = 'build';
const releaseRoot = 'release';

const serverFiles = {
  src: {
    files: ['src/**/*.js', '!src/Workflow/tests/index.js', '!src/Workflow/tests/stats.js', '!src/Workflow/index.js', '!src/Queue.js'],
    to: `${buildRoot}`
  },
  index: {
    root: 'src/Workflow',
    fileName: 'index.js',
    addPolyfill: true,
    to: `${buildRoot}/Workflow`,
  },
  queue: {
    root: 'src',
    fileName: 'Queue.js',
    addPolyfill: true,
    to: `${buildRoot}`,
  },
  wftest: {
    root: 'src/Workflow/tests',
    fileName: 'index.js',
    addPolyfill: true,
    to: `${buildRoot}/Workflow/tests`
  },
  wfstat: {
    root: 'src/Workflow/tests',
    fileName: 'stats.js',
    addPolyfill: true,
    to: `${buildRoot}/Workflow/tests`
  },
};

const testPaths = {
  js: {
    srcFiles: [
      'src/**/*.js'
    ],
    destDir: 'dist'
  },

  tests: [
    'test/Queue.spec.js',
    'test/Worker.spec.js'
  ]
};

const babelifyTasks = getBabelifyTasks(serverFiles);
gulp.task('build', babelifyTasks);
addBabelifyTasks(gulp, serverFiles, {
  srcRoot: __dirname,
  buildRoot,
  deps: ['clean'],
});

gulp.task('clean', clean(buildRoot));

// Runs the Mocha test suite
gulp.task('test', () => {
  return gulp.src(testPaths.js.srcFiles)
    .pipe(babel({
      presets: ['env'],
      plugins: ['add-module-exports', 'transform-class-properties', 'transform-object-rest-spread', 'transform-function-bind'],
    }))
    .pipe(istanbul())
    .pipe(istanbul.hookRequire())
    .on('finish', () => {
      gulp.src(testPaths.tests)
        .pipe(mocha({
          reporter: 'spec',
          timeout: 10000
        }))
        .pipe(exit());
    });
});

gulp.task('clean-release', ['build'], clean(releaseRoot));
gulp.task('copy-to-release', ['clean-release'], copy(`${buildRoot}/**/*`, releaseRoot));
gulp.task('copy-readme', ['copy-to-release'], copy(`README.md`, releaseRoot));
gulp.task('copy-pkg-json', ['copy-to-release'], jsonEdit('package.json', releaseRoot, {
  merge: {
    main: './index.js',
  },
  transform({ scripts, ...essentials }) {
    return {
      ...essentials,
    }
  },
}));

gulp.task('copy-queuedb', ['copy-to-release'], jsonEdit('QueueDB/package.json', `${releaseRoot}/QueueDB`, {
  merge: {
    main: '../Workflow/QueueDB.js'
  }
}));
gulp.task('copy-constants', ['copy-to-release'], jsonEdit('constants/package.json', `${releaseRoot}/constants`, {
  merge: {
    main: '../Workflow/constants.js'
  }
}));
gulp.task('copy-utils', ['copy-to-release'], jsonEdit('utils/package.json', `${releaseRoot}/utils`, {
  merge: {
    main: '../Workflow/utils.js'
  }
}));
gulp.task('copy-proxies', ['copy-queuedb', 'copy-constants', 'copy-utils']);

gulp.task('publish', ['build', 'clean-release', 'copy-to-release', 'copy-pkg-json', 'copy-readme', 'copy-proxies']);

gulp.task('default', ['build']);