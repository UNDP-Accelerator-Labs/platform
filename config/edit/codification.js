// // EDIT THIS
// GENERAL APP INFO
exports.app_title = 'R&D Practice';
exports.app_title_short = 'practice';
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
exports.own_app_url = 'https://practice.sdg-innovation-commons.org/';

// DESIRED MODULES
exports.modules = [
  { type: 'pads', rights: { read: 0, write: { blank: 3, templated: 1 } } }, // respond IS FOR TEMPLATED PADS
  { type: 'pinboards', rights: { read: 0, write: 1 } },
  { type: 'templates', rights: { read: 2, write: 3 } },
  { type: 'files', rights: { read: 0, write: 1 } },
  { type: 'mobilizations', rights: { read: 2, write: 3 } },
];

exports.metafields = [
  {
    type: 'tag',
    name: 'thematic areas',
    required: false,
    opencode: true,
    limit: 5,
  },
  { type: 'tag', name: 'methods', required: false, opencode: true },
  // { type: 'tag', name: 'datasources', required: true, opencode: true },
  {
    type: 'checklist',
    name: 'rnd stage',
    required: true,
    instruction: 'Assocaited R&D activity',
    options: [
      { name: 'Sense' },
      { name: 'Explore' },
      { name: 'Develop' },
      { name: 'Test' },
      { name: 'Diffuse' },
      { name: 'Catalyze' },
    ],
  },
  {
    type: 'checklist',
    name: 'rnd function',
    required: true,
    instruction: 'Assocaited R&D function',
    options: [
      { name: 'Exploration' },
      { name: 'Solutions mapping' },
      { name: 'Experimentation' },
    ],
  },
  {
    type: 'radiolist',
    name: 'tool type',
    required: false,
    instruction: 'Primary tool type',
    options: [
      { name: 'Framework, Model' },
      { name: 'Guide, Manual' },
      { name: 'Platform, Portal' },
      { name: 'Playbook, Toolkit' },
      { name: 'Worksheet, Canvas' },
      { name: 'Process' },
    ],
  },
  {
    type: 'radiolist',
    name: 'tool license',
    required: false,
    instruction: 'Tool license',
    options: [
      { name: 'Free or open' },
      { name: 'Freemium' },
      { name: 'Paid' },
    ],
  },
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
exports.welcome_module = 'carousel';
