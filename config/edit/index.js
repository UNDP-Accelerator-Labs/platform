//// EDIT THIS
// GENERAL APP INFO
exports.app_title = 'UNDP Accelerator Labs, Experiments' 
exports.app_title_short = 'exp_platform'
exports.app_suite = 'acclab_platform'
exports.app_suite_secret = process.env.APP_SUITE_SECRET || 'secret'
exports.app_languages = ['en', 'fr', 'es', 'pt']
exports.app_description = require('./translations.js').translations['app description']


// DESIRED MODULES
exports.modules = [
	{ type: 'pads', rights: { read: 0, write: 1 } }, 
	{ type: 'pinboards', rights: { read: 0, write: 1 } },
	{ type: 'templates', rights: { read: 2, write: 3 } },
	// { type: 'files', rights: { read: 0, write: 1 } }, 
	{ type: 'reviews', rights: { read: 1, write: 1, coordinate: 3 }, reviewers: 2 },
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

	{ type: 'radiolist', name: 'experiment status', required: true,
	instruction: 'Current status of experimental activity',
	options: [
		{ name: 'Idea stage' },
		{ name: 'Design stage' },
		{ name: 'Under review' },
		{ name: 'Implementation stage' },
		{ name: 'Completed' }
	] },
	{ type: 'checklist', name: 'experiment type', required: true,
	instruction: 'Please categorize the type that best identifies this experimental activity:',
	options: [
		{ name: 'Pre experimental (trial and error, prototype, a/b testing)' },
		{ name: 'Quasi experimental (Analytical, observations, etc)' },
		{ name: 'Fully randomised (RCTs, etc.)' }
	] },
	{ type: 'checklist', name: 'partnering sector', required: true,
	instruction: 'Which sector are you partnering with for this activity? Please select all that apply',
	options: [
		{ name: 'United Nations agency' },
		{ name: 'Public Sector' },
		{ name: 'Private Sector' },
		{ name: 'Civil Society/ NGOs' },
		{ name: 'Academia' }
	]},
	{ type: 'checklist', name: 'control group', required: true,
	instruction: 'Does the activity use a control group for comparison?',
	options: [
		{ name: 'Yes, a different group entirely' },
		{ name: 'Yes, the same group but before the intervention' },
		{ name: 'No, it does not use a control group' },
		{ name: "Don't know" }
	]},
	{ type: 'checklist', name: 'assignment type', required: true,
	instruction: 'How is the intervention assigned to different groups in your experiment?',
		options: [
		{ name: 'Random assignment' },
		{ name: 'non-random assignment' },
		{ name: 'other' }
	] },
	{ type: 'checklist', name: 'sample size', required: true,
	instruction: 'What is the estimated sample size?',
	options: [
		{ name: '1' },
		{ name: '2-9' },
		{ name: '10-49' },
		{ name: '50-99' },
		{ name: '100-999' },
		{ name: 'More than 1,000' }
	] },
	{ type: 'radiolist', name: 'total cost', required: true,
	instruction: 'What is the total estimated monetary resources needed for this experiment?',
	options: [
		{ name: 'Less than 1,000 USD' },
		{ name: 'Between 1,000 and 9,999 USD' },
		{ name: 'Between 10,000- and 20,000 USD' },
		{ name: 'More than 20,000 USD' }
	] },
	{ type: 'checklist', name: 'quality check', required: true,
	instruction: 'Quality Check',
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
	'light-grey': '#969696'
}

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
