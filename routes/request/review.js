const { fork } = require('child_process')
const path = require('path')

const { modules, DB } = include('config/')
const { email: sendemail } = include('routes/helpers/')

exports.main = (req, res) => {
	const { referer } = req.headers || {}
	const { id, title, language } = req.body || {}
	const { uuid } = req.session || {}
	const tagfocus = 'thematic_areas'

	// SEND THE REVIEW ASSIGNMENT TO A CHILD PROCESS
	const c_process = fork(path.join(__dirname, 'assign-review.js'))
	c_process.send({ rootpath, id, language, uuid, sendemail })

	// THE FOLLOWING IS TECHNICALLY NOT NEEDED
	c_process.on('message', message => {
		message.forEach(d => {
			// SEND EMAIL NOTIFICATION TO USERS WHO ACCEPT EMAIL NOTIFICATIONS
			console.log('check reviewers')
			console.log(d)
			// if (d.notifications) {
			// 	return sendemail({
			// 		to: 'myjyby@gmail.com',// TO DO: CHANGE TO email, 
			// 		subject: `Request for review`,
			// 		html: `You are invited to review the submission entitled ${title}.`
			// 	})
			// }
		})
	})
	c_process.on('exit', code => {
		console.log('child process done')
		console.log(code)
		res.redirect(referer)
	})
}