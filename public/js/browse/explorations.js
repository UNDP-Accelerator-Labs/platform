let isExplorationInit = false;
const fixedEid = d3.select('data[name="fixedEid"]').node().value;
const formExplorationId = d3.select('#form-exploration-id');

exploration.addExplorationMain(d3.select('div.exploration'), () => {
	hasUsedExploration = exploration.hasExploration();
	if (fixedEid) {
		exploration.updateById(fixedEid);
	}
	if (fixedEid || exploration.isVisible()) {
		doSelectSTM('stm-exploration');
	}
	if (!isExplorationInit) {
		isExplorationInit = true;
		exploration.triggerIdChange();
	}
});

exploration.addIdChangeListener((eid, isVisible) => {
	formExplorationId.attrs({
		'value': isVisible ? eid : null,
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

function doSelectSTM(stm) {
	curSelectSTM = stm;
	d3.selectAll('.stm').classed('stm-select', function () {
		return d3.select(this).attr('id') === curSelectSTM;
	});
	const isExploration = curSelectSTM === 'stm-exploration';
	exploration.setVisible(isExploration);
	if (isExploration) {
		updateExplorationHint();
	} else {
		exploration.updateById(null);
	}
	exploration.triggerIdChange();
}

function updateExplorationHint() {
	d3.selectAll('.stm-hint').classed('stm-hidden', () => {
		if (sessionStorage.explorationHintUserHiddenCount && +sessionStorage.explorationHintUserHiddenCount > 1) {
			return true;
		}
		return curSelectSTM !== 'stm-browse' || hasUsedExploration;
	});
}

let onlyHide = false;

d3.selectAll('.stm')
.on('click', function () {
	if (onlyHide) {
		onlyHide = false;
		return;
	}
	doSelectSTM(d3.select(this).attr('id'));
});

d3.selectAll('.stm-hint')
.on('click', function (e) {
	d3.select(this).classed('stm-hidden', true);
	onlyHide = true;
	if (sessionStorage.explorationHintUserHiddenCount) {
		sessionStorage.explorationHintUserHiddenCount = +sessionStorage.explorationHintUserHiddenCount + 1;
	} else {
		sessionStorage.explorationHintUserHiddenCount = 1;
	}
});