import { vocabulary } from '/js/config/translations.js';
import { partialSave } from '/js/contribute/contributor/save.js';
import { POST } from '/js/fetch.js';
import { fixLabel, getMediaSize } from '/js/main.js';

export async function requestToken(node) {
  const token = await POST('/request/token');
  if (token) {
    const inputgroup = d3.select(node);
    inputgroup.selectAll('.hide').classed('hide', false);
    const input = inputgroup.select('input[type=text]').attr('value', token);
    input.node().select();
  }
}
export function copyToken(node) {
  const inputgroup = d3.select(node);
  const token = inputgroup.select('input[type=text]').node().value;
  navigator.clipboard.writeText(token);
}
export async function addLanguage(node) {
  const { languages } = JSON.parse(
    d3.select('data[name="site"]').node().value,
  );

  const sel = d3.select(node);
  const parent = sel.findAncestor('ul');
  const li = parent.insertElem(function () {
    return node;
  }, 'li');
  li.addElem('label', 'instruction').html(vocabulary['other languages']);
  const input = li.addElem('div', 'select');
  input
    .addElem('input')
    .attrs({
      type: 'text',
      id: 'secondary-languages',
      autocomplete: 'secondary-languages',
    })
    .on('blur.fixlabel', function () {
      fixLabel(this);
    });
  input
    .addElem('label')
    .attr('for', 'secondary-languages')
    .html(vocabulary['select language']['plural']);
  const dropdown = input
    .addElem('div', 'dropdown')
    .addElem('menu')
    .addElems('li', null, languages)
    .each(function () {
      const sel = d3.select(this);
      sel
        .addElems('input')
        .attrs({
          type: 'checkbox',
          id: (d) => `secondary-language-${d.language}`,
          name: 'secondary_languages', // TO DO: PROBABLY CHANGE THIS SO NO CONFLICT WITH OTHER language INPUTS
          value: (d) => d.language,
          'data-label': (d) => d.name.capitalize(),
          disabled: (d) =>
            d.language ===
            d3.select('input[name="language"]:checked').node()?.value
              ? true
              : null,
        })
        .on('change.select', function () {
          partialSave();
        });
      sel
        .addElems('label')
        .attr('for', (d) => `secondary-language-${d.language}`)
        .html((d) => d.name.capitalize());
    });

  await initDropdowns();
  sel.remove();
}
function addPinOption(value) {
  const dropdown = d3.select(this);
  const li = dropdown.select('menu').addElem('li');
  const pinItem = li
    .addElems('input')
    .attrs({
      type: 'checkbox',
      id: value.simplify(),
      name: 'new_teams',
      value: value,
      'data-label': value,
    })
    .each(function () {
      this.checked = true;
    });
  li.addElems('label', 'title').attr('for', value.simplify()).html(value);
  renderPin.call(pinItem.node());
}
function renderPin() {
  const sel = d3.select(this);
  const pinboard = d3.select('.pinboard-group').classed('hide', false);

  if (this.checked) {
    const pin = pinboard.select('.pinboard .pins').addElem('div', 'pin tag');
    pin
      .addElem('label', 'name')
      .classed('notranslate', true)
      .html(this.dataset.label);
    pin
      .addElem('div', 'close')
      .attrs({ 'data-name': this.name, 'data-id': this.value })
      .on('click', function () {
        rmPin(this);
      })
      .html('x');
  } else {
    d3.select(`label.close[data-name='${this.name}'][data-id='${this.value}']`)
      .node()
      .click();
  }
}
export function rmPin(node) {
  const sel = d3.select(node);
  const id = node.dataset.id;
  const name = node.dataset.name;
  const input = d3.select(`input[name='${name}'][value='${id}']`);
  input.attr('checked', null);
  input.node().checked = false;
  sel.findAncestor('pin').remove();

  const pinboard = d3.select('.pinboard-group');
  if (!pinboard.selectAll('.pin').size()) pinboard.classed('hide', true);

  partialSave();
}
export async function initDropdowns() {
  if (!mediaSize) var mediaSize = getMediaSize();
  const { rights } = await POST('/check/module_rights', {
    module_type: 'teams',
  });

  const selects = d3.selectAll('.select');
  selects
    .selectAll('input[type=text]')
    .on('keyup', function () {
      const node = this;

      const dropdown = d3
        .select(node)
        .findAncestor('select')
        .select('.dropdown');
      dropdown.selectAll('menu li').classed('hide', function () {
        return (
          !this.textContent
            .trim()
            .toLowerCase()
            .includes(node.value.trim().toLowerCase()) &&
          (!dropdown.selectAll('menu li input:checked').size() ||
            !Array.from(
              dropdown.selectAll('menu li input:checked').nodes(),
            ).every((sel) => {
              return node.value
                .trim()
                .toLowerCase()
                .split(',')
                .map((d) => d.trim())
                .includes(sel.parentNode.textContent.trim().toLowerCase());
            }))
        );
      });
    })
    .on('focus', function () {
      const select = d3.select(this).findAncestor('select');
      const dropdown = select.select('.dropdown');
      dropdown.node().style.maxHeight = `${Math.min(
        dropdown.node().scrollHeight,
        300,
      )}px`;

      dropdown.selectAll('label').on('mousedown', function () {
        d3.event.preventDefault();
      });

      if (mediaSize === 'xs') select.classed('expand', true);
    })
    .on('blur', function () {
      const select = d3.select(this).findAncestor('select');
      const dropdown = select.select('.dropdown');
      dropdown.node().style.maxHeight = null;

      if (mediaSize === 'xs') {
        setTimeout((_) => select.classed('expand', false), 250);
      }
    });

  selects.selectAll('input[type=radio]').on('change', function () {
    const node = this;
    const sel = d3.select(node);
    sel.findAncestor('select').select('input[type=text]').node().value =
      node.dataset.label;

    d3.selectAll('input[name="secondary_languages"]').attr(
      'disabled',
      function () {
        return this.value === node.value ? true : null;
      },
    );
  });

  selects.selectAll('input[type=checkbox]').on('change', function () {
    const node = this;
    const sel = d3.select(node);

    const values = [];
    sel
      .findAncestor('menu')
      .selectAll('input[type=checkbox]:checked')
      .each(function () {
        values.push(this.dataset.label);
      });

    sel.findAncestor('select').select('input[type=text]').node().value =
      values.join(', ');
  });

  // <% if (modules.some(d => d.type === 'teams' && rights >= d.rights.write)) { %>
  if (rights.write) {
    selects
      .select('input#new-team')
      .on('keydown', function () {
        const evt = d3.event;
        if (evt.code === 'Enter' || evt.keyCode === 13) {
          evt.preventDefault();
        }
      })
      .on('keyup.checkEnter', function (d) {
        const evt = d3.event;
        const node = this;
        const newpin = d3.select(this).findAncestor('add');

        if (evt.code === 'Enter' || evt.keyCode === 13) {
          evt.preventDefault();
          newpin.select('button').node().click();
        }
      });

    selects.selectAll('input[name=teams]').on('change', function () {
      renderPin.call(this);
    });
    selects.select('button#add-new-team').on('click', async function (d) {
      const newpin = d3.select(this).findAncestor('add');
      const node = newpin.select('input[type=text]').node();

      if (node.value.trim().length) {
        const dropdown = newpin.select('.dropdown');

        const existingBoard = dropdown
          .selectAll('menu li:not(.hide) .title')
          .filter(function () {
            return (
              this.textContent.trim().toLowerCase() ===
              node.value.trim().toLowerCase()
            );
          });
        // IF EXIST, JUST CHECK IT
        if (existingBoard.node()) {
          const pinItem = existingBoard.node().previousElementSibling;
          pinItem.checked = true;
          renderPin.call(pinItem);
        } else {
          addPinOption.call(dropdown.node(), node.value.trim());
        }

        // RESET DROPDOWN
        this.value = '';
        dropdown.selectAll('menu li').classed('hide', false);
      }
    });
  }
}
