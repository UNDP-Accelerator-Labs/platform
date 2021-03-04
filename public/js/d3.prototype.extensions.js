const staticElement = function (_sel, _method, _element, _class) {
	return _sel[typeof _method === 'object' ? _method[0] : _method](_element, typeof _method === 'object' ? _method[1] : null)
		.attr('class', _class)
}
const dynamicElement = function (_sel, _method, _element, _class, _data, _key) { // THIS REPLACES DOMnode
	const node = _sel.selectAll(_class ? `${_element.replace(/xhtml:/g, '')}.${_class.replace(/\s/g, '.')}` : `${_element.replace(/xhtml:/g, '')}`)
		.data(_data ? (typeof _data === 'function' ? d => _data(d) : _data) : d => [d],
		(d, i) => _key ? (typeof _key === 'function' ? _key(d) : d[_key]) : i)
	node.exit().remove()
	return node.enter()
		[typeof _method === 'object' ? _method[0] : _method](_element, typeof _method === 'object' ? _method[1] : null)
		.attr('class', _class ? _class : null)
	.merge(node)
}

d3.selection.prototype.insertElem = function (_before, _element, _class) {
	return new staticElement(this, ['insert', _before], _element, _class ? _class : null)
}
d3.selection.prototype.insertElems = function (_before, _element, _class, _data, _key) {
	return new dynamicElement(this, ['insert', _before], _element, _class ? _class : null, _data, _key)
}
d3.selection.prototype.addElem = function (_element, _class) {
	return new staticElement(this, 'append', _element, _class ? _class : null)
}
d3.selection.prototype.addElems = function (_element, _class, _data, _key) {
	return new dynamicElement(this, 'append', _element.trim(), _class ? _class.trim() : null, _data, _key)
}
d3.selection.prototype.findAncestor = function (_class) {
	if (!this.node().classList) return false
	if (this.classed(_class)) return this
	return d3.select(this.node().parentNode) && d3.select(this.node().parentNode).findAncestor(_class);
}
d3.selection.prototype.moveToFront = function() {
	return this.each(function(){
		this.parentNode.appendChild(this)
	})
}

d3.selection.prototype.toggleClass = function (_class) {
	return this.classed(_class, !this.classed(_class))
}