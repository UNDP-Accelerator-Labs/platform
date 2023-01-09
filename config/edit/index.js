//// EDIT THIS
// GENERAL APP INFO
exports.app_title = 'UNDP AccLabs Pads' 
exports.app_title_short = 'pads'
exports.app_suite = 'acclab_platform'
exports.app_languages = ['en', 'fr', 'es', 'pt']
exports.app_description = {
	'en': 'This is a description of the app.',
	'fr': 'Ceci est une description de l’appli.',
	'es': 'This is a description of the app.',
	'pt': 'This is a description of the app.',
}


// DESIRED MODULES
	// OPTIONS: ['files', 'templates', 'mobilizations', 'analyses']
// exports.modules = ['pads', 'files', 'templates', 'mobilizations', 'analyses']
exports.modules = [
	{ type: 'pads', rights: { read: 0, write: 1 } }, 
	{ type: 'pinboards', rights: { read: 0, write: 1 } },
	{ type: 'templates', rights: { read: 2, write: 2 } },
	{ type: 'files', rights: { read: 0, write: 1 } }, 
	{ type: 'reviews', rights: { read: 1, write: 1, coordinate: 3 }, reviewers: 2 }, // TO DO: UPDATE THIS TO 2
	{ type: 'mobilizations', rights: { read: 2, write: 2 } }, 
	{ type: 'contributors', rights: { read: 2, write: 2 } }, 
	{ type: 'teams', rights: { read: 2, write: 2 } }
	
	// { type: 'analyses', rights: { read: 1, write: 2 } }
]

// NOTE: reviews IS DEPENDENT ON tags RIGHT NOW (FOR ASSIGNMENT OF REVIEWERS)

// DESIRED METADATA
// TO DO: metafields SHOULD BE ANY KIND OF MEDIA, E.G. CHECKBOX WITH VALUES, TEXT, ETC
	// OPTIONS: ['tags', 'sdgs', 'methods', 'datasources', 'locations']
exports.metafields = [
	{ type: 'index', name: 'SDGs', required: true, opencode: false }, 
	{ type: 'tag', name: 'thematic areas', required: true, opencode: true }, 
	{ type: 'tag', name: 'methods', required: true, opencode: false },
	{ type: 'tag', name: 'datasources', required: true, opencode: true },
	// { type: 'location', name: 'locations', required: true },
	// { type: 'external_resource', name: 'consent', required: true, uris: [ { uri: 'https://acclabs-consent-archive.azurewebsites.net/api/join/file' }, { uri: undefined } ] }, // THIS IS FOR CONSENT FORMS. A DOCUMENT CAN COME FROM THE CONTEXT, OR BE AN EMBEDED LINK
	// { type: 'external_resource', name: 'consent', required: true, uris: [ { uri: 'http://localhost:3000/api/join/file' }, { uri: undefined } ] } // THIS IS FOR CONSENT FORMS. A DOCUMENT CAN COME FROM THE CONTEXT, OR BE AN EMBEDED LINK
	// { type: 'txt', name: 'mapper name', required: true } // THIS IS A SIMPLE TEST OF ANOTHER TYPE OF MEDIA (txt)
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
exports.browse_display = 'columns'
exports.view_display = 'page'
