const convertMap = [
	[1000, 'K'],
	[1000, 'M'],
];

exports.convertNum = (v) => {
	if (+v > 0) {
		let ix = 0;
		let postfix = '';
		while (ix < convertMap.length) {
			const [divisor, name] = convertMap[ix];
			if (v < divisor) {
				break;
			}
			v /= divisor;
			postfix = name;
			ix += 1;
		}
		return `${v > 100 ? v.toFixed(0) : v.toFixed(1).replace(/\.?0*$/, '')}${postfix}`;
	}
	return '0';
};

exports.fuzzNumber = (v) => {
	if (+v > 0) {
		let rand = 1.0;
		let rng = 6;
		while (rng > 0) {
			rand += 2.0 * (Math.random() - 0.5);
			rng -= 1;
		}
		v = Math.round(Math.max(1, +v * (1 + 0.1 * rand / 6)));
	}
	return +v;
};
