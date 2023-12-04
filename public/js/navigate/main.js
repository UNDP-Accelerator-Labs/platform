function DOMLoad() {
  if (!mediaSize) var mediaSize = getMediaSize();

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
        if (!mediaSize) var mediaSize = getMediaSize();
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

function redirect(_kwargs) {
  let { location, params, rm } = _kwargs;
  if (!Array.isArray(rm)) rm = [rm];

  const url = new URL(window.location);
  const queryparams = new URLSearchParams(url.search);

  // const filter_keys = <%- JSON.stringify(Object.keys(query)?.filter(key => !['status'].includes(key))) %>

  // filter_keys.push('search')
  // for (const key of queryparams.keys()) {
  // 	if (!filter_keys.includes(key)) queryparams.delete(key)
  // }
  // return window.location = `${location}?${queryparams.toString()}`

  if (rm?.length) {
    rm.forEach((d) => {
      queryparams.delete(d);
    });
  }

  // if (!keep_status) { queryparams.delete('status'); }

  if (params && !Array.isArray(params)) params = [params];
  if (params?.length) {
    params.forEach((d) => {
      if (d.key && d.value) {
        queryparams.set(d.key, d.value);
      }
    });
  }

  if (!location) {
    location = `${url.origin}${url.pathname}`;
  }

  return (window.location = `${location}?${queryparams.toString()}`);
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', DOMLoad);
} else {
  DOMLoad();
}
