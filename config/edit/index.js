//// EDIT THIS
// GENERAL APP INFO
exports.app_title = 'UNDP AccLabs Pads' 
exports.app_title_short = 'pads'
exports.app_suite = 'acclab_platform'
exports.app_languages = ['en', 'fr', 'es', 'pt']
exports.app_description = {
	'en': 'This is a description of the app.',
	// 'en': '<br/><br/>Intriguing solutions are those that, when observed, make you wonder ‘why did they do that?’. You see something happening, but you don’t immediately understand the need behind it. These are solutions that get a mapper to investigate further and dig deeper to understand why.',
	'fr': 'Ceci est une description de l’appli.',
	'es': 'This is a description of the app.',
	'pt': 'This is a description of the app.',
}


// DESIRED MODULES
exports.modules = [
	{ type: 'pads', rights: { read: 0, write: 1 } }, 
	{ type: 'pinboards', rights: { read: 0, write: 1 } },
	{ type: 'templates', rights: { read: 2, write: 2 } },
	// { type: 'files', rights: { read: 0, write: 1 } }, 
	// { type: 'reviews', rights: { read: 1, write: 1, coordinate: 3 }, reviewers: 2 }, // TO DO: UPDATE THIS TO 2
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
	{ type: 'index', name: 'SDGs', required: true, opencode: false, limit: 5 }, 
	{ type: 'tag', name: 'thematic areas', required: true, opencode: true, limit: 5 }, 
	{ type: 'tag', name: 'methods', required: true, opencode: false },
	{ type: 'tag', name: 'datasources', required: true, opencode: true },
	
	// { type: 'location', name: 'locations', required: true },
	// { type: 'attachment', name: 'consent', required: true, uris: [ { uri: 'https://acclabs-consent-archive.azurewebsites.net/api/join/file' }, { uri: undefined } ] }, // THIS IS FOR CONSENT FORMS. A DOCUMENT CAN COME FROM THE CONTEXT, OR BE AN EMBEDED LINK
	// { type: 'attachment', name: 'consent', required: true, uris: [ { uri: 'http://localhost:3000/api/join/file' }, { uri: undefined } ], limit: 1 } // THIS IS FOR CONSENT FORMS. A DOCUMENT CAN COME FROM THE CONTEXT, OR BE AN EMBEDED LINK
	
	// { type: 'txt', name: 'mapper name', required: true } // THIS IS A SIMPLE TEST OF ANOTHER TYPE OF MEDIA (txt)
	

	{ type: 'radiolist', name: 'experiment status', instruction: 'Current status of experimental activity',
	options: [
		{ name: 'Idea stage' },
		{ name: 'Design stage' },
		{ name: 'Under review' },
		{ name: 'Implementation stage' },
		{ name: 'Completed' }
	] },
	{ type: 'checklist', name: 'experiment type', instruction: 'Please categorize the type that best identifies this experimental activity:',
	options: [
		{ name: 'Pre experimental (trial and error, prototype, a/b testing)' },
		{ name: 'Quasi experimental (Analytical, observations, etc)' },
		{ name: 'Fully randomised (RCTs, etc.)' }
	] },
	{ type: 'checklist', name: 'partnering sector', instruction: 'Which sector are you partnering with for this activity? Please select all that apply',
	options: [
		{ name: 'United Nations agency' },
		{ name: 'Public Sector' },
		{ name: 'Private Sector' },
		{ name: 'Civil Society/ NGOs' },
		{ name: 'Academia' }
	]},
	{ type: 'checklist', name: 'control group', instruction: 'Does the activity use a control group for comparison?',
	options: [
		{ name: 'Yes, a different group entirely' },
		{ name: 'Yes, the same group but before the intervention' },
		{ name: 'No, it does not use a control group' },
		{ name: "Don't know" }
	]},
	{ type: 'checklist', name: 'assignment type', instruction: 'How is the intervention assigned to different groups in your experiment?',
		options: [
		{ name: 'Random assignment' },
		{ name: 'non-random assignment' },
		{ name: 'other' }
	] },
	{ type: 'checklist', name: 'sample size', instruction: 'What is the estimated sample size?',
	options: [
		{ name: '1' },
		{ name: '2-9' },
		{ name: '10-49' },
		{ name: '50-99' },
		{ name: '100-999' },
		{ name: 'More than 1,000' }
	] },
	{ type: 'radiolist', name: 'total cost', instruction: 'What is the total estimated monetary resources needed for this experiment?',
	options: [
		{ name: 'Less than 1,000 USD' },
		{ name: 'Between 1,000 and 9,999 USD' },
		{ name: 'Between 10,000- and 20,000 USD' },
		{ name: 'More than 20,000 USD' }
	] },
	{ type: 'checklist', name: 'quality check', instruction: 'Quality Check',
	options: [
		{ name: 'This activity is relevant to a CPD outcome' },
		{ name: 'The hypothesis is clearly stated' },
		{ name: 'This activity offers strong collaboration oportunities' },
		{ name: 'This activity offers a high potential for scaling' },
		{ name: 'This activity has a low risk' }
	] }
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
