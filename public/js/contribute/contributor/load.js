import {
  addLanguage,
  copyToken,
  initDropdowns,
  requestToken,
  rmPin,
} from '/js/contribute/contributor/main.js';
import { partialSave } from '/js/contribute/contributor/save.js';
import { initUpdatePassword } from '/js/contribute/contributor/update.password.js';
import { d3 } from '/js/globals.js';
import { checkPassword } from '/js/main.js';

async function onLoad() {
  await initDropdowns();

  const uuid = d3.select('data[name="id"]').node()?.value || undefined;
  const { editable } = JSON.parse(
    d3.select('data[name="page"]').node()?.value || false,
  );

  d3.selectAll('input.toggle').on('change.save', function () {
    partialSave();
  });

  d3.selectAll('input[type=password]') // IT IS IMPORTANT THAT THIS COMES BEFORE THE NEXT GENERIC BLUR FUNCTION
    .on('blur.confirm', function () {
      const node = this;
      const sel = d3.select(this);
      const inputgroup = d3.select(this.parentNode);
      const confirm = d3.selectAll('input[type=password]').filter(function () {
        return this !== node;
      });
      if (
        checkPassword(this.value)?.length &&
        this.name !== 'confirm_password'
      ) {
        sel.classed('error', true);
        inputgroup
          .addElems('p', 'errormessage', checkPassword(this.value))
          .html((d) => d);
      } else {
        d3.selectAll('input[type=password]').classed(
          'error',
          this.value !== confirm.node().value,
        );
        inputgroup.selectAll('p.errormessage').remove();
      }
    });

  // GENERIC BLUR FUNCTION
  d3.selectAll(
    'input[type=text]:not([name="api-token"]), input[type=email], input[type=password]',
  ).on('blur.save', function () {
    partialSave();
  });

  // ADD INTERACTION FOR EXTRA LANGUAGES OPTION
  d3.select('#add-extra-languages').on('click', async function () {
    await addLanguage(this.parentNode);
  });

  // SET UP TOKEN REQUEST
  const apiToken = d3.select('.api-token');
  apiToken.select('.request-token').on('click', async function () {
    await requestToken(this.form);
  });
  apiToken.select('input[name="api-token"]').on('click', function () {
    this.select();
  });
  apiToken.select('button.copy').on('click', function () {
    copyToken(this.form);
  });

  // ADD PIN/TAG INTERACTIONS
  d3.selectAll('.tag label.close').on('click', function () {
    rmPin(this);
  });

  // ADD PASSWORD UPDATE INTERACTIONS (TO DO: DEPRECATE THIS IN FAVOR OF reset-password.ejs)
  if (uuid && editable) {
    initUpdatePassword();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', onLoad);
} else {
  await onLoad();
}
