'use strict';

// Request handler that logs all request to the console when DEBUG=reply

var debug = require('./debug');
var URL = require('url');

module.exports = function logger() {
  return function (request, callback) {
    debug('Requesting ' + request.method + ' ' + URL.format(request.path || request.url));
    request.on('response', function (response) {
      debug('Received ' + response.statusCode + ' ' + URL.format(request.path || request.url));
    });
    request.on('error', function (error) {
      debug('Error ' + error);
    });
    callback();
  };
};
//# sourceMappingURL=logger.js.map
