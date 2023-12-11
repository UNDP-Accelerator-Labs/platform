import { getCurrentLanguage } from '/js/config/main.js';
import { filterDropdown, getMediaSize, uploadFile } from '/js/main.js';

async function onLoad() {
  const language = await getCurrentLanguage();
  const mediaSize = getMediaSize();

  // EXPAND NAVIGATION ON SMALL DISPLAYS
  d3.select('button#expand-nav').on('click', function () {
    d3.select(this).toggleClass('close');
    d3.select('header').toggleClass('open');
  });

  const newbtn = d3.select('#site-title .create');
  newbtn
    .selectAll(
      '#filter-pad-templates, #filter-pad-mobilizations, #filter-templates-copy, #filter-deep-dive-pinbords, #filter-mobilization-followup, #filter-mobilization-copy, #filter-mobilization-child',
    )
    .on('keyup.filter', function () {
      filterDropdown(this);
    });
  newbtn.select('#input-file-all').on('change', function () {
    uploadFile(this.form, language);
  });

  // THIS IS FOR MOBILE DISPLAY
  if (['xs', 'sm', 'm'].includes(mediaSize)) {
    newbtn.selectAll('button').on('click', function () {
      const dropdown = d3.select(this.nextElementSibling);
      if (dropdown.node() && dropdown.classed('dropdown')) {
        let { top, height } = this.getBoundingClientRect();
        top = top + height;
        const viewheight = window.innerHeight;
        const mediaSize = getMediaSize();
        if (mediaSize === 'xs' && top + 300 >= viewheight)
          dropdown.classed('dropup', true);

        if (dropdown.node().style.maxHeight) {
          dropdown.node().style.maxHeight = null;
          dropdown.node().style.overflow = null;
          d3.select('#site-title .inner .create').classed('open', false);
          dropdown.findAncestor('li').classed('open', false);
        } else {
          // COLLAPSE ALL DROPDOWNS BETWEEN .main AND target
          if (d3.select(this).hasAncestor('dropdown')) {
            const parent_dropdown = d3.select(this).findAncestor('dropdown');
            parent_dropdown.selectAll('.dropdown').each(function () {
              this.style.maxHeight = null;
              this.style.overflow = null;
              d3.select(this).findAncestor('li').classed('open', false);
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
          d3.select('#site-title .inner .create').classed('open', true);
          dropdown.findAncestor('li')?.classed('open', true);
        }
      }
    });

    window.addEventListener('mouseup', function (e) {
      if (
        e.target.nodeName !== 'HTML' &&
        !d3.select(e.target).hasAncestor('create')
      ) {
        d3.selectAll('#site-title .inner .open')
          .classed('open', false)
          .selectAll('.dropdown')
          .each(function () {
            this.style.maxHeight = null;
            this.style.overflow = null;
          });
      }
    });
  } else if (['lg', 'xl', 'xxl'].includes(mediaSize)) {
    newbtn.selectAll('button').on('click', function () {
      if (this.nextElementSibling?.classList.contains('dropdown')) {
        if (d3.select(this).hasAncestor('dropdown')) {
          const dropdown = d3.select(this).findAncestor('dropdown');
          dropdown.selectAll('li').classed('open', false);
          if (dropdown.hasAncestor('li')) {
            dropdown.findAncestor('li').classed('open', true);
          }
        }
        d3.select('#site-title .inner .create').classed('open', true);
        d3.select(this.parentNode).classed('open', true);
      }
    });
    window.addEventListener('mouseup', function (e) {
      if (
        e.target.nodeName !== 'HTML' &&
        !d3.select(e.target).hasAncestor('create')
      )
        d3.selectAll('#site-title .inner .open').classed('open', false);
    });
  }
}

window.addEventListener('load', onLoad);
