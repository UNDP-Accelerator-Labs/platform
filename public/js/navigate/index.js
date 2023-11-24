window.onload = function () {
	/* SET PATHS
	NOT language NEEDS TO BE SET AS A GLOBAL VAR IN THE MAIN ejs FILE */
	const url = new URL(window.location);
	let pathname = url.pathname.substring(1);
	if (pathname.split('/').length > 1) { pathname = `${pathname.split('/').slice(1).join('/')}${url.search}`; };
	languages.forEach(d => {
		d3.select(`#lang-${d.language} a`).attr('href', `/${d.language}/${pathname}`);
	});

	d3.select('button#expand-nav')
	.on('click', function () {
		d3.select(this).toggleClass('close');
		d3.select('header').toggleClass('open');
	});
};