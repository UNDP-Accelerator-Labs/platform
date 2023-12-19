import { getTranslations } from '/js/config/main.js';
import { d3, uuidv4 } from '/js/globals.js';
import { filterDropdown, fixLabel } from '/js/main.js';

export async function renderModal(data, close = true) {
  const vocabulary = await getTranslations();
  const { headline, opts, theme, node } = data;

  d3.selectAll('.temp-active').classed('temp-active', false);
  d3.select(node).classed('temp-active', function () {
    return !d3.select(this).classed('active');
  });

  d3.select('nav.filter').classed('open', false);
  d3.selectAll('div.screen').classed('hide', true);
  const screen = d3.select('div.screen').classed('hide', false);

  const modal = screen.addElems('div', `modal ${theme}`);

  if (close) {
    modal
      .addElems('button', 'close')
      .on('click', function () {
        if (typeof close === 'function') {
          close();
        } else {
          modal.remove();
          d3.selectAll('.temp-active').classed('temp-active', false);
          screen.classed('hide', true);
        }
      })
      .html(vocabulary['close']);
  }

  // modal.addElems('button', 'close')
  // .on('click', function () {
  // 	modal.remove()
  // 	d3.selectAll('.temp-active').classed('temp-active', false)
  // 	screen.classed('hide', true)
  // }).html(vocabulary['close'])

  const inner = modal.addElems('div', 'inner');
  inner.addElems('h1', 'headline', headline ? [headline] : []).html((d) => d);

  inner
    .addElems('ul', 'opts', opts ? [opts] : [])
    .addElems('li', 'opt link', (d) => d)
    .addElems('a')
    .attr('href', (d) => d.href)
    .addElems('button')
    .each(function (d) {
      if (d.class) {
        d3.select(this).classed(d.class, true);
      }
    })
    .html((d) => d.label);
}
export function renderPromiseModal(data, close = true) {
  const { headline, message, opts } = data;

  return new Promise(async (resolve) => {
    const vocabulary = await getTranslations();
    d3.select('nav.filter').classed('open', false);
    d3.selectAll('div.screen').classed('hide', true);
    const screen = d3.select('div.screen').classed('hide', false);
    const modal = screen.addElems('div', 'modal');

    if (close) {
      modal
        .addElems('button', 'close')
        .on('click', function () {
          if (typeof close === 'function') {
            resolve(close());
          } else {
            modal.remove();
            screen.classed('hide', true);
            resolve(null);
          }
        })
        .html(vocabulary['close']);
    }

    const inner = modal.addElems('div', 'inner');
    inner
      .addElems('h1', 'headline', headline ? [headline] : [])
      .html((d) => d);

    inner
      .addElems('div', 'message', message ? [message] : [])
      .html((d) => d)
      .each(function () {
        const input = d3.select(this).select('input[type=text]');
        if (input.node()) input.node().focus();
      });

    const asels = [];
    inner
      .addElems('ul', 'opts', opts ? [opts] : [])
      .addElems('li', 'opt link', (d) => d)
      .classed('default', (d) => d.default || false)
      .each(function (d) {
        asels.push(async () => {
          const sel = d3.select(this);
          if (d.classname) d3.select(this).classed(d.classname, true);
          await addInputNode(sel, { d, resolve });
        });
      });
    for (const asel of asels) {
      await asel();
    }
  });
}
export async function renderFormModal(data, close = true) {
  const vocabulary = await getTranslations();
  const { headline, message, formdata, opts, foot } = data;
  d3.select('nav.filter').classed('open', false);
  d3.selectAll('div.screen').classed('hide', true);
  const screen = d3.select('div.screen').classed('hide', false);

  const modal = screen.addElems('div', 'modal');

  if (close) {
    modal
      .addElems('button', 'close')
      .on('click', function () {
        if (typeof close === 'function') {
          close();
        } else {
          modal.remove();
          screen.classed('hide', true);
        }
      })
      .html(vocabulary['close']);
  }

  // modal.addElems('button', 'close')
  // .on('click', function () {
  // 	modal.remove()
  // 	screen.classed('hide', true)
  // }).html(vocabulary['close'])

  const inner = modal.addElems('div', 'inner');
  inner.addElems('h1', 'headline', headline ? [headline] : []).html((d) => d);

  inner
    .addElems('div', 'message', message ? [message] : [])
    .html((d) => d)
    .each(function () {
      const input = d3.select(this).select('input[type=text]');
      if (input.node()) input.node().focus();
    });

  const form = inner
    .addElems('form', 'modal-form', formdata ? [formdata] : [])
    .attrs({
      action: (d) => d.action,
      method: (d) => d.method || 'GET',
    });

  const asels = [];
  form
    .addElems('ul', 'opts', opts ? [opts] : [])
    .addElems('li', 'opt link', (d) => d)
    .classed('default', (d) => d.default || false)
    .each(function (d) {
      asels.push(async () => {
        const sel = d3.select(this);
        if (d.classname) d3.select(this).classed(d.classname, true);
        await addInputNode(sel, { d });
      });
    });
  for (const asel of asels) {
    await asel();
  }

  form.addElems('div', 'foot', foot ? [foot] : []).each(function (d) {
    const sel = d3.select(this);
    sel
      .addElems(d.node)
      .attrs({
        type: d.type,
        name: d.name,
        value: d.value,
        required: d.required || null,
      })
      .on('blur', function () {
        if (d.placeholder) fixLabel(this);
      })
      .html((d) => d.label);
  });
}
export async function renderLonglistFormModal(data, close = true) {
  const vocabulary = await getTranslations();
  const { headline, message, formdata, opts, foot } = data;
  d3.select('nav.filter').classed('open', false);
  d3.selectAll('div.screen').classed('hide', true);
  const screen = d3.select('div.screen').classed('hide', false);

  const modal = screen.addElems('div', 'modal longlist');

  if (close) {
    modal
      .addElems('button', 'close')
      .on('click', function () {
        if (typeof close === 'function') {
          close();
        } else {
          modal.remove();
          screen.classed('hide', true);
        }
      })
      .html(vocabulary['close']);
  }

  // modal.addElems('button', 'close')
  // .on('click', function () {
  // 	modal.remove()
  // 	screen.classed('hide', true)
  // }).html(vocabulary['close'])

  const inner = modal.addElems('div', 'inner');
  inner.addElems('h1', 'headline', headline ? [headline] : []).html((d) => d);

  inner
    .addElems('div', 'message', message ? [message] : [])
    .html((d) => d)
    .each(function () {
      const input = d3.select(this).select('input[type=text]');
      if (input.node()) input.node().focus();
    });

  const form = inner
    .addElems('form', 'modal-form dropdown', formdata ? [formdata] : [])
    .attrs({
      action: (d) => d.action,
      method: (d) => d.method || 'GET',
    });

  const ul = form.addElems('ul', 'opts', opts ? [opts] : []);

  const filter = ul.addElems('li', 'filter');
  filter
    .addElems('input')
    .attrs({
      type: 'text',
      id: 'filter-longlist-modal',
    })
    .on('blur', function () {
      fixLabel(this);
    })
    .on('keyup', function () {
      filterDropdown(this);
    });
  filter
    .addElems('label')
    .attr('for', 'filter-longlist-modal')
    .html(vocabulary['filter']['verb']);

  ul.addElems('li', 'padding');

  const asels = [];
  ul.addElems('li', 'opt link', (d) => d)
    .classed('default', (d) => d.default || false)
    .each(function (d) {
      asels.push(async () => {
        await addInputNode(d3.select(this), { d });
      });
    });
  for (const asel of asels) {
    await asel();
  }

  form.addElems('div', 'foot', foot ? [foot] : []).each(function (d) {
    const sel = d3.select(this);
    sel
      .addElems(d.node)
      .attrs({
        type: d.type,
        name: d.name,
        value: d.value,
        required: d.required || null,
      })
      .on('blur', function () {
        if (d.placeholder) fixLabel(this);
      })
      .html((d) => d.label);
  });
}

