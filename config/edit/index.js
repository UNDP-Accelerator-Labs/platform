//// EDIT THIS
// GENERAL APP INFO
exports.app_title = 'UNDP Accelerator Labs, Experiments' 
exports.app_title_short = 'exp_platform'
exports.app_suite = 'acclab_platform'
exports.app_languages = ['en', 'fr', 'es', 'pt']
exports.app_description = {
	'en': '',
	'fr': '',
	'es': '',
	'pt': '',
}


// DESIRED MODULES
exports.modules = [
	{ type: 'pads', rights: { read: 0, write: 1 } }, 
	{ type: 'pinboards', rights: { read: 0, write: 1 } },
	{ type: 'templates', rights: { read: 2, write: 3 } },
	// { type: 'files', rights: { read: 0, write: 1 } }, 
	// { type: 'reviews', rights: { read: 1, write: 1, coordinate: 3 }, reviewers: 2 },
	// { type: 'mobilizations', rights: { read: 2, write: 2 } }, 
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
	
	// { type: 'location', name: 'locations', required: true },

	// { type: 'radiolist', name: 'experiment status', instruction: 'Current status of experimental activity',
	// options: [
	// 	{ name: 'Idea stage' },
	// 	{ name: 'Design stage' },
	// 	{ name: 'Under review' },
	// 	{ name: 'Implementation stage' },
	// 	{ name: 'Completed' }
	// ] }
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
