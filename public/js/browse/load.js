import { setDownloadOptions } from '/js/browse/download.js';
import { initSlideshowNavigation } from '/js/browse/keyboard.interactions.js';
import {
  addequivalents,
  expandfilters,
  openPreview,
  pinAll,
  redirect,
  rmtag,
  setShareOptions,
  toggletag,
} from '/js/browse/main.js';
import { renderSections, renderVignette } from '/js/browse/render.js';
import { partialSave } from '/js/browse/save.js';
import { GET, POST } from '/js/fetch.js';
import { d3 } from '/js/globals.js';
import { checkForEnter, fixLabel, getMediaSize } from '/js/main.js';

async function onLoad() {
  const object = d3.select('data[name="object"]').node().value;
  const space = d3.select('data[name="space"]').node().value;
  const {
    load,
    id: page,
    pages,
    display,
  } = JSON.parse(d3.select('data[name="page"]').node().value);

  await renderSections();

  d3.select('button#open-pinboard-preview').on('click', function () {
    openPreview();
  });

  d3.select('button#share-pinboard').on('click', function () {
    setShareOptions(this);
  });

  d3.selectAll('form#pinboard-display-opts input.toggle').on(
    'change.save',
    async function () {
      // IF slideshow THEN PREVENT OTHERS
      const node = this;
      const sel = d3.select(node);
      const menu = sel.findAncestor('menu');
      const parent = sel.findAncestor('li');
      if (node.name === 'slideshow') {
        menu.selectAll('li').each(function () {
          const sel = d3.select(this);
          sel.select('p').classed('disabled', function () {
            return this.parentNode !== parent.node() && node.checked;
          });
          sel.selectAll('input[type=checkbox]').each(function () {
            this.disabled = this.parentNode !== parent.node() && node.checked;
          });
        });
      }
      // IF map THEN ENABLE fullscreen OPTION
      if (node.name === 'display_map') {
        menu.selectAll('li').each(function () {
          const sel = d3.select(this);
          sel.select('p').classed('disabled', function () {
            return (
              this.parentNode !== parent.node() &&
              this.nextElementSibling.name !== 'display_filters' &&
              node.checked
            );
          });
          sel.selectAll('input[type=checkbox]').each(function () {
            this.disabled =
              this.parentNode !== parent.node() &&
              this.name !== 'display_filters' &&
              node.checked;
          });
        });
        const subnode = d3.select('input#display-fullscreen').node();
        subnode.disabled = !node.checked;
        d3.select(subnode)
          .findAncestor('li')
          .select('p')
          .classed('disabled', !node.checked);
      }
      await partialSave('pinboard', node.dataset.id);
    },
  );

  d3.select('div#pinboard-title')
    .on('keydowwn', function () {
      checkForEnter(d3.event, this);
    })
    .on('blur', async function () {
      await partialSave('pinboard', this.dataset.id);
    });

  d3.select('div#pinboard-description').on('blur', async function () {
    await partialSave('pinboard', this.dataset.id);
  });

  d3.select('div#pinboard-section-description').on('blur', async function () {
    await partialSave('section-description', this.dataset.id);
  });

  // SET PAGINATION LINKS
  d3.selectAll('nav.pagination a.page-link').on('click', function () {
    const { value } = this.dataset;
    redirect({ location: null, params: [{ key: 'page', value }] });
  });
  // SET TAB LINKS
  // TO NOTE: ULTIMATELY IT MIGHT BE BETTER TO DEPRECATE THIS
  // BECAUSE IT RESULTS IN SITUATIONS WHERE NOTHING IS DISPLAYED
  // e.g. WHEN FILTERING IN ./published THEN NAVIGATING TO ./private
  // THE USER MAY NOT HAVE ANY ./private PADS THAT MEET THE FILTERING CRITERIA
  d3.selectAll('nav.tabs menu li a').on('click', function () {
    const { location } = this.dataset;
    redirect({
      location,
      params: [{ key: 'page', value: 1 }],
      rm: ['pinboard', 'status', 'section'],
    }); // THE rm HERE IS TO REMOVE ANY params IN THE query THAT SHOULD NOT BE CARRIED OVER FROM ONE TAB TO ANOTHER
  });
  // ADD INTERACTION FOR MAIN SEARCH AND FILTER MODULE
  // REPRINT STATUS TOGGLES IN FILTERS MENU IF sm DISPLY
  const mediaSize = getMediaSize();
  const filter_module = d3.select('#search-and-filter');
  if (mediaSize === 'xs') {
    const status_toggles = filter_module.select('form .status').node();
    const parent = filter_module.select('form .filters').node();
    parent.appendChild(status_toggles);
  }
  filter_module
    .selectAll('.filters .filter .dropdown input[type=checkbox]')
    .on('change', async function () {
      const { id, name } = this.dataset;
      addequivalents(this);
      await toggletag(this, { id, name });
    });
  filter_module
    .selectAll('.filters .active-filters .tag .close')
    .on('click', async function () {
      const { id, name } = this.dataset;
      await rmtag(this, { id, name });
    });
  //  TO DO: CHECK HERE FOR TOGGLE ISSUE
  filter_module.selectAll('.status input.toggle').on('change', function () {
    this.form.requestSubmit[this.form.querySelector('button#search')] ||
      this.form.submit();
  });
  filter_module
    .selectAll('.global-actions .dropdown .pinboard input[type=radio]')
    .on('change', function () {
      pinAll(this);
    });
  filter_module
    .select('.global-actions button.download')
    .on('click', function () {
      setDownloadOptions();
    });
  filter_module.select('button.expand-filters').on('click', function () {
    expandfilters(this);
  });

  // HANDLE TABS DROPDOWNS FOR SMALL DISPLAYS
  if (['xs', 'sm'].includes(mediaSize)) {
    const nav = d3.selectAll('nav.tabs, nav.pinboard-sections');
    const tabs = nav.selectAll(`.inner .${mediaSize}`);
    const button = tabs.selectAll('button.space');

    // HERE WE NEED TO LOOK AT EACH SPECIFIC INSTANCE OF nav.tabs AND nav.pinboard-sections
    // TO SET THE RIGHT NAME
    const active_tab = d3.select(
      `nav.tabs .inner .${mediaSize} .dropdown menu li.active`,
    );
    const button_tab = d3.select(`nav.tabs .inner .${mediaSize} button.space`);
    const active_section = d3.select(
      `nav.pinboard-sections .inner .${mediaSize} .dropdown menu li.active`,
    );
    const button_section = d3.select(
      `nav.pinboard-sections .inner .${mediaSize} button.space`,
    );

    if (active_tab.node()) {
      if (active_tab.select('input')?.node()) {
        button_tab.html(active_tab.select('input').node().value);
      } else {
        button_tab.html(active_tab.select('button').html());
        // active_tab.remove()
      }
    }
    if (active_section.node()) {
      button_section.html(
        active_section
          .select('button')
          .each(function () {
            d3.selectAll(this.children).attr('contenteditable', null);
          })
          .html(),
      );
    }

    button.on('click', function () {
      const sel = d3.select(this);
      const dropdown = d3.select(this.nextElementSibling);
      if (dropdown.node() && dropdown.classed('dropdown')) {
        if (dropdown.node().style.maxHeight) {
          dropdown.node().style.maxHeight = null;
          dropdown.node().style.overflow = null;
          sel.findAncestor('spaces')?.classed('open', false);
          dropdown.findAncestor('li')?.classed('open', false);
        } else {
          // COLLAPSE ALL DROPDOWNS BETWEEN .main AND target
          if (d3.select(this).hasAncestor('dropdown')) {
            const parent_dropdown = d3.select(this).findAncestor('dropdown');
            parent_dropdown.selectAll('.dropdown').each(function () {
              this.style.maxHeight = null;
              this.style.overflow = null;
              d3.select(this).findAncestor('li')?.classed('open', false);
            });
          }

          dropdown.node().style.maxHeight = `${Math.min(
            dropdown.node().scrollHeight,
            300,
          )}px`;
          setTimeout((_) => {
            if (dropdown.select('.dropdown').size() > 0)
              dropdown.node().style.overflow = 'visible';
            else dropdown.node().style.overflow = 'scroll';
          }, 250);
          sel.findAncestor('spaces')?.classed('open', true);
          dropdown.findAncestor('li')?.classed('open', true);
        }
      }
    });

    window.addEventListener('mouseup', function (e) {
      if (
        e.target.nodeName !== 'HTML' &&
        !d3.select(e.target).hasAncestor('spaces')
      ) {
        tabs
          .selectAll('.open')
          .classed('open', false)
          .selectAll('.dropdown')
          .each(function () {
            this.style.maxHeight = null;
            this.style.overflow = null;
          });
      }
    });
  }

  // MAIN SEARCH BAR INTERACTION
  d3.selectAll('.filter input[type=text]')
    .on('keyup.dropdown', function () {
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
    })
    .on('focus.dropdown', function () {
      const dropdown = d3
        .select(this)
        .findAncestor('filter')
        .select('.dropdown');
      let { top, height } = this.getBoundingClientRect();
      top = top + height;
      const viewheight = window.innerHeight;
      if (top + 300 >= viewheight) dropdown.classed('dropup', true);

      const filters = d3.select(this).findAncestor('filters');

      if (dropdown.node())
        dropdown.node().style.maxHeight = `${Math.min(
          dropdown.node().scrollHeight,
          300,
        )}px`;
      if (filters?.node()) filters.node().style.overflow = 'visible';

      if (mediaSize === 'xs')
        d3.select(this).findAncestor('filter').classed('expand', true);

      dropdown.selectAll('label, a').on('mousedown', function () {
        d3.event.preventDefault();
        // this.previousElementSibling.setAttribute('checked', '')
      });
    })
    .on('blur.dropdown', function () {
      const filter = d3.select(this).findAncestor('filter');
      const dropdown = filter.select('.dropdown');
      if (dropdown.node()) dropdown.node().style.maxHeight = null;
      if (mediaSize === 'xs') {
        setTimeout((_) => filter.classed('expand', false), 250);
      }
    });

  // PIN ALL SEARCH BAR
  if (object === 'pads') {
    d3.select('#pin-all')
      .on('keydown', function (d) {
        // EVERYWHERE ELSE THIS IS keyup BUT WE USE keydown HERE TO PREVENT THE FORM FROM FIRING WHEN THE Enter KEY IS PRESSED (TRIGGERED ON keydown)
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
          d3.select('#new-pinboard').node().click();
        }
      })
      .on('focus', function (d) {
        const filters = d3.select('#search-and-filter');
        const filter = d3.select(this).findAncestor('filter');
        const dropdown = filter.select('.dropdown');
        if (dropdown.node())
          dropdown.node().style.maxHeight = `${Math.min(
            dropdown.node().scrollHeight,
            300,
          )}px`;
        if (filters.node()) filters.node().style.overflow = 'visible';

        if (mediaSize === 'xs') filter.classed('expand', true);

        dropdown.selectAll('li').on('mousedown', function () {
          d3.event.preventDefault();
        });
      })
      .on('blur', function () {
        const filters = d3.select('#search-and-filter');
        const filter = d3.select(this).findAncestor('filter');
        const dropdown = filter.select('.dropdown');

        if (dropdown.node()) dropdown.node().style.maxHeight = null;
        if (filters.node) filters.node().style.overflow = 'auto';

        fixLabel(this); // THIS IS NOT WORKING

        if (mediaSize === 'xs') {
          setTimeout((_) => filter.classed('expand', false), 250);
        }
      });

    d3.select('#new-pinboard').on('click', async function () {
      const node = d3.select('#pin-all').node();

      if (node.value.trim().length) {
        const dropdown = d3
          .select(node)
          .findAncestor('filter')
          .select('.dropdown');

        const existingBoard = dropdown
          .selectAll('menu li:not(.hide) .title')
          .filter(function () {
            const match = [...this.childNodes]
              .filter(function (d) {
                return d.nodeType === Node.TEXT_NODE;
              })
              .map((d) => d.textContent.trim().toLowerCase())
              .join(' ');
            return match === node.value.trim().toLowerCase();
          });

        if (existingBoard.node()) {
          // SIMPLY ADD THE OBJECT TO AN EXISTING BOARD
          pinAll(existingBoard.node().previousElementSibling);
        } else {
          // CREATE A NEW BOARD AND ADD THE OBJECT TO IT
          // const pads = await getContent({ feature: 'ids', limit: null });

          const reqbody = {
            board_title: node.value.trim(),
            action: 'insert',
            object: object.slice(0, -1),
            limit: null,
            space,
            load_object: true,
          };

          const url = new URL(window.location);
          const queryparams = new URLSearchParams(url.search);
          queryparams.forEach((value, key) => {
            if (key !== 'page') {
              if (!reqbody[key]) {
                reqbody[key] = value;
              } else {
                if (!Array.isArray(reqbody[key])) {
                  reqbody[key] = [reqbody[key]];
                }
                reqbody[key].push(value);
              }
            }
          });

          const { board_id } = await POST('/pin', reqbody);
          window.location = `./pinned?pinboard=${board_id}`;
        }
        // RESET DROPDOWN
        this.value = '';
        dropdown.selectAll('menu li').classed('hide', false);
      }
    });
  }

  // INITIALIZE THE SLIDESHOW INTERACTION
  if (display === 'slideshow') {
    initSlideshowNavigation();
  }

  // HANDLE LAZY LOADING IF ACTIVATED
  if (load === 'lazy') {
    let lazyloading = false;
    window.onscroll = async function (ev) {
      ev.preventDefault();
      if (
        window.innerHeight + window.scrollY >= document.body.offsetHeight &&
        !lazyloading
      ) {
        console.log('hit the bottom');
        d3.selectAll('.lds-ellipsis').classed('hide', false);

        if (!isNaN(page)) page++;
        lazyloading = true;

        const url = new URL(window.location);
        const queryparams = new URLSearchParams(url.search);
        queryparams.set('page', page);

        const response = await GET(`?${queryparams.toString()}`); // NO TARGET NEEDED SINCE SAME AS CURRENT PAGE

        const asections = [];
        d3.selectAll('section.container div.layout').each(function (d) {
          const section = d3.select(this);
          response.sections
            .find((s) => s.status === d.status)
            .data.forEach((c) =>
              asections.push(
                async () =>
                  await renderVignette(section, { data: c, display }),
              ),
            );
        });
        for (const asection of asections) {
          await asection();
        }

        if (page < pages) lazyloading = false;
        else d3.selectAll('.lds-ellipsis').classed('hide', true);
      }
    };
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', onLoad);
} else {
  onLoad();
}