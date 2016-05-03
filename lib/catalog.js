'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _toArray(arr) { return Array.isArray(arr) ? arr : Array.from(arr); }

var assert = require('assert');
var debug = require('./debug');
var File = require('fs');
var Path = require('path');
var Matcher = require('./matcher');
var jsStringEscape = require('js-string-escape');

function mkpathSync(pathname) {
  if (File.existsSync(pathname)) return;
  var parent = Path.dirname(pathname);
  if (File.existsSync(parent)) File.mkdirSync(pathname);else {
    mkpathSync(parent);
    File.mkdirSync(pathname);
  }
}

// Parse headers from headerLines.  Optional argument `only` is an array of
// regular expressions; only headers matching one of these expressions are
// parsed.  Returns a object with name/value pairs.
function parseHeaders(filename, headerLines) {
  var only = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];

  var headers = Object.create(null);
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = headerLines[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var line = _step.value;

      if (line === '') continue;

      var _line$match$slice = line.match(/^(.*?)\:\s+(.*)$/).slice(1);

      var _line$match$slice2 = _slicedToArray(_line$match$slice, 2);

      var name = _line$match$slice2[0];
      var value = _line$match$slice2[1];

      if (only && !match(name, only)) continue;

      var key = (name || '').toLowerCase();
      value = (value || '').trim().replace(/^"(.*)"$/, '$1');
      if (Array.isArray(headers[key])) headers[key].push(value);else if (headers[key]) headers[key] = [headers[key], value];else headers[key] = value;
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

  return headers;
}

function parseRequest(filename, request, requestHeaders) {
  assert(request, filename + ' missing request section');

  var _request$split = request.split(/\n/);

  var _request$split2 = _toArray(_request$split);

  var methodAndPath = _request$split2[0];

  var headerLines = _request$split2.slice(1);

  var method = void 0;
  var path = void 0;
  var rawRegexp = void 0;
  var regexp = void 0;
  if (/\sREGEXP\s/.test(methodAndPath)) {
    var _methodAndPath$split = methodAndPath.split(' REGEXP ');

    var _methodAndPath$split2 = _slicedToArray(_methodAndPath$split, 2);

    method = _methodAndPath$split2[0];
    rawRegexp = _methodAndPath$split2[1];

    var _rawRegexp$match$slic = rawRegexp.match(/^\/(.+)\/(i|m|g)?$/).slice(1);

    var _rawRegexp$match$slic2 = _slicedToArray(_rawRegexp$match$slic, 2);

    var inRegexp = _rawRegexp$match$slic2[0];
    var flags = _rawRegexp$match$slic2[1];

    regexp = new RegExp(inRegexp, flags || '');
  } else {
    ;

    var _methodAndPath$split3 = methodAndPath.split(/\s/);

    var _methodAndPath$split4 = _slicedToArray(_methodAndPath$split3, 2);

    method = _methodAndPath$split4[0];
    path = _methodAndPath$split4[1];
  }assert(method && (path || regexp), filename + ': first line must be <method> <path>');
  assert(/^[a-zA-Z]+$/.test(method), filename + ': method not valid');
  var headers = parseHeaders(filename, headerLines, requestHeaders);
  var body = headers.body;
  delete headers.body;
  var url = path || regexp;
  return { url: url, method: method, headers: headers, body: body };
}

function parseResponse(filename, response, body) {
  if (response) {
    var _response$split = response.split(/\n/);

    var _response$split2 = _toArray(_response$split);

    var statusLine = _response$split2[0];

    var headerLines = _response$split2.slice(1);

    var newFormat = statusLine.match(/HTTP\/(\d\.\d)\s+(\d{3})\s*(.*)/);
    var version = newFormat[1];
    var statusCode = parseInt(newFormat[2], 10);
    var statusMessage = newFormat[3].trim();
    var headers = parseHeaders(filename, headerLines);
    var rawHeaders = headerLines.reduce(function (raw, header) {
      var _header$split = header.split(/:\s+/);

      var _header$split2 = _slicedToArray(_header$split, 2);

      var name = _header$split2[0];
      var value = _header$split2[1];

      raw.push(name);
      raw.push(value);
      return raw;
    }, []);
    return { statusCode: statusCode, statusMessage: statusMessage, version: version, headers: headers, rawHeaders: rawHeaders, body: body, trailers: {}, rawTrailers: [] };
  }
}

function readAndInitialParseFile(filename) {
  var buffer = File.readFileSync(filename);
  var parts = buffer.toString('utf8').split('\n\n');
  if (parts.length > 2) {
    var parts0 = new Buffer(parts[0], 'utf8');
    var parts1 = new Buffer(parts[1], 'utf8');
    var body = buffer.slice(parts0.length + parts1.length + 4);
    return [parts[0], parts[1], body];
  } else return [parts[0], parts[1], ''];
}

// Write headers to the File object.  Optional argument `only` is an array of
// regular expressions; only headers matching one of these expressions are
// written.
function writeHeaders(file, headers) {
  var only = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];

  for (var name in headers) {
    var value = headers[name];
    if (only && !match(name, only)) continue;
    if (Array.isArray(value)) {
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = value[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var _item = _step2.value;

          file.write(name + ': ' + _item + '\n');
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
    } else file.write(name + ': ' + value + '\n');
  }
}

