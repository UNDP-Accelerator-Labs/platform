import { getTranslations } from '/js/config/main.js';
import { POST } from '/js/fetch.js';
import { d3 } from '/js/globals.js';
import {
  getContent,
  getInnerText,
  getMediaSize,
  limitLength,
} from '/js/main.js';

const store_instructions = true;

// THE FOUR FOLLOWING FUNCTIONS ARE FOR THE SAVING MECHANISM
export async function switchButtons(lang = 'en') {
  const vocabulary = await getTranslations();
  const editing =
    JSON.parse(d3.select('data[name="page"]').node()?.value).activity ===
    'edit'; // TO DO: FIX HERE

  const mediaSize = getMediaSize();
  window.sessionStorage.setItem('changed-content', true);
  // PROVIDE FEEDBACK: UNSAVED CHANGES
  if (mediaSize === 'xs') {
    d3.select('.meta-status .btn-group .save button')
      .each(function () {
        this.disabled = false;
      })
      .html(vocabulary['save changes']);
  } else {
    const menu_logo = d3.select('nav#site-title .inner');
    window.sessionStorage.setItem('changed-content', true);
    menu_logo.selectAll('div.create, h1, h2').classed('hide', true);
    menu_logo
      .selectAll('div.save')
      .classed('hide saved', false)
      .select('button')
      .on('click', async (_) => {
        if (editing) await partialSave();
      })
      .html(vocabulary['save changes']);
  }
}

