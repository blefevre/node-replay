'use strict';

// Patch HTTP.request to make all request go through Replay
//
// Patch based on io.js, may not work with Node.js

var HTTP = require('http');
var ProxyRequest = require('./proxy');
var Replay = require('./');
var URL = require('url');

// Route HTTP requests to our little helper.
HTTP.request = function (options, callback) {
  if (typeof options === 'string' || options instanceof String) options = URL.parse(options);

  // WebSocket request: pass through to Node.js library
  if (options.headers && options.headers.Upgrade === 'websocket') return new HTTP.ClientRequest(options, callback);

  var hostname = options.hostname || options.host && options.host.split(':')[0] || 'localhost';
  if (Replay.isLocalhost(hostname) || Replay.isPassThrough(hostname)) return new HTTP.ClientRequest(options, callback);

  // Proxy request
  var request = new ProxyRequest(options, Replay.chain.start);
  if (callback) request.once('response', callback);
  return request;
};
//# sourceMappingURL=patch_http_request.js.map
