import { getTranslations } from '/js/config/main.js';
import { POST } from '/js/fetch.js';
import { d3 } from '/js/globals.js';

export function getInnerText(sel) {
  const node = sel.node();
  if (!node) {
    return null;
  }
  if (node.outerText) {
    return node.outerText;
  }
  if (node.textContent) {
    return node.textContent;
  }
  if (node.innerText) {
    return node.innerText;
  }
  // return `${node}`;
  return null
}

const debugging = false;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker
      .register('/app.serviceWorker.js')
      .then((res) => console.log('service worker registered'))
      .catch((err) => console.log('service worker not registered', err));
  });
}

let mediaSize = null;
function doGetMediaSize() {
  // https://www.w3schools.com/howto/howto_js_media_queries.asp
  // console.log(window.navigator)
  // console.log(window.navigator.Agent)
  return [
    { label: 'xs', size: 767 },
    { label: 'sm', size: 768 },
    { label: 'm', size: 1024 },
    { label: 'lg', size: 1200 },
    { label: 'xl', size: 1366 },
    { label: 'xxl', size: 1920 },
  ]
    .reverse()
    .find((d) => {
      if (d.label === 'xs')
        return window.matchMedia(`(max-width: ${d.size}px)`).matches;
      else return window.matchMedia(`(min-width: ${d.size}px)`).matches;
    })?.label;
}

export function getMediaSize() {
  if (!mediaSize) {
    mediaSize = doGetMediaSize();
  }
  return mediaSize;
}

export function toggleClass(node, classname) {
  d3.select(node).classed(classname, function () {
    return !d3.select(this).classed(classname);
  });
}
export function fixLabel(node) {
  d3.select(node).classed('has-value', node.value?.trim().length);
}
export function multiSelection(sel, targets) {
  const body = d3.select('body');
  let sels;
  let ox;
  let oy;
  let dx;
  let dy;
  let x;
  let y = 0;
  const bbox = { x: x, y: y, w: 0, h: 0 }; // THIS IS TO HOLD AN INSTANCE OF THE RECTANGLE DRAWN, IN ORDER NOT TO HAVE TO USE GetClientBoundingRect

  sel
    .on('mousedown.multiSelect', function () {
      const evt = d3.event;
      // const body = d3.select('body')
      if (
        !targets.constraint ||
        (targets.constraint && targets.constraint(evt))
      ) {
        body.classed('select', true);
        ox = x = evt.x || evt.clientX;
        oy = y = evt.y || evt.clientY;

        if (!evt.shiftKey)
          d3.selectAll('.selecting, .selected').classed(
            'selecting, selected',
            false,
          );

        body
          .addElems('div', 'selection-veil')
          .classed('unselectable', true)
          .addElems('div', 'selection-box', [{ x: x, y: y, w: 0, h: 0 }])
          .styles({
            transform: (d) => `translate(${d.x}px, ${d.y}px)`,
            width: (d) => `${d.w}px`,
            height: (d) => `${d.h}px`,
          });
        document.body.addEventListener('mousemove', selecting);
      }
    })
    .on('mouseup.multiSelect', function () {
      document.body.removeEventListener('mousemove', selecting);
      body.classed('select', false);
      if (targets.class) {
        sels = d3.selectAll(targets.class);
        sels
          .filter(function () {
            return d3.select(this).classed('selecting');
          })
          .classed('selecting', false)
          .classed('selected', true);
      }
      d3.select('div.selection-veil').remove();
    });
  function selecting(evt) {
    const selection = d3.select('div.selection-box');
    x = evt.x || evt.clientX;
    y = evt.y || evt.clientY;
    dx = x - ox;
    dy = y - oy;
    ox = x;
    oy = y;

    selection.styles({
      transform: (d) => {
        if (d.w < 0) d.x = x;
        if (d.h < 0) d.y = y;
        bbox.x = d.x;
        bbox.y = d.y;
        return `translate(${d.x}px, ${d.y}px)`;
      },
      width: (d) => {
        d.w += dx;
        bbox.w = Math.abs(d.w);
        return `${Math.abs(d.w)}px`;
      },
      height: (d) => {
        d.h += dy;
        bbox.h = Math.abs(d.h);
        return `${Math.abs(d.h)}px`;
      },
    });
    // MAYBE MOVE THIS UP TO ONLY CALCULATE ONCE (BUT THIS WOULD BE AN ISSUE IF THE USER SCROLLS MID SELECTION)
    if (targets.class) {
      sels = d3.selectAll(targets.class);
      if (targets.filter) sels = sels.filter((d) => targets.filter(d));
      sels.classed('selecting', function (d) {
        const rect = this.getBoundingClientRect();

        if (
          ((rect.left >= bbox.x && rect.left <= bbox.x + bbox.w) ||
            (rect.left <= bbox.x && rect.right >= bbox.x + bbox.w) ||
            (rect.left <= bbox.x &&
              rect.right >= bbox.x &&
              rect.right <= bbox.x + bbox.w)) &&
          ((rect.top >= bbox.y && rect.top <= bbox.y + bbox.h) ||
            (rect.bottom >= bbox.y && rect.bottom <= bbox.y + bbox.h) ||
            (rect.top <= bbox.y && rect.bottom >= bbox.y + bbox.h))
        ) {
          return true;
        } else return false;
      });
    }
  }
}

