// // EDIT THIS
// GENERAL APP INFO
exports.app_title = 'RBLAC Signals Scanning';
exports.app_title_short = 'signals';
exports.app_suite = 'acclab_platform';
exports.app_suite_secret = process.env.APP_SUITE_SECRET || 'secret';
exports.app_languages = ['en', 'fr', 'es', 'pt'];
exports.app_description =
  require('./translations.js').translations['app description']?.[
    this.app_title_short
  ];
exports.app_home =
  require('./translations.js').translations['app home']?.[
    this.app_title_short
  ];

exports.app_storage = 'https://acclabplatforms.blob.core.windows.net/';
exports.own_app_url = 'https://signal-scanning.azurewebsites.net/';

// DESIRED MODULES
exports.modules = [
  { type: 'pads', rights: { read: 0, write: { blank: 2, templated: 0 } } }, // templated: 0 IS FOR PUBLIC MOBILIZATIONS
  { type: 'pinboards', rights: { read: 0, write: 1 } },
  { type: 'templates', rights: { read: 2, write: 2 } },
  // { type: 'files', rights: { read: 0, write: 1 } },
  { type: 'mobilizations', rights: { read: 2, write: 2 } },
  { type: 'contributors', rights: { read: 2, write: 2 } },
  { type: 'teams', rights: { read: 2, write: 2 } },

  // { type: 'analyses', rights: { read: 1, write: 2 } }
];

// NOTE: reviews IS DEPENDENT ON tags RIGHT NOW (FOR ASSIGNMENT OF REVIEWERS)

// DESIRED METADATA
// TO DO: metafields SHOULD BE ANY KIND OF MEDIA, E.G. CHECKBOX WITH VALUES, TEXT, ETC
// OPTIONS: ['tags', 'sdgs', 'methods', 'datasources', 'locations']

exports.metafields = [
  {
    type: 'tag',
    name: 'thematic areas',
    required: true,
    opencode: true,
    limit: 10,
  },
  { type: 'location', name: 'locations', required: true },
  {
    type: 'radiolist',
    name: 'approach',
    required: false,
    instruction: 'Approach',
    options: [
      { name: 'Cultural' },
      { name: 'Economic' },
      { name: 'Political & institutional' },
      // { name: 'Social' },
      // { name: 'Socio-technical' },
    ],
  },
  {
    type: 'radiolist',
    name: 'topics',
    required: false,
    instruction: 'Topics',
    options: [
      { name: 'Cultural fusion' },
      { name: 'Xenophobia' },
      { name: 'Get into debt to migrate' },
      { name: 'International investment & Remittances' },
      { name: 'Migrants and host communities relationships' },
      { name: 'Opportunities' },
      { name: 'Return migration' },
      { name: 'Border Issues' },
      { name: 'Internal displacement (climate change, violence, poverty)' },
      { name: 'Irregular migration' },
      { name: 'Migration status' },
      { name: 'Transit migration' },
      { name: 'Migration and specific population groups' },
      { name: 'Resilience' },
      { name: 'Digital nomads' },
    ],
  },
  {
    type: 'radiolist',
    name: 'cause or effect',
    required: false,
    instruction: 'Cause or effect',
    options: [
      { name: 'Cause' },
      { name: 'Effect' },
    ],
  },
  {
    type: 'radiolist',
    name: 'sentiment',
    required: false,
    instruction: 'Sentiment',
    options: [
      { name: 'Positive' },
      { name: 'Negative' },
    ],
  },
  {
    type: 'radiolist',
    name: 'temporality',
    required: false,
    instruction: 'Temporality',
    options: [
      { name: '0' },
      { name: 'Saw it once' },
      { name: '1 week' },
      { name: '2-3 weeks' },
      { name: 'A month' },
      { name: 'More than a month' },
    ],
  },

  // { type: 'attachment', name: 'consent', required: true, uris: [ { uri: 'http://localhost:3000/api/join/file' }, { uri: undefined } ], limit: 1 } // THIS IS FOR CONSENT FORMS. A DOCUMENT CAN COME FROM THE CONTEXT, OR BE AN EMBEDED LINK
];
// DESIRED ENGAGEMENT TYPES
// OPTIONS: ['like', 'dislike', 'comment']
exports.engagementtypes = ['like', 'dislike', 'comment'];

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
};

// DISPLAY VARIABLES
exports.map = true;
exports.lazyload = false;
exports.page_content_limit = 25;
exports.followup_count = 1;
// OPTIONS: 'columns', 'rows'
exports.browse_display = 'columns';
exports.view_display = 'page';
// OPTIONS: 'mosaic', 'carousel'
exports.welcome_module = 'mosaic';