var gulp = require('gulp'),
// gulp modules
    autoprefixer = require('gulp-autoprefixer'),
    bower = require('gulp-bower'),
    concat = require('gulp-concat'),
    imagemin = require('gulp-imagemin'),
    livereload = require('gulp-livereload'),
    minifyHTML = require('gulp-minify-html'),
    newer = require('gulp-newer'),
    plumber = require('gulp-plumber'),
    run = require('gulp-run'),
    uglifyJs = require('gulp-uglify'),
    sass = require('gulp-sass'),
    sourcemaps = require('gulp-sourcemaps'),
    ts = require('gulp-typescript'),
    twig = require('gulp-twig'),
// image optimizers
    jpegtran = require('imagemin-jpegtran'),
    optipng = require('imagemin-optipng'),
    svgo = require('imagemin-svgo'),
// native modules
    del = require('del'),
    runSequence = require('run-sequence'),
    merge = require('merge2');

/**
 * Installation tasks
 */
gulp.task('install-bower', function () {
    return bower();
});

gulp.task('install', ['install-bower']);

/**
 * Build templates tasks
 */
gulp.task('clean-templates', function (cb) {
    del(['build/**/*.html'], cb);
});

gulp.task('build-pages', function () {
    return gulp
        .src([
            'sources/pages/**/*.twig'
        ], {base: 'sources/pages'})
        .pipe(plumber())
        .pipe(twig())
        .pipe(minifyHTML())
        .pipe(gulp.dest('build'));
});

gulp.task('build-templates', ['build-pages']);

/**
 * Build stylesheets tasks
 */
gulp.task('clean-stylesheets', function (cb) {
    del(['build/stylesheets'], cb);
});

gulp.task('build-stylesheets', function () {
    return gulp
        .src([
            'sources/stylesheets/website.scss'
        ])
        .pipe(plumber())
        .pipe(sourcemaps.init())
        .pipe(sass({
            outputStyle: 'compressed'
        }))
        .pipe(autoprefixer({
            browsers: ['last 2 versions'],
            cascade: false
        }))
        .pipe(concat('website.css'))
        .pipe(sourcemaps.write('.', {sourceRoot: '../'}))
        .pipe(gulp.dest('build/stylesheets'));
});

/**
 * Build javascripts tasks
 */
var tsProject = ts.createProject({
    sortOutput: true,
    declarationFiles: true,
    noExternalResolve: true
});

gulp.task('clean-javascripts', function (cb) {
    del(['build/javascripts'], cb);
});

gulp.task('build-javascripts', function () {
    var assets = gulp
        .src([
            'bower_components/jquery/dist/jquery.js',
            'bower_components/bootstrap-sass/assets/javascripts/bootstrap.js'
        ])
        .pipe(plumber())
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(concat('assets.js'))
        .pipe(uglifyJs())
        .pipe(sourcemaps.write('.', {sourceRoot: '../bower_components'}))
        .pipe(gulp.dest('build/javascripts'));

    var tsResult = gulp
        .src([
            'typings/**/*.ts',
            'sources/javascripts/**/*.ts'
        ])
        .pipe(sourcemaps.init())
        .pipe(ts(tsProject));

    return merge([
        assets,
        tsResult.dts
            .pipe(gulp.dest('build/definitions')),
        tsResult.js
            .pipe(concat('output.js'))
            .pipe(sourcemaps.write('.', {sourceRoot: '../sources/javascripts'}))
            .pipe(gulp.dest('build/javascripts'))
    ]);
});

/**
 * Build images tasks
 */
gulp.task('clean-images', function (cb) {
    del(['build/images'], cb);
});

gulp.task('build-images', function () {
    return gulp
        .src([
            'sources/images/**/*.{jpg,png,gif,svg}'
        ], {base: 'sources/images'})
        .pipe(plumber())
        .pipe(newer('build/images'))
        .pipe(imagemin({
            use: [jpegtran(), optipng(), svgo()]
        }))
        .pipe(gulp.dest('build/images'));
});

/**
 * Build fonts task
 */

gulp.task('clean-fonts', function (cb) {
    del(['build/fonts'], cb);
});

gulp.task('build-fonts', function () {
    return gulp
        .src([
            'bower_components/font-awesome/fonts/*'
        ])
        .pipe(plumber())
        .pipe(newer('build/fonts'))
        .pipe(gulp.dest('build/fonts'));
});

/**
 * Global build tasks
 */
gulp.task('clean', ['clean-templates', 'clean-stylesheets', 'clean-javascripts', 'clean-images', 'clean-fonts']);

gulp.task('build', function () {
    runSequence(
        'clean',
        ['build-templates', 'build-stylesheets', 'build-javascripts', 'build-images', 'build-fonts']
    );
});

gulp.task('watch', function () {
    livereload.listen();
    gulp.watch(['sources/pages/**/*.twig', 'sources/templates/**/*.twig'], function () {
        runSequence('build-pages', livereload.changed);
    });
    gulp.watch('sources/stylesheets/**/**', function () {
        runSequence('build-stylesheets', livereload.changed);
    });
    gulp.watch('sources/javascripts/**/**', function () {
        runSequence('build-javascripts', livereload.changed);
    });
    gulp.watch('sources/images/**/*', function () {
        runSequence('build-images', livereload.changed);
    });
});

gulp.task('default', function () {
    runSequence(
        ['build-templates', 'build-stylesheets', 'build-javascripts', 'build-images', 'build-fonts'],
        'watch'
    );
});
