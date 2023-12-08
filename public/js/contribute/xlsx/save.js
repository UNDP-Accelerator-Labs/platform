import { vocabulary, language } from '/js/config/translations.js';
import { compilePads, compileTemplate } from '/js/contribute/xlsx/main.js';
import { POST } from '/js/fetch.js';
import { addGlobalLoader, rmGlobalLoader } from '/js/main.js';
import { renderPromiseModal } from '/js/modals.js';

export async function catchSubmit(evt) {
  const { participations } = JSON.parse(
    d3.select('data[name="page"]').node().value,
  );

  if (evt.preventDefault) evt.preventDefault();

  // 1) SELECT MOBILIZATION TO CONTRIBUTE TO
  const target_opts = participations
    .filter((p) => {
      return (!(p.source && !p.copy) || p.child) && p.status === 1;
    })
    .map((d) => {
      return {
        label: d.title,
        value: d.id,
        type: 'radio',
      };
    });

  target_opts.unshift({
    label: vocabulary['space']['pads']['private'],
    value: -1,
    type: 'radio',
  });

  const message = vocabulary['import to workspace or mobilization'];
  const opts = [
    {
      node: 'select',
      name: 'mobilization',
      label: vocabulary['select destination'],
      options: target_opts,
    },
    {
      node: 'button',
      type: 'button',
      label: vocabulary['import'],
      resolve: (_) =>
        d3.select('.modal .filter .dropdown input[type=radio]:checked').node()
          .value,
    },
  ];
  const mobilization = await renderPromiseModal({ message, opts });

  // IF NO MOBILIZATION HAS BEEN SELECTED, THE USER HAS LIKELY JUST CANCELED THE OPERATION SO DO NO PROCEED WITH THE SUBMIT
  if ([null, undefined].includes(mobilization)) return false;

  // COMPILE PADS AND TEMPLATE
  const pads = await compilePads();
  const template = await compileTemplate();

  // 2) SAVE IMAGES
  const fd = new FormData();
  const promises = [];
  const imgs = pads
    .map((d) => d.imgs)
    .flat()
    .unique()
    .filter((d) => !d?.isURL()) // WE DO NOT DOWNLOAD IMAGES THAT ARE LINKED
    .filter((d) => d);

  if (imgs.length) {
    imgs.forEach((d) => {
      promises.push(
        new Promise(async (resolve) => {
          const blob = await fetch(d).then((res) => res.blob());
          const ts = new Date().getTime();
          const originalname = d;
          resolve({ blob: blob, originalname: originalname });
        }),
      );
    });
    const blobs = await Promise.all(promises);
    blobs.forEach((b) => {
      console.log(b)
      fd.append('img', b.blob, b.originalname);
    });
    return false

    // THIS IS SIMILAR TO THE uploadImg FUNCTION IN pad.js
    // WE NEED TO USE THE fetch API, AND NOT THE POST HELPER FUNCTION FOR SOME REASON
    const files = await fetch('/upload/img', { method: 'POST', body: fd })
      .then((response) => response.json())
      .then((results) => {
        const notification = d3
          .select('body')
          .addElem('div', 'notification')
          .addElem('div')
          .html(vocabulary['image upload success']);
        setTimeout((_) => notification.remove(), 4000);
        return results;
      })
      .catch((err) => {
        if (err) throw err;
      });

    if (files?.length) {
      pads.forEach((d) => {
        d.sections.forEach((c) => {
          c.items.forEach((b) => {
            if (b.type === 'img')
              b.src = files.find((a) => b?.src?.includes(a.originalname))?.src;
            if (b.type === 'mosaic') {
              b.srcs = b.srcs.map((a) => {
                return files.find((z) => a.includes(z.originalname))?.src;
              });
            }
          });
        });
      });
    }
  } else console.log('no images to upload');

  // 3) SAVE PADS
  // pads.forEach(d => d.sections = JSON.stringify(d.sections))
  // const results = await POST('/storeImport', { pads, template, mobilization })
  addGlobalLoader();
  const results = await POST('/save/xlsx', { pads, template, mobilization });
  rmGlobalLoader();
  window.location.href = `/${language}/browse/pads/private`;

  return false;
}
