// IMPORTANT!!!!!
// RUN THE fix_tags.js SCRIPT FOR ALL PLATFORMS BEFORE RUNNING THIS ONE
// AS THIS WILL DELETE INSTANCES OF TAGS IN THE general DB
const { DB } = require('../../../config')
const updatesql = false

if (updatesql) {
	DB.general.none(`
		DELETE FROM tags
			WHERE type IS NULL
				AND name IN (SELECT name FROM tags WHERE type IS NOT NULL)
				AND name <> ''
	;`).then(_ => console.log('done'))
	.catch(err => console.log(err))
} else {
	DB.general.tx(t => {
		return t.any(`
			SELECT * FROM tags
			WHERE type IS NULL
				AND name NOT IN (SELECT name FROM tags WHERE type IS NOT NULL)
				AND name <> ''
		;`).then(tags => {
			return DB.conn.any(`
				SELECT id, status, sections FROM pads
			;`).then(pads => {
				pads.forEach(d => {
					d.sections?.forEach(c => {
						c.items.filter(b => ['tag', 'index'].includes(b.type) && b.tags?.length)
						.forEach(b => {
							b.tags.forEach(a => {
								if (tags.some(x => x.name === a.name)) {
									console.log(a)
								} //else console.log('the tags with no type are not used in this pad')
							})
						})
					})
				})
			}).then(_ => {return;})
			.catch(err => {throw err})
		})
	}).then(_ => console.log('done'))
	.catch(err => console.log(err))
}

Array.prototype.nest = function (key, keep) { // THIS IS NOT QUITE THE SAME FUNCTION AS IN distances.js, THIS MORE CLOSELY RESEMBLES d3.nest
	const arr = []
	this.forEach(d => {
		const groupby = typeof key === 'function' ? key(d) : d[key]
		if (!arr.find(c => c.key === groupby)) {
			if (keep) {
				const obj = {}
				obj.key = groupby
				obj.values = [d]
				obj.count = 1
				if (Array.isArray(keep)) keep.forEach(k => obj[k] = d[k])
				else obj[keep] = d[keep]
				arr.push(obj)
			} else arr.push({ key: groupby, values: [d], count: 1 })
		} else {
			arr.find(c => c.key === groupby).values.push(d)
			arr.find(c => c.key === groupby).count ++
		}
	})
	return arr
}
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