function retrieveItems(kwargs) {
  const { sel, datum } = kwargs;
  let text = '';

  // MEDIA
  if (datum.type === 'title') {
    datum.txt = (
      sel.select('.media-title').node() || sel.select('.meta-title').node()
    ).innerText;
    datum.has_content = datum.txt?.trim()?.length > 0;
    // items.push(datum);
    // SET THE fullTxt REPRESENTATION

    let innerText = '';
    if (datum.has_content && datum.txt) innerText += datum.txt;
    innerText = innerText.trim();
    if (innerText.length) {
      if (store_instructions && datum.instruction) {
        // text += `${datum.instruction}\n`; // THIS DOES NOT ACCOUNT FOR TRANSLATIONS
        text += `${sel.select('.instruction').node().innerText}\n`;
      }
      text += `${innerText}\n`;
    }

    return { item: datum, text };
  }
  if (['img', 'mosaic', 'video', 'files'].includes(datum.type)) {
    if (['mosaic', 'files'].includes(datum.type))
      datum.has_content = datum?.srcs?.filter((b) => b)?.length > 0;
    else datum.has_content = datum.src !== null && datum.src !== undefined;
    // items.push(datum);
    // SET THE fullTxt REPRESENTATION
    if (store_instructions && datum.instruction && datum.has_content) {
      // text += `${datum.instruction}\n`;
      text += `${sel.select('.instruction').node().innerText}\n`;
    }
    // NO SYSTEMATIC WAY OF GETTING img FOR fullTxt
    return { item: datum, text };
  } else if (datum.type === 'drawing') {
    datum.has_content = datum.shapes?.length > 0;
    // items.push(datum);
    // SET THE fullTxt REPRESENTATION
    if (store_instructions && datum.instruction && datum.has_content) {
      // text += `${datum.instruction}\n`;
      text += `${sel.select('.instruction').node().innerText}\n`;
    }
    // NO SYSTEMATIC WAY OF GETTING drawings FOR fullTxt
    return { item: datum, text };
  } else if (datum.type === 'txt') {
    datum.txt =
      getInnerText(sel.select('.media-txt')) ||
      getInnerText(sel.select('.meta-txt'));
    datum.has_content = datum.txt?.trim()?.length > 0;
    // items.push(datum);
    // SET THE fullTxt REPRESENTATION

    let innerText = '';
    if (datum.has_content && datum.txt) innerText += datum.txt;
    innerText = innerText.trim();
    if (innerText.length) {
      if (store_instructions && datum.instruction) {
        // text += `${datum.instruction}\n`;
        text += `${sel.select('.instruction').node().innerText}\n`;
      }
      text += `${innerText}\n`;
    }

    return { item: datum, text };
  } else if (datum.type === 'embed') {
    datum.html = (
      sel.select('.media-embed').node() || sel.select('.meta-embed').node()
    ).innerHTML;
    datum.has_content = datum.html?.trim()?.length > 0;
    // items.push(datum);
    // SET THE fullTxt REPRESENTATION
    let innerText = '';
    if (datum.has_content) {
      const newText =
        getInnerText(sel.select('.media-embed')) ||
        getInnerText(sel.select('.meta-embed')); // HERE WE DO NOT WANT THE html TAGS IN THE fullTxt
      if (newText) {
        innerText += newText;
      }
    }
    innerText = innerText.trim();
    if (innerText.length) {
      if (store_instructions && datum.instruction) {
        // text += `${datum.instruction}\n`;
        text += `${sel.select('.instruction').node().innerText}\n`;
      }
      text += `${innerText}\n`;
    }

    return { item: datum, text };
  } else if (['checklist', 'radiolist'].includes(datum.type)) {
    datum.has_content =
      datum.options.filter((b) => b.name?.length && b.checked).length > 0;
    const clone = JSON.parse(JSON.stringify(datum));
    clone.options = clone.options.filter((b) => b.name?.length);
    // items.push(clone);
    // SET THE fullTxt REPRESENTATION
    let innerText = '';
    if (datum.has_content)
      innerText += clone.options
        .filter((b) => b.name?.length && b.checked)
        .map((b) => b.name)
        .join('\n');
    innerText = innerText.trim();
    if (innerText.length) {
      if (store_instructions && datum.instruction) {
        // text += `${clone.instruction}\n`;
        text += `${sel.select('.instruction').node().innerText}\n`;
      }
      text += `${innerText}\n`;
    }

    // datum.options = datum.options.filter(b => b.name && b.name.length)
    // items.push(datum)
    return { item: clone, text };
  }
  // SPECIFIC META
  else if (datum.type === 'location') {
    datum.has_content = datum.centerpoints?.length > 0;
    // items.push(datum);
    // SET THE fullTxt REPRESENTATION
    if (store_instructions && datum.instruction && datum.has_content) {
      // text += `${datum.instruction}\n`;
      text += `${sel.select('.instruction').node().innerText}\n`;
    }
    // NO SYSTEMATIC WAY OF GETTING location FOR fullTxt
    return { item: datum, text };
  } else if (['tag', 'index'].includes(datum.type)) {
    datum.has_content = (datum.sdgs?.length || datum.tags?.length) > 0; // THIS IS LEGACY FOR THE ACTION PLANNING PLATFORM: TO DO: DEPRECATE
    // items.push(datum);
    // SET THE fullTxt REPRESENTATION
    let innerText = '';
    if (datum.has_content)
      innerText += (datum.sdgs || datum.tags)
        .map((b) => `${b.type}: ${b.name}`)
        .join('\n');
    innerText = innerText.trim();
    if (innerText.length) {
      if (store_instructions && datum.instruction) {
        // text += `${datum.instruction}\n`;
        text += `${sel.select('.instruction').node().innerText}\n`;
      }
      text += `${innerText}\n`;
    }

    return { item: datum, text };
  } else if (datum.type === 'attachment') {
    datum.has_content = datum.srcs?.length > 0;
    // items.push(datum);
    // SET THE fullTxt REPRESENTATION
    let innerText = '';
    if (datum.has_content)
      innerText += datum.srcs.map((b) => `${datum.name}: ${b}`).join('\n');
    innerText = innerText.trim();
    if (innerText.length) {
      if (store_instructions && datum.instruction) {
        // text += `${datum.instruction}\n`;
        text += `${sel.select('.instruction').node().innerText}\n`;
      }
      text += `${innerText}\n`;
    }

    return { item: datum, text };
  } else {
    return { item: null, text: null };
  }
}
async function getStatus() {
  const vocabulary = await getTranslations();
  const mainobject = d3.select('data[name="object"]').node()?.value;
  const page = JSON.parse(d3.select('data[name="page"]').node()?.value);
  const pad = JSON.parse(d3.select('data[name="pad"]').node()?.value);
  const { metafields } = JSON.parse(
    d3.select('data[name="site"]').node()?.value,
  );

  const main = d3.select(`#${mainobject}`);
  const head = main.select('.head');
  const body = main.select('.body');

  const completion = [];

  const title =
    head.select('.title').node()?.innerText ||
    (body.select('.media-title').node() || body.select('.meta-title').node())
      ?.innerText ||
    vocabulary['missing title'];
  completion.push(title?.trim()?.length > 0);

  let metacompletion = JSON.parse(JSON.stringify(metafields))
    .filter((d) => d.required)
    .map((d) => d.label);

  function checkCompletion(d) {
    if (
      (pad.type === 'templated' &&
        [null, undefined].includes(pad.template.medium)) ||
      page.type === 'public'
    ) {
      if (d.required === null || d.required === undefined)
        throw new Error('there is no requirement: this should not happen');
      if (d.required === false) return true;
      else return d.has_content === true;
    } else {
      metacompletion = metacompletion.map((c) =>
        c === d.name ? d.has_content === true : c,
      );
    }
  }

  main.selectAll('.layout:not(.description-layout)').each(function (d) {
    const items = [];
    const sel = d3.select(this);

    sel.selectAll('.media-container, .meta-container').each(function (c) {
      const sel = d3.select(this);
      const ingroup = sel.findAncestor('group-container');
      // GROUPS
      if (c.type === 'group') {
        sel.selectAll('.media-group-items').each(function () {
          const sel = d3.select(this);
          const subitems = [];
          sel
            .selectAll('.media-container, .meta-container')
            .each(function (b) {
              const { item } = retrieveItems({
                sel: d3.select(this),
                datum: b,
              });
              if (item) subitems.push(item);
            });

          completion.push(
            subitems.map(checkCompletion).every((d) => d === true),
          );
        });
      } else {
        if (!ingroup) {
          const { item } = retrieveItems({ sel, datum: c });
          if (item) items.push(item);
        }
      }
    });
    if (items.length)
      completion.push(items.map(checkCompletion).every((d) => d === true));
  });

  if (
    (pad.type === 'templated' &&
      [null, undefined].includes(pad.template.medium)) ||
    page.type === 'public'
  ) {
    console.log('override default requirements');
    return completion.every((d) => d === true);
  } else {
    console.log('default requirements');
    return metacompletion.every((d) => d === true);
  }
  // if (!templated) return metacompletion.every(d => d === true)
  // else return !completion.unique().includes(false)
  // else return completion.every(d => d === true)
}
async function compileContent(attr) {
  const vocabulary = await getTranslations();
  const mainobject = d3.select('data[name="object"]').node()?.value;
  const { media_value_keys, metafields } = JSON.parse(
    d3.select('data[name="site"]').node()?.value,
  );
  const pad = JSON.parse(d3.select('data[name="pad"]').node()?.value);

  const main = d3.select(`#${mainobject}`);
  const head = main.select('.head');
  const body = main.select('.body');

  const content = {};
  // COLLECT TITLE
  let title =
    head.select('.title').node()?.innerText ||
    (body.select('.media-title').node() || body.select('.meta-title').node())
      ?.innerText ||
    vocabulary['missing title'];
  if (title) title = limitLength(title, 99);
  // MAYBE INCLUDE ALERT IF title IS EMPTY

  // COLLECT ALL MEDIA
  const sections = [];
  let fullTxt = title !== null ? `${title}\n\n` : '';

  main.selectAll('.layout:not(.description-layout)').each(function (d) {
    const items = [];
    let itemstext = '';
    const sel = d3.select(this);

    const section_title = (sel.select('.section-header h1').node() || {})
      .innerText;
    const section_lead = getInnerText(sel.select('.media-lead'));
    const section_instruction = (
      sel.select('.media-repeat button div').node() || {}
    ).innerText;

    if (pad.type !== 'templated') {
      d.title = section_title;
      d.lead = section_lead;
      d.instruction = section_instruction;
    }

    sel.selectAll('.media-container, .meta-container').each(function (c) {
      const sel = d3.select(this);
      const ingroup = sel.findAncestor('group-container');
      // GROUPS
      if (c.type === 'group') {
        const groupitems = [];
        let grouptext = '';
        sel.selectAll('.media-group-items').each(function () {
          const sel = d3.select(this);
          const subitems = [];
          let subtext = '';
          sel
            .selectAll('.media-container, .meta-container')
            .each(function (b) {
              const { item, text } = retrieveItems({
                sel: d3.select(this),
                datum: b,
              });
              if (item) subitems.push(item);
              if (text) subtext += `${text}\n`;
            });
          groupitems.push(subitems);
          grouptext += `${subtext}\n`;
        });
        c.items = groupitems;
        items.push(c);
        itemstext += `${grouptext}\n`;
      } else {
        if (!ingroup) {
          const { item, text } = retrieveItems({ sel, datum: c });
          if (item) items.push(item);
          if (text) itemstext += `${text}\n`;
        }
      }
    });

    d.items = items;
    sections.push(d);

    itemstext = itemstext.trim();
    if (itemstext.length) {
      if (store_instructions && section_title !== undefined) {
        fullTxt += `${section_title}\n`;
      }
      if (store_instructions && section_lead !== undefined) {
        fullTxt += `${section_lead}\n`;
      }
      fullTxt += `${itemstext}\n`;
    }
  });

  // const location = main.select('.location-container').node() ? main.select('.location-container').datum() : null // THIS IS NOT NEEDED
  // let skills = main.select('.skills-container').node() ? main.select('.skills-container').datum().tags.map(d => d.name) : null

  // THIS SHOULD REPLAE WHAT IS ABOVE

  // if (main.select('.sdgs-container').node()) {
  // 	main.selectAll('.sdgs-container').each(d => {
  // 		d.tags.forEach(c => {
  // 			// THE FILTERING HERE IS MAINLY FOR LEGACY, BECAUSE ORIGINALLY sdgs WERE ONLY THE keys, NOT THE { key: INT, name: STR } OBJECT
  // 			if (Object.keys(c).includes('key') && Object.keys(c).includes('name')) {
  // 				allTags.push({ id: c.key, name: c.name, type: d.type.slice(0, -1) })
  // 			}
  // 		})
  // 	})
  // }

  const allTags = [];
  metafields
    .filter((d) => ['tag', 'index'].includes(d.type))
    .forEach((d) => {
      main.selectAll(`.${d.label}-container .tag input:checked`).each((c) => {
        // THE FILTERING HERE IS MAINLY FOR LEGACY, BECAUSE ORIGINALLY tags WERE ONLY THE names, NOT THE { id: INT, name: STR } OBJECT
        if (c.id && c.name && c.type)
          allTags.push({ id: c.id, type: c.type, name: c.name });
      });
    });
  content.tagging = allTags;

  if (main.select('.location-container').node()) {
    content.locations = main
      .select('.location-container')
      ?.datum()?.centerpoints;
  } else content.locations = null;

  const otherMetadata = [];
  metafields
    .filter((d) => !['tag', 'index', 'location'].includes(d.type))
    .forEach((d) => {
      main.selectAll(`.${d.label}-container`).each((c) => {
        const { item } = retrieveItems({ sel: d3.select(this), datum: c });
        if (item) otherMetadata.push(item);
      });
    });
  content.metadata = otherMetadata
    .map((d) => {
      const { id, level, has_content, instruction, required, ...metadata } = d;
      const { type, name } = metadata;
      // const valuekey = Object.keys(metadata).find(c => <%- JSON.stringify(locals.metadata.site.media_value_keys) %>.includes(c))
      const valuekey = Object.keys(metadata).find((c) =>
        media_value_keys.includes(c),
      ); // TO DO: MAKE SURE THIS WORKS
      const value = metadata[valuekey];

      if (Array.isArray(value)) {
        return value
          .filter((c) => {
            if (valuekey === 'options') return c.checked === true;
            else return c;
          })
          .map((c) => {
            if (valuekey === 'options')
              return { type, name, value: c.name, key: c.id };
            else return { type, name, value: c };
          });
      } else return { type, name, value };
    })
    .flat();

  fullTxt = fullTxt.trim();
  // console.log(fullTxt);
  // ALWAYS SEND fullTxt
  content.full_text = fullTxt;

  // COLLECT DELETED MATERIAL (THIS WILL BE CLEARED FROM SESSIONSTORAGE UPON SUCCESS)
  const deletion = JSON.parse(window.sessionStorage.getItem('deleted')) || [];

  // IF THIS IS A NEW PAD, CHECK WHETHER IT HAS A SOURCE
  // if (activity === 'contribute')
  // ALWAYS SEND THE SOURCE (BECAUSE reviews DEPEND ON THE SOURCE)
  // content.source = <%- locals.source || JSON.stringify(locals.source) || JSON.stringify(null) %>;
  content.source = pad.source;
  // ALWAYS SAVE THE TITLE
  content.title = title;
  if (
    !attr ||
    ['title', 'lead', 'media', 'meta', 'group'].includes(attr) ||
    sections
      .map((d) => d.items)
      .flat()
      .unique('type', true)
      .includes(attr)
  ) {
    content.sections = sections;
  }
  // if (!attr || attr === 'meta' || meta.unique('type', true).includes(attr)) content.meta = JSON.stringify(meta)
  // if (!attr || attr === 'location') content.location = JSON.stringify(location)
  // if (!attr || attr === 'sdgs') content.sdgs = JSON.stringify(sdgs)
  // if (!attr || attr === 'tag') content.tags = JSON.stringify(tags)
  // if (!attr || attr === 'skills') content.skills = JSON.stringify(skills)
  // if (!attr || attr === 'datasources') content.datasources = JSON.stringify(datasources)

  // FULL TEXT
  // if (!attr || ['title', 'lead', 'txt', 'embed', 'checklist', 'radiolist', 'tags', 'group'].includes(attr))

  // ALWAYS SEND status
  const completion = await getStatus();
  content.completion = completion;
  // ALWAYS SEND deletion IF THERE IS SOMETHING TO DELET
  if (deletion.length) content.deletion = deletion;

  return content;
}
export async function partialSave(attr) {
  const object = d3.select('data[name="object"]').node().value;

  console.log('saving');
  // FIRST CHECK IF THIS IS A NEW PAD
  const content = await compileContent(attr);
  // CHECK IF THE PAD ALREADY HAS AN id IN THE DB
  const url = new URL(window.location);
  const queryparams = new URLSearchParams(url.search);
  let id = queryparams.get('id');
  if (id) content.id = +id;
  const template = queryparams.get('template');
  if (template) content.template = +template;
  const mobilization = queryparams.get('mobilization');
  if (mobilization) content.mobilization = +mobilization;

  return await POST(`/save/${object}`, content)
    .then(async (res) => {
      const vocabulary = await getTranslations();
      // ADD THE NOTIFICATION
      window.sessionStorage.removeItem('changed-content');

      const mediaSize = getMediaSize();
      if (['xs', 'sm'].includes(mediaSize)) {
        const save_btn = d3
          .select('.meta-status .btn-group .save')
          .classed('saved', true);
        save_btn.select('button').html(vocabulary['changes saved']);
        window.setTimeout((_) => {
          save_btn
            .classed('saved', false)
            .select('button')
            .each(function () {
              this.disabled = true;
            })
            .html(vocabulary['save']);
        }, 1000);
      } else {
        const menu_logo = d3.select('nav#site-title .inner');
        menu_logo
          .select('.save')
          .classed('saved', true)
          .select('button')
          .html(vocabulary['changes saved']);
        window.setTimeout((_) => {
          menu_logo.selectAll('div.create, h1, h2').classed('hide', false);
          menu_logo.selectAll('div.save').classed('hide', true);
        }, 1000);
      }

      // REMOVE ITEMS TO DELETE
      window.sessionStorage.removeItem('deleted');
      // CHANGE THE URL TO INCLUDE THE PAD ID
      if (!id) {
        // INSERT
        id = res.data.id;
        queryparams.append('id', id);
        url.search = queryparams.toString();
        // BASED ON:
        // https://usefulangle.com/post/81/javascript-change-url-parameters
        // https://www.30secondsofcode.org/blog/s/javascript-modify-url-without-reload
        const nextURL = url.toString().replace('contribute', 'edit');
        const nextTitle = 'Update pad'; // TO DO: RESET FOR TEMPLATE
        const nextState = { additionalInformation: 'Updated the URL with JS' };
        window.history.pushState(nextState, nextTitle, nextURL);
        // REMOVE THE templates MENU
        // d3.select('nav#filter').remove()

        // SET THE ID FOR THE PUBLISH AND GENERATE FORMS
        d3.selectAll('div.meta-status form input[name="id"]').attr(
          'value',
          id,
        );
        // d3.select('div.meta-status form.generate-pdf input[name="id"]').attr('value', res.object)
      }
      await updateStatus(res.data.status);
      return id;
    })
    .catch((err) => console.log(err));
}
export async function updateStatus(_status) {
  const curr_status = await getContent({ feature: 'status' });

  if (!_status) {
    const completion = await getStatus();
    if (completion) _status = Math.max(1, curr_status);
    else _status = 0;
  }

  // ACTIVATE THE PUBLISHING OPTIONS AT THE END
  const metastatus = d3
    .select('div.meta-status')
    .classed('status-0 status-1 status-2', false)
    .classed(`status-${_status}`, true);
  metastatus
    .select('div.btn-group form button.publish')
    .attr('disabled', _status >= 1 && curr_status <= 2 ? null : true);
  metastatus
    .select('div.btn-group form button.generate-pdf')
    .attr('disabled', _status > 0 ? null : true);
}
export async function saveAndSubmit(node) {
  await partialSave();
  node.form.submit();
  // TO DO: PROVIDE FEEDBACK
  // CREATE A THANK YOU PAGE
  // AND MAYBE AUTO CREATE A PUBLIC PINBOARD FOR OPEN MOBILIZATIONS
  // SO THAT AUTHORS CAN GO CHECK THEM OUT
}
