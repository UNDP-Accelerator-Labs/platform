import { language, vocabulary } from '/js/config/translations.js';
import { GET, POST, PUT } from '/js/fetch.js';
import { renderPromiseModal } from '/js/modals.js';

// TO DO: STILL A PB WITH VOCABULARY HERE
export class Exploration {
  constructor() {
    this.past = [];
    this.docs = [];
    this.docLookup = {};
    this.currentId = null;
    this.currentPrompt = '';
    this.mainInput = null;
    this.infoButton = null;
    this.datalist = null;
    this.useFullPromptForSelect = false;
    this.onIdChange = [];

    this.listUpdateActive = false;
    this.listUpdateCbs = [];
    this.collectionId = null;
    this.collectionUpdateCbs = [];

    // this.ownDb = ownDB;
    if (sessionStorage.explorationId) {
      this.currentId = +sessionStorage.explorationId || null;
    }
    if (sessionStorage.explorationPrompt) {
      this.currentPrompt = this.normalizeExplorationPrompt(
        sessionStorage.explorationPrompt,
      );
    }
    this.visible = !!this.currentId;
    this.limitedSpace = true;
    this.consent = true; // we assume consent was given until an API call says otherwise
  }

  async addDb() {
    const db = await POST('/load/metadata', { feature: 'ownDB' });
    this.ownDb = db.ownDB;
  }

  addIdChangeListener(cb) {
    this.onIdChange.push(cb);
    this.triggerIdChange();
  }

  triggerIdChange() {
    const currentId = this.currentId;
    const isVisible = this.isVisible();
    this.onIdChange.forEach((cb) => cb(currentId, isVisible));
  }

  setUseFullPromptForSelect(isUseFull) {
    this.useFullPromptForSelect = isUseFull;
  }

  getInputValue() {
    if (!this.mainInput) {
      return null;
    }
    const node = this.mainInput.node();
    if (!node) {
      return null;
    }
    return node.value;
  }

  normalizeExplorationPrompt(prompt) {
    if (!prompt) {
      return '';
    }
    return prompt.replace(/[\s\n\r]+/g, ' ').trim();
  }

  updateCurrentExploration(curId, curPrompt) {
    const normPrompt = this.normalizeExplorationPrompt(curPrompt);
    this.currentPrompt = normPrompt;
    if (normPrompt !== sessionStorage.explorationPrompt) {
      sessionStorage.explorationPrompt = normPrompt;
      if (!normPrompt) {
        curId = null;
      }
    }
    this.currentId = curId;
    if (curId !== sessionStorage.explorationId) {
      sessionStorage.explorationId = +curId || 0;
    }
    if (this.mainInput !== null) {
      const mainInput = this.mainInput.node();
      if (mainInput) {
        if (mainInput.value !== normPrompt) {
          mainInput.value = normPrompt;
        }
      }
    }
    this.updateExplorationMainButton(
      this.getExplorationByPrompt(normPrompt)[0],
      curId,
    );
    this.updateExplorationDocs();
    this.triggerIdChange();
  }

  getExplorationById(explorationId) {
    return this.past.reduce(
      (prev, d) => {
        if (d['id'] === explorationId) {
          return [d['id'], d['prompt']];
        }
        return prev;
      },
      [null, ''],
    );
  }

  updateById(newId) {
    const [nextId, nextPrompt] = this.getExplorationById(+newId);
    this.updateCurrentExploration(nextId, nextPrompt);
  }

  getExplorationByPrompt(explorationPrompt) {
    const prompt = this.normalizeExplorationPrompt(explorationPrompt);
    return this.past.reduce(
      (prev, d) => {
        if (d['prompt'] === prompt) {
          return [d['id'], d['prompt']];
        }
        return prev;
      },
      [null, prompt],
    );
  }

  getShortPrompt(explorationId) {
    return this.past.reduce((prev, d) => {
      if (d['id'] === explorationId) {
        return d['short'];
      }
      return prev;
    }, '');
  }

  updateExplorationMainButton(explorationId, currentId) {
    if (this.mainInput !== null) {
      const value = this.getInputValue();
      const normPrompt = this.normalizeExplorationPrompt(value);
      this.mainInput.classed('has-value', !!normPrompt);
    }
  }

  checkError(err, cb) {
    if (err) {
      if (err.status === 401) {
        // not logged in
        cb && cb();
        this.updateCurrentExploration(null, '');
        return;
      } else if (err.status === 403) {
        // did not consent
        cb && cb();
        this.updateCurrentExploration(null, '');
        this.consent = false;
        return;
      }
    }
    console.error(err);
  }

  updateExplorationList(cb = null) {
    if (cb) {
      this.listUpdateCbs.push(cb);
    }
    if (this.listUpdateActive) {
      return;
    }
    this.listUpdateActive = true;
    GET(`/exploration/list?lang=${language}`, true, true)
      .then((result) => {
        this.consent = true;
        this.listUpdateActive = false;
        const explorations = result['explorations'];
        this.past = explorations;
        const [curId, curPrompt] = this.getExplorationById(this.currentId);
        this.updateCurrentExploration(curId, curPrompt);
        const cbs = this.listUpdateCbs;
        this.listUpdateCbs = [];
        cbs.forEach((curCb) => curCb());
      })
      .catch((err) => {
        this.listUpdateActive = false;
        this.checkError(err, () => {
          this.past = [];
          const cbs = this.listUpdateCbs;
          this.listUpdateCbs = [];
          cbs.forEach((curCb) => curCb());
        });
      });
  }

  updateExplorationDatalist(cb = null) {
    const datalist = this.datalist;
    if (!datalist) {
      return;
    }
    this.updateExplorationList(() => {
      datalist
        .addElems('option', 'exploration-past-elem', this.past)
        .classed('notranslate', true)
        .attrs({
          value: (d) => this.normalizeExplorationPrompt(d['prompt']),
          label: (d) => `${vocabulary['last_access']} ${d['last_access_ago']}`,
        });
      cb && cb();
    });
  }

  updateExplorationDocs(cb = null) {
    if (cb) {
      this.collectionUpdateCbs.push(cb);
    }
    const curId = this.currentId;
    if (!curId) {
      this.docs = [];
      this.docLookup = {};
      const cbs = this.collectionUpdateCbs;
      this.collectionUpdateCbs = [];
      this.updateDocs(cbs);
      return;
    }
    if (this.collectionId === curId) {
      return;
    }
    this.collectionId = curId;
    GET(`/exploration/collection?exploration_id=${curId}`, true, true)
      .then((result) => {
        if (this.collectionId !== null && this.collectionId !== curId) {
          return;
        }
        this.collectionId = null;
        const docs = result['pads'];
        const newLookup = {};
        const ownDb = this.ownDb;
        docs.forEach((doc) => {
          if (doc['db'] !== ownDb) {
            return;
          }
          newLookup[`${doc['pad']}`] = doc['is_included'];
        });
        this.docs = docs;
        this.docLookup = newLookup;
        const cbs = this.collectionUpdateCbs;
        this.collectionUpdateCbs = [];
        this.updateDocs(cbs);
      })
      .catch((err) => {
        this.collectionId = null;
        this.checkError(err, () => {
          this.docs = [];
          this.docLookup = {};
          const cbs = this.collectionUpdateCbs;
          this.collectionUpdateCbs = [];
          this.updateDocs(cbs);
        });
      });
  }

  isDocApprove(docId) {
    return this.docLookup[`${docId}`] === true;
  }

  isDocDislike(docId) {
    return this.docLookup[`${docId}`] === false;
  }

  updatePrompt(userPrompt, allowReport) {
    const currentId = this.currentId;
    this.updateExplorationDatalist(() => {
      const [curId, curPrompt] = this.getExplorationByPrompt(userPrompt);
      if (curId !== null && curId === currentId) {
        if (allowReport) {
          this.updateExplorationDocs();
        }
      } else if (curId !== null) {
        this.updateCurrentExploration(curId, curPrompt);
      } else if (curPrompt) {
        PUT(
          `/exploration/create`,
          {
            prompt: curPrompt,
          },
          true,
          true,
        )
          .then((result) => {
            this.updateCurrentExploration(
              result['exploration'],
              result['prompt'],
            );
            this.updateExplorationDatalist();
          })
          .catch((err) => {
            this.checkError(err);
          });
      } else {
        this.updateCurrentExploration(null, '');
      }
    });
  }

  confirmExplorationPrompt(allowReport) {
    const mainInput = this.mainInput;
    if (mainInput === null) {
      return;
    }
    const userPrompt = this.getInputValue();
    this.updatePrompt(userPrompt, allowReport);
  }

  consentFeature() {
    const explorationInfoUrl = `/${language}/exploration-info/`;
    const message = `
            <h2 class="google-translate-attr">${vocabulary['welcome']}</h2>
            <p class="google-translate-attr">${vocabulary['explain']}</p>
            <a href="${explorationInfoUrl}" target="_blank" class="google-translate-attr">${vocabulary['info']}</a>
            <p class="google-translate-attr">${vocabulary['indicate']}</p>
        `;
    renderPromiseModal({
      message,
      opts: [
        {
          node: 'button',
          type: 'button',
          label: vocabulary['feature-approve'],
          resolve: true,
        },
        {
          node: 'button',
          type: 'button',
          label: vocabulary['feature-reject'],
          resolve: false,
        },
      ],
    })
      .then((consent) => {
        if (!consent) {
          // not given consent or closed window
          return;
        }
        PUT(
          '/exploration/consent',
          {
            consent: 'approve',
          },
          true,
          true,
        )
          .then((result) => {
            this.consent = true;
            this.updateExplorationDatalist();
          })
          .catch((err) => {
            this.checkError(err);
          });
      })
      .catch((err) => console.error(err));
  }

  maybeAddDatalist(sel) {
    if (this.datalist !== null) {
      return;
    }
    const datalist = sel.addElem('datalist').attrs({
      id: 'exploration-past',
    });
    this.datalist = datalist;
  }

  addExplorationMain(sel, cb) {
    const mainInput = sel
      .addElem('input')
      .attrs({
        type: 'text',
        id: `exploration-main`,
        list: 'exploration-past',
      })
      .on('keydown', () => {
        const evt = d3.event;
        if (evt.code === 'Enter' || evt.keyCode === 13) {
          this.confirmExplorationPrompt(false);
          evt.preventDefault();
          evt.srcElement.blur();
        }
      })
      .on('change', () => {
        const value = this.getInputValue();
        const normPrompt = this.normalizeExplorationPrompt(value);
        this.updateExplorationMainButton(
          this.getExplorationByPrompt(normPrompt)[0],
          this.currentId,
        );
      })
      .on('blur', () => this.confirmExplorationPrompt(false))
      .on('click', () => {
        const evt = d3.event;
        if (!this.consent) {
          evt.preventDefault();
          this.consentFeature();
        }
      });
    this.mainInput = mainInput;
    this.updateCurrentExploration(this.currentId, this.currentPrompt);

    sel
      .addElem('label')
      .classed('google-translate-attr', true)
      .attrs({
        for: `exploration-main`,
      })
      .text(vocabulary['intro']);
    this.maybeAddDatalist(sel);
    const explorationInfoUrl = `/${language}/exploration-info/`;
    const infoButton = sel
      .addElem('a')
      .attrs({
        href: explorationInfoUrl,
        target: '_blank',
      })
      .text('ⓘ');
    this.infoButton = infoButton;

    this.updateExplorationDatalist(cb);
  }

  hasExploration() {
    return this.past.length > 0;
  }

  isVisible() {
    return this.visible;
  }

  setVisible(visible) {
    const oldVisible = this.visible;
    this.visible = visible;
    if (oldVisible !== visible) {
      this.updateDocs([]);
    }
  }

  updateDocs(cbs) {
    d3.selectAll('div.exploration').styles({
      display: this.isVisible() ? null : 'none',
    });
    const showExploration = this.hasExploration() && this.isVisible();
    d3.selectAll('div.exploration-doc').styles({
      display: showExploration ? null : 'none',
    });
    if (!showExploration) {
      return;
    }
    const useFull = this.useFullPromptForSelect;
    d3.selectAll('div.exploration-doc select.exploration-short')
      .addElems('option', 'exploration-short-list', [
        {
          id: null,
          prompt: vocabulary['select'],
          short: vocabulary['select'],
        },
        ...this.past,
      ])
      .attrs({
        value: (d) => `${d['id']}`,
      })
      .classed('notranslate', (d) => d['id'] !== null)
      .text((d) => (useFull ? d['prompt'] : d['short']));
    const currentId = this.currentId;
    d3.selectAll('div.exploration-doc select.exploration-short').each(
      function () {
        d3.select(this).node().value = `${currentId}`;
      },
    );
    d3.selectAll('button.exploration-btn-approve')
      .classed('exploration-btn-active', (d) => {
        return this.isDocApprove(d.id);
      })
      .styles({
        display: (d) => (currentId ? null : 'none'),
      });
    d3.selectAll('button.exploration-btn-dislike')
      .classed('exploration-btn-active', (d) => {
        return this.isDocDislike(d.id);
      })
      .styles({
        display: (d) => (currentId ? null : 'none'),
      });
    if (this.limitedSpace) {
      d3.selectAll('span.exploration-title').styles({
        display: (d) => (currentId ? null : 'none'),
      });
    }
    d3.selectAll('article.pad').classed(
      'exploration-article-inactive',
      (d) => {
        return this.isDocDislike(d.id);
      },
    );
    cbs.forEach((curCb) => curCb());
  }

  setDocAction(docId, isApprove) {
    const explorationId = this.currentId;
    if (!explorationId) {
      return;
    }
    const action = isApprove
      ? this.isDocApprove(docId)
        ? 'neutral'
        : 'approve'
      : this.isDocDislike(docId)
        ? 'neutral'
        : 'dislike';
    PUT(
      '/exploration/doc',
      {
        pad: docId,
        action: action,
        exploration: explorationId,
      },
      true,
      true,
    )
      .then((result) => {
        this.updateExplorationDocs();
      })
      .catch((err) => {
        this.checkError(err);
      });
  }

  addDocButtons(sel, hasLimitedSpace) {
    const doc = sel.addElems('div', 'exploration-doc');
    const that = this;

    function addTitle(curSel) {
      curSel
        .addElem('span')
        .text(vocabulary['doc-begin'])
        .classed('exploration-title', true)
        .classed('google-translate-attr', true);
    }

    function addButtons(curSel) {
      curSel
        .addElem('button')
        .classed('exploration-btn-approve', true)
        .classed('google-translate-attr', true)
        .text(vocabulary['doc-approve'])
        .on('click', (d) => {
          that.setDocAction(d.id, true);
        });
      curSel
        .addElem('button')
        .classed('exploration-btn-dislike', true)
        .classed('google-translate-attr', true)
        .text(vocabulary['doc-dislike'])
        .on('click', (d) => {
          that.setDocAction(d.id, false);
        });
    }

    function addSelect(curSel) {
      curSel
        .addElem('select')
        .classed('exploration-short', true)
        .on('change', function () {
          const curId = d3.select(this)?.node()?.value;
          if (curId !== null) {
            that.updateById(+curId);
          }
        });
    }

    if (hasLimitedSpace) {
      const docSpan = doc.addElem('span');
      addTitle(docSpan);
      addButtons(docSpan);
      addSelect(doc);
    } else {
      addTitle(doc);
      addSelect(doc);
      addButtons(doc);
      doc.classed('exploration-big', true);
    }
    this.limitedSpace = hasLimitedSpace;
    this.updateExplorationDocs();
  }
} // Exploration
