// THIS SCRIPT ONLY NEEDS TO BE RUN FOR THE SM PLATFORM
const { DB } = require('../../../config');
const path = require('path')
const https = require('https')


DB.conn.tx(t => {

	return t.any(`
		SELECT id, sections FROM pads
	;`).then(results => {
		
		results.forEach(d => {
			d.sections.forEach(c => {
				c.items.forEach(b => {
					if (b.type === 'attachment') {
						if (b.srcs?.some(a => a.includes('https://acclabs-consent-archive.azurewebsites.net/'))) {
							console.log('there was an issue with pad id: ', d.id)
							console.log(b)
							console.log('\n')
						} else {
							console.log('all good with pad id: ', d.id)
							console.log(b)
							console.log('\n')
						}

					}
				})
			})
		})

	}).catch(err => console.log(err))
}).then(results => {
	console.log('done')
}).catch(err => console.log(err))