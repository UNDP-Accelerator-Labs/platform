export function clearExploration () {
	sessionStorage.removeItem('explorationHintUserHiddenCount');
	sessionStorage.removeItem('explorationPrompt');
	sessionStorage.removeItem('explorationId');
}