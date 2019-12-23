const gulp = require('gulp'),
    path = require('path'),
    sass = require('gulp-sass'),
    autoprefixer = require('gulp-autoprefixer'),
    minifycss = require('gulp-minify-css'),
    uglify = require('gulp-uglify'),
    imagemin = require('gulp-imagemin'),
    // rename = require('gulp-rename'),
    clean = require('gulp-clean'),
    concat = require('gulp-concat'),
    cache = require('gulp-cache'),
    plumber = require('gulp-plumber'),
    nunjucksRender = require('gulp-nunjucks-render'),
    data = require('gulp-data'),
    browserSync = require('browser-sync').create(),
    babel = require('gulp-babel'),
    // runSequence = require('run-sequence'),
    md5 = require("gulp-md5-plus"),
    reload = browserSync.reload

// 清理
gulp.task('clean', function() {
    return gulp.src(['dist'], { read: false }).pipe(clean());
});

function getDataForFile(file) {
    return {
        mock: require('./src/mock/' + path.basename(file.path, '.html') + '.json')
    };
}

// html
gulp.task('html', function (done) {
    gulp.src('src/view/**/*.html')
        // .pipe(data(getDataForFile))
        .pipe(nunjucksRender({
            path: ['src/common/', 'src/components/'] // String or Array
        }))
        .pipe(gulp.dest('dist/view'));
    done()
});

// fonts
gulp.task('outfonts', function (done) {
    gulp.src('src/fonts/**/*').pipe(gulp.dest('dist/fonts'))
    done()
});

gulp.task('fonts', gulp.series('outfonts', function (done) {
    gulp.src('src/css/fonts/**/*').pipe(gulp.dest('dist/css/fonts'))
    done()
}));

gulp.task('scss', function(done) {
    return gulp.src('src/css/**/*.scss')
        .pipe(plumber())
        .pipe(sass())
        .pipe(autoprefixer({
            overrideBrowserslist: [
                "Android 4.1",
                "iOS 7.1",
                "Chrome > 31",
                "ff > 31",
                "ie >= 8"
            ],
            grid: true   
        }))
        .pipe(minifycss())
        // .pipe(md5(10, 'dist/view/**/*.html'))
        .pipe(gulp.dest('dist/css'))
});

gulp.task('oc_sass', function() {
    return gulp.src('src/sass/onecore.scss')
        .pipe(plumber())
        .pipe(sass())
        .pipe(autoprefixer({
            overrideBrowserslist: [
                "Android 4.1",
                "iOS 7.1",
                "Chrome > 31",
                "ff > 31",
                "ie >= 8"
            ],
            grid: true   
        }))
        .pipe(minifycss())
        // .pipe(md5(10, 'dist/view/**/*.html'))
        .pipe(gulp.dest('dist/css'))
});

// 脚本
gulp.task('scripts', function() {
    return gulp.src('src/js/app/**/*.js')
        .pipe(babel({
            presets: ['env']
        }))
        // .pipe(uglify())
        // .pipe(md5(10, 'dist/view/**/*.html'))
        .pipe(gulp.dest('dist/js/app'))
});

// onecore
gulp.task('onecore', function() {
    return gulp.src([
            'src/js/onecore/bliss.js',
            'src/js/onecore/util.js',
            'src/js/onecore/area.js',
            'src/js/onecore/onecore.js',
            'src/js/onecore/msgbox.js',
            'src/js/onecore/toast.js',
            'src/js/onecore/dropmenu.js',
            'src/js/onecore/select.js',
            'src/js/onecore/datepicker.js',
            'src/js/onecore/page.js',
            // 'src/js/onecore/slider.js',
            'src/js/onecore/tab.js',
            'src/js/onecore/validate.js',
            'src/js/onecore/imgup.js',
            'src/js/onecore/imgbox.js',
            'src/js/onecore/city.js'

            // 'src/js/onecore/accordion.js',
            // 'src/js/onecore/domark.js'
        ])
        .pipe(plumber())
        .pipe(babel({
            presets: ['es2015']
        }))
        .pipe(concat('onecore.js'))
        .pipe(uglify())
        // .pipe(md5(10, 'dist/view/**/*.html'))
        .pipe(gulp.dest('dist/js/lib'))
        // .pipe(notify({
        //     message: 'onecore task complete'
        // }));
});

// 脚本
gulp.task('libs', function() {
    return gulp.src('src/js/lib/**/*.js')
        // .pipe(uglify())
        .pipe(gulp.dest('dist/js/lib'))
});

// 图片
gulp.task('images', function() {
    return gulp.src('src/img/**/*')
        // .pipe(cache(imagemin({
        //     optimizationLevel: 3,
        //     progressive: true,
        //     interlaced: true
        // })))
        .pipe(gulp.dest('dist/img'))
});

// 看守
gulp.task('watch', function(done) {

    gulp.watch('src/css/**/*.scss', gulp.series('scss'));

    gulp.watch('src/sass/**/*.scss', gulp.series('oc_sass'));

    gulp.watch('src/view/**/*.html', gulp.series('html'));

    gulp.watch('src/common/**/*.html', gulp.series('html'));

    gulp.watch('src/components/**/*.html', gulp.series('html'));

    gulp.watch('src/js/app/**/*.js', gulp.series('scripts'));

    gulp.watch('src/js/onecore/**/*.js', gulp.series('onecore'));

    gulp.watch('src/js/lib/**/*.js', gulp.series('libs'));

    gulp.watch('src/img/**/*', gulp.series('images'));

    gulp.watch("dist/css/**/*.css").on('change', reload);

    gulp.watch("dist/js/**/*.js").on('change', reload);

    gulp.watch("dist/view/**/*.html").on('change', reload);

    gulp.watch("dist/img/**/*").on('change', reload);

    done()
});

// server
gulp.task('server', function() {
    browserSync.init({
        port: 3001,
        server: {
            baseDir: "./dist",
            index: "/view/index.html"
        }
    });
});

// 预设任务1
gulp.task('resetAll', gulp.series('html', 'fonts', 'scss', 'oc_sass', 'scripts', 'onecore', 'libs', function(done) {
    condition = false;
    done()
}));

// 预设任务
gulp.task('default', gulp.series('resetAll', 'images', 'watch', 'server', function(done) {
    condition = false;
    done()
}));