// Returns true if header name matches one of the regular expressions.
function match(name, regexps) {
  var _iteratorNormalCompletion3 = true;
  var _didIteratorError3 = false;
  var _iteratorError3 = undefined;

  try {
    for (var _iterator3 = regexps[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
      var regexp = _step3.value;

      if (regexp.test(name)) return true;
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

  return false;
}

module.exports = function () {
  function Catalog(settings) {
    _classCallCheck(this, Catalog);

    this.settings = settings;
    // We use this to cache host/host:port mapped to array of matchers.
    this.matchers = {};
    this._basedir = Path.resolve('fixtures');
  }

  _createClass(Catalog, [{
    key: 'getFixturesDir',
    value: function getFixturesDir() {
      return this._basedir;
    }
  }, {
    key: 'setFixturesDir',
    value: function setFixturesDir(dir) {
      this._basedir = Path.resolve(dir);
      this.matchers = {};
    }
  }, {
    key: 'find',
    value: function find(host) {
      // Return result from cache.
      var matchers = this.matchers[host];
      if (matchers) return matchers;

      // Start by looking for directory and loading each of the files.
      // Look for host-port (windows friendly) or host:port (legacy)
      var pathname = this.getFixturesDir() + '/' + host.replace(':', '-');
      if (!File.existsSync(pathname)) pathname = this.getFixturesDir() + '/' + host;
      if (!File.existsSync(pathname)) return null;

      var newMatchers = this.matchers[host] || [];
      this.matchers[host] = newMatchers;

      var stat = File.statSync(pathname);
      if (stat.isDirectory()) {
        var files = File.readdirSync(pathname);
        var _iteratorNormalCompletion4 = true;
        var _didIteratorError4 = false;
        var _iteratorError4 = undefined;

        try {
          for (var _iterator4 = files[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
            var file = _step4.value;

            var mapping = this._read(pathname + '/' + file);
            newMatchers.push(Matcher.fromMapping(host, mapping));
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
      } else {
        var _mapping = this._read(pathname);
        newMatchers.push(Matcher.fromMapping(host, _mapping));
      }

      return newMatchers;
    }
  }, {
    key: 'save',
    value: function save(host, request, response, callback) {
      var matcher = Matcher.fromMapping(host, { request: request, response: response });
      var matchers = this.matchers[host] || [];
      matchers.push(matcher);
      var requestHeaders = this.settings.headers;

      var uid = '' + Date.now() + Math.floor(Math.random() * 100000);
      var tmpfile = this.getFixturesDir() + '/node-replay.' + uid;
      var pathname = this.getFixturesDir() + '/' + host.replace(':', '-');

      debug('Creating ' + pathname);
      try {
        mkpathSync(pathname);
      } catch (error) {
        setImmediate(function () {
          callback(error);
        });
        return;
      }

      var filename = pathname + '/' + uid;
      try {
        var file = File.createWriteStream(tmpfile, { encoding: 'utf-8' });
        file.write(request.method.toUpperCase() + ' ' + (request.path || request.url.path || '/') + '\n');
        writeHeaders(file, request.headers, requestHeaders);
        if (request.body) {
          var body = '';
          var _iteratorNormalCompletion5 = true;
          var _didIteratorError5 = false;
          var _iteratorError5 = undefined;

          try {
            for (var _iterator5 = request.body[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
              var chunks = _step5.value;

              body += chunks[0];
            }
          } catch (err) {
            _didIteratorError5 = true;
            _iteratorError5 = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion5 && _iterator5.return) {
                _iterator5.return();
              }
            } finally {
              if (_didIteratorError5) {
                throw _iteratorError5;
              }
            }
          }

          writeHeaders(file, { body: jsStringEscape(body) });
        }
        file.write('\n');
        // Response part
        file.write('HTTP/' + (response.version || '1.1') + ' ' + (response.statusCode || 200) + ' ' + response.statusMessage + '\n');
        writeHeaders(file, response.headers);
        file.write('\n');
        var _iteratorNormalCompletion6 = true;
        var _didIteratorError6 = false;
        var _iteratorError6 = undefined;

        try {
          for (var _iterator6 = response.body[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
            var part = _step6.value;

            file.write(part[0], part[1]);
          }
        } catch (err) {
          _didIteratorError6 = true;
          _iteratorError6 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion6 && _iterator6.return) {
              _iterator6.return();
            }
          } finally {
            if (_didIteratorError6) {
              throw _iteratorError6;
            }
          }
        }

        file.end(function () {
          File.rename(tmpfile, filename, callback);
        });
      } catch (error) {
        callback(error);
      }
    }
  }, {
    key: '_read',
    value: function _read(filename) {
      var _readAndInitialParseF = readAndInitialParseFile(filename);

      var _readAndInitialParseF2 = _slicedToArray(_readAndInitialParseF, 3);

      var request = _readAndInitialParseF2[0];
      var response = _readAndInitialParseF2[1];
      var part = _readAndInitialParseF2[2];

      var body = [[part, undefined]];
      return {
        request: parseRequest(filename, request, this.settings.headers),
        response: parseResponse(filename, response, body)
      };
    }
  }]);

  return Catalog;
}();
//# sourceMappingURL=catalog.js.map
