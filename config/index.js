let {
  app_id,
  app_title,
  app_title_short,
  app_suite,
  app_suite_url,
  app_suite_secret,
  app_languages,
  app_description,
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
} = require('./edit/');

const { translations } = require('./edit/translations.js');
exports.translations = translations;

exports.app_id = app_id;
exports.app_title = app_title;
exports.app_title_short = app_title_short;
exports.app_suite = app_suite;
exports.app_suite_url = app_suite_url;
exports.app_suite_secret = app_suite_secret;
exports.app_description = app_description;
exports.app_storage = process.env.AZURE_STORAGE_CONNECTION_STRING
  ? new URL(app_title_short, app_storage).href
  : undefined; // TO DO: UPDATE THIS WITH THE CORRECT CONTAINER

exports.colors = colors;

// DESIRED MODULES
if (!modules) modules = [];
// if (!modules.includes('pads')) modules.unshift('pads') // ALWAYS INCLUDE PADS
if (!modules.some((d) => d.type === 'pads')) {
  modules.unshift({
    type: 'pads',
    rights: { read: 0, write: { blank: 1, templated: 1 } },
  });
} // ALWAYS INCLUDE PADS
// THIS IS TO MAKE SURE THE pads MODULE ALWAYS HAS write.blank AND write.templated
if (
  modules.some((d) => d.type === 'pads' && typeof d.rights?.write === 'number')
) {
  const m = modules.find((d) => d.type === 'pads');
  const { write } = m.rights;
  m.rights.write = { blank: write, templated: write };
}
// if (modules.includes('mobilizations')) {
//   if (!modules.includes('templates')) modules.push('templates')
// }
if (modules.some((d) => d.type === 'mobilizations')) {
  const { rights } = modules.find((d) => d.type === 'mobilizations');

  if (!modules.some((d) => d.type === 'templates')) {
    modules.push({ type: 'templates', rights });
  }
  if (!modules.some((d) => d.type === 'contributors')) {
    modules.push({ type: 'contributors', rights });
  }
}
if (modules.some((d) => d.type === 'pinboards')) {
  const { rights } = modules.find((d) => d.type === 'pinboards');

  if (!modules.some((d) => d.type === 'urls')) {
    modules.push({ type: 'urls', rights });
  }
}
// IF THERE ARE TEMPLATES, AND THE contribute RIGHTS FOR PADS HAVE NOT BEEN SET, SET THEM
// if (modules.some(d => d.type === 'templates')
//   && !modules.some(d => d.type === 'pads'
//     && !isNaN(d.rights?.write.templated)
//   )
// ) {
//   let { rights } = modules.find(d => d.type === 'pads')
//   const { write } = rights
//   if (typeof write === 'object') rights.templated = rights.blank
//   else rights = { blank: rights, templated: rights }
//   modules.find(d => d.type === 'pads').rights = rights
// }
// if (modules.some(d => d.type === 'contributors')) {
//   if (!modules.some(d => d.type === 'mobilizations')) {
//     const rights = modules.find(d => d.type === 'contributors').rights
//     modules.push({ type: 'mobilizations', rights })
//   }
// }
// TO DO: MAKE SURE THAT mobilizations DOES NOT HAVE LOWER RIGHTS THAN templates
// TO DO: MAKE SURE THAT mobilizations AND contributors HAVE THE SAME rights
// TO DO: MAKE SURE THAT teams AND contributors HAVE THE SAME rights

modules.forEach((d) => {
  // THIS IS TO MAKE SURE USERS WHO CAN WRITE HAVE AT LEAST THE RIGHT TO VIEW
  const { rights } = d;
  if (rights.write < rights.read) rights.write = rights.read; // TO DO: CHECK THIS DOES NOT NEED TO BE d.rights…
});
exports.modules = modules;
// DESIRED METADATA
// if (metafields.includes('locations')) map = true
if (metafields.some((d) => d.type === 'location')) map = true;
metafields.forEach(
  (d) => (d.label = d.name.toLowerCase().trim().replace(/\s+/g, '_')),
);
exports.metafields = metafields || [];

exports.media_value_keys = ['txt', 'html', 'src', 'srcs', 'shapes', 'options'];

// DESIRED ENGAGEMENT TYPES
exports.engagementtypes = engagementtypes || [];

// LANGUAGES AVAILABLE
exports.app_languages = app_languages.sort((a, b) => a.localeCompare(b));

// DB CONNECTION
const DB = require('./db/').DB;
exports.DB = DB;

// own db id
let ownDBid = null;

exports.ownDB = async function () {
  if (ownDBid === null) {
    let aid = app_id;
    if (app_id === 'local') {
      aid = 'sm';
    }
    ownDBid = (
      await DB.general.one(`SELECT id FROM extern_db WHERE db = $1;`, [aid])
    ).id;
  }
  return ownDBid;
};

// global db id
let globalDBid = null;

exports.globalDB = async function () {
  if (globalDBid === null) {
    globalDBid = (
      await DB.general.one(`SELECT id FROM extern_db WHERE db = $1;`, [
        'global',
      ])
    ).id;
  }
  return globalDBid;
};

// DISPLAY VARIABLES
exports.map = map;
exports.lazyload = lazyload;
exports.page_content_limit =
  browse_display === 'columns'
    ? Math.floor(page_content_limit / 3) * 3
    : page_content_limit;
exports.followup_count = followup_count;
exports.browse_display = browse_display;
exports.view_display = view_display;
exports.welcome_module = welcome_module;

exports.fixed_uuid = fixed_uuid;

// ADD LIST OF DOMAIN NAMES OF ALL IMAGES, JS SCRIPT AND STYLESHEETS REQUIRED BY THE BROWSER TO RENDER CORRECTLY
exports.csp_links = [
  "'self'",
  "'unsafe-inline'",
  "'unsafe-eval'",
  'https://translate.google.com',
  'https://translate.googleapis.com',
  'https://translate-pa.googleapis.com',
  'https://unpkg.com',
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
  'https://www.google.com',
  'https://maxcdn.bootstrapcdn.com',
  'https://www.gstatic.com',
  'https://acclabplatforms.blob.core.windows.net',
  'https://a.tile.openstreetmap.org',
  'https://c.tile.openstreetmap.org',
  'https://b.tile.openstreetmap.org',
];
