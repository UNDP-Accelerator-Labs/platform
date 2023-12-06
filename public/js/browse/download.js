import { vocabulary } from '/js/config/translations.js';
import { POST } from '/js/fetch.js';
import { getContent } from '/js/main.js';
import { renderFormModal } from '/js/modals.js';

export async function setDownloadOptions() {
  const object = d3.select('data[name="object"]').node().value;
  const space = d3.select('data[name="space"]').node().value;

  const { metafields, modules } = await POST('/load/metadata', {
    feature: ['metafields', 'modules'],
  });

  let formdata = {};
  let message = '';
  const opts = [];

  const target_opts = [
    {
      label: '.csv',
      value: 'csv',
      type: 'radio',
      required: true,
    },
    {
      label: '.xslx',
      value: 'xlsx',
      type: 'radio',
      required: true,
    },
    {
      label: '.json',
      value: 'json',
      type: 'radio',
      required: true,
    },
    {
      label: '.geojson',
      value: 'geojson',
      type: 'radio',
      required: true,
    },
  ];

  if (['pads', 'mobilizations'].includes(object)) {
    target_opts.push({
      label: '.docx',
      value: 'docx',
      type: 'radio',
      required: true,
    });
    target_opts.push({
      label: '.pdf',
      value: 'pdf',
      type: 'radio',
      required: true,
    });
    // TO DO: IMPROVE THIS SINCE FOR NOW IT IS LIMITED TO THE 25 SHOWN ON THE CURRENT PAGE
    const { sections: data } = await getContent();
    const templates = data.map((d) => d.data.map((c) => c.template)).flat();
    const notemplates = templates.every((d) => [null, undefined].includes(d));

    // const countries = (data.map(d => d.data.map(c => c.country)).flat()).unique()
    const years = data
      .map((d) => d.data)
      .flat()
      .unique();

    formdata = { action: '/apis/download/pads', method: 'POST' };
    message = vocabulary['select download options'];

    opts.push({
      node: 'select',
      name: 'output',
      label: vocabulary['select format'],
      options: target_opts,
      classname: 'csv xlsx json geojson docx pdf',
      fn: resetFeatures,
    });
    opts.push({
      node: 'input',
      type: 'checkbox',
      name: 'use_templates',
      value: true,
      placeholder: vocabulary['use templates'],
      checked: true,
      default: true,
      classname: 'hide csv xlsx json geojson',
    });
    opts.push({
      node: 'input',
      type: 'checkbox',
      name: 'include_data',
      value: true,
      placeholder: vocabulary['include data'],
      checked: true,
      default: true,
      classname: 'hide csv xlsx json geojson docx',
    });
    opts.push({
      node: 'input',
      type: 'checkbox',
      name: 'include_toc',
      value: true,
      placeholder: 'Include table of contents', // TO DO: TRANSLATE
      checked: true,
      default: true,
      classname: 'hide docx',
    });
    if (notemplates) {
      opts.push({
        node: 'input',
        type: 'checkbox',
        name: 'standardize_structure',
        value: true,
        placeholder: 'Standardize structure', // TO DO: TRANSLATE
        checked: false,
        default: true,
        classname: 'hide docx',
      });
    }
    opts.push({
      node: 'input',
      type: 'checkbox',
      name: 'include_imgs',
      value: true,
      placeholder: vocabulary['include media'],
      default: true,
      classname: 'hide csv xlsx json geojson',
    });

    if (metafields.some((d) => ['index', 'tag'].includes(d.type))) {
      opts.push({
        node: 'input',
        type: 'checkbox',
        name: 'include_tags',
        value: true,
        placeholder: vocabulary['include tags'],
        default: true,
        classname: 'hide csv xlsx json geojson',
      });
    }
    if (metafields.some((d) => d.type === 'location')) {
      opts.push({
        node: 'input',
        type: 'checkbox',
        name: 'include_locations',
        value: true,
        placeholder: vocabulary['include locations'],
        default: true,
        classname: 'hide csv xlsx json geojson',
      });
    }
    if (
      metafields.some((d) => !['tag', 'index', 'location'].includes(d.type))
    ) {
      opts.push({
        node: 'input',
        type: 'checkbox',
        name: 'include_metafields',
        value: true,
        placeholder: vocabulary['include metafields'],
        default: true,
        classname: 'hide csv xlsx json geojson',
      });
    }
    opts.push({
      node: 'input',
      type: 'checkbox',
      name: 'include_engagement',
      value: true,
      placeholder: vocabulary['include engagement'],
      default: true,
      classname: 'hide csv xlsx json geojson',
    });
    opts.push({
      node: 'input',
      type: 'checkbox',
      name: 'include_comments',
      value: true,
      placeholder: vocabulary['include comments'],
      default: true,
      classname: 'hide csv xlsx json geojson',
    });
    // IN CASE THIS IS A SINGLE DOWNLOAD
    if (this?.name && this?.value) {
      opts.push({
        node: 'input',
        type: 'hidden',
        name: this?.name,
        value: this?.value,
      });
    } else {
      // ADD THE PAGE QUERY VARIABLES
      const url = new URL(window.location);
      const queryparams = new URLSearchParams(url.search);
      queryparams.forEach((value, key) => {
        if (key !== 'page' && value) {
          opts.push({
            node: 'input',
            type: 'hidden',
            name: key,
            value: value,
          });
        }
      });

      // <% Object.keys(query)?.forEach(d => {
      // 	if (Array.isArray(query[d])) {
      // 		query[d].forEach(c => { %>
      // 			opts.push({ node: 'input', type: 'hidden', name: '<%- d %>', value: '<%- c %>' })
      // 		<% })
      // 	} else { %>
      // 		opts.push({ node: 'input', type: 'hidden', name: '<%- d %>', value: '<%- query[d] %>' })
      // 	<% }
      // }) %>

      opts.push({
        node: 'input',
        type: 'hidden',
        name: 'space',
        value: space,
      });
    }

    // CHAPTERING OPTIONS FOR docx
    const chapter_opts = [
      {
        label: 'None', // TO DO: TRANSLATE
        value: 'none',
        type: 'radio',
      },
      {
        label: vocabulary['country'],
        value: 'country',
        type: 'radio',
      },
      {
        label: vocabulary['contributor']['singular'],
        value: 'ownername',
        type: 'radio',
      },
      {
        label: 'Year', // TO DO: TRANSLATE
        value: 'year',
        type: 'radio',
      },
    ];
    if (modules.some((d) => d.type === 'templates')) {
      chapter_opts.push({
        label: vocabulary['template']['singular'],
        value: 'template',
        type: 'radio',
      });
    }

    // opts.push({ node: 'select', name: 'chapters', label: 'Chapter by', options: chapter_opts, classname: 'hide docx', fn: limitSelection }) // TO DO: TRANSLATE
    opts.push({
      node: 'select',
      name: 'chapters',
      label: 'Chapter by', // TO DO: TRANSLATE
      options: chapter_opts,
      classname: 'hide docx',
    });

    opts.push({
      node: 'input',
      type: 'radio',
      name: 'format',
      value: 'cards',
      placeholder: 'Cards', // TO DO: TRANSLATE
      checked: true,
      default: true,
      classname: 'hide pdf',
    });

    // DOWNLOAD FOR EVERY CASE EXCEPT PDF
    // TO DO: CHANGE THIS BY ADDING pdf CLASSNAME BELOW
    opts.push({
      node: 'button',
      type: 'submit',
      name: 'render',
      value: true,
      disabled: true,
      label: vocabulary['download'],
      classname: 'submit hide csv xlsx json geojson docx',
    });
    // DOWNLOAD FOR PDF
    // TO DO: DEPRECATE THIS WHEN BACKEND pdf RENDERER IS COMPLETE
    opts.push({
      node: 'button',
      type: 'button',
      name: 'render',
      value: true,
      disabled: true,
      label: vocabulary['download'],
      classname: 'submit pdf',
      fn: downloadPDF,
    });

    function resetFeatures(data) {
      const { value } = data;
      const form = d3.select(this.form);

      form.selectAll(`li.opt`).each(function () {
        const sel = d3.select(this);
        const deactivate = !sel.classed(value);
        sel.classed('hide', deactivate);
        sel.selectAll('input:not([type=hidden])').each(function () {
          this.disabled = deactivate;
        }); // THIS DOES NOT SEEM TO DO ANYTHING
        sel.selectAll('button').attr('disabled', deactivate ? true : null);
      });
    }
    function limitSelection(data) {
      const { name, type, form: formnode } = this;
      const node = this;

      // .dropdown menu li
      const form = d3.select(formnode);
      form.selectAll(`input[name=${name}]`).each(function () {
        if (this !== node) {
          this.checked = false;
          d3.select(this.parentNode).classed('active', false);
        }
      });
    }
    function downloadPDF(data) {
      const elements = Array.from(this.form.elements).filter((elem) => {
        const sel = d3.select(elem);
        const parent = sel.findAncestor('li');
        return (
          !parent.classed('hide') && elem.checked && elem.name !== 'output'
        );
      });
      const url = new URL(window.location);
      const pathname = url.pathname.replace('/browse/', '/print/');
      const queryparams = new URLSearchParams(url.search);
      elements.forEach((d) => {
        queryparams.set(d.name, d.value);
      });
      queryparams.set('render', true);
      window.open(`${pathname}?${queryparams.toString()}`, '_blank');
    }
  } else if (object === 'contributors') {
    formdata = { action: '/apis/download/contributors', method: 'POST' };
    message = vocabulary['select download options'];

    opts.push({
      node: 'select',
      name: 'output',
      label: vocabulary['select format'],
      options: target_opts,
    });
    opts.push({
      node: 'input',
      type: 'checkbox',
      name: 'include_data',
      value: true,
      placeholder: vocabulary['include data'],
      checked: true,
      default: true,
    });
    opts.push({
      node: 'input',
      type: 'checkbox',
      name: 'include_teams',
      value: true,
      placeholder: 'Include team information', // TO DO: TRANSLATE
      checked: true,
      default: true,
    });
    opts.push({
      node: 'input',
      type: 'checkbox',
      name: 'include_contributions',
      value: true,
      placeholder: 'Include contributions information', // TO DO: TRANSLATE
      checked: true,
      default: true,
    });

    // ADD THE PAGE QUERY VARIABLES
    const url = new URL(window.location);
    const queryparams = new URLSearchParams(url.search);
    queryparams.forEach((value, key) => {
      if (key !== 'page' && value) {
        opts.push({ node: 'input', type: 'hidden', name: key, value: value });
      }
    });

    // <% Object.keys(query)?.forEach(d => {
    // 	if (Array.isArray(query[d])) {
    // 		query[d].forEach(c => { %>
    // 			opts.push({ node: 'input', type: 'hidden', name: '<%- d %>', value: '<%- c %>' })
    // 		<% })
    // 	} else { %>
    // 		opts.push({ node: 'input', type: 'hidden', name: '<%- d %>', value: '<%- query[d] %>' })
    // 	<% }
    // }) %>

    opts.push({
      node: 'input',
      type: 'hidden',
      name: 'space',
      value: space,
    });

    opts.push({
      node: 'button',
      type: 'submit',
      name: 'render',
      value: true,
      label: vocabulary['download'],
    });
  }

  const new_constraint = await renderFormModal({ message, formdata, opts });
}
