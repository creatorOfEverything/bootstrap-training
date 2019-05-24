"use strict";

const gulp = require("gulp"),
  $ = require("gulp-load-plugins")({
    rename: {
      "gulp-svg-sprite": "svg"
    }
  }),
  mode = require("gulp-mode")(),
  multipipe = require("multipipe"),
  autoprefixer = require("autoprefixer"),
  uncss = require("postcss-uncss"),
  browserSync = require("browser-sync").create(),
  isProduction = $.util.env.type == "production" ? true : false;

const paths = {
  html: {
    src: "src/index.html",
    dst: "dest/"
  },
  scss: {
    src: "src/scss/style.scss",
    dst: "dest/css"
  },
  js: {
    src: "src/js/script.js",
    dst: "dest/js"
  },
  img: {
    src: "src/assets/img/*.{png,jpg,jpeg,gif}",
    dst: "dest/assets/img"
  },
  serve: {
    server: "dest/",
    watch: "src/**/*.*"
  },
  svg: {
    src: "src/assets/icons/*.svg",
    dst: "dest/assets/icons/sprites"
  }
};

gulp.task("build:html", () => {
  return gulp
    .src(paths.html.src, { since: gulp.lastRun("build:html") })
    .pipe($.newer({ dest: "dest/", ext: ".html" }))
    .pipe($.debug({ title: "html" }))
    .pipe(gulp.dest(paths.html.dst))
    .pipe(browserSync.stream());
});

gulp.task("build:scss", () => {
  return multipipe(
    gulp.src(paths.scss.src),
    // $.newer({ dest: paths.scss.dst, ext: ".css" }),
    $.debug({ title: "scss" }),
    $.sass(),
    $.postcss(
      [
        autoprefixer({ browsers: ["last 2 version"] }),
        isProduction
          ? require("postcss-uncss")({
              html: "dest/index.html"
            })
          : false
      ].filter(Boolean)
    ),
    mode.production($.cssmin()),
    mode.production($.rename({ suffix: ".min" })),
    gulp.dest(paths.scss.dst),
    browserSync.stream()
  ).on(
    "error",
    $.notify.onError(function(error) {
      return {
        title: "scss",
        message: error.message
      };
    })
  );
});

gulp.task("build:js", () => {
  return multipipe(
    gulp.src(paths.js.src, { since: gulp.lastRun("build:js") }),
    $.newer({
      dest: "dest/js/**/*.js",
      ext: ".js"
    }),
    $.debug({ title: "js" }),
    $.include(),
    $.babel({
      presets: ["@babel/env"]
    }),
    mode.production($.uglify()),
    mode.production($.rename({ suffix: ".min" })),
    gulp.dest(paths.js.dst),
    browserSync.stream()
  ).on(
    "error",
    $.notify.onError(function(error) {
      return {
        title: "js",
        message: error.message
      };
    })
  );
});

gulp.task("build:assets", cb => {
  return gulp
    .src(paths.img.src, { since: gulp.lastRun("build:assets") })
    .pipe(
      $.newer({
        dest: paths.img.dst
      })
    )
    .pipe(mode.production($.imagemin()))
    .pipe(gulp.dest(paths.img.dst));
});

gulp.task("build:svg", cb => {
  if (isProduction) {
    gulp
      .src(paths.svg.src, { since: gulp.lastRun("build:svg") })
      .pipe(
        $.newer({
          dest: paths.svg.dst,
          ext: ".svg"
        })
      )
      .pipe(
        $.svgmin({
          js2svg: {
            pretty: true
          }
        })
      )
      .pipe(
        $.cheerio({
          run: function($) {
            $("[fill]").removeAttr("fill");
            $("[stroke]").removeAttr("stroke");
            $("[style]").removeAttr("style");
          },
          parserOptions: { xmlMode: true }
        })
      )
      .pipe($.replace("&gt;", ">"))
      .pipe(
        $.svg({
          mode: {
            symbol: {
              sprite: "../../sprite.svg",
              render: {
                scss: {
                  dest: "../../../../../src/scss/_sprites.scss",
                  template: "src/scss/tmpl/_sprites_template.scss"
                }
              }
            }
          }
        })
      )
      .pipe(gulp.dest(paths.svg.dst));
    cb();
  } else {
    cb();
  }
});

gulp.task(
  "build",
  gulp.series(
    "build:html",
    "build:scss",
    "build:js",
    "build:assets",
    "build:svg"
  )
);

gulp.task("serve", () => {
  browserSync.init({
    server: paths.serve.server
  });

  gulp.watch(
    paths.serve.watch,
    gulp.series("build", function(done) {
      browserSync.reload();
      done();
    })
  );
});

gulp.task("default", gulp.series("build", "serve"));
