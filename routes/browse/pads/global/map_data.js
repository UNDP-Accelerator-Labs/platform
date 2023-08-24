const { DB, metafields, map } = include('config/')
const filter = require('../filter')

module.exports = async kwargs => {
	const conn = kwargs.connection ? kwargs.connection : DB.conn
	const { req, res } = kwargs || {}
	const [ f_space, order, page, full_filters ] = await filter(req, res)

	return conn.task(t => {
		const batch1 = []
            // GET LOCATIONS, ACCORDING TO FILTERS
            if (metafields.some(d => d.type === 'location') && map) {
                // TO DO: DEFAULT HERE IS DBSCAN, MAKE THIS DEPENDENT ON req.query
                // WE NEED CLUSTERS
                // [1000, 100] ARE THE DISTANCES (IN KM) FOR THE DBSCAN CLUSTERING
                [1000, 100].forEach(d => {
                    batch1.push(t.any(`
                        SELECT
                        jsonb_build_object(
                            'type', 'Feature',
                            'geometry', ST_AsGeoJson(ST_Centroid(ST_Collect(clusters.geo)))::jsonb,
                            'properties', json_build_object('pads', json_agg(DISTINCT (clusters.pad)), 'count', COUNT(clusters.pad), 'cid', clusters.cid)::jsonb
                        ) AS json
                        FROM (
                            SELECT points.pad, ST_ClusterDBSCAN(points.projected_geom, eps := $1, minpoints := 2) over () AS cid, points.geo
                            FROM (
                                SELECT ST_Transform(ST_SetSRID(ST_Point(l.lng, l.lat), 4326), 3857) AS projected_geom, ST_Point(l.lng, l.lat) AS geo, l.pad
                                FROM locations l
                                INNER JOIN pads p
                                    ON l.pad = p.id
                                WHERE TRUE
                                    $2:raw
                            ) AS points
                        ) clusters
                        GROUP BY (clusters.cid)
                        ORDER BY clusters.cid
                    ;`, [ d * 1000, full_filters ])
                    .then(results => results.map(d => d.json))
                    .catch(err => console.log(err)))
                })
                // NEED EXTRA LEVEL WITH SINGLE (NOT CLUSTERED) POINTS
                batch1.push(t.any(`
                    SELECT
                    jsonb_build_object(
                        'type', 'Feature',
                        'geometry', ST_AsGeoJson(points.geo)::jsonb,
                        'properties', json_build_object('pads', json_agg(DISTINCT (points.pad)), 'count', COUNT(points.pad), 'cid', NULL)::jsonb
                    ) AS json
                    FROM (
                        SELECT ST_Point(l.lng, l.lat) AS geo, l.pad
                        FROM locations l
                        INNER JOIN pads p
                            ON l.pad = p.id
                        WHERE TRUE
                            $1:raw
                    ) AS points
                    GROUP BY (points.geo)
                ;`, [ full_filters ])
                .then(results => results.map(d => d.json))
                .catch(err => console.log(err)))
            } else if (map) {
                // USERS CANNOT INPUT LOCATIONS, BUT THERE IS A MAP SO WE POPULATE IT WITH USER LOCATION INFO
                batch1.push(t.any(`
                    SELECT p.id AS pad, p.owner FROM pads p
                    WHERE p.id NOT IN (SELECT review FROM reviews)
                        $1:raw
                ;`, [ full_filters ])
                .then(results => {
                    if (results.length) {
                        const columns = Object.keys(results[0])
                        const values = DB.pgp.helpers.values(results, columns)
                        const set_table = DB.pgp.as.format(`SELECT $1:name FROM (VALUES $2:raw) AS t($1:name)`, [ columns, values ])

                        return DB.general.any(`
                            SELECT
                            jsonb_build_object(
                                'type', 'Feature',
                                'geometry', ST_AsGeoJson(ST_Centroid(ST_Collect(clusters.geo)))::jsonb,
                                'properties', json_build_object('pads', json_agg(clusters.pad), 'count', COUNT(clusters.pad), 'cid', clusters.cid)::jsonb
                            ) AS json
                            FROM (
                                SELECT c.iso3 AS cid, ST_Point(c.lng, c.lat) AS geo, t.pad FROM countries c
                                INNER JOIN users u
                                    ON u.iso3 = c.iso3
                                INNER JOIN ($1:raw) t
                                    ON t.owner::uuid = u.uuid::uuid
                            ) AS clusters
                            GROUP BY (clusters.cid)
                            ORDER BY clusters.cid
                        ;`, [ set_table ])
                        .then(results => results.map(d => d.json))
                        .catch(err => console.log(err))
                    } else return null
                }).catch(err => console.log(err)))
            }
            
            return t.batch(batch1)
            .catch(err => console.log(err))
	}).then(d => d)
	.catch(err => console.log(err))
}
