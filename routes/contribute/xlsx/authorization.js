const { modules } = include('config/')

module.exports = (_kwargs) => {
	const { rights } = _kwargs
	let { write } = modules.find(d => d.type === 'pads')?.rights || {}
	if (rights >= (write.blank ?? write) ?? Infinity) return { authorized: true }
	else return { authorized: false }
}