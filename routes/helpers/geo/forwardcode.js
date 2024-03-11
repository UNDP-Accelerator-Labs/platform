// THIS IS TO GO FROM A PLACE NAME TO LAT, LNG
// SEE: https://opencagedata.com/api#quickstart
const fetch = require('node-fetch')

exports.code = (locations, centerpoint, list = false) => {
	console.log('pay attention to forward geocode')
	return locations.map(l => {
		return new Promise((resolve, reject) => {
			if (!l || typeof l !== 'string') {
				const obj = {}
				obj.input = l
				obj.found = false
				obj.centerpoint = centerpoint
				obj.caption = `No location was found for <strong>${l}</strong>.` // TO DO: TRANSLATE
				resolve(obj)
			} else {
				const l_formatted = l.removeAccents().replacePunctuation(', ').trim()
				setTimeout(() => {
					fetch(`https://nlpapi.sdg-innovation-commons.org/api/geoforward?q=${l_formatted}&token=${process.env.API_TOKEN}`)
					.then(response => response.json())
					.then(data => {
						const obj = {}
						obj.input = l
						if (data.results.length) {
							if (!list) {
								const location = data.results[0] // NOTE CONFIDENCE IS SOMETHING ELSE: https://opencagedata.com/api#ranking
								obj.centerpoint = { lat: +location.geometry.lat, lng: +location.geometry.lng }
							} else {
								obj.locations = data.results
							}
							obj.found = true
							obj.caption = `<strong>${l.trim().capitalize()}</strong> found using <a href='https://opencagedata.com/credits' target='_blank'>OpenCage Geocoder</a> | &copy; <a href='https://www.openstreetmap.org/copyright' target='_blank'>OpenStreetMap contributors</a>` // TO DO: TRANSLATE
						} else {
							obj.found = false
							obj.centerpoint = centerpoint
							obj.caption = `No location was found for <strong>${l.trim().capitalize()}</strong>.` // TO DO: TRANSLATE
						}
						resolve(obj)
					}).catch(err => {
						console.log(err)
						reject(err)
					})
				}, 1000)
			}
		})
	})
}
exports.render = (req, res) => {
	const { locations, list } = req.body || {}
	const { country } = req.session || {}

	const promises = this.code(locations, country.lnglat, list)
	Promise.all(promises)
	.then(data => res.json(data))
	.catch(err => {
		console.log(err)
		res.json({ status: 500, message: 'Oops! Something went wrong while searching for locations.' })
	})
}
