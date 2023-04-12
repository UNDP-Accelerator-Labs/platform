const { app_languages } = include('config/')

module.exports = function (lang = 'en') {
	return app_languages.includes(lang) ? lang : 'en'
}