import { partialSave } from '/js/browse/save.js';
import { vocabulary } from '/js/config/translations.js';
import {
  checkForEnter,
  fixLabel,
  getMediaSize,
  selectElementContents,
} from '/js/main.js';
import { renderFormModal } from '/js/modals.js';

// TO DO: DEPRECATE THIS IN FAVOR OF A COLLECTION OF COLLECTIONS APPROACH
d3.selectAll('.make-editable:not(.section-title)').on('click', function () {
  console.log('click');
  makeEditable(this, this.nextElementSibling);
});

d3.selectAll('.section-title').on('keydown', function () {
  checkForEnter(event, this);
});

d3.selectAll('.section-title.editable')
  .on('focus', function () {
    this.classList.add('focus');
    this.parentNode.parentNode.classList.add('editing');
  })
  .on('blur', function () {
    const { id } = this.dataset;
    partialSave('section-title', id);
  });

d3.selectAll('.new-section .section-title')
  .on('focus', function () {
    makeEditable(this, this.nextElementSibling);
  })
  .on('blur', function () {
    addSection(this);
  });

d3.selectAll('.add-section').on('click', function () {
  addSection(this.previousElementSibling);
});

function makeEditable(node, a_node) {
  const sel = d3.select(node);
  const li = sel.findAncestor('li');
  sel.classed('focus', !sel.classed('focus'));

  if (sel.classed('focus')) {
    li.classed('editing', true);

    if (a_node) {
      const a = d3.select(a_node);
      const href = a.attr('href');
      a.attrs({
        href: null,
        'data-href': href,
      });
    }
    li.select('button div.section-title').node().contentEditable = true;
    selectElementContents(li.select('button div.section-title').node());
  }
}
async function addSection(node) {
  const { id, section, singlesection, options } = JSON.parse(
    d3.select('data[name="pinboard"]').node().value,
  );

  const formdata = { action: '/save/pinboard-section', method: 'POST' };
  const message = 'Create one or more sections.'; // TO DO: TRANSLATE
  const opts = [];

  const target_opts = options.map((d) => {
    return { label: d.capitalize(), value: d, type: 'radio' };
  });

  if (section) {
    opts.push({
      node: 'input',
      type: 'hidden',
      name: 'id',
      value: section,
    });
  }
  opts.push({
    node: 'input',
    type: 'hidden',
    name: 'pinboard',
    value: id,
  });

  if (singlesection) {
    opts.push({
      node: 'input',
      type: 'radio',
      name: 'section_type',
      value: 'single',
      placeholder: `Create a single new section named <strong>${node.innerText}</strong> and assign pads manually—you can change this name later.`,
      checked: true,
      default: true,
      fn: enableSave,
    });
    opts.push({
      node: 'input',
      type: 'hidden',
      name: 'sections',
      value: node.innerText,
    });
  }

  opts.push({
    node: 'input',
    type: 'radio',
    name: 'section_type',
    value: 'multiple',
    placeholder: 'Generate sections from filters.',
    checked: !singlesection,
    default: true,
    fn: enableSave,
  });

  opts.push({
    node: 'select',
    name: 'sections',
    label: 'Sections',
    options: target_opts,
    classname: `section-options${singlesection ? ' hide' : ''}`,
    fn: setSections,
  });

  opts.push({
    node: 'button',
    type: 'submit',
    label: vocabulary['save'],
    disabled: !singlesection,
  });
  //d3.select('.modal input[name=sections]:checked').node().value
  const sections = await renderFormModal({ message, formdata, opts });

  function setSections(data) {
    const { value } = data || {};
    const form = d3.select(this.form);
    const platform_filters = JSON.parse(
      d3.select('data[name="platform-filters"]').node().value,
    );

    form
      .addElems(
        'input',
        'multiple-section-id',
        platform_filters[value]?.map((d) => d.id) || [],
      )
      .attrs({
        type: 'hidden',
        name: value,
        value: (d) => d,
      });
    form.select('button[type=submit]').node().disabled = false;
  }

  function enableSave(data) {
    const { value } = data || {};
    const form = d3.select(this.form);

    if (value === 'multiple') {
      // SHOW DROPDOWN AND DISABLED INPUT HIDDEN
      form.select('input[name=sections][type=hidden]').node().disabled = true;
      form
        .selectAll('li.section-options')
        .classed('hide', false)
        .selectAll('.dropdown li input[type=radio]')
        .each(function () {
          this.disabled = false;
        });
    } else {
      form.select('input[name=sections][type=hidden]').node().disabled = false;
      const li = form.selectAll('li.section-options').classed('hide', true);
      li.select('input.dropbtn').each(function () {
        this.value = null;
        fixLabel(this);
      });
      li.selectAll('.dropdown li')
        .classed('active', false)
        .selectAll('input[type=radio]')
        .each(function () {
          this.disabled = true;
          this.checked = false;
        });
      form.selectAll('input.multiple-section-id').remove();
    }

    form.select('button[type=submit]').node().disabled =
      form.select('input[value=multiple]:checked').node() &&
      !form.selectAll('input.multiple-section-id').size();
  }
}
(function scrollToActiveSection(node) {
  if (!mediaSize) var mediaSize = getMediaSize();
  if (!['xs', 'sm'].includes(mediaSize)) {
    const menu = d3.select('.pinboard-sections menu');
    const section = menu.select('li.active').node();
    if (section) {
      menu.node().scrollTo({
        top: 0,
        left: section.offsetLeft,
        behavior: 'smooth',
      });
    }
  }
})();
