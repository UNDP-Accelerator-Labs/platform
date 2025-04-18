import { getCurrentLanguage, getTranslations } from '/js/config/main.js';
import { addSection } from '/js/contribute/pad/render.js';
import { POST } from '/js/fetch.js';
import { XLSX, d3 } from '/js/globals.js';
import { toggleClass } from '/js/main.js';
import { renderPromiseModal } from '/js/modals.js';
import { isLoading } from '/js/notification/loader.js';

export async function dropHandler(evt, node) {
  evt.preventDefault();
  const sel = d3.select(node);
  const label = sel.select('.drop-zone button label');

  if (evt.dataTransfer.items) {
    // DataTransferItemList INTERFACE TO ACCES THE FILE
    const items = evt.dataTransfer.items;

    if (items.length > 1) {
      const vocabulary = await getTranslations();
      sel.classed('accept', false).classed('reject', true);
      label.html(vocabulary['chose only one file']['xlsx']);
    } else {
      const item = items[0];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (
          file.type ===
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ) {
          parseXLSX(file, d3.select(node).select('input[type=file]').node());
        } else {
          const vocabulary = await getTranslations();
          sel.classed('accept', false).classed('reject', true);
          label.html(vocabulary['chose file']['xlsx']);
        }
      } else {
        const vocabulary = await getTranslations();
        sel.classed('accept', false).classed('reject', true);
        label.html(vocabulary['chose file']['xlsx']);
      }
    }
  } else {
    // DataTransfer INTERFAE TO ACCESS THE FILE
    const items = evt.dataTransfer.files;
    if (items.length > 1) {
      const vocabulary = await getTranslations();
      sel.classed('accept', false).classed('reject', true);
      label.html(vocabulary['chose only one file']['xlsx']);
    } else {
      const file = evt.dataTransfer.files[0];
      if (
        file.type ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ) {
        parseXLSX(file, d3.select(node).select('input[type=file]').node());
      } else {
        const vocabulary = await getTranslations();
        sel.classed('accept', false).classed('reject', true);
        label.html(vocabulary['chose file']['xlsx']);
      }
    }
  }
}
export function parseXLSX(file, node) {
  const reader = new FileReader();

  d3.select(node).attr('data-fname', file.name);

  reader.onload = async function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array', bookFiles: true });

    const images = [];
    if (workbook.keys) {
      const media = workbook.keys.filter((k) => k.includes('media/image'));

      for (let i = 0; i < media.length; i++) {
        const m = media[i];
        const name = workbook.files[m].name;
        const buffer = workbook.files[m].content.buffer;

        const bytes = new Uint8Array(buffer);
        const data = btoa(
          bytes.reduce((d, b) => d + String.fromCharCode(b), ''),
        );
        const { src } = await POST('/request/img/', {
          data,
          name,
          from: 'buffer',
        });

        images.push({ id: name?.extractDigits(), type: 'img', src });
      }
      // images = media.map(async(m, i) => {
      //   const name = workbook.files[m].name; // .split('media/')[1]
      //   const buffer = workbook.files[m].content.buffer; // workbook.files[m]._data?.getContent()

      //   // const blob = new Blob([buffer], { type: 'image/png' });
      //   // const urlCreator = window.URL || window.webkitURL;
      //   // const imageUrl = urlCreator.createObjectURL(blob);

      //   // const str = btoa(String.fromCharCode.apply(null, buffer))
      //   // console.log(`data:image/png;base64,${btoa}`)

      //   const bytes = new Uint8Array(buffer)
      //   const data = btoa(bytes.reduce((d, b) => d + String.fromCharCode(b), ''))

      //   if (i === 0) {
      //     const { src } = await POST('/request/blob/', { data, name, type: 'blob' })
      //     console.log(src)
      //     return { id: name?.extractDigits(), type: 'img', src };
      //   }
      // });
    }
    const sheets = workbook.SheetNames.map((s, i) => {
      return (async () => {
        const json = XLSX.utils.sheet_to_json(workbook.Sheets[s], {
          defval: null,
        });

        const keys = Object.keys(json[0] || {});
        if (images.length) {
          // WE FIRST NEED TO FIND WHICH COLUMN THE IMAGES WOULD BE IN
          // THIS SHOULD BE A FULLY EMPTY COLUMN, WITH VALUES SET TO null, AS PER THE defval
          const cols = keys.map((d) => {
            const obj = {};
            obj.key = d;
            obj.values = json.map((c) => c[d]).filter((c) => c); // VALUES IS SPARSE: IT ONLY KEEPS EXISTING (NOT null, AS PER THE defval) VALUES
            return obj;
          });
          const imageCol = cols.find((d) => !d.values.length)?.key || null;
          if (imageCol) {
            json.forEach((d, i) => {
              // THIS IS WHERE WE ASSOCIATE IMAGES BY INDEX (WHICH IS WHY IMAGES HAVE TO BE ADDED OR LAYERED IN THE CORRECT ORDER IN EXCEL)
              d[imageCol] = images.find((c) => c.id === i + 1);
            });
          }
        }
        if (i === 0) {
          // TO DO: THIS IS TEMP WHILE WE DO NOT ASK FOR SHEET OF INTEREST
          const cols = parseColumns(json, keys);
          await renderTable(cols);
        }
      })();
    });
    for (const sheet of sheets) {
      await sheet;
    }
    // HIDE THE LOADING BUTTON
    const main = d3.select('div.table main');
    const layout = main.select('div.inner');
    const head = layout.select('div.head');

    main.select('.input-group').classed('hide', true);
    head
      .classed('status-0', false)
      .classed('status-1', true)
      .select('button[type=submit]')
      .attr('disabled', null);
  };
  reader.readAsArrayBuffer(file);
}
function parseColumns(json, keys) {
  return keys.map((d) => {
    const obj = {};
    obj.key = d;
    obj.entries = json.map((c) => {
      // ENTRIES, UNLIKE VALUES, IS EXHAUSTIVE (IT ALSO INCLUDES NULL/ MISSING VALUES)
      // CHECK IF DATE
      const testdate = window.ExcelDateToJSDate(c[d]);
      if (window.isValidDate(testdate) && testdate.getFullYear() >= 2019) {
        return testdate.toISOString();
      } else {
        const e = c[d];
        if (![null, undefined].includes(e) && !isNaN(e) && typeof e !== 'string')
          return +e; // IF e IS A NUMBER, FORCE TYPE
        else if (typeof e === 'string') return e?.trim();
        else return e;
      }
    });
    let ref = obj.entries
      .filter((c) => ![null, undefined].includes(c))
      .map((c) => (typeof c === 'string' ? c.trim().toLowerCase() : c));
    obj.values = ref.unique();
    obj.types = ref.map((c) => typeof c).unique();

    if (obj.types.length > 1 && obj.types.includes('string')) {
      // IF THERE ARE MULTIPLE TYPES AND AT LEAST ONE OF THEM IS STRING, CONVERT ALL NOT NULL ENTRIES TO STRINGS
      obj.entries = obj.entries.map((c) => {
        if ([null, undefined].includes(c)) return c;
        else return String(c).trim(); // .toLowerCase()
      });
      ref = obj.entries
        .filter((c) => ![null, undefined].includes(c))
        .map((c) => c.toLowerCase());
      obj.values = ref.unique();
      // obj.types = ['string']
      obj.types = ref.map((c) => typeof c).unique(); // THIS SHOULD BE ['string']
    } else if (obj.types.length === 0) {
      // IF THERE ARE NO TYPES
      if (ref.length && ref.unique().every((c) => c === 0)) {
        obj.entries = obj.entries.map((c) => 0);
        ref = obj.entries.filter((c) => c === 0);
        obj.values = ref.unique();
        // obj.types = ['number']
        obj.types = ref.map((c) => typeof c).unique(); // THIS SHOULD BE ['number']
      } else {
        obj.types = [typeof null];
      }
    }

    // CHECK IF THERE ARE ARRAYS/ LISTS
    obj.types.forEach((c) => {
      if (Array.isArray(c)) {
        const listcontent = c.map((b) => typeof b).unique();
        return `list of ${listcontent}s`; // TO DO: TRANSLATE
      } else return c;
    });

    // CHECK IF BOOLEAN COLUMN
    // if (obj.values.length === 1 && ref.length !== json.map(c => c[d]).length) obj.bool = true
    if (obj.types.length === 1 && obj.values.length <= 2) obj.bool = true;
    else obj.bool = false;
    // INFER TYPE
    if (
      obj.entries
        .map((c) =>
          c
            ? typeof c === 'object'
              ? c.type === 'img'
                ? c.type
                : null
              : null
            : null,
        )
        .filter((c) => c)
        .unique().length || // c.type === 'img' IS SET IN parseXLSX AT THE VERY BEGINNING
      // || !obj.entries.filter(c => ![null, undefined].includes(c)).length
      ref.length === 0
      // THERE ISN'T ANY ENTRY THAT HAS A VALUE (CASE FOR ENTIRELY EMPTY COLUMN)
    ) {
      obj.type = 'img';
      // obj.inferredtype = 'img'
    } else if (ref.length - obj.values.length > parseInt(ref.length * 0.25)) {
      // obj.inferredtype = 'checklist' // IF LESS THAN 3/4 OF ENTRIES ARE UNIQUE, CONSIDER A list
      obj.type = 'checklist'; // IF LESS THAN 3/4 OF ENTRIES ARE UNIQUE, CONSIDER A list
    } else obj.type = 'txt';
    // } else obj.inferredtype = 'txt'

    return obj;
  });
}
function parseGroups(json, keys) {
  // json HERE HAS ALREADY BEEN PROCESSED (IN parseColumns)
  const cols = keys.map((d) => {
    return (async () => {
      // CHECK IF KEY IS UNIQUE OR GROUPED
      if (Array.isArray(d)) {
        const obj = {};
        obj.key = `Group [${d.join(', ')}]`;
        const prefix = seekPrefix(d);

        const cols = json.filter((c) => d.includes(c.key));
        const zip = [];

        let rmprefix = false;
        let mklist = true;
        const types = cols
          .map((c) => c.types)
          .flat()
          .unique();

        if (
          cols
            .map((c) => c.bool)
            .unique()
            .includes(true)
        ) {
          // IF THE VALUES ARE BOLEAN, PIVOT: PUT THE key/ HEADERS INTO THE values/ CELLS
          // AND CHECK WHETHER THE keys HAVE PREFIXES
          const message = `The prefix <em>${prefix}</em> was detected. Should it be removed from cell values?`;
          const opts = [
            {
              node: 'button',
              type: 'button',
              label: 'Keep it',
              resolve: false,
            },
            {
              node: 'button',
              type: 'button',
              label: 'Drop it',
              resolve: true,
            },
          ];
          rmprefix = await renderPromiseModal({
            message: message,
            opts: opts,
          });
        } else if (types.length === 1 && types[0] === 'string') {
          const message = `Merge columns into a list, or keep a single ${types[0]} with all the values?`;
          const opts = [
            {
              node: 'button',
              type: 'button',
              label: 'Make a list',
              resolve: true,
            },
            {
              node: 'button',
              type: 'button',
              label: `Keep as ${types[0]}`,
              resolve: false,
            },
          ];
          mklist = await renderPromiseModal({ message: message, opts: opts });
        }

        cols.forEach((c) => {
          // IF THE VALUES ARE BOLEAN, PIVOT
          if (c.bool) {
            c.entries = c.entries.map((b) => {
              if (b) return rmprefix ? c.key.replace(prefix, '') : c.key;
              else return null;
            });
          }
          // ZIP THE entries
          for (let i = 0; i < c.entries.length; i++) {
            if (c.entries[i]) {
              if (!isNaN(c.entries[i])) c.entries[i] = +c.entries[i];
              if (!zip[i]) zip[i] = [c.entries[i]];
              else zip[i].push(c.entries[i]);
            }
          }
        });
        obj.entries = mklist ? zip : zip.map((c) => c.join(', '));

        obj.values = cols
          .map((c) =>
            c.entries.map((b) =>
              typeof b === 'string' ? b.trim().toLowerCase() : b,
            ),
          )
          .flat()
          .filter((c) => ![null, undefined].includes(c))
          .unique()
          .sort();

        obj.types = obj.entries
          .map((c) => {
            if (Array.isArray(c)) {
              const listcontent = c.map((b) => typeof b).unique();
              return `list of ${listcontent}s`;
            } else return typeof c;
          })
          .unique();
        obj.bool = false;
        // obj.inferredtype = 'checklist'
        obj.type = 'checklist';
        return obj;
      }
      return json.find((c) => c.key === d);
    })();
  });
  Promise.all(cols).then(async (data) => await renderTable(data));
}
async function renderTable(cols, update = false) {
  const vocabulary = await getTranslations();
  const { metafields } = JSON.parse(
    d3.select('data[name="pad"]').node().value,
  );

  const main = d3.select('div.table main');
  const layout = main.select('div.inner');
  const body = layout.select('div.body');
  const foot = layout.select('div.foot');

  body.select('.btn-group').classed('hide', false);
  const table = body
    .addElems('div', 'table-container')
    .addElems('table', 'xls-preview', [cols])
    .attrs({
      border: 0,
      cellpadding: 0,
      cellspacing: 0,
    });
  // RENDER THE TABLE HEAD
  const moduleHead = table.addElems('thead');

  const selectCols = moduleHead.addElems('tr', 'column-selection');
  selectCols
    .addElems('th', 'selection', (d) => d)
    .classed('selected left right top bottom disabled', false)
    .attr('title', 'Select column.') // TO DO: TRANSLATE
    .on('click', function (d, i) {
      const evt = d3.event;
      const node = this;
      const sel = d3.select(this);

      if (
        (evt.shiftKey || evt.metaKey || evt.ctrlKey) &&
        sel.classed('disabled')
      )
        return null;
      if (!evt.shiftKey && !evt.metaKey && !evt.ctrlKey)
        d3.selectAll('tr th, tr td').classed(
          'selected top bottom left right',
          false,
        );

      toggleClass(this, 'selected');
      const trs = table.selectAll('tr');
      trs.each(function (c, j) {
        let caps = '';
        if (j === 0) caps = 'top';
        else if (j === trs.size() - 1) caps = 'bottom';

        d3.select(this)
          .selectAll('th, td')
          .each(function (b, k) {
            if (k === i) {
              const next = this.nextSibling;
              const previous = this.previousSibling;
              const sides = [];

              if (!previous?.classList.contains('selected'))
                sides.push('left');
              else {
                if (sel.classed('selected'))
                  previous?.classList.remove('right');
                else previous?.classList.add('right');
              }

              if (!next?.classList.contains('selected')) sides.push('right');
              else {
                if (sel.classed('selected')) next?.classList.remove('left');
                else next?.classList.add('left');
              }

              d3.select(this).classed(
                `selected ${caps} ${sides.join(' ')}`,
                sel.classed('selected'),
              );
            }
          });
      });

      moduleHead
        .selectAll('.column-selection th')
        .classed('disabled', function (c) {
          if (this === node) return false;
          if (c.types) {
            if (!d.types.length) {
              if (!c.types.length) return false;
              else if (c.types.includes('number')) return false;
              else return true;
            } else {
              if (!c.types.length) return false;
              else if (c.types.intersection(d.types).length > 0) return false;
              else return true;
            }
          }
        });

      // THIS IS FOR RANGE SELECTIONS
      if (sel.classed('selected') && evt.shiftKey) {
        let bounds = [];
        let currentidx = 0;
        const range = [];

        moduleHead.selectAll('.column-selection th').each(function (c, j) {
          if (d3.select(this).classed('selected')) bounds.push(j);
          if (this === node) currentidx = j;
        });

        bounds.sort((a, b) => a - b);
        let location = bounds.indexOf(currentidx);
        if (location === -1) {
          bounds.push(currentidx);
          bounds.sort((a, b) => a - b);
          location = bounds.indexOf(currentidx);
        }

        if (location !== 0) bounds = bounds.slice(0, location + 1);

        // SET RANGE OF SELECTED COLUMNS
        moduleHead.selectAll('.column-selection th').each(function (c, j) {
          if (
            !d3.select(this).classed('disabled') &&
            j >= Math.min(...bounds) &&
            j <= Math.max(...bounds)
          ) {
            range.push(j);
          }
        });

        const trs = table.selectAll('tr');
        trs.each(function (c, j) {
          let caps = '';
          if (j === 0) caps = 'top';
          else if (j === trs.size() - 1) caps = 'bottom';

          d3.select(this)
            .selectAll('th, td')
            .classed('top bottom left right', false)
            .each(function (b, k) {
              const sides = [];
              if (!range.includes(k - 1)) sides.push('left');
              if (!range.includes(k + 1)) sides.push('right');
              if (range.includes(k)) {
                d3.select(this).classed(
                  `selected ${caps} ${sides.join(' ')}`,
                  sel.classed('selected'),
                );
              }
            });
        });
      }
    })
    .addElems('i', 'material-icons google-translate-attr')
    .html('tab_unselected');

  const columnheaders = moduleHead.addElems('tr', 'column-names');
  columnheaders
    .addElems('th', 'name', (d) => d)
    .classed('selected left right top bottom', false)
    .attrs({
      title: (d) => d.key,
      contenteditable: true,
    })
    .html((d) => (d.key.length > 12 ? `${d.key.slice(0, 12)}…` : d.key))
    .on('focus', function (d) {
      d3.select(this).html(d.key);
    })
    .on('blur', function (d) {
      d.key = this.innerText;
      d3.select(this).html((d) =>
        d.key.length > 12 ? `${d.key.slice(0, 12)}…` : d.key,
      );
    });

  const datatypes = moduleHead
    .addElems('tr', 'data-types')
    .addElems('th', 'data', (d) => d)
    .classed('selected left right top bottom', false);
  datatypes.addElems('label').html((d) => d.types);
  datatypes
    .addElems('button', 'parse', (d) =>
      d.types.includes('string') ? [d] : [],
    )
    .addElems('i', 'material-icons google-translate-attr')
    .html('list')
    .on('click', async function (d) {
      const message = `Split the string data in this column into a list using <input type='text' name='separator' value=',' minlength=1 maxlength=1> separators.`; // TO DO: TRANSLATE
      const opts = [
        {
          node: 'button',
          type: 'button',
          label: 'Split strings',
          resolve: (_) =>
            d3.select('.modal input[name="separator"]').node().value,
        },
      ];
      const separator = await renderPromiseModal({
        message: message,
        opts: opts,
      });
      await splitValues(d.key, separator);
    });

  const columntypes = moduleHead
    .addElems('tr', 'media-types')
    .addElems('th', 'type', (d) => d)
    .classed('selected left right top bottom', false)
    .addElems('select')
    .on('change', function (d) {
      const selection = this.options[this.selectedIndex].value;

      if (columntypes.selectAll('option[value="title"]:checked').size()) {
        columntypes
          .selectAll('option[value="title"]:not(:checked)')
          .attr('disabled', true);
      } else
        columntypes
          .selectAll('option[value="title"]:not(:checked)')
          .attr('disabled', (c) => c.disabled);

      if (metafields.some((c) => c.type === 'location')) {
        if (
          columntypes
            .selectAll(
              'option[value="location-txt"]:checked, option[value="location-lat-lng"]:checked, option[value="location-lng-lat"]:checked',
            )
            .size()
        ) {
          columntypes
            .selectAll('option[value="location-txt"]:not(:checked)')
            .attr('disabled', true);
          columntypes
            .selectAll('option[value="location-lat-lng"]:not(:checked)')
            .attr('disabled', true);
          columntypes
            .selectAll('option[value="location-lng-lat"]:not(:checked)')
            .attr('disabled', true);
        } else {
          columntypes
            .selectAll('option[value="location-txt"]:not(:checked)')
            .attr('disabled', (c) => c.disabled);
          columntypes
            .selectAll('option[value="location-lat-lng"]:not(:checked)')
            .attr('disabled', (c) => c.disabled);
          columntypes
            .selectAll('option[value="location-lng-lat"]:not(:checked)')
            .attr('disabled', (c) => c.disabled);
        }
      }

      metafields
        .filter((c) => c.type !== 'location')
        .forEach((c) => {
          if (
            columntypes.selectAll(`option[value="${c.label}"]:checked`).size()
          ) {
            columntypes
              .selectAll(`option[value="${c.label}"]:not(:checked)`)
              .attr('disabled', true);
          } else
            columntypes
              .selectAll(`option[value="${c.label}"]:not(:checked)`)
              .attr('disabled', (c) => c.disabled);
        });

      d.type = selection;
    });
  columntypes
    .addElems('optgroup', 'group-media')
    .attr('label', 'media') // TO DO: TRANSLATE ALL MEDIA values BELOW
    .addElems('option', 'opt', (d) => {
      const containsURLs = d.entries
        .flat()
        .filter((c) => ![null, undefined].includes(c))
        .every((c) => typeof c === 'string' && c.isURL());
      const obj = [];

      obj.push({
        label: 'title',
        value: 'title',
        disabled: d.types.some((c) => ['string', 'number'].includes(c))
          ? null
          : true,
      });
      obj.push({
        label: 'text',
        value: 'txt',
        disabled: d.types.some((c) =>
          ['string', 'number', 'list of strings', 'list of numbers'].includes(
            c,
          ),
        )
          ? null
          : true,
      });
      obj.push({
        label: 'embedding',
        value: 'embed',
        disabled: d.types.some((c) => ['string', 'number'].includes(c))
          ? null
          : true,
      });

      obj.push({
        label: 'image',
        value: 'img',
        disabled: d.types.some(
          (c) =>
            (c === 'object' && ['img', 'video'].includes(d.type)) ||
            (['string', 'list of strings'].includes(c) && containsURLs),
        )
          ? null
          : true,
      });
      // obj.push({ label: 'video', value: 'video', disabled: d.types.some(c => (c === 'object' && ['img', 'video'].includes(d.type)) || (['string', 'list of strings'].includes(c) && containsURLs)) ? null : true })

      obj.push({
        label: 'checklist',
        value: 'checklist',
        disabled: !d.types.includes('object') ? null : true,
      });
      obj.push({
        label: 'radiolist',
        value: 'radiolist',
        disabled: !d.types.includes('object') ? null : true,
      });

      return obj;
    })
    .attrs({
      value: (d) => d.value,
      // 'selected': function (d) {
      // 	const type = d3.select(this).findAncestor('type').datum().type
      // 	if (type === d.value) return true
      // 	else return null
      // },
      disabled: (d) => d.disabled,
    })
    .html((d) => d.label);

  // const metaOpts =
  columntypes
    .addElems('optgroup', 'group-meta')
    .attr('label', 'meta')
    .addElems('option', 'opt', (d) => {
      // const containsURLs =
      d.entries
        .flat()
        .filter((c) => ![null, undefined].includes(c))
        .every((c) => typeof c === 'string' && c.isURL());
      const obj = [];
      // CHECK FOR LOCATIONS
      if (metafields.some((c) => c.type === 'location')) {
        const limit =
          metafields.find((c) => c.type === 'location')?.limit ?? null;
        // THIS ONLY AFFORDS UPLOADING ONE LOCATION PER ENTRY
        obj.push({
          label: 'location',
          value: 'location-txt',
          limit,
          disabled: d.types.some((c) =>
            ['string', 'list of strings'].includes(c),
          )
            ? null
            : true,
        });
        obj.push({
          label: 'location (lat/ lng)',
          value: 'location-lat-lng',
          limit,
          disabled:
            d.types.includes('list of numbers') &&
            d.values.every((c) => c.length === 2)
              ? null
              : true,
        });
        obj.push({
          label: 'location (lng/ lat)',
          value: 'location-lng-lat',
          limit,
          disabled:
            d.types.includes('list of numbers') &&
            d.values.every((c) => c.length === 2)
              ? null
              : true,
        });
      }

      metafields
        .filter((c) => c.type !== 'location')
        .forEach((c) => {
          let disabled = true;
          const containsURLs = d.entries
            .flat()
            .filter((c) => ![null, undefined].includes(c))
            .every((c) => typeof c === 'string' && c.isURL());

          // CHECK FOR LIMITED INPUTS
          let max_entries = 1;
          let constrained = false;

          if (!['txt', 'embed'].includes(c.type)) {
            // THE LIMIT IS ON THE NUMBER OF ITEMS
            if (d.entries.every((b) => Array.isArray(b)))
              max_entries = Math.max(...d.entries.map((b) => b.length));
          } else {
            // THE LIMIT IS ON THE NUMBER OF CHARACTERS
            max_entries = Math.max(
              ...d.entries.flat().map((b) => b.trim().length),
            );
          }
          if (max_entries > (c.limit ?? Infinity)) constrained = true;

          if (
            c.type === 'tag' &&
            d.types.some((b) =>
              [
                'number',
                'list of numbers',
                'string',
                'list of strings',
              ].includes(b),
            ) &&
            !constrained
          )
            disabled = null;
          if (
            c.type === 'index' &&
            d.types.some((b) => ['number', 'list of numbers'].includes(b)) &&
            !constrained
          )
            disabled = null;

          if (
            c.type === 'attachment' &&
            d.types.some(
              (b) => ['string', 'list of strings'].includes(b) && containsURLs,
            ) &&
            !constrained
          )
            disabled = null;

          if (
            ['txt', 'embed'].includes(c.type) &&
            d.types.some((b) =>
              [
                'number',
                'list of numbers',
                'string',
                'list of strings',
              ].includes(b),
            ) &&
            !constrained
          )
            disabled = null;
          if (
            c.type === 'img' &&
            d.types.some(
              (b) =>
                (b === 'object' && ['img', 'video'].includes(d.type)) ||
                (['string', 'list of strings'].includes(b) && containsURLs),
            ) &&
            !constrained
          )
            disabled = null;
          // if (c.type === 'video') // TO DO: COMPLETE FOR VIDEO
          if (
            ['checklist', 'radiolist'].includes(c.type) &&
            !d.type.includes('object')
          )
            disabled = null; // THERE SHOULD BE NO CONSTRAINTS HERE AS FAR AS I CAN TELL

          obj.push({
            label: c.name,
            value: c.label,
            limit: c.limit || null,
            disabled,
          }); // TO DO: TRANSLATE c.name
        });

      return obj;
    })
    .attrs({
      value: (d) => d.value,
      // 'selected': function (d) {
      // 	const type = d3.select(this).findAncestor('type').datum().type
      // 	if (type === d.value) return true
      // 	else return null
      // },
      disabled: (d) => d.disabled,
    })
    .html((d) => {
      if (d.limit)
        return `${d.label} (limited to ${d.limit})`; // TO DO: TRANSLATION
      else return d.label;
    });

  columntypes.each(function (d) {
    this.value = d.type;
  });

  // IMMEDIATELY DISABLE OPTIONS ACCORDING TO INFERRED TYPES
  if (!update)
    columntypes.each(function (d) {
      this.dispatchEvent(new Event('change'));
    });

  // RENDER THE TABLE BODY
  const show = 5; // THIS IS TO LIMIT THE NUMBER OF ROWS DISPLAYED
  const moduleBody = table.addElems('tbody', null, [cols]);

  const bodyRows = moduleBody
    .addElems('tr', 'column-values', (d) => {
      const slices = d.map((c) => {
        return { key: c.key, entries: c.entries.slice(0, show) };
      });
      const row = [];
      slices.forEach((c) => {
        for (let i = 0; i < c.entries.length; i++) {
          if (!row[i]) row[i] = [{ key: c.key, cell: c.entries[i] }];
          else row[i].push({ key: c.key, cell: c.entries[i] });
        }
      });
      return row;
    })
    .on('mouseover', function () {
      d3.select(this).select('.preview').classed('hide', false);
    })
    .on('mouseout', function () {
      d3.select(this).select('.preview').classed('hide', true);
    });
  bodyRows
    .addElems('td', 'value', (d) => d)
    .classed('selected left right top bottom', false)
    .style('word-break', (d) =>
      typeof d.cell === 'string' &&
      (d.cell.split(' ').length === 1 || d.cell.includes('http'))
        ? 'break-all'
        : null,
    )
    .html((d) => {
      if (d.cell && typeof d.cell === 'string' && d.cell.length > 100)
        return `${d.cell.slice(0, 100)}…`;
      else if (d.cell && typeof d.cell === 'object') {
        if (Array.isArray(d.cell)) {
          return d.cell.join(', ').length > 100
            ? `${d.cell.join(', ').slice(0, 100)}…`
            : d.cell.join(', ');
        } else if (Object.keys(d.cell).includes('src')) {
          // LIKELY AN IMAGE
          let cellsrc = d.cell.src;
          if (d3.select('data[name="app_storage"]').node()) {
            const app_storage = d3
              .select('data[name="app_storage"]')
              .node().value;
            cellsrc = new URL(`${app_storage}/${cellsrc}`).href;
          }
          return `<img src='${cellsrc}'>`;
        }
      } else return d.cell;
    });
  bodyRows
    .addElems('div', 'preview hide')
    .on('dblclick', function () {
      const sel = d3.select(this);
      const node = sel.findAncestor('column-values').node();
      let idx = 0;
      d3.select(node.parentNode)
        .selectAll('tr')
        .each(function (c, j) {
          if (this === node) idx = j;
        });
      previewPad(idx);
    })
    .addElems('span')
    .html(vocabulary['dblclick to preview']['pad']);

  foot.addElems('p', 'summary').html((_) => {
    const rowcount = Math.max(...cols.map((c) => c.entries.length));
    const colcount = cols.length;
    return vocabulary['import table description']
      .replace(/\$1/g, rowcount)
      .replace(/\$2/g, colcount)
      .replace(/\$3/g, Math.min(show, rowcount));
  });

  // PUSH BROWSER HISTORY STATE
  const url = new URL(window.location);
  const queryparams = new URLSearchParams(url.search);
  queryparams.set(
    'file',
    encodeURI(d3.select('input#upload').attr('data-fname')),
  );
  url.search = queryparams.toString();
  const nextURL = url.toString();
  const nextTitle = 'Processing table';
  const nextState = { additionalInformation: 'Updated the URL with JS' };
  window.history.pushState(nextState, nextTitle, nextURL);
}
function seekPrefix(arr) {
  // INSPIRED BY https://stackoverflow.com/questions/1916218/find-the-longest-common-starting-substring-in-a-set-of-strings
  const A = arr
    .filter((d) => d)
    .concat()
    .sort();
  const a1 = A[0];
  const a2 = A[A.length - 1];
  const L = a1.length;
  let i = 0;
  while (i < L && a1.charAt(i) === a2.charAt(i)) i++;
  return a1.substring(0, i);
}
async function splitValues(col, separator) {
  if (!separator) return null;
  const cols = d3.select('table.xls-preview').datum();
  cols.forEach((d) => {
    if (d.key === col) {
      // CHECK IF THE SPARATOR WAS INPUT TWICE (OR MORE)
      const regex = new RegExp(
        `${RegExp.escape(separator)}${RegExp.escape(separator)}+`,
        'gi',
      );
      d.entries = d.entries.map((c) => {
        if (c) {
          c = c.replace(/\n/g, ' ');
          let e = c.replace(regex, separator).split(separator);
          if (Array.isArray(e)) {
            // NOTE THIS SHOULD ALWAYS BE THE CASE
            e = e.map((b) => {
              if (!isNaN(b)) return +b;
              else return b?.trim();
            });
          }
          return e;
        } else return undefined;
      });
      d.values = d.values
        .map((c) => c.replace(regex, separator).split(separator))
        .flat()
        .map((c) => c?.trim())
        .unique();
      d.types = d.entries
        .filter((c) => c !== undefined)
        .map((c) => {
          if (Array.isArray(c)) {
            const listcontent = c.map((b) => typeof b).unique();
            return `list of ${listcontent}s`;
          } else return typeof c;
        })
        .unique();
      d.type = 'checklist';
    }
  });
  await renderTable(cols);
}
export function groupColumns() {
  const cols = d3.select('table.xls-preview').datum();
  const selected = d3.selectAll(
    'table.xls-preview thead .column-selection .selected',
  );

  if (selected.size() > 1) {
    const groupedkeys = selected.data().map((d) => d.key);
    const keys = cols.map((d) => d.key).diff(groupedkeys); // NOT SURE WHAT THIS DOES
    keys.push(groupedkeys);
    parseGroups(cols, keys);
  }
}
export async function dropColumns() {
  const cols = d3.select('table.xls-preview').datum();
  const dropkeys = d3
    .select('table.xls-preview thead')
    .selectAll('.selected')
    .data()
    .map((d) => d.key);
  await renderTable(cols.filter((d) => !dropkeys.includes(d.key)));
}
function compileLocations(idx) {
  return (async () => {
    const cols = d3.select('table.xls-preview').datum();
    let locations = cols.find((d) => d.type === 'location-txt')?.entries;
    if (!locations?.length) {
      return null;
    } else {
      if (![null, undefined].includes(idx)) {
        if (Array.isArray(locations[idx])) locations = locations[idx];
        else locations = [locations[idx]];
      } else locations = locations.flat().unique();
      locations = locations.filter((d) => d); // REMOVE ANY null VALUES

      const results = await POST('/forwardGeocoding', {
        locations: locations,
      });
      return results;
    }
  })();
}
export async function compilePads(idx, structureOnly = false) {
  const language = await getCurrentLanguage();
  const { metafields, media_value_keys } = JSON.parse(
    d3.select('data[name="pad"]').node().value,
  );
  const { name: userlocation } = JSON.parse(
    d3.select('data[name="location"]').node().value,
  );

  const cols = d3.select('table.xls-preview').datum();
  // FORWARD GEOCODE THE TEXT LOCATIONS
  const compiledLocations = await compileLocations(idx);

  const entriesLength = Math.max(...cols.map((d) => d.entries.length));
  const pads = new Array(entriesLength)
    .fill(0)
    .map((d, i) => i)
    .filter((i) => {
      if (![null, undefined].includes(idx)) return i === idx;
      else return true; // COMPILE ALL PADS
    })
    .map((i) => {
      return (async () => {
        const items = cols.map((c) => {
          return (async () => {
            const item = {};
            if (
              ['txt', 'title'].includes(c.type) ||
              ['txt', 'title'].includes(
                metafields.find((b) => b.label === c.type)?.type,
              )
            ) {
              if (!structureOnly) {
                if (Array.isArray(c.entries[i])) {
                  item.txt = c.entries[i]
                    .sort((a, b) => {
                      if (typeof a === 'string' && typeof b === 'string')
                        return a?.localeCompare(b);
                      else return a - b;
                    })
                    .join(', ');
                } else item.txt = c.entries[i] ?? '';
                item.has_content = item.txt?.toString().trim()?.length > 0;
              }
              // item.type = c.type
              item.type =
                metafields.find((b) => b.label === c.type)?.type || c.type;
              item.name =
                metafields.find((b) => b.label === c.type)?.label || null;
              // item.level = 'media'
              item.level = metafields.some((b) => b.label === c.type)
                ? 'meta'
                : 'media';
            }
            if (
              [
                c.type,
                metafields.find((b) => b.label === c.type)?.type,
              ].includes('embed')
            ) {
              if (!structureOnly) {
                item.html = c.entries[i] ?? '';
                item.has_content = item.html?.trim()?.length > 0;
              }
              // item.type = c.type
              item.type =
                metafields.find((b) => b.label === c.type)?.type || c.type;
              item.name =
                metafields.find((b) => b.label === c.type)?.label || null;
              // item.level = 'media'
              item.level = metafields.some((b) => b.label === c.type)
                ? 'meta'
                : 'media';
            }
            if (
              [
                c.type,
                metafields.find((b) => b.label === c.type)?.type,
              ].includes('img')
            ) {
              // item.type = c.type // THIS COMES FIRST HERE AS WE UPDATE IT IN THE CASE OF A mosaic
              item.type =
                metafields.find((b) => b.label === c.type)?.type || c.type;

              if (!structureOnly) {
                if (c.entries[i]?.src) item.src = c.entries[i].src;
                else {
                  if (Array.isArray(c.entries[i])) {
                    const containsURLs = c.entries[i]
                      .map((b) => b.isURL())
                      .unique();
                    if (
                      containsURLs.length === 1 &&
                      containsURLs.includes(true)
                    ) {
                      // A MOSAIC OF URLS
                      item.srcs = c.entries[i].map((b) => encodeURI(b.trim()));
                      item.type = 'mosaic';
                      // item.type = 'mosaic'
                    } else item.src = null;
                  } else if (c.entries[i]?.isURL())
                    item.src = encodeURI(c.entries[i].trim());
                  else item.src = null;
                }
                if (item.type === 'mosaic')
                  item.has_content = item?.srcs?.filter((b) => b)?.length > 0;
                else item.has_content = ![null, undefined].includes(item.src);
              }
              // item.level = 'media'
              item.name =
                metafields.find((b) => b.label === c.type)?.label || null;
              item.level = metafields.some((b) => b.label === c.type)
                ? 'meta'
                : 'media';
            }
            if (
              [
                c.type,
                metafields.find((b) => b.label === c.type)?.type,
              ].includes('video')
            ) {
              // THERE CAN BE NO VIDEO UPLOAD FROM EXCEL: THIS IS ONLY A PLACEHOLDER IN THE TABLE/ PAD
              if (!structureOnly) {
                item.src = null;
                item.has_content = ![null, undefined].includes(item.src);
              }
              // item.type = c.type
              item.type =
                metafields.find((b) => b.label === c.type)?.type || c.type;
              item.name =
                metafields.find((b) => b.label === c.type)?.label || null;
              // item.level = 'media'
              item.level = metafields.some((b) => b.label === c.type)
                ? 'meta'
                : 'media';
            }
            if (
              ['checklist', 'radiolist'].includes(c.type) ||
              ['checklist', 'radiolist'].includes(
                metafields.find((b) => b.label === c.type)?.type,
              )
            ) {
              item.options = c.values // .filter(d => ![null, undefined].includes(d)).unique() // VALUES SHOUlD BE COMOPLETE (NO null OR undefined) AND SHOULD NOT BE unique
                .sort((a, b) => {
                  if (typeof a === 'string' && typeof b === 'string')
                    return a?.localeCompare(b);
                  else return a - b;
                })
                .map((d, j) => {
                  const obj = {};
                  obj.id = j;
                  obj.name = d?.toString();
                  obj.checked = false;

                  if (!structureOnly) {
                    if (c.entries[i]) {
                      if (typeof c.entries[i] !== 'object') {
                        // THIS COULD PROBABLY BE CHANGED TO Array.isArray()
                        if (
                          typeof c.entries[i] === 'string' &&
                          typeof d === 'string' &&
                          c.entries[i].toLowerCase().trim() ===
                            d.toLowerCase().trim()
                        ) {
                          obj.checked = true;
                        } else if (c.entries[i] === d) obj.checked = true;
                      } else {
                        if (
                          c.entries[i].some((b) =>
                            typeof b === 'string' && typeof d === 'string'
                              ? b.toLowerCase().trim() ===
                                d.toLowerCase().trim()
                              : b === d,
                          )
                        )
                          obj.checked = true;
                      }
                    }
                  }
                  return obj;
                });

              if (!structureOnly)
                item.has_content =
                  item.options?.filter((b) => b.name?.length && b.checked)
                    ?.length > 0;
              // item.type = c.type
              item.type =
                metafields.find((b) => b.label === c.type)?.type || c.type;
              item.name =
                metafields.find((b) => b.label === c.type)?.label || null;
              item.level = metafields.some((b) => b.label === c.type)
                ? 'meta'
                : 'media';
            }

            // META FIELDS
            // NOTE: THIS IMPLIES THERE CAN ONLY BE ONE LOCATION IN THE METADATA
            if (metafields.some((b) => b.type === 'location')) {
              if (c.type === 'location-txt') {
                if (!structureOnly) {
                  let locations = [];
                  if (Array.isArray(c.entries[i])) locations = c.entries[i];
                  else locations = [c.entries[i]];
                  locations = locations.filter((b) => b);

                  if (locations?.length) {
                    // const results = await POST('/forwardGeocoding', { locations: locations })
                    const geocoded = compiledLocations.filter((b) =>
                      locations.includes(b.input),
                    );
                    item.centerpoints = geocoded.map((c) => c.centerpoint);
                    item.caption = `Originally input location${
                      locations.length > 1 ? 's' : ''
                    }: <strong>${locations
                      .map((l) => l.trim().capitalize())
                      .join('</strong>, <strong>')}</strong>.<br/>`;
                    if (geocoded.filter((c) => c.found).length > 1)
                      item.caption += `Multiple locations found using <a href='https://opencagedata.com/credits' target='_blank'>OpenCage Geocoder</a> | &copy; <a href='https://www.openstreetmap.org/copyright' target='_blank'>OpenStreetMap contributors</a>`;
                    else if (geocoded.filter((c) => c.found).length === 1) {
                      item.caption += geocoded.find((c) => c.found).caption;
                    }
                    if (geocoded.filter((c) => !c.found).length) {
                      item.caption += geocoded
                        .filter((c) => !c.found)
                        .map((c) => c.caption)
                        .join(' ');
                      item.caption += `<br/>Defaulted to UNDP ${
                        userlocation ? `${userlocation} ` : ''
                      }Country Office location.`;
                    }
                  }
                  // } else item.locations = locations // THIS IS FOR FINDING ALL LOCATIONS AT ONCE WHEN UPLOADING
                  item.has_content = item?.centerpoints?.length > 0;
                }
                item.type = 'location';
                item.name = metafields.find(
                  (b) => b.type === 'location',
                )?.label;
                item.level = 'meta';
              } else if (c.type === 'location-lat-lng') {
                if (!structureOnly) {
                  let locations = [];
                  if (Array.isArray(c.entries[i])) locations = c.entries[i];
                  else locations = [c.entries[i]];
                  locations = locations.filter((b) => b);

                  if (locations.length)
                    item.centerpoints = [
                      { lat: locations[0], lng: locations[1] },
                    ];

                  item.has_content = item?.centerpoints?.length > 0;
                }
                item.type = 'location';
                item.name = metafields.find(
                  (b) => b.type === 'location',
                )?.label;
                item.level = 'meta';
              } else if (c.type === 'location-lng-lat') {
                if (!structureOnly) {
                  let locations = [];
                  if (Array.isArray(c.entries[i])) locations = c.entries[i];
                  else locations = [c.entries[i]];
                  locations = locations.filter((b) => b);

                  if (locations.length)
                    item.centerpoints = [
                      { lat: locations[1], lng: locations[0] },
                    ];

                  item.has_content = item?.centerpoints?.length > 0;
                }
                item.type = 'location';
                item.name = metafields.find(
                  (b) => b.type === 'location',
                )?.label;
                item.level = 'meta';
              }
            }

            // ALL TAGs AND ATTACHMENTS ARE LOOPED BELOW BASED ON AVAILABLE metafields
            if (
              metafields.some(
                (b) => b.type !== 'location' && b.label === c.type,
              )
            ) {
              if (
                ['tag', 'index'].includes(
                  metafields.find((b) => b.label === c.type)?.type,
                )
              ) {
                if (!structureOnly) {
                  const tag_or_index_info = await POST('/apis/fetch/tags', {
                    type: c.type,
                    language,
                  });

                  if (Array.isArray(c.entries[i])) {
                    item.tags = c.entries[i]
                      .filter((b) => ![null, undefined].includes(b))
                      .map((b) => {
                        const obj = {};
                        obj.id = undefined;
                        if (
                          metafields.find((b) => b.label === c.type)?.type ===
                          'index'
                        ) {
                          obj.key = +b;
                          obj.name = tag_or_index_info.find(
                            (a) => a.key === +b,
                          )?.name;
                        } else {
                          obj.key = null;
                          obj.name = b;
                        }
                        obj.type = c.type; // .slice(0, -1)
                        return obj;
                      });
                  } else {
                    const obj = {};
                    obj.id = undefined;
                    if (
                      metafields.find((b) => b.label === c.type)?.type ===
                      'index'
                    ) {
                      obj.key = +c.entries[i];
                      obj.name = tag_or_index_info.find(
                        (b) => b.key === +c.entries[i],
                      )?.name;
                    } else {
                      obj.key = null;
                      obj.name = c.entries[i];
                    }
                    obj.type = c.type; // .slice(0, -1)
                    item.tags = [obj];
                  }
                  item.has_content = item?.tags?.length > 0;
                }
                item.type = metafields.find((b) => b.label === c.type)?.type;
                item.name = metafields.find((b) => b.label === c.type)?.label;
                item.level = 'meta';
              } else if (
                metafields.find((b) => b.label === c.type)?.type ===
                'attachment'
              ) {
                if (!structureOnly) {
                  if (Array.isArray(c.entries[i])) {
                    item.srcs = c.entries[i]
                      .filter((b) => ![null, undefined].includes(b))
                      .map((b) => b.trim());
                  } else if (c.entries[i]) {
                    item.srcs = [c.entries[i].trim()];
                  } else item.srcs = [];
                  item.has_content = item?.srcs?.length > 0;
                }
                item.type = metafields.find((b) => b.label === c.type)?.type;
                item.name = metafields.find((b) => b.label === c.type)?.label;
                item.level = 'meta';
              }
            }

            item.instruction = c.key;
            item.required = metafields.find((b) => b.label === c.type)?.required || false;

            return item;
          })();
        });
        const results = await Promise.all(items);

        const title =
          results.find((d) => d.type === 'title')?.txt?.slice(0, 99) || null;

        let structure = results;
        if (!structureOnly) {
          structure = results.map((d) => {
            const { txt, html, srcs, src, centerpoints, tags, ...structure } =
              d;
            if (structure.options) {
              structure.options = structure.options.map((c) => {
                const { checked, ...opts } = c;
                opts.checked = false;
                return opts;
              });
            }
            return structure;
          });
        }
        structure.forEach((d) => {
          d.required = false;
          // THE FOLLOWING LIKELY REDUNDANT
          if (metafields.some((c) => c.label === d.name)) d.level = 'meta';
          else d.level = 'media';
        });

        const full_text = `${title}\n\n
				${results
          .filter((d) => d.type === 'txt')
          .map((d) => d.txt)
          .join('\n\n')
          .trim()}\n\n
				${results
          .filter((d) => d.type === 'embed')
          .map((d) => d.html)
          .join('\n\n')
          .trim()}\n\n
				${results
          .filter((d) => d.type === 'checklist')
          .map((d) => d.options.filter((c) => c.checked).map((c) => c.name))
          .flat()
          .join('\n\n')
          .trim()}
				${results
          .filter((d) => d.type === 'radiolist')
          .map((d) => d.options.filter((c) => c.checked).map((c) => c.name))
          .flat()
          .join('\n\n')
          .trim()}

				${results
          .filter((d) => d.type === 'group')
          .map((d) => results)
          .filter((d) => d.type === 'txt')
          .map((d) => d.txt)
          .join('\n\n')
          .trim()}\n\n
				${results
          .filter((d) => d.type === 'group')
          .map((d) => results)
          .filter((d) => d.type === 'embed')
          .map((d) => d.html)
          .join('\n\n')
          .trim()}\n\n
				${results
          .filter((d) => d.type === 'group')
          .map((d) => results)
          .filter((d) => d.type === 'checklist')
          .map((d) => d.options.filter((c) => c.checked).map((c) => c.name))
          .flat()
          .join('\n\n')
          .trim()}
				${results
          .filter((d) => d.type === 'group')
          .map((d) => results)
          .filter((d) => d.type === 'radiolist')
          .map((d) => d.options.filter((c) => c.checked).map((c) => c.name))
          .flat()
          .join('\n\n')
          .trim()}`;

        // NEED TO CHECK THERE ARE ALL THE metafields AND THAT THEY HAVE CONTENT
        const completion = [];
        completion.push(
          results.find((d) => d.type === 'title')?.has_content || false,
        );
        metafields
          .filter((d) => d.required)
          .forEach((d) => {
            completion.push(
              results.find((c) => c.name === d.label)?.has_content || false,
            );
          });
        let status = 0;
        if (completion.every((d) => d === true)) status = 1;

        return {
          title,
          sections: [
            {
              type: 'section',
              title: null,
              lead: null,
              structure,
              items: !structureOnly ? results : null,
            },
          ],
          full_text,
          status,
          compileddata: results,
          imgs: results
            .filter((d) => ['img', 'mosaic'].includes(d.type))
            .map((d) => d.src || d.srcs)
            .flat().filter((d) => d),

          tags: results
            .filter((d) =>
              metafields.some(
                (c) => ['tag', 'index'].includes(c.type) && c.label === d.name,
              ),
            )
            .map((d) => d.tags)
            .flat(),
          locations: results
            .filter((d) => d.type === 'location')
            .map((d) => d.centerpoints)
            .flat(),

          metadata: results
            .filter((d) =>
              metafields.some(
                (c) =>
                  !['tag', 'index', 'location'].includes(c.type) &&
                  c.label === d.name,
              ),
            )
            .map((d) => {
              const valuekey = Object.keys(d).find((c) =>
                media_value_keys.includes(c),
              );
              const value = d[valuekey];
              console.log(valuekey, value);

              // TO DO: IF valuekey = 'options' AND type = 'checklist' OR type = 'radiolist'
              // NEED TO MAKE SURE THE INPUT IN THE xlsx MATCHES THE options IN THE metafield

              if (Array.isArray(value)) {
                return value.filter((c) => {
                  if (Object.keys(c).includes('checked')) return c.checked;
                  else return true;
                }).map((c) => {
                  const obj = {};
                  obj.type = d.type;
                  obj.name = d.name;
                  if (typeof c === 'object' && !Array.isArray(c) && c !== null && c.name !== undefined) {
                    if (typeof c.name === 'string') obj.value = c.name?.trim();
                    else obj.value = c.name;
                  }
                  else {
                    if (typeof c === 'string') obj.value = c.trim();
                    else obj.value = c;
                  }
                  return obj;
                });
              } else {
                const obj = {};
                obj.type = d.type;
                obj.name = d.name;
                if (typeof value === 'object' && !Array.isArray(value) && value !== null && value.name !== undefined) {
                  if (typeof value.name === 'string') obj.value = value.name.trim();
                  else obj.value = value.name;
                }
                else {
                  if (typeof value === 'string') obj.value = value.trim();
                  else obj.value = value;
                }
                return obj;
              }
            })
            .flat(),
        };
      })();
    });
  return Promise.all(pads);
}
export async function compileTemplate() {
  const vocabulary = await getTranslations();
  const { metafields } = JSON.parse(
    d3.select('data[name="pad"]').node().value,
  );
  // const cols =
  d3.select('table.xls-preview').datum();

  const template = {};

  // THIS IS COPIED FROM template.ejs
  const title = d3.select('input#upload').attr('data-fname').slice(0, 99); // THIS IS NECESSARY BECAUSE THE DB IS ONLY SET TO STORE 99 VARCHAR
  const description = vocabulary['generated template'].replace(
    /\$1/g,
    title.trim(),
  );

  const data = await compilePads(0, true);
  const sections = data[0].sections.map((d) => {
    const { items, ...section } = d;
    return section;
  });

  // COMPILE FULL TXT FOR SEARCH
  // TECHNICALLY THE group PART IS NOT NEEDED HERE AS THERE CAN BE NO GROUPS ON IMPORT
  // BUT WE KEEP IT FOR CONSISTENCY WITH template.ejs
  const full_text = `${title}\n\n
		${description}\n\n
		${sections
      .map((d) => d.title)
      .join('\n\n')
      .trim()}\n\n
		${sections
      .map((d) => d.lead)
      .join('\n\n')
      .trim()}\n\n
		${sections
      .map((d) => d.structure)
      .flat()
      .filter((d) => d.type === 'title')
      .map((d) => d.instruction)
      .join('\n\n')
      .trim()}\n\n
		${sections
      .map((d) => d.structure)
      .flat()
      .filter((d) => d.type === 'txt')
      .map((d) => d.instruction)
      .join('\n\n')
      .trim()}\n\n
		${sections
      .map((d) => d.structure)
      .flat()
      .filter((d) => d.type === 'embed')
      .map((d) => d.instruction)
      .join('\n\n')
      .trim()}\n\n
		${sections
      .map((d) => d.structure)
      .flat()
      .filter((d) => d.type === 'checklist')
      .map((d) => d.instruction)
      .join('\n\n')
      .trim()}\n\n
		${sections
      .map((d) => d.structure)
      .flat()
      .filter((d) => d.type === 'checklist')
      .map((d) => d.options.map((c) => c.name))
      .flat()
      .join('\n\n')
      .trim()}
		${sections
      .map((d) => d.structure)
      .flat()
      .filter((d) => d.type === 'radiolist')
      .map((d) => d.instruction)
      .join('\n\n')
      .trim()}\n\n
		${sections
      .map((d) => d.structure)
      .flat()
      .filter((d) => d.type === 'radiolist')
      .map((d) => d.options.map((c) => c.name))
      .flat()
      .join('\n\n')
      .trim()}

		${sections
      .map((d) => d.structure)
      .flat()
      .filter((d) => d.type === 'group')
      .map((d) => d.structure)
      .filter((d) => d.type === 'txt')
      .map((d) => d.instruction)
      .join('\n\n')
      .trim()}\n\n
		${sections
      .map((d) => d.structure)
      .flat()
      .filter((d) => d.type === 'group')
      .map((d) => d.structure)
      .filter((d) => d.type === 'embed')
      .map((d) => d.instruction)
      .join('\n\n')
      .trim()}\n\n
		${sections
      .map((d) => d.structure)
      .flat()
      .filter((d) => d.type === 'group')
      .map((d) => d.structure)
      .filter((d) => d.type === 'checklist')
      .map((d) => d.instruction)
      .join('\n\n')
      .trim()}\n\n
		${sections
      .map((d) => d.structure)
      .flat()
      .filter((d) => d.type === 'group')
      .map((d) => d.structure)
      .filter((d) => d.type === 'checklist')
      .map((d) => d.options.filter((c) => c.checked).map((c) => c.name))
      .flat()
      .join('\n\n')
      .trim()}
		${sections
      .map((d) => d.structure)
      .flat()
      .filter((d) => d.type === 'group')
      .map((d) => d.structure)
      .filter((d) => d.type === 'radiolist')
      .map((d) => d.instruction)
      .join('\n\n')
      .trim()}\n\n
		${sections
      .map((d) => d.structure)
      .flat()
      .filter((d) => d.type === 'group')
      .map((d) => d.structure)
      .filter((d) => d.type === 'radiolist')
      .map((d) => d.options.filter((c) => c.checked).map((c) => c.name))
      .flat()
      .join('\n\n')
      .trim()}`;

  template.title = title.slice(0, 99);
  template.description = description;
  template.sections = sections; // JSON.stringify(sections)
  template.full_text = full_text;
  template.medium = 'xlsx';
  template.imported = true;

  const completion = [];
  metafields
    .filter((d) => d.required)
    .forEach((d) => {
      completion.push(
        sections
          .map((c) => c.structure)
          ?.flat()
          .some((c) => c.name === d.label),
      );
    });
  template.status = 0;
  if (completion.every((d) => d === true)) template.status = 1;

  return template;
}

