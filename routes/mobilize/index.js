const { modules } = include('config/')
// const { checklanguage } = include('routes/helpers/')

const cohort = require('./cohort/')
// const contributor = require('./contributor/')

// TO DO: PUT THIS IN contribute/

module.exports = (req, res) => {
	const { referer } = req.headers || {}
	const { rights } = req.session || {}
	const { object } = req.params || {}
	// const language = checklanguage(req.params?.language || req.session.language)

	if (modules.some(d => [`${object}s`, 'mobilizations'].includes(d.type))) {
		if (object === 'cohort' && rights >= modules.find(d => d.type === 'mobilizations').rights.write) return cohort(req, res)
		// else if (object === 'contributor' && rights >= modules.find(d => d.type === 'contributors').rights.write) contributor(req, res)
		// else res.redirect(`/${language}/browse/${object}s/public`)
		
		else {
			if (referer) res.redirect(referer)
			else res.redirect('/login')
		}
	} else res.redirect('/module-error')
}