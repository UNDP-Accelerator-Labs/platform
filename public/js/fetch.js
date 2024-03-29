import { isLoading } from '/js/notification/loader.js';

const jsonQueryHeader = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
};
function _fetch(_method, _uri, _q, _expectJSON, _checkStatus) {
  return new Promise((resolve, reject) => {
    isLoading(true);
    const args = { method: _method, headers: jsonQueryHeader };
    if (_q) {
      args['body'] = JSON.stringify(_q);
    }
    fetch(_uri, args)
      .then((response) => {
        if (_checkStatus && !response.ok) {
          reject(response);
          isLoading(false);
          return;
        }
        if (_expectJSON) {
          return response.json();
        }
        return response;
      })
      .then((results) => {
        resolve(results);
        isLoading(false);
      })
      .catch((err) => {
        reject(err);
        isLoading(false);
      });
  });
}
export function GET(_uri, _expectJSON = true, _checkStatus = false) {
  return _fetch('GET', _uri, null, _expectJSON, _checkStatus);
}
export function POST(_uri, _q, _expectJSON = true, _checkStatus = false) {
  return _fetch('POST', _uri, _q || {}, _expectJSON, _checkStatus);
}
export function PUT(_uri, _q, _expectJSON = true, _checkStatus = false) {
  return _fetch('PUT', _uri, _q || {}, _expectJSON, _checkStatus);
}
export function DELETE(_uri, _q, _expectJSON = true, _checkStatus = false) {
  return _fetch('DELETE', _uri, _q || {}, _expectJSON, _checkStatus);
}
