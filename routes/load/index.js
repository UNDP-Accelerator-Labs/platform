const { app_languages, modules, metafields, ownDB, DB } = include('config/')

const pads = require('../browse/pads/')
const pad = require('../contribute/pad/')
const templates = require('../browse/templates/')
const template = require('../contribute/template/')
const resource = require('../contribute/resource/')
const files = require('../browse/files/')
const reviews = require('../browse/reviews/')
const mobilizations = require('../browse/mobilizations/')
const contributors = require('../browse/contributors/')

module.exports = async (req, res) => {
	const { object, instance } = req.params || {}
	const { uuid } = req.session || {}
	let { feature } = req.body || {}

	if (modules.some(d => [object, `${object}s`].includes(d.type))) {
		let data 
		
		if (object === 'pads') {
			if (feature === 'ids') { data = await pads.load.ids({ req }) }
			else if (feature === 'locations') { data = await pads.load.locations({ req }) }
			else if (feature === 'samples') { data = await pads.load.samples({ req }) }
			else { data = await pads.load.data({ req }); }
		} else if (object === 'pad') {
			if (feature === 'status') { data = await pad.load.status({ req }) }
			else { data = await pad.load.data({ req }) }
		}

		else if (object === 'templates') data = await templates.load.data({ req })
		else if (object === 'template') data = await template.load.data({ req })
		
		else if (object === 'files') data = await files.load.data({ req })
		else if (object === 'reviews') data = await reviews.load.data({ req })
		else if (object === 'mobilizations') data = await mobilizations.load.data({ req })
		else if (object === 'contributors') data = await contributors.load.data({ req })
		
		res.status(200).json(data)
	// } else if (object === 'rights') {
	// 	data = await DB.general.one(`SELECT rights FROM users WHERE uuid = $1;`, [ uuid ])
	// 	res.status(200).json(data)
	} else if (object === 'resource') {
		data = await resource.load.data({ req })
		res.status(200).json(data)
	} else if (object === 'metadata') {
		if (!Array.isArray(feature)) feature = [feature]
		data = {}
		for (let i = 0; i < feature.length; i++) {
			const f = feature[i]
			if (f === 'metafields') data['metafields'] = metafields
			else if (f === 'modules') data['modules'] = modules
			else if (f === 'ownDB') data['ownDB'] = await ownDB()
			else if (f === 'languages') data['languages'] = app_languages
		}
		res.status(200).json(data)
	} else res.redirect('/module-error')
}