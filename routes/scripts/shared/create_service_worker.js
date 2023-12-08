const swPrecache = require('sw-precache');

// process.chdir('../../../');
swPrecache.write('./public/app.serviceWorker.js', {
  root: './public/',
  staticFileGlobs: [
    './public/css/**/*',
    './public/imgs/**/*',
    './public/js/**/*',
    './public/favicon.ico',
  ],
  stripPrefix: './public/',
  maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
});
