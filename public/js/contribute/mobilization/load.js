import {
  adjustarea,
  enableNext,
  next,
  offsetMinEndDate,
  prev,
  preventSubmit,
  selectAllOpts,
  toggleChecked,
  toggleCronJob,
  togglePadLimit,
  togglePublic,
} from '/js/contribute/mobilization/main.js';
import { fixLabel } from '/js/main.js';

function DOMLoad() {
  // CHECK IF THE MOBILIZATION HAS A SOURCE (WHETHER IT IS A FOLLOW UP)
  const url = new URL(window.location);
  const queryparams = new URLSearchParams(url.search);
  const source = queryparams.get('source');

  const mobilization = d3.select('main#mobilize-new form');

  if (source) {
    mobilization.addElem('input').attrs({
      type: 'hidden',
      name: 'source',
      value: +source,
    });
  }

  mobilization
    .selectAll('.modal .head button[type=button].back')
    .on('click', function () {
      prev(this);
    });
  mobilization
    .selectAll('.modal .head button[type=button].next')
    .on('click', function () {
      next(this);
    });

  d3.selectAll('.filter input[type=text]').on('keyup', function () {
    const node = this;
    const menu = d3.select(node).findAncestor('filter').select('menu');

    menu.selectAll('li').classed('hide', function () {
      return !this.textContent
        .trim()
        .toLowerCase()
        .includes(node.value.trim().toLowerCase());
    });
  });

  d3.selectAll('textarea').each(function () {
    adjustarea(this);
    fixLabel(this);
  });

  mobilization
    .select('.modal.m-1 input#title')
    .on('keydown', function () {
      preventSubmit(this, event);
    })
    .on('keyup', function () {
      enableNext(this);
    })
    .on('blur', function () {
      enableNext(this);
    });
  mobilization
    .select('.modal.m-1 .foot input#public-status')
    .on('change', function () {
      togglePublic(this);
    });
  mobilization
    .selectAll(
      '.modal.m-2 .body input[type=radio], .modal.m-5 .body input[type=radio], .modal.m-6 .body input[type=checkbox]',
    )
    .on('change.toggle', function () {
      toggleChecked(this);
      enableNext(this);
    });
  mobilization
    .select('.modal.m-3 .body input#cron-start')
    .on('change', function () {
      toggleCronJob(this);
    });
  mobilization
    .select('.modal.m-3 .body input#cron-end')
    .on('change', function () {
      toggleCronJob(this);
    });
  mobilization
    .select('.modal.m-3 .body input#start-date')
    .on('change', function () {
      offsetMinEndDate(this);
    });
  mobilization
    .select('.modal.m-4 .body textarea#description')
    .on('keyup', function () {
      adjustarea(this);
      enableNext(this);
    })
    .on('blur', function () {
      fixLabel(this);
      enableNext(this);
    });
  mobilization
    .select('.modal.m-6 .foot .global-opt button')
    .on('click', function () {
      selectAllOpts(this);
      enableNext(this);
    });
  mobilization
    .select('.modal.m-7 .body input#limit-pads')
    .on('change.toggle', function () {
      togglePadLimit(this);
    });

  // FOR STATS VIEW
  d3.selectAll('tr.top-level')
  .on('click', function () {
    const { iso3 } = this.dataset
    d3.select(this).toggleClass('open')
    d3.selectAll(`tr.small.${iso3}`).toggleClass('hide')
  })
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', DOMLoad);
} else {
  DOMLoad();
}