async function addInputNode(_sel, _data) {
  const vocabulary = await getTranslations();
  const { d, resolve } = _data;
  const screen = _sel.findAncestor('screen');
  const modal = screen.select('.modal');
  const nodeid = uuidv4();

  if (d.node === 'select') {
    // CREATE DROPDOWN
    const filter = _sel.addElems('div', 'filter');

    filter
      .addElems('input', 'dropbtn')
      .attrs({
        id: nodeid,
        type: 'text',
      })
      .on('keyup', async function (d) {
        // const evt = d3.event;
        const node = this;
        const dropdown = d3
          .select(node)
          .findAncestor('filter')
          .select('.dropdown');
        dropdown.selectAll('menu li').classed('hide', function () {
          return !this.textContent
            .trim()
            .toLowerCase()
            .removeAccents()
            .includes(node.value.trim().toLowerCase().removeAccents());
        });
      })
      .on('focus', function (d) {
        const dropdown = d3
          .select(this)
          .findAncestor('filter')
          .select('.dropdown');
        dropdown.node().style.maxHeight = `${Math.min(
          dropdown.node().scrollHeight,
          300,
        )}px`;

        dropdown.selectAll('li').on('mousedown', function () {
          d3.event.preventDefault();
        });
      })
      .on('blur', function () {
        const dropdown = d3
          .select(this)
          .findAncestor('filter')
          .select('.dropdown');
        dropdown.node().style.maxHeight = null;
        fixLabel(this);
      });

    filter
      .addElems('label')
      .attr('for', nodeid)
      .html((c) => c.label);

    const dropdown = filter
      .addElems('div', 'dropdown')
      .addElems('menu')
      .addElems('li', null, (c) => c.options)
      .each(function (c) {
        const sel = d3.select(this);
        if (c.classname) sel.classed(c.classname, true);

        sel
          .addElems('input')
          .attrs({
            id: c.value.toString().simplify(),
            type: c.type,
            name: d.name,
            value: c.value,
            required: c.required || null,
            disabled: c.disabled?.value || null,
          })
          .on('change', async function (b) {
            // TO DO: MAKE THIS ONLY POSSIBLE IF THIS input TYPE IS CHECKBOX
            // const node = this;
            const sel = d3.select(this);
            const input = sel
              .findAncestor('filter')
              .select('input[type=text]')
              .node();
            if (c.type === 'radio') {
              // KEEP TRACK OF SELECTED VALUE
              if (this.checked) input.value = b.label;
              else input.value = '';
              input.blur();
              sel
                .findAncestor('dropdown')
                .selectAll('li')
                .classed('hide active', false);
            } else {
              input.value = '';
              sel
                .findAncestor('dropdown')
                .selectAll('li')
                .classed('hide', false);
              // KEEP TRACK OF SELECTED VALUES
              const taggroup = _sel.addElems('div', 'active-filters');
              const tag = taggroup
                .addElem('div', 'tag')
                .datum({ id: b.value });
              tag.addElems('label', 'name').html((_) => {
                if (b.label.length > 30) return `${b.label.slice(0, 30)}…`;
                else return b.label;
              });
              tag.addElems('label', 'close').on('click', async (_) => {
                await rmtag(b.value);
                if (d.fn && typeof d.fn === 'function') d.fn.call(this, b);
              });
            }
            sel.findAncestor('li').classed('active', this.checked);
            if (!this.checked) await rmtag(b.value);

            // IF THERE IS A FUNCTION ATTACHED TO THE DROPDOWN, EXECUTE IT
            if (d.fn && typeof d.fn === 'function') d.fn.call(this, b);

            // IF SELECTING AN ITEM RESOLVES THE PROMISE, RESOLVE IT
            if (resolve && c.type === 'radio' && d.resolve) {
              if (typeof d.resolve === 'function') {
                const resolved = await d.resolve(this);
                resolve(resolved);
              } else {
                resolve(d.resolve);
              }
              modal.remove();
              screen.classed('hide', true);
            }
          });

        sel
          .addElems('label', 'primary')
          .attr('for', (c) => c.value.toString().simplify())
          .html((c) => c.label);

        if (c.disabled?.value) {
          sel
            .addElems('label', 'secondary')
            .attr('for', (c) => c.value.toString().simplify())
            .html((c) => c.disabled.label);
        }
      });
    // THIS IS ALT TO USE STANDARD DROPDOWN
    // _sel.addElems(d.node)
    // 	.attr('name', d.name)
    // .addElems('option', 'target-option', d => d.options)
    // 	.attr('value', d => d.value)
    // 	.html(d => d.label)

    async function rmtag(id) {
      const input = dropdown.selectAll('input').filter((d) => d.value === id);
      const taggroup = _sel.select('.active-filters');
      const tag = taggroup.selectAll('.tag').filter((d) => d.id === id);
      input.node().checked = false;
      input.findAncestor('li').classed('active', input.node().checked);
      tag.remove();
      if (taggroup.selectAll('.tag').size() === 0) taggroup.remove();
    }
  } else {
    _sel
      .addElems(d.node) // , d.classname || null)
      .each(function (c) {
        if (c.class) d3.select(this).classed(c.class, true); // THIS MIGHT NEED TO BE UPDATED TO classname
      })
      .attrs({
        id: nodeid,
        type: d.type,
        name: d.name,
        value: d.value,
        required: d.required || null,
        checked: d.checked || null,
        disabled: d.disabled || null,
        accept: d.accept || null,
      })
      .html((c) => {
        if (d.node === 'div') return `<span>${d.label}</span>`;
        else return d.label;
      })
      .on('click', async function () {
        if (['button', 'submit'].includes(d.type)) {
          if (resolve) {
            if (typeof d.resolve === 'function') {
              const resolved = await d.resolve();
              resolve(resolved);
            } else resolve(d.resolve);
            modal.remove();
            screen.classed('hide', true);
          } else if (d.fn && typeof d.fn === 'function') d.fn.call(this, d);
        }
      })
      .on('keyup', async (_) => {
        const evt = d3.event;
        if (evt.code === 'Enter' || evt.keyCode === 13) {
          if (resolve) {
            if (typeof d.resolve === 'function') {
              const resolved = await d.resolve();
              resolve(resolved);
            } else resolve(d.resolve);
            modal.remove();
            screen.classed('hide', true);
          }
        }
      })
      .on('change', async function () {
        if (d.node === 'input') {
          fixLabel(this);
          if (d.fn && typeof d.fn === 'function') d.fn.call(this, d);
        }
        if (d.type === 'file' && resolve) {
          if (typeof d.resolve === 'function') {
            const resolved = await d.resolve(this);
            resolve(resolved);
          } else resolve(d.resolve);
          modal.remove();
          screen.classed('hide', true);
        }
      });
  }

  if (d.node === 'input' && !['hidden'].includes(d.type)) {
    _sel
      .addElems('label') // , d.classname || null)
      .attr('for', nodeid)
      .html(d.placeholder);

    if (!['checkbox', 'radio', 'date', 'email', 'file'].includes(d.type)) {
      _sel
        .addElems('button', 'input-submit')
        .attr('type', 'button')
        .on('click', (d) => {
          if (resolve) {
            if (typeof d.resolve === 'function') {
              const resolved = d.resolve();
              resolve(resolved);
            } else resolve(d.resolve);
            modal.remove();
            screen.classed('hide', true);
          }
        })
        .html(vocabulary['save']);
    }
  }
}

