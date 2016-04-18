'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

// Patch DNS.lookup to resolve all hosts added via Replay.localhost as 127.0.0.1

var DNS = require('dns');
var Replay = require('./');

var originalLookup = DNS.lookup;
DNS.lookup = function (domain, options, callback) {
  if (typeof domain === 'string' && (typeof options === 'undefined' ? 'undefined' : _typeof(options)) === 'object' && typeof callback === 'function' && Replay.isLocalhost(domain)) {
    var family = options.family || 4;
    var ip = family === 6 ? '::1' : '127.0.0.1';
    callback(null, ip, family);
  } else originalLookup(domain, options, callback);
};
//# sourceMappingURL=patch_dns_lookup.js.map
