import { isLoading } from '/js/notification/loader.js';

const jsonQueryHeader = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
};
function _fetch(_method, _uri, _q, _expectJSON, _checkStatus) {
  let isActive = true;
  let isRendering = false;

  const stop = () => {
    if (isRendering) {
      isLoading(false);
      isRendering = false;
    }
    isActive = false;
  };

  setTimeout(() => {
    if (isActive) {
      isLoading(true);
      isRendering = true;
    }
  }, 500);

  return new Promise((resolve, reject) => {
    const args = { method: _method, headers: jsonQueryHeader };
    if (_q) {
      args['body'] = JSON.stringify(_q);
    }
    fetch(_uri, args)
      .then((response) => {
        if (_checkStatus && !response.ok) {
          reject(response);
          stop();
          return;
        }
        if (_expectJSON) {
          return response.json();
        }
        return response;
      })
      .then((results) => {
        resolve(results);
        stop();
      })
      .catch((err) => {
        reject(err);
        stop();
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
