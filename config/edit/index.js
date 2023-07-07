const app_id = process.env.APP_ID;

let app_obj = require('./local.js');
if (app_id === 'ap') {
	app_obj = {...app_obj, ...require('./ap.js')};
} else if (app_id === 'exp') {
	app_obj = {...app_obj, ...require('./exp.js')};
} else if (app_id === 'sm') {
	app_obj = {...app_obj, ...require('./sm.js')};
} else if (app_id !== 'local') {
	throw new Error(`APP_ID must be set to a valid value, got '${app_id}'`)
}

const {
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
} = app_obj;

exports.app_id = app_id
exports.app_title = app_title
exports.app_title_short = app_title_short
exports.app_suite = app_suite
exports.app_suite_url = app_suite_url
exports.app_suite_secret = app_suite_secret
exports.app_languages = app_languages
exports.app_description = app_description
exports.app_storage = app_storage
exports.modules = modules
exports.metafields = metafields
exports.engagementtypes = engagementtypes
exports.colors = colors
exports.map = map
exports.lazyload = lazyload
exports.page_content_limit = page_content_limit
exports.followup_count = followup_count
exports.browse_display = browse_display
exports.view_display = view_display
exports.welcome_module = welcome_module
exports.fixed_uuid = fixed_uuid
