export function openPreview() {
  const url = new URL(window.location);
  const href = url.href.replace('/browse/', '/preview/');
  window.open(href, '_blank');
}

export async function setShareOptions(node) {
  const { id, contributors: curr_contributors } = node.dataset || {};
  const contributors = await POST(`/${language}/browse/contributors/invited`, {
    limit: null,
  });

  const formdata = { action: '/share/pinboard', method: 'POST' };
  const message = 'Share with contributors'; // TO DO: TRANSLATE
  const opts = [];

  contributors.data.forEach((d) => {
    opts.push({
      node: 'input',
      type: 'checkbox',
      name: 'contributor',
      value: d.id,
      placeholder: d.name,
      checked: curr_contributors.includes(d.id),
      default: true,
    });
  });

  const foot = {
    node: 'button',
    type: 'submit',
    name: 'pinboard',
    value: id,
    label: 'Share',
  }; // TO DO: TRANSLATE

  const new_constraint = await renderLonglistFormModal({
    message,
    formdata,
    opts,
    foot,
  });
}
export async function confirmRemoval(action) {
  const sel = d3.select(this);
  const datum = d3.select(this.parentNode).datum();
  const form = this.form;
  const flagged = d3.selectAll('article .outer.expand');

  if (flagged.size() === 1) form.submit();
  else {
    let message = '';
    if (action === 'delete') message = vocabulary['what pads to delete'];
    else if (action === 'unpublish')
      message = vocabulary['what pads to unpublish'];

    const opts = [
      {
        node: 'button',
        type: 'button',
        label: vocabulary['all selected'],
        resolve: (_) =>
          d3
            .selectAll('article .outer.expand')
            .data()
            .map((d) => d.id),
      },
      {
        node: 'button',
        type: 'button',
        label: `${vocabulary['only']} <strong>${datum.title}</strong>`,
        resolve: [datum.id],
      },
    ];
    const removal = await renderPromiseModal({ message, opts });

    d3.select(form)
      .addElems('input', 'pad-id', removal)
      .attrs({
        type: 'hidden',
        name: 'id',
        value: (d) => d,
      });
    form.submit();
  }
}
export function deleteArticles() {
  const sel = d3.select(this);
  const article = sel.findAncestor('article');
  article.selectAll('button.delete').toggleClass('active');
  const outer = article.select('div.outer').toggleClass('expand');
  outer.select('form.unpublish').classed('hide', true);
  outer.select('form.delete').toggleClass('hide');
}
export function unpublishArticles() {
  const sel = d3.select(this);
  const article = sel.findAncestor('article');
  article.selectAll('button.unpublish').toggleClass('active');
  const outer = article.select('div.outer').toggleClass('expand');
  outer.select('form.delete').classed('hide', true);
  outer.select('form.unpublish').toggleClass('hide');
}
// FILTERS MENU
export function expandfilters(node) {
  d3.select(node).toggleClass('close');
  const filters = node.form.querySelector('.filters');
  const padding =
    filters.querySelector('section').getBoundingClientRect().height / 2;
  // WE NEED TO MANUALLY ADD THE BOTTOM PADDING BECAUSE IT IS NOT COMPUTED IN THE scrollHeight
  if (filters.style.maxHeight) {
    filters.style.maxHeight = null;
    filters.style.overflow = 'hidden';
  } else filters.style.maxHeight = `${filters.scrollHeight + padding}px`;
}
export function addequivalents(node) {
  const parent = d3.select(node.parentNode);
  parent
    .selectAll('input[type=hidden]')
    .attr('disabled', node.checked ? null : true);
}
export function toggletag(node, d) {
  const sel = d3.select(node);
  const filter = sel.findAncestor('filter');
  let taggroup = d3.select(filter.node().nextElementSibling);

  if (!taggroup.node() || !taggroup.classed('active-filters')) {
    taggroup = d3
      .select(filter.node().parentNode)
      .insertElem(
        (_) => filter.node().nextElementSibling,
        'div',
        'active-filters',
      );
  }

  if (node.checked) {
    const tag = taggroup.addElem('div', 'tag').attr('data-id', d.id);
    tag
      .addElems('label', 'name')
      .attr(
        'title',
        Number.isInteger(d.name)
          ? d.name
          : d.name?.capitalize() || vocabulary['unknown'],
      )
      .html((_) => {
        if (Number.isInteger(d.name)) return d.name;
        else if (d.name) {
          if (d.name.length > 15)
            return `${d.name.slice(0, 15).capitalize()}…`;
          else return d.name.capitalize();
        } else return vocabulary['unknown'];
      });
    tag.addElems('label', 'close').on('click', function () {
      rmtag(this, d);
    });
  } else {
    taggroup.selectAll(`.tag[data-id="${d.id}"]`).remove();
    if (taggroup.selectAll('.tag').size() === 0) taggroup.remove();
  }
}
export function rmtag(node, d) {
  const sel = d3.select(node);
  const tag = sel.findAncestor('tag');
  const taggroup = tag.findAncestor('active-filters');
  const filter = d3.select(taggroup.node().previousElementSibling);
  const input = filter
    .selectAll('input')
    .filter(function () {
      return this.value.toString() === d.id.toString();
    })
    .node();
  input.checked = false;
  toggletag(input, d);
}
export async function pinAll(node) {
  const object = d3.select('data[name="object"]').node().value;
  const space = d3.select('data[name="space"]').node().value;

  node.checked = true;
  const id = node.value;

  const reqbody = {
    board_id: id,
    action: 'insert',
    object: object.slice(0, -1),
    limit: null,
    space,
    load_object: true,
  };

  const url = new URL(window.location);
  const queryparams = new URLSearchParams(url.search);
  queryparams.forEach((value, key) => {
    if (key !== 'page') {
      if (!reqbody[key]) {
        reqbody[key] = value;
      } else {
        if (!Array.isArray(reqbody[key])) {
          reqbody[key] = [reqbody[key]];
        }
        reqbody[key].push(value);
      }
    }
  });

  // TO DO: THIS COULD BE IMPROVED HERE AND IN THE BACKEND TO USE full_filters INSTEAD OF PASSING BACK AND FORTH THE FULL LIST OF PAD IDs
  // await POST('/pin', {
  // 	board_id: id,
  // 	object_id: <%- JSON.stringify(locals.pads) %>,
  // 	action: 'insert',
  // 	object: object.slice(0, -1)
  // })

  console.log(reqbody);

  await POST('/pin', reqbody);
  location.reload();
}