async function previewPad(idx) {
  const language = await getCurrentLanguage();
  const cols = d3.select('table.xls-preview').datum();
  const data = await compilePads(idx);
  const datum = data[0];

  isLoading(true);

  const screen = d3.select('div.screen').classed('hide', false);
  const modal = screen.addElems('div', 'modal pad-preview');
  modal
    .addElems('button', 'close')
    .on('click', (_) => window.history.back())
    .html('Close');

  window.onpopstate = async (_) => await closeModal();

  async function closeModal() {
    // REORDER THE TABLE WHEN CLOSING PREVIEW
    let neworder = [];

    if (datum.compileddata.find((d) => d.type === 'title')) {
      // IF THERE IS A TITLE, ALWAYS PUSH IT TO THE FIRST COLUMN
      neworder.push(
        datum.compileddata.find((d) => d.type === 'title').instruction,
      );
    }
    d3.selectAll('div.media-container, div.meta-container').each((d) =>
      neworder.push(d.instruction),
    );

    neworder = neworder.map((d) => cols.find((c) => c.key === d));

    await renderTable(neworder, true);

    modal.remove();
    screen.classed('hide', true);
  }
  const main = modal
    .addElems('div', 'document')
    .addElems('main', 'pad')
    .attr('id', 'pad');
  const inner = main.addElems('div', 'inner');

  if (datum) {
    const head = inner.addElems('div', 'head');
    const body = inner.addElems('div', 'body');

    const { title, sections } = datum;

    if (title) head.addElems('div', 'title').html(title);
    if (sections) {
      const objectdata = { object: 'pad', type: 'templated', main };

      for (let s = 0; s < sections.length; s++) {
        const data = sections[s];

        // CHECK FOR URL IMAGES AND LOAD THEM IF NECESSARY
        data.items = await Promise.all(
          data.items.map(async (d) => {
            if (d.type === 'img') {
              if (d.src?.isURL()) {
                const { src } = await POST('/request/img/', {
                  data: d.src,
                  from: 'url',
                });
                d.src = src;
              }
            }
            if (d.type === 'mosaic') {
              if (d.srcs?.length) {
                const newsrcs = [];
                for (let i = 0; i < d.srcs?.length; i++) {
                  const img = d.srcs[i];
                  if (img?.isURL()) {
                    const { src } = await POST('/request/img/', {
                      data: img,
                      from: 'url',
                    });
                    newsrcs.push(src);
                  }
                }
                d.srcs = newsrcs;
              }
            }
            return d;
          }),
        );
        await addSection({ data, lang: language, objectdata });
      }
    }

    // REMOVE THE SECTION HEADER (WHICH IS ALWAYS EMPTY HERE)
    body.select('div.section-header').remove();
  }

  // UPDATE THE WINDOW HISTORY SO THAT USERS CAN CLICK ON "back" IN BROWSER
  const url = new URL(window.location);
  const queryparams = new URLSearchParams(url.search);
  queryparams.set('preview', idx);
  url.search = queryparams.toString();
  const nextURL = url.toString();
  const nextTitle = 'Preview pad';
  const nextState = { additionalInformation: 'Updated the URL with JS' };
  window.history.pushState(nextState, nextTitle, nextURL);

  isLoading(false);
}
