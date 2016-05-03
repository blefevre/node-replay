'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// A matcher is a function that, given a request, returns an appropriate response or nothing.
//
// The most common use case is to calling `Matcher.fromMapping(mapping)`.
//
// The request consists of:
// url     - URL object
// method  - Request method (lower case)
// headers - Headers object (names are lower case)
// body    - Request body (for some requests)
//
// The response consists of:
// version   - HTTP version
// status    - Status code
// headers   - Headers object (names are lower case)
// body      - Array of body parts
// trailers  - Trailers object (names are lower case)

var assert = require('assert');
var URL = require('url');
var jsStringEscape = require('js-string-escape');

// Simple implementation of a matcher.
//
// To create a matcher from request/response mapping use `fromMapping`.
module.exports = function () {
  function Matcher(request, response) {
    _classCallCheck(this, Matcher);

    // Map requests to object properties.  We do this for quick matching.
    assert(request.url || request.regexp, 'I need at least a URL to match request to response');
    if (request.regexp) {
      this.hostname = request.hostname;
      this.regexp = request.regexp;
    } else {
      var url = URL.parse(request.url);
      this.hostname = url.hostname;
      this.port = url.port;
      this.path = request.path || url.path;
    }

    this.method = request.method && request.method.toUpperCase() || 'GET';
    this.headers = {};
    if (request.headers) for (var name in request.headers) {
      var value = request.headers[name];
      this.headers[name.toLowerCase()] = value;
    }
    this.body = request.body;

    // Create a normalized response object that we return.
    this.response = {
      version: response.version || '1.1',
      statusCode: response.statusCode && parseInt(response.statusCode, 10) || 200,
      statusMessage: response.statusMessage || '',
      headers: {},
      body: response.body ? response.body.slice(0) : [],
      trailers: {}
    };

    // Copy over header to response, downcase header names.
    if (response.headers) {
      var headers = this.response.headers;
      for (var _name in response.headers) {
        var _value = response.headers[_name];
        headers[_name.toLowerCase()] = _value;
      }
    }
    // Copy over trailers to response, downcase trailers names.
    if (response.trailers) {
      var trailers = this.response.trailers;
      for (var _name2 in response.trailers) {
        var _value2 = response.trailers[_name2];
        trailers[_name2.toLowerCase()] = _value2;
      }
    }
  }

  // Quick and effective matching.


  _createClass(Matcher, [{
    key: 'match',
    value: function match(request) {
      var url = request.url;
      var path = request.path;
      var method = request.method;
      var headers = request.headers;
      var body = request.body;

      if (this.hostname && this.hostname !== url.hostname) return false;
      if (this.regexp) {
        if (!this.regexp.test(path || url.path)) return false;
      } else {
        if (this.port && this.port !== url.port) return false;
        if (this.path && this.path !== path && this.path !== url.path) return false;
      }
      if (this.method !== method) return false;

      for (var name in this.headers) {
        if (this.headers[name] !== headers[name]) return false;
      }
      if (body) {
        var data = '';
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = body[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var chunks = _step.value;

            data += chunks[0];
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

        data = jsStringEscape(data);
        if (this.body && this.body !== data) return false;
      }
      return true;
    }

    // Returns new matcher function based on the supplied mapping.
    //
    // Mapping can contain `request` and `response` object.  As shortcut, mapping can specify `path` and `method` (optional)
    // directly, and also any of the response properties.

  }], [{
    key: 'fromMapping',
    value: function fromMapping(host, mapping) {
      assert(!!mapping.path ^ !!mapping.request, 'Mapping must specify path or request object');

      var matchingRequest = void 0;
      if (mapping.path) matchingRequest = {
        url: URL.resolve('http://' + host + '/', mapping.path),
        method: mapping.method
      };else if (mapping.request.url instanceof RegExp) matchingRequest = {
        host: host,
        regexp: mapping.request.url,
        method: mapping.request.method,
        headers: mapping.request.headers,
        body: mapping.request.body
      };else matchingRequest = {
        url: URL.resolve('http://' + host, mapping.request.url),
        method: mapping.request.method,
        headers: mapping.request.headers,
        body: mapping.request.body
      };

      var matcher = new Matcher(matchingRequest, mapping.response || {});
      return function (request) {
        if (matcher.match(request)) return matcher.response;
      };
    }
  }]);

  return Matcher;
}();
//# sourceMappingURL=matcher.js.map
