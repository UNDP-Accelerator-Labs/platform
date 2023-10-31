const { DB } = require('../../../config')

DB.general.none(`
	INSERT INTO extern_db (db, url_prefix)
	VALUES ('consent', 'https://acclabs-consent-archive.azurewebsites.net/')
;`).then(_ => {
	console.log('done')
}).catch(err => console.log(err))