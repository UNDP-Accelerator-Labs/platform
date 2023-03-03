//// EDIT THIS
// GENERAL APP INFO
exports.app_title = 'UNDP AccLabs Pads, Generic pads' 
exports.app_title_short = 'pads'
exports.app_suite = 'acclab_platform'
exports.app_suite_secret = process.env.APP_SUITE_SECRET || 'secret'
exports.app_languages = ['en', 'fr', 'es', 'pt']
exports.app_description = require('./translations.js').translations['app description']

// apps_in_suite NEED TO BE THE NAMES OF THE DIFFERENT DBs
exports.apps_in_suite = ['sm_test_02', 'ap_test_02', 'exp_test_02']

// DESIRED MODULES
exports.modules = [
	{ type: 'pads', rights: { read: 0, write: 1 } }, 
	{ type: 'pinboards', rights: { read: 0, write: 1 } },
	// { type: 'templates', rights: { read: 2, write: 2 } },
	// { type: 'files', rights: { read: 0, write: 1 } }, 
	{ type: 'contributors', rights: { read: 2, write: 2 } }, 
	{ type: 'teams', rights: { read: 2, write: 2 } }
	
	// { type: 'analyses', rights: { read: 1, write: 2 } }
]

// NOTE: reviews IS DEPENDENT ON tags RIGHT NOW (FOR ASSIGNMENT OF REVIEWERS)

// DESIRED METADATA
// TO DO: metafields SHOULD BE ANY KIND OF MEDIA, E.G. CHECKBOX WITH VALUES, TEXT, ETC
	// OPTIONS: ['tags', 'sdgs', 'methods', 'datasources', 'locations']
exports.metafields = [
	{ type: 'index', name: 'SDGs', required: true, opencode: false, limit: 5 }, 
	{ type: 'tag', name: 'thematic areas', required: true, opencode: true, limit: 5 }, 
	{ type: 'tag', name: 'methods', required: true, opencode: false },
	{ type: 'tag', name: 'datasources', required: true, opencode: true }, 
	{ type: 'location', name: 'locations', required: true }
]
// DESIRED ENGAGEMENT TYPES
	// OPTIONS: ['like', 'dislike', 'comment']
exports.engagementtypes = ['like', 'dislike', 'comment']

// DISPLAY VARIABLES
exports.map = true
exports.lazyload = false
exports.page_content_limit = 25
exports.followup_count = 1
	// OPTIONS: 'columns', 'rows'
exports.browse_display = 'rows'
exports.view_display = 'page'
	// OPTIONS: 'mosaic', 'carousel'
exports.welcome_module = 'carousel'
