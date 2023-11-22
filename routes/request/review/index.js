const { fork } = require('child_process')
const path = require('path')

const { app_title, app_title_short, translations, own_app_url } = include('config/')
const { email: sendemail } = include('routes/helpers/')

module.exports = (req, res) => {
	const { referer } = req.headers || {}
	let { id, title, language, reviewers } = req.body || {}
	if (!Array.isArray(reviewers)) reviewers = [reviewers]
	const { uuid } = req.session || {}
	const tagfocus = 'thematic_areas' // TO DO: EDIT THIS

	// SEND THE REVIEW ASSIGNMENT TO A CHILD PROCESS
	const c_process = fork(path.join(__dirname, 'assign-review.js'))
	c_process.send({ rootpath, id, language, reviewers, tagfocus, uuid })
	const platformName = translations['app title']?.[app_title_short]?.['en'] ?? app_title;

	// THE FOLLOWING IS TECHNICALLY NOT NEEDED
	c_process.on('message', message => {
		console.log('passing info from child process')
		message.forEach(async d => {
			// SEND EMAIL NOTIFICATION TO USERS WHO ACCEPT EMAIL NOTIFICATIONS
			if (d.notifications) {
				return await sendemail({
					to: d.email,
					subject: `[${platformName}] Request for review`,
					html: `You are invited to review the submission entitled "${title}" on the <a href="${own_app_url}">${platformName}</a>. Please navigate <a href="${own_app_url}en/browse/reviews/pending">here</a> to accept or decline the review.`
				})
			}
		})
	})
	c_process.on('exit', code => {
		console.log('child process done')
		console.log(code)
		if (referer) res.redirect(referer)
		else res.redirect('/login')
	})
}
