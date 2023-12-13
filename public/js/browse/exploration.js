import { Exploration } from '/js/exploration.js';
import { d3 } from '/js/globals.js';
// INIT EXPLORATION
async function initExploration() {
  const exploration = new Exploration();

  // EXPLORATION MODULE
  let curSelectSTM = 'stm-browse';
  let hasUsedExploration = false;

  let isExplorationInit = false;
  const fixedEid = d3.select('data[name="fixedEid"]')?.node()?.value;
  const formExplorationId = d3.select('#form-exploration-id');

  d3.selectAll('#search-field').on('focus', () => {
    updateExplorationHint();
  });

  await exploration.addExplorationMain(
    d3.select('div.exploration'),
    async () => {
      hasUsedExploration = exploration.hasExploration();
      if (fixedEid) {
        await exploration.updateById(fixedEid);
      }
      if (fixedEid || exploration.isVisible()) {
        await doSelectSTM('stm-exploration');
      }
      if (!isExplorationInit) {
        isExplorationInit = true;
        exploration.triggerIdChange();
      }
    },
  );

  exploration.addIdChangeListener((eid, isVisible) => {
    formExplorationId.attrs({
      value: isVisible ? eid : null,
    });
    hasUsedExploration = exploration.hasExploration();
    if (isExplorationInit) {
      const oldUrl = `${window.location}`;
      const newUrl = new URL(window.location);
      if (eid) {
        newUrl.searchParams.set('explorationid', +eid);
      } else {
        newUrl.searchParams.delete('explorationid');
      }
      if (oldUrl !== `${newUrl}`) {
        window.history.replaceState({}, '', newUrl);
      }
    }
  });

  async function doSelectSTM(stm) {
    curSelectSTM = stm;
    d3.selectAll('.stm').classed('stm-select', function () {
      return d3.select(this).attr('id') === curSelectSTM;
    });
    const isExploration = curSelectSTM === 'stm-exploration';
    exploration.setVisible(isExploration);
    if (isExploration) {
      updateExplorationHint();
    } else {
      await exploration.updateById(null);
    }
    exploration.triggerIdChange();
  }

  function updateExplorationHint() {
    d3.selectAll('.stm-hint').classed('stm-hidden', () => {
      if (
        sessionStorage.explorationHintUserHiddenCount &&
        +sessionStorage.explorationHintUserHiddenCount > 1
      ) {
        return true;
      }
      return curSelectSTM !== 'stm-browse' || hasUsedExploration;
    });
  }

  let onlyHide = false;

  d3.selectAll('.stm').on('click', async function () {
    if (onlyHide) {
      onlyHide = false;
      return;
    }
    await doSelectSTM(d3.select(this).attr('id'));
  });

  d3.selectAll('.stm-hint').on('click', function (e) {
    d3.select(this).classed('stm-hidden', true);
    onlyHide = true;
    if (sessionStorage.explorationHintUserHiddenCount) {
      sessionStorage.explorationHintUserHiddenCount =
        +sessionStorage.explorationHintUserHiddenCount + 1;
    } else {
      sessionStorage.explorationHintUserHiddenCount = 1;
    }
  });

  return exploration;
}

let exploration = null;
export async function getExploration() {
  if (!exploration) {
    exploration = await initExploration();
  }
  return exploration;
}