export async function renderImgZoom(data) {
  const vocabulary = await getTranslations();
  const { src } = data;

  d3.select('nav.filter').classed('open', false);
  d3.selectAll('div.screen').classed('hide', true);
  const screen = d3
    .select('div.screen')
    .classed('hide', false)
    .classed('dark', true);

  const modal = screen.addElems('div', 'modal');
  modal
    .addElems('button', 'close inlaid')
    .on('click', function () {
      modal.remove();
      screen.classed('hide', true).classed('dark', false);
    })
    .html(vocabulary['close']);

  const inner = modal.addElems('div', 'inner unpadded');
  inner
    .addElems('img', 'zoom', src ? [src] : [])
    .attr('loading', 'lazy')
    .each(function (d) {
      const sel = d3.select(this);
      const node = this;
      const img = new Image();
      img.onload = function () {
        node.src = this.src;
        const width = Math.min(this.naturalWidth, window.innerWidth);
        const excessiveheight =
          (width / this.naturalWidth) * this.naturalHeight >
          window.innerHeight - 60;

        if (!excessiveheight)
          sel.findAncestor('modal').style('width', `${width}px`);
        else {
          const ratio =
            (window.innerHeight - 60) /
            ((width / this.naturalWidth) * this.naturalHeight);
          console.log(ratio);
          sel.findAncestor('modal').style('width', `${width * ratio}px`);
        }
      };
      img.src = d;
    });
}

window.addEventListener('keyup', function (e) {
  e = e || event;
  if (e.key === 'Escape' || e.keyCode === 27) {
    if (d3.select('div.screen div.modal button.close').node()) {
      d3.select('div.screen div.modal button.close').node().click();
    }
  }
});
