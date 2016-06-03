'use strict';

var passThrough = require('./pass_through');

module.exports = function recorded(settings) {
  var catalog = settings.catalog;

  var capture = passThrough(true);

  return function (request, callback) {
    var host = request.url.hostname;
    if (request.url.port && request.url.port !== '80') host = host + ':' + request.url.port;

    // Look for a matching response and replay it.
    try {
      var matchers = catalog.find(host);
      if (matchers) {
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = matchers[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var _matcher = _step.value;

            var response = _matcher(request);
            if (response) {
              callback(null, response);
              return;
            }
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator.return) {
              _iterator.return();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }
      }
    } catch (error) {
      error.code = 'CORRUPT FIXTURE';
      error.syscall = 'connect';
      callback(error);
      return;
    }

    // Do not record this host.
    if (settings.isDropped(request.url)) {
      var refused = new Error('Error: connect ECONNREFUSED');
      refused.code = refused.errno = 'ECONNREFUSED';
      refused.syscall = 'connect';
      callback(refused);
      return;
    }

    // In recording mode capture the response and store it.
    if (settings.mode === 'record') {
      capture(request, function (error, response) {
        if (error) callback(error);else catalog.save(host, request, response, function (saveError) {
          callback(saveError, response);
        });
      });
      return;
    }

    // Not in recording mode, pass control to the next proxy.
    callback();
  };
};
//# sourceMappingURL=recorder.js.map
