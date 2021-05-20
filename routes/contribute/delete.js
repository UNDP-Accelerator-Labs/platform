const pad = require('./pad/')
const template = require('./template/')
// const mobilizations = require('./mobilizations/') // TO DO

exports.main = (req, res) => {
	const { object } = req.params || {}
	if (object === 'pads') pad.delete(req, res)
	if (object === 'templates') template.delete(req, res)
	// TO DO: MOBILIZATIONS
}