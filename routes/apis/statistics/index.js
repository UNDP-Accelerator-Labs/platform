const { array } = include('routes/helpers/')
const load = include('routes/browse/pads/load/')

module.exports = async (req, res) => {
	// const { space } = req.body || {}
	// const { uuid } = req.session || {}
	
	// if (!space) {
	// 	// INJECT SPACE
	// 	if (uuid) req.body.space = 'private'
	// 	else req.body.space = 'public'
	// } else if (space === 'private' && !uuid) req.body.space = 'public'
	
	const statistics = await load.statistics({ req, res })

	const data = {
		total: array.sum.call(statistics.total, 'count'), 
		filtered: array.sum.call(statistics.filtered, 'count'), 
		
		private: statistics.private,
		curated: statistics.curated,
		shared: statistics.shared,
		reviewing: statistics.reviewing,
		public: statistics.public,
		
		// displayed: data.count,
		breakdown: statistics.filtered,
		persistent_breakdown: statistics.persistent,
		contributors: statistics.contributors,
		tags: statistics.tags
	}
	res.json(data)
}