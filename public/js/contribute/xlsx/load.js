import {
  dropColumns,
  dropHandler,
  groupColumns,
  parseXLSX,
} from '/js/contribute/xlsx/main.js';
import { catchSubmit } from '/js/contribute/xlsx/save.js';
import { d3 } from '/js/globals.js';

function onLoad() {
  d3.select('div#import-file')
    .on('drop', async function () {
      const evt = d3.event;
      await dropHandler(evt, this);
    })
    .on('dragover', function () {
      const evt = d3.event;
      evt.preventDefault();
      this.classList.toggle('accept');
    })
    .on('dragleave', function () {
      this.classList.toggle('accept');
    });

  d3.select('input[type=file]#upload').on('change', function () {
    parseXLSX(event.target.files[0], this);
  });

  // ADD COLUMN-ACTION BUTTONS INTERACTION
  d3.select('.sidebar button.column-action.group').on('click', (_) =>
    groupColumns(),
  );
  d3.select('.sidebar button.column-action.delete').on(
    'click',
    async (_) => await dropColumns(),
  );

  const searchForm = d3.select('body form#contribute');
  if (searchForm.node().attachEvent)
    searchForm.node().attachEvent('submit', async (evt) => {
      evt.preventDefault();
      await catchSubmit(evt);
    });
  else
    searchForm.node().addEventListener('submit', async (evt) => {
      evt.preventDefault();
      await catchSubmit(evt);
    });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', onLoad);
} else {
  onLoad();
}
