'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// The Replay module holds global configution properties and methods.

var Catalog = require('./catalog');
var Chain = require('./chain');
var debug = require('./debug');

var _require = require('events');

var EventEmitter = _require.EventEmitter;

var logger = require('./logger');
var passThrough = require('./pass_through');
var recorder = require('./recorder');

// Supported modes
var MODES = [
// Allow outbound HTTP requests, don't replay anything.  Use this to test your
// code against changes to 3rd party API.
'bloody',

// Allow outbound HTTP requests, replay captured responses.  This mode is
// particularly useful when new code makes new requests, but unstable yet and
// you don't want these requests saved.
'cheat',

// Allow outbound HTTP requests, capture responses for future replay.  This
// mode allows you to capture and record new requests, e.g. when adding tests
// or making code changes.
'record',

// Do not allow outbound HTTP requests, replay captured responses.  This is
// the default mode and the one most useful for running tests
'replay'];

// This is the standard mode for running tests
var DEFAULT_MODE = 'replay';

// Headers that are recorded/matched during replay.
var MATCH_HEADERS = [/^accept/, /^authorization/, /^body/, /^content-type/, /^host/, /^if-/, /^x-/];

// Instance properties:
//
// catalog   - The catalog is responsible for loading pre-recorded responses
//             into memory, from where they can be replayed, and storing captured responses.
//
// chain     - The proxy chain.  Essentially an array of handlers through which
//             each request goes, and concludes when the last handler returns a
//             response.
//
// headers   - Only these headers are matched when recording/replaying.  A list
//             of regular expressions.
//
// fixtures  - Main directory for replay fixtures.
//
// mode      - The mode we're running in, see MODES.

var Replay = function (_EventEmitter) {
  _inherits(Replay, _EventEmitter);

  function Replay(mode) {
    _classCallCheck(this, Replay);

    if (! ~MODES.indexOf(mode)) throw new Error('Unsupported mode \'' + mode + '\', must be one of ' + MODES.join(', ') + '.');

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Replay).call(this));

    _this.mode = mode;
    _this.chain = new Chain();

    // Localhost servers: pass request to localhost
    _this._localhosts = new Set('localhost', '127.0.0.1', '::1');
    // Pass through requests to these servers
    _this._passThrough = new Set();
    // Dropp connections to these servers
    _this._dropped = new Set();

    _this.catalog = new Catalog(_this);
    _this.headers = MATCH_HEADERS;

    // Automatically emit connection errors and such, also prevent process from crashing
    _this.on('error', function (error) {
      debug('Replay: ' + (error.message || error));
    });
    return _this;
  }

  // Addes a proxy to the beginning of the processing chain, so it executes ahead of any existing proxy.
  //
  // Example
  //     replay.use(replay.logger())


  _createClass(Replay, [{
    key: 'use',
    value: function use(proxy) {
      this.chain.prepend(proxy);
      return this;
    }

    // Pass through all requests to these hosts

  }, {
    key: 'passThrough',
    value: function passThrough() {
      for (var _len = arguments.length, hosts = Array(_len), _key = 0; _key < _len; _key++) {
        hosts[_key] = arguments[_key];
      }

      this.reset.apply(this, hosts);
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = hosts[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var host = _step.value;

          this._passThrough.add(host);
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

      return this;
    }

    // True to pass through requests to this host

  }, {
    key: 'isPassThrough',
    value: function isPassThrough(host) {
      var domain = host.replace(/^[^.]+/, '*');
      return !!(this._passThrough.has(host) || this._passThrough.has(domain) || this._passThrough.has('*.' + host));
    }

    // Do not allow network access to these hosts (drop connection)

  }, {
    key: 'drop',
    value: function drop() {
      for (var _len2 = arguments.length, hosts = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        hosts[_key2] = arguments[_key2];
      }

      this.reset.apply(this, hosts);
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = hosts[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var host = _step2.value;

          this._dropped.add(host);
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }

      return this;
    }

    // True if this host is on the dropped list

  }, {
    key: 'isDropped',
    value: function isDropped(url) {
      var host = url.hostname;
      var domain = host.replace(/^[^.]+/, '*');
      return !!(this._dropped.has(host) || this._dropped.has(domain) || this._dropped.has('*.' + host) || this._dropped.has(url.host));
    }

    // Treats this host as localhost: requests are routed directly to 127.0.0.1, no
    // replay.  Useful when you want to send requests to the test server using its
    // production host name.

  }, {
    key: 'localhost',
    value: function localhost() {
      for (var _len3 = arguments.length, hosts = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
        hosts[_key3] = arguments[_key3];
      }

      this.reset.apply(this, hosts);
      var _iteratorNormalCompletion3 = true;
      var _didIteratorError3 = false;
      var _iteratorError3 = undefined;

      try {
        for (var _iterator3 = hosts[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
          var host = _step3.value;

          this._localhosts.add(host);
        }
      } catch (err) {
        _didIteratorError3 = true;
        _iteratorError3 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion3 && _iterator3.return) {
            _iterator3.return();
          }
        } finally {
          if (_didIteratorError3) {
            throw _iteratorError3;
          }
        }
      }

      return this;
    }

    // True if this host should be treated as localhost.

  }, {
    key: 'isLocalhost',
    value: function isLocalhost(host) {
      var domain = host.replace(/^[^.]+/, '*');
      return !!(this._localhosts.has(host) || this._localhosts.has(domain) || this._localhosts.has('*.' + host));
    }

    // Use this when you want to exclude host from dropped/pass-through/localhost

  }, {
    key: 'reset',
    value: function reset() {
      for (var _len4 = arguments.length, hosts = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
        hosts[_key4] = arguments[_key4];
      }

      var _iteratorNormalCompletion4 = true;
      var _didIteratorError4 = false;
      var _iteratorError4 = undefined;

      try {
        for (var _iterator4 = hosts[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
          var host = _step4.value;

          this._localhosts.delete(host);
          this._passThrough.delete(host);
          this._dropped.delete(host);
        }
      } catch (err) {
        _didIteratorError4 = true;
        _iteratorError4 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion4 && _iterator4.return) {
            _iterator4.return();
          }
        } finally {
          if (_didIteratorError4) {
            throw _iteratorError4;
          }
        }
      }

      return this;
    }
  }, {
    key: 'fixtures',
    get: function get() {
      return this.catalog.getFixturesDir();
    },
    set: function set(dir) {
      // Clears loaded fixtures, and updates to new dir
      this.catalog.setFixturesDir(dir);
    }
  }]);

  return Replay;
}(EventEmitter);

var replay = new Replay(process.env.REPLAY || DEFAULT_MODE);

function passWhenBloodyOrCheat(request) {
  return replay.isPassThrough(request.url.hostname) || replay.mode === 'cheat' && !replay.isDropped(request.url);
}

function passToLocalhost(request) {
  return replay.isLocalhost(request.url.hostname) || replay.mode === 'bloody';
}

// The default processing chain (from first to last):
// - Pass through requests to localhost
// - Log request to console is `deubg` is true
// - Replay recorded responses
// - Pass through requests in bloody and cheat modes
replay.use(passThrough(passWhenBloodyOrCheat)).use(recorder(replay)).use(logger(replay)).use(passThrough(passToLocalhost));

module.exports = replay;

// These must come last since they need module.exports to exist
require('./patch_http_request');
require('./patch_dns_lookup');
//# sourceMappingURL=index.js.map
