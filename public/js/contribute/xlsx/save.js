import { language, vocabulary } from '/js/config/translations.js';
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

  // TO DO: ADD LOADER FEEDBACK

  // 2) SAVE IMAGES
  const sources = []
  const imgs = pads
    .map((d) => d.imgs)
    .flat()
    .unique()
    .filter((d) => d);

  for (let i = 0; i < imgs.length; i++) {
    const img = imgs[i]
    if (img?.isURL()) {
      const { src } = await POST('/request/img/', { data: img, from: 'url' })
      sources.push(`/public/${src}`.replace(/\/+/g, '/'))
    } else {
      sources.push(`/public/${img}`.replace(/\/+/g, '/'))
    }
  }

  if (sources.length) {
    const files = await POST('/save/img', { sources })
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

    // ADD THE FILENAMES TO THE PAD SECTIONS
    if (files?.length) {
      pads.forEach((d) => {
        d.sections.forEach((c) => {
          c.items.forEach((b) => {
            if (b.type === 'img') {
              b.src = files.find((a) => b?.src?.includes(a.originalname))?.src;
            }
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
  addGlobalLoader();
  const results = await POST('/save/xlsx', { pads, template, mobilization });
  rmGlobalLoader();
  window.location.href = `/${language}/browse/pads/private`;

  return false;
}
