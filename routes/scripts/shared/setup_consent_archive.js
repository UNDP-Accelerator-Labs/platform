const { DB } = require('../../../config')

DB.general.none(`
	INSERT INTO extern_db (db, url_prefix)
	VALUES ('consent', 'https://consent.sdg-innovation-commons.org/')
;`).then(_ => {
	console.log('done')
}).catch(err => console.log(err))
