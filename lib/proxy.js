'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// A proxy is a function that receives two arguments, a request object and a callback.
//
// If it can generate a respone, it calls callback with null and the response object.  Otherwise, either calls callback
// with no arguments, or with an error to stop the processing chain.
//
// The request consists of:
// url     - URL object
// method  - Request method (lower case)
// headers - Headers object (names are lower case)
// body    - Request body, an array of body part/encoding pairs
//
// The response consists of:
// version   - HTTP version
// status    - Status code
// headers   - Headers object (names are lower case)
// body      - Array of body parts
// trailers  - Trailers object (names are lower case)
//
// This file defines ProxyRequest, which acts as an HTTP ClientRequest that captures the request and passes it to the
// proxy chain, and ProxyResponse, which acts as an HTTP ClientResponse, playing back a response it received from the
// proxy.
//
// No actual proxies defined here.

var assert = require('assert');

var _require = require('events');

var EventEmitter = _require.EventEmitter;

var HTTP = require('http');
var HTTPS = require('https');
var Stream = require('stream');
var URL = require('url');

// HTTP client request that captures the request and sends it down the processing chain.
module.exports = function (_HTTP$IncomingMessage) {
  _inherits(ProxyRequest, _HTTP$IncomingMessage);

  function ProxyRequest() {
    var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
    var proxy = arguments[1];

    _classCallCheck(this, ProxyRequest);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(ProxyRequest).call(this));

    _this.proxy = proxy;
    _this.method = (options.method || 'GET').toUpperCase();
    var protocol = options.protocol || options._defaultAgent && options._defaultAgent.protocol || 'http:';

    var _split = (options.host || options.hostname).split(':');

    var _split2 = _slicedToArray(_split, 2);

    var host = _split2[0];
    var port = _split2[1];

    var realPort = options.port || port || (protocol === 'https:' ? 443 : 80);
    _this.url = URL.parse(protocol + '//' + (host || 'localhost') + ':' + realPort + (options.path || '/'), true);
    _this.path = _this.url.path;
    _this.auth = options.auth;
    _this.agent = options.agent || (protocol === 'https:' ? HTTPS.globalAgent : HTTP.globalAgent);
    _this.headers = {};
    if (options.headers) for (var name in options.headers) {
      var value = options.headers[name];
      if (value != null) _this.headers[name.toLowerCase()] = value.toString();
    }
    return _this;
  }

  _createClass(ProxyRequest, [{
    key: 'flushHeaders',
    value: function flushHeaders() {}
  }, {
    key: 'setHeader',
    value: function setHeader(name, value) {
      assert(!this.ended, 'Already called end');
      assert(!this.body, 'Already wrote body parts');
      this.headers[name.toLowerCase()] = value;
    }
  }, {
    key: 'getHeader',
    value: function getHeader(name) {
      return this.headers[name.toLowerCase()];
    }
  }, {
    key: 'removeHeader',
    value: function removeHeader(name) {
      assert(!this.ended, 'Already called end');
      assert(!this.body, 'Already wrote body parts');
      delete this.headers[name.toLowerCase()];
    }
  }, {
    key: 'addTrailers',
    value: function addTrailers(trailers) {
      this.trailers = trailers;
    }
  }, {
    key: 'setTimeout',
    value: function setTimeout(timeout, callback) {
      if (callback) setImmediate(callback);
    }
  }, {
    key: 'setNoDelay',
    value: function setNoDelay() /*nodelay = true*/{}
  }, {
    key: 'setSocketKeepAlive',
    value: function setSocketKeepAlive() /*enable = false, initial*/{}
  }, {
    key: 'write',
    value: function write(chunk, encoding, callback) {
      assert(!this.ended, 'Already called end');
      this.body = this.body || [];
      this.body.push([chunk, encoding]);
      if (callback) setImmediate(callback);
    }
  }, {
    key: 'end',
    value: function end(data, encoding, callback) {
      var _this2 = this;

      assert(!this.ended, 'Already called end');

      if (typeof data === 'function') {
        ;
        var _ref = [data, null];
        callback = _ref[0];
        data = _ref[1];
      } else if (typeof encoding === 'function') {
        ;

        var _ref2 = [encoding, null];
        callback = _ref2[0];
        encoding = _ref2[1];
      }if (data) {
        this.body = this.body || [];
        this.body.push([data, encoding]);
      }
      this.ended = true;

      if (callback) setImmediate(callback);

      this.proxy(this, function (error, captured) {
        // We're not asynchronous, but clients expect us to callback later on
        setImmediate(function () {
          if (error) _this2.emit('error', error);else if (captured) {
            var response = new ProxyResponse(captured);
            _this2.emit('response', response);
            response.resume();
          } else {
            var _error = new Error(_this2.method + ' ' + URL.format(_this2.url) + ' refused: not recording and no network access');
            _error.code = 'ECONNREFUSED';
            _error.errno = 'ECONNREFUSED';
            _this2.emit('error', _error);
          }
        });
      });
    }
  }, {
    key: 'flush',
    value: function flush() {}
  }, {
    key: 'abort',
    value: function abort() {}
  }]);

  return ProxyRequest;
}(HTTP.IncomingMessage);

// HTTP client response that plays back a captured response.

var ProxyResponse = function (_Stream$Readable) {
  _inherits(ProxyResponse, _Stream$Readable);

  function ProxyResponse(captured) {
    _classCallCheck(this, ProxyResponse);

    var _this3 = _possibleConstructorReturn(this, Object.getPrototypeOf(ProxyResponse).call(this));

    _this3.once('end', function () {
      _this3.emit('close');
    });

    _this3.httpVersion = captured.version || '1.1';
    _this3.httpVersionMajor = _this3.httpVersion.split('.')[0];
    _this3.httpVersionMinor = _this3.httpVersion.split('.')[1];
    _this3.statusCode = parseInt(captured.statusCode || 200, 10);
    _this3.statusMessage = captured.statusMessage || HTTP.STATUS_CODES[_this3.statusCode] || '';
    _this3.headers = Object.assign({}, captured.headers);
    _this3.rawHeaders = captured.rawHeaders || [].slice(0);
    _this3.trailers = Object.assign({}, captured.trailers);
    _this3.rawTrailers = (captured.rawTrailers || []).slice(0);
    // Not a documented property, but request seems to use this to look for HTTP parsing errors
    _this3.connection = new EventEmitter();
    _this3._body = captured.body.slice(0);
    return _this3;
  }

  _createClass(ProxyResponse, [{
    key: '_read',
    value: function _read() {
      var part = this._body.shift();
      if (part) this.push(part[0], part[1]);else this.push(null);
    }
  }, {
    key: 'setTimeout',
    value: function setTimeout(msec, callback) {
      if (callback) setImmediate(callback);
    }
  }], [{
    key: 'notFound',
    value: function notFound(url) {
      return new ProxyResponse({
        status: 404,
        body: ['No recorded request/response that matches ' + URL.format(url)]
      });
    }
  }]);

  return ProxyResponse;
}(Stream.Readable);
//# sourceMappingURL=proxy.js.map
