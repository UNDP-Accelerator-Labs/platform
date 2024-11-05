const { DB } = include('config/');
const { checklanguage, join, geo } = include('routes/helpers/');

const filter = include('routes/browse/pads/filter');

module.exports = async (req, res) => {
	let { countries, regions, has_lab, use_pads } = Object.keys(req.query)?.length ? req.query : Object.keys(req.body)?.length ? req.body : {};
	if (typeof has_lab === 'string') has_lab = JSON.parse(has_lab);
	const language = checklanguage(req.params?.language || req.query.language || req.body.language || req.session.language);

	if (countries && !Array.isArray(countries)) countries = [countries];

	let filters = [];
	if (regions) filters.push(DB.pgp.as.format('c.bureau IN ($1:csv)', [ regions ]));
	if (has_lab) filters.push(DB.pgp.as.format('c.has_lab = TRUE'));
	
	if (filters.length) filters = filters.join(' AND ');
	else filters = 'TRUE';

	// GET FILTERS
	let full_filters = '';
	let pad_locations;
	if (use_pads) {
		const filters = await filter(req, res);
		full_filters = filters[filters.length - 1];
		pad_locations = await DB.conn.any(`
			SELECT DISTINCT(iso3), COUNT(DISTINCT(pad))::INT 
			FROM locations
			WHERE pad IN (
				SELECT p.id FROM pads p
				WHERE true
					$1:raw
			) GROUP BY iso3
		;`, [ full_filters ]);
		const locations = pad_locations.map(d => d.iso3);
		if (locations.length) {
			if (countries) countries = [ ...countries, ...locations ]; // THIS ACTUALLY DOES NOT DO ANYTHING SINCE THE PADS WILL BE FILTERED BY THE REQUESTED COUNTRIES ANYWAY
			else countries = locations;
		}
	}

	DB.general.tx(async t => {
		const name_column = await geo.adm0.name_column({ connection: t, language })

		const batch = []
		batch.push(t.any(`
			SELECT adm0_a3 AS iso3, su_a3 AS sub_iso3, $1:name AS country,
				jsonb_build_object('lat', ST_Y(ST_Centroid(wkb_geometry)), 'lng', ST_X(ST_Centroid(wkb_geometry))) AS location

			FROM adm0_subunits 
			WHERE TRUE
				$2:raw
				AND su_a3 <> adm0_a3
		;`, [ name_column, countries ? DB.pgp.as.format('AND su_a3 IN ($1:csv)', [ countries ]) : '' ])
		.catch(err => console.log(err)))

		batch.push(t.any(`
			SELECT adm0_a3 AS iso3, $1:name AS country,
				jsonb_build_object('lat', ST_Y(ST_Centroid(wkb_geometry)), 'lng', ST_X(ST_Centroid(wkb_geometry))) AS location

			FROM adm0
			WHERE TRUE
				$2:raw
		;`, [ name_column, countries ? DB.pgp.as.format('AND adm0_a3 IN ($1:csv)', [ countries ]) : '' ])
		.catch(err => console.log(err)))

		return t.batch(batch)
		.then(results => {
			const [ su_a3, adm_a3 ] = results
			const locations = join.concatunique.call(su_a3, [ adm_a3, 'country', 'latter' ])

			if (locations.length) {
				return t.any(`
					SELECT c.iso3, c.has_lab, 
						b.name AS undp_region_name, b.abbv AS undp_region 

					FROM countries c
					INNER JOIN bureaux b 
						ON b.abbv = c.bureau
					WHERE TRUE
						AND $1:raw
				;`, [ filters ])
				.then(async results => {
					return join.multijoin.call(locations, [ results, 'iso3' ])
				}).catch(err => console.log(err))
			} else return null
		}).catch(err => console.log(err))
	}).then(results => {
		results.sort((a, b) => a.country.localeCompare(b.country))
		
		if (use_pads && pad_locations?.length) {
			results.forEach(d => {
				d.count = pad_locations.find(c => c.iso3 === d.iso3 || c.iso3 === d.sub_iso3)?.count ?? 0;
			})
		}

		if (results.length) res.json(results)
		else res.status(400).json({ message: 'Sorry you do not have the rights to download this content. Please enquire about getting an access token to view download this content.' })
	}).catch(err => console.log(err))
}