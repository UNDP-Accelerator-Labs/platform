export async function fullVocabulary () {
	const app_title_short = JSON.parse(d3.select('data[name="site"]').node()?.value || '{}')?.app_title_short;
	let vocabulary = {}

	try {
		const { vocabulary: platformVocabulary } = await import(`/vocabulary/${app_title_short}.js`);
		vocabulary = platformVocabulary;
	} catch {
		const { vocabulary: baseVocabulary } = await import('/vocabulary/base.js');
		vocabulary = baseVocabulary;
	}
	// NEED TO SET app_title_short IN ALL /data.ejs FILES
	return vocabulary
}