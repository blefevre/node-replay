"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// Processing chain: pass each request through a list of handlers
//
// Each handler called with ClientRequest object and must pass control to
// callback with either error, ServerResponse object, or no arguments to pass
// control to the next handler.

module.exports = function () {
  function Chain() {
    _classCallCheck(this, Chain);

    // Linked list of handlers; each handler has a reference to the next one
    this.first = null;
    this.last = null;
  }

  // Appends a handler to the chain (invoked before all other handlers)


  _createClass(Chain, [{
    key: "append",
    value: function append(handler) {
      var layer = this._wrap(handler);
      this.first = this.first || layer;
      if (this.last) this.last.next = layer;
      this.last = layer;
      return this;
    }

    // Prepends a handler to the chain (invoked after all other handlers)

  }, {
    key: "prepend",
    value: function prepend(handler) {
      var layer = this._wrap(handler);
      layer.next = this.first;
      this.first = layer;
      this.last = this.last || layer;
      return this;
    }

    // Clears the chain of all its handlers

  }, {
    key: "clear",
    value: function clear() {
      this.first = this.last = null;
    }

    // Returns the first handler in the chain

  }, {
    key: "_wrap",


    // Wraps a handler and returns a function that will invoke this handler, and
    // if the handler does not return a response, pass control to the next handler
    // in the chain
    value: function _wrap(handler) {
      function layer(request, callback) {
        handler(request, function (error, response) {
          if (error || response) callback(error, response);else if (layer.next) layer.next(request, callback);else callback();
        });
      }
      return layer;
    }
  }, {
    key: "start",
    get: function get() {
      return this.first;
    }
  }]);

  return Chain;
}();
//# sourceMappingURL=chain.js.map
