import {
  dropColumns,
  dropHandler,
  groupColumns,
  parseXLSX,
} from '/js/contribute/xlsx/main.js';
import { catchSubmit } from '/js/contribute/xlsx/save.js';

function DOMLoad() {
  d3.select('div#import-file')
    .on('drop', function () {
      const evt = d3.event;
      dropHandler(evt, this);
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
  d3.select('.sidebar button.column-action.delete').on('click', (_) =>
    dropColumns(),
  );

  const searchForm = d3.select('body form#contribute');
  if (searchForm.node().attachEvent)
    searchForm.node().attachEvent('submit', catchSubmit);
  else searchForm.node().addEventListener('submit', catchSubmit);
}

if (document.readyState !== 'complete') {
  window.addEventListener('load', DOMLoad);
} else {
  DOMLoad()
    .then(() => {})
    .catch((err) => console.error(err));
}
