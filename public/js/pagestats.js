import { POST } from '/js/fetch.js';
import { d3 } from '/js/globals.js';

let startTime = performance.now();
let currentProgress = 0;
let active = true;
let done = false;

const recordRead = () => {
  const pagestatsbase = JSON.parse(
    d3.select('data[name="pagestats"]').node().value,
  );

  const totalTime = pagestatsbase.readtime;
  const pageURL = pagestatsbase.url;
  const pagestats = window.pagestats;
  if (pagestats) {
    const docId = pagestats.id;
    const docType = pagestats.type;
    if (active) {
      currentProgress += performance.now() - startTime;
      startTime = performance.now();
      if (currentProgress >= totalTime) {
        POST('/pagestats', {
          doc_id: docId,
          doc_type: docType,
          page_url: pageURL,
        })
          .then((resp) => {
            // done
            // console.log('pagestat', resp); // DEBUG PAGESTATS
          })
          .catch((e) => {
            console.log(e);
          });
        done = true;
      }
    }
  } else {
    currentProgress += performance.now() - startTime;
    if (currentProgress >= totalTime) {
      // we reached the time but we still don't have pagestats
      // so we can't record anything. we just stop
      done = true;
    }
  }
  if (!done) {
    setTimeout(
      recordRead,
      Math.max(1, Math.min(totalTime - currentProgress, 1000)),
    );
  }
};

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (active) {
      currentProgress += performance.now() - startTime;
    }
    active = false;
  } else {
    if (!active) {
      startTime = performance.now();
    }
    active = true;
  }
});
setTimeout(recordRead, 1000);