export function addGlobalLoader() {
  const nav = d3.select('nav#languages');
  nav.select('menu').classed('squeeze', true);
  const loader = nav.addElems('div', 'lds-ellipsis');
  loader.addElem('div');
  loader.addElem('div');
  loader.addElem('div');
  loader.addElem('div');
  return loader;
}
export function rmGlobalLoader() {
  const nav = d3.select('nav#languages');
  nav.select('.lds-ellipsis').remove();
  nav.select('menu').classed('squeeze', false);
}

let ensureIconRegistered = false;
export function ensureIcon(classSel, name, altName, timingShort, timingTotal) {
  if (ensureIconRegistered) {
    return;
  }
  const iconUpdate = () => {
    let anyIcons = false;
    d3.selectAll(classSel).attr('src', () => {
      anyIcons = true;
      return Math.random() < 0.01 ? altName : name;
    });
    if (!anyIcons) {
      return;
    }
    setTimeout(() => {
      d3.selectAll(classSel).attr('src', name);
      setTimeout(iconUpdate, timingTotal - timingShort);
    }, timingShort);
  };
  setTimeout(iconUpdate, timingTotal);
  ensureIconRegistered = true;
}

export function checkPassword(password) {
  // THIS REPLICATES THE BACKEND password-requirements.js FILE
  const minlength = 8;
  const uppercaseRegex = /[A-Z]/;
  const lowercaseRegex = /[a-z]/;
  const numberRegex = /[0-9]/;
  const specialCharRegex = /[!@#$%^&*\(\)]/;
  // Check against common passwords (optional)
  const commonPasswords = ['password', '123456', 'qwerty', 'azerty'];
  const isUpper = uppercaseRegex.test(password);
  const isLower = lowercaseRegex.test(password);
  const isNumber = numberRegex.test(password);
  const isSpecial = specialCharRegex.test(password);
  const groups = [isUpper, isLower, isNumber, isSpecial].reduce(
    (p, v) => p + (v ? 1 : 0),
    0,
  );
  const checkPass = {
    'pw-length': !(password.length < minlength),
    'pw-groups': groups >= 3,
    'pw-common': !commonPasswords.includes(password),
  };

  const msgs = {
    'pw-length': `Password should be at least ${minlength} characters long`,
    'pw-groups':
      'Password requires three character groups out of uppercase letters, lowercase letters, numbers, or special characters !@#$%^&*()',
    'pw-common': 'Password cannot be a commonly used password',
  };
  return Object.keys(checkPass)
    .filter((key) => !checkPass[key])
    .map((key) => msgs[key]);
}

export function selectElementContents(node) {
  // CREDIT TO https://stackoverflow.com/questions/6139107/programmatically-select-text-in-a-contenteditable-html-element
  const range = document.createRange();
  range.selectNodeContents(node);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

export function limitLength(text, limit) {
  text = `${text}`; // converting to string just to be sure
  const arr = [...text].reduce(
    (p, c) =>
      c.match(/\p{Emoji_Modifier}/u)
        ? [...p.slice(0, -1), p[p.length - 1] + c]
        : [...p, c],
    [],
  );
  if (arr.length < limit) {
    return text;
  }
  return `${arr.slice(0, limit - 1).join('')}…`;
}
export const dateOptions = {
  weekday: undefined,
  year: 'numeric',
  month: 'long',
  day: 'numeric',
};

export function getContent(params = {}) {
  // THIS IS TO LOAD THE PADS, TEMPLATES, ETC
  const object = d3.select('data[name="object"]').node().value;
  const space = d3.select('data[name="space"]').node()?.value;
  const instance = d3.select('data[name="instance"]').node()?.value;

  const url = new URL(window.location);
  const queryparams = new URLSearchParams(url.search);

  const reqbody = {};
  if (space) reqbody['space'] = space;
  if (instance) reqbody['instance'] = instance;

  for (const key in params) {
    if (params.hasOwnProperty(key)) {
      reqbody[key] = params[key];
    }
  }

  queryparams.forEach((value, key) => {
    if (!reqbody[key]) {
      reqbody[key] = value;
    } else {
      if (!Array.isArray(reqbody[key])) {
        reqbody[key] = [reqbody[key]];
      }
      reqbody[key].push(value);
    }
  });

  const docTypes = ['pads', 'contributors'];
  if (docTypes.includes(object)) {
    const pstats = {};
    if (object === 'pads' && reqbody.space === 'pinned') {
      pstats.type = 'pinboard';
      pstats.id = +reqbody.pinboard;
    }
    if (object === 'pads' && reqbody.space === 'published') {
      pstats.type = 'country';
      if (reqbody.instance) {
        pstats.id = `${decodeURI(reqbody.instance)}`
          .toLowerCase()
          .shortStringAsNum();
      }
    }
    if (object === 'contributors' && reqbody.space === 'pinned') {
      pstats.type = 'team';
      pstats.id = +reqbody.pinboard;
    }
    if (pstats.id && pstats.type) {
      window.pagestats = pstats;
    }
    // DEBUG PAGESTATS
    // console.log(
    //   'pagestats',
    //   window.pagestats,
    //   pstats,
    //   pstats.id && pstats.type,
    // );
  }
  // TO DO: ADD VAR keep_page
  return POST(`/load/${object}`, reqbody);
}
export function uploadFile(form) {
  const ellipsis = d3.select('.media-layout').addElems('div', 'lds-ellipsis');
  ellipsis.addElem('div');
  ellipsis.addElem('div');
  ellipsis.addElem('div');
  ellipsis.addElem('div');

  console.log('uploading pdf');

  return fetch(form.action, {
    method: form.method,
    body: form.data || new FormData(form),
  })
    .then((res) => res.json())
    .then((json) => {
      ellipsis.remove();
      return json;
    })
    .then((files) => {
      console.log(files);
      // const { message } = files;
      const errs = files.filter((d) => d.status !== 200);
      if (errs.length) console.log(errs);
      return files;
      // else return location.reload() // WE DO NOT NEED TO RELOAD
    })
    .catch((err) => {
      if (err) throw err;
    });
}

export function printTranslation(node, vocab, vocabulary) {
  // FIRST, CHECK IF THE vocab IS A JSON OBJECT (ARRAY)
  const regex = /\[(["'][\w\d\s-]+["'](,\s*["'][\w\d\s-]+["'])*)\]/;
  if (regex.test(vocab)) {
    try {
      const arr = JSON.parse(vocab);
      const term = arr.reduce((acc, val) => {
        if (acc[val]) {
          return acc[val];
        } else {
          return acc;
        }
      }, vocabulary);
      if (term && typeof term === 'string') {
        return term;
      } else {
        throwerr();
        // return arr[0];
        return null;
      }
    } catch (err) {
      if (debugging) console.log(err);
      throwerr();
      return null;
    }
  } else {
    if (vocabulary[vocab]) {
      return vocabulary[vocab];
    } else {
      throwerr();
      return vocab;
    }
  }

  function throwerr() {
    if (debugging) {
      console.log('an error occurred trying to translate');
      console.log(vocab);
      console.log('for');
      console.log(node);
    }
  }
}

export function scrollToPad(target) {
  window.scrollTo({
    top: target.offsetTop - 60, // THIS WAS 120 IN CONTRIBUTE PAD
    left: 0,
    behavior: 'smooth',
  });
}
export function checkForEnter(evt, node) {
  if (evt.code === 'Enter' || evt.keyCode === 13) {
    evt.preventDefault();
    node.blur();
  }
}
export async function toggleOptions(node) {
  const vocabulary = await getTranslations();
  // const { object } = node.dataset || {};

  for (const label of node.labels) {
    const { content } = label.dataset;
    if (isNaN(content)) {
      // THIS PREVENTS TOGGLE SWITCHES WITH NUMERICAL LABELS TO CHANGE BETWEEN yes AND no
      d3.select(label).attr(
        'data-content',
        node.checked ? vocabulary['yes'] : vocabulary['no'],
      );
    }
  }
}
export function updateTab(value) {
  // TO DO: THIS IS NOT WORKING FOR SOME REASON WHEN SAVING A PINBOARD TITLE
  const input = d3.select(`nav.tabs input[type=text]#pinboards`);
  if (input.node()) {
    if (value.length > 20) {
      value = `${value.slice(0, 20)}…`;
    }
    input.attr('value', value);
    // fixLabel(input)
  }
}
export async function expandstats(node) {
  const vocabulary = await getTranslations();
  const sel = d3.select(node);
  const statistics = d3.select(
    sel.findAncestor('stat-group').node().parentNode,
  );

  d3.select('.screen').classed('hide', false);
  statistics
    .classed('expand', true)
    .addElems('button', 'close inlaid')
    .on('click', function () {
      d3.select(this.parentNode).classed('expand', false);
      d3.select('.screen').classed('hide', true);
      d3.select(this).remove();
    })
    .html(vocabulary['close']);
}

export function filterDropdown(node) {
  const dropdown = d3.select(node).findAncestor('dropdown');
  dropdown
    .selectAll('ul li:not(.filter):not(.padding)')
    .classed('hide', function () {
      return !this.textContent
        .trim()
        .toLowerCase()
        .includes(node.value.trim().toLowerCase());
    });
}
