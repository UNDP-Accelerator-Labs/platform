import { getCurrentLanguage, getTranslations } from '/js/config/main.js';
import { d3 } from '/js/globals.js';
import { getContent, uploadFile } from '/js/main.js';
import { renderPromiseModal } from '/js/modals.js';

async function onLoad() {
  const language = await getCurrentLanguage();
  const vocabulary = await getTranslations(language);
  const rights = JSON.parse(d3.select('data[name="rights"]').node().value);
  const resources = JSON.parse(
    d3.select('data[name="req_resources"]').node().value,
  );
  // LOAD DATA
  const [readables, writables] = await getContent({ resources });
  // const { modules } = await POST('/load/metadata', { feature: [ 'modules' ] })

  // CREATE MODAL
  const headline = 'Select a resource.'; // TO DO: TRANSLATE
  const opts = [];

  const url = new URL(window.location);
  const queryparams = new URLSearchParams(url.search);
  const token = queryparams.get('token');

  const module_opts = {};
  const template_opts = {};

  resources.forEach((key) => {
    if (readables?.[key]?.length) {
      module_opts[key] = readables[key].map((d) => {
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

          return async () => {
            return window.location.replace(
              `/share/resource?token=${encodeURIComponent(token)}&src=${src}`,
            );
          };
        },
      });
      if (key !== Object.keys(readables)[Object.keys(readables).length - 1]) {
        if (opts.length && opts[opts.length - 1]?.class !== 'divider') {
          opts.push({
            node: 'div',
            class: 'divider',
            label: vocabulary['or'].toUpperCase(),
          });
        }
      }
    }
    if (['templates', 'pads'].includes(key) && writables[key]) {
      if (opts.length && opts[opts.length - 1]?.class !== 'divider') {
        opts.push({
          node: 'div',
          class: 'divider',
          label: vocabulary['or'].toUpperCase(),
        });
      }
      if (writables[key]?.length) {
        template_opts[key] = writables[key].map((d) => {
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
                }&token=${encodeURIComponent(token)}&action=publish_and_share`,
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
    } else if (key === 'files' && writables[key]) {
      if (opts.length && opts[opts.length - 1]?.class !== 'divider') {
        opts.push({
          node: 'div',
          class: 'divider',
          label: vocabulary['or'].toUpperCase(),
        });
      }
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

          return async () => {
            const res = await uploadFile(form, language);
            if (res.every((d) => d.status === 200)) {
              const filepath = res[0].src;

              const storage_url = new URL(
                d3.select('data[name="app_storage"]').node().value,
              );
              storage_url.pathname =
                `${storage_url.pathname}/${filepath}`.replace(/\/\//g, '/');
              const src = new URL(storage_url.pathname, storage_url.origin)
                .href;

              return window.location.replace(
                `/share/resource?token=${encodeURIComponent(
                  token,
                )}&src=${src}`,
              );
            }
          };
        },
      });
    }
  });

  const close = function () {
    window.location.replace(
      `/share/resource?token=${encodeURIComponent(token)}`,
    ); // DO NOT PASS A RESOURCE, SO ESSENTIALLY CANCEL THE REQUEST
  };

  // const mobilization =
  await renderPromiseModal({ headline, opts }, close);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', onLoad);
} else {
  await onLoad();
}
