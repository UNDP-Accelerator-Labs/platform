const StaticElement = function (_sel, _method, _element, _class) {
  return _sel[typeof _method === 'object' ? _method[0] : _method](
    _element,
    typeof _method === 'object' ? _method[1] : null,
  ).attr('class', _class);
};
const DynamicElement = function (
  _sel,
  _method,
  _element,
  _class,
  _data,
  _key,
) {
  // THIS REPLACES DOMnode
  const node = _sel
    .selectAll(
      _class
        ? `${_element.replace(/xhtml:/g, '')}.${_class.replace(/\s/g, '.')}`
        : `${_element.replace(/xhtml:/g, '')}`,
    )
    .data(
      _data
        ? typeof _data === 'function'
          ? (d) => _data(d)
          : _data
        : (d) => [d],
      (d, i) => (_key ? (typeof _key === 'function' ? _key(d) : d[_key]) : i),
    );
  node.exit().remove();
  return node
    .enter()
    [typeof _method === 'object' ? _method[0] : _method](
      _element,
      typeof _method === 'object' ? _method[1] : null,
    )
    .attr('class', _class ? _class : null)
    .merge(node);
};

window.d3.selection.prototype.insertElem = function (
  _before,
  _element,
  _class,
) {
  return new StaticElement(
    this,
    ['insert', _before],
    _element,
    _class ? _class : null,
  );
};
window.d3.selection.prototype.insertElems = function (
  _before,
  _element,
  _class,
  _data,
  _key,
) {
  return new DynamicElement(
    this,
    ['insert', _before],
    _element,
    _class ? _class : null,
    _data,
    _key,
  );
};
window.d3.selection.prototype.addElem = function (_element, _class) {
  return new StaticElement(this, 'append', _element, _class ? _class : null);
};
window.d3.selection.prototype.addElems = function (
  _element,
  _class,
  _data,
  _key,
) {
  return new DynamicElement(
    this,
    'append',
    _element.trim(),
    _class ? _class.trim() : null,
    _data,
    _key,
  );
};
window.d3.selection.prototype.findAncestor = function (_target) {
  if (!this.node().classList || this.node().nodeName === 'BODY') return null;
  if (this.classed(_target) || this.node().nodeName === _target?.toUpperCase())
    return this;
  return window.d3.select(this.node().parentNode)?.findAncestor(_target);
};
window.d3.selection.prototype.hasAncestor = function (_target) {
  if (this.node().nodeName === 'BODY') return false;
  if (this.classed(_target) || this.node().nodeName === _target?.toUpperCase())
    return true;
  return window.d3.select(this.node().parentNode)?.hasAncestor(_target);
};
window.d3.selection.prototype.moveToFront = function () {
  return this.each(function () {
    this.parentNode.appendChild(this);
  });
};
window.d3.selection.prototype.moveToBack = function () {
  // CREDIT: https://stackoverflow.com/questions/14167863/how-can-i-bring-a-circle-to-the-front-with-d3
  return this.each(function () {
    const firstChild = this.parentNode.firstChild;
    if (firstChild) {
      this.parentNode.insertBefore(this, firstChild);
    }
  });
};
window.d3.selection.prototype.toggleClass = function (_class) {
  return this.classed(_class, !this.classed(_class));
};
// https://stackoverflow.com/questions/25405359/how-can-i-select-last-child-in-d3-js
window.d3.selection.prototype.last = function () {
  return window.d3.select(this.nodes()[this.size() - 1]);
};
