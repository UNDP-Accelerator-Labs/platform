import { setDownloadOptions } from '/js/browse/download.js';
// FIXME: reactivate explorations later
// import { getExploration } from '/js/browse/exploration.js';
import {
  confirmRemoval,
  deleteArticles,
  unpublishArticles,
} from '/js/browse/main.js';
import { getCurrentLanguage, getTranslations } from '/js/config/main.js';
import { POST } from '/js/fetch.js';
import { d3, uuidv4 } from '/js/globals.js';
import { dateOptions, fixLabel, getContent, getMediaSize } from '/js/main.js';
import { renderFormModal, renderImgZoom } from '/js/modals.js';
import { isLoading } from '/js/notification/loader.js';
import { showToast } from '/js/notification/toast.js';

// TO DO: THIS CREATES AN ERROR FOR THE MAP ON THE HOMEPAGE (WHERE THERE IS NO fixedEid AND NO NEED FOR AN EXPLORATION)
// THIS ALSO CREATES AN ERROR FOR SLIDESHOWS

export const Entry = function (_kwargs) {
  const mediaSize = getMediaSize();

  let {
    parent,
    data,
    language,
    vocabulary,
    object,
    space,
    modules,
    pinboards,
    engagementtypes,
    rights,
    app_storage,
    page,
  } = _kwargs;

  this.id = uuidv4();
  this.language = language;
  this.data = data;
  this.container = parent
    .addElem(
      'article',
      `${object.slice(0, -1)}${page.display === 'slideshow' ? ' slide' : ''}`,
    )
    .datum(data)
    .each(function (d) {
      d3.select(this).classed(`status-${d.status}`, true);
    });

  this.inner = this.container
    .addElems('div', 'inner')
    .classed('centered', (d) => {
      return (
        page.display === 'slideshow' &&
        d.img?.length === 0 &&
        d.items === undefined &&
        d.participants?.contributors === undefined &&
        !d.associated_pads?.length &&
        !d.associated_mobilizations?.length &&
        d.private_associated_pads === undefined && // THIS IS DEPRECATED
        d.ongoing_associated_mobilizations === undefined &&
        d.past_associated_mobilizations === undefined
      );
    });
  this.outer = this.container
    .addElems('div', 'outer')
    .addElems('div', 'inner');

  this.head = this.inner.addElems('div', 'head');
  this.body = this.inner.addElems('div', 'body').classed('full-width', (d) => {
    return (
      page.display !== 'columns' &&
      d.img?.length === 0 &&
      d.items === undefined &&
      d.participants?.contributors === undefined &&
      !d.associated_pads?.length &&
      !d.associated_mobilizations?.length &&
      d.private_associated_pads === undefined && // THIS IS DEPRECATED
      d.ongoing_associated_mobilizations === undefined &&
      d.past_associated_mobilizations === undefined
    );
  });
  this.foot = this.inner.addElems('div', 'foot', (d) => {
    if (
      page.display === 'columns' ||
      d.img?.length > 0 ||
      d.items !== undefined ||
      d.participants?.contributors !== undefined ||
      d.associated_pads?.length ||
      d.associated_mobilizations?.length ||
      d.private_associated_pads !== undefined || // THIS IS DEPRECATED
      d.ongoing_associated_mobilizations !== undefined ||
      d.past_associated_mobilizations !== undefined
    ) {
      return [d];
    } else return [];
  });

  if (page.display !== 'columns')
    this.metagroup = this.head.addElems('div', 'meta meta-group');

  this.render = {
    owner: function (_sel) {
      const metainfo = _sel.addElems('div', 'meta meta-data');

      metainfo
        .addElems('div', 'meta meta-contributor', (d) => {
          let data = [];
          if (
            (['pads', 'files'].includes(object) &&
              ['private', 'curated', 'shared'].includes(space)) ||
            ['templates', 'mobilizations'].includes(object)
          ) {
            data = [
              {
                href: `?contributors=${d.owner}`,
                name: d.ownername || vocabulary['anonymous contributor'],
              },
            ];

            if (d.locations?.length) {
              d.locations.forEach((c) => {
                data.push({
                  href: `?countries=${c.iso3}`,
                  name:
                    c.iso3 === 'NUL'
                      ? vocabulary['global']
                      : c.country || vocabulary['anonymous contributor'],
                });
              });
            } else {
              data.push({
                href: `?countries=${d.iso3}`,
                name:
                  d.iso3 === 'NUL'
                    ? vocabulary['global']
                    : d.country || vocabulary['anonymous contributor'],
              });
            }
          } else if (object === 'reviews') {
            data = [
              {
                href: d.is_review ? `?contributors=${d.owner}` : null,
                name:
                  space === 'private'
                    ? d.is_review
                      ? d.ownername
                      : vocabulary['blinded for review']
                    : null,
              },
            ];
          } else {
            if (d.locations?.length) {
              data = d.locations.map((c) => {
                return {
                  href: `?countries=${c.iso3}`,
                  name:
                    c.iso3 === 'NUL'
                      ? vocabulary['global']
                      : c.country || vocabulary['anonymous contributor'],
                };
              });
            } else {
              data = [
                {
                  href: `?countries=${d.iso3}`,
                  name:
                    d.iso3 === 'NUL'
                      ? vocabulary['global']
                      : d.country || vocabulary['anonymous contributor'],
                },
              ];
            }
          }
          return data;
        })
        .addElems('a', 'contributor-name')
        .attr('href', (d) => d.href)
        .html((d) => d.name);

      metainfo.addElems('div', 'meta meta-date').html((d) => {
        if (d.date) {
          let dateobj = new Date(d.date);
          if (!(dateobj instanceof Date && !isNaN(dateobj)) && d.date.date) {
            dateobj = new Date(d.date.date);
          }
          return new Date(dateobj).toLocaleDateString(language, dateOptions);
        } else if (d.start_date) {
          if (object === 'contributors') {
            const start = new Date(d.start_date).toLocaleDateString(
              language,
              dateOptions,
            );
            let str = `${vocabulary['joined on']} ${start}`;

            if (d.end_date) {
              const end = new Date(d.end_date).toLocaleDateString(
                language,
                dateOptions,
              );
              str += `, ${vocabulary['left on'].toLowerCase()} ${end}`;
            }
            return str;
          } else {
            if (d.end_date) {
              return (
                new Date(
                  d.start_date?.date || d.start_date,
                ).toLocaleDateString(language, dateOptions) +
                ' – ' +
                new Date(d.end_date?.date || d.end_date).toLocaleDateString(
                  language,
                  dateOptions,
                )
              );
            } else
              return new Date(
                d.start_date?.date || d.start_date,
              ).toLocaleDateString(language, dateOptions);
          }
        } else return d.email;
      });
    },
    actions: function (_sel) {
      // <%#
      // 	let { write } = modules.find(d => d.type === object)?.rights
      // 	if (object === 'pads' && typeof write === 'object') write = Math.min(write.blank ?? Infinity, write.templated ?? Infinity)
      // 	if (rights >= (write ?? Infinity))
      // { %>
      if (rights[object] === 'write') {
        _sel
          .addElems('div', 'btn-group')
          .addElems('form', 'actions', (d) => {
            const opts = [];

            if (
              ['private', 'pinned'].includes(space) &&
              object !== 'reviews'
            ) {
              if (d.editable)
                opts.push({
                  node: 'button',
                  type: 'button',
                  classname: 'delete',
                  label: vocabulary['delete'],
                  fn: deleteArticles,
                });
            } else if (space === 'curated') {
              if (d.editable && !d.owner)
                opts.push({
                  node: 'button',
                  type: 'button',
                  classname: 'delete',
                  label: vocabulary['delete'],
                  fn: deleteArticles,
                });
            }
            if (object === 'pads') {
              opts.push({
                node: 'button',
                type: 'button',
                classname: 'download',
                label: vocabulary['download'],
                name: 'pads',
                value: d.id,
                disabled: d.status < 2,
                fn: setDownloadOptions,
              });
            }
            // CHANGED THE LOGIC HERE FOR THE PUBLICATION LIMIT
            if (['files', 'pads'].includes(object)) {
              if (d.editable) {
                const publish_dropdown = [];
                const exceeds_publication_limit =
                  d.available_publications === 0;

                if (modules.some((d) => d.type === 'reviews')) {
                  if (d.status === 1 && !exceeds_publication_limit) {
                    publish_dropdown.push({
                      name: 'status',
                      value: 2,
                      classname: 'preprint',
                      label:
                        vocabulary['object status'][object.slice(0, -1)][2][
                          'singular'
                        ],
                    });
                  }
                  if (d.status <= 2 && d.review_status === 0) {
                    if (!(d.status === 1 && exceeds_publication_limit)) {
                      publish_dropdown.push({
                        name: 'review_status',
                        value: 1,
                        classname: 'review',
                        label: vocabulary['submit for review'],
                        fn: selectReviewLanguage,
                      });
                    }
                  }
                } else {
                  if (d.status === 1 && !exceeds_publication_limit) {
                    publish_dropdown.push({
                      name: 'status',
                      value: 2,
                      classname: 'internally',
                      label: vocabulary['internally'],
                    });
                  }
                  if (
                    d.status <= 2 &&
                    (d.publishable === undefined || d.publishable === true)
                  ) {
                    if (!(d.status === 1 && exceeds_publication_limit)) {
                      publish_dropdown.push({
                        name: 'status',
                        value: 3,
                        classname: 'externally',
                        label: vocabulary['externally'],
                      });
                    }
                  }
                }

                opts.push({
                  action: `/publish/${object}`,
                  method: 'GET',
                  node: 'button',
                  type: 'button',
                  value: d.id,
                  disabled: !(
                    d.editable &&
                    [1, 2].includes(d.status) &&
                    publish_dropdown.length
                  ),
                  classname: 'publish',
                  label: vocabulary['publish'],
                  dropdown: publish_dropdown,
                  inputs: [
                    { name: 'id', value: d.id },
                    { name: 'title', value: d.title },
                  ],
                });

                // if (d.status > 1) opts.push({ action: `/publish/${object}`, method: 'GET', node: 'button', type: 'submit', value: d.id, disabled: !d.editable, classname: 'unpublish', label: vocabulary['unpublish'], inputs: [{ name: 'status', value: 1 }] })
                if (d.status > 1) {
                  opts.push({
                    node: 'button',
                    type: 'button',
                    value: d.id,
                    disabled: !d.editable,
                    classname: 'unpublish',
                    label: vocabulary['unpublish'],
                    fn: unpublishArticles,
                  });
                }
              }
            } else if (object === 'templates') {
              if (d.editable) {
                if (d.status === 1) {
                  opts.push({
                    action: `/publish/${object}`,
                    method: 'GET',
                    node: 'button',
                    type: 'submit',
                    value: d.id,
                    disabled: !d.editable,
                    classname: 'publish',
                    label: vocabulary['publish'],
                    inputs: [{ name: 'status', value: 2 }],
                  });
                }

                if (space !== 'reviews') {
                  // if (d.status > 1 && d.retractable) opts.push({ action: `/publish/${object}`, method: 'GET', node: 'button', type: 'submit', value: d.id, disabled: !d.editable, classname: 'unpublish', label: vocabulary['unpublish'], inputs: [{ name: 'status', value: 1 }] })
                  if (d.status > 1 && d.retractable) {
                    opts.push({
                      node: 'button',
                      type: 'button',
                      value: d.id,
                      disabled: !d.editable,
                      classname: 'unpublish',
                      label: vocabulary['unpublish'],
                      fn: unpublishArticles,
                    });
                  }
                }
              }
            } else if (object === 'reviews') {
              if (space === 'pending') {
                if (!d.is_review) {
                  if (
                    d.reviewers <
                    modules.find((d) => d.type === 'reviews')?.reviewers
                  ) {
                    opts.push({
                      action: '/accept/review',
                      method: 'GET',
                      node: 'button',
                      type: 'submit',
                      classname: 'accept',
                      label: vocabulary['accept'],
                      value: d.id,
                      inputs: [{ name: 'template', value: d.review_template }],
                    });
                    if (!d.required) {
                      opts.push({
                        action: '/decline/review',
                        method: 'GET',
                        node: 'button',
                        type: 'submit',
                        classname: 'decline',
                        label: vocabulary['decline'],
                        value: d.id,
                      });
                    }
                  }
                } else {
                  if (d.editable) {
                    if (d.status === 1) {
                      opts.push({
                        action: `/publish/${object}`,
                        method: 'GET',
                        node: 'button',
                        type: 'submit',
                        value: d.id,
                        disabled: !(
                          d.editable &&
                          [1, 2].includes(d.status) &&
                          d.is_review
                        ),
                        classname: 'publish',
                        label: vocabulary['publish'],
                        inputs: [
                          { name: 'status', value: 2 },
                          { name: 'source', value: d.source },
                        ],
                      });
                    }
                  }
                }
              }
            } else if (object === 'mobilizations') {
              if (d.status === 1) {
                opts.push({
                  node: 'button',
                  type: 'button',
                  classname: 'copy',
                  label: vocabulary['copy link'],
                  value: d.id,
                  inputs: [
                    { name: 'template', value: d.template },
                    { name: 'language', value: d.language },
                  ],
                  fn: copyLink,
                });
              }
              opts.push({
                node: 'button',
                type: 'button',
                disabled: d.pads === 0,
                classname: 'download',
                label: vocabulary['download'],
                name: 'mobilizations',
                value: d.id,
                fn: setDownloadOptions,
              }); // TO DO: CHECK IF THIS WORKS

              if (d.status === 1) {
                opts.push({
                  action: `/unpublish/${object}`,
                  method: 'GET',
                  node: 'button',
                  type: 'submit',
                  disabled: !(d.editable && d.status === 1),
                  classname: 'demobilize',
                  label: vocabulary['demobilize'],
                  value: d.id,
                });
              }
              if (d.status === 2) {
                opts.push({
                  action: `/${language}/contribute/mobilization`,
                  method: 'GET',
                  node: 'button',
                  type: 'submit',
                  disabled: !(
                    d.editable &&
                    d.status === 2 &&
                    d.pads !== 0 &&
                    !d.following_up
                  ),
                  classname: 'followup',
                  label: vocabulary['follow up']['verb'],
                  name: 'source',
                  value: d.id,
                });
              }
              if (d.status === 2) {
                opts.push({
                  action: `/${language}/contribute/mobilization`,
                  method: 'GET',
                  node: 'button',
                  type: 'submit',
                  disabled: !(d.editable && d.status === 2),
                  classname: 'copy',
                  label: vocabulary['copy']['verb'],
                  name: 'source',
                  value: d.id,
                  inputs: [{ name: 'copy', value: true }],
                });
              }
            } else if (object === 'contributors') {
              if (space === 'invited') {
                opts.push({
                  node: 'button',
                  type: 'button',
                  classname: 'revoke',
                  label: vocabulary['revoke'],
                  name: 'contributor',
                  value: d.id,
                  disabled: ![null, undefined].includes(d.end_date),
                  fn: revoke,
                });
              }
            }

            return opts;
          })
          .attrs({
            action: (d) => d.action,
            method: (d) => d.method,
            target: (d) => d.target || null,
          })
          .each(function (d) {
            const sel = d3.select(this);
            sel.addElems('input', 'get-value', d.inputs || []).attrs({
              type: 'hidden',
              name: (c) => c.name,
              value: (c) => c.value,
            });

            sel
              .addElems(d.node, 'btn-overlay', [d])
              .classed(d.classname.toLowerCase(), true)
              .attrs({
                type: (c) => c.type,
                name: (c) => c.name || 'id',
                value: (c) => c.value,
                disabled: (c) => c.disabled || null,
              })
              .html((c) => c.label)
              .on('click', function (c) {
                c.fn?.call(this) || null;
                this.focus();
              })
              .on('focus', (_) => {
                const dropdown = sel.select('.dropdown');
                if (dropdown.node()) {
                  if (dropdown.node().style.maxHeight)
                    dropdown.node().style.maxHeight = null;
                  else
                    dropdown.node().style.maxHeight = `${Math.min(
                      dropdown.node().scrollHeight,
                      300,
                    )}px`;
                  dropdown
                    .selectAll('button')
                    .on('mousedown', (_) => d3.event.preventDefault());
                }
              })
              .on('blur', (_) => {
                const dropdown = sel.select('.dropdown');
                if (dropdown.node()) dropdown.node().style.maxHeight = null;
              });

            if (d.dropdown?.length) {
              // const dropdown =
              sel
                .addElems('div', 'dropdown')
                .addElems('menu', 'opts')
                .addElems('li', 'opt', d.dropdown)
                .addElems('button')
                .classed('highlight', (c) => c.highlight || false)
                .attrs({
                  type: (c) => (c.fn ? 'button' : 'submit'),
                  name: (c) => c.name,
                  value: (c) => c.value,
                  disabled: (c) => (c.disabled && !c.highlight) || null,
                })
                .html((c) => c.label)
                .on('click', function (c) {
                  c.fn?.call(this, d) || null;
                });
            }
          });

        async function selectReviewLanguage(datum) {
          const { inputs } = datum;
          const { name, value } = d3.select(this).datum();

          const target_opts = await POST('/load/templates', {
            space: 'reviews',
          }).then((results) => {
            return results.data.map((d) => {
              return {
                label: d.name,
                value: d.language,
                count: d.count,
                disabled: {
                  value: d.disabled,
                  label: vocabulary['missing reviewers'],
                },
                type: 'radio',
                required: true,
              };
            });
          });

          // TO DO: FILTER THIS BASED ON USER RIGHTS >= review.rights.write
          const reviewers = await POST(
            `/${language}/browse/contributors/all`,
            { limit: null },
          );
          const reviewer_opts = reviewers.data.map((d) => {
            d.secondary_languages.push(d.language);
            return {
              label: d.name,
              value: d.id,
              type: 'checkbox',
              classname: d.secondary_languages.join(' '),
            };
          }); // TO DO: IMPROVE THIS
          const formdata = { action: '/request/review', method: 'POST' };
          const message = vocabulary['select review language'];

          const opts = [];
          opts.push({
            node: 'select',
            name: 'language',
            label: vocabulary['select language']['singular'],
            options: target_opts,
            fn: updateReviewerList,
          });
          opts.push({
            node: 'select',
            name: 'reviewers',
            label: `${vocabulary['select']} ${
              modules.find((d) => d.type === 'reviews')?.reviewers
            } ${vocabulary['reviewers']} (${vocabulary['optional']})`,
            options: reviewer_opts,
            classname: 'reviewer-list hide',
            fn: countReviewers,
          });

          inputs.forEach((d) => {
            opts.push({
              node: 'input',
              type: 'hidden',
              name: d.name,
              value: d.value,
            });
          });

          opts.push({
            node: 'button',
            type: 'submit',
            name: name,
            value: value,
            disabled: true,
            label: vocabulary['submit for review'],
          });
          // const new_constraint =
          await renderFormModal({
            message,
            formdata,
            opts,
          });
          // THIS IS A FORM MODAL SO IT SHOULD RELOAD THE PAGE
        }

        function updateReviewerList(d) {
          const { value: language } = d;
          const form = d3.select(this.form);
          const reviewer_list = form.selectAll('.reviewer-list');
          const list = reviewer_list.selectAll('.dropdown menu li');
          const button = form.select('button[type=submit]');
          button.node().disabled = false;

          reviewer_list.classed('hide', false);
          list
            .classed('persistent-hide', function () {
              return !d3.select(this).classed(language);
            }) // THIS CANNOT BE A SIMPLE hide CALSS AS IT CONFLICTS WITH THE SEARCH OPERATIONS (BECAUSE IT ALSO USES THE class='hide')
            .select('input')
            .each(function () {
              this.disabled = !d3.select(this.parentNode).classed(language);
            });
        }
        function countReviewers(d) {
          const form = d3.select(this.form);
          const button = form.select('button[type=submit]');
          const count = form.selectAll('input[name=reviewers]:checked').size();
          if (
            ![
              0,
              modules.find((d) => d.type === 'reviews')?.reviewers,
            ].includes(count)
          )
            button.node().disabled = true;
          else button.node().disabled = false;
        }

        function copyLink(datum) {
          // INSPIRED BY: https://www.w3schools.com/howto/howto_js_copy_clipboard.asp
          const sel = d3.select(this);
          const { value, inputs } = sel.datum();
          const template = inputs.find((d) => d.name === 'template').value;
          const language = inputs.find((d) => d.name === 'language').value;

          const url = new URL(window.location);
          const queryparams = new URLSearchParams();
          queryparams.set('mobilization', value);
          queryparams.set('template', template);

          const link = `${
            url.origin
          }/${language}/contribute/pad?${queryparams.toString()}`;
          navigator.clipboard.writeText(link);

          sel.classed('active', true).html(vocabulary['copied']);
          setTimeout((_) => {
            sel.classed('active', false).html(vocabulary['copy link']);
          }, 1000);
        }
        async function revoke() {
          const sel = d3.select(this);
          const { value } = sel.datum();

          // SET END DATE
          const formdata = { action: `/delete/${object}`, method: 'GET' };
          const message = vocabulary['set user end date'];
          const opts = [];

          const today = new Date();
          const dd = String(today.getDate()).padStart(2, '0');
          const mm = String(today.getMonth() + 1).padStart(2, '0');
          const yyyy = today.getFullYear();

          // opts.push({ node: 'input', type: 'date', name: 'invite', value: `${yyyy}-${mm}-${dd}` })
          opts.push({
            node: 'input',
            type: 'date',
            name: 'date',
            value: `${yyyy}-${mm}-${dd}`,
          });
          // opts.push({ node: 'input', type: 'email', name: 'email' })

          // SET WHETHER TO EXCLUDE OR TO REMOVE RIGHTS
          // opts.push({ node: 'input', type: 'radio', name: 'type', value: 'revoke', placeholder: 'Remove user rights', checked: true, default: true }) // TO DO: TRANSLATE
          // opts.push({ node: 'input', type: 'radio', name: 'type', value: 'delete', placeholder: 'Exclude from platform and suite', checked: false, default: true }) // TO DO: TRANSLATE

          opts.push({
            node: 'input',
            type: 'hidden',
            name: 'id',
            value: value,
          });
          opts.push({
            node: 'button',
            type: 'submit',
            label: vocabulary['revoke'],
          });
          // const new_constraint =
          await renderFormModal({
            message,
            formdata,
            opts,
          });
        }
      }
    },
    img: function (_sel) {
      _sel
        .addElems('div', 'media media-img', (d) => (d.img?.length ? [d] : []))
        .addElems('a', 'pad-link')
        // .attrs({
        // 	'href': d => {
        // 		const queryparams = new URLSearchParams()
        // 		if (d.id) queryparams.set('id', d.id)
        // 		if (d.source) queryparams.set('source', d.source)
        // 		if (d.is_followup || d.is_review) queryparams.set('display', 'adjacent-source')
        // 		if ((d.is_review) && d.review_template) queryparams.set('template', d.review_template)

        // 		if (object === 'reviews') {
        // 			if (!d.is_review && d.reviews?.length > 0) {
        // 				queryparams.set('display', 'adjacent-reviews')
        // 				return `/${language}/view/pad?${queryparams.toString()}`
        // 			}
        // 		}
        // 		if (d.editable) return `/${language}/edit/${object.slice(0, -1)}?${queryparams.toString()}`
        // 		else return `/${language}/view/${object.slice(0, -1)}?${queryparams.toString()}`
        // 	}
        // })
        .on('click', async function (d) {
          // THIS ENLARGES THE IMAGE INSTED OF OPENING THE PAD
          const img = d3.select(this).select('img').node().src;
          await renderImgZoom({ src: img.replace('/sm/', '/') });
        })
        .addElems('img', 'vignette')
        .attrs({ loading: 'lazy', alt: (_) => vocabulary['missing image'] })
        .each(function (d) {
          const node = this;
          const sel = d3.select(this);
          const img = new Image();
          img.onload = function () {
            node.src = this.src;
          };
          img.onerror = function () {
            sel.remove();
            return null;
          };

          if (!Array.isArray(d.img)) d.img = [d.img];

          let source = undefined;
          if (app_storage) {
            source = new URL(`${app_storage}${d.img[0]}`).href;
          } else {
            source = d.img[0];
          }

          if (page.display === 'slideshow' || mediaSize === 'xs') {
            img.src = source.replace('uploads/sm/', 'uploads/');
          } else img.src = source;
        });
    },
    stats: function (_sel) {
      const stats = _sel
        .addElems('div', 'meta meta-group', (d) => {
          if (['pads', 'files'].includes(object)) {
            return [];
          } else {
            return !d.img?.length ? [d] : [];
          }
        })
        .addElems('div', 'meta meta-stats', (d) => {
          const data = [];
          if (d.items !== undefined) {
            const obj = {};
            obj.type = 'item';
            obj.label =
              vocabulary['item'][d.items !== 1 ? 'plural' : 'singular'];
            obj.count = d.items;
            data.push(obj);
          }

          /*
				if (![undefined, null].includes(d.contributors) && ![undefined, null].includes(d.participants)) {
					const obj = {}
					obj.type = 'contributor'
					obj.label = vocabulary['contributor'][d.participants !== 1 ? 'plural' : 'singular']
					obj.count = d.contributors
					obj.text = `${d.contributors} <small class='total'>/ ${d.participants}</small>`
					data.push(obj)
				}
				if (d.private_associated_pads !== undefined) { // THIS IS DEPRECATED
					const obj = {}
					obj.type = 'pad'
					obj.label = `${vocabulary['object status']['pad'][0][d.private_associated_pads !== 1 ? 'plural' : 'singular']} ${vocabulary['pad'][d.private_associated_pads !== 1 ? 'plural' : 'singular'].toLowerCase()}`
					obj.count = d.private_associated_pads
					obj.href = `/${language}/browse/pads/curated?${object}=${d.id}&status=0&status=1`
					data.push(obj)
				}
				*/
          if (d.participants) {
            const { contributors, total } = d.participants;
            const obj = {};
            obj.type = 'contributor';
            obj.label =
              vocabulary['contributor'][total !== 1 ? 'plural' : 'singular'];
            obj.count = contributors;
            obj.href = `/${language}/view/${object.slice(0, -1)}?id=${
              d.id
            }&display=stats`;
            obj.text = `${contributors} <small class='total'>/ ${total}</small>`;
            data.push(obj);
          }
          if (d.associated_pads?.length) {
            d.associated_pads.forEach((c) => {
              const obj = {};
              obj.type = 'pad';
              obj.label =
                vocabulary['object status']['pad'][c.status][
                  c.count !== 1 ? 'plural' : 'singular'
                ];
              obj.count = c.count;
              let space = 'curated';
              if (c.status >= 2) space = 'published';
              obj.href = `/${language}/browse/pads/${space}?${object}=${d.id}&status=${c.status}`;
              data.push(obj);
            });
          }
          if (d.associated_mobilizations?.length) {
            d.associated_mobilizations.forEach((c) => {
              const obj = {};
              obj.type = 'mobilization';
              obj.label =
                vocabulary['mobilization'][
                  c.count !== 1 ? 'plural' : 'singular'
                ].toLowerCase();
              obj.count = c.count;
              let space = 'ongoing';
              if (c.status === 2) space = 'past';
              obj.href = `/${language}/browse/mobilizations/${space}?${object}=${d.id}`;
              data.push(obj);
            });
          }

          if (d.ongoing_associated_mobilizations !== undefined) {
            const obj = {};
            obj.type = 'mobilization';
            obj.label =
              vocabulary['mobilization'][
                d.count !== 1 ? 'plural' : 'singular'
              ].toLowerCase();
            obj.count = d.ongoing_associated_mobilizations;
            obj.href = `/${language}/browse/mobilizations/ongoing?${object}=${d.id}`;
            data.push(obj);
          }
          if (d.past_associated_mobilizations !== undefined) {
            const obj = {};
            obj.type = 'mobilization';
            obj.label =
              vocabulary['mobilization'][
                d.count !== 1 ? 'plural' : 'singular'
              ].toLowerCase();
            obj.count = d.past_associated_mobilizations;
            obj.href = `/${language}/browse/mobilizations/ongoing?${object}=${d.id}`;
            data.push(obj);
          }
          return data;
        })
        .addElems('a')
        .classed('disabled', (d) => !d.href)
        .attr('href', (d) => d.href)
        .addElems('h1')
        .html((d) => d.text || d.count);
      stats.addElems('small', 'light').html((d) => d.label);
    },
    title: function (_sel) {
      const title = _sel
        .addElems('div', 'media media-title')
        .addElems('a', 'pad-link')
        .attrs({
          href: (d) => {
            const queryparams = new URLSearchParams();
            if (d.id) queryparams.set('id', d.id);
            if (d.source) queryparams.set('source', d.source);
            if (d.is_followup || d.is_review) {
              queryparams.set('display', 'adjacent-source');
            }
            if (d.is_review && d.review_template) {
              queryparams.set('template', d.review_template);
            }

            if (object === 'reviews') {
              if (!d.is_review && d.reviews?.length > 0) {
                queryparams.set('display', 'adjacent-reviews');
                return `/${language}/view/pad?${queryparams.toString()}`;
              }
            }
            if (object === 'files') {
              if (d.url) {
                return d.url;
              } else return null;
            }
            if (d.editable)
              return `/${language}/edit/${object.slice(
                0,
                -1,
              )}?${queryparams.toString()}`;
            else
              return `/${language}/view/${object.slice(
                0,
                -1,
              )}?${queryparams.toString()}`;
          },
          target: (d) => {
            if (object === 'files') {
              return '_blank';
            } else {
              return '_self';
            }
          },
        })
        .addElems('h1');
      title.addElems('img').attr('src', (d) => {
        if (d.is_followup)
          return `/imgs/icons/i-followup-${object.slice(0, -1)}.svg`;
        else if (d.is_forward)
          return `/imgs/icons/i-forward-${object.slice(0, -1)}.svg`;
        else if (d.is_copy)
          return `/imgs/icons/i-copy-${object.slice(0, -1)}.svg`;
        else {
          if (object === 'reviews') {
            return '/imgs/icons/i-pad.svg';
          } else {
            return `/imgs/icons/i-${object.slice(0, -1)}.svg`;
          }
        }
      });
      title.addElems('span').html((d) => {
        if (d.is_review)
          return `[${vocabulary['review']['preposition']}] ${d.source_title}`;
        else
          return (
            d.title ||
            d.name ||
            `[${vocabulary[`untitled ${object.slice(0, -1)}`]}]`
          );
      });
    },
    txt: function (_sel) {
      _sel
        .addElems('div', 'media media-txt', (d) => {
          if (d.txt) {
            if (!Array.isArray(d.txt)) d.txt = [d.txt];
            return d.txt.map((c) => {
              return {
                id: d.id,
                editable: d.editable,
                source: d.source,
                is_followup: d.is_followup,
                is_review: d.is_review,
                reviews: d.reviews,
                txt: c.split(/\n\n+/)[0],
              };
            });
          } else return [];
        })
        .addElems('a', 'pad-link')
        .attrs({
          href: (d) => {
            const queryparams = new URLSearchParams();
            if (d.id) queryparams.set('id', d.id);
            if (d.source) queryparams.set('source', d.source);
            if (d.is_followup || d.is_review)
              queryparams.set('display', 'adjacent-source');
            if (d.is_review && d.review_template)
              queryparams.set('template', d.review_template);

            if (object === 'reviews') {
              if (!d.is_review && d.reviews?.length > 0) {
                queryparams.set('display', 'adjacent-reviews');
                return `/${language}/view/pad?${queryparams.toString()}`;
              }
            }
            if (d.editable)
              return `/${language}/edit/${object.slice(
                0,
                -1,
              )}?${queryparams.toString()}`;
            else
              return `/${language}/view/${object.slice(
                0,
                -1,
              )}?${queryparams.toString()}`;
          }, // , 'target': '_blank'
        })
        .html((d) => {
          if (d.txt.length > 500)
            return `${d.txt
              .replace(/\n/g, ' ')
              .replace(/\s+/, ' ')
              .slice(0, 500)}… <span class='read-more'>[${
              vocabulary['read more']
            }]</span>`;
          else return d.txt.replace(/\n/g, ' ').replace(/\s+/, ' ');
        });
    },
    tags: function (_sel) {
      // TO DO: UPDATE THIS WITH metafields
      const taggroup = _sel.addElems('div', 'meta tag-group');
      const sdgs = taggroup.addElems('div', 'meta meta-sdgs', (d) =>
        d.sdgs?.length ? [d.sdgs] : [],
      );
      sdgs
        .addElems('span')
        .html(
          (d) =>
            vocabulary['sdg'][(d?.length || 0) !== 1 ? 'plural' : 'singular'],
        );
      sdgs
        .addElems('a', 'sdg-link', (d) => d)
        .attr('href', (d) => `?sdgs=${d.key || d}`)
        .html((d) => d.key || d);
      taggroup
        .addElems('div', 'meta meta-tags', (d) =>
          d.tags?.length ? [d.tags] : [],
        )
        .addElems('a', 'tag-link', (d) => d)
        .attr('href', (d) => `?${d.type}=${d.id}`)
        .addElems('div', 'tag')
        .attr('title', (d) => d.name.capitalize())
        .addElems('label')
        .html((d) => {
          if (d.name.length > 25)
            return `${d.name.slice(0, 25).capitalize()}…`;
          else return d.name.capitalize();
        });
    },
    metainfo: function (_sel) {
      const {
        source,
        is_followup,
        is_forward,
        is_copy,
        is_child,
        version_depth,
      } = _sel.datum();

      let treeinfo;
      if (source) {
        treeinfo = _sel.addElems('div', 'meta meta-tree');

        if (version_depth > 1) {
          const versiontree = treeinfo
            .addElems('div', 'meta meta-versiontree')
            .addElems('a')
            .attr(
              'href',
              (d) => `/${language}/browse/${object}/versiontree?nodes=${d.id}`,
            );
          versiontree
            .addElems('img')
            .attr('src', '/imgs/icons/i-versiontree.svg');
          versiontree.addElems('small').html((d) => d.version_depth);
        }
      }
      if (source && is_followup) {
        const followup = treeinfo
          .addElems('div', 'meta meta-followup')
          .attr('title', (d) => d.source_title);
        followup
          .addElems('i')
          .html(`${vocabulary['follow up']['preposition']}:&nbsp;`);
        followup
          .addElems('a')
          .attrs({
            href: (d) => {
              if (d.editable)
                return `/${language}/edit/${object.slice(0, -1)}?id=${
                  d.source
                }`;
              else
                return `/${language}/view/${object.slice(0, -1)}?id=${
                  d.source
                }`;
            }, // , 'target': '_blank'
          })
          .html((d) => d.source_title);
      }
      if (source && is_forward) {
        const forward = treeinfo
          .addElems('div', 'meta meta-forward')
          .attr('title', (d) => d.source_title);
        forward.addElems('i').html(`${vocabulary['forwarded from']}:&nbsp;`);
        forward
          .addElems('a')
          .attrs({
            href: (d) => {
              if (d.editable)
                return `/${language}/edit/${object.slice(0, -1)}?id=${
                  d.source
                }`;
              else
                return `/${language}/view/${object.slice(0, -1)}?id=${
                  d.source
                }`;
            }, // , 'target': '_blank'
          })
          .html((d) => d.source_title);
      }
      if (source && is_copy) {
        const copy = treeinfo
          .addElems('div', 'meta meta-copy', (d) =>
            d.source && d.is_copy ? [d] : [],
          )
          .attr('title', (d) => d.source_title);
        copy.addElems('i').html(`${vocabulary['copy']['preposition']}:&nbsp;`);
        copy
          .addElems('a')
          .attrs({
            href: (d) => {
              if (d.editable)
                return `/${language}/edit/${object.slice(0, -1)}?id=${
                  d.source
                }`;
              else
                return `/${language}/view/${object.slice(0, -1)}?id=${
                  d.source
                }`;
            }, // , 'target': '_blank'
          })
          .html((d) => d.source_title);
      }
      if (source && is_child) {
        const child = treeinfo
          .addElems('div', 'meta meta-child', (d) =>
            d.source && d.is_child ? [d] : [],
          )
          .attr('title', (d) => d.source_title);
        child.addElems('i').html(`${vocabulary['expansion']}: `);
        child
          .addElems('a')
          .attrs({
            href: (d) => {
              if (d.editable)
                return `/${language}/edit/${object.slice(0, -1)}?id=${
                  d.source
                }`;
              else
                return `/${language}/view/${object.slice(0, -1)}?id=${
                  d.source
                }`;
            }, // , 'target': '_blank'
          })
          .html((d) => d.source_title);
      }

      _sel
        .addElems('div', 'meta meta-mobilization', (d) =>
          d.mobilization ? [d] : [],
        )
        .attr('title', (d) => d.mobilization_title)
        .html(`<i>${vocabulary['mobilization']['singular']}:</i> `)
        .addElems('a')
        .attr('href', (d) => `?mobilizations=${d.mobilization}`)
        .html((d) =>
          d.mobilization_title?.length > 25
            ? `${d.mobilization_title.slice(0, 25)}…`
            : d.mobilization_title,
        );

      if (object === 'mobilizations') {
        _sel
          .addElems('div', 'meta meta-public', (d) => (d.public ? [d] : []))
          .html(`<i>${vocabulary['public mobilization']}</i> `);
      }

      _sel
        .addElems('div', 'meta meta-template', (d) => (d.template ? [d] : []))
        .attr('title', (d) => d.template_title)
        .html(`<i>${vocabulary['template']['singular']}:</i> `)
        .addElems('a')
        .attrs({
          href: (d) => `/${language}/view/template?id=${d.template}`,
          // 'target': '_blank'
        })
        .html((d) =>
          d.template_title?.length > 25
            ? `${d.template_title.slice(0, 25)}…`
            : d.template_title,
        );

      if (object === 'reviews' && space === 'private') {
        _sel
          .addElems('div', 'meta meta-reviewers', (d) => {
            return !d.reviewer_pooled &&
              ![null, undefined].includes(d.reviewers)
              ? [d]
              : [];
          })
          .html((d) => {
            return `<strong>${d.reviewers}</strong><small> / ${
              modules.find((d) => d.type === 'reviews').reviewers
            }</small> ${
              vocabulary['reviewers accepted'][
                d.reviewers !== 1 ? 'plural' : 'singular'
              ]
            }`;
          });
      }
    },
    followup: function (_sel) {
      if (
        this.data.editable &&
        (this.data.followups?.length > 0 || this.data.forwards?.length > 0)
      ) {
        const group = _sel.addElems('div', 'meta forward-group');

        if (this.data.followups?.length) {
          const btn = group.addElems('div', 'create follow-up');
          btn
            .addElems('button')
            .html(vocabulary['follow up']['verb'])
            .on('click', function () {
              this.focus();
            })
            .on('focus', (_) => {
              const dropdown = btn.select('.dropdown');
              if (dropdown.node()) {
                if (dropdown.node().style.maxHeight)
                  dropdown.node().style.maxHeight = null;
                else
                  dropdown.node().style.maxHeight = `${Math.min(
                    dropdown.node().scrollHeight,
                    300,
                  )}px`;
                dropdown
                  .selectAll('button')
                  .on('mousedown', (_) => d3.event.preventDefault());
              }
            })
            .on('blur', (_) => {
              const dropdown = btn.select('.dropdown');
              if (dropdown.node()) dropdown.node().style.maxHeight = null;
            });

          btn
            .addElems('div', 'dropdown')
            .addElems('menu')
            .addElems('li', 'follow-up-option', (d) => d.followups)
            .addElems('a')
            .attrs({
              href: (d) => {
                const queryparams = new URLSearchParams();
                queryparams.set('source', d.source);
                queryparams.set('template', d.template);
                queryparams.set('mobilization', d.id);
                queryparams.set('display', 'adjacent-source');

                return `/${language}/contribute/${object.slice(
                  0,
                  -1,
                )}?${queryparams.toString()}`;
                // `/${language}/contribute/${object.slice(0, -1)}?source=${
                //   d.source
                // }&template=${d.template}&mobilization=${
                //   d.id
                // }&display=adjacent-source`
              },
            })
            .addElems('button')
            .html((d) =>
              d.title.length > 40 ? `${d.title.slice(0, 40)}…` : d.title,
            )
            .on('click', function (d) {
              const sel = d3.select(this);
              const li = sel.findAncestor('follow-up-option');
              const button = li.findAncestor('follow-up');
              if (d.count + 1 >= d.max) li.remove();
              if (button.selectAll('li').size() === 0) button.remove();
            });
        }

        if (this.data.forwards?.length) {
          const btn = group.addElems('div', 'create forward');
          btn
            .addElems('button')
            .html(vocabulary['forward'])
            .on('click', function () {
              this.focus();
            })
            .on('focus', (_) => {
              const dropdown = btn.select('.dropdown');
              if (dropdown.node()) {
                if (dropdown.node().style.maxHeight)
                  dropdown.node().style.maxHeight = null;
                else
                  dropdown.node().style.maxHeight = `${Math.min(
                    dropdown.node().scrollHeight,
                    300,
                  )}px`;
                dropdown
                  .selectAll('button')
                  .on('mousedown', (_) => d3.event.preventDefault());
              }
            })
            .on('blur', (_) => {
              const dropdown = btn.select('.dropdown');
              if (dropdown.node()) dropdown.node().style.maxHeight = null;
            });
          btn
            .addElems('div', 'dropdown')
            .addElems('menu')
            .addElems('li', 'forward-option', (d) => d.forwards)
            .addElems('a')
            .attrs({
              href: (d) =>
                `/forward/${object.slice(0, -1)}?id=${d.source}&mobilization=${
                  d.id
                }`,
            }) // TO DO: CHECK THIS WORKS
            .addElems('button')
            .html((d) => {
              if (mediaSize === 'xs' && d.title.length > 25)
                return `${d.title.slice(0, 25)}…`;
              else return d.title;
            })
            .on('click', function (d) {
              const sel = d3.select(this);
              const li = sel.findAncestor('forward-option');
              const button = li.findAncestor('forward');
              if (d.count + 1 >= d.max) li.remove();
              if (button.selectAll('li').size() === 0) button.remove();
            });
        }
      }
    }.bind(this),
    engagement: function (_sel) {
      // <%# if (!['mobilizations', 'contributors', 'reviews'].includes(object)
      // 	&& !publicpage
      // 	&& locals.metadata.site.engagementtypes?.length)
      // { %>
      if (
        !['mobilizations', 'contributors', 'reviews'].includes(object) &&
        page.type !== 'public' &&
        engagementtypes?.length
      ) {
        const engagementgroup = _sel.addElems(
          'div',
          'engagement-group',
          (d) => (d.status > 1 ? [d] : []),
        );

        engagementtypes.forEach((e) => {
          engagementgroup
            .addElems('button', `engagement engagement-${e}`)
            .each(function (d) {
              if (e === 'like') {
                this.disabled = d.disliked;
              } else if (e === 'dislike') {
                this.disabled = d.liked;
              }
              const sel = d3.select(this);
              sel.classed(
                'active',
                d[e.charAt(e.length - 1) !== 'e' ? `${e}ed` : `${e}d`],
              );

              sel.addElems('img').attr('src', (d) => {
                if (!sel.classed('active'))
                  return `/imgs/icons/i-${e}-outline${
                    mediaSize === 'xs' ? '-sm' : ''
                  }.svg`;
                else
                  return `/imgs/icons/i-${e}${
                    mediaSize === 'xs' ? '-sm' : ''
                  }.svg`;
              });
              sel.addElems('span', 'count').html((d) => d[`${e}s`]);
            })
            .on('click', async function (d) {
              if (['like', 'dislike'].includes(e)) {
                const sel = d3.select(this);

                isLoading(true);

                const res = await POST('/engage', {
                  object: object.slice(0, -1),
                  id: d.id,
                  type: e,
                  action: !sel.classed('active') ? 'insert' : 'delete',
                });

                if (res.status === 200) {
                  sel.toggleClass('active');
                  sel.select('img').attr('src', (c) => {
                    if (!sel.classed('active'))
                      return `/imgs/icons/i-${e}-outline${
                        mediaSize === 'xs' ? '-sm' : ''
                      }.svg`;
                    else
                      return `/imgs/icons/i-${e}${
                        mediaSize === 'xs' ? '-sm' : ''
                      }.svg`;
                  });
                  let count = +sel.select('span').node().innerText;
                  if (res.active === true) count++;
                  else count--;
                  sel.select('span').html(count);

                  if (e === 'like') {
                    engagementgroup
                      .select('button.engagement-dislike')
                      .attr('disabled', res.active);
                  } else if (e === 'dislike') {
                    engagementgroup
                      .select('button.engagement-like')
                      .attr('disabled', res.active);
                  }
                  isLoading(false);
                } else isLoading(false);
              }
            });
        });
      }

      if (['pads', 'templates'].includes(object)) {
        const readsCounter = _sel
          .addElems('span', 'engagement-group page-stats')
          .addElems('button', 'engagement engagement-reads');
        readsCounter
          .addElems('img', 'engagement-reads-icon')
          .attr('src', '/imgs/icons/i-eye.svg');
        readsCounter.addElems('span', 'engagement-reads-count').text((d) => {
          return d.readCount ?? '0';
        });
      }
    },
    pin: function (_sel) {
      // <%# if ((object === 'pads'
      // 	&& modules.some(d => d.type === 'pinboards' && rights >= d.rights.write)
      // 	) || (
      // 	object === 'contributors'
      // 	&& modules.some(d => d.type === 'teams' && rights >= d.rights.write)
      // 	)
      // ) { %>
      if (
        (object === 'pads' && rights['pin-to-pinboards'] === 'write') ||
        (object === 'contributors' && rights['pin-to-teams'] === 'write')
      ) {
        pinboards = pinboards.filter((pb) => !pb.is_exploration);

        function renderPins(_group, _data) {
          const pin = _group.addElems(
            'div',
            'pin tag',
            (d) => {
              return (
                _data
                  ?.filter((pb) => !pb.is_exploration)
                  .map((c) =>
                    Object.assign(Object.assign({}, c), { object_id: d.id }),
                  ) || []
              );
            },
            (d) => d.id,
          );
          pin
            .addElems('label', 'name')
            .classed('notranslate', true)
            .attr('title', (d) => d.title)
            .html((d) => {
              if (d.title.length > 25) return `${d.title.slice(0, 25)}…`;
              else return d.title;
            });
          pin
            .addElems('label', 'close', (d) => (d.editable ? [d] : []))
            .on('click', async function (d) {
              // SHOW LOADER
              isLoading(true);

              const res = await POST('/pin', {
                board_id: d.id,
                object_id: d.object_id,
                action: 'delete',
                object: object.slice(0, -1),
              });
              if (res.status === 200) {
                showToast(
                  'Successfully deleted pad from pinboard.',
                  'success',
                );

                if (space === 'pinned') {
                  location.reload();
                } else {
                  pins.call(renderPins, res.pins);
                  if (res.pinboards_list.length !== pinboards.length) {
                    location.reload();
                  }
                  pinboards = res.pinboards_list.filter(
                    (pb) => !pb.is_exploration,
                  );
                  renderDropdown(d.object_id);
                  renderPinNavigation(res.pinboards_list);
                }
              } else {
                isLoading(false);
                showToast('Error occurred! Please try again.', 'danger');
              }
            });
        }
        function renderPinOptions(_input, _data) {
          const dropdown = _input.addElems('div', 'dropdown').addElems('menu');
          const opts = dropdown.addElems('li', 'pinboard', _data, (d) => d.id);
          opts
            .addElems('input')
            .attrs({
              id: (d) => `board-${d.id}-object-${d.object_id}`,
              type: 'checkbox',
              checked: (d) => d.checked,
            })
            .on('change', async function (d) {
              const sel = d3.select(this);
              const pins = sel.findAncestor('pinboard-group').select('.pins');

              if (this.checked) {
                isLoading(true);
                const res = await POST('/pin', {
                  board_id: d.id,
                  object_id: d.object_id,
                  action: 'insert',
                  object: object.slice(0, -1),
                });
                if (res.status === 200) {
                  pins.call(renderPins, res.pins);
                  pinboards = res.pinboards_list.filter(
                    (pb) => !pb.is_exploration,
                  );
                  renderDropdown(d.object_id);
                  renderPinNavigation(res.pinboards_list);

                  showToast(
                    'Successfully added pad from pinboard.',
                    'success',
                  );
                  isLoading(false);
                } else {
                  showToast('Error occurred! Please try again.', 'danger');
                  isLoading(false);
                }
              } else {
                isLoading(true);
                const res = await POST('/pin', {
                  board_id: d.id,
                  object_id: d.object_id,
                  action: 'delete',
                  object: object.slice(0, -1),
                });
                if (res.status === 200) {
                  pins.call(renderPins, res.pins);
                  if (res.pinboards_list.length !== pinboards.length) {
                    location.reload();
                  }
                  pinboards = res.pinboards_list.filter(
                    (pb) => !pb.is_exploration,
                  );
                  renderDropdown(d.object_id);
                  renderPinNavigation(res.pinboards_list);

                  showToast(
                    'Successfully deleted pad from pinboard.',
                    'success',
                  );
                  isLoading(false);
                } else {
                  showToast('Error occurred! Please try again.', 'danger');
                  isLoading(false);
                }
              }
            });
          opts
            .addElems('label', 'title')
            .classed('notranslate', true)
            .attr('for', (d) => `board-${d.id}-object-${d.object_id}`)
            .html((d) => d.title)
            .addElems('span', 'count')
            .html((d) => d.count);
        }
        function renderPinNavigation(_data) {
          // NOTE: d can be undefined here for elements that were
          // added through ejs instead of d3
          const lglis = d3
            .select('#pinboards-list-lg menu')
            .addElems('li', null, _data, (d) => (d ? d.id : -1));
          const lgas = lglis.addElems('a');
          lgas
            .classed('notranslate', true)
            .attr('href', (d) => `./pinned?pinboard=${d.id}`)
            .html((d) =>
              d.is_exploration
                ? `${vocabulary['exploration']['exploration']}: ${d.title}`
                : d.title,
            );
          lgas.addElems('span', 'count').html((d) => d.count);
          const xslis = d3
            .select('#pinboards-list-xs menu')
            .addElems('li', null, _data, (d) => (d ? d.id : -1));
          const xsas = xslis.addElems('a');
          xsas
            .classed('notranslate', true)
            .attr('href', (d) => `./pinned?pinboard=${d.id}`)
            .html((d) =>
              d.is_exploration
                ? `${vocabulary['exploration']['exploration']}: ${d.title}`
                : d.title,
            );
          xsas.addElems('span', 'count').html((d) => d.count);
        }

        const pinPbMap = {};
        const pingroup = _sel.addElems('div', 'pinboard-group');
        const pins = pingroup.addElems('div', 'pins').each(function (d) {
          pinPbMap[d.id] = d;
          d3.select(this).call(renderPins, d.pinboards);
        });

        const newpin = pingroup.addElems('div', 'add filter', (d) => {
          if (object === 'contributors' && !d.editable) return [];
          else return [d];
        });

        const renderDropdown = (pid) => {
          const d = pinPbMap[pid];
          const data = pinboards.map((c) =>
            Object.assign(Object.assign({}, c), {
              object_id: d.id,
              checked: d.pinboards?.some((b) => b.id === c.id) ? true : null,
            }),
          );
          // RENDER THE DROPDOWN
          newpin.call(renderPinOptions, data);
        };

        newpin
          .addElems('input')
          .attrs({ type: 'text', id: `new-pinboard-${this.id}` })
          .on('keyup', function (d) {
            const evt = d3.event;
            const node = this;
            const dropdown = d3
              .select(node)
              .findAncestor('filter')
              .select('.dropdown');
            dropdown.selectAll('menu li').classed('hide', function () {
              return !this.textContent
                .trim()
                .toLowerCase()
                .includes(node.value.trim().toLowerCase());
            });

            if (evt.code === 'Enter' || evt.keyCode === 13) {
              evt.preventDefault();
              newpin.select('button').node().click();
            }
          })
          .on('focus', function (d) {
            renderDropdown(d.id);

            const filter = d3.select(this).findAncestor('filter');
            const dropdown = filter.select('.dropdown');
            let { top, height } = this.getBoundingClientRect();
            top = top + height;
            const viewheight = window.innerHeight;

            if (mediaSize === 'xs') {
              // const { height: padding } = d3.select('#search-and-filter').node().getBoundingClientRect()
              // if (!padding) padding = 0
              // if (top + 300 >= viewheight - padding) dropdown.classed('dropup', true)
              // else dropdown.classed('dropup', false)

              filter.classed('expand', true);
            } else if (top + 300 >= viewheight)
              dropdown.classed('dropup', true);
            else dropdown.classed('dropup', false);

            dropdown.node().style.maxHeight = `${Math.min(
              dropdown.node().scrollHeight,
              300,
            )}px`;

            dropdown.selectAll('li').on('mousedown', function () {
              d3.event.preventDefault();
            });
          })
          .on('blur', function () {
            const filter = d3.select(this).findAncestor('filter');
            const dropdown = filter.select('.dropdown');
            dropdown.node().style.maxHeight = null;
            fixLabel(this);

            if (mediaSize === 'xs') {
              setTimeout((_) => filter.classed('expand', false), 250);
            }
          });

        newpin
          .addElems('label')
          .attr('for', `new-pinboard-${this.id}`)
          .html((_) => {
            if (object === 'contributors') {
              return vocabulary['assign to teams'];
            } else {
              return vocabulary['add to collection'];
            }
          });
        newpin
          .addElems('button')
          .attr('type', 'button')
          .on('click', async function (d) {
            const node = newpin.select('input[type=text]').node();

            if (node.value.trim().length) {
              const dropdown = d3
                .select(node)
                .findAncestor('filter')
                .select('.dropdown');

              const existingBoard = dropdown
                .selectAll('menu li:not(.hide) .title')
                .filter(function () {
                  return (
                    this.textContent.trim().toLowerCase() ===
                    node.value.trim().toLowerCase()
                  );
                });

              if (existingBoard.node()) {
                isLoading(true);

                // SIMPLY ADD THE OBJECT TO AN EXISTING BOARD
                const res = await POST('/pin', {
                  board_id: existingBoard.datum().id,
                  object_id: d.id,
                  action: 'insert',
                  object: object.slice(0, -1),
                });
                if (res.status === 200) {
                  pins.call(renderPins, res.pins);
                  pinboards = res.pinboards_list.filter(
                    (pb) => !pb.is_exploration,
                  );
                  renderDropdown(d.id);
                  renderPinNavigation(res.pinboards_list);

                  isLoading(false);
                } else isLoading(false);
              } else {
                // SHOW LOADER
                isLoading(true);

                // CREATE A NEW BOARD AND ADD THE OBJECT TO IT
                const res = await POST('/pin', {
                  board_title: node.value.trim(),
                  object_id: d.id,
                  action: 'insert',
                  object: object.slice(0, -1),
                });

                if (res.status === 200) {
                  showToast(
                    'Successfully created pinboard and added pad.',
                    'success',
                  );
                  // RELOAD THE PAGE
                  location.reload();
                } else {
                  isLoading(false);
                  showToast(
                    'Error occurred while trying to create pinboard. Please try again!',
                    'danger',
                  );
                }
              }
              // RESET DROPDOWN
              this.value = '';
              dropdown.selectAll('menu li').classed('hide', false);
            }
          });
      }
    }.bind(this),
    unpublish: function (_sel) {
      const form = _sel.addElems('form', 'unpublish hide').attrs({
        method: 'GET',
        action: `/publish/${object}`,
      });
      form.addElems('input', 'pad-id').attrs({
        type: 'hidden',
        name: 'id',
        value: (d) => d.id,
      });
      form.addElems('input', 'pad-status').attrs({
        type: 'hidden',
        name: 'status',
        value: 1,
      });

      form
        .addElems('button', 'opt', (d) => {
          const opts = [];
          opts.push({
            type: 'button',
            class: 'Confirm', // THIS NEEDS TO BE 'en' FOR THA CLASSNAME
            label: vocabulary['confirm'],
            fn: confirmRemoval,
          });
          opts.push({
            type: 'button',
            class: 'Cancel', // THIS NEEDS TO BE 'en' FOR THA CLASSNAME
            label: vocabulary['cancel'],
            fn: unpublishArticles,
          });
          return opts;
        })
        .attrs({
          class: (d) => d.class.toLowerCase(),
          type: (d) => d.type,
          value: (d) => d.value,
        })
        .html((d) => d.label)
        .on('click', function (d) {
          d.fn ? d.fn.call(this, 'unpublish') : null;
          isLoading(true);
        });
    },
    delete: function (_sel) {
      const form = _sel.addElems('form', 'delete hide').attrs({
        method: 'GET',
        action: `/delete/${object}`,
      });
      form.addElems('input', 'pad-id').attrs({
        type: 'hidden',
        name: 'id',
        value: (d) => d.id,
      });

      form
        .addElems('button', 'opt', (d) => {
          const opts = [];
          opts.push({
            type: 'button',
            class: 'Confirm', // THIS NEEDS TO BE 'en' FOR THA CLASSNAME
            label: vocabulary['confirm'],
            fn: confirmRemoval,
          });
          opts.push({
            type: 'button',
            class: 'Cancel', // THIS NEEDS TO BE 'en' FOR THA CLASSNAME
            label: vocabulary['cancel'],
            fn: deleteArticles,
          });
          return opts;
        })
        .attrs({
          class: (d) => d.class.toLowerCase(),
          type: (d) => d.type,
          value: (d) => d.value,
        })
        .html((d) => d.label)
        .on('click', function (d) {
          d.fn ? d.fn.call(this, 'delete') : null;
        });
    },
    contributor: function (_sel) {
      // THIS DOES NOT SEEM TO BE USED
      const name = _sel
        .addElems('div', 'media media-name')
        .addElems('a', 'pad-link')
        .attrs({
          href: (d) => {
            const query = `id=${d.uuid}`;
            if (d.editable)
              return `/${language}/edit/${object.slice(0, -1)}?${query}`;
            else return `/${language}/view/${object.slice(0, -1)}?${query}`;
          }, // , 'target': '_blank'
        })
        .addElems('h1');
      name.addElems('img').attr('src', (d) => {
        if (d.is_followup)
          return `/imgs/icons/i-followup-${object.slice(0, -1)}.svg`;
        else if (d.is_forward)
          return `/imgs/icons/i-forward-${object.slice(0, -1)}.svg`;
        else if (d.is_copy)
          return `/imgs/icons/i-copy-${object.slice(0, -1)}.svg`;
        else return `/imgs/icons/i-${object.slice(0, -1)}.svg`;
      });
      name
        .addElems('span')
        // .html(d => d.name || `[${vocabulary[`untitled ${object.slice(0, -1)}`]?.[language]}]`)
        .html(
          (d) =>
            d.name || `[${vocabulary[`untitled ${object.slice(0, -1)}`]}]`,
        );

      _sel.addElems('div', 'meta meta-email').html((d) => d.email);

      _sel.addElems('div', 'meta meta-position').html((d) => d.position);

      _sel.addElems('div', 'meta meta-country').html((d) => d.countryname);
    },
    exploration: async (_sel) => {
      // FIXME: reactivate explorations later
      // (await getExploration()).addDocButtons(_sel, true);
    },
  };
};
export async function renderVignette(_section, _kwargs) {
  const language = await getCurrentLanguage();
  const vocabulary = await getTranslations(language);
  const mediaSize = getMediaSize();
  const { data, object, space, page } = _kwargs;

  const entry = new Entry({
    parent: _section,
    data,
    language,
    vocabulary,
    object,
    space,
    modules: JSON.parse(d3.select('data[name="site"]').node()?.value).modules,
    pinboards: JSON.parse(
      d3.select('data[name="pinboards"]').node()?.value || '[]',
    ),
    engagementtypes: JSON.parse(
      d3.select('data[name="engagementtypes"]').node()?.value,
    ),
    rights: JSON.parse(d3.select('data[name="rights"]').node()?.value),
    app_storage: d3.select('data[name="app_storage"]').node()?.value,
    page,
  });
  // CREATE ALIAS FOR render
  const render = entry.render;

  if (page.display === 'columns') {
    render.img(entry.head);
    render.actions(entry.head);
    // if (mediaSize !== 'xs') render.stats(entry.head)
    // render.tags(entry.body)
    render.title(entry.body);
    render.owner(entry.body);
    if (page.type === 'private') {
      render.followup(entry.body);
    }
    // if (data.img?.length === 0) render.txt(entry.body)
    render.txt(entry.body);
    if (page.type === 'private') {
      render.metainfo(entry.body);
    }
    render.tags(entry.body);
    // if (mediaSize === 'xs') render.stats(entry.foot)
    if (mediaSize !== 'xs') render.stats(entry.foot);
    render.engagement(entry.foot);
    render.pin(entry.foot);
    render.delete(entry.outer);
    render.unpublish(entry.outer);
    await render.exploration(entry.foot);
  } else if (page.display === 'slideshow') {
    render.img(entry.head);
    render.owner(entry.metagroup);
    render.title(entry.body);
    render.txt(entry.body);
    render.tags(entry.body);
    render.stats(entry.foot);
  } else {
    render.owner(entry.metagroup);
    render.actions(entry.metagroup);
    render.title(entry.body);
    render.txt(entry.body);
    if (page.type === 'private') {
      render.metainfo(entry.body);
      render.followup(entry.body);
    }
    render.tags(entry.body);
    render.engagement(entry.body);
    render.img(entry.foot);
    render.stats(entry.foot);
    render.pin(entry.inner);
    render.delete(entry.outer);
    render.unpublish(entry.outer);
    await render.exploration(entry.foot);
  }
}
export async function renderSections() {
  const mediaSize = getMediaSize();
  const { sections: data } = await getContent();

  const object = d3.select('data[name="object"]').node().value;
  const space = d3.select('data[name="space"]').node().value;
  const page = JSON.parse(d3.select('data[name="page"]').node().value);
  if (mediaSize === 'xs' && object === 'pads') {
    // ON sm DEVICES, FORCE DISPLAY TO COLUMNS IF NOT A SLIDESHOW
    if (page.display !== 'slideshow') {
      page.display = 'columns';
    }
  }

  const main = d3.select('div.browse main');
  const layout = main.select('div.inner');
  const sections = layout.addElems('section', `container ${object}`, data);

  if (!page.mapscale || page.mapscale === 'contain') {
    const arenders = [];
    sections.addElems('div', 'layout').each(function (d) {
      const section = d3.select(this);
      arenders.push(async () => {
        section.classed(page.display, true);
      });
      (d.data ?? []).forEach((c) => {
        arenders.push(async () => {
          await renderVignette(section, { data: c, object, space, page });
        });
      });
    });
    for (const arender of arenders) {
      await arender();
    }

    if (page.display === 'slideshow') {
      initSlideshow();
    }
  }
}
function initSlideshow() {
  const slideshow = d3.select('div.layout.slideshow');
  const slides = slideshow.selectAll('.slide');
  const { pages, id: page } = JSON.parse(
    d3.select('data[name="page"]').node().value,
  );

  d3.select('div.browse')
    .addElems('button', 'slide-nav', [
      { label: '&lsaquo;', class: 'prev' },
      { label: '&rsaquo;', class: 'next' },
    ])
    .each(function (d) {
      d3.select(this).classed(d.class, true);
    })
    .classed('hide', (d) => {
      // const sel =
      d3.select(this);
      let focus_id = 0;
      d3.selectAll('.slide').each(function (c, i) {
        if (d3.select(this).classed('slide-in-view')) focus_id = i;
      });
      if (d.class === 'prev' && focus_id === 0) {
        if (pages && page === 1) {
          return true;
        } else {
          return false;
        }
      } else if (d.class === 'next' && focus_id === slides.size() - 1) {
        if (pages && page === pages) {
          return true;
        } else {
          return false;
        }
      } else return false;
    })
    .html((d) => d.label)
    .on('click', (d) => {
      if (d.class === 'prev') switchslide(idx - 1);
      else if (d.class === 'next') switchslide(idx + 1);
    })
    .on('mouseup', function () {
      d3.event.stopPropagation();
      // LOSE FOCUS OF THIS BUTTON TO RE-ENABLE KEYBOARD NAVIGATION
      this.blur();
    });
  // ADD DOTS
  d3.select('footer .dots')
    .addElems('div', 'dot', new Array(slides.size()).fill(0))
    .classed('highlight', (d, i) => i === 0)
    .on('click', (d, i) => {
      switchslide(i);
    });

  let idx = 0;
  const slidewidth =
    slides.node().clientWidth ||
    slides.node().offsetWidth ||
    slides.node().scrollWidth;

  function switchslide(i) {
    slideshow.node().scrollTo({
      top: 0,
      left: i * slidewidth,
      behavior: 'smooth',
    });

    if (i > slides.size() - 1) {
      if (pages && page < pages) {
        const url = new URL(window.location);
        const queryparams = new URLSearchParams(url.search);
        queryparams.set('page', page + 1);
        window.location = `${url.pathname}?${queryparams.toString()}`;
      }
    } else if (i < 0) {
      if (pages && page > 1) {
        // WE KEEP THE pages AT THE BEGINNING TO MAKE SURE THE PAGINATION SCHEMA IS NUMERIC (FOR EXAMPLE, IN THE CASE OF CONTRIBUTORS, IT IS ALPHABETIC)
        const url = new URL(window.location);
        const queryparams = new URLSearchParams(url.search);
        queryparams.set('page', page - 1);
        window.location = `${url.pathname}?${queryparams.toString()}`;
      }
    }

    return (idx = i);
  }

  slideshow.on('scroll', function () {
    if (this.scrollLeft % slidewidth === 0) {
      idx = Math.round(this.scrollLeft / slidewidth);
      d3.selectAll('.dot').classed('highlight', (d, i) => i === idx);
      d3.selectAll('button.slide-nav').classed('hide', (d) => {
        if (d.class === 'prev' && idx === 0) {
          if (pages && page === 1) {
            return true;
          } else {
            return false;
          }
        } else if (d.class === 'next' && idx === slides.size() - 1) {
          if (pages && page === pages) {
            return true;
          } else {
            return false;
          }
        } else return false;
      });
    }
  });
}
