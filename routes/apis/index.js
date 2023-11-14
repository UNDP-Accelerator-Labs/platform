const pads = require('./pads/');
const files = require('./files/');
const contributors = require('./contributors/');
const tags = require('./tags/');
const statistics = require('./statistics/');
const locations = require('./locations/');

module.exports = async (req, res) => {
  const { action, object } = req.params || {};
  const { output, render } = Object.keys(req.body)?.length
    ? req.body
    : Object.keys(req.query)?.length
    ? req.query
    : {};

  // TO DO: ADD Readme.md TO DOWNLOADS
  if (action === 'download') {
    if (render) {
      if (object === 'pads') {
        if (['xlsx', 'csv'].includes(output)) await pads.xlsx(req, res);
        else if (['json', 'geojson'].includes(output))
          await pads.json(req, res);
        else if (output === 'docx') await pads.docx(req, res);
        else res.redirect('/module-error');
      } else if (object === 'contributors') {
        if (['xlsx', 'csv'].includes(output))
          await contributors.xlsx(req, res);
        else if (['json', 'geojson'].includes(output))
          await contributors.json(req, res);
        else res.redirect('/module-error');
      }
    } else res.redirect('/module-error');
  } else if (action === 'fetch') {
    if (object === 'pads') {
      if (output === 'csv') await pads.xlsx(req, res);
      else if (['json', 'geojson'].includes(output)) await pads.json(req, res);
      else res.redirect('/module-error');
    } else if (object === 'files') await files(req, res);
    else if (object === 'contributors') await contributors.json(req, res);
    else if (object === 'tags') await tags(req, res);
    else if (object === 'statistics') await statistics(req, res);
    else if (object === 'countries') await locations.countries(req, res);
    else if (object === 'regions') await locations.regions(req, res);
    else res.redirect('/module-error');
  } else res.redirect('/module-error');
};
