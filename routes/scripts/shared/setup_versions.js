const { DB } = require('../../../config')
let table = process.env['TABLE']
const arg = process.env['ACTION']
if (!arg) {
	throw new Error(`missing argument action=${process.argv}`);
}

if (!table) table = 'pads'

DB.conn.tx(t => {
	const batch = []

	batch.push(t.none(`CREATE EXTENSION IF NOT EXISTS ltree;`).catch(err => console.log(err)))
	batch.push(t.none(`ALTER TABLE $1:name ADD COLUMN IF NOT EXISTS version ltree;`, [ table ]).catch(err => console.log(err)))
	batch.push(t.none(`CREATE INDEX IF NOT EXISTS version_idx ON $1:name USING GIST (version);`, [ table ]).catch(err => console.log(err)))

	return t.batch(batch)
	.then(_ => {
		return t.any(`
			SELECT id, source FROM $1:name
			ORDER BY id
		;`, [ table ]).then(results => {
			const pairs = results.map(d => [d.source, d.id].filter(d => d))
			// const unique_pairs = pairs.map(d => d.join('.')).unique().map(d => d.split('.').map(d => +d))
			// ALL PAIRS SHOULD BE UNIQUE
			const paths = pairs.map(d => {
				const path = [ d ]
				if (d.length > 1) {
					let parent = pairs.find(c => c[1] === d[0])
					if (parent) {
						while (parent) {
							path.unshift(parent)
							parent = pairs.find(c => c[1] === parent[0])
							if (d.includes(898)) console.log(d, parent)
						}
					}
					path.unshift(pairs.find(c => c[0] === path[0][0]))
				}
				return path.flat().unique()
			})

			if (arg !== 'update') return console.log(paths)
			else {
				const batch = paths.map(d => {
					return t.none(`
						UPDATE $1:name SET version = $2
						WHERE id = $3::INT
					;`, [ table, d.join('.'), d[d.length - 1] ])
				})
				return t.batch(batch)
				.catch(err => console.log(err))
			}
		}).catch(err => console.log(err))
	}).catch(err => console.log(err))
}).catch(err => console.log(err))


Array.prototype.unique = function (key, onkey) {
	const arr = []
	this.forEach(d => {
		if (!key) {
			if (arr.indexOf(d) === -1) arr.push(d)
		}
		else {
			if (onkey) { if (arr.map(c => c).indexOf(d[key]) === -1) arr.push(d[key]) }
			else {
				if (typeof key === 'function') { if (arr.map(c => key(c)).indexOf(key(d)) === -1) arr.push(d) }
				else { if (arr.map(c => c[key]).indexOf(d[key]) === -1) arr.push(d) }
			}
		}
	})
	return arr
}
