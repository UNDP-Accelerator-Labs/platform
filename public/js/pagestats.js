const pagestats = JSON.parse(d3.select('data[name="pagestats"]').node().value)

const totalTime = pagestats.readtime;
const docId = pagestats.id;
const docType = pagestats.type;
const pageURL = pagestats.url;

let startTime = performance.now();
let currentProgress = 0;
let active = true;
let done = false;

const recordRead = () => {
    if (active) {
        currentProgress += performance.now() - startTime;
        startTime = performance.now();
        if (currentProgress >= totalTime) {
            POST('/pagestats', { doc_id: docId, doc_type: docType, page_url: pageURL }).then(() => {
                // done
            }).catch((e) => {
                console.log(e);
            });
            done = true;
        }
    }
    if (!done) {
        setTimeout(recordRead, Math.max(1, Math.min(totalTime - currentProgress, 1000)));
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