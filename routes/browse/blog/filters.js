const { countryGroup, articleGroup, extractGeoQuery } = require('./query')
const { DB } = include('config/')

exports.main = async kwargs => {
	const conn = kwargs.connection ? kwargs.connection : DB.conn;
    const { req, res, page } = kwargs || {};
    let { source, search, country, type } = req.query || {}

	return conn.task(t => {
        const batch = []

        batch.push(t.any(countryGroup(search?.trim()))
        .then(async (results) => {
            const countries = await results?.map(row => row?.country);
// console.log('results ', results)
            const geoData = await DB.general.any(extractGeoQuery(results), countries).then(results => results);
            // console.log('geoData ', geoData[0]['properties'])
            results.geoData = geoData?.map(p => p?.json );
            
            return results
        })
        .catch(err => console.log(err)))

        batch.push(t.any(articleGroup(search)).then(async (results) => results)
        .catch(err => console.log(err)))

        return t.batch(batch)
		.catch(err => console.log(err))
        
	}).then(d => ({
        countries: d?.[0],
        articleType : d?.[1],
        geoData: d?.[0]?.['geoData']
    }))
	.catch(err => console.log(err))
}