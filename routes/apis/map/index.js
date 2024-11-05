const { DB } = include('config/');
const project = require('./geo.js');
const render = require('./render.js');
const { topology } = require('topojson-server');
const { feature } = require('topojson-client');
const { presimplify } = require('topojson-simplify');

module.exports = async (req, res) => {
	const kwargs = Object.keys(req.query)?.length ? req.query : Object.keys(req.body)?.length ? req.body : {};
	let { projsize } = kwargs;
	if (!projsize) projsize = 1200;
	else projsize = +projsize;
	kwargs.projsize = projsize; // THIS IS IMPORTANT FOR PASSING THE kwargs TO THE render FUNCTION

	const queryString = Object.keys(kwargs).sort((a, b) => a.localeCompare(b))
	.map(k => {
		// HERE WE CREATE A DISTINCT NAME FOR THE IMAGE FILE THAT WE WILL GENERATE
		// USING ALL THE query PARAMETERS
		const v = kwargs[k];
		if (Array.isArray(v)) {
			const sVs = v.map(sv => {
				if (typeof sv === 'object') {
					return Object.keys(sv).sort((a, b) => a.localeCompare(b))
					.map(sk => {
						return `${sk}_${sv[sk].toString().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,'').replace(/\s+/, '')}`;
					}).join('_');
				} else return sv.toString().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,'').replace(/\s+/, '');
			}).join('_');
			return `${k}_${sVs}`;
		} else if (typeof v === 'object') {
			const sVs = Object.keys(v).sort((a, b) => a.localeCompare(b))
			.map(sk => {
				return `${sk}_${v[sk].toString().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,'').replace(/\s+/, '')}`;
			}).join('_');
			return `${k}_${sVs}`;
		} else return `${k}_${v.toString().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,'').replace(/\s+/, '')}`;
	}).join('_');
	console.log('check name', queryString);

	// CHECK IF THE FILE ALREADY EXISTS
	return DB.general.tx(async t => {
		const file = await t.oneOrNone(`
			SELECT filename FROM generated_maps
			WHERE query_string = $1
		;`, [ queryString ], d => d?.filename)
		.catch(err => console.log(err));

		if (file) {
			// THE FILE EXISTS SO JUST SEND THE LINK
			console.log('the file already exists');
			res.send(file);
		} else {
			// NEED TO GENERATE THE FILE
			const { data: basemap, projection } = await project({ loadbase: true, zoom: false, projsize, connection: t });
			let topo_basemap = topology({ basemap });
			topo_basemap = feature(presimplify(topo_basemap), topo_basemap.objects.basemap);

			const { status, file } = await render({ ...{ basemap: topo_basemap, projection }, ...kwargs });
			// STORE THE file REF IN THE DB
			if (status === 200) {
				await t.none(`
					INSERT INTO generated_maps (filename, query_string)
					VALUES ($1, $2)
				;`, [ file, queryString ])
				.catch(err => console.log(err));
				
				return res.send(file);
			} else res.send('an error occurred and the image file could not be generated');
		}
	}).catch(err => console.log(err));
}