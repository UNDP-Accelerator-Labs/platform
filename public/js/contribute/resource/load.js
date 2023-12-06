import { language, vocabulary } from '/js/config/translations.js';
import { getContent, uploadFile } from '/js/main.js';
import { renderPromiseModal } from '/js/modals.js';

async function DOMLoad() {
  const rights = JSON.parse(d3.select('data[name="rights"]').node().value);

  // LOAD DATA
  const [data, templates] = await getContent();
  // const { modules } = await POST('/load/metadata', { feature: [ 'modules' ] })

  // CREATE MODAL
  const headline = 'Select a resource.'; // TO DO: TRANSLATE
  const opts = [];

  const url = new URL(window.location);
  const queryparams = new URLSearchParams(url.search);
  const token = queryparams.get('token');

  const module_opts = {};
  const template_opts = {};

  for (let key in data) {
    if (data[key].length) {
      module_opts[key] = data[key].map((d) => {
        return {
          label: `${d.title || d.name}${
            d.ownername ? `<div class="sub">${d.ownername}</div>` : ''
          }`,
          value: d.path || d.id,
          type: 'radio',
        };
      });
      opts.push({
        node: 'select',
        name: key,
        label: `Select a ${key.slice(0, -1)}`, // TO DO: TRANSLATE
        options: module_opts[key],
        resolve: function (node) {
          let path;
          let src;
          if (key === 'files') {
            src = node.value;
          } else {
            path = `/${language}/view/${key.slice(0, -1)}?id=${node.value}`;
            src = new URL(path, url.origin).href;
          }

          return new Promise(async (resolve) => {
            resolve(
              window.location.replace(
                `/share/resource?token=${encodeURIComponent(
                  token,
                )}&src=${src}`,
              ),
            );
          });
        },
      });
      if (['templates', 'pads'].includes(key)) {
        opts.push({
          node: 'div',
          class: 'divider',
          label: vocabulary['or'],
        });
        if (templates[key]?.length) {
          template_opts[key] = templates[key].map((d) => {
            return {
              label: `${d.title || d.name}${
                d.ownername ? `<div class="sub">${d.ownername}</div>` : ''
              }`,
              value: d.id,
              type: 'radio',
            };
          });

          // let { write } = modules.find(d => d.type === key)?.rights
          // if (write) {
          // 	if (typeof write === 'object') write = write.blank
          // 	if (write <= rights) {

          if (rights[key] === 'write') {
            template_opts[key].unshift({
              label: vocabulary['blank pad'],
              value: 'blank',
              type: 'radio',
            });
          }
          // }
          // }

          opts.push({
            node: 'select',
            name: `template-${key}`,
            label: `Create a new ${key.slice(0, -1)} (based on a template)`, // TO DO: TRANSLATE
            options: template_opts[key],
            resolve: function (node) {
              if (node.value !== 'blank')
                window.location.replace(
                  `/${language}/contribute/${key.slice(0, -1)}?template=${
                    node.value
                  }&token=${encodeURIComponent(
                    token,
                  )}&action=publish_and_share`,
                );
              else
                window.location.replace(
                  `/${language}/contribute/${key.slice(
                    0,
                    -1,
                  )}?token=${encodeURIComponent(
                    token,
                  )}&action=publish_and_share`,
                );
            },
          });
        } else {
          opts.push({
            node: 'button',
            type: 'button',
            label: `Create a new ${key.slice(0, -1)}`, // TO DO: TRANSLATE
            resolve: (_) => {
              window.location.replace(
                `/${language}/contribute/${key.slice(
                  0,
                  -1,
                )}?token=${encodeURIComponent(token)}`,
              );
            },
          });
        }
      } else if (key === 'files') {
        opts.push({
          node: 'div',
          class: 'divider',
          label: 'OR', // TO DO: TRANSLATE
        });
        opts.push({
          node: 'input',
          type: 'file',
          name: 'file',
          accept: 'application/pdf,image/*,video/*,audio/*',
          placeholder: `Upload a new ${key.slice(0, -1)}`, // TO DO: TRANSLATE
          resolve: function (node) {
            const formData = new FormData();
            formData.append(this.name, node.files[0], node.files[0].name);

            const form = {
              action: '/upload/file',
              method: 'POST',
              data: formData,
            };

            // const storage_url = new URL(`<%- locals.metadata.site.app_storage %>`)
            // storage_url.pathname = `${storage_url.pathname}/${'/uploads/save'}`.replace(/\/\//g, '/')

            return new Promise(async (resolve) => {
              const res = await uploadFile(form, language);
              if (res.every((d) => d.status === 200)) {
                const filepath = res[0].src;

                const storage_url = new URL(
                  d3.select('data[name="app_storage"]').node(),
                );
                storage_url.pathname =
                  `${storage_url.pathname}/${filepath}`.replace(/\/\//g, '/');
                const src = new URL(storage_url.pathname, storage_url.origin)
                  .href;

                resolve(
                  window.location.replace(
                    `/share/resource?token=${encodeURIComponent(
                      token,
                    )}&src=${src}`,
                  ),
                );
              }
            });
          },
        });
      }
      if (key !== Object.keys(data)[Object.keys(data).length - 1]) {
        opts.push({
          node: 'div',
          class: 'divider',
          label: vocabulary['or'],
        });
      }
    }
  }

  const close = function () {
    window.location.replace(
      `/share/resource?token=${encodeURIComponent(token)}`,
    ); // DO NOT PASS A RESOURCE, SO ESSENTIALLY CANCEL THE REQUEST
  };

  const mobilization = await renderPromiseModal({ headline, opts }, close);
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', DOMLoad);
} else {
  DOMLoad();
}
