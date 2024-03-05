// // EDIT THIS
// GENERAL APP INFO
exports.app_title = 'Login';
exports.app_title_short = 'login';
exports.app_suite = 'acclab_platform';
exports.app_suite_secret = process.env.APP_SUITE_SECRET || 'secret';
exports.app_languages = ['en', 'fr', 'es', 'pt'];
exports.app_description =
  require('./translations.js').translations['app description']?.[this.app_title_short];
exports.app_home =
  require('./translations.js').translations['app home']?.[this.app_title_short];

exports.app_storage = 'https://acclabplatforms.blob.core.windows.net/';
exports.own_app_url = 'https://login.sdg-innovation-commons.org/';

// DESIRED MODULES
exports.modules = [
  { type: 'teams', rights: { read: 2, write: 2 } },
  { type: 'contributors', rights: { read: 2, write: 2 } },
];

const metafields = [];

exports.metafields = metafields;

// DESIRED ENGAGEMENT TYPES
// OPTIONS: ['like', 'dislike', 'comment']
exports.engagementtypes = [];

// COLORS
exports.colors = {
  'dark-blue': '#005687',
  'mid-blue': '#0468B1',
  'mid-blue-semi': 'rgba(4,104,177,.75)',
  'light-blue': '#32BEE1',

  'dark-red': '#A51E41',
  'mid-red': '#FA1C26',
  'light-red': '#F03C8C',

  'dark-green': '#418246',
  'mid-green': '#61B233',
  'light-green': '#B4DC28',

  'dark-yellow': '#FA7814',
  'mid-yellow': '#FFC10E',
  'light-yellow': '#FFF32A',

  'dark-grey': '#000000',
  'mid-grey': '#646464',
  'light-grey': '#969696',

  'light-2': '#E5E5E5',
  'light-3': 'rgb(239,239,239)',
};

// DISPLAY VARIABLES
exports.map = false;
exports.lazyload = false;
exports.page_content_limit = 25;
exports.followup_count = 1;
// OPTIONS: 'columns', 'rows'
exports.browse_display = 'columns';
exports.view_display = 'page';
// OPTIONS: 'mosaic', 'carousel'
exports.welcome_module = 'carousel';

exports.allowed_routes = [];

exports.restricted_routes = [
  '/:lang/home',
  '/:lang/browse/pads/*',
  '/:lang/browse/templates/*',
  '/:lang/browse/reviews/*',
  '/:lang/browse/mobilizations/*',
  '/:lang/preview/*',
  '/upload/*',
];
