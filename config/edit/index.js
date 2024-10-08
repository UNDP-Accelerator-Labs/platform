const app_id = process.env.APP_ID;
const is_staging = `${process.env.LOGIN_DB_NAME}`.includes('staging');

let app_obj = require('./local.js');
if (app_id === 'ap') {
  app_obj = { ...app_obj, ...require('./ap.js') };
} else if (app_id === 'exp') {
  app_obj = { ...app_obj, ...require('./exp.js') };
} else if (app_id === 'sm') {
  app_obj = { ...app_obj, ...require('./sm.js') };
} else if (app_id === 'consent') {
  app_obj = { ...app_obj, ...require('./consent.js') };
} else if (app_id === 'codification') {
  app_obj = { ...app_obj, ...require('./codification.js') };
} else if (app_id === 'signals') {
  app_obj = { ...app_obj, ...require('./signals.js') };
} else if (app_id === 'login') {
  app_obj = { ...app_obj, ...require('./login.js') };
} else if (app_id === 'global') {
  app_obj = {
    ...app_obj,
    app_title: 'DO NOT USE!',
    app_title_short: 'ERROR!',
  };
} else if (app_id !== 'local') {
  throw new Error(`APP_ID must be set to a valid value, got '${app_id}'`);
}

const {
  app_title,
  app_title_short,
  app_suite,
  own_app_url,
  app_suite_secret,
  app_languages,
  app_description,
  app_home,
  app_storage,
  modules,
  metafields,
  engagementtypes,
  colors,
  map,
  lazyload,
  page_content_limit,
  followup_count,
  browse_display,
  view_display,
  welcome_module,
  fixed_uuid,
  allowed_routes,
  restricted_routes,
  internal_publication,
} = app_obj;

exports.is_staging = is_staging;
exports.app_id = app_id;
exports.app_title = is_staging ? `${app_title} (staging)` : app_title;
exports.app_title_short = app_title_short;
exports.app_suite = app_suite;
exports.own_app_url = is_staging
  ? 'https://acclabs-staging.azurewebsites.net/'
  : own_app_url;
exports.app_suite_secret = app_suite_secret;
exports.app_languages = app_languages;
exports.app_description = app_description;
exports.app_home = app_home;
exports.app_storage = app_storage;
exports.modules = modules;
exports.metafields = metafields;
exports.engagementtypes = engagementtypes;
exports.colors = colors;
exports.map = map;
exports.lazyload = lazyload;
exports.page_content_limit = page_content_limit;
exports.followup_count = followup_count;
exports.browse_display = browse_display;
exports.view_display = view_display;
exports.welcome_module = welcome_module;
exports.fixed_uuid = fixed_uuid;
exports.internal_publication = internal_publication || false;

exports.translations = require('./translations.js').translations;
exports.allowed_routes = allowed_routes || null;
exports.restricted_routes = restricted_routes || null;
