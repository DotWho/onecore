'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

// window.onerror = function (msg, url, lineNo, columnNo, error) {
//     console.log(`${msg}[${lineNo}:${columnNo}]`);
// };
;(function () {
    'use strict';

    function loadXMLString(txt) {
        var s = document.createElement('div');
        s.style.display = 'none';
        s.innerHTML = txt;
        return s.childNodes.length > 1 ? Array.prototype.slice.call(s.childNodes) : s.childNodes[0];
    }

    function getEls(el, expr, type) {
        var matchesSelector = el.matches || el.webkitMatchesSelector || el.mozMatchesSelector || el.msMatchesSelector;

        while (el) {
            if (matchesSelector.call(el, expr)) {
                break;
            }
            switch (type) {
                case 'prev':
                    el = el.previousElementSibling;
                    break;
                case 'next':
                    el = el.nextElementSibling;
                    break;
                case 'parent':
                    el = el.parentNode;
                    break;
            }
        }
        return el;
    }

    function overload(callback, start, end) {
        start = start === undefined ? 1 : start;
        end = end || start + 1;

        if (end - start <= 1) {
            return function () {
                if (arguments.length <= start || $.type(arguments[start]) === 'string') {
                    return callback.apply(this, arguments);
                }

                var obj = arguments[start];
                var ret;

                for (var key in obj) {
                    var args = Array.prototype.slice.call(arguments);
                    args.splice(start, 1, key, obj[key]);
                    ret = callback.apply(this, args);
                }

                return ret;
            };
        }

        return overload(overload(callback, start + 1, end), start, end - 1);
    }

    // Copy properties from one object to another. Overwrites allowed.
    // Subtle difference of array vs string whitelist: If property doesn't exist in from, array will not define it.
    function extend(to, from, whitelist) {
        var whitelistType = type(whitelist);

        if (whitelistType === 'string') {
            // To copy gettters/setters, preserve flags etc
            var descriptor = Object.getOwnPropertyDescriptor(from, whitelist);

            if (descriptor && (!descriptor.writable || !descriptor.configurable || !descriptor.enumerable || descriptor.get || descriptor.set)) {
                delete to[whitelist];
                Object.defineProperty(to, whitelist, descriptor);
            } else {
                to[whitelist] = from[whitelist];
            }
        } else if (whitelistType === 'array') {
            whitelist.forEach(function (property) {
                if (property in from) {
                    extend(to, from, property);
                }
            });
        } else {
            for (var property in from) {
                if (whitelist) {
                    if (whitelistType === 'regexp' && !whitelist.test(property) || whitelistType === 'function' && !whitelist.call(from, property)) {
                        continue;
                    }
                }

                extend(to, from, property);
            }
        }

        return to;
    }

    /**
     * Returns the [[Class]] of an object in lowercase (eg. array, date, regexp, string etc)
     */
    function type(obj) {
        if (obj === null) {
            return 'null';
        }

        if (obj === undefined) {
            return 'undefined';
        }

        var ret = (Object.prototype.toString.call(obj).match(/^\[object\s+(.*?)\]$/)[1] || '').toLowerCase();

        if (ret == 'number' && isNaN(obj)) {
            return 'nan';
        }

        return ret;
    }

    var $ = self.Bliss = extend(function (expr, context) {
        if (arguments.length == 2 && !context || !expr) {
            return undefined;
        }

        try {
            return $.type(expr) === 'string' ? (context || document).querySelector(expr) : expr || undefined;
        } catch (e) {
            return loadXMLString(expr);
        }
    }, self.Bliss);

    extend($, {
        extend: extend,
        overload: overload,
        type: type,

        property: $.property || '_',
        listeners: self.WeakMap ? new WeakMap() : new Map(),

        original: {
            addEventListener: (self.EventTarget || Node).prototype.addEventListener,
            removeEventListener: (self.EventTarget || Node).prototype.removeEventListener
        },

        fn: {},

        noop: function noop() {},

        $: function $(expr, context) {
            if (expr instanceof Node || expr instanceof Window) {
                return [expr];
            }

            if (arguments.length == 2 && !context) {
                return [];
            }

            return Array.prototype.slice.call(typeof expr == 'string' ? (context || document).querySelectorAll(expr) : expr || []);
        },

        /*
         * Return first non-undefined value. Mainly used internally.
         */
        defined: function defined() {
            for (var i = 0; i < arguments.length; i++) {
                if (arguments[i] !== undefined) {
                    return arguments[i];
                } else {
                    return undefined;
                }
            }
        },

        each: function each(obj, callback, ret) {
            ret = ret || {};

            for (var property in obj) {
                ret[property] = callback.call(obj, property, obj[property]);
            }

            return ret;
        },

        ready: function ready(context, callback, isVoid) {
            if (typeof context === 'function' && !callback) {
                callback = context;
                context = undefined;
            }

            context = context || document;

            if (callback) {
                if (context.readyState !== 'loading') {
                    callback();
                } else {
                    $.once(context, 'DOMContentLoaded', function () {
                        callback();
                    });
                }
            }

            if (!isVoid) {
                return new Promise(function (resolve) {
                    $.ready(context, resolve, true);
                });
            }
        },

        // Helper for defining OOP-like “classes”
        Class: function Class(o) {
            var special = ['constructor', 'extends', 'abstract', 'static'].concat(Object.keys($.classProps));
            var init = o.hasOwnProperty('constructor') ? o.constructor : $.noop;
            var _Class;

            if (arguments.length == 2) {
                // Existing class provided
                _Class = arguments[0];
                o = arguments[1];
            } else {
                _Class = function Class() {
                    if (this.constructor.__abstract && this.constructor === _Class) {
                        throw new Error('Abstract classes cannot be directly instantiated.');
                    }

                    _Class.super && _Class.super.apply(this, arguments);

                    init.apply(this, arguments);
                };

                _Class.super = o.extends || null;

                _Class.prototype = $.extend(Object.create(_Class.super ? _Class.super.prototype : Object), {
                    constructor: _Class
                });

                // For easier calling of super methods
                // This doesn't save us from having to use .call(this) though
                _Class.prototype.super = _Class.super ? _Class.super.prototype : null;

                _Class.__abstract = !!o.abstract;
            }

            var specialFilter = function specialFilter(property) {
                return this.hasOwnProperty(property) && special.indexOf(property) === -1;
            };

            // Static methods
            if (o.static) {
                $.extend(_Class, o.static, specialFilter);

                for (var property in $.classProps) {
                    if (property in o.static) {
                        $.classProps[property](_Class, o.static[property]);
                    }
                }
            }

            // Instance methods
            $.extend(_Class.prototype, o, specialFilter);

            for (var property in $.classProps) {
                if (property in o) {
                    $.classProps[property](_Class.prototype, o[property]);
                }
            }

            return _Class;
        },

        // Properties with special handling in classes
        classProps: {
            // Properties that behave like normal properties but also execute code upon getting/setting
            live: overload(function (obj, property, descriptor) {
                if ($.type(descriptor) === 'function') {
                    descriptor = {
                        set: descriptor
                    };
                }

                Object.defineProperty(obj, property, {
                    get: function get() {
                        var value = this['_' + property];
                        console.log(value);
                        var ret = descriptor.get && descriptor.get.call(this, value);
                        return ret !== undefined ? ret : value;
                    },
                    set: function set(v) {
                        var value = this['_' + property];
                        var ret = descriptor.set && descriptor.set.call(this, v, value);
                        this['_' + property] = ret !== undefined ? ret : v;
                    },
                    configurable: descriptor.configurable,
                    enumerable: descriptor.enumerable
                });

                return obj;
            })
        },

        /*
         * Fetch API inspired XHR wrapper. Returns promise.
         */
        fetch: function fetch(url, o) {
            if (!url) {
                throw new TypeError('URL parameter is mandatory and cannot be ' + url);
            }

            // Set defaults & fixup arguments
            var env = extend({
                url: new URL(url, location),
                data: '',
                method: 'GET',
                headers: {},
                xhr: new XMLHttpRequest()
            }, o);

            env.method = env.method.toUpperCase();

            $.hooks.run('fetch-args', env);

            // Start sending the request

            if (env.method === 'GET' && env.data) {
                env.url.search += env.data;
            }

            document.body.setAttribute('data-loading', env.url);

            env.xhr.open(env.method, env.url.href, env.async !== false, env.user, env.password);

            for (var property in o) {
                if (property === 'upload') {
                    if (env.xhr.upload && _typeof(o[property]) === 'object') {
                        $.extend(env.xhr.upload, o[property]);
                    }
                } else if (property in env.xhr) {
                    try {
                        env.xhr[property] = o[property];
                    } catch (e) {
                        self.console && console.error(e);
                    }
                }
            }

            var headerKeys = Object.keys(env.headers).map(function (key) {
                return key.toLowerCase();
            });

            if (env.method !== 'GET' && headerKeys.indexOf('content-type') === -1) {
                env.xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
            }

            for (var header in env.headers) {
                if (env.headers[header] !== undefined) {
                    env.xhr.setRequestHeader(header, env.headers[header]);
                }
            }

            var promise = new Promise(function (resolve, reject) {
                env.xhr.onload = function () {
                    document.body.removeAttribute('data-loading');

                    if (env.xhr.status === 0 || env.xhr.status >= 200 && env.xhr.status < 300 || env.xhr.status === 304) {
                        // Success!
                        resolve(env.xhr);
                    } else {
                        reject($.extend(Error(env.xhr.statusText), {
                            xhr: env.xhr,
                            get status() {
                                return this.xhr.status;
                            }
                        }));
                    }
                };

                env.xhr.onerror = function () {
                    document.body.removeAttribute('data-loading');
                    reject($.extend(Error('Network Error'), {
                        xhr: env.xhr
                    }));
                };

                env.xhr.ontimeout = function () {
                    document.body.removeAttribute('data-loading');
                    reject($.extend(Error('Network Timeout'), {
                        xhr: env.xhr
                    }));
                };

                env.xhr.send(env.method === 'GET' ? null : env.data);
            });
            // Hack: Expose xhr.abort(), by attaching xhr to the promise.
            promise.xhr = env.xhr;
            return promise;
        },

        // value: function(obj) {
        //     var hasRoot = $.type(obj) !== 'string'
        //
        //     return $.$(arguments).slice(+hasRoot).reduce(function(obj, property) {
        //         return obj && obj[property]
        //     }, hasRoot ? obj : self)
        // },

        extends: function _extends(out) {
            out = out || {};
            for (var i = 1; i < arguments.length; i++) {
                if (!arguments[i]) continue;

                for (var key in arguments[i]) {
                    if (arguments[i].hasOwnProperty(key)) out[key] = arguments[i][key];
                }
            }
            return out;
        }
    });

    $.Hooks = new $.Class({
        add: function add(name, callback, first) {
            if (typeof arguments[0] != 'string') {
                // Multiple hooks
                for (var name in arguments[0]) {
                    this.add(name, arguments[0][name], arguments[1]);
                }

                return;
            }

            ;(Array.isArray(name) ? name : [name]).forEach(function (name) {
                this[name] = this[name] || [];

                if (callback) {
                    this[name][first ? 'unshift' : 'push'](callback);
                }
            }, this);
        },

        run: function run(name, env) {
            this[name] = this[name] || [];
            this[name].forEach(function (callback) {
                callback.call(env && env.context ? env.context : env, env);
            });
        }
    });

    $.hooks = new $.Hooks();

    var _ = $.property;

    $.Element = function (subject) {
        this.subject = subject;

        // Author-defined element-related data
        this.datas = {};

        // Internal Bliss element-related data
        this.bliss = {};
    };

    $.Element.prototype = {
        // Fire a synthesized event on the element
        fire: function fire(type, properties) {
            var evt = document.createEvent('HTMLEvents');

            evt.initEvent(type, true, true);

            // Return the result of dispatching the event, so we
            // can know if `e.preventDefault` was called inside it
            return this.dispatchEvent($.extend(evt, properties));
        },

        bind: overload(function (types, options) {
            if (arguments.length > 1 && ($.type(options) === 'function' || options.handleEvent)) {
                // options is actually callback
                var callback = options;
                options = $.type(arguments[2]) === 'object' ? arguments[2] : {
                    capture: !!arguments[2] // in case it's passed as a boolean 3rd arg
                };
                options.callback = callback;
            }

            var listeners = $.listeners.get(this) || {};

            types.trim().split(/\s+/).forEach(function (type) {
                if (type.indexOf('.') > -1) {
                    type = type.split('.');
                    var className = type[1];
                    type = type[0];
                }

                listeners[type] = listeners[type] || [];

                if (listeners[type].filter(function (l) {
                    return l.callback === options.callback && l.capture == options.capture;
                }).length === 0) {
                    listeners[type].push($.extend({ className: className }, options));
                }

                $.original.addEventListener.call(this, type, options.callback, options);
            }, this);

            $.listeners.set(this, listeners);
        }, 0),

        off: overload(function (types, options) {
            if (options && ($.type(options) === 'function' || options.handleEvent)) {
                var callback = options;
                options = arguments[2];
            }

            if ($.type(options) == 'boolean') {
                options = {
                    capture: options
                };
            }

            options = options || {};
            options.callback = options.callback || callback;

            var listeners = $.listeners.get(this);(types || '').trim().split(/\s+/).forEach(function (type) {
                if (type.indexOf('.') > -1) {
                    type = type.split('.');
                    var className = type[1];
                    type = type[0];
                }

                if (type && options.callback) {
                    return $.original.removeEventListener.call(this, type, options.callback, options.capture);
                }

                if (!listeners) {
                    return;
                }

                // Mass unbinding, need to go through listeners
                for (var ltype in listeners) {
                    if (!type || ltype === type) {
                        // No forEach, because we’re mutating the array
                        for (var i = 0, l; l = listeners[ltype][i]; i++) {
                            if ((!className || className === l.className) && (!options.callback || options.callback === l.callback) && !!options.capture == !!l.capture) {
                                listeners[ltype].splice(i, 1);
                                $.original.removeEventListener.call(this, ltype, l.callback, l.capture);
                                i--;
                            }
                        }
                    }
                }
            }, this);
        }, 0),

        removeData: function removeData(name, obj) {
            if (obj) {
                obj.removeAttribute('data-' + name);
            } else {
                this.removeAttribute('data-' + name);
                return this;
            }
        }

        /*
         * Properties with custom handling in $.set()
         * Also available as functions directly on element._ and on $
         */
    };$.setProps = {
        // Set a bunch of properties on the element
        properties: function properties(val) {
            $.extend(this, val);
        },

        once: overload(function (types, callback) {
            var me = this;
            var once = function once() {
                $.off(me, types, once);

                return callback.apply(me, arguments);
            };

            $.bind(this, types, once, { once: true });
        }, 0),

        // Event delegation
        on: overload(function (type, selector, callback) {
            $.bind(this, type, function (evt) {
                var _this = evt.target.closest(selector);
                if (_this) {
                    callback.call(_this, evt);
                }
            });
        }, 0, 2),

        // Set a bunch of inline CSS styles
        style: function style(val) {
            if ($.type(val) === 'object') {
                for (var property in val) {
                    if (property in this.style) {
                        // camelCase versions
                        this.style[property] = val[property];
                    } else {
                        // This way we can set CSS Variables too and use normal property names
                        this.style.setProperty(property, val[property]);
                    }
                }
                return this;
            } else {
                var sty = getComputedStyle(this)[val];
                if (sty.indexOf('px') > 0) {
                    sty = parseFloat(sty);
                }
                return sty;
            }
        },

        // Set a bunch of attributes
        attr: function attr(o) {
            if ($.type(o) === 'object') {
                for (var attribute in o) {
                    this.setAttribute(attribute, o[attribute]);
                }
                return this;
            } else {
                if (this.getAttribute(o) !== null) {
                    return this.getAttribute(o) == '' ? true : this.getAttribute(o);
                } else {
                    return undefined;
                }
            }
        },

        // Append the element inside another element
        append: function append() {
            for (var arg in arguments) {
                if (arguments.hasOwnProperty(arg)) {
                    if ($.type(arguments[arg]) === 'string') {
                        arguments[arg] = $(arguments[arg]);
                    }

                    if (arguments[arg]) {
                        this.appendChild(arguments[arg]);
                    }
                }
            }
            return this;
        },

        // Insert the element before another element
        before: function before() {
            for (var arg in arguments) {
                if (arguments.hasOwnProperty(arg)) {
                    if ($.type(arguments[arg]) === 'string') {
                        arguments[arg] = $(arguments[arg]);
                    }

                    if (arguments[arg]) {
                        this.parentNode.insertBefore(arguments[arg], this);
                    }
                }
            }
            return this;
        },

        // Insert the element after another element
        after: function after(element) {
            if ($.type(element) === 'string') {
                element = $(element);
            }

            if (element) {
                element.parentNode.insertBefore(this, element.nextSibling);
                return this;
            }
        },

        // Insert the element before another element's contents
        prepend: function prepend(element) {
            if ($.type(element) === 'string') {
                element = $(element);
            }

            if (element) {
                this.insertBefore(element, this.firstChild);
                return this;
            }
        },

        addClass: function addClass(className) {
            if (className) {
                var classList = className.split(' ');
                for (var cl in classList) {
                    if (classList.hasOwnProperty(cl)) {
                        this.classList.add(classList[cl]);
                    }
                }
                return this;
            }
        },

        removeClass: function removeClass(className) {
            if (className) {
                var classList = className.split(' ');
                for (var cl in classList) {
                    if (classList.hasOwnProperty(cl)) {
                        this.classList.remove(classList[cl]);
                    }
                }
                return this;
            }
        },

        toggleClass: function toggleClass(className) {
            this._.hasClass(className) ? this._.removeClass(className) : this._.addClass(className);
        },

        hasClass: function hasClass(className) {
            return this.classList.contains(className);
        },

        data: function data(name, options) {
            var attrs = this.attributes;
            var _temp = this['tempData'] || {};
            var _data = {},
                i = 0,
                j = attrs.length;

            for (i, j; i < j; i++) {
                if (attrs[i].name.substring(0, 5) == 'data-') {
                    try {
                        _data[attrs[i].name.substring(5)] = JSON.parse(attrs[i].value);
                    } catch (e) {
                        _data[attrs[i].name.substring(5)] = attrs[i].value;
                    }
                }
            }

            var _new = $.extends({}, _data, _temp);

            if (options) {
                _new[name] = options;
                this['tempData'] = _new;
                return this;
            }

            if (name) {
                return _new[name] && Object.keys(_new).length > 0 ? _new[name] : undefined;
            } else {
                return _new;
            }
        },

        find: function find(expr) {
            if (typeof expr == 'string') {
                var qs = this.querySelectorAll(expr);
                if (qs.length === 0) {
                    return undefined;
                } else {
                    return qs.length > 1 ? Array.prototype.slice.call(qs) : qs[0];
                }
            }
        },

        prev: function prev(expr) {
            if (typeof expr == 'string') {
                return getEls(this, expr, 'prev');
            } else {
                return this.previousElementSibling;
            }
        },

        next: function next(expr) {
            if (typeof expr == 'string') {
                return getEls(this, expr, 'next');
            } else {
                return this.nextElementSibling;
            }
        },

        parent: function parent(expr) {
            if (typeof expr == 'string') {
                return getEls(this, expr, 'parent');
            } else {
                return this.parentNode;
            }
        },

        children: function children(expr) {
            if (typeof expr == 'string') {
                var ary = [],
                    cdr = Array.prototype.slice.call(this.children);

                cdr.forEach(function (el, i) {
                    var matchesSelector = el.matches || el.webkitMatchesSelector || el.mozMatchesSelector || el.msMatchesSelector;
                    if (matchesSelector.call(el, expr)) {
                        ary.push(cdr[i]);
                    }
                });

                return ary.length > 1 ? ary : ary[0];
            } else {
                return Array.prototype.slice.call(this.children);
            }
        },

        index: function index() {
            var arrNodes = Array.prototype.slice.call(this.parentNode.children);
            return arrNodes.indexOf(this);
        },

        remove: function remove() {
            if (this && this.parentNode) {
                this.parentNode.removeChild(this);
            }
        }
    };

    $.Array = function (subject) {
        this.subject = subject;
    };

    // Extends Bliss with more methods
    $.add = overload(function (method, callback, on, noOverwrite) {
        on = $.extend({
            $: true,
            element: true,
            array: true
        }, on);

        if ($.type(callback) == 'function') {
            if (on.element && (!(method in $.Element.prototype) || !noOverwrite)) {
                $.Element.prototype[method] = function () {
                    return this.subject && $.defined(callback.apply(this.subject, arguments), this.subject);
                };
            }

            if (on.array && (!(method in $.Array.prototype) || !noOverwrite)) {
                $.Array.prototype[method] = function () {
                    var args = arguments;
                    return this.subject.map(function (element) {
                        return element && $.defined(callback.apply(element, args), element);
                    });
                };
            }

            if (on.$) {
                $.fn[method] = $[method] = callback;

                if (on.array || on.element) {
                    $[method] = function () {
                        var args = [].slice.apply(arguments);
                        var subject = args.shift();
                        var Type = on.array && Array.isArray(subject) ? 'Array' : 'Element';

                        return $[Type].prototype[method].apply({
                            subject: subject
                        }, args);
                    };
                }
            }
        }
    }, 0);

    $.add($.Array.prototype, {
        element: false
    });
    $.add($.Element.prototype);
    $.add($.setProps);
    $.add($.classProps, {
        element: false,
        array: false
    });

    // Add native methods on $ and _
    var dummy = document.createElement('_');
    $.add($.extend({}, HTMLElement.prototype, function (method) {
        return $.type(dummy[method]) === 'function';
    }), null, true);
})();(function ($) {
    'use strict';

    if (!Bliss || Bliss.shy) {
        return;
    }

    var _ = Bliss.property;

    // Methods requiring Bliss Full
    $.add({
        // Clone elements, with events and data
        clone: function clone() {
            var clone = this.cloneNode(true);
            var descendants = $.$('*', clone).concat(clone);

            $.$('*', this).concat(this).forEach(function (element, i, arr) {
                $.events(descendants[i], element);
                descendants[i]._.data = $.extend({}, element._.data);
            });

            return clone;
        }
    }, {
        array: false
    });

    // Define the _ property on arrays and elements

    Object.defineProperty(Node.prototype, _, {
        // Written for IE compatability (see #49)
        get: function getter() {
            Object.defineProperty(Node.prototype, _, {
                get: undefined
            });
            Object.defineProperty(this, _, {
                value: new $.Element(this)
            });
            Object.defineProperty(Node.prototype, _, {
                get: getter
            });
            return this[_];
        },
        configurable: true
    });

    Object.defineProperty(Array.prototype, _, {
        get: function get() {
            Object.defineProperty(this, _, {
                value: new $.Array(this)
            });

            return this[_];
        },
        configurable: true
    });

    // Hijack addEventListener and removeEventListener to store callbacks

    if (self.EventTarget && 'addEventListener' in EventTarget.prototype) {
        EventTarget.prototype.addEventListener = function (type, callback, options) {
            return $.bind(this, type, callback, options);
        };

        EventTarget.prototype.removeEventListener = function (type, callback, options) {
            return $.off(this, type, callback, options);
        };
    }

    // Set $ and $$ convenience methods, if not taken
    self.$ = self.$ || $;
    self.$$ = self.$$ || $.$;
})(Bliss);
'use strict';

var Util = function ($, $$) {
    function toType(obj) {
        return {}.toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
    }

    function isElement(obj) {
        return (obj[0] || obj).nodeType;
    }

    // Public Util Api
    var Util = {
        getEvent: function getEvent(e1) {
            var isMobile = window.navigator.userAgent.match(/Mobile/) && window.navigator.userAgent.match(/Mobile/)[0] === 'Mobile';
            return isMobile ? 'touchstart' : e1;
        },
        typeCheckConfig: function typeCheckConfig(componentName, config, configTypes) {
            for (var property in configTypes) {
                if (configTypes.hasOwnProperty(property)) {
                    var expectedTypes = configTypes[property];
                    var value = config[property];
                    var valueType = value && isElement(value) ? 'element' : toType(value);

                    if (!new RegExp(expectedTypes).test(valueType)) {
                        throw new Error(componentName.toUpperCase() + ': ' + ('Option "' + property + '" provided type "' + valueType + '" ') + ('but expected type "' + expectedTypes + '".'));
                    }
                }
            }
        }
    };

    return Util;
}(Bliss, Bliss.$);
"use strict";

var Area = {
  "86": {
    "110000": "北京市",
    "120000": "天津市",
    "130000": "河北省",
    "140000": "山西省",
    "150000": "内蒙古自治区",
    "210000": "辽宁省",
    "220000": "吉林省",
    "230000": "黑龙江省",
    "310000": "上海市",
    "320000": "江苏省",
    "330000": "浙江省",
    "340000": "安徽省",
    "350000": "福建省",
    "360000": "江西省",
    "370000": "山东省",
    "410000": "河南省",
    "420000": "湖北省",
    "430000": "湖南省",
    "440000": "广东省",
    "450000": "广西壮族自治区",
    "460000": "海南省",
    "500000": "重庆市",
    "510000": "四川省",
    "520000": "贵州省",
    "530000": "云南省",
    "540000": "西藏自治区",
    "610000": "陕西省",
    "620000": "甘肃省",
    "630000": "青海省",
    "640000": "宁夏回族自治区",
    "650000": "新疆维吾尔自治区",
    "710000": "台湾省",
    "810000": "香港特别行政区",
    "820000": "澳门特别行政区"
  },
  "110000": {
    "110100": "市辖区"
  },
  "110100": {
    "110101": "东城区",
    "110102": "西城区",
    "110105": "朝阳区",
    "110106": "丰台区",
    "110107": "石景山区",
    "110108": "海淀区",
    "110109": "门头沟区",
    "110111": "房山区",
    "110112": "通州区",
    "110113": "顺义区",
    "110114": "昌平区",
    "110115": "大兴区",
    "110116": "怀柔区",
    "110117": "平谷区",
    "110118": "密云区",
    "110119": "延庆区"
  },
  "120000": {
    "120100": "市辖区"
  },
  "120100": {
    "120101": "和平区",
    "120102": "河东区",
    "120103": "河西区",
    "120104": "南开区",
    "120105": "河北区",
    "120106": "红桥区",
    "120110": "东丽区",
    "120111": "西青区",
    "120112": "津南区",
    "120113": "北辰区",
    "120114": "武清区",
    "120115": "宝坻区",
    "120116": "滨海新区",
    "120117": "宁河区",
    "120118": "静海区",
    "120119": "蓟州区"
  },
  "130000": {
    "130100": "石家庄市",
    "130200": "唐山市",
    "130300": "秦皇岛市",
    "130400": "邯郸市",
    "130500": "邢台市",
    "130600": "保定市",
    "130700": "张家口市",
    "130800": "承德市",
    "130900": "沧州市",
    "131000": "廊坊市",
    "131100": "衡水市",
    "139001": "定州市",
    "139002": "辛集市"
  },
  "130100": {
    "130102": "长安区",
    "130104": "桥西区",
    "130105": "新华区",
    "130107": "井陉矿区",
    "130108": "裕华区",
    "130109": "藁城区",
    "130110": "鹿泉区",
    "130111": "栾城区",
    "130121": "井陉县",
    "130123": "正定县",
    "130125": "行唐县",
    "130126": "灵寿县",
    "130127": "高邑县",
    "130128": "深泽县",
    "130129": "赞皇县",
    "130130": "无极县",
    "130131": "平山县",
    "130132": "元氏县",
    "130133": "赵县",
    "130183": "晋州市",
    "130184": "新乐市"
  },
  "130200": {
    "130202": "路南区",
    "130203": "路北区",
    "130204": "古冶区",
    "130205": "开平区",
    "130207": "丰南区",
    "130208": "丰润区",
    "130209": "曹妃甸区",
    "130223": "滦县",
    "130224": "滦南县",
    "130225": "乐亭县",
    "130227": "迁西县",
    "130229": "玉田县",
    "130281": "遵化市",
    "130283": "迁安市"
  },
  "130300": {
    "130302": "海港区",
    "130303": "山海关区",
    "130304": "北戴河区",
    "130306": "抚宁区",
    "130321": "青龙满族自治县",
    "130322": "昌黎县",
    "130324": "卢龙县"
  },
  "130400": {
    "130402": "邯山区",
    "130403": "丛台区",
    "130404": "复兴区",
    "130406": "峰峰矿区",
    "130421": "邯郸县",
    "130423": "临漳县",
    "130424": "成安县",
    "130425": "大名县",
    "130426": "涉县",
    "130427": "磁县",
    "130428": "肥乡县",
    "130429": "永年县",
    "130430": "邱县",
    "130431": "鸡泽县",
    "130432": "广平县",
    "130433": "馆陶县",
    "130434": "魏县",
    "130435": "曲周县",
    "130481": "武安市"
  },
  "130500": {
    "130502": "桥东区",
    "130503": "桥西区",
    "130521": "邢台县",
    "130522": "临城县",
    "130523": "内丘县",
    "130524": "柏乡县",
    "130525": "隆尧县",
    "130526": "任县",
    "130527": "南和县",
    "130528": "宁晋县",
    "130529": "巨鹿县",
    "130530": "新河县",
    "130531": "广宗县",
    "130532": "平乡县",
    "130533": "威县",
    "130534": "清河县",
    "130535": "临西县",
    "130581": "南宫市",
    "130582": "沙河市"
  },
  "130600": {
    "130602": "竞秀区",
    "130606": "莲池区",
    "130607": "满城区",
    "130608": "清苑区",
    "130609": "徐水区",
    "130623": "涞水县",
    "130624": "阜平县",
    "130626": "定兴县",
    "130627": "唐县",
    "130628": "高阳县",
    "130629": "容城县",
    "130630": "涞源县",
    "130631": "望都县",
    "130632": "安新县",
    "130633": "易县",
    "130634": "曲阳县",
    "130635": "蠡县",
    "130636": "顺平县",
    "130637": "博野县",
    "130638": "雄县",
    "130681": "涿州市",
    "130683": "安国市",
    "130684": "高碑店市"
  },
  "130700": {
    "130702": "桥东区",
    "130703": "桥西区",
    "130705": "宣化区",
    "130706": "下花园区",
    "130708": "万全区",
    "130709": "崇礼区",
    "130722": "张北县",
    "130723": "康保县",
    "130724": "沽源县",
    "130725": "尚义县",
    "130726": "蔚县",
    "130727": "阳原县",
    "130728": "怀安县",
    "130730": "怀来县",
    "130731": "涿鹿县",
    "130732": "赤城县"
  },
  "130800": {
    "130802": "双桥区",
    "130803": "双滦区",
    "130804": "鹰手营子矿区",
    "130821": "承德县",
    "130822": "兴隆县",
    "130823": "平泉县",
    "130824": "滦平县",
    "130825": "隆化县",
    "130826": "丰宁满族自治县",
    "130827": "宽城满族自治县",
    "130828": "围场满族蒙古族自治县"
  },
  "130900": {
    "130902": "新华区",
    "130903": "运河区",
    "130921": "沧县",
    "130922": "青县",
    "130923": "东光县",
    "130924": "海兴县",
    "130925": "盐山县",
    "130926": "肃宁县",
    "130927": "南皮县",
    "130928": "吴桥县",
    "130929": "献县",
    "130930": "孟村回族自治县",
    "130981": "泊头市",
    "130982": "任丘市",
    "130983": "黄骅市",
    "130984": "河间市"
  },
  "131000": {
    "131002": "安次区",
    "131003": "广阳区",
    "131022": "固安县",
    "131023": "永清县",
    "131024": "香河县",
    "131025": "大城县",
    "131026": "文安县",
    "131028": "大厂回族自治县",
    "131081": "霸州市",
    "131082": "三河市"
  },
  "131100": {
    "131102": "桃城区",
    "131103": "冀州区",
    "131121": "枣强县",
    "131122": "武邑县",
    "131123": "武强县",
    "131124": "饶阳县",
    "131125": "安平县",
    "131126": "故城县",
    "131127": "景县",
    "131128": "阜城县",
    "131182": "深州市"
  },
  "140000": {
    "140100": "太原市",
    "140200": "大同市",
    "140300": "阳泉市",
    "140400": "长治市",
    "140500": "晋城市",
    "140600": "朔州市",
    "140700": "晋中市",
    "140800": "运城市",
    "140900": "忻州市",
    "141000": "临汾市",
    "141100": "吕梁市"
  },
  "140100": {
    "140105": "小店区",
    "140106": "迎泽区",
    "140107": "杏花岭区",
    "140108": "尖草坪区",
    "140109": "万柏林区",
    "140110": "晋源区",
    "140121": "清徐县",
    "140122": "阳曲县",
    "140123": "娄烦县",
    "140181": "古交市"
  },
  "140200": {
    "140202": "城区",
    "140203": "矿区",
    "140211": "南郊区",
    "140212": "新荣区",
    "140221": "阳高县",
    "140222": "天镇县",
    "140223": "广灵县",
    "140224": "灵丘县",
    "140225": "浑源县",
    "140226": "左云县",
    "140227": "大同县"
  },
  "140300": {
    "140302": "城区",
    "140303": "矿区",
    "140311": "郊区",
    "140321": "平定县",
    "140322": "盂县"
  },
  "140400": {
    "140402": "城区",
    "140411": "郊区",
    "140421": "长治县",
    "140423": "襄垣县",
    "140424": "屯留县",
    "140425": "平顺县",
    "140426": "黎城县",
    "140427": "壶关县",
    "140428": "长子县",
    "140429": "武乡县",
    "140430": "沁县",
    "140431": "沁源县",
    "140481": "潞城市"
  },
  "140500": {
    "140502": "城区",
    "140521": "沁水县",
    "140522": "阳城县",
    "140524": "陵川县",
    "140525": "泽州县",
    "140581": "高平市"
  },
  "140600": {
    "140602": "朔城区",
    "140603": "平鲁区",
    "140621": "山阴县",
    "140622": "应县",
    "140623": "右玉县",
    "140624": "怀仁县"
  },
  "140700": {
    "140702": "榆次区",
    "140721": "榆社县",
    "140722": "左权县",
    "140723": "和顺县",
    "140724": "昔阳县",
    "140725": "寿阳县",
    "140726": "太谷县",
    "140727": "祁县",
    "140728": "平遥县",
    "140729": "灵石县",
    "140781": "介休市"
  },
  "140800": {
    "140802": "盐湖区",
    "140821": "临猗县",
    "140822": "万荣县",
    "140823": "闻喜县",
    "140824": "稷山县",
    "140825": "新绛县",
    "140826": "绛县",
    "140827": "垣曲县",
    "140828": "夏县",
    "140829": "平陆县",
    "140830": "芮城县",
    "140881": "永济市",
    "140882": "河津市"
  },
  "140900": {
    "140902": "忻府区",
    "140921": "定襄县",
    "140922": "五台县",
    "140923": "代县",
    "140924": "繁峙县",
    "140925": "宁武县",
    "140926": "静乐县",
    "140927": "神池县",
    "140928": "五寨县",
    "140929": "岢岚县",
    "140930": "河曲县",
    "140931": "保德县",
    "140932": "偏关县",
    "140981": "原平市"
  },
  "141000": {
    "141002": "尧都区",
    "141021": "曲沃县",
    "141022": "翼城县",
    "141023": "襄汾县",
    "141024": "洪洞县",
    "141025": "古县",
    "141026": "安泽县",
    "141027": "浮山县",
    "141028": "吉县",
    "141029": "乡宁县",
    "141030": "大宁县",
    "141031": "隰县",
    "141032": "永和县",
    "141033": "蒲县",
    "141034": "汾西县",
    "141081": "侯马市",
    "141082": "霍州市"
  },
  "141100": {
    "141102": "离石区",
    "141121": "文水县",
    "141122": "交城县",
    "141123": "兴县",
    "141124": "临县",
    "141125": "柳林县",
    "141126": "石楼县",
    "141127": "岚县",
    "141128": "方山县",
    "141129": "中阳县",
    "141130": "交口县",
    "141181": "孝义市",
    "141182": "汾阳市"
  },
  "150000": {
    "150100": "呼和浩特市",
    "150200": "包头市",
    "150300": "乌海市",
    "150400": "赤峰市",
    "150500": "通辽市",
    "150600": "鄂尔多斯市",
    "150700": "呼伦贝尔市",
    "150800": "巴彦淖尔市",
    "150900": "乌兰察布市",
    "152200": "兴安盟",
    "152500": "锡林郭勒盟",
    "152900": "阿拉善盟"
  },
  "150100": {
    "150102": "新城区",
    "150103": "回民区",
    "150104": "玉泉区",
    "150105": "赛罕区",
    "150121": "土默特左旗",
    "150122": "托克托县",
    "150123": "和林格尔县",
    "150124": "清水河县",
    "150125": "武川县"
  },
  "150200": {
    "150202": "东河区",
    "150203": "昆都仑区",
    "150204": "青山区",
    "150205": "石拐区",
    "150206": "白云鄂博矿区",
    "150207": "九原区",
    "150221": "土默特右旗",
    "150222": "固阳县",
    "150223": "达尔罕茂明安联合旗"
  },
  "150300": {
    "150302": "海勃湾区",
    "150303": "海南区",
    "150304": "乌达区"
  },
  "150400": {
    "150402": "红山区",
    "150403": "元宝山区",
    "150404": "松山区",
    "150421": "阿鲁科尔沁旗",
    "150422": "巴林左旗",
    "150423": "巴林右旗",
    "150424": "林西县",
    "150425": "克什克腾旗",
    "150426": "翁牛特旗",
    "150428": "喀喇沁旗",
    "150429": "宁城县",
    "150430": "敖汉旗"
  },
  "150500": {
    "150502": "科尔沁区",
    "150521": "科尔沁左翼中旗",
    "150522": "科尔沁左翼后旗",
    "150523": "开鲁县",
    "150524": "库伦旗",
    "150525": "奈曼旗",
    "150526": "扎鲁特旗",
    "150581": "霍林郭勒市"
  },
  "150600": {
    "150602": "东胜区",
    "150603": "康巴什区",
    "150621": "达拉特旗",
    "150622": "准格尔旗",
    "150623": "鄂托克前旗",
    "150624": "鄂托克旗",
    "150625": "杭锦旗",
    "150626": "乌审旗",
    "150627": "伊金霍洛旗"
  },
  "150700": {
    "150702": "海拉尔区",
    "150703": "扎赉诺尔区",
    "150721": "阿荣旗",
    "150722": "莫力达瓦达斡尔族自治旗",
    "150723": "鄂伦春自治旗",
    "150724": "鄂温克族自治旗",
    "150725": "陈巴尔虎旗",
    "150726": "新巴尔虎左旗",
    "150727": "新巴尔虎右旗",
    "150781": "满洲里市",
    "150782": "牙克石市",
    "150783": "扎兰屯市",
    "150784": "额尔古纳市",
    "150785": "根河市"
  },
  "150800": {
    "150802": "临河区",
    "150821": "五原县",
    "150822": "磴口县",
    "150823": "乌拉特前旗",
    "150824": "乌拉特中旗",
    "150825": "乌拉特后旗",
    "150826": "杭锦后旗"
  },
  "150900": {
    "150902": "集宁区",
    "150921": "卓资县",
    "150922": "化德县",
    "150923": "商都县",
    "150924": "兴和县",
    "150925": "凉城县",
    "150926": "察哈尔右翼前旗",
    "150927": "察哈尔右翼中旗",
    "150928": "察哈尔右翼后旗",
    "150929": "四子王旗",
    "150981": "丰镇市"
  },
  "152200": {
    "152201": "乌兰浩特市",
    "152202": "阿尔山市",
    "152221": "科尔沁右翼前旗",
    "152222": "科尔沁右翼中旗",
    "152223": "扎赉特旗",
    "152224": "突泉县"
  },
  "152500": {
    "152501": "二连浩特市",
    "152502": "锡林浩特市",
    "152522": "阿巴嘎旗",
    "152523": "苏尼特左旗",
    "152524": "苏尼特右旗",
    "152525": "东乌珠穆沁旗",
    "152526": "西乌珠穆沁旗",
    "152527": "太仆寺旗",
    "152528": "镶黄旗",
    "152529": "正镶白旗",
    "152530": "正蓝旗",
    "152531": "多伦县"
  },
  "152900": {
    "152921": "阿拉善左旗",
    "152922": "阿拉善右旗",
    "152923": "额济纳旗"
  },
  "210000": {
    "210100": "沈阳市",
    "210200": "大连市",
    "210300": "鞍山市",
    "210400": "抚顺市",
    "210500": "本溪市",
    "210600": "丹东市",
    "210700": "锦州市",
    "210800": "营口市",
    "210900": "阜新市",
    "211000": "辽阳市",
    "211100": "盘锦市",
    "211200": "铁岭市",
    "211300": "朝阳市",
    "211400": "葫芦岛市"
  },
  "210100": {
    "210102": "和平区",
    "210103": "沈河区",
    "210104": "大东区",
    "210105": "皇姑区",
    "210106": "铁西区",
    "210111": "苏家屯区",
    "210112": "浑南区",
    "210113": "沈北新区",
    "210114": "于洪区",
    "210115": "辽中区",
    "210123": "康平县",
    "210124": "法库县",
    "210181": "新民市"
  },
  "210200": {
    "210202": "中山区",
    "210203": "西岗区",
    "210204": "沙河口区",
    "210211": "甘井子区",
    "210212": "旅顺口区",
    "210213": "金州区",
    "210214": "普兰店区",
    "210224": "长海县",
    "210281": "瓦房店市",
    "210283": "庄河市"
  },
  "210300": {
    "210302": "铁东区",
    "210303": "铁西区",
    "210304": "立山区",
    "210311": "千山区",
    "210321": "台安县",
    "210323": "岫岩满族自治县",
    "210381": "海城市"
  },
  "210400": {
    "210402": "新抚区",
    "210403": "东洲区",
    "210404": "望花区",
    "210411": "顺城区",
    "210421": "抚顺县",
    "210422": "新宾满族自治县",
    "210423": "清原满族自治县"
  },
  "210500": {
    "210502": "平山区",
    "210503": "溪湖区",
    "210504": "明山区",
    "210505": "南芬区",
    "210521": "本溪满族自治县",
    "210522": "桓仁满族自治县"
  },
  "210600": {
    "210602": "元宝区",
    "210603": "振兴区",
    "210604": "振安区",
    "210624": "宽甸满族自治县",
    "210681": "东港市",
    "210682": "凤城市"
  },
  "210700": {
    "210702": "古塔区",
    "210703": "凌河区",
    "210711": "太和区",
    "210726": "黑山县",
    "210727": "义县",
    "210781": "凌海市",
    "210782": "北镇市"
  },
  "210800": {
    "210802": "站前区",
    "210803": "西市区",
    "210804": "鲅鱼圈区",
    "210811": "老边区",
    "210881": "盖州市",
    "210882": "大石桥市"
  },
  "210900": {
    "210902": "海州区",
    "210903": "新邱区",
    "210904": "太平区",
    "210905": "清河门区",
    "210911": "细河区",
    "210921": "阜新蒙古族自治县",
    "210922": "彰武县"
  },
  "211000": {
    "211002": "白塔区",
    "211003": "文圣区",
    "211004": "宏伟区",
    "211005": "弓长岭区",
    "211011": "太子河区",
    "211021": "辽阳县",
    "211081": "灯塔市"
  },
  "211100": {
    "211102": "双台子区",
    "211103": "兴隆台区",
    "211104": "大洼区",
    "211122": "盘山县"
  },
  "211200": {
    "211202": "银州区",
    "211204": "清河区",
    "211221": "铁岭县",
    "211223": "西丰县",
    "211224": "昌图县",
    "211281": "调兵山市",
    "211282": "开原市"
  },
  "211300": {
    "211302": "双塔区",
    "211303": "龙城区",
    "211321": "朝阳县",
    "211322": "建平县",
    "211324": "喀喇沁左翼蒙古族自治县",
    "211381": "北票市",
    "211382": "凌源市"
  },
  "211400": {
    "211402": "连山区",
    "211403": "龙港区",
    "211404": "南票区",
    "211421": "绥中县",
    "211422": "建昌县",
    "211481": "兴城市"
  },
  "220000": {
    "220100": "长春市",
    "220200": "吉林市",
    "220300": "四平市",
    "220400": "辽源市",
    "220500": "通化市",
    "220600": "白山市",
    "220700": "松原市",
    "220800": "白城市",
    "222400": "延边朝鲜族自治州"
  },
  "220100": {
    "220102": "南关区",
    "220103": "宽城区",
    "220104": "朝阳区",
    "220105": "二道区",
    "220106": "绿园区",
    "220112": "双阳区",
    "220113": "九台区",
    "220122": "农安县",
    "220182": "榆树市",
    "220183": "德惠市"
  },
  "220200": {
    "220202": "昌邑区",
    "220203": "龙潭区",
    "220204": "船营区",
    "220211": "丰满区",
    "220221": "永吉县",
    "220281": "蛟河市",
    "220282": "桦甸市",
    "220283": "舒兰市",
    "220284": "磐石市"
  },
  "220300": {
    "220302": "铁西区",
    "220303": "铁东区",
    "220322": "梨树县",
    "220323": "伊通满族自治县",
    "220381": "公主岭市",
    "220382": "双辽市"
  },
  "220400": {
    "220402": "龙山区",
    "220403": "西安区",
    "220421": "东丰县",
    "220422": "东辽县"
  },
  "220500": {
    "220502": "东昌区",
    "220503": "二道江区",
    "220521": "通化县",
    "220523": "辉南县",
    "220524": "柳河县",
    "220581": "梅河口市",
    "220582": "集安市"
  },
  "220600": {
    "220602": "浑江区",
    "220605": "江源区",
    "220621": "抚松县",
    "220622": "靖宇县",
    "220623": "长白朝鲜族自治县",
    "220681": "临江市"
  },
  "220700": {
    "220702": "宁江区",
    "220721": "前郭尔罗斯蒙古族自治县",
    "220722": "长岭县",
    "220723": "乾安县",
    "220781": "扶余市"
  },
  "220800": {
    "220802": "洮北区",
    "220821": "镇赉县",
    "220822": "通榆县",
    "220881": "洮南市",
    "220882": "大安市"
  },
  "222400": {
    "222401": "延吉市",
    "222402": "图们市",
    "222403": "敦化市",
    "222404": "珲春市",
    "222405": "龙井市",
    "222406": "和龙市",
    "222424": "汪清县",
    "222426": "安图县"
  },
  "230000": {
    "230100": "哈尔滨市",
    "230200": "齐齐哈尔市",
    "230300": "鸡西市",
    "230400": "鹤岗市",
    "230500": "双鸭山市",
    "230600": "大庆市",
    "230700": "伊春市",
    "230800": "佳木斯市",
    "230900": "七台河市",
    "231000": "牡丹江市",
    "231100": "黑河市",
    "231200": "绥化市",
    "232700": "大兴安岭地区"
  },
  "230100": {
    "230102": "道里区",
    "230103": "南岗区",
    "230104": "道外区",
    "230108": "平房区",
    "230109": "松北区",
    "230110": "香坊区",
    "230111": "呼兰区",
    "230112": "阿城区",
    "230113": "双城区",
    "230123": "依兰县",
    "230124": "方正县",
    "230125": "宾县",
    "230126": "巴彦县",
    "230127": "木兰县",
    "230128": "通河县",
    "230129": "延寿县",
    "230183": "尚志市",
    "230184": "五常市"
  },
  "230200": {
    "230202": "龙沙区",
    "230203": "建华区",
    "230204": "铁锋区",
    "230205": "昂昂溪区",
    "230206": "富拉尔基区",
    "230207": "碾子山区",
    "230208": "梅里斯达斡尔族区",
    "230221": "龙江县",
    "230223": "依安县",
    "230224": "泰来县",
    "230225": "甘南县",
    "230227": "富裕县",
    "230229": "克山县",
    "230230": "克东县",
    "230231": "拜泉县",
    "230281": "讷河市"
  },
  "230300": {
    "230302": "鸡冠区",
    "230303": "恒山区",
    "230304": "滴道区",
    "230305": "梨树区",
    "230306": "城子河区",
    "230307": "麻山区",
    "230321": "鸡东县",
    "230381": "虎林市",
    "230382": "密山市"
  },
  "230400": {
    "230402": "向阳区",
    "230403": "工农区",
    "230404": "南山区",
    "230405": "兴安区",
    "230406": "东山区",
    "230407": "兴山区",
    "230421": "萝北县",
    "230422": "绥滨县"
  },
  "230500": {
    "230502": "尖山区",
    "230503": "岭东区",
    "230505": "四方台区",
    "230506": "宝山区",
    "230521": "集贤县",
    "230522": "友谊县",
    "230523": "宝清县",
    "230524": "饶河县"
  },
  "230600": {
    "230602": "萨尔图区",
    "230603": "龙凤区",
    "230604": "让胡路区",
    "230605": "红岗区",
    "230606": "大同区",
    "230621": "肇州县",
    "230622": "肇源县",
    "230623": "林甸县",
    "230624": "杜尔伯特蒙古族自治县"
  },
  "230700": {
    "230702": "伊春区",
    "230703": "南岔区",
    "230704": "友好区",
    "230705": "西林区",
    "230706": "翠峦区",
    "230707": "新青区",
    "230708": "美溪区",
    "230709": "金山屯区",
    "230710": "五营区",
    "230711": "乌马河区",
    "230712": "汤旺河区",
    "230713": "带岭区",
    "230714": "乌伊岭区",
    "230715": "红星区",
    "230716": "上甘岭区",
    "230722": "嘉荫县",
    "230781": "铁力市"
  },
  "230800": {
    "230803": "向阳区",
    "230804": "前进区",
    "230805": "东风区",
    "230811": "郊区",
    "230822": "桦南县",
    "230826": "桦川县",
    "230828": "汤原县",
    "230881": "同江市",
    "230882": "富锦市",
    "230883": "抚远市"
  },
  "230900": {
    "230902": "新兴区",
    "230903": "桃山区",
    "230904": "茄子河区",
    "230921": "勃利县"
  },
  "231000": {
    "231002": "东安区",
    "231003": "阳明区",
    "231004": "爱民区",
    "231005": "西安区",
    "231025": "林口县",
    "231081": "绥芬河市",
    "231083": "海林市",
    "231084": "宁安市",
    "231085": "穆棱市",
    "231086": "东宁市"
  },
  "231100": {
    "231102": "爱辉区",
    "231121": "嫩江县",
    "231123": "逊克县",
    "231124": "孙吴县",
    "231181": "北安市",
    "231182": "五大连池市"
  },
  "231200": {
    "231202": "北林区",
    "231221": "望奎县",
    "231222": "兰西县",
    "231223": "青冈县",
    "231224": "庆安县",
    "231225": "明水县",
    "231226": "绥棱县",
    "231281": "安达市",
    "231282": "肇东市",
    "231283": "海伦市"
  },
  "232700": {
    "232721": "呼玛县",
    "232722": "塔河县",
    "232723": "漠河县"
  },
  "310000": {
    "310100": "市辖区"
  },
  "310100": {
    "310101": "黄浦区",
    "310104": "徐汇区",
    "310105": "长宁区",
    "310106": "静安区",
    "310107": "普陀区",
    "310109": "虹口区",
    "310110": "杨浦区",
    "310112": "闵行区",
    "310113": "宝山区",
    "310114": "嘉定区",
    "310115": "浦东新区",
    "310116": "金山区",
    "310117": "松江区",
    "310118": "青浦区",
    "310120": "奉贤区",
    "310151": "崇明区"
  },
  "320000": {
    "320100": "南京市",
    "320200": "无锡市",
    "320300": "徐州市",
    "320400": "常州市",
    "320500": "苏州市",
    "320600": "南通市",
    "320700": "连云港市",
    "320800": "淮安市",
    "320900": "盐城市",
    "321000": "扬州市",
    "321100": "镇江市",
    "321200": "泰州市",
    "321300": "宿迁市"
  },
  "320100": {
    "320102": "玄武区",
    "320104": "秦淮区",
    "320105": "建邺区",
    "320106": "鼓楼区",
    "320111": "浦口区",
    "320113": "栖霞区",
    "320114": "雨花台区",
    "320115": "江宁区",
    "320116": "六合区",
    "320117": "溧水区",
    "320118": "高淳区"
  },
  "320200": {
    "320205": "锡山区",
    "320206": "惠山区",
    "320211": "滨湖区",
    "320213": "梁溪区",
    "320214": "新吴区",
    "320281": "江阴市",
    "320282": "宜兴市"
  },
  "320300": {
    "320302": "鼓楼区",
    "320303": "云龙区",
    "320305": "贾汪区",
    "320311": "泉山区",
    "320312": "铜山区",
    "320321": "丰县",
    "320322": "沛县",
    "320324": "睢宁县",
    "320381": "新沂市",
    "320382": "邳州市"
  },
  "320400": {
    "320402": "天宁区",
    "320404": "钟楼区",
    "320411": "新北区",
    "320412": "武进区",
    "320413": "金坛区",
    "320481": "溧阳市"
  },
  "320500": {
    "320505": "虎丘区",
    "320506": "吴中区",
    "320507": "相城区",
    "320508": "姑苏区",
    "320509": "吴江区",
    "320581": "常熟市",
    "320582": "张家港市",
    "320583": "昆山市",
    "320585": "太仓市"
  },
  "320600": {
    "320602": "崇川区",
    "320611": "港闸区",
    "320612": "通州区",
    "320621": "海安县",
    "320623": "如东县",
    "320681": "启东市",
    "320682": "如皋市",
    "320684": "海门市"
  },
  "320700": {
    "320703": "连云区",
    "320706": "海州区",
    "320707": "赣榆区",
    "320722": "东海县",
    "320723": "灌云县",
    "320724": "灌南县"
  },
  "320800": {
    "320803": "淮安区",
    "320804": "淮阴区",
    "320812": "清江浦区",
    "320813": "洪泽区",
    "320826": "涟水县",
    "320830": "盱眙县",
    "320831": "金湖县"
  },
  "320900": {
    "320902": "亭湖区",
    "320903": "盐都区",
    "320904": "大丰区",
    "320921": "响水县",
    "320922": "滨海县",
    "320923": "阜宁县",
    "320924": "射阳县",
    "320925": "建湖县",
    "320981": "东台市"
  },
  "321000": {
    "321002": "广陵区",
    "321003": "邗江区",
    "321012": "江都区",
    "321023": "宝应县",
    "321081": "仪征市",
    "321084": "高邮市"
  },
  "321100": {
    "321102": "京口区",
    "321111": "润州区",
    "321112": "丹徒区",
    "321181": "丹阳市",
    "321182": "扬中市",
    "321183": "句容市"
  },
  "321200": {
    "321202": "海陵区",
    "321203": "高港区",
    "321204": "姜堰区",
    "321281": "兴化市",
    "321282": "靖江市",
    "321283": "泰兴市"
  },
  "321300": {
    "321302": "宿城区",
    "321311": "宿豫区",
    "321322": "沭阳县",
    "321323": "泗阳县",
    "321324": "泗洪县"
  },
  "330000": {
    "330100": "杭州市",
    "330200": "宁波市",
    "330300": "温州市",
    "330400": "嘉兴市",
    "330500": "湖州市",
    "330600": "绍兴市",
    "330700": "金华市",
    "330800": "衢州市",
    "330900": "舟山市",
    "331000": "台州市",
    "331100": "丽水市"
  },
  "330100": {
    "330102": "上城区",
    "330103": "下城区",
    "330104": "江干区",
    "330105": "拱墅区",
    "330106": "西湖区",
    "330108": "滨江区",
    "330109": "萧山区",
    "330110": "余杭区",
    "330111": "富阳区",
    "330122": "桐庐县",
    "330127": "淳安县",
    "330182": "建德市",
    "330185": "临安市"
  },
  "330200": {
    "330203": "海曙区",
    "330204": "江东区",
    "330205": "江北区",
    "330206": "北仑区",
    "330211": "镇海区",
    "330212": "鄞州区",
    "330225": "象山县",
    "330226": "宁海县",
    "330281": "余姚市",
    "330282": "慈溪市",
    "330283": "奉化市"
  },
  "330300": {
    "330302": "鹿城区",
    "330303": "龙湾区",
    "330304": "瓯海区",
    "330305": "洞头区",
    "330324": "永嘉县",
    "330326": "平阳县",
    "330327": "苍南县",
    "330328": "文成县",
    "330329": "泰顺县",
    "330381": "瑞安市",
    "330382": "乐清市"
  },
  "330400": {
    "330402": "南湖区",
    "330411": "秀洲区",
    "330421": "嘉善县",
    "330424": "海盐县",
    "330481": "海宁市",
    "330482": "平湖市",
    "330483": "桐乡市"
  },
  "330500": {
    "330502": "吴兴区",
    "330503": "南浔区",
    "330521": "德清县",
    "330522": "长兴县",
    "330523": "安吉县"
  },
  "330600": {
    "330602": "越城区",
    "330603": "柯桥区",
    "330604": "上虞区",
    "330624": "新昌县",
    "330681": "诸暨市",
    "330683": "嵊州市"
  },
  "330700": {
    "330702": "婺城区",
    "330703": "金东区",
    "330723": "武义县",
    "330726": "浦江县",
    "330727": "磐安县",
    "330781": "兰溪市",
    "330782": "义乌市",
    "330783": "东阳市",
    "330784": "永康市"
  },
  "330800": {
    "330802": "柯城区",
    "330803": "衢江区",
    "330822": "常山县",
    "330824": "开化县",
    "330825": "龙游县",
    "330881": "江山市"
  },
  "330900": {
    "330902": "定海区",
    "330903": "普陀区",
    "330921": "岱山县",
    "330922": "嵊泗县"
  },
  "331000": {
    "331002": "椒江区",
    "331003": "黄岩区",
    "331004": "路桥区",
    "331021": "玉环县",
    "331022": "三门县",
    "331023": "天台县",
    "331024": "仙居县",
    "331081": "温岭市",
    "331082": "临海市"
  },
  "331100": {
    "331102": "莲都区",
    "331121": "青田县",
    "331122": "缙云县",
    "331123": "遂昌县",
    "331124": "松阳县",
    "331125": "云和县",
    "331126": "庆元县",
    "331127": "景宁畲族自治县",
    "331181": "龙泉市"
  },
  "340000": {
    "340100": "合肥市",
    "340200": "芜湖市",
    "340300": "蚌埠市",
    "340400": "淮南市",
    "340500": "马鞍山市",
    "340600": "淮北市",
    "340700": "铜陵市",
    "340800": "安庆市",
    "341000": "黄山市",
    "341100": "滁州市",
    "341200": "阜阳市",
    "341300": "宿州市",
    "341500": "六安市",
    "341600": "亳州市",
    "341700": "池州市",
    "341800": "宣城市"
  },
  "340100": {
    "340102": "瑶海区",
    "340103": "庐阳区",
    "340104": "蜀山区",
    "340111": "包河区",
    "340121": "长丰县",
    "340122": "肥东县",
    "340123": "肥西县",
    "340124": "庐江县",
    "340181": "巢湖市"
  },
  "340200": {
    "340202": "镜湖区",
    "340203": "弋江区",
    "340207": "鸠江区",
    "340208": "三山区",
    "340221": "芜湖县",
    "340222": "繁昌县",
    "340223": "南陵县",
    "340225": "无为县"
  },
  "340300": {
    "340302": "龙子湖区",
    "340303": "蚌山区",
    "340304": "禹会区",
    "340311": "淮上区",
    "340321": "怀远县",
    "340322": "五河县",
    "340323": "固镇县"
  },
  "340400": {
    "340402": "大通区",
    "340403": "田家庵区",
    "340404": "谢家集区",
    "340405": "八公山区",
    "340406": "潘集区",
    "340421": "凤台县",
    "340422": "寿县"
  },
  "340500": {
    "340503": "花山区",
    "340504": "雨山区",
    "340506": "博望区",
    "340521": "当涂县",
    "340522": "含山县",
    "340523": "和县"
  },
  "340600": {
    "340602": "杜集区",
    "340603": "相山区",
    "340604": "烈山区",
    "340621": "濉溪县"
  },
  "340700": {
    "340705": "铜官区",
    "340706": "义安区",
    "340711": "郊区",
    "340722": "枞阳县"
  },
  "340800": {
    "340802": "迎江区",
    "340803": "大观区",
    "340811": "宜秀区",
    "340822": "怀宁县",
    "340824": "潜山县",
    "340825": "太湖县",
    "340826": "宿松县",
    "340827": "望江县",
    "340828": "岳西县",
    "340881": "桐城市"
  },
  "341000": {
    "341002": "屯溪区",
    "341003": "黄山区",
    "341004": "徽州区",
    "341021": "歙县",
    "341022": "休宁县",
    "341023": "黟县",
    "341024": "祁门县"
  },
  "341100": {
    "341102": "琅琊区",
    "341103": "南谯区",
    "341122": "来安县",
    "341124": "全椒县",
    "341125": "定远县",
    "341126": "凤阳县",
    "341181": "天长市",
    "341182": "明光市"
  },
  "341200": {
    "341202": "颍州区",
    "341203": "颍东区",
    "341204": "颍泉区",
    "341221": "临泉县",
    "341222": "太和县",
    "341225": "阜南县",
    "341226": "颍上县",
    "341282": "界首市"
  },
  "341300": {
    "341302": "埇桥区",
    "341321": "砀山县",
    "341322": "萧县",
    "341323": "灵璧县",
    "341324": "泗县"
  },
  "341500": {
    "341502": "金安区",
    "341503": "裕安区",
    "341504": "叶集区",
    "341522": "霍邱县",
    "341523": "舒城县",
    "341524": "金寨县",
    "341525": "霍山县"
  },
  "341600": {
    "341602": "谯城区",
    "341621": "涡阳县",
    "341622": "蒙城县",
    "341623": "利辛县"
  },
  "341700": {
    "341702": "贵池区",
    "341721": "东至县",
    "341722": "石台县",
    "341723": "青阳县"
  },
  "341800": {
    "341802": "宣州区",
    "341821": "郎溪县",
    "341822": "广德县",
    "341823": "泾县",
    "341824": "绩溪县",
    "341825": "旌德县",
    "341881": "宁国市"
  },
  "350000": {
    "350100": "福州市",
    "350200": "厦门市",
    "350300": "莆田市",
    "350400": "三明市",
    "350500": "泉州市",
    "350600": "漳州市",
    "350700": "南平市",
    "350800": "龙岩市",
    "350900": "宁德市"
  },
  "350100": {
    "350102": "鼓楼区",
    "350103": "台江区",
    "350104": "仓山区",
    "350105": "马尾区",
    "350111": "晋安区",
    "350121": "闽侯县",
    "350122": "连江县",
    "350123": "罗源县",
    "350124": "闽清县",
    "350125": "永泰县",
    "350128": "平潭县",
    "350181": "福清市",
    "350182": "长乐市"
  },
  "350200": {
    "350203": "思明区",
    "350205": "海沧区",
    "350206": "湖里区",
    "350211": "集美区",
    "350212": "同安区",
    "350213": "翔安区"
  },
  "350300": {
    "350302": "城厢区",
    "350303": "涵江区",
    "350304": "荔城区",
    "350305": "秀屿区",
    "350322": "仙游县"
  },
  "350400": {
    "350402": "梅列区",
    "350403": "三元区",
    "350421": "明溪县",
    "350423": "清流县",
    "350424": "宁化县",
    "350425": "大田县",
    "350426": "尤溪县",
    "350427": "沙县",
    "350428": "将乐县",
    "350429": "泰宁县",
    "350430": "建宁县",
    "350481": "永安市"
  },
  "350500": {
    "350502": "鲤城区",
    "350503": "丰泽区",
    "350504": "洛江区",
    "350505": "泉港区",
    "350521": "惠安县",
    "350524": "安溪县",
    "350525": "永春县",
    "350526": "德化县",
    "350527": "金门县",
    "350581": "石狮市",
    "350582": "晋江市",
    "350583": "南安市"
  },
  "350600": {
    "350602": "芗城区",
    "350603": "龙文区",
    "350622": "云霄县",
    "350623": "漳浦县",
    "350624": "诏安县",
    "350625": "长泰县",
    "350626": "东山县",
    "350627": "南靖县",
    "350628": "平和县",
    "350629": "华安县",
    "350681": "龙海市"
  },
  "350700": {
    "350702": "延平区",
    "350703": "建阳区",
    "350721": "顺昌县",
    "350722": "浦城县",
    "350723": "光泽县",
    "350724": "松溪县",
    "350725": "政和县",
    "350781": "邵武市",
    "350782": "武夷山市",
    "350783": "建瓯市"
  },
  "350800": {
    "350802": "新罗区",
    "350803": "永定区",
    "350821": "长汀县",
    "350823": "上杭县",
    "350824": "武平县",
    "350825": "连城县",
    "350881": "漳平市"
  },
  "350900": {
    "350902": "蕉城区",
    "350921": "霞浦县",
    "350922": "古田县",
    "350923": "屏南县",
    "350924": "寿宁县",
    "350925": "周宁县",
    "350926": "柘荣县",
    "350981": "福安市",
    "350982": "福鼎市"
  },
  "360000": {
    "360100": "南昌市",
    "360200": "景德镇市",
    "360300": "萍乡市",
    "360400": "九江市",
    "360500": "新余市",
    "360600": "鹰潭市",
    "360700": "赣州市",
    "360800": "吉安市",
    "360900": "宜春市",
    "361000": "抚州市",
    "361100": "上饶市"
  },
  "360100": {
    "360102": "东湖区",
    "360103": "西湖区",
    "360104": "青云谱区",
    "360105": "湾里区",
    "360111": "青山湖区",
    "360112": "新建区",
    "360121": "南昌县",
    "360123": "安义县",
    "360124": "进贤县"
  },
  "360200": {
    "360202": "昌江区",
    "360203": "珠山区",
    "360222": "浮梁县",
    "360281": "乐平市"
  },
  "360300": {
    "360302": "安源区",
    "360313": "湘东区",
    "360321": "莲花县",
    "360322": "上栗县",
    "360323": "芦溪县"
  },
  "360400": {
    "360402": "濂溪区",
    "360403": "浔阳区",
    "360421": "九江县",
    "360423": "武宁县",
    "360424": "修水县",
    "360425": "永修县",
    "360426": "德安县",
    "360428": "都昌县",
    "360429": "湖口县",
    "360430": "彭泽县",
    "360481": "瑞昌市",
    "360482": "共青城市",
    "360483": "庐山市"
  },
  "360500": {
    "360502": "渝水区",
    "360521": "分宜县"
  },
  "360600": {
    "360602": "月湖区",
    "360622": "余江县",
    "360681": "贵溪市"
  },
  "360700": {
    "360702": "章贡区",
    "360703": "南康区",
    "360721": "赣县",
    "360722": "信丰县",
    "360723": "大余县",
    "360724": "上犹县",
    "360725": "崇义县",
    "360726": "安远县",
    "360727": "龙南县",
    "360728": "定南县",
    "360729": "全南县",
    "360730": "宁都县",
    "360731": "于都县",
    "360732": "兴国县",
    "360733": "会昌县",
    "360734": "寻乌县",
    "360735": "石城县",
    "360781": "瑞金市"
  },
  "360800": {
    "360802": "吉州区",
    "360803": "青原区",
    "360821": "吉安县",
    "360822": "吉水县",
    "360823": "峡江县",
    "360824": "新干县",
    "360825": "永丰县",
    "360826": "泰和县",
    "360827": "遂川县",
    "360828": "万安县",
    "360829": "安福县",
    "360830": "永新县",
    "360881": "井冈山市"
  },
  "360900": {
    "360902": "袁州区",
    "360921": "奉新县",
    "360922": "万载县",
    "360923": "上高县",
    "360924": "宜丰县",
    "360925": "靖安县",
    "360926": "铜鼓县",
    "360981": "丰城市",
    "360982": "樟树市",
    "360983": "高安市"
  },
  "361000": {
    "361002": "临川区",
    "361021": "南城县",
    "361022": "黎川县",
    "361023": "南丰县",
    "361024": "崇仁县",
    "361025": "乐安县",
    "361026": "宜黄县",
    "361027": "金溪县",
    "361028": "资溪县",
    "361029": "东乡县",
    "361030": "广昌县"
  },
  "361100": {
    "361102": "信州区",
    "361103": "广丰区",
    "361121": "上饶县",
    "361123": "玉山县",
    "361124": "铅山县",
    "361125": "横峰县",
    "361126": "弋阳县",
    "361127": "余干县",
    "361128": "鄱阳县",
    "361129": "万年县",
    "361130": "婺源县",
    "361181": "德兴市"
  },
  "370000": {
    "370100": "济南市",
    "370200": "青岛市",
    "370300": "淄博市",
    "370400": "枣庄市",
    "370500": "东营市",
    "370600": "烟台市",
    "370700": "潍坊市",
    "370800": "济宁市",
    "370900": "泰安市",
    "371000": "威海市",
    "371100": "日照市",
    "371200": "莱芜市",
    "371300": "临沂市",
    "371400": "德州市",
    "371500": "聊城市",
    "371600": "滨州市",
    "371700": "菏泽市"
  },
  "370100": {
    "370102": "历下区",
    "370103": "市中区",
    "370104": "槐荫区",
    "370105": "天桥区",
    "370112": "历城区",
    "370113": "长清区",
    "370124": "平阴县",
    "370125": "济阳县",
    "370126": "商河县",
    "370181": "章丘市"
  },
  "370200": {
    "370202": "市南区",
    "370203": "市北区",
    "370211": "黄岛区",
    "370212": "崂山区",
    "370213": "李沧区",
    "370214": "城阳区",
    "370281": "胶州市",
    "370282": "即墨市",
    "370283": "平度市",
    "370285": "莱西市"
  },
  "370300": {
    "370302": "淄川区",
    "370303": "张店区",
    "370304": "博山区",
    "370305": "临淄区",
    "370306": "周村区",
    "370321": "桓台县",
    "370322": "高青县",
    "370323": "沂源县"
  },
  "370400": {
    "370402": "市中区",
    "370403": "薛城区",
    "370404": "峄城区",
    "370405": "台儿庄区",
    "370406": "山亭区",
    "370481": "滕州市"
  },
  "370500": {
    "370502": "东营区",
    "370503": "河口区",
    "370505": "垦利区",
    "370522": "利津县",
    "370523": "广饶县"
  },
  "370600": {
    "370602": "芝罘区",
    "370611": "福山区",
    "370612": "牟平区",
    "370613": "莱山区",
    "370634": "长岛县",
    "370681": "龙口市",
    "370682": "莱阳市",
    "370683": "莱州市",
    "370684": "蓬莱市",
    "370685": "招远市",
    "370686": "栖霞市",
    "370687": "海阳市"
  },
  "370700": {
    "370702": "潍城区",
    "370703": "寒亭区",
    "370704": "坊子区",
    "370705": "奎文区",
    "370724": "临朐县",
    "370725": "昌乐县",
    "370781": "青州市",
    "370782": "诸城市",
    "370783": "寿光市",
    "370784": "安丘市",
    "370785": "高密市",
    "370786": "昌邑市"
  },
  "370800": {
    "370811": "任城区",
    "370812": "兖州区",
    "370826": "微山县",
    "370827": "鱼台县",
    "370828": "金乡县",
    "370829": "嘉祥县",
    "370830": "汶上县",
    "370831": "泗水县",
    "370832": "梁山县",
    "370881": "曲阜市",
    "370883": "邹城市"
  },
  "370900": {
    "370902": "泰山区",
    "370911": "岱岳区",
    "370921": "宁阳县",
    "370923": "东平县",
    "370982": "新泰市",
    "370983": "肥城市"
  },
  "371000": {
    "371002": "环翠区",
    "371003": "文登区",
    "371082": "荣成市",
    "371083": "乳山市"
  },
  "371100": {
    "371102": "东港区",
    "371103": "岚山区",
    "371121": "五莲县",
    "371122": "莒县"
  },
  "371200": {
    "371202": "莱城区",
    "371203": "钢城区"
  },
  "371300": {
    "371302": "兰山区",
    "371311": "罗庄区",
    "371312": "河东区",
    "371321": "沂南县",
    "371322": "郯城县",
    "371323": "沂水县",
    "371324": "兰陵县",
    "371325": "费县",
    "371326": "平邑县",
    "371327": "莒南县",
    "371328": "蒙阴县",
    "371329": "临沭县"
  },
  "371400": {
    "371402": "德城区",
    "371403": "陵城区",
    "371422": "宁津县",
    "371423": "庆云县",
    "371424": "临邑县",
    "371425": "齐河县",
    "371426": "平原县",
    "371427": "夏津县",
    "371428": "武城县",
    "371481": "乐陵市",
    "371482": "禹城市"
  },
  "371500": {
    "371502": "东昌府区",
    "371521": "阳谷县",
    "371522": "莘县",
    "371523": "茌平县",
    "371524": "东阿县",
    "371525": "冠县",
    "371526": "高唐县",
    "371581": "临清市"
  },
  "371600": {
    "371602": "滨城区",
    "371603": "沾化区",
    "371621": "惠民县",
    "371622": "阳信县",
    "371623": "无棣县",
    "371625": "博兴县",
    "371626": "邹平县"
  },
  "371700": {
    "371702": "牡丹区",
    "371703": "定陶区",
    "371721": "曹县",
    "371722": "单县",
    "371723": "成武县",
    "371724": "巨野县",
    "371725": "郓城县",
    "371726": "鄄城县",
    "371728": "东明县"
  },
  "410000": {
    "410100": "郑州市",
    "410200": "开封市",
    "410300": "洛阳市",
    "410400": "平顶山市",
    "410500": "安阳市",
    "410600": "鹤壁市",
    "410700": "新乡市",
    "410800": "焦作市",
    "410900": "濮阳市",
    "411000": "许昌市",
    "411100": "漯河市",
    "411200": "三门峡市",
    "411300": "南阳市",
    "411400": "商丘市",
    "411500": "信阳市",
    "411600": "周口市",
    "411700": "驻马店市",
    "419001": "济源市"
  },
  "410100": {
    "410102": "中原区",
    "410103": "二七区",
    "410104": "管城回族区",
    "410105": "金水区",
    "410106": "上街区",
    "410108": "惠济区",
    "410122": "中牟县",
    "410181": "巩义市",
    "410182": "荥阳市",
    "410183": "新密市",
    "410184": "新郑市",
    "410185": "登封市"
  },
  "410200": {
    "410202": "龙亭区",
    "410203": "顺河回族区",
    "410204": "鼓楼区",
    "410205": "禹王台区",
    "410211": "金明区",
    "410212": "祥符区",
    "410221": "杞县",
    "410222": "通许县",
    "410223": "尉氏县",
    "410225": "兰考县"
  },
  "410300": {
    "410302": "老城区",
    "410303": "西工区",
    "410304": "瀍河回族区",
    "410305": "涧西区",
    "410306": "吉利区",
    "410311": "洛龙区",
    "410322": "孟津县",
    "410323": "新安县",
    "410324": "栾川县",
    "410325": "嵩县",
    "410326": "汝阳县",
    "410327": "宜阳县",
    "410328": "洛宁县",
    "410329": "伊川县",
    "410381": "偃师市"
  },
  "410400": {
    "410402": "新华区",
    "410403": "卫东区",
    "410404": "石龙区",
    "410411": "湛河区",
    "410421": "宝丰县",
    "410422": "叶县",
    "410423": "鲁山县",
    "410425": "郏县",
    "410481": "舞钢市",
    "410482": "汝州市"
  },
  "410500": {
    "410502": "文峰区",
    "410503": "北关区",
    "410505": "殷都区",
    "410506": "龙安区",
    "410522": "安阳县",
    "410523": "汤阴县",
    "410526": "滑县",
    "410527": "内黄县",
    "410581": "林州市"
  },
  "410600": {
    "410602": "鹤山区",
    "410603": "山城区",
    "410611": "淇滨区",
    "410621": "浚县",
    "410622": "淇县"
  },
  "410700": {
    "410702": "红旗区",
    "410703": "卫滨区",
    "410704": "凤泉区",
    "410711": "牧野区",
    "410721": "新乡县",
    "410724": "获嘉县",
    "410725": "原阳县",
    "410726": "延津县",
    "410727": "封丘县",
    "410728": "长垣县",
    "410781": "卫辉市",
    "410782": "辉县市"
  },
  "410800": {
    "410802": "解放区",
    "410803": "中站区",
    "410804": "马村区",
    "410811": "山阳区",
    "410821": "修武县",
    "410822": "博爱县",
    "410823": "武陟县",
    "410825": "温县",
    "410882": "沁阳市",
    "410883": "孟州市"
  },
  "410900": {
    "410902": "华龙区",
    "410922": "清丰县",
    "410923": "南乐县",
    "410926": "范县",
    "410927": "台前县",
    "410928": "濮阳县"
  },
  "411000": {
    "411002": "魏都区",
    "411023": "许昌县",
    "411024": "鄢陵县",
    "411025": "襄城县",
    "411081": "禹州市",
    "411082": "长葛市"
  },
  "411100": {
    "411102": "源汇区",
    "411103": "郾城区",
    "411104": "召陵区",
    "411121": "舞阳县",
    "411122": "临颍县"
  },
  "411200": {
    "411202": "湖滨区",
    "411203": "陕州区",
    "411221": "渑池县",
    "411224": "卢氏县",
    "411281": "义马市",
    "411282": "灵宝市"
  },
  "411300": {
    "411302": "宛城区",
    "411303": "卧龙区",
    "411321": "南召县",
    "411322": "方城县",
    "411323": "西峡县",
    "411324": "镇平县",
    "411325": "内乡县",
    "411326": "淅川县",
    "411327": "社旗县",
    "411328": "唐河县",
    "411329": "新野县",
    "411330": "桐柏县",
    "411381": "邓州市"
  },
  "411400": {
    "411402": "梁园区",
    "411403": "睢阳区",
    "411421": "民权县",
    "411422": "睢县",
    "411423": "宁陵县",
    "411424": "柘城县",
    "411425": "虞城县",
    "411426": "夏邑县",
    "411481": "永城市"
  },
  "411500": {
    "411502": "浉河区",
    "411503": "平桥区",
    "411521": "罗山县",
    "411522": "光山县",
    "411523": "新县",
    "411524": "商城县",
    "411525": "固始县",
    "411526": "潢川县",
    "411527": "淮滨县",
    "411528": "息县"
  },
  "411600": {
    "411602": "川汇区",
    "411621": "扶沟县",
    "411622": "西华县",
    "411623": "商水县",
    "411624": "沈丘县",
    "411625": "郸城县",
    "411626": "淮阳县",
    "411627": "太康县",
    "411628": "鹿邑县",
    "411681": "项城市"
  },
  "411700": {
    "411702": "驿城区",
    "411721": "西平县",
    "411722": "上蔡县",
    "411723": "平舆县",
    "411724": "正阳县",
    "411725": "确山县",
    "411726": "泌阳县",
    "411727": "汝南县",
    "411728": "遂平县",
    "411729": "新蔡县"
  },
  "420000": {
    "420100": "武汉市",
    "420200": "黄石市",
    "420300": "十堰市",
    "420500": "宜昌市",
    "420600": "襄阳市",
    "420700": "鄂州市",
    "420800": "荆门市",
    "420900": "孝感市",
    "421000": "荆州市",
    "421100": "黄冈市",
    "421200": "咸宁市",
    "421300": "随州市",
    "422800": "恩施土家族苗族自治州",
    "429004": "仙桃市",
    "429005": "潜江市",
    "429006": "天门市",
    "429021": "神农架林区"
  },
  "420100": {
    "420102": "江岸区",
    "420103": "江汉区",
    "420104": "硚口区",
    "420105": "汉阳区",
    "420106": "武昌区",
    "420107": "青山区",
    "420111": "洪山区",
    "420112": "东西湖区",
    "420113": "汉南区",
    "420114": "蔡甸区",
    "420115": "江夏区",
    "420116": "黄陂区",
    "420117": "新洲区"
  },
  "420200": {
    "420202": "黄石港区",
    "420203": "西塞山区",
    "420204": "下陆区",
    "420205": "铁山区",
    "420222": "阳新县",
    "420281": "大冶市"
  },
  "420300": {
    "420302": "茅箭区",
    "420303": "张湾区",
    "420304": "郧阳区",
    "420322": "郧西县",
    "420323": "竹山县",
    "420324": "竹溪县",
    "420325": "房县",
    "420381": "丹江口市"
  },
  "420500": {
    "420502": "西陵区",
    "420503": "伍家岗区",
    "420504": "点军区",
    "420505": "猇亭区",
    "420506": "夷陵区",
    "420525": "远安县",
    "420526": "兴山县",
    "420527": "秭归县",
    "420528": "长阳土家族自治县",
    "420529": "五峰土家族自治县",
    "420581": "宜都市",
    "420582": "当阳市",
    "420583": "枝江市"
  },
  "420600": {
    "420602": "襄城区",
    "420606": "樊城区",
    "420607": "襄州区",
    "420624": "南漳县",
    "420625": "谷城县",
    "420626": "保康县",
    "420682": "老河口市",
    "420683": "枣阳市",
    "420684": "宜城市"
  },
  "420700": {
    "420702": "梁子湖区",
    "420703": "华容区",
    "420704": "鄂城区"
  },
  "420800": {
    "420802": "东宝区",
    "420804": "掇刀区",
    "420821": "京山县",
    "420822": "沙洋县",
    "420881": "钟祥市"
  },
  "420900": {
    "420902": "孝南区",
    "420921": "孝昌县",
    "420922": "大悟县",
    "420923": "云梦县",
    "420981": "应城市",
    "420982": "安陆市",
    "420984": "汉川市"
  },
  "421000": {
    "421002": "沙市区",
    "421003": "荆州区",
    "421022": "公安县",
    "421023": "监利县",
    "421024": "江陵县",
    "421081": "石首市",
    "421083": "洪湖市",
    "421087": "松滋市"
  },
  "421100": {
    "421102": "黄州区",
    "421121": "团风县",
    "421122": "红安县",
    "421123": "罗田县",
    "421124": "英山县",
    "421125": "浠水县",
    "421126": "蕲春县",
    "421127": "黄梅县",
    "421181": "麻城市",
    "421182": "武穴市"
  },
  "421200": {
    "421202": "咸安区",
    "421221": "嘉鱼县",
    "421222": "通城县",
    "421223": "崇阳县",
    "421224": "通山县",
    "421281": "赤壁市"
  },
  "421300": {
    "421303": "曾都区",
    "421321": "随县",
    "421381": "广水市"
  },
  "422800": {
    "422801": "恩施市",
    "422802": "利川市",
    "422822": "建始县",
    "422823": "巴东县",
    "422825": "宣恩县",
    "422826": "咸丰县",
    "422827": "来凤县",
    "422828": "鹤峰县"
  },
  "430000": {
    "430100": "长沙市",
    "430200": "株洲市",
    "430300": "湘潭市",
    "430400": "衡阳市",
    "430500": "邵阳市",
    "430600": "岳阳市",
    "430700": "常德市",
    "430800": "张家界市",
    "430900": "益阳市",
    "431000": "郴州市",
    "431100": "永州市",
    "431200": "怀化市",
    "431300": "娄底市",
    "433100": "湘西土家族苗族自治州"
  },
  "430100": {
    "430102": "芙蓉区",
    "430103": "天心区",
    "430104": "岳麓区",
    "430105": "开福区",
    "430111": "雨花区",
    "430112": "望城区",
    "430121": "长沙县",
    "430124": "宁乡县",
    "430181": "浏阳市"
  },
  "430200": {
    "430202": "荷塘区",
    "430203": "芦淞区",
    "430204": "石峰区",
    "430211": "天元区",
    "430221": "株洲县",
    "430223": "攸县",
    "430224": "茶陵县",
    "430225": "炎陵县",
    "430281": "醴陵市"
  },
  "430300": {
    "430302": "雨湖区",
    "430304": "岳塘区",
    "430321": "湘潭县",
    "430381": "湘乡市",
    "430382": "韶山市"
  },
  "430400": {
    "430405": "珠晖区",
    "430406": "雁峰区",
    "430407": "石鼓区",
    "430408": "蒸湘区",
    "430412": "南岳区",
    "430421": "衡阳县",
    "430422": "衡南县",
    "430423": "衡山县",
    "430424": "衡东县",
    "430426": "祁东县",
    "430481": "耒阳市",
    "430482": "常宁市"
  },
  "430500": {
    "430502": "双清区",
    "430503": "大祥区",
    "430511": "北塔区",
    "430521": "邵东县",
    "430522": "新邵县",
    "430523": "邵阳县",
    "430524": "隆回县",
    "430525": "洞口县",
    "430527": "绥宁县",
    "430528": "新宁县",
    "430529": "城步苗族自治县",
    "430581": "武冈市"
  },
  "430600": {
    "430602": "岳阳楼区",
    "430603": "云溪区",
    "430611": "君山区",
    "430621": "岳阳县",
    "430623": "华容县",
    "430624": "湘阴县",
    "430626": "平江县",
    "430681": "汨罗市",
    "430682": "临湘市"
  },
  "430700": {
    "430702": "武陵区",
    "430703": "鼎城区",
    "430721": "安乡县",
    "430722": "汉寿县",
    "430723": "澧县",
    "430724": "临澧县",
    "430725": "桃源县",
    "430726": "石门县",
    "430781": "津市市"
  },
  "430800": {
    "430802": "永定区",
    "430811": "武陵源区",
    "430821": "慈利县",
    "430822": "桑植县"
  },
  "430900": {
    "430902": "资阳区",
    "430903": "赫山区",
    "430921": "南县",
    "430922": "桃江县",
    "430923": "安化县",
    "430981": "沅江市"
  },
  "431000": {
    "431002": "北湖区",
    "431003": "苏仙区",
    "431021": "桂阳县",
    "431022": "宜章县",
    "431023": "永兴县",
    "431024": "嘉禾县",
    "431025": "临武县",
    "431026": "汝城县",
    "431027": "桂东县",
    "431028": "安仁县",
    "431081": "资兴市"
  },
  "431100": {
    "431102": "零陵区",
    "431103": "冷水滩区",
    "431121": "祁阳县",
    "431122": "东安县",
    "431123": "双牌县",
    "431124": "道县",
    "431125": "江永县",
    "431126": "宁远县",
    "431127": "蓝山县",
    "431128": "新田县",
    "431129": "江华瑶族自治县"
  },
  "431200": {
    "431202": "鹤城区",
    "431221": "中方县",
    "431222": "沅陵县",
    "431223": "辰溪县",
    "431224": "溆浦县",
    "431225": "会同县",
    "431226": "麻阳苗族自治县",
    "431227": "新晃侗族自治县",
    "431228": "芷江侗族自治县",
    "431229": "靖州苗族侗族自治县",
    "431230": "通道侗族自治县",
    "431281": "洪江市"
  },
  "431300": {
    "431302": "娄星区",
    "431321": "双峰县",
    "431322": "新化县",
    "431381": "冷水江市",
    "431382": "涟源市"
  },
  "433100": {
    "433101": "吉首市",
    "433122": "泸溪县",
    "433123": "凤凰县",
    "433124": "花垣县",
    "433125": "保靖县",
    "433126": "古丈县",
    "433127": "永顺县",
    "433130": "龙山县"
  },
  "440000": {
    "440100": "广州市",
    "440200": "韶关市",
    "440300": "深圳市",
    "440400": "珠海市",
    "440500": "汕头市",
    "440600": "佛山市",
    "440700": "江门市",
    "440800": "湛江市",
    "440900": "茂名市",
    "441200": "肇庆市",
    "441300": "惠州市",
    "441400": "梅州市",
    "441500": "汕尾市",
    "441600": "河源市",
    "441700": "阳江市",
    "441800": "清远市",
    "441900": "东莞市",
    "442000": "中山市",
    "445100": "潮州市",
    "445200": "揭阳市",
    "445300": "云浮市"
  },
  "440100": {
    "440103": "荔湾区",
    "440104": "越秀区",
    "440105": "海珠区",
    "440106": "天河区",
    "440111": "白云区",
    "440112": "黄埔区",
    "440113": "番禺区",
    "440114": "花都区",
    "440115": "南沙区",
    "440117": "从化区",
    "440118": "增城区"
  },
  "440200": {
    "440203": "武江区",
    "440204": "浈江区",
    "440205": "曲江区",
    "440222": "始兴县",
    "440224": "仁化县",
    "440229": "翁源县",
    "440232": "乳源瑶族自治县",
    "440233": "新丰县",
    "440281": "乐昌市",
    "440282": "南雄市"
  },
  "440300": {
    "440303": "罗湖区",
    "440304": "福田区",
    "440305": "南山区",
    "440306": "宝安区",
    "440307": "龙岗区",
    "440308": "盐田区"
  },
  "440400": {
    "440402": "香洲区",
    "440403": "斗门区",
    "440404": "金湾区"
  },
  "440500": {
    "440507": "龙湖区",
    "440511": "金平区",
    "440512": "濠江区",
    "440513": "潮阳区",
    "440514": "潮南区",
    "440515": "澄海区",
    "440523": "南澳县"
  },
  "440600": {
    "440604": "禅城区",
    "440605": "南海区",
    "440606": "顺德区",
    "440607": "三水区",
    "440608": "高明区"
  },
  "440700": {
    "440703": "蓬江区",
    "440704": "江海区",
    "440705": "新会区",
    "440781": "台山市",
    "440783": "开平市",
    "440784": "鹤山市",
    "440785": "恩平市"
  },
  "440800": {
    "440802": "赤坎区",
    "440803": "霞山区",
    "440804": "坡头区",
    "440811": "麻章区",
    "440823": "遂溪县",
    "440825": "徐闻县",
    "440881": "廉江市",
    "440882": "雷州市",
    "440883": "吴川市"
  },
  "440900": {
    "440902": "茂南区",
    "440904": "电白区",
    "440981": "高州市",
    "440982": "化州市",
    "440983": "信宜市"
  },
  "441200": {
    "441202": "端州区",
    "441203": "鼎湖区",
    "441204": "高要区",
    "441223": "广宁县",
    "441224": "怀集县",
    "441225": "封开县",
    "441226": "德庆县",
    "441284": "四会市"
  },
  "441300": {
    "441302": "惠城区",
    "441303": "惠阳区",
    "441322": "博罗县",
    "441323": "惠东县",
    "441324": "龙门县"
  },
  "441400": {
    "441402": "梅江区",
    "441403": "梅县区",
    "441422": "大埔县",
    "441423": "丰顺县",
    "441424": "五华县",
    "441426": "平远县",
    "441427": "蕉岭县",
    "441481": "兴宁市"
  },
  "441500": {
    "441502": "城区",
    "441521": "海丰县",
    "441523": "陆河县",
    "441581": "陆丰市"
  },
  "441600": {
    "441602": "源城区",
    "441621": "紫金县",
    "441622": "龙川县",
    "441623": "连平县",
    "441624": "和平县",
    "441625": "东源县"
  },
  "441700": {
    "441702": "江城区",
    "441704": "阳东区",
    "441721": "阳西县",
    "441781": "阳春市"
  },
  "441800": {
    "441802": "清城区",
    "441803": "清新区",
    "441821": "佛冈县",
    "441823": "阳山县",
    "441825": "连山壮族瑶族自治县",
    "441826": "连南瑶族自治县",
    "441881": "英德市",
    "441882": "连州市"
  },
  "445100": {
    "445102": "湘桥区",
    "445103": "潮安区",
    "445122": "饶平县"
  },
  "445200": {
    "445202": "榕城区",
    "445203": "揭东区",
    "445222": "揭西县",
    "445224": "惠来县",
    "445281": "普宁市"
  },
  "445300": {
    "445302": "云城区",
    "445303": "云安区",
    "445321": "新兴县",
    "445322": "郁南县",
    "445381": "罗定市"
  },
  "450000": {
    "450100": "南宁市",
    "450200": "柳州市",
    "450300": "桂林市",
    "450400": "梧州市",
    "450500": "北海市",
    "450600": "防城港市",
    "450700": "钦州市",
    "450800": "贵港市",
    "450900": "玉林市",
    "451000": "百色市",
    "451100": "贺州市",
    "451200": "河池市",
    "451300": "来宾市",
    "451400": "崇左市"
  },
  "450100": {
    "450102": "兴宁区",
    "450103": "青秀区",
    "450105": "江南区",
    "450107": "西乡塘区",
    "450108": "良庆区",
    "450109": "邕宁区",
    "450110": "武鸣区",
    "450123": "隆安县",
    "450124": "马山县",
    "450125": "上林县",
    "450126": "宾阳县",
    "450127": "横县"
  },
  "450200": {
    "450202": "城中区",
    "450203": "鱼峰区",
    "450204": "柳南区",
    "450205": "柳北区",
    "450206": "柳江区",
    "450222": "柳城县",
    "450223": "鹿寨县",
    "450224": "融安县",
    "450225": "融水苗族自治县",
    "450226": "三江侗族自治县"
  },
  "450300": {
    "450302": "秀峰区",
    "450303": "叠彩区",
    "450304": "象山区",
    "450305": "七星区",
    "450311": "雁山区",
    "450312": "临桂区",
    "450321": "阳朔县",
    "450323": "灵川县",
    "450324": "全州县",
    "450325": "兴安县",
    "450326": "永福县",
    "450327": "灌阳县",
    "450328": "龙胜各族自治县",
    "450329": "资源县",
    "450330": "平乐县",
    "450331": "荔浦县",
    "450332": "恭城瑶族自治县"
  },
  "450400": {
    "450403": "万秀区",
    "450405": "长洲区",
    "450406": "龙圩区",
    "450421": "苍梧县",
    "450422": "藤县",
    "450423": "蒙山县",
    "450481": "岑溪市"
  },
  "450500": {
    "450502": "海城区",
    "450503": "银海区",
    "450512": "铁山港区",
    "450521": "合浦县"
  },
  "450600": {
    "450602": "港口区",
    "450603": "防城区",
    "450621": "上思县",
    "450681": "东兴市"
  },
  "450700": {
    "450702": "钦南区",
    "450703": "钦北区",
    "450721": "灵山县",
    "450722": "浦北县"
  },
  "450800": {
    "450802": "港北区",
    "450803": "港南区",
    "450804": "覃塘区",
    "450821": "平南县",
    "450881": "桂平市"
  },
  "450900": {
    "450902": "玉州区",
    "450903": "福绵区",
    "450921": "容县",
    "450922": "陆川县",
    "450923": "博白县",
    "450924": "兴业县",
    "450981": "北流市"
  },
  "451000": {
    "451002": "右江区",
    "451021": "田阳县",
    "451022": "田东县",
    "451023": "平果县",
    "451024": "德保县",
    "451026": "那坡县",
    "451027": "凌云县",
    "451028": "乐业县",
    "451029": "田林县",
    "451030": "西林县",
    "451031": "隆林各族自治县",
    "451081": "靖西市"
  },
  "451100": {
    "451102": "八步区",
    "451103": "平桂区",
    "451121": "昭平县",
    "451122": "钟山县",
    "451123": "富川瑶族自治县"
  },
  "451200": {
    "451202": "金城江区",
    "451221": "南丹县",
    "451222": "天峨县",
    "451223": "凤山县",
    "451224": "东兰县",
    "451225": "罗城仫佬族自治县",
    "451226": "环江毛南族自治县",
    "451227": "巴马瑶族自治县",
    "451228": "都安瑶族自治县",
    "451229": "大化瑶族自治县",
    "451281": "宜州市"
  },
  "451300": {
    "451302": "兴宾区",
    "451321": "忻城县",
    "451322": "象州县",
    "451323": "武宣县",
    "451324": "金秀瑶族自治县",
    "451381": "合山市"
  },
  "451400": {
    "451402": "江州区",
    "451421": "扶绥县",
    "451422": "宁明县",
    "451423": "龙州县",
    "451424": "大新县",
    "451425": "天等县",
    "451481": "凭祥市"
  },
  "460000": {
    "460100": "海口市",
    "460200": "三亚市",
    "460300": "三沙市",
    "460400": "儋州市",
    "469001": "五指山市",
    "469002": "琼海市",
    "469005": "文昌市",
    "469006": "万宁市",
    "469007": "东方市",
    "469021": "定安县",
    "469022": "屯昌县",
    "469023": "澄迈县",
    "469024": "临高县",
    "469025": "白沙黎族自治县",
    "469026": "昌江黎族自治县",
    "469027": "乐东黎族自治县",
    "469028": "陵水黎族自治县",
    "469029": "保亭黎族苗族自治县",
    "469030": "琼中黎族苗族自治县"
  },
  "460100": {
    "460105": "秀英区",
    "460106": "龙华区",
    "460107": "琼山区",
    "460108": "美兰区"
  },
  "460200": {
    "460202": "海棠区",
    "460203": "吉阳区",
    "460204": "天涯区",
    "460205": "崖州区"
  },
  "500000": {
    "500100": "市辖区",
    "500200": "县"
  },
  "500100": {
    "500101": "万州区",
    "500102": "涪陵区",
    "500103": "渝中区",
    "500104": "大渡口区",
    "500105": "江北区",
    "500106": "沙坪坝区",
    "500107": "九龙坡区",
    "500108": "南岸区",
    "500109": "北碚区",
    "500110": "綦江区",
    "500111": "大足区",
    "500112": "渝北区",
    "500113": "巴南区",
    "500114": "黔江区",
    "500115": "长寿区",
    "500116": "江津区",
    "500117": "合川区",
    "500118": "永川区",
    "500119": "南川区",
    "500120": "璧山区",
    "500151": "铜梁区",
    "500152": "潼南区",
    "500153": "荣昌区",
    "500154": "开州区"
  },
  "500200": {
    "500228": "梁平县",
    "500229": "城口县",
    "500230": "丰都县",
    "500231": "垫江县",
    "500232": "武隆县",
    "500233": "忠县",
    "500235": "云阳县",
    "500236": "奉节县",
    "500237": "巫山县",
    "500238": "巫溪县",
    "500240": "石柱土家族自治县",
    "500241": "秀山土家族苗族自治县",
    "500242": "酉阳土家族苗族自治县",
    "500243": "彭水苗族土家族自治县"
  },
  "510000": {
    "510100": "成都市",
    "510300": "自贡市",
    "510400": "攀枝花市",
    "510500": "泸州市",
    "510600": "德阳市",
    "510700": "绵阳市",
    "510800": "广元市",
    "510900": "遂宁市",
    "511000": "内江市",
    "511100": "乐山市",
    "511300": "南充市",
    "511400": "眉山市",
    "511500": "宜宾市",
    "511600": "广安市",
    "511700": "达州市",
    "511800": "雅安市",
    "511900": "巴中市",
    "512000": "资阳市",
    "513200": "阿坝藏族羌族自治州",
    "513300": "甘孜藏族自治州",
    "513400": "凉山彝族自治州"
  },
  "510100": {
    "510104": "锦江区",
    "510105": "青羊区",
    "510106": "金牛区",
    "510107": "武侯区",
    "510108": "成华区",
    "510112": "龙泉驿区",
    "510113": "青白江区",
    "510114": "新都区",
    "510115": "温江区",
    "510116": "双流区",
    "510121": "金堂县",
    "510124": "郫县",
    "510129": "大邑县",
    "510131": "蒲江县",
    "510132": "新津县",
    "510181": "都江堰市",
    "510182": "彭州市",
    "510183": "邛崃市",
    "510184": "崇州市",
    "510185": "简阳市"
  },
  "510300": {
    "510302": "自流井区",
    "510303": "贡井区",
    "510304": "大安区",
    "510311": "沿滩区",
    "510321": "荣县",
    "510322": "富顺县"
  },
  "510400": {
    "510402": "东区",
    "510403": "西区",
    "510411": "仁和区",
    "510421": "米易县",
    "510422": "盐边县"
  },
  "510500": {
    "510502": "江阳区",
    "510503": "纳溪区",
    "510504": "龙马潭区",
    "510521": "泸县",
    "510522": "合江县",
    "510524": "叙永县",
    "510525": "古蔺县"
  },
  "510600": {
    "510603": "旌阳区",
    "510623": "中江县",
    "510626": "罗江县",
    "510681": "广汉市",
    "510682": "什邡市",
    "510683": "绵竹市"
  },
  "510700": {
    "510703": "涪城区",
    "510704": "游仙区",
    "510705": "安州区",
    "510722": "三台县",
    "510723": "盐亭县",
    "510725": "梓潼县",
    "510726": "北川羌族自治县",
    "510727": "平武县",
    "510781": "江油市"
  },
  "510800": {
    "510802": "利州区",
    "510811": "昭化区",
    "510812": "朝天区",
    "510821": "旺苍县",
    "510822": "青川县",
    "510823": "剑阁县",
    "510824": "苍溪县"
  },
  "510900": {
    "510903": "船山区",
    "510904": "安居区",
    "510921": "蓬溪县",
    "510922": "射洪县",
    "510923": "大英县"
  },
  "511000": {
    "511002": "市中区",
    "511011": "东兴区",
    "511024": "威远县",
    "511025": "资中县",
    "511028": "隆昌县"
  },
  "511100": {
    "511102": "市中区",
    "511111": "沙湾区",
    "511112": "五通桥区",
    "511113": "金口河区",
    "511123": "犍为县",
    "511124": "井研县",
    "511126": "夹江县",
    "511129": "沐川县",
    "511132": "峨边彝族自治县",
    "511133": "马边彝族自治县",
    "511181": "峨眉山市"
  },
  "511300": {
    "511302": "顺庆区",
    "511303": "高坪区",
    "511304": "嘉陵区",
    "511321": "南部县",
    "511322": "营山县",
    "511323": "蓬安县",
    "511324": "仪陇县",
    "511325": "西充县",
    "511381": "阆中市"
  },
  "511400": {
    "511402": "东坡区",
    "511403": "彭山区",
    "511421": "仁寿县",
    "511423": "洪雅县",
    "511424": "丹棱县",
    "511425": "青神县"
  },
  "511500": {
    "511502": "翠屏区",
    "511503": "南溪区",
    "511521": "宜宾县",
    "511523": "江安县",
    "511524": "长宁县",
    "511525": "高县",
    "511526": "珙县",
    "511527": "筠连县",
    "511528": "兴文县",
    "511529": "屏山县"
  },
  "511600": {
    "511602": "广安区",
    "511603": "前锋区",
    "511621": "岳池县",
    "511622": "武胜县",
    "511623": "邻水县",
    "511681": "华蓥市"
  },
  "511700": {
    "511702": "通川区",
    "511703": "达川区",
    "511722": "宣汉县",
    "511723": "开江县",
    "511724": "大竹县",
    "511725": "渠县",
    "511781": "万源市"
  },
  "511800": {
    "511802": "雨城区",
    "511803": "名山区",
    "511822": "荥经县",
    "511823": "汉源县",
    "511824": "石棉县",
    "511825": "天全县",
    "511826": "芦山县",
    "511827": "宝兴县"
  },
  "511900": {
    "511902": "巴州区",
    "511903": "恩阳区",
    "511921": "通江县",
    "511922": "南江县",
    "511923": "平昌县"
  },
  "512000": {
    "512002": "雁江区",
    "512021": "安岳县",
    "512022": "乐至县"
  },
  "513200": {
    "513201": "马尔康市",
    "513221": "汶川县",
    "513222": "理县",
    "513223": "茂县",
    "513224": "松潘县",
    "513225": "九寨沟县",
    "513226": "金川县",
    "513227": "小金县",
    "513228": "黑水县",
    "513230": "壤塘县",
    "513231": "阿坝县",
    "513232": "若尔盖县",
    "513233": "红原县"
  },
  "513300": {
    "513301": "康定市",
    "513322": "泸定县",
    "513323": "丹巴县",
    "513324": "九龙县",
    "513325": "雅江县",
    "513326": "道孚县",
    "513327": "炉霍县",
    "513328": "甘孜县",
    "513329": "新龙县",
    "513330": "德格县",
    "513331": "白玉县",
    "513332": "石渠县",
    "513333": "色达县",
    "513334": "理塘县",
    "513335": "巴塘县",
    "513336": "乡城县",
    "513337": "稻城县",
    "513338": "得荣县"
  },
  "513400": {
    "513401": "西昌市",
    "513422": "木里藏族自治县",
    "513423": "盐源县",
    "513424": "德昌县",
    "513425": "会理县",
    "513426": "会东县",
    "513427": "宁南县",
    "513428": "普格县",
    "513429": "布拖县",
    "513430": "金阳县",
    "513431": "昭觉县",
    "513432": "喜德县",
    "513433": "冕宁县",
    "513434": "越西县",
    "513435": "甘洛县",
    "513436": "美姑县",
    "513437": "雷波县"
  },
  "520000": {
    "520100": "贵阳市",
    "520200": "六盘水市",
    "520300": "遵义市",
    "520400": "安顺市",
    "520500": "毕节市",
    "520600": "铜仁市",
    "522300": "黔西南布依族苗族自治州",
    "522600": "黔东南苗族侗族自治州",
    "522700": "黔南布依族苗族自治州"
  },
  "520100": {
    "520102": "南明区",
    "520103": "云岩区",
    "520111": "花溪区",
    "520112": "乌当区",
    "520113": "白云区",
    "520115": "观山湖区",
    "520121": "开阳县",
    "520122": "息烽县",
    "520123": "修文县",
    "520181": "清镇市"
  },
  "520200": {
    "520201": "钟山区",
    "520203": "六枝特区",
    "520221": "水城县",
    "520222": "盘县"
  },
  "520300": {
    "520302": "红花岗区",
    "520303": "汇川区",
    "520304": "播州区",
    "520322": "桐梓县",
    "520323": "绥阳县",
    "520324": "正安县",
    "520325": "道真仡佬族苗族自治县",
    "520326": "务川仡佬族苗族自治县",
    "520327": "凤冈县",
    "520328": "湄潭县",
    "520329": "余庆县",
    "520330": "习水县",
    "520381": "赤水市",
    "520382": "仁怀市"
  },
  "520400": {
    "520402": "西秀区",
    "520403": "平坝区",
    "520422": "普定县",
    "520423": "镇宁布依族苗族自治县",
    "520424": "关岭布依族苗族自治县",
    "520425": "紫云苗族布依族自治县"
  },
  "520500": {
    "520502": "七星关区",
    "520521": "大方县",
    "520522": "黔西县",
    "520523": "金沙县",
    "520524": "织金县",
    "520525": "纳雍县",
    "520526": "威宁彝族回族苗族自治县",
    "520527": "赫章县"
  },
  "520600": {
    "520602": "碧江区",
    "520603": "万山区",
    "520621": "江口县",
    "520622": "玉屏侗族自治县",
    "520623": "石阡县",
    "520624": "思南县",
    "520625": "印江土家族苗族自治县",
    "520626": "德江县",
    "520627": "沿河土家族自治县",
    "520628": "松桃苗族自治县"
  },
  "522300": {
    "522301": "兴义市",
    "522322": "兴仁县",
    "522323": "普安县",
    "522324": "晴隆县",
    "522325": "贞丰县",
    "522326": "望谟县",
    "522327": "册亨县",
    "522328": "安龙县"
  },
  "522600": {
    "522601": "凯里市",
    "522622": "黄平县",
    "522623": "施秉县",
    "522624": "三穗县",
    "522625": "镇远县",
    "522626": "岑巩县",
    "522627": "天柱县",
    "522628": "锦屏县",
    "522629": "剑河县",
    "522630": "台江县",
    "522631": "黎平县",
    "522632": "榕江县",
    "522633": "从江县",
    "522634": "雷山县",
    "522635": "麻江县",
    "522636": "丹寨县"
  },
  "522700": {
    "522701": "都匀市",
    "522702": "福泉市",
    "522722": "荔波县",
    "522723": "贵定县",
    "522725": "瓮安县",
    "522726": "独山县",
    "522727": "平塘县",
    "522728": "罗甸县",
    "522729": "长顺县",
    "522730": "龙里县",
    "522731": "惠水县",
    "522732": "三都水族自治县"
  },
  "530000": {
    "530100": "昆明市",
    "530300": "曲靖市",
    "530400": "玉溪市",
    "530500": "保山市",
    "530600": "昭通市",
    "530700": "丽江市",
    "530800": "普洱市",
    "530900": "临沧市",
    "532300": "楚雄彝族自治州",
    "532500": "红河哈尼族彝族自治州",
    "532600": "文山壮族苗族自治州",
    "532800": "西双版纳傣族自治州",
    "532900": "大理白族自治州",
    "533100": "德宏傣族景颇族自治州",
    "533300": "怒江傈僳族自治州",
    "533400": "迪庆藏族自治州"
  },
  "530100": {
    "530102": "五华区",
    "530103": "盘龙区",
    "530111": "官渡区",
    "530112": "西山区",
    "530113": "东川区",
    "530114": "呈贡区",
    "530122": "晋宁县",
    "530124": "富民县",
    "530125": "宜良县",
    "530126": "石林彝族自治县",
    "530127": "嵩明县",
    "530128": "禄劝彝族苗族自治县",
    "530129": "寻甸回族彝族自治县",
    "530181": "安宁市"
  },
  "530300": {
    "530302": "麒麟区",
    "530303": "沾益区",
    "530321": "马龙县",
    "530322": "陆良县",
    "530323": "师宗县",
    "530324": "罗平县",
    "530325": "富源县",
    "530326": "会泽县",
    "530381": "宣威市"
  },
  "530400": {
    "530402": "红塔区",
    "530403": "江川区",
    "530422": "澄江县",
    "530423": "通海县",
    "530424": "华宁县",
    "530425": "易门县",
    "530426": "峨山彝族自治县",
    "530427": "新平彝族傣族自治县",
    "530428": "元江哈尼族彝族傣族自治县"
  },
  "530500": {
    "530502": "隆阳区",
    "530521": "施甸县",
    "530523": "龙陵县",
    "530524": "昌宁县",
    "530581": "腾冲市"
  },
  "530600": {
    "530602": "昭阳区",
    "530621": "鲁甸县",
    "530622": "巧家县",
    "530623": "盐津县",
    "530624": "大关县",
    "530625": "永善县",
    "530626": "绥江县",
    "530627": "镇雄县",
    "530628": "彝良县",
    "530629": "威信县",
    "530630": "水富县"
  },
  "530700": {
    "530702": "古城区",
    "530721": "玉龙纳西族自治县",
    "530722": "永胜县",
    "530723": "华坪县",
    "530724": "宁蒗彝族自治县"
  },
  "530800": {
    "530802": "思茅区",
    "530821": "宁洱哈尼族彝族自治县",
    "530822": "墨江哈尼族自治县",
    "530823": "景东彝族自治县",
    "530824": "景谷傣族彝族自治县",
    "530825": "镇沅彝族哈尼族拉祜族自治县",
    "530826": "江城哈尼族彝族自治县",
    "530827": "孟连傣族拉祜族佤族自治县",
    "530828": "澜沧拉祜族自治县",
    "530829": "西盟佤族自治县"
  },
  "530900": {
    "530902": "临翔区",
    "530921": "凤庆县",
    "530922": "云县",
    "530923": "永德县",
    "530924": "镇康县",
    "530925": "双江拉祜族佤族布朗族傣族自治县",
    "530926": "耿马傣族佤族自治县",
    "530927": "沧源佤族自治县"
  },
  "532300": {
    "532301": "楚雄市",
    "532322": "双柏县",
    "532323": "牟定县",
    "532324": "南华县",
    "532325": "姚安县",
    "532326": "大姚县",
    "532327": "永仁县",
    "532328": "元谋县",
    "532329": "武定县",
    "532331": "禄丰县"
  },
  "532500": {
    "532501": "个旧市",
    "532502": "开远市",
    "532503": "蒙自市",
    "532504": "弥勒市",
    "532523": "屏边苗族自治县",
    "532524": "建水县",
    "532525": "石屏县",
    "532527": "泸西县",
    "532528": "元阳县",
    "532529": "红河县",
    "532530": "金平苗族瑶族傣族自治县",
    "532531": "绿春县",
    "532532": "河口瑶族自治县"
  },
  "532600": {
    "532601": "文山市",
    "532622": "砚山县",
    "532623": "西畴县",
    "532624": "麻栗坡县",
    "532625": "马关县",
    "532626": "丘北县",
    "532627": "广南县",
    "532628": "富宁县"
  },
  "532800": {
    "532801": "景洪市",
    "532822": "勐海县",
    "532823": "勐腊县"
  },
  "532900": {
    "532901": "大理市",
    "532922": "漾濞彝族自治县",
    "532923": "祥云县",
    "532924": "宾川县",
    "532925": "弥渡县",
    "532926": "南涧彝族自治县",
    "532927": "巍山彝族回族自治县",
    "532928": "永平县",
    "532929": "云龙县",
    "532930": "洱源县",
    "532931": "剑川县",
    "532932": "鹤庆县"
  },
  "533100": {
    "533102": "瑞丽市",
    "533103": "芒市",
    "533122": "梁河县",
    "533123": "盈江县",
    "533124": "陇川县"
  },
  "533300": {
    "533301": "泸水市",
    "533323": "福贡县",
    "533324": "贡山独龙族怒族自治县",
    "533325": "兰坪白族普米族自治县"
  },
  "533400": {
    "533401": "香格里拉市",
    "533422": "德钦县",
    "533423": "维西傈僳族自治县"
  },
  "540000": {
    "540100": "拉萨市",
    "540200": "日喀则市",
    "540300": "昌都市",
    "540400": "林芝市",
    "540500": "山南市",
    "542400": "那曲地区",
    "542500": "阿里地区"
  },
  "540100": {
    "540102": "城关区",
    "540103": "堆龙德庆区",
    "540121": "林周县",
    "540122": "当雄县",
    "540123": "尼木县",
    "540124": "曲水县",
    "540126": "达孜县",
    "540127": "墨竹工卡县"
  },
  "540200": {
    "540202": "桑珠孜区",
    "540221": "南木林县",
    "540222": "江孜县",
    "540223": "定日县",
    "540224": "萨迦县",
    "540225": "拉孜县",
    "540226": "昂仁县",
    "540227": "谢通门县",
    "540228": "白朗县",
    "540229": "仁布县",
    "540230": "康马县",
    "540231": "定结县",
    "540232": "仲巴县",
    "540233": "亚东县",
    "540234": "吉隆县",
    "540235": "聂拉木县",
    "540236": "萨嘎县",
    "540237": "岗巴县"
  },
  "540300": {
    "540302": "卡若区",
    "540321": "江达县",
    "540322": "贡觉县",
    "540323": "类乌齐县",
    "540324": "丁青县",
    "540325": "察雅县",
    "540326": "八宿县",
    "540327": "左贡县",
    "540328": "芒康县",
    "540329": "洛隆县",
    "540330": "边坝县"
  },
  "540400": {
    "540402": "巴宜区",
    "540421": "工布江达县",
    "540422": "米林县",
    "540423": "墨脱县",
    "540424": "波密县",
    "540425": "察隅县",
    "540426": "朗县"
  },
  "540500": {
    "540502": "乃东区",
    "540521": "扎囊县",
    "540522": "贡嘎县",
    "540523": "桑日县",
    "540524": "琼结县",
    "540525": "曲松县",
    "540526": "措美县",
    "540527": "洛扎县",
    "540528": "加查县",
    "540529": "隆子县",
    "540530": "错那县",
    "540531": "浪卡子县"
  },
  "542400": {
    "542421": "那曲县",
    "542422": "嘉黎县",
    "542423": "比如县",
    "542424": "聂荣县",
    "542425": "安多县",
    "542426": "申扎县",
    "542427": "索县",
    "542428": "班戈县",
    "542429": "巴青县",
    "542430": "尼玛县",
    "542431": "双湖县"
  },
  "542500": {
    "542521": "普兰县",
    "542522": "札达县",
    "542523": "噶尔县",
    "542524": "日土县",
    "542525": "革吉县",
    "542526": "改则县",
    "542527": "措勤县"
  },
  "610000": {
    "610100": "西安市",
    "610200": "铜川市",
    "610300": "宝鸡市",
    "610400": "咸阳市",
    "610500": "渭南市",
    "610600": "延安市",
    "610700": "汉中市",
    "610800": "榆林市",
    "610900": "安康市",
    "611000": "商洛市"
  },
  "610100": {
    "610102": "新城区",
    "610103": "碑林区",
    "610104": "莲湖区",
    "610111": "灞桥区",
    "610112": "未央区",
    "610113": "雁塔区",
    "610114": "阎良区",
    "610115": "临潼区",
    "610116": "长安区",
    "610117": "高陵区",
    "610122": "蓝田县",
    "610124": "周至县",
    "610125": "户县"
  },
  "610200": {
    "610202": "王益区",
    "610203": "印台区",
    "610204": "耀州区",
    "610222": "宜君县"
  },
  "610300": {
    "610302": "渭滨区",
    "610303": "金台区",
    "610304": "陈仓区",
    "610322": "凤翔县",
    "610323": "岐山县",
    "610324": "扶风县",
    "610326": "眉县",
    "610327": "陇县",
    "610328": "千阳县",
    "610329": "麟游县",
    "610330": "凤县",
    "610331": "太白县"
  },
  "610400": {
    "610402": "秦都区",
    "610403": "杨陵区",
    "610404": "渭城区",
    "610422": "三原县",
    "610423": "泾阳县",
    "610424": "乾县",
    "610425": "礼泉县",
    "610426": "永寿县",
    "610427": "彬县",
    "610428": "长武县",
    "610429": "旬邑县",
    "610430": "淳化县",
    "610431": "武功县",
    "610481": "兴平市"
  },
  "610500": {
    "610502": "临渭区",
    "610503": "华州区",
    "610522": "潼关县",
    "610523": "大荔县",
    "610524": "合阳县",
    "610525": "澄城县",
    "610526": "蒲城县",
    "610527": "白水县",
    "610528": "富平县",
    "610581": "韩城市",
    "610582": "华阴市"
  },
  "610600": {
    "610602": "宝塔区",
    "610603": "安塞区",
    "610621": "延长县",
    "610622": "延川县",
    "610623": "子长县",
    "610625": "志丹县",
    "610626": "吴起县",
    "610627": "甘泉县",
    "610628": "富县",
    "610629": "洛川县",
    "610630": "宜川县",
    "610631": "黄龙县",
    "610632": "黄陵县"
  },
  "610700": {
    "610702": "汉台区",
    "610721": "南郑县",
    "610722": "城固县",
    "610723": "洋县",
    "610724": "西乡县",
    "610725": "勉县",
    "610726": "宁强县",
    "610727": "略阳县",
    "610728": "镇巴县",
    "610729": "留坝县",
    "610730": "佛坪县"
  },
  "610800": {
    "610802": "榆阳区",
    "610803": "横山区",
    "610821": "神木县",
    "610822": "府谷县",
    "610824": "靖边县",
    "610825": "定边县",
    "610826": "绥德县",
    "610827": "米脂县",
    "610828": "佳县",
    "610829": "吴堡县",
    "610830": "清涧县",
    "610831": "子洲县"
  },
  "610900": {
    "610902": "汉滨区",
    "610921": "汉阴县",
    "610922": "石泉县",
    "610923": "宁陕县",
    "610924": "紫阳县",
    "610925": "岚皋县",
    "610926": "平利县",
    "610927": "镇坪县",
    "610928": "旬阳县",
    "610929": "白河县"
  },
  "611000": {
    "611002": "商州区",
    "611021": "洛南县",
    "611022": "丹凤县",
    "611023": "商南县",
    "611024": "山阳县",
    "611025": "镇安县",
    "611026": "柞水县"
  },
  "620000": {
    "620100": "兰州市",
    "620200": "嘉峪关市",
    "620300": "金昌市",
    "620400": "白银市",
    "620500": "天水市",
    "620600": "武威市",
    "620700": "张掖市",
    "620800": "平凉市",
    "620900": "酒泉市",
    "621000": "庆阳市",
    "621100": "定西市",
    "621200": "陇南市",
    "622900": "临夏回族自治州",
    "623000": "甘南藏族自治州"
  },
  "620100": {
    "620102": "城关区",
    "620103": "七里河区",
    "620104": "西固区",
    "620105": "安宁区",
    "620111": "红古区",
    "620121": "永登县",
    "620122": "皋兰县",
    "620123": "榆中县"
  },
  "620300": {
    "620302": "金川区",
    "620321": "永昌县"
  },
  "620400": {
    "620402": "白银区",
    "620403": "平川区",
    "620421": "靖远县",
    "620422": "会宁县",
    "620423": "景泰县"
  },
  "620500": {
    "620502": "秦州区",
    "620503": "麦积区",
    "620521": "清水县",
    "620522": "秦安县",
    "620523": "甘谷县",
    "620524": "武山县",
    "620525": "张家川回族自治县"
  },
  "620600": {
    "620602": "凉州区",
    "620621": "民勤县",
    "620622": "古浪县",
    "620623": "天祝藏族自治县"
  },
  "620700": {
    "620702": "甘州区",
    "620721": "肃南裕固族自治县",
    "620722": "民乐县",
    "620723": "临泽县",
    "620724": "高台县",
    "620725": "山丹县"
  },
  "620800": {
    "620802": "崆峒区",
    "620821": "泾川县",
    "620822": "灵台县",
    "620823": "崇信县",
    "620824": "华亭县",
    "620825": "庄浪县",
    "620826": "静宁县"
  },
  "620900": {
    "620902": "肃州区",
    "620921": "金塔县",
    "620922": "瓜州县",
    "620923": "肃北蒙古族自治县",
    "620924": "阿克塞哈萨克族自治县",
    "620981": "玉门市",
    "620982": "敦煌市"
  },
  "621000": {
    "621002": "西峰区",
    "621021": "庆城县",
    "621022": "环县",
    "621023": "华池县",
    "621024": "合水县",
    "621025": "正宁县",
    "621026": "宁县",
    "621027": "镇原县"
  },
  "621100": {
    "621102": "安定区",
    "621121": "通渭县",
    "621122": "陇西县",
    "621123": "渭源县",
    "621124": "临洮县",
    "621125": "漳县",
    "621126": "岷县"
  },
  "621200": {
    "621202": "武都区",
    "621221": "成县",
    "621222": "文县",
    "621223": "宕昌县",
    "621224": "康县",
    "621225": "西和县",
    "621226": "礼县",
    "621227": "徽县",
    "621228": "两当县"
  },
  "622900": {
    "622901": "临夏市",
    "622921": "临夏县",
    "622922": "康乐县",
    "622923": "永靖县",
    "622924": "广河县",
    "622925": "和政县",
    "622926": "东乡族自治县",
    "622927": "积石山保安族东乡族撒拉族自治县"
  },
  "623000": {
    "623001": "合作市",
    "623021": "临潭县",
    "623022": "卓尼县",
    "623023": "舟曲县",
    "623024": "迭部县",
    "623025": "玛曲县",
    "623026": "碌曲县",
    "623027": "夏河县"
  },
  "630000": {
    "630100": "西宁市",
    "630200": "海东市",
    "632200": "海北藏族自治州",
    "632300": "黄南藏族自治州",
    "632500": "海南藏族自治州",
    "632600": "果洛藏族自治州",
    "632700": "玉树藏族自治州",
    "632800": "海西蒙古族藏族自治州"
  },
  "630100": {
    "630102": "城东区",
    "630103": "城中区",
    "630104": "城西区",
    "630105": "城北区",
    "630121": "大通回族土族自治县",
    "630122": "湟中县",
    "630123": "湟源县"
  },
  "630200": {
    "630202": "乐都区",
    "630203": "平安区",
    "630222": "民和回族土族自治县",
    "630223": "互助土族自治县",
    "630224": "化隆回族自治县",
    "630225": "循化撒拉族自治县"
  },
  "632200": {
    "632221": "门源回族自治县",
    "632222": "祁连县",
    "632223": "海晏县",
    "632224": "刚察县"
  },
  "632300": {
    "632321": "同仁县",
    "632322": "尖扎县",
    "632323": "泽库县",
    "632324": "河南蒙古族自治县"
  },
  "632500": {
    "632521": "共和县",
    "632522": "同德县",
    "632523": "贵德县",
    "632524": "兴海县",
    "632525": "贵南县"
  },
  "632600": {
    "632621": "玛沁县",
    "632622": "班玛县",
    "632623": "甘德县",
    "632624": "达日县",
    "632625": "久治县",
    "632626": "玛多县"
  },
  "632700": {
    "632701": "玉树市",
    "632722": "杂多县",
    "632723": "称多县",
    "632724": "治多县",
    "632725": "囊谦县",
    "632726": "曲麻莱县"
  },
  "632800": {
    "632801": "格尔木市",
    "632802": "德令哈市",
    "632821": "乌兰县",
    "632822": "都兰县",
    "632823": "天峻县"
  },
  "640000": {
    "640100": "银川市",
    "640200": "石嘴山市",
    "640300": "吴忠市",
    "640400": "固原市",
    "640500": "中卫市"
  },
  "640100": {
    "640104": "兴庆区",
    "640105": "西夏区",
    "640106": "金凤区",
    "640121": "永宁县",
    "640122": "贺兰县",
    "640181": "灵武市"
  },
  "640200": {
    "640202": "大武口区",
    "640205": "惠农区",
    "640221": "平罗县"
  },
  "640300": {
    "640302": "利通区",
    "640303": "红寺堡区",
    "640323": "盐池县",
    "640324": "同心县",
    "640381": "青铜峡市"
  },
  "640400": {
    "640402": "原州区",
    "640422": "西吉县",
    "640423": "隆德县",
    "640424": "泾源县",
    "640425": "彭阳县"
  },
  "640500": {
    "640502": "沙坡头区",
    "640521": "中宁县",
    "640522": "海原县"
  },
  "650000": {
    "650100": "乌鲁木齐市",
    "650200": "克拉玛依市",
    "650400": "吐鲁番市",
    "650500": "哈密市",
    "652300": "昌吉回族自治州",
    "652700": "博尔塔拉蒙古自治州",
    "652800": "巴音郭楞蒙古自治州",
    "652900": "阿克苏地区",
    "653000": "克孜勒苏柯尔克孜自治州",
    "653100": "喀什地区",
    "653200": "和田地区",
    "654000": "伊犁哈萨克自治州",
    "654200": "塔城地区",
    "654300": "阿勒泰地区",
    "659001": "石河子市",
    "659002": "阿拉尔市",
    "659003": "图木舒克市",
    "659004": "五家渠市",
    "659006": "铁门关市"
  },
  "650100": {
    "650102": "天山区",
    "650103": "沙依巴克区",
    "650104": "新市区",
    "650105": "水磨沟区",
    "650106": "头屯河区",
    "650107": "达坂城区",
    "650109": "米东区",
    "650121": "乌鲁木齐县"
  },
  "650200": {
    "650202": "独山子区",
    "650203": "克拉玛依区",
    "650204": "白碱滩区",
    "650205": "乌尔禾区"
  },
  "650400": {
    "650402": "高昌区",
    "650421": "鄯善县",
    "650422": "托克逊县"
  },
  "650500": {
    "650502": "伊州区",
    "650521": "巴里坤哈萨克自治县",
    "650522": "伊吾县"
  },
  "652300": {
    "652301": "昌吉市",
    "652302": "阜康市",
    "652323": "呼图壁县",
    "652324": "玛纳斯县",
    "652325": "奇台县",
    "652327": "吉木萨尔县",
    "652328": "木垒哈萨克自治县"
  },
  "652700": {
    "652701": "博乐市",
    "652702": "阿拉山口市",
    "652722": "精河县",
    "652723": "温泉县"
  },
  "652800": {
    "652801": "库尔勒市",
    "652822": "轮台县",
    "652823": "尉犁县",
    "652824": "若羌县",
    "652825": "且末县",
    "652826": "焉耆回族自治县",
    "652827": "和静县",
    "652828": "和硕县",
    "652829": "博湖县"
  },
  "652900": {
    "652901": "阿克苏市",
    "652922": "温宿县",
    "652923": "库车县",
    "652924": "沙雅县",
    "652925": "新和县",
    "652926": "拜城县",
    "652927": "乌什县",
    "652928": "阿瓦提县",
    "652929": "柯坪县"
  },
  "653000": {
    "653001": "阿图什市",
    "653022": "阿克陶县",
    "653023": "阿合奇县",
    "653024": "乌恰县"
  },
  "653100": {
    "653101": "喀什市",
    "653121": "疏附县",
    "653122": "疏勒县",
    "653123": "英吉沙县",
    "653124": "泽普县",
    "653125": "莎车县",
    "653126": "叶城县",
    "653127": "麦盖提县",
    "653128": "岳普湖县",
    "653129": "伽师县",
    "653130": "巴楚县",
    "653131": "塔什库尔干塔吉克自治县"
  },
  "653200": {
    "653201": "和田市",
    "653221": "和田县",
    "653222": "墨玉县",
    "653223": "皮山县",
    "653224": "洛浦县",
    "653225": "策勒县",
    "653226": "于田县",
    "653227": "民丰县"
  },
  "654000": {
    "654002": "伊宁市",
    "654003": "奎屯市",
    "654004": "霍尔果斯市",
    "654021": "伊宁县",
    "654022": "察布查尔锡伯自治县",
    "654023": "霍城县",
    "654024": "巩留县",
    "654025": "新源县",
    "654026": "昭苏县",
    "654027": "特克斯县",
    "654028": "尼勒克县"
  },
  "654200": {
    "654201": "塔城市",
    "654202": "乌苏市",
    "654221": "额敏县",
    "654223": "沙湾县",
    "654224": "托里县",
    "654225": "裕民县",
    "654226": "和布克赛尔蒙古自治县"
  },
  "654300": {
    "654301": "阿勒泰市",
    "654321": "布尔津县",
    "654322": "富蕴县",
    "654323": "福海县",
    "654324": "哈巴河县",
    "654325": "青河县",
    "654326": "吉木乃县"
  },
  "810000": {
    "810001": "中西區",
    "810002": "灣仔區",
    "810003": "東區",
    "810004": "南區",
    "810005": "油尖旺區",
    "810006": "深水埗區",
    "810007": "九龍城區",
    "810008": "黃大仙區",
    "810009": "觀塘區",
    "810010": "荃灣區",
    "810011": "屯門區",
    "810012": "元朗區",
    "810013": "北區",
    "810014": "大埔區",
    "810015": "西貢區",
    "810016": "沙田區",
    "810017": "葵青區",
    "810018": "離島區"
  },
  "820000": {
    "820001": "花地瑪堂區",
    "820002": "花王堂區",
    "820003": "望德堂區",
    "820004": "大堂區",
    "820005": "風順堂區",
    "820006": "嘉模堂區",
    "820007": "路氹填海區",
    "820008": "聖方濟各堂區"
  }
};
'use strict';

;(function ($, $$) {
    'use strict';

    var forStyle = function forStyle(position) {
        var cssStr = '';
        for (var key in position) {
            if (position.hasOwnProperty(key)) cssStr += key + ':' + position[key] + ';';
        }
        return cssStr;
    };

    var isMobile = window.navigator.userAgent.match(/Mobile/) && window.navigator.userAgent.match(/Mobile/)[0] === 'Mobile',
        eventype = isMobile ? 'touchstart' : 'mousedown',
        duration = 750;

    $.ready().then(function () {
        document._.on(eventype, '.btn', function (e) {
            if (this.classList.contains('btn') && !this.classList.contains('disabled')) {
                // Prepare the dom
                var rippleEffect = document.createElement('span');

                rippleEffect.className = 'ripple';
                if (this.classList.contains('outline')) {
                    rippleEffect.className = 'ripple rdark';
                }
                this.appendChild(rippleEffect);

                var el = this.getBoundingClientRect(),
                    position = {
                    width: el.width * 2 + 'px',
                    height: el.width * 2 + 'px',
                    top: e.clientY - el.top - el.width + 'px',
                    left: e.clientX - el.left - el.width + 'px',
                    transition: 'transform ' + duration + 'ms, opacity ' + duration + 'ms'
                };
                rippleEffect.setAttribute('style', forStyle(position));

                position['opacity'] = 0;
                position['transform'] = 'scale3d(1, 1, 1)';
                rippleEffect.setAttribute('style', forStyle(position));

                setTimeout(function () {
                    if (rippleEffect && rippleEffect.parentNode) {
                        rippleEffect.parentNode.removeChild(rippleEffect);
                    }
                }, duration);
            }
        });

        // start
        var pItem = document.getElementsByClassName('progressive replace'),
            timer;

        // throttled scroll/resize
        function scroller(e) {
            timer = timer || setTimeout(function () {
                timer = null;
                requestAnimationFrame(inView);
            }, 300);
        }

        // image in view?
        function inView() {
            var wT = window.pageYOffset,
                wB = wT + window.innerHeight,
                cRect,
                pT,
                pB,
                p = 0;

            while (p < pItem.length) {
                cRect = pItem[p].getBoundingClientRect();
                pT = wT + cRect.top;
                pB = pT + cRect.height;

                if (wT < pB && wB > pT) {
                    loadFullImage(pItem[p]);
                    pItem[p].classList.remove('replace');
                } else {
                    p++;
                }
            }
        }

        // replace with full image
        function loadFullImage(item) {
            if (!item || !item.getAttribute('data-href')) return;

            // load image
            var img = new Image();

            if (item.dataset) {
                img.srcset = item.dataset.srcset || '';
                img.sizes = item.dataset.sizes || '';
            }

            img.src = item.getAttribute('data-href');
            img.className = 'reveal';
            if (img.complete) addImg();else img.onload = addImg;

            // replace image
            function addImg() {
                // disable click
                // item.addEventListener('click', function(e) {
                //     e.preventDefault();
                // }, false)

                // add full image
                item.appendChild(img).addEventListener('animationend', function (e) {
                    // remove preview image
                    var pImg = item.querySelector && item.querySelector('img.preview');
                    if (pImg) {
                        e.target.alt = pImg.alt || '';
                        item.removeChild(pImg);
                        e.target.classList.remove('reveal');
                    }
                });
            }
        }

        // progressive-image.js
        window.addEventListener('scroll', scroller, false);
        window.addEventListener('resize', scroller, false);
        inView();
    });
})(Bliss, Bliss.$);
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Msgbox = function ($, $$) {
    // Constants
    var NAME = 'msgbox';
    var VERSION = '1.0.0';
    var DATA_KEY = 'oc.msgbox';

    var Event = {
        CLICK: Util.getEvent('click')
    };

    var Default = {
        type: 'POST',
        textY: '\u786E\u5B9A',
        textN: '\u53D6\u6D88',
        close: true,
        title: '\u63D0\u793A',
        num: 1
        // custom: [{
        // 	text: '你好',
        // 	class: 'btn t-red',
        // 	click: function(){
        // 		alert('go')
        // 	}
        // }]
        // success: function(){
        // 	$.fn.msgbox('hide')
        // },
        // error: function(){
        // 	$.fn.msgbox('hide')
        // }
        //bind: function(btn, target) 绑定验证，btn确定按钮，target验证区域，必须是html形式
    };

    var DefaultType = {
        type: 'string',
        textY: 'string',
        textN: 'string',
        close: 'boolean',
        num: 'number'
    };

    var ClassName = {
        SHOW: 'showbox',
        HIDE: 'hidbox',
        MSGHD: 'msgboxhide',
        LOAD: 'loading'

        // Class Definition
    };
    var Msgbox = function () {
        function Msgbox(element, config) {
            _classCallCheck(this, Msgbox);

            this.$el = element;
            this._config = this._getConfig(config);
            this._init();
        }

        // getters


        _createClass(Msgbox, [{
            key: 'dispose',


            // public
            value: function dispose() {
                $(this.$el).off(Event.CLICK);
                $.removeData(this.$el, DATA_KEY);

                this._config = null;
            }

            // private

        }, {
            key: '_getConfig',
            value: function _getConfig(config) {
                config = $.extends({}, Default, config);
                Util.typeCheckConfig(NAME, config, DefaultType);
                return config;
            }
        }, {
            key: '_hide',
            value: function _hide() {
                var ops = this._config;

                if (ops.$div) {
                    ops.$div._.addClass(ClassName.MSGHD);
                    ops.$msgctx._.addClass(ClassName.HIDE);
                    this._requFrame();
                }
            }
        }, {
            key: '_requFrame',
            value: function _requFrame() {
                var requFrame = void 0;
                var ops = this._config;

                function closeDone() {
                    if (ops.$div._.style('visibility') === 'hidden') {
                        cancelAnimationFrame(requFrame);
                        ops.$div._.remove();
                        ops.$div = null;
                        ops.$msgctx = null;
                        ops.$msgdiv = null;
                        ops = null;
                        requFrame = null;
                    } else {
                        requFrame = requestAnimationFrame(closeDone);
                    }
                }

                requFrame = requestAnimationFrame(closeDone);
            }
        }, {
            key: '_success',
            value: function _success() {
                var ops = this._config;

                if (ops.success) {
                    ops.success();
                } else {
                    this._hide();
                }
            }
        }, {
            key: '_error',
            value: function _error() {
                var ops = this._config;

                if (ops.error) {
                    ops.error();
                } else {
                    this._hide();
                }
            }
        }, {
            key: '_init',
            value: function _init() {
                var _this = this;
                var ops = _this._config;

                var $div = $('<div class="msgbox">\n                    <span class="loading-close"></span>\n                    <div class="msgctx">\n                        <div class="msgbar">\n                            ' + ops.title + '\n                            <span class="close"></span>\n                        </div>\n                        <div class="msgdiv"></div>\n                    </div>\n                </div>'),
                    $msgctx = $div.querySelector('.msgctx'),
                    $msgdiv = $div.querySelector('.msgdiv');

                var $btn = $('<div class="msgbtn"></div>'),
                    $btn1 = $('<button type="button" class="btn msgbtn-y" dark>' + ops.textY + '</button>'),
                    $btn2 = $('<button type="button" class="btn msgbtn-n" dark>' + ops.textN + '</button>');

                if (window.screen.width <= 480) {
                    ops.w = '80%';
                }

                if (window.screen.height - 127 < Number(ops.h)) {
                    ops.h = '95%';
                }

                if (ops.url) {
                    doAjax();
                } else {
                    if (ops.html) {
                        $msgdiv._.append(ops.html);
                    } else {
                        ops.w = ops.w || 280;
                        ops.num = ops.num || 1;
                        $msgdiv.innerHTML = ops.text;
                    }
                    $msgctx._.addClass(ClassName.SHOW);
                }

                var $btnh;
                if (ops.num && !ops.custom) {
                    $btn1.onclick = function (event) {
                        _this._success();
                    };
                    $btn._.append($btn1);
                    if (ops.num === 2) {
                        $btn2.onclick = function (event) {
                            _this._error();
                        };
                        $btn._.append($btn2);
                    }

                    if (ops.bind) {
                        $btn1._.off('click');
                        $btnh = $btn1;
                        if (!ops.url) {
                            ops.bind($btn1, $msgdiv);
                        }
                    }
                } else {
                    var custom = ops.custom;
                    for (var i = 0; i < custom.length; i++) {
                        var data = custom[i],
                            $button = $('<button type="button" class="btn ' + data.class + '" dark>' + data.text + '</button>');

                        $btnh = $button;
                        $btn._.append($button);
                        if (data.bind && !ops.url) {
                            data.bind($button, $msgdiv);
                        } else {
                            if (data.clickfn) {
                                $button.onclick = data.clickfn;
                            } else {
                                $button.onclick = function () {
                                    _this._hide();
                                };
                            }
                        }
                        $button = null;
                    }
                }

                $msgctx._.append($btn);

                $msgctx._.style({
                    width: ops.w + 'px',
                    height: ops.h + 'px'
                });

                $div.querySelector('.loading-close').onclick = function () {
                    _this._hide();
                };

                if (ops.close) {
                    $div.querySelector('.close').onclick = function () {
                        _this._hide();
                    };
                } else {
                    $div.querySelector('.close')._.remove();
                }

                function doAjax() {
                    $div._.addClass(ClassName.LOAD)._.removeClass('loaderror');

                    $.fetch(ops.url, {
                        data: ops.data,
                        responseType: 'html'
                    }).then(function (data) {
                        $msgdiv.innerHTML = data;
                        $msgctx.addClass(ClassName.SHOW);
                        $div.removeClass(ClassName.LOAD);
                        if (ops.bind) {
                            ops.bind($btnh, $msgdiv);
                        }
                        if (ops.done) {
                            ops.done($msgdiv);
                        }
                    }).catch(function (error) {
                        $div._.addClass('loaderror');
                        if (!$div._.find('.errorshow')) {
                            var loadero = $('<div class="errorshow text-center">\n                            <p>\u52A0\u8F7D\u5931\u8D25</p>\n                            <button type="button" class="btn">\u91CD\u8BD5</button>\n                            </div>');

                            loadero._.find('button').onclick = function (event) {
                                event.preventDefault();
                                doAjax();
                            };
                            $div._.append(loadero);
                        }
                    });
                }

                $('body')._.append($div);
                ops.$div = $div;
                ops.$msgctx = $msgctx;
                ops.$msgdiv = $msgdiv;
            }

            // static

        }], [{
            key: '_interface',
            value: function _interface(config) {
                function msgRemove() {
                    var _this2 = this;

                    setTimeout(function () {
                        _this2._.remove();
                    }, 1000);
                }

                var _config = $.extends({}, Default, config);

                if ((typeof config === 'undefined' ? 'undefined' : _typeof(config)) === 'object') {
                    var data = new Msgbox(this, _config);
                } else {
                    var str = '.';
                    if (config === 'last') {
                        str = '.msgbox:last';
                    }
                    var msgbox = $$('.msgbox');
                    if (msgbox.length > 0) {
                        var i = 0;
                        if (config === 'last') {
                            i = msgbox.length - 1;
                        }

                        for (; i < msgbox.length; i++) {
                            msgbox[i]._.addClass(ClassName.MSGHD).querySelector('.msgctx')._.addClass(ClassName.HIDE);
                            msgRemove.apply(msgbox[i]);
                        }
                    }
                }
            }
        }, {
            key: 'VERSION',
            get: function get() {
                return VERSION;
            }
        }]);

        return Msgbox;
    }();

    // jQuery


    $.fn[NAME] = Msgbox._interface;
    $.fn[NAME].Constructor = Msgbox;

    return Msgbox;
}(Bliss, Bliss.$); /**
                    * msgbox
                    * @param String url ajax请求地址
                    * @param String type ajax请求类型
                    * @param Function success 按钮点击确定方法
                    * @param Function error 按钮点击取消方法
                    * @param String html 节点类
                    * @param String text 显示内容文字
                    * @param Number num 显示按钮个数
                    * @param String textY 按钮1文字
                    * @param String textN 按钮2文字
                    * @param Number w 窗口的宽
                    * @param Number h 窗口的高
                    * @param Boolean close 关闭按钮
                    * @param String title 窗口标题
                    * @returns null or data
                    * @author Dr.Who
                    * @editTime 2016-11-15
                    * @use $.fn.msgbox()
                    */
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Toast = function ($, $$) {
    // Constants
    var NAME = 'toast';
    var VERSION = '1.0.0';
    var DATA_KEY = 'oc.toast';

    var Event = {
        CLICK: Util.getEvent('click')
    };

    var Default = {
        text: 'center',
        type: '',
        dect: 'top-right',
        auto: true
    };

    var DefaultType = {
        text: 'string',
        type: 'string',
        dect: 'string',
        auto: 'bool'

        // Class Definition
    };
    var Toast = function () {
        function Toast(element, config) {
            _classCallCheck(this, Toast);

            this._config = this._getConfig(config);
            this._init();
        }

        // getters


        _createClass(Toast, [{
            key: 'dispose',


            // public
            value: function dispose() {
                $(this.$el).off(Event.CLICK);
                $.removeData(this.$el, DATA_KEY);

                this._config = null;
            }

            // private

        }, {
            key: '_getConfig',
            value: function _getConfig(config) {
                config = $.extends({}, Default, config);
                Util.typeCheckConfig(NAME, config, DefaultType);
                return config;
            }
        }, {
            key: '_init',
            value: function _init() {
                var _this = this;
                var ops = _this._config,
                    type = '';

                function closed() {
                    $div._.addClass('toastout');
                    setTimeout(function () {
                        $div._.remove();
                    }, 500);
                }

                if (ops.type === 'success' || ops.type === 'warning' || ops.type === 'info' || ops.type === 'error') {
                    type = '<div class="notic n' + ops.type + '">&nbsp;</div>';
                }

                var $div = $('<div class="toast clearfix">' + type + '<div class="ctx">' + ops.text + '</div><div class="close">&nbsp;</div></div>');

                if (ops.auto) {
                    setTimeout(function () {
                        closed();
                    }, 3000);
                }

                $div._.find('.close').onclick = function () {
                    closed();
                };

                switch (ops.dect) {
                    case 'top':
                        if (!$('.toast-top')) {
                            $('body')._.append('<div class="toast-top"></div>');
                        }
                        $('.toast-top')._.prepend($div);
                        break;
                    case 'top-right':
                        if (!$('.toast-top-right')) {
                            $('body')._.append('<div class="toast-top-right"></div>');
                        }
                        $('.toast-top-right')._.prepend($div);
                        break;
                    case 'btm':
                        if (!$('.toast-btm')) {
                            $('body')._.append('<div class="toast-btm"></div>');
                        }
                        $('.toast-btm')._.append($div);
                        break;
                    case 'btm-right':
                        if (!$('.toast-btm-right')) {
                            $('body')._.append('<div class="toast-btm-right"></div>');
                        }
                        $('.toast-btm-right')._.append($div);
                        break;
                }
            }

            // static

        }], [{
            key: '_interface',
            value: function _interface(config) {
                var _config = $.extends({}, Default, config);

                if ((typeof config === 'undefined' ? 'undefined' : _typeof(config)) === 'object') {
                    var data = new Toast(this, _config);
                }
            }
        }, {
            key: 'VERSION',
            get: function get() {
                return VERSION;
            }
        }]);

        return Toast;
    }();

    // jQuery


    $.fn[NAME] = Toast._interface;
    $.fn[NAME].Constructor = Toast;

    return Toast;
}(Bliss, Bliss.$);
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Dropmenu = function ($, $$) {
    // Constants
    var NAME = 'dropmenu';
    var VERSION = '1.0.0';
    var DATA_KEY = 'oc.dropmenu';

    var Event = {
        ENTER: 'mouseenter',
        CLICK: Util.getEvent('click')
    };

    var Default = {
        direction: 'center',
        trigger: 'click'
    };

    var DefaultType = {
        direction: 'string',
        trigger: 'string'
    };

    var ClassName = {
        ACTIVE: 'active',
        MISS: 'dismiss',
        OVERLAY: 'overlay-layer',
        DPM: '.dropmenu'
    };

    var Selector = {
        DATA_TOGGLE: '[data-toggle="dropmenu"]'

        // Class Definition
    };
    var Dropmenu = function () {
        function Dropmenu(element, config) {
            _classCallCheck(this, Dropmenu);

            this.$el = element;
            this._config = this._getConfig(config);
            this._init();
        }

        // getters


        _createClass(Dropmenu, [{
            key: 'dispose',


            // public
            value: function dispose() {
                $(this.$el).off(Event.CLICK);
                $.removeData(this.$el, DATA_KEY);

                this._config = null;
            }

            // private

        }, {
            key: '_getConfig',
            value: function _getConfig(config) {
                config = $.extends({}, Default, config);
                Util.typeCheckConfig(NAME, config, DefaultType);
                return config;
            }
        }, {
            key: '_init',
            value: function _init() {
                var _this = this;
                var $this = _this.$el;
                var ops = _this._config;

                var $div = $this._.children('div');

                if (window.screen.width > 480) {
                    switch (ops.direction) {
                        case 'center':
                            $div._.style({
                                'margin-left': -$div.offsetWidth / 2 + 'px',
                                transform: 'translateX(-50%)'
                            });
                            break;
                        case 'left':
                            $div._.addClass('left');
                            break;
                        case 'right':
                            $div._.addClass('right');
                            break;
                        case 'top':
                            $div._.style({
                                'margin-left': -$div.offsetWidth / 2 + 'px',
                                transform: 'translateX(-50%)'
                            });
                            $div._.addClass('top');
                            break;
                        case 'topleft':
                            $div._.addClass('top left');
                            break;
                        case 'topright':
                            $div._.addClass('top right');
                            break;
                    }
                }

                if (ops.trigger !== 'mouseenter') {
                    var chd = $this._.children()[0];
                    chd._.bind(ops.trigger, function (e) {
                        e.preventDefault();
                        e.stopPropagation();

                        if (!$this._.hasClass(ClassName.MISS)) {
                            $this._.addClass('dismiss');
                        }

                        if ($this._.hasClass(ClassName.ACTIVE)) {
                            $this._.removeClass(ClassName.ACTIVE)._.addClass(ClassName.MISS);
                        } else {
                            $$(ClassName.DPM)._.removeClass(ClassName.ACTIVE);
                            $this._.addClass(ClassName.ACTIVE);
                            if (window.screen.width <= 480) {
                                $('body')._.addClass(ClassName.OVERLAY);
                            }
                        }
                    });

                    $this._.children()[0]._.next().onclick = function (e) {
                        e.preventDefault();
                        e.stopPropagation();
                    };
                } else {
                    $this._.once(Event.ENTER, function (event) {
                        $this._.addClass(ClassName.MISS);
                    });
                    $this._.addClass('dphover');
                }
            }

            // static

        }], [{
            key: '_interface',
            value: function _interface(config) {
                var data = this._.data(DATA_KEY);
                var _config = $.extends({}, Default, this._.data());

                if ((typeof config === 'undefined' ? 'undefined' : _typeof(config)) === 'object') {
                    $.extend(_config, config);
                }

                var action = typeof config === 'string' ? config : _config;

                if (!data) {
                    if (window.screen.width <= 480) {
                        _config.trigger = 'click';
                    }
                    data = new Dropmenu(this, _config);
                    this._.data(DATA_KEY, data);
                }

                if (typeof action === 'string') {
                    if (data[action] === undefined) {
                        throw new Error('No method named "' + action + '"');
                    }
                    data[action]();
                }
            }
        }, {
            key: 'VERSION',
            get: function get() {
                return VERSION;
            }
        }]);

        return Dropmenu;
    }();

    // Data Api implementation


    $$(Selector.DATA_TOGGLE).forEach(function (item, i) {
        Dropmenu._interface.call(item, item._.data());
    });

    document.addEventListener(Event.CLICK, function () {
        $$(ClassName.DPM)._.removeClass(ClassName.ACTIVE);
    }, false);

    $.add(NAME, Dropmenu._interface);

    return Dropmenu;
}(Bliss, Bliss.$);
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Select = function ($, $$) {
    // Constants
    var NAME = 'select';
    var VERSION = '1.0.0';
    var DATA_KEY = 'oc.select';

    var Event = {
        CLICK: Util.getEvent('click')
    };

    var Default = {
        select: ''
    };

    var DefaultType = {
        select: '(number|string)'
    };

    var ClassName = {
        HOVER: 'hover',
        ACTIVE: 'active',
        OVERLAY: 'overlay-layer',
        BODY: 'body',
        SELECT: '.select',
        DISABLED: 'disabled'
    };

    var Selector = {
        DATA_TOGGLE: '[data-toggle="select"]'

        // Class Definition
    };
    var Select = function () {
        function Select(element, config) {
            _classCallCheck(this, Select);

            this.$el = element;
            this._config = this._getConfig(config);
            this._init();
        }

        // getters


        _createClass(Select, [{
            key: 'dispose',


            // public
            value: function dispose() {
                this.$el._.off(Event.CLICK);
                $.removeData(this.$el, DATA_KEY);

                this._config = null;
            }
        }, {
            key: 'update',
            value: function update() {
                var $this = this.$el,
                    $select = $this.parentNode,
                    $button = $select._.children('button');

                var ops = this._config,
                    selected = $this.value,
                    oriName = $this._.find('option')[0].innerHTML || '&nbsp;';

                $select.value = selected;
                $select._.fire('change');
                $button.innerHTML = oriName;
                $select._.children('ul').innerHTML = '';

                this._factory($this, $select, $button, selected);
            }

            // private

        }, {
            key: '_getConfig',
            value: function _getConfig(config) {
                config = $.extends({}, Default, config);
                Util.typeCheckConfig(NAME, config, DefaultType);
                return config;
            }
        }, {
            key: '_factory',
            value: function _factory($this, $select, $button, selected) {
                $this._.find('option').forEach(function (item, i) {
                    var $option = $('<li class="btn" data-select="' + item.value + '">' + item.innerHTML + '</li>');
                    if (selected == item.value) {
                        $button.innerHTML = item.textContent;
                        $option._.addClass(ClassName.HOVER);
                    }
                    $select._.find('ul')._.append($option);
                });
            }
        }, {
            key: '_init',
            value: function _init() {
                var $this = this.$el;
                var ops = this._config;

                var selected = ops.select || $this.value,
                    oriName = $this._.find('option')[0].innerHTML || '&nbsp;',
                    $select = $('<div class="select"><button type="button" class="btn">' + oriName + '</button><ul></ul></div>'),
                    $button = $select._.children('button');

                $this.value = selected;

                if (ops.direction) {
                    $select._.find('ul')._.addClass('seltop');
                }

                this._factory($this, $select, $button, selected);

                $select._.addClass($this._.attr('class'));
                $select._.after($this)._.append($this);

                if ($this._.attr(ClassName.DISABLED) || $this._.attr('readonly')) {
                    $button._.attr(ClassName.DISABLED, true);
                } else {
                    $button.onclick = function (e) {
                        e.stopPropagation();
                        e.preventDefault();

                        if (!$select._.hasClass(ClassName.ACTIVE)) {
                            $select._.addClass('dismiss');
                        }

                        if ($select._.hasClass(ClassName.ACTIVE)) {
                            $select._.removeClass(ClassName.ACTIVE);
                        } else {
                            $$(ClassName.SELECT)._.removeClass(ClassName.ACTIVE);
                            $select._.addClass(ClassName.ACTIVE);
                        }

                        if (window.screen.width <= 480) {
                            $(ClassName.BODY)._.addClass(ClassName.OVERLAY);
                        }
                    };

                    $select._.on(Event.CLICK, 'li', function (e) {
                        e.stopPropagation();
                        e.preventDefault();

                        $button.textContent = this.textContent;
                        $this.value = this._.data('select');
                        $this._.fire('change');
                        $select._.find('li')._.removeClass(ClassName.HOVER);
                        this._.addClass(ClassName.HOVER);
                        $select._.removeClass(ClassName.ACTIVE);

                        if (window.screen.width <= 480) {
                            $(ClassName.BODY)._.removeClass(ClassName.OVERLAY);
                        }
                    });
                }
            }

            // static

        }], [{
            key: '_interface',
            value: function _interface(config) {
                var data = this._.data(DATA_KEY);
                var _config = $.extends({}, Default, this._.data());

                if ((typeof config === 'undefined' ? 'undefined' : _typeof(config)) === 'object') {
                    $.extend(_config, config);
                }

                var action = typeof config === 'string' ? config : _config;

                if (!data) {
                    data = new Select(this, _config);
                    this._.data(DATA_KEY, data);
                }

                if (typeof action === 'string') {
                    if (data[action] === undefined) {
                        throw new Error('No method named "' + action + '"');
                    }
                    data[action]();
                }
            }
        }, {
            key: 'VERSION',
            get: function get() {
                return VERSION;
            }
        }]);

        return Select;
    }();

    // Data Api implementation


    $$(Selector.DATA_TOGGLE).forEach(function (item, i) {
        Select._interface.call(item, item._.data());
    });

    document.addEventListener(Event.CLICK, function () {
        $$(ClassName.SELECT)._.removeClass(ClassName.ACTIVE);
    }, false);

    $.add(NAME, Select._interface);

    return Select;
}(Bliss, Bliss.$);
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Datepicker = function ($, $$) {
    // Constants
    var NAME = 'datepicker';
    var VERSION = '1.0.0';
    var DATA_KEY = 'oc.datepicker';

    var Event = {
        CLICK: Util.getEvent('click')
    };

    var Default = {
        format: 'yyyy-MM-dd',
        min: '',
        max: '',
        content: ''
    };

    var DefaultType = {
        format: 'string',
        min: '(number|string)',
        max: '(number|string)',
        content: 'string'
    };

    var ClassName = {
        BODY: 'body',
        ACTIVE: 'active',
        HIDE: 'hidbox',
        OVERLAY: 'overlay-layer',
        WEEK: '.oc-calendar-week',
        MONTH: '.oc-calendar-monthday',
        ACT: '.oc-calendar-actions',
        HOUR: '.hour',
        MINS: '.mins',
        SEDS: '.seds',
        HINP: '.hourput',
        MINP: '.minsput',
        SINP: '.sedsput',
        DTPK: '.datepicker'
    };

    var Selector = {
        DATA_TOGGLE: '[data-toggle="datepicker"]'

        // Class Definition
    };
    var Datepicker = function () {
        function Datepicker(element, config) {
            _classCallCheck(this, Datepicker);

            this.$el = element;
            this.$input = this.$el._.children('input');
            this._config = this._getConfig(config);
            this._init();
        }

        // getters


        _createClass(Datepicker, [{
            key: 'dispose',


            // public
            value: function dispose() {
                this.$el._.off(Event.CLICK);
                $.removeData(this.$el, DATA_KEY);

                this._config = null;
            }

            // private

        }, {
            key: '_getConfig',
            value: function _getConfig(config) {
                config = $.extends({}, Default, config);
                Util.typeCheckConfig(NAME, config, DefaultType);
                return config;
            }
        }, {
            key: '_event',
            value: function _event() {
                var _this = this,
                    $this = _this.$el,
                    $input = _this.$input;

                var ops = _this._config,
                    ones = true;

                if (ops.type) {
                    _this._years();
                } else {
                    _this._days();
                }

                ops.btn._.bind(Event.CLICK, function (e) {
                    e.stopPropagation();
                    e.preventDefault();

                    if (ones) {
                        ones = false;
                        // if(window.screen.width > 480){
                        // 	ops.content.css({
                        // 		left: $this[0].offsetLeft,
                        // 		top: $this[0].offsetTop + $this.outerHeight()
                        // 	})
                        // }
                        if (window.screen.width <= 480) {
                            $(ClassName.BODY)._.addClass(ClassName.OVERLAY);
                        }
                        $this._.append(ops.content);
                    }

                    if ($this._.hasClass(ClassName.ACTIVE)) {
                        if (window.screen.width <= 480) {
                            $(ClassName.BODY)._.addClass(ClassName.OVERLAY);
                        }
                        $this._.removeClass(ClassName.ACTIVE);
                        ops.content._.addClass(ClassName.HIDE);
                    } else {
                        $$(ClassName.DTPK)._.removeClass(ClassName.ACTIVE)._.find('.oc-calendar')._.addClass(ClassName.HIDE);
                        $this._.addClass(ClassName.ACTIVE);
                        ops.content._.removeClass(ClassName.HIDE);
                    }
                });

                ops.content._.find('.oc-calendar-clear')._.bind(Event.CLICK, function (e) {
                    e.stopPropagation();
                    e.preventDefault();

                    ops.btn.innerHTML = '&nbsp;';
                    $input.value = '';
                });

                ops.content._.find('.oc-calendar-close')._.bind(Event.CLICK, function (e) {
                    e.stopPropagation();
                    e.preventDefault();

                    _this.$el._.removeClass(ClassName.ACTIVE);
                    ops.content._.addClass(ClassName.HIDE);
                    if (window.screen.width <= 480) {
                        $(ClassName.BODY)._.removeClass(ClassName.OVERLAY);
                    }
                });

                ops.content._.find('.oc-calendar-today')._.bind(Event.CLICK, function (e) {
                    e.stopPropagation();
                    e.preventDefault();

                    var today = new Date();
                    ops.tYear = today.getFullYear();
                    ops.tMonth = today.getMonth() + 1;
                    ops.tDay = today.getDate();
                    // if(!ops.content.find(ClassName.MONTH)
                    // .find('div').eq(1)
                    // .find('[data-n='+ops.tDay+']').hasClass('none')){
                    // 	ops.pickTime = _this._times(today)
                    // 	$input.val(_this.timeFormat(ops.pickTime))
                    // }
                    _this._days();
                });
            }
        }, {
            key: '_timex',
            value: function _timex() {
                var _this = this;
                var ops = _this._config;
                var $time = ops.content._.find('.oc-calendar-time');

                _this._toolbar('timex');
                ops.content._.find(ClassName.WEEK).style.display = 'none';
                ops.content._.find(ClassName.MONTH).style.display = 'none';
                ops.content._.find(ClassName.ACT).style.display = 'none';

                if (!$time) {
                    $time = $('<div class="oc-calendar-time">\n                    <div class="sfmdiv">\n                        <div class="hour"></div>\n                        <div class="mins"></div>\n                        <div class="seds"></div>\n                    </div>\n                    <div class="seltime clearfix">\n                        <input type="number" class="hourput" min="0" max="23" value="' + ops.tH + '">\n                        <span>:</span>\n                        <input type="number" class="minsput" min="0" max="59" value="' + ops.tM + '">\n                        <span>:</span>\n                        <input type="number" class="sedsput" min="0" max="59" value="' + ops.tS + '">\n                        <button type="button" class="btn timeck">\u786E\u5B9A</button>\n                    </div>\n                </div>');

                    ops.content._.append($time);

                    for (var i = 0; i < 24; i++) {
                        var x = i;
                        if (x.toString().length === 1) {
                            x = '0' + i;
                        }
                        $time._.find(ClassName.HOUR)._.append('<span data-tm="' + x + '">' + x + '\u65F6</span>');
                    }

                    for (var g = 0; g < 60; g++) {
                        var n = g;
                        if (n.toString().length === 1) {
                            n = '0' + g;
                        }
                        $time._.find(ClassName.MINS)._.append('<span data-tm="' + n + '">' + n + '\u5206</span>');
                        $time._.find(ClassName.SEDS)._.append('<span data-tm="' + n + '">' + n + '\u79D2</span>');
                    }

                    if (typeof ops.time === 'number') {
                        ops.time = parseInt(ops.time);
                    } else {
                        ops.time = 3;
                    }

                    var hourTop = 0;
                    if (ops.time > 0) {
                        $time._.find(ClassName.HOUR)._.bind('mousewheel DOMMouseScroll', function (e) {
                            e.preventDefault();
                            var value = e.wheelDelta || -e.detail;
                            var delta = Math.max(-1, Math.min(1, value));
                            //e.originalEvent.wheelDelta => 120(up) or -120(down) 谷歌IE内核
                            //e.originalEvent.detail => -3(up) or 3(down) 火狐内核
                            if (delta > 0) {
                                hourTop -= 36;
                                if (hourTop < 0) {
                                    hourTop = 0;
                                }
                                $time._.find(ClassName.HOUR).scrollTop = hourTop;
                            } else {
                                var h = ($time._.find(ClassName.HOUR)._.children('span').length - 1) * 36;
                                hourTop += 36;
                                if (hourTop > h) {
                                    hourTop = h;
                                }
                                $time._.find(ClassName.HOUR).scrollTop = hourTop;
                            }
                            $time._.find(ClassName.HOUR)._.children('span')._.removeClass(ClassName.ACTIVE);
                            var $act = $time._.find(ClassName.HOUR)._.children('span')[hourTop / 36];
                            $act._.addClass(ClassName.ACTIVE);
                            $time._.find(ClassName.HINP).value = $act._.data('tm');
                        });
                    } else {
                        $time._.find(ClassName.HOUR)._.children('span').style.display = 'none';
                        $time._.find(ClassName.HINP)._.attr('disabled', true);
                    }

                    var minsTop = 0;
                    if (ops.time > 1) {
                        $time._.find(ClassName.MINS)._.bind('mousewheel DOMMouseScroll', function (e) {
                            e.preventDefault();
                            var value = e.wheelDelta || -e.detail;
                            var delta = Math.max(-1, Math.min(1, value));
                            if (delta > 0) {
                                minsTop -= 36;
                                if (minsTop < 0) {
                                    minsTop = 0;
                                }
                                $time._.find(ClassName.MINS).scrollTop = minsTop;
                            } else {
                                var h = ($time._.find(ClassName.MINS)._.children('span').length - 1) * 36;
                                minsTop += 36;
                                if (minsTop > h) {
                                    minsTop = h;
                                }
                                $time._.find(ClassName.MINS).scrollTop = minsTop;
                            }
                            $time._.find(ClassName.MINS)._.children('span')._.removeClass(ClassName.ACTIVE);
                            var $act = $time._.find(ClassName.MINS)._.children('span')[minsTop / 36];
                            $act._.addClass(ClassName.ACTIVE);
                            $time._.find(ClassName.MINP).value = $act._.data('tm');
                        });
                    } else {
                        $time._.find(ClassName.MINS)._.children('span').style.display = 'none';
                        $time._.find(ClassName.MINP)._.attr('disabled', true);
                    }

                    var sedsTop = 0;
                    if (ops.time > 2) {
                        $time._.find(ClassName.SEDS)._.bind('mousewheel DOMMouseScroll', function (e) {
                            e.preventDefault();
                            var value = e.wheelDelta || -e.detail;
                            var delta = Math.max(-1, Math.min(1, value));
                            if (delta > 0) {
                                sedsTop -= 36;
                                if (sedsTop < 0) {
                                    sedsTop = 0;
                                }
                                $time._.find(ClassName.SEDS).scrollTop = sedsTop;
                            } else {
                                var h = ($time._.find(ClassName.SEDS)._.children('span').length - 1) * 36;
                                sedsTop += 36;
                                if (sedsTop > h) {
                                    sedsTop = h;
                                }
                                $time._.find(ClassName.SEDS).scrollTop = sedsTop;
                            }
                            $time._.find(ClassName.SEDS)._.children('span')._.removeClass(ClassName.ACTIVE);
                            var $act = $time._.find(ClassName.SEDS)._.children('span')[sedsTop / 36];
                            $act._.addClass(ClassName.ACTIVE);
                            $time._.find(ClassName.SINP).value = $act._.data('tm');
                        });
                    } else {
                        $time._.find(ClassName.SEDS)._.children('span').style.display = 'none';
                        $time._.find(ClassName.SINP)._.attr('disabled', true);
                    }

                    //-----------------------------------------
                    $time._.find(ClassName.HINP)._.bind('change', function () {
                        var v = this.value;
                        if (v.length === 0) {
                            v = 0;
                        }
                        v = parseInt(v);
                        if (v < 0) {
                            v = 0;
                        }
                        if (v > 23) {
                            v = 23;
                        }
                        hourTop = v * 36;
                        $time._.find(ClassName.HOUR).scrollTop = hourTop;
                        $time._.find(ClassName.HOUR)._.children('span')[v]._.addClass(ClassName.ACTIVE);
                        if (v.toString().length === 1) {
                            v = '0' + v;
                        }
                        this.value = v;
                    });

                    $time._.find(ClassName.MINP)._.bind('change', function () {
                        var v = this.value;
                        if (v.length === 0) {
                            v = 0;
                        }
                        v = parseInt(v);
                        if (v < 0) {
                            v = 0;
                        }
                        if (v > 59) {
                            v = 59;
                        }
                        minsTop = v * 36;
                        $time._.find(ClassName.MINS).scrollTop = minsTop;
                        $time._.find(ClassName.MINS)._.children('span')[v]._.addClass(ClassName.ACTIVE);
                        if (v.toString().length === 1) {
                            v = '0' + v;
                        }
                        this.value = v;
                    });

                    $time._.find(ClassName.SINP)._.bind('change', function () {
                        var v = this.value;
                        if (v.length === 0) {
                            v = 0;
                        }
                        v = parseInt(v);
                        if (v < 0) {
                            v = 0;
                        }
                        if (v > 59) {
                            v = 59;
                        }
                        sedsTop = v * 36;
                        $time._.find(ClassName.SEDS).scrollTop = sedsTop;
                        $time._.find(ClassName.SEDS)._.children('span')[v]._.addClass(ClassName.ACTIVE);
                        if (v.toString().length === 1) {
                            v = '0' + v;
                        }
                        this.value = v;
                    });

                    $time._.find(ClassName.HINP)._.fire('change');
                    $time._.find(ClassName.MINP)._.fire('change');
                    $time._.find(ClassName.SINP)._.fire('change');

                    //----------------------------
                    $time._.find('button').onclick = function () {
                        var h = $time._.find(ClassName.HINP).value;
                        var m = $time._.find(ClassName.MINP).value;
                        var s = $time._.find(ClassName.SINP).value;
                        ops.pickTime = _this._times(new Date(ops.tYear, ops.tMonth - 1, ops.tDay));
                        var _val = new Date(ops.tYear, ops.tMonth - 1, ops.tDay, h, m, s).getTime();
                        ops.btn.textContent = _this._timeFormat(_val, ops.format + ' hh:mm:ss');
                        _this.$input.value = _this._timeFormat(_val, ops.format + ' hh:mm:ss');
                        ops.content._.addClass(ClassName.HIDE);
                        _this.$el._.removeClass(ClassName.ACTIVE);
                        if (window.screen.width <= 480) {
                            $(ClassName.BODY)._.removeClass(ClassName.OVERLAY);
                        }
                    };
                } else {
                    $time.style.display = 'block';
                }
            }
        }, {
            key: '_days',
            value: function _days() {
                var _this = this;
                var ops = _this._config;

                _this._showDays();
                _this._toolbar('day');

                // 点击日
                ops.content._.on(Event.CLICK, '.day', function (e) {
                    e.stopPropagation();
                    e.preventDefault();

                    if (!this._.hasClass('none')) {
                        ops.content._.find('.day')._.removeClass(ClassName.ACTIVE);
                        this._.addClass(ClassName.ACTIVE);
                        ops.tDay = this._.data('n');
                        ops.pickTime = _this._times(new Date(ops.tYear, ops.tMonth - 1, ops.tDay));
                        if (ops.time) {
                            _this._timex();
                        } else {
                            ops.btn.textContent = _this._timeFormat(ops.pickTime);
                            _this.$input.value = _this._timeFormat(ops.pickTime);
                            _this.$el._.removeClass(ClassName.ACTIVE);
                            ops.content._.addClass(ClassName.HIDE);
                            if (window.screen.width <= 480) {
                                $(ClassName.BODY)._.removeClass(ClassName.OVERLAY);
                            }
                        }
                    }
                });
            }
        }, {
            key: '_showDays',
            value: function _showDays() {
                var _this = this;
                var ops = _this._config;
                var $monthday = ops.content._.find(ClassName.MONTH);
                var $oldDiv = void 0;
                var requFrame = void 0;

                function nextGo() {
                    if ($oldDiv._.style('visibility') === 'hidden') {
                        cancelAnimationFrame(requFrame);
                        $oldDiv._.remove();
                    } else {
                        requFrame = requestAnimationFrame(nextGo);
                    }
                }
                ops.content._.find(ClassName.WEEK).style.display = 'block';
                $monthday.style.display = 'block';
                ops.content._.find(ClassName.ACT).style.display = 'block';

                var firstday = new Date(ops.tYear, ops.tMonth - 1, 1, '', '', ''),
                    lastday = new Date(ops.tYear, ops.tMonth, 0).getDate(),
                    date = firstday.getDay(),
                    $row = '<div><div class="oc-calendar-monthday-row">';

                for (var i = 1; i < 42; i++) {
                    if (i <= date || i > lastday + date) {
                        $row += '<span class="oc-calendar-none">&nbsp;</span>';
                    } else {
                        // today
                        var now = '',
                            xDate = i - date,
                            xTime = _this._times(new Date(ops.tYear, ops.tMonth - 1, xDate));
                        if (xTime === ops.today) {
                            now += ' today';
                        }
                        if (xTime === ops.pickTime) {
                            now += ' active';
                        }
                        if (ops.max && xTime > ops.max || ops.min && xTime < ops.min) {
                            now += ' none';
                        }
                        $row += '<button type="button" class="btn day' + now + '" data-n="' + xDate + '">' + xDate + '</button>';
                    }
                    if (i % 7 === 0 && i !== 0) {
                        $row += '</div><div class="oc-calendar-monthday-row">';
                    }
                }
                $row += '</div></div>';
                $row = $($row);

                $monthday._.append($row);

                if ($monthday._.children('div').length > 0) {
                    $oldDiv = $monthday._.children('div')[0];
                    if (ops.nx) {
                        $row._.addClass('oc-calendarIn-next');
                        $oldDiv._.attr({ class: 'oc-calendarOut-next' });
                    } else {
                        $row._.addClass('oc-calendarIn-prev');
                        $oldDiv._.attr({ class: 'oc-calendarOut-prev' });
                    }
                    requFrame = requestAnimationFrame(nextGo);
                }
            }
        }, {
            key: '_months',
            value: function _months() {
                var _this = this;
                var ops = _this._config;

                function setMonth(el) {
                    var minYear,
                        maxYear,
                        minMonth,
                        pt = new Date(ops.pickTime);

                    // maxMonth

                    if (ops.year === ops.tYear) {
                        el._.children()[ops.month - 1]._.addClass('tonow');
                    } else {
                        el._.children()._.removeClass('tonow');
                    }

                    if (ops.tYear === pt.getFullYear() && ops.tMonth === pt.getMonth() + 1) {
                        el._.children()[ops.sMonth - 1]._.addClass(ClassName.ACTIVE);
                    } else {
                        el._.children()._.removeClass(ClassName.ACTIVE);
                    }

                    if (ops.min || ops.max) {
                        el._.children()._.removeClass('none');
                    }

                    if (ops.min) {
                        minYear = new Date(ops.min).getFullYear();
                        minMonth = new Date(ops.min).getMonth() + 1;
                        if (ops.tYear === minYear) {
                            for (var m = 0; m < minMonth - 1; m++) {
                                el._.children()[m]._.addClass('none');
                            }
                        }
                        if (ops.tYear < minYear) {
                            el._.children()._.addClass('none');
                        }
                    }

                    if (ops.max) {
                        maxYear = new Date(ops.max).getFullYear();
                        m = new Date(ops.max).getMonth() + 1;

                        if (ops.tYear === maxYear) {
                            for (; m < 12; m++) {
                                el._.children()[m]._.addClass('none');
                            }
                        }
                        if (ops.tYear > maxYear) {
                            el._.children()._.addClass('none');
                        }
                    }
                }

                if (!ops.content._.find('.oc-calendar-month')) {
                    var $months = $('<div class="oc-calendar-month">\n                    <button type="button" class="btn" data-month="1">\u4E00\u6708</button>\n                    <button type="button" class="btn" data-month="2">\u4E8C\u6708</button>\n                    <button type="button" class="btn" data-month="3">\u4E09\u6708</button>\n                    <button type="button" class="btn" data-month="4">\u56DB\u6708</button>\n                    <button type="button" class="btn" data-month="5">\u4E94\u6708</button>\n                    <button type="button" class="btn" data-month="6">\u516D\u6708</button>\n                    <button type="button" class="btn" data-month="7">\u4E03\u6708</button>\n                    <button type="button" class="btn" data-month="8">\u516B\u6708</button>\n                    <button type="button" class="btn" data-month="9">\u4E5D\u6708</button>\n                    <button type="button" class="btn" data-month="10">\u5341\u6708</button>\n                    <button type="button" class="btn" data-month="11">\u5341\u4E00\u6708</button>\n                    <button type="button" class="btn" data-month="12">\u5341\u4E8C\u6708</button>\n                </div>');

                    ops.content._.append($months);

                    var _month = ops.content._.find('.oc-calendar-month');

                    setMonth(_month);

                    _month._.on(Event.CLICK, 'button', function (e) {
                        e.stopPropagation();
                        e.preventDefault();

                        _month._.children('button')._.removeClass(ClassName.ACTIVE);
                        this._.addClass(ClassName.ACTIVE);
                        ops.tMonth = this._.data('month');
                        ops.sMonth = ops.tMonth;
                        if (ops.type === 'month') {
                            ops.content._.addClass(ClassName.HIDE);
                            var pktime = ops.tYear + '/' + ops.sMonth + '/1';
                            ops.pickTime = _this._times(pktime);
                            var ym = _this._timeFormat(pktime, 'yyyy-MM');
                            ops.btn.textContent = ym;
                            _this.$input.value = ym;
                            if (ops.func) {
                                ops.func(ym);
                            }
                            _this.$el._.removeClass(ClassName.ACTIVE);
                            if (window.screen.width <= 480) {
                                $(ClassName.BODY)._.removeClass(ClassName.OVERLAY);
                            }
                        } else {
                            _this._toolbar('day');
                            _month.style.display = 'none';
                            _this._showDays();
                        }
                    });
                } else {
                    var _month = ops.content._.find('.oc-calendar-month');
                    _month.style.display = 'block';
                    setMonth(_month);
                }
                _this._toolbar('month');
            }
        }, {
            key: '_years',
            value: function _years() {
                var _this = this;
                var ops = _this._config;

                var minYear, maxYear;

                if (ops.min) {
                    minYear = new Date(ops.min).getFullYear();
                }

                if (ops.max) {
                    maxYear = new Date(ops.max).getFullYear();
                }

                function setYear() {
                    var $years = ops.content._.find('.oc-calendar-year');
                    $years.style.display = 'block';
                    $years.innerHTML = '';
                    var y = ops.tYear - 6;

                    for (; y < ops.tYear + 6; y++) {
                        var $y = $('<button type="button" class="btn" data-year="' + y + '">' + y + '</button>');
                        if (ops.year === y) {
                            $y._.addClass('tonow');
                        }
                        if (ops.sYear === y) {
                            $y._.addClass(ClassName.ACTIVE);
                        }
                        if (minYear && minYear > y) {
                            $y._.addClass('none');
                        }
                        if (maxYear && maxYear < y) {
                            $y._.addClass('none');
                        }
                        $years._.append($y);
                    }
                }

                if (!ops.content._.find('.oc-calendar-year')) {
                    var $years = $('<div class="oc-calendar-year"></div>');
                    ops.content._.append($years);
                    setYear();
                    var _year = ops.content._.find('.oc-calendar-year');

                    _year._.on(Event.CLICK, 'button', function (e) {
                        e.stopPropagation();
                        e.preventDefault();

                        _year._.children('button')._.removeClass(ClassName.ACTIVE);
                        this._.addClass(ClassName.ACTIVE);
                        ops.tYear = parseInt(this._.data('year'));
                        ops.sYear = ops.tYear;
                        if (ops.type === 'year') {
                            ops.content._.addClass(ClassName.HIDE);
                            ops.btn.textContent = ops.sYear;
                            _this.$input.value = ops.sYear;
                            _this.$el._.removeClass(ClassName.ACTIVE);
                            if (window.screen.width <= 480) {
                                $(ClassName.BODY)._.removeClass(ClassName.OVERLAY);
                            }
                        } else {
                            _this._toolbar('month');
                            _year.style.display = 'none';
                            _this._months();
                        }
                    });
                } else {
                    setYear();
                }
                _this._toolbar('year');
            }
        }, {
            key: '_toolbar',
            value: function _toolbar(type) {
                var _this = this;
                var ops = _this._config;
                var $oldBtn = null;
                var $newBtn = null;
                var firstin = false;
                var requFrame = void 0;

                function nextTitle() {
                    if ($oldBtn._.style('visibility') === 'hidden') {
                        cancelAnimationFrame(requFrame);
                        $oldBtn._.remove();
                        ops.content._.find('.toolbar-next')._.removeClass('disme');
                        ops.content._.find('.toolbar-prev')._.removeClass('disme');
                    } else {
                        requFrame = requestAnimationFrame(nextTitle);
                    }
                }

                function setTitle(type) {
                    var title = '',
                        $title = ops.content._.find('.oc-calendar-toolbar-title');
                    switch (type) {
                        case 'timex':
                            title = ops.tYear + '/' + ops.tMonth + '/' + ops.tDay;
                            title = _this._timeFormat(title, 'yyyy年MM月dd日');
                            break;
                        case 'day':
                            title = ops.tYear + '/' + ops.tMonth + '/1';
                            title = _this._timeFormat(title, 'yyyy年MM月');
                            break;
                        case 'month':
                            title = ops.tYear;
                            break;
                        case 'year':
                            title = ops.tYear - 6 + ' - ' + (ops.tYear + 5);
                            break;
                    }

                    $title._.children('button')._.data('select', type);
                    $title._.children('button').innerHTML = title;

                    if (firstin) {
                        ops.content._.find('.toolbar-next')._.addClass('disme');
                        ops.content._.find('.toolbar-prev')._.addClass('disme');

                        $oldBtn = $title._.children('button');
                        $newBtn = $('<button type="button" class="btn">' + title + '</button>');
                        $newBtn._.data('select', type);

                        if (ops.nx) {
                            $newBtn._.addClass('oc-calendarIn-next');
                            $oldBtn._.attr({ class: 'oc-calendarOut-next' });
                        } else {
                            $newBtn._.addClass('oc-calendarIn-prev');
                            $oldBtn._.attr({ class: 'oc-calendarOut-prev' });
                        }

                        $title._.append($newBtn);
                        requFrame = requestAnimationFrame(nextTitle);
                    }

                    firstin = true;
                }

                if (ops.content._.find('.oc-calendar-toolbar-title')) {
                    setTitle(type);
                } else {
                    var $toolbar = $('<button type="button" class="btn toolbar-prev"></button>\n                    <div class="oc-calendar-toolbar-title">\n                        <button type="button" class="btn"></button>\n                    </div>\n                    <button type="button" class="btn toolbar-next">\n                </button>');

                    var ttbar = ops.content._.find('.oc-calendar-toolbar');
                    $toolbar.forEach(function (item, i) {
                        ttbar._.append(item);
                    });
                    setTitle(type);

                    // 下个月
                    ops.content._.on(Event.CLICK, '.toolbar-next', function (e) {
                        e.stopPropagation();
                        e.preventDefault();

                        if (this._.hasClass('disme')) {
                            return;
                        }
                        var select = ops.content._.find('.oc-calendar-toolbar-title button')._.data('select');
                        ops.nx = true;
                        var next = true;

                        if (select === 'day') {
                            ops.tMonth++;
                            if (ops.tMonth > 12) {
                                ops.tYear++;
                                ops.tMonth = 1;
                            }
                            _this._showDays();
                        } else if (select === 'month') {
                            ops.tYear++;
                            _this._months();
                        } else if (select === 'year') {
                            ops.tYear += 11;
                            _this._years();
                        } else {
                            var tt = _this._times(ops.pickTime);
                            tt += 24 * 60 * 60 * 1000;
                            if (ops.max >= tt || !ops.max) {
                                var timen = new Date(tt);
                                ops.tYear = timen.getFullYear();
                                ops.tMonth = timen.getMonth() + 1;
                                ops.tDay = timen.getDate();
                                ops.pickTime = _this._times(ops.tYear + '/' + ops.tMonth + '/' + ops.tDay);
                            } else {
                                next = false;
                            }
                        }
                        if (next) {
                            setTitle(select);
                        }
                    });

                    // 上个月
                    ops.content._.on('click', '.toolbar-prev', function (e) {
                        e.stopPropagation();
                        e.preventDefault();

                        if (this._.hasClass('disme')) {
                            return;
                        }
                        var select = ops.content._.find('.oc-calendar-toolbar-title button')._.data('select');
                        ops.nx = false;
                        var next = true;

                        if (select === 'day') {
                            ops.tMonth--;
                            if (ops.tMonth < 1) {
                                ops.tYear--;
                                ops.tMonth = 12;
                            }
                            _this._showDays();
                        } else if (select === 'month') {
                            ops.tYear--;
                            _this._months();
                        } else if (select === 'year') {
                            ops.tYear -= 11;
                            _this._years();
                        } else {
                            var tt = _this._times(ops.pickTime);
                            tt -= 24 * 60 * 60 * 1000;
                            if (ops.min <= tt || !ops.min) {
                                var timen = new Date(tt);
                                ops.tYear = timen.getFullYear();
                                ops.tMonth = timen.getMonth() + 1;
                                ops.tDay = timen.getDate();
                                ops.pickTime = _this._times(ops.tYear + '/' + ops.tMonth + '/' + ops.tDay);
                            } else {
                                next = false;
                            }
                        }
                        if (next) setTitle(select);
                    });

                    // 转到月
                    ops.content._.on('click', '.oc-calendar-toolbar-title button', function (e) {
                        e.stopPropagation();
                        e.preventDefault();

                        var select = this._.data('select');
                        if (select === 'timex') {
                            ops.content._.find('.oc-calendar-time').style.display = 'none';
                            _this._days();
                        } else if (select === 'day') {
                            ops.content._.find(ClassName.WEEK).style.display = 'none';
                            ops.content._.find(ClassName.MONTH).style.display = 'none';
                            ops.content._.find(ClassName.ACT).style.display = 'none';
                            _this._months();
                        } else if (select === 'month') {
                            ops.content._.find(ClassName.WEEK).style.display = 'none';
                            ops.content._.find(ClassName.MONTH).style.display = 'none';
                            ops.content._.find(ClassName.ACT).style.display = 'none';
                            ops.content._.find('.oc-calendar-month').style.display = 'none';
                            _this._years();
                        }
                    });
                }
            }
        }, {
            key: '_timeFormat',
            value: function _timeFormat(time, fmt) {
                if (!fmt) {
                    fmt = this._config.format;
                }
                time = new Date(time);
                var o = {
                    'M+': time.getMonth() + 1, //月
                    'd+': time.getDate(), //日
                    'h+': time.getHours(), // 小时
                    'm+': time.getMinutes(), // 分
                    's+': time.getSeconds() // 秒
                };
                if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (time.getFullYear() + '').substr(4 - RegExp.$1.length));
                for (var k in o) {
                    if (new RegExp('(' + k + ')').test(fmt)) fmt = fmt.replace(RegExp.$1, RegExp.$1.length == 1 ? o[k] : ('00' + o[k]).substr(('' + o[k]).length));
                }return fmt;
            }
        }, {
            key: '_times',
            value: function _times(time, type, sfm) {
                function ieFactory(str) {
                    str = str.replace(/[/.]/g, '-');
                    str = str.split('-');
                    return new Date(str[0], str[1] - 1, str[2], '', '', '');
                }

                function getTimes(time) {
                    var temp = parseInt(time);
                    if (temp.toString().length > 5) {
                        time = new Date(parseInt(temp));
                    } else {
                        time = new Date(time);
                    }
                    if (sfm) {
                        time = new Date(time.getFullYear(), time.getMonth(), time.getDate(), time.getHours(), time.getMinutes(), time.getSeconds()).getTime();
                    } else {
                        time = new Date(time.getFullYear(), time.getMonth(), time.getDate(), '', '', '').getTime();
                    }

                    return time;
                }

                function replaceTime(time) {
                    time = time.toString().replace(/([^\u0000-\u00FF])/g, '/').replace(/\./g, '/').replace(/\-/g, '/');

                    return time;
                }

                time = replaceTime(time);

                if (time.substr(time.length - 1, time.length) === '/') {
                    time = time.substr(0, time.length - 1);
                }

                if ('NaN' == new Date(time)) {
                    time = ieFactory(time);
                } else {
                    time = getTimes(time);
                }

                if (type) {
                    type = type.toString();
                    if (type === 'year') {
                        time = new Date(time).getFullYear();
                    } else if (type === 'month') {
                        time = new Date(time);
                        time = time.getFullYear() + '/' + time.getMonth();
                    } else if (type.indexOf('+') === 0) {
                        type = Number(type.substr(1)) * 1000;
                        time = time + type * 60 * 60 * 24;
                    } else if (type.indexOf('-') === 0) {
                        type = Number(type.substr(1)) * 1000;
                        time = time - type * 60 * 60 * 24;
                    } else {
                        if (type !== 'today') {
                            type = replaceTime(type);
                            time = getTimes(type);
                        }
                    }
                }

                return time;
            }
        }, {
            key: '_init',
            value: function _init() {
                var _this = this;
                var $this = _this.$el;
                var $input = _this.$input;
                var ops = _this._config;
                var today = void 0;

                $this._.addClass('datepicker');
                ops.btn = $('<button type="button" class="btn">&nbsp;</button>');
                $this._.append(ops.btn);

                // console.log(_this._times('2017年6月28日', 'year'))
                // console.log(_this._times('2017/06/28', 'month'))
                // console.log(_this._times('2017-06-28', '+100'))
                // console.log(_this._times('2017.06.28', '-100'))
                // console.log(_this._times('1498579200000'))

                today = new Date();

                ops.today = _this._times(today);
                ops.year = today.getFullYear();
                ops.month = today.getMonth() + 1;
                ops.day = today.getDate();

                if (ops.time) {
                    ops.tH = 0;
                    ops.tM = 0;
                    ops.tS = 0;
                }

                ops.sYear = ops.year;
                ops.sMonth = ops.month;
                ops.sDay = ops.day;

                if ($input.value.length > 0) {
                    ops.btn.textContent = $input.value;
                    var selday = new Date($input.value);
                    ops.pickTime = _this._times(selday, null, ops.time ? true : false);
                    ops.tYear = selday.getFullYear();
                    ops.tMonth = selday.getMonth() + 1;
                    ops.tDay = selday.getDate();
                    if (ops.time) {
                        ops.tH = selday.getHours();
                        ops.tM = selday.getMinutes();
                        ops.tS = selday.getSeconds();
                    }
                } else {
                    ops.tYear = ops.year;
                    ops.tMonth = ops.month;
                    ops.tDay = ops.day;
                }

                if (ops.min) {
                    ops.min = _this._times(ops.today, ops.min);
                    ops.tYear = new Date(ops.min).getFullYear();
                    ops.tMonth = new Date(ops.min).getMonth() + 1;
                }
                if (ops.max) {
                    ops.max = _this._times(ops.today, ops.max);
                    if (!ops.min) {
                        ops.tYear = new Date(ops.max).getFullYear();
                        ops.tMonth = new Date(ops.max).getMonth() + 1;
                    }
                }

                ops.content = $('<div class="oc-calendar showbox">\n                    <div class="oc-calendar-toolbar"></div>\n                    <div class="oc-calendar-week" style="display:none;">\n                        <span>\u65E5</span>\n                        <span>\u4E00</span>\n                        <span>\u4E8C</span>\n                        <span>\u4E09</span>\n                        <span>\u56DB</span>\n                        <span>\u4E94</span>\n                        <span>\u516D</span>\n                    </div>\n                    <div class="oc-calendar-monthday" style="display:none;"></div>\n                    <div class="oc-calendar-actions" style="display:none;">\n                        <button type="button" class="btn oc-calendar-clear">\u6E05\u9664</button>\n                        <button type="button" class="btn oc-calendar-today">\u4ECA\u65E5</button>\n                        <button type="button" class="btn oc-calendar-close">\u5173\u95ED</button>\n                    </div>\n                </div>');

                ops.content.onclick = function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                };

                _this._event();
            }

            // static

        }], [{
            key: '_interface',
            value: function _interface(config) {
                var data = this._.data(DATA_KEY);
                var _config = $.extends({}, Default, this._.data());

                if ((typeof config === 'undefined' ? 'undefined' : _typeof(config)) === 'object') {
                    $.extend(_config, config);
                }

                var action = typeof config === 'string' ? config : _config;

                if (!data) {
                    data = new Datepicker(this, _config);
                    this._.data(DATA_KEY, data);
                }

                if (typeof action === 'string') {
                    if (data[action] === undefined) {
                        throw new Error('No method named "' + action + '"');
                    }
                    data[action]();
                }
            }
        }, {
            key: 'VERSION',
            get: function get() {
                return VERSION;
            }
        }]);

        return Datepicker;
    }();

    // Data Api implementation


    $$(Selector.DATA_TOGGLE).forEach(function (item, i) {
        Datepicker._interface.call(item, item._.data());
    });

    document.addEventListener(Event.CLICK, function (e) {
        var datels = $$(ClassName.DTPK)._;
        datels.removeClass(ClassName.ACTIVE);
        datels.find('.oc-calendar')._.addClass(ClassName.HIDE);
        if (window.screen.width <= 480) {
            $(ClassName.BODY)._.removeClass(ClassName.OVERLAY);
        }
    }, false);

    $.add(NAME, Datepicker._interface);

    return Datepicker;
}(Bliss, Bliss.$); // 现在
//ops.year
//ops.month
//ops.day
// 缓存
//ops.tYear
//ops.tMonth
// 选择
//ops.sYear
//ops.sMonth
//ops.sDay
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Page = function ($, $$) {
    // Constants
    var NAME = 'page';
    var VERSION = '1.0.0';
    var DATA_KEY = 'oc.page';

    var Event = {
        CLICK: Util.getEvent('click')
    };

    var Default = {
        total: 10,
        page: 1,
        param: 'page'
    };

    var DefaultType = {
        total: 'number',
        page: 'number',
        param: 'string'
    };

    var Selector = {
        DATA_TOGGLE: '[data-toggle="page"]'

        // Class Definition
    };
    var Page = function () {
        function Page(element, config) {
            _classCallCheck(this, Page);

            this.$el = element;
            this._config = this._getConfig(config);
            this._init();
        }

        // getters


        _createClass(Page, [{
            key: 'dispose',


            // public
            value: function dispose() {
                $(this.$el).off(Event.CLICK);
                $.removeData(this.$el, DATA_KEY);

                this._config = null;
            }

            // private

        }, {
            key: '_getConfig',
            value: function _getConfig(config) {
                config = $.extend({}, Default, config);
                Util.typeCheckConfig(NAME, config, DefaultType);
                return config;
            }
        }, {
            key: 'update',
            value: function update() {
                var _this = this;
                var $this = _this.$el;
                var ops = _this._config;

                function setPage(i) {
                    var $page = $('<a href="' + ops.url + i + '" class="btn page">' + i + '</a>');
                    $page._.data('page', i);

                    if (ops.page === i) {
                        $page._.attr({ href: 'javascript:;' })._.addClass('current');
                    }
                    ops.$next._.before($page);
                }

                if ($this._.children('.page')) {
                    $this._.children('.page').forEach(function (item, i) {
                        item._.remove();
                    });
                }

                _this._setPN();

                if (ops.page > 3) {
                    if (ops.page + 3 >= ops.total) {
                        for (var i = ops.total - 6; i <= ops.total; i++) {
                            setPage(i);
                        }
                    } else {
                        for (var i = 3; i > 0; i--) {
                            var $page = $('<a href="' + ops.url + (ops.page - i) + '" class="btn page">' + (ops.page - i) + '</a>');
                            $page._.data('page', ops.page - i);
                            ops.$next._.before($page);
                        }
                        for (var i = ops.page; i < ops.page + 4; i++) {
                            setPage(i);
                        }
                    }
                } else {
                    for (var i = 1; i < 8; i++) {
                        setPage(i);
                    }
                }
            }
        }, {
            key: '_setPN',
            value: function _setPN() {
                var _this = this;
                var $this = _this.$el;
                var ops = _this._config;

                if (!ops.$prev && !ops.$next) {
                    var $prev = $('<a href="' + ops.url + (ops.page - 1) + '" class="btn page-prev">&nbsp;</a>'),
                        $next = $('<a href="' + ops.url + (ops.page + 1) + '" class="btn page-next">&nbsp;</a>');

                    $prev._.data('page', ops.page - 1);
                    $next._.data('page', ops.page + 1);

                    if (ops.page === 1) {
                        $prev._.addClass('disabled')._.attr({
                            href: 'javascript:;'
                        });
                    } else if (ops.page === ops.total) {
                        $next._.addClass('disabled')._.attr({
                            href: 'javascript:;'
                        });
                    }

                    ops.$prev = $prev;
                    ops.$next = $next;

                    $this._.append($prev, $next);
                } else {
                    if (ops.page === 1) {
                        ops.$prev._.addClass('disabled')._.attr({ href: 'javascript:;' })._.removeData('page');
                    } else {
                        ops.$prev._.removeClass('disabled')._.attr({ href: '' + ops.url + (ops.page - 1) })._.data('page', ops.page - 1);
                    }

                    if (ops.page === ops.total) {
                        ops.$next._.addClass('disabled')._.attr({ href: 'javascript:;' })._.removeData('page');
                    } else {
                        ops.$next._.removeClass('disabled')._.attr({ href: '' + ops.url + (ops.page + 1) })._.data('page', ops.page + 1);
                    }
                }
            }
        }, {
            key: '_init',
            value: function _init() {
                var _this = this;
                var $this = _this.$el;
                var ops = _this._config;

                function getUrlParam() {
                    var reg = new RegExp('(^|&)' + ops.param + '=([^&]*)(&|$)');
                    var r = window.location.search.substr(1).match(reg);
                    if (r !== null) {
                        var page = parseInt(unescape(r[2]));
                        if (page > ops.total) {
                            page = ops.total;
                        }
                        return page;
                    }
                    return null;
                }

                ops.page = getUrlParam() || ops.page || 1;

                ops.url = ops.url || window.location.href.split('?')[0] + '?' + ops.param + '='; //'javascript:;'

                _this.update();

                $this._.on(Event.CLICK, 'a', function (e) {
                    e.stopPropagation();
                    e.preventDefault();

                    ops.page = parseInt(this._.data('page'));
                    _this.update();
                    return false;
                });
            }

            // static

        }], [{
            key: '_interface',
            value: function _interface(config) {
                var data = this._.data(DATA_KEY);
                var _config = $.extends({}, Default, this._.data());

                if ((typeof config === 'undefined' ? 'undefined' : _typeof(config)) === 'object') {
                    $.extend(_config, config);
                }

                var action = typeof config === 'string' ? config : _config;

                if (!data) {
                    data = new Page(this, _config);
                    this._.data(DATA_KEY, data);
                }

                if (typeof action === 'string') {
                    if (data[action] === undefined) {
                        throw new Error('No method named "' + action + '"');
                    }
                    data[action]();
                }
            }
        }, {
            key: 'VERSION',
            get: function get() {
                return VERSION;
            }
        }]);

        return Page;
    }();

    // Data Api implementation


    $$(Selector.DATA_TOGGLE).forEach(function (item, i) {
        Page._interface.call(item, item._.data());
    });

    $.add(NAME, Page._interface);

    return Page;
}(Bliss, Bliss.$);
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Slider = function ($, $$) {
    // Constants
    var NAME = 'slider';
    var VERSION = '1.0.0';
    var DATA_KEY = 'oc.slider';

    var Event = {
        CLICK: Util.getEvent('click')
    };

    var Default = {
        auto: true,
        arrow: true,
        stop: 5000,
        speed: 300,
        ease: 'ease'
    };

    var DefaultType = {
        auto: 'bool',
        arrow: 'bool',
        stop: 'number',
        speed: 'number',
        ease: 'string'
    };

    var ClassName = {
        HOVER: 'hover'
    };

    var Selector = {
        DATA_TOGGLE: '[data-toggle="slider"]'

        // Class Definition
    };
    var Slider = function () {
        function Slider(element, config) {
            _classCallCheck(this, Slider);

            this.$el = element;
            this._config = this._getConfig(config);
            this._init();
        }

        // getters


        _createClass(Slider, [{
            key: 'dispose',


            // public
            value: function dispose() {
                $(this.$el).off(Event.CLICK);
                $.removeData(this.$el, DATA_KEY);

                this._config = null;
            }

            // private

        }, {
            key: '_getConfig',
            value: function _getConfig(config) {
                config = $.extends({}, Default, config);
                Util.typeCheckConfig(NAME, config, DefaultType);
                return config;
            }
        }, {
            key: '_forStyle',
            value: function _forStyle() {
                var _this = this;
                var ops = _this._config,
                    position = ops.position,
                    cssStr = '',
                    olIndex = ops.index;

                for (var key in position) {
                    if (position.hasOwnProperty(key)) cssStr += key + ':' + position[key] + ';';
                }

                ops.list.setAttribute('style', cssStr);

                if (olIndex > ops.num) {
                    olIndex = 1;
                }

                var oli = ops.$ol._.children('li');
                oli._.removeClass(ClassName.HOVER);
                if (olIndex - 1 < 0) {
                    olIndex++;
                }
                oli[olIndex - 1]._.addClass(ClassName.HOVER);
            }
        }, {
            key: '_event',
            value: function _event() {
                var _this = this;
                var ops = _this._config,
                    timer = void 0;

                if (ops.arrow) {
                    var $prev = $('<span class="s-prev">&nbsp;</span>'),
                        $next = $('<span class="s-next">&nbsp;</span>');

                    $prev.onclick = function () {
                        if (ops.go) {
                            ops.go = false;
                            _this._goDec(false);
                        }
                    };

                    $next.onclick = function () {
                        if (ops.go) {
                            ops.go = false;
                            _this._goDec(true);
                        }
                    };

                    _this.$el._.append($prev, $next);
                }

                ops.$ol._.on(Event.CLICK, 'li', function () {
                    ops.index = this._.index();
                    _this._goDec(true);
                });

                function setInter() {
                    timer = setInterval(function () {
                        _this._goDec(true);
                    }, ops.stop);
                }

                if (ops.auto) {
                    _this.$el.onmouseenter = function () {
                        clearInterval(timer);
                    };
                    _this.$el.onmouseleave = function () {
                        clearInterval(timer);
                        setInter();
                    };
                    setInter();
                }
            }
        }, {
            key: '_goDec',
            value: function _goDec(dec) {
                //true next, false prev
                var _this = this;
                var ops = _this._config,
                    nextGo = false;

                if (dec) {
                    ops.index++;
                    if (ops.index > ops.num) {
                        nextGo = true;
                    }
                } else {
                    ops.index--;
                    if (ops.index === 0) {
                        nextGo = true;
                    }
                }

                ops.position = {
                    transform: 'translateX(-' + ops.w * ops.index + 'px)',
                    transition: 'transform ' + ops.speed + 'ms ' + ops.ease
                };

                _this._forStyle();

                setTimeout(function () {
                    if (nextGo && dec) {
                        ops.index = 1;
                        ops.position['transform'] = 'translateX(-' + ops.w + 'px)';
                    } else if (nextGo && !dec) {
                        ops.index = ops.num;
                        ops.position['transform'] = 'translateX(-' + ops.w * ops.num + 'px)';
                    }
                    if (nextGo) {
                        ops.position['transition'] = 'none';
                        _this._forStyle();
                    }
                    ops.go = true;
                }, ops.speed);
            }
        }, {
            key: '_setting',
            value: function _setting() {
                var _this = this;
                var hidden = 'hidden';

                function onvchange(evt) {
                    var v = 'visible',
                        h = 'hidden',
                        evtMap = {
                        focus: v,
                        focusin: v,
                        pageshow: v,
                        blur: h,
                        focusout: h,
                        pagehide: h
                    };

                    evt = evt || window.event;
                    if (evt.type in evtMap) {
                        //console.log(evtMap[evt.type])
                    } else {
                        if ((this[hidden] ? 'hidden' : 'visible') === 'hidden') {
                            clearInterval(timer);
                        } else {
                            if (_this.options.auto) {
                                setInter();
                            }
                        }
                    }
                }

                function hdvis() {
                    if (hidden in document) {
                        document.addEventListener('visibilitychange', onvchange);
                    } else if ((hidden = 'mozHidden') in document) {
                        document.addEventListener('mozvisibilitychange', onvchange);
                    } else if ((hidden = 'webkitHidden') in document) {
                        document.addEventListener('webkitvisibilitychange', onvchange);
                    } else if ((hidden = 'msHidden') in document) {
                        document.addEventListener('msvisibilitychange', onvchange);
                    } else if ('onfocusin' in document) {
                        // IE 9 and lower
                        document.onfocusin = document.onfocusout = onvchange;
                    } else {
                        // All others
                        window.onpageshow = window.onpagehide = window.onfocus = window.onblur = onvchange;
                    }
                }

                hdvis();
            }
        }, {
            key: '_init',
            value: function _init() {
                var _this = this;
                var ops = _this._config;

                ops.list = _this.$el._.children('div');
                ops.num = ops.list._.children('a').length;

                if (ops.num > 1) {
                    ops.list._.append(ops.list._.children('a')[0].cloneNode(true));
                    ops.list._.prepend(ops.list._.children('a')[ops.num - 1].cloneNode(true));
                    ops.w = ops.list._.children('a')[0].offsetWidth;
                    ops.index = 1;
                    ops.go = true;

                    ops.$ol = $('<ol></ol>');

                    for (var i = 0; i < ops.num; i++) {
                        ops.$ol._.append('<li></li>');
                    }
                    _this.$el._.append(ops.$ol);

                    ops.position = {
                        transform: 'translateX(-' + ops.w + 'px)',
                        transition: 'transform ' + ops.speed + 'ms ' + ops.ease
                    };
                    _this._forStyle();

                    _this._event();
                }
            }

            // static

        }], [{
            key: '_interface',
            value: function _interface(config) {
                var data = this._.data(DATA_KEY);
                var _config = $.extends({}, Default, this._.data());

                if ((typeof config === 'undefined' ? 'undefined' : _typeof(config)) === 'object') {
                    $.extend(_config, config);
                }

                var action = typeof config === 'string' ? config : _config;

                if (!data) {
                    data = new Slider(this, _config);
                    this._.data(DATA_KEY, data);
                }

                if (typeof action === 'string') {
                    if (data[action] === undefined) {
                        throw new Error('No method named "' + action + '"');
                    }
                    data[action]();
                }
            }
        }, {
            key: 'VERSION',
            get: function get() {
                return VERSION;
            }
        }]);

        return Slider;
    }();

    // Data Api implementation


    $$(Selector.DATA_TOGGLE).forEach(function (item, i) {
        Slider._interface.call(item, item._.data());
    });

    $.add(NAME, Slider._interface);

    return Slider;
}(Bliss, Bliss.$);
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Tab = function ($, $$) {
    // Constants
    var NAME = 'tab';
    var VERSION = '1.0.0';
    var DATA_KEY = 'oc.tab';

    var Event = {
        CLICK: Util.getEvent('click')
    };

    var Default = {
        num: 0, //button length
        index: 0, //show index
        lastIndex: 0 //last index
    };

    var DefaultType = {
        num: 'number',
        index: 'number',
        lastIndex: 'number'
    };

    var ClassName = {
        ACTIVE: 'active'
    };

    var Selector = {
        DATA_TOGGLE: '[data-toggle="tab"]'

        // Class Definition
    };
    var Tab = function () {
        function Tab(element, config) {
            _classCallCheck(this, Tab);

            this.$el = element;
            this.$nav = this.$el._.children('.tab-list');
            this.$context = this.$el._.children('.tab-context')._.children('div');
            this._config = this._getConfig(config);
            this._init();
        }

        // getters


        _createClass(Tab, [{
            key: 'dispose',


            // public
            value: function dispose() {
                $(this.$el).off(Event.CLICK);
                $.removeData(this.$el, DATA_KEY);

                this._config = null;
            }

            // private

        }, {
            key: '_getConfig',
            value: function _getConfig(config) {
                config = $.extends({}, Default, config);
                Util.typeCheckConfig(NAME, config, DefaultType);
                return config;
            }
        }, {
            key: '_animate',
            value: function _animate(ajas) {
                var _this = this;
                var ops = _this._config,
                    $last = _this.$context[ops.lastIndex],
                    $now = _this.$context[ops.index],
                    requFrame = void 0;

                function ckanim() {
                    if ($now._.style('opacity') === '1') {
                        cancelAnimationFrame(requFrame);
                        $now._.addClass(ClassName.ACTIVE);
                    } else {
                        requFrame = requestAnimationFrame(ckanim);
                    }
                }

                $last._.attr({ class: 'oc-tab-out' });
                if (ajas) {
                    $now._.attr({ class: 'oc-tab-in oc-tab-load loading' });
                } else {
                    $now._.attr({ class: 'oc-tab-in' });
                }

                requFrame = requestAnimationFrame(ckanim);
            }
        }, {
            key: '_event',
            value: function _event() {
                var _this = this;
                var ops = _this._config;

                function doAjax(num) {
                    var el = _this.$context[num];

                    el._.addClass('loading');

                    _this._animate(true);

                    // $.ajax({
                    //     url: el.data('url'),
                    //     success: function(data) {
                    //         el.append(data).removeClass('loading').removeClass('oc-tab-load')
                    //     }
                    // })
                }

                _this.$nav._.on(Event.CLICK, 'button', function (e) {
                    e.preventDefault();

                    ops.lastIndex = ops.index;
                    ops.index = this._.index();
                    _this.$nav._.children('button')._.removeClass(ClassName.ACTIVE)[ops.index]._.addClass(ClassName.ACTIVE);
                    if (_this.$context[ops.index].innerHTML === '' && _this.$context[ops.index]._.data('url')) {
                        doAjax(ops.index);
                    } else {
                        _this._animate();
                    }
                });

                if (_this.$context[0].innerHTML === '' && _this.$context[0]._.data('url')) {
                    doAjax(0);
                }
            }
        }, {
            key: '_init',
            value: function _init() {
                var _this = this;
                var ops = _this._config;

                ops.num = _this.$nav._.children('button').length;
                _this.$nav._.children('button')[0]._.addClass(ClassName.ACTIVE);
                _this.$context[0]._.addClass('oc-tab-in active');
                _this._event();
            }

            // static

        }], [{
            key: '_interface',
            value: function _interface(config) {
                var data = this._.data(DATA_KEY);
                var _config = $.extends({}, Default, this._.data());

                if ((typeof config === 'undefined' ? 'undefined' : _typeof(config)) === 'object') {
                    $.extend(_config, config);
                }

                var action = typeof config === 'string' ? config : _config;

                if (!data) {
                    data = new Tab(this, _config);
                    this._.data(DATA_KEY, data);
                }

                if (typeof action === 'string') {
                    if (data[action] === undefined) {
                        throw new Error('No method named "' + action + '"');
                    }
                    data[action]();
                }
            }
        }, {
            key: 'VERSION',
            get: function get() {
                return VERSION;
            }
        }]);

        return Tab;
    }();

    // Data Api implementation


    $$(Selector.DATA_TOGGLE).forEach(function (item, i) {
        Tab._interface.call(item, item._.data());
    });

    $.add(NAME, Tab._interface);

    return Tab;
}(Bliss, Bliss.$);
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Validate = function ($, $$) {
    // Constants
    var NAME = 'validate';
    var VERSION = '1.0.0';
    var DATA_KEY = 'oc.validate';

    var Event = {
        CLICK: Util.getEvent('click')
    };

    var Default = {
        target: '', //指定验证父级
        enter: false,
        data: {},
        success: function success() {},
        error: function error() {}
    };

    var DefaultType = {
        target: '(element|string)',
        enter: 'bool',
        data: 'object',
        success: 'function',
        error: 'function'
    };

    var codelist = [{
        name: '弱 — 需包含字母及数字',
        color: 'red'
    }, {
        name: '中',
        color: 'yellow'
    }, {
        name: '强',
        color: 'dgreen'
    }, {
        name: '优秀',
        color: 'green'
    }];

    // Class Definition

    var Validate = function () {
        function Validate(element, config) {
            _classCallCheck(this, Validate);

            this.$el = element;
            this._config = this._getConfig(config);
            this._init();
        }

        // getters


        _createClass(Validate, [{
            key: 'dispose',


            // public
            value: function dispose() {
                $(this.$el).off(Event.CLICK);
                $.removeData(this.$el, DATA_KEY);

                this._config = null;
            }

            // private

        }, {
            key: '_getConfig',
            value: function _getConfig(config) {
                config = $.extends({}, Default, config);
                Util.typeCheckConfig(NAME, config, DefaultType);
                return config;
            }
        }, {
            key: '_success',
            value: function _success(el) {
                el._.removeClass('error');
            }
        }, {
            key: '_error',
            value: function _error(el) {
                el._.addClass('error');
            }
        }, {
            key: '_check',
            value: function _check(el, type) {
                var _this = this;
                var ops = _this._config;

                function changeWidth(i) {
                    el._.next()._.children('.cs-line')._.attr({ class: 'cs-line ' + codelist[i].color });
                    el._.next()._.attr({ class: 'codestrong showtxt' })._.children('.cs-txt').textContent = codelist[i].name;
                }

                function lengthCheck() {
                    if (datas.val.length >= datas.minLength && (datas.val.length <= datas.maxLength || !datas.maxLength)) {
                        return true;
                    } else {
                        return false;
                    }
                }

                function sizeCheck() {
                    if (Number(datas.val) >= datas.minSize && (Number(datas.val) <= datas.maxSize || !datas.maxSize)) {
                        return true;
                    } else {
                        return false;
                    }
                }

                /**
                 * data- 数据
                 * @param String val input值
                 * @param String allowspace 是否允许空格
                 * @param String required 允许为空
                 * @param String minSize 最小数字
                 * @param String maxSize 最大数字
                 * @param String minLength 最短长度
                 * @param String maxLength 最大长度
                 */
                var datas = {
                    minSize: 1,
                    maxSize: 0,
                    minLength: 1,
                    maxLength: 0,
                    val: el.value,
                    required: el._.attr('required')
                };

                if (el._.data('allowspace') && 1 != datas.val.split(' ').length) {
                    //allowspace有值不允许中间有空格
                    _this._error(el);
                    return false;
                }

                if (el._.data('length')) {
                    datas.minLength = el._.data('length')[0] || 1;
                    datas.maxLength = el._.data('length')[1];
                }

                if (el._.data('size')) {
                    datas.minSize = el._.data('size')[0] || 0.01;
                    datas.maxSize = el._.data('size')[1];
                }

                if (datas.required || !datas.required && datas.val) {
                    switch (type) {
                        case 'text':
                        case 'textarea':
                            return new Promise(function (resolve, reject) {
                                if (lengthCheck()) {
                                    _this._success(el);
                                    resolve();
                                } else {
                                    _this._error(el);
                                    reject();
                                }
                            });
                            break;
                        case 'password':
                            return new Promise(function (resolve, reject) {
                                if (el._.data('length')) {
                                    datas.minLength = el._.data('length')[0] || 6;
                                    datas.maxLength = el._.data('length')[1] || 18;
                                } else {
                                    datas.minLength = 8;
                                    datas.maxLength = 18;
                                }

                                if (el._.next()._.hasClass('codestrong')) {
                                    var modes = 0;
                                    //正则表达式验证符合要求的
                                    if (/\d/.test(datas.val)) modes++; //数字
                                    if (/[a-z]/.test(datas.val)) modes++; //小写
                                    if (/[A-Z]/.test(datas.val)) modes++; //大写
                                    if (/\W/.test(datas.val)) modes++; //特殊字符

                                    switch (modes) {
                                        case 1:
                                            changeWidth(0);
                                            break;
                                        case 2:
                                            changeWidth(1);
                                            break;
                                        case 3:
                                            changeWidth(2);
                                            break;
                                        case 4:
                                            if (datas.val.length > 11) {
                                                changeWidth(3);
                                            } else {
                                                changeWidth(2);
                                            }
                                            break;
                                    }

                                    if (lengthCheck() && modes > 0) {
                                        if (modes > 0) {
                                            //1
                                            _this._success(el);
                                            resolve();
                                        } else {
                                            _this._error(el);
                                            reject();
                                        }
                                    } else {
                                        el._.next()._.attr({ class: 'codestrong active' })._.children('.cs-txt').textContent = '\u8BF7\u8F93\u5165' + datas.minLength + '-' + datas.maxLength + '\u4F4D\u5B57\u7B26\u7684\u5BC6\u7801';

                                        el._.next()._.children('.cs-line')._.attr({ class: 'cs-line' });
                                        _this._error(el);
                                        reject();
                                    }
                                } else {
                                    if (lengthCheck()) {
                                        _this._success(el);
                                        resolve();
                                    } else {
                                        _this._error(el);
                                        reject();
                                    }
                                }
                            });
                            break;
                        case 'email':
                            return new Promise(function (resolve, reject) {
                                if (datas.val.match(/^\w+((-\w+)|(\.\w+))*\@[A-Za-z0-9]+((\.|-)[A-Za-z0-9]+)*\.[A-Za-z0-9]+$/) && datas.val.indexOf('。') < 0 && lengthCheck()) {
                                    _this._success(el);
                                    resolve();
                                } else {
                                    _this._error(el);
                                    reject();
                                }
                            });
                            break;
                        case 'number':
                            return new Promise(function (resolve, reject) {
                                var point = el._.data('point') || 2;
                                var tofix = datas.val.toString().split('.')[1];

                                if (el._.attr('min')) {
                                    datas.minSize = el._.attr('min');
                                    tofix = false;
                                }

                                if (el._.attr('max')) {
                                    datas.maxSize = el._.attr('max');
                                    tofix = false;
                                }

                                if (sizeCheck() && datas.val.match(/^\d+(\.\d+)?$/)) {
                                    if (tofix) {
                                        if (tofix.length <= point) {
                                            _this._success(el);
                                            resolve();
                                        } else {
                                            _this._error(el);
                                            reject();
                                        }
                                    } else {
                                        _this._success(el);
                                        resolve();
                                    }
                                } else {
                                    _this._error(el);
                                    reject();
                                }
                            });
                            break;
                        case 'tel':
                            return new Promise(function (resolve, reject) {
                                if (datas.val.match(/^0\d{2,3}-?\d{7,8}$/)) {
                                    _this._success(el);
                                    resolve();
                                } else {
                                    _this._error(el);
                                    reject();
                                }
                            });
                            break;
                        case 'mobile':
                            return new Promise(function (resolve, reject) {
                                if (datas.val.match(/^1[3456789]\d{9}$/)) {
                                    _this._success(el);
                                    resolve();
                                } else {
                                    _this._error(el);
                                    reject();
                                }
                            });
                            break;
                        case 'mtel':
                            return new Promise(function (resolve, reject) {
                                if (datas.val.match(/^0\d{2,3}-?\d{7,8}$/) || datas.val.match(/^1[34578]\d{9}$/)) {
                                    _this._success(el);
                                    resolve();
                                } else {
                                    _this._error(el);
                                    reject();
                                }
                            });
                            break;
                        case 'select':
                            return new Promise(function (resolve, reject) {
                                if (el._.parent()._.hasClass('select')) {
                                    el = el._.parent();
                                }
                                if (datas.val) {
                                    _this._success(el);
                                    resolve();
                                } else {
                                    _this._error(el);
                                    reject();
                                }
                            });
                            break;
                        case 'imgup':
                            return new Promise(function (resolve, reject) {
                                var fap = el._.parent('.imgup');
                                if (el.value.length > 0 && el.value != '[]') {
                                    _this._success(fap);
                                    resolve();
                                } else {
                                    _this._error(fap);
                                    reject();
                                }
                            });
                            break;
                        case 'city':
                            return new Promise(function (resolve, reject) {
                                if (datas.val.length > 0) {
                                    _this._success(el._.parent());
                                    resolve();
                                } else {
                                    _this._error(el._.parent());
                                    reject();
                                }
                            });
                            break;
                        case 'radio':
                        case 'checkbox':
                            return new Promise(function (resolve, reject) {
                                var name = el._.attr('name');
                                if (name && $('[name="' + name + '"]')._.attr('required')) {
                                    var ckox = false;
                                    $$('[name="' + name + '"]').forEach(function (item, i) {
                                        if (item.checked) {
                                            ckox = true;
                                            return;
                                        }
                                    });
                                    if (ckox) {
                                        $$('[name="' + name + '"]').forEach(function (item, i) {
                                            item._.parent()._.removeClass('error');
                                        });
                                        resolve();
                                    } else {
                                        $$('[name="' + name + '"]').forEach(function (item, i) {
                                            item._.parent()._.addClass('error');
                                        });
                                        reject();
                                    }
                                } else {
                                    if (datas.required) {
                                        if (el.checked) {
                                            _this._success(el._.parent());
                                            resolve();
                                        } else {
                                            _this._error(el._.parent());
                                            reject();
                                        }
                                    }
                                }
                            });
                            break;
                    }
                } else {
                    return new Promise(function (resolve, reject) {
                        _this._success(el);
                        resolve();
                    });
                }
            }
        }, {
            key: '_getLsit',
            value: function _getLsit() {
                var ops = this._config;
                ops.target = ops.target || this.$el._.parent('form');

                var ckList = [],
                    wlist = ops.target.querySelectorAll('*');

                wlist = Array.prototype.slice.call(wlist);
                if (wlist.length > 0) {
                    wlist.forEach(function (item, i) {
                        var nodename = item.nodeName.toLocaleLowerCase();
                        switch (nodename) {
                            case 'input':
                            case 'textarea':
                            case 'select':
                                ckList.push(item);
                                break;
                        }
                    });
                }

                return ckList;
            }
        }, {
            key: '_init',
            value: function _init() {
                var _this = this;
                var $this = _this.$el;
                var ops = _this._config;

                function getType(item) {
                    var type = item._.data('type') || item._.attr('type');
                    if (!type) {
                        type = item.nodeName.toLowerCase();
                    }
                    return type;
                }

                function checkType(type) {
                    switch (type) {
                        case 'text':
                        case 'textarea':
                        case 'password':
                        case 'email':
                        case 'number':
                        case 'tel':
                        case 'mobile':
                        case 'mtel':
                        case 'select':
                        case 'imgup':
                        case 'city':
                        case 'radio':
                        case 'checkbox':
                            return true;
                            break;
                        default:
                            return false;
                    }
                }

                var opmap = _this._getLsit();

                opmap.forEach(function (item, i) {
                    var type = getType(item);
                    var vname = ops.data[item.name];
                    if (vname) {
                        switch (type) {
                            case 'select':
                                item.value = vname;
                                item._.select('update');
                                break;
                            case 'radio':
                                $$('input[name="' + item.name + '"]').forEach(function (rck, i) {
                                    if (rck.value == vname) {
                                        rck.checked = true;
                                    }
                                });
                                break;
                            case 'checkbox':
                                $$('input[name="' + item.name + '"]').forEach(function (rck, i) {
                                    for (var cv in vname) {
                                        if (vname.hasOwnProperty(cv)) {
                                            if (rck.value == vname[cv]) {
                                                rck.checked = true;
                                            }
                                        }
                                    }
                                });
                                break;
                            case 'imgup':
                                item.value = vname;
                                item._.parent()._.imgup('update');
                                break;
                            case 'city':
                                item.value = vname;
                                item._.parent()._.city('update');
                                break;
                            default:
                                item.value = vname;
                        }
                    }
                    if (!item._.data('off') && checkType(type)) {
                        var events = item._.data('keyup') ? 'onkeyup' : 'onchange';
                        item[events] = function () {
                            _this._check(item, type).catch(function () {});
                        };
                        item['validate'] = function () {
                            return _this._check(item, type);
                        };
                    }
                });

                if (ops.enter) {
                    $('body')._.off('keydown');
                    $('body').onkeydown = function (e) {
                        13 === e.which && $this.click();
                    };
                }

                function PromiseForEach() {
                    var opck = _this._getLsit();
                    var realResult = [];
                    var result = Promise.resolve();
                    opck.forEach(function (item, index) {
                        result = result.then(function () {
                            if (item['validate']) {
                                return item['validate']().catch(function () {
                                    realResult.push(item);
                                });
                            }
                        });
                    });

                    return result.then(function () {
                        return realResult;
                    });
                }

                $this.onclick = function () {
                    $this._.addClass('process');
                    PromiseForEach().then(function (data) {
                        $this._.removeClass('process');
                        // console.log("成功");
                        // console.log(data);
                        if (data.length === 0) {
                            if (!ops.success) {
                                $this._.attr({ disabled: true })._.parent('form').submit();
                            } else {
                                var checkEl = _this._getLsit();
                                var obj = {};
                                checkEl.forEach(function (item, i) {
                                    var type = getType(item);
                                    var name = item.name;
                                    if (type && name) {
                                        switch (type) {
                                            case 'text':
                                            case 'textarea':
                                            case 'password':
                                            case 'email':
                                            case 'number':
                                            case 'tel':
                                            case 'mobile':
                                            case 'mtel':
                                            case 'select':
                                            case 'city':
                                            case 'imgup':
                                                obj[name] = item.value;
                                            case 'radio':
                                                if (item.checked) {
                                                    obj[name] = item.value;
                                                }
                                                break;
                                            case 'checkbox':
                                                if (item.checked) {
                                                    if (obj[name]) {
                                                        obj[name].push(item.value);
                                                    } else {
                                                        obj[name] = [item.value];
                                                    }
                                                }
                                                break;
                                        }
                                    }
                                });
                                ops.success(obj);
                            }
                        } else {
                            ops.error(data);
                        }
                    }).catch(function (err) {
                        $this._.removeClass('process');
                        // console.log(err);
                        // console.log("失败");
                    });
                };
            }

            // static

        }], [{
            key: '_interface',
            value: function _interface(config) {
                var data = this._.data(DATA_KEY);
                var _config = $.extends({}, Default, this._.data());

                if ((typeof config === 'undefined' ? 'undefined' : _typeof(config)) === 'object') {
                    $.extend(_config, config);
                }

                var action = typeof config === 'string' ? config : _config;

                if (!data) {
                    data = new Validate(this, _config);
                    this._.data(DATA_KEY, data);
                }

                if (typeof action === 'string') {
                    if (data[action] === undefined) {
                        throw new Error('No method named "' + action + '"');
                    }
                    data[action]();
                }
            }
        }, {
            key: 'VERSION',
            get: function get() {
                return VERSION;
            }
        }]);

        return Validate;
    }();

    $.add(NAME, Validate._interface);

    return Validate;
}(Bliss, Bliss.$); /**
                    * validate插件
                    * @param Boolean enter 是否回车提交 false
                    * @param Function success 成功返回的方法
                    * @param Function error 失败返回的方法
                    * @returns null
                    * @author Dr.Who
                    * @editTime 2016-06-08
                    * @use $.fn.validate()
                    */
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Imgup = function ($, $$) {
    // Constants
    var NAME = 'imgup';
    var VERSION = '1.0.0';
    var DATA_KEY = 'oc.imgup';

    var Event = {
        CLICK: Util.getEvent('click')
    };

    var Default = {
        max: 1,
        size: '10MB',
        num: 1,
        mult: true,
        uplist: []
        // backfn: null //function (map) {}//返回map
    };

    var DefaultType = {
        max: 'number',
        size: 'string',
        num: 'number',
        mult: 'bool',
        uplist: 'array'
        // backfn: '(function|null)'
    };

    var ClassName = {
        ACTIVE: 'active',
        MISS: 'dismiss',
        OVERLAY: 'overlay-layer'
    };

    var Selector = {
        DATA_TOGGLE: '[data-toggle="imgup"]'

        // Class Definition
    };
    var Imgup = function () {
        function Imgup(element, config) {
            _classCallCheck(this, Imgup);

            this.$el = element;
            this._config = this._getConfig(config);
            this._init();
        }

        // getters


        _createClass(Imgup, [{
            key: 'dispose',


            // public
            value: function dispose() {
                $(this.$el).off(Event.CLICK);
                $.removeData(this.$el, DATA_KEY);

                this._config = null;
            }
        }, {
            key: 'update',
            value: function update() {
                var ops = this._config,
                    $this = this.$el,
                    $input = $this._.find('input[type="hidden"]').value,
                    ils = Array.prototype.slice.call($this.querySelectorAll('.ils')),
                    iup = $this.querySelector('.iup');

                if (ils.length > 0) {
                    ils._.remove();
                }

                if ($input.length > 0) {
                    ops.uplist = JSON.parse($input);
                    ops.num = ops.uplist.length + 1;
                    for (var i = 0; i < ops.uplist.length; i++) {
                        var data = ops.uplist[i];

                        iup._.before('<label class="btn ils active"><img src="' + data.url + '"><span data-id="' + data.id + '">\u5220\u9664</span></label>');
                    }
                }

                if (ops.max == $this._.children('label').length - 1) {
                    iup.style.display = 'none';
                }
            }

            // private

        }, {
            key: '_getConfig',
            value: function _getConfig(config) {
                config = $.extends({}, Default, config);
                Util.typeCheckConfig(NAME, config, DefaultType);
                return config;
            }
        }, {
            key: '_upload',
            value: function _upload(img, num, spanlk) {
                var _this = this;
                var $this = _this.$el;

                var ops = _this._config;

                function convertBase64UrlToBlob(urlData) {
                    var imgType = urlData.split(',')[0];
                    imgType = imgType.split(':')[1];
                    imgType = imgType.split(';')[0];
                    var bytes = window.atob(urlData.split(',')[1]); //去掉url的头，并转换为byte
                    //处理异常,将ascii码小于0的转换为大于0
                    var ab = new ArrayBuffer(bytes.length);
                    var ia = new Uint8Array(ab);
                    for (var i = 0; i < bytes.length; i++) {
                        ia[i] = bytes.charCodeAt(i);
                    }

                    return new Blob([ab], {
                        type: imgType
                    });
                }

                function uploadProgress(evt) {
                    if (evt.lengthComputable) {
                        // var percentComplete = Math.round(evt.loaded * 100 / evt.total)
                    } else {
                        console.log('unable to compute');
                    }
                }

                function uploadComplete(evt) {
                    var data = JSON.parse(evt.currentTarget.response);
                    if (data.result == 1) {
                        data = data.body;
                        for (var i = 0; i < data.length; i++) {
                            ops.uplist.push({
                                id: num,
                                url: data[i].url,
                                relativeUrl: data[i].relativeUrl
                            });
                        }
                        $this._.children('input[type="hidden"]').value = JSON.stringify(ops.uplist);
                        spanlk._.attr({ class: 'btn active' });
                        $this._.removeClass('error');
                    } else {
                        console.log('失败');
                    }
                }

                function uploadFailed(evt) {
                    $.fn.notification({
                        text: '上传文件失败，请重试。',
                        type: 'error'
                    });
                }

                function uploadCanceled(evt) {
                    $.fn.notification({
                        text: '上传文件被取消，上传失败。',
                        type: 'error'
                    });
                }

                var oData = new FormData(),
                    xhr = new XMLHttpRequest();

                oData.append('filePath', convertBase64UrlToBlob(img.data), img.name);

                oData.append('style', $this._.data('style') ? $this._.data('style') : '1');

                oData.append('userId', $this._.data('userId'));

                xhr.upload.addEventListener('progress', uploadProgress, false);
                xhr.addEventListener('load', uploadComplete, false);
                xhr.addEventListener('error', uploadFailed, false);
                xhr.addEventListener('abort', uploadCanceled, false);
                xhr.open('POST', 'image/upload');
                xhr.send(oData);
            }
        }, {
            key: '_doCompress',
            value: function _doCompress(img, type) {
                var canvas = document.createElement('canvas'),
                    width = img.width,
                    height = img.height,
                    ctx = canvas.getContext('2d'),
                    scale = width / height,
                    wleng = width.toString().length;

                if (scale > 1) {
                    scale = height / width;
                } else if (scale === 1) {
                    scale = 0.8;
                }

                while (wleng > 3) {
                    width = parseInt(width * scale);
                    height = parseInt(height * scale);
                    wleng = width.toString().length;
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                var base = canvas.toDataURL(type);

                if (base === 'data:,') {
                    base = img.src;
                }

                return base;
            }
        }, {
            key: '_init',
            value: function _init() {
                var _this = this;
                var $this = _this.$el;

                var ops = _this._config,
                    $input = $this._.find('input[type="hidden"]').value,
                    size = ['Bytes', 'KB', 'MB'],
                    sizes = void 0,
                    display = '';

                ops.uplist = [];
                if (ops.max) ops.max = parseInt(ops.max);
                if (ops.num) ops.num = parseInt(ops.num);

                if ($input.length > 0) {
                    ops.uplist = JSON.parse($input);
                    ops.num = ops.uplist.length + 1;
                    for (var i = 0; i < ops.uplist.length; i++) {
                        var data = ops.uplist[i];

                        $this._.append('<label class="btn ils active"><img src="' + data.url + '"><span data-id="' + data.id + '">\u5220\u9664</span></label>');
                    }
                }

                if ($this._.children('label')) {
                    if (ops.max == $this._.children('label').length) {
                        display = 'style="display:none;"';
                    }
                }

                $this._.append('<label class="btn iup" ' + display + '>\n                <input type="file" data-off="true" accept="image/gif,image/jpeg,image/png" multiple>\n                <span>\u5220\u9664</span>\n            </label>');

                function bytesToSize(bytes) {
                    //显示大小
                    if (bytes === 0) return 'n/a';
                    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
                    sizes = i;
                    return (bytes / Math.pow(1024, i)).toFixed(1) + size[i];
                }

                function sizeOk(fileSize) {
                    var sResultFileSize = bytesToSize(fileSize),
                        unit,
                        isbool = false;
                    if (ops.size === 0) {
                        isbool = true;
                    } else {
                        for (var i = 0; i < 3; i++) {
                            if (ops.size.lastIndexOf(size[i]) >= 1) {
                                unit = i;
                                break;
                            }
                        }

                        if (unit > sizes) {
                            isbool = true;
                        } else if (unit === sizes) {
                            if (parseFloat(sResultFileSize) <= parseFloat(ops.size)) {
                                isbool = true;
                            }
                        }
                    }
                    return isbool;
                }

                function destroy(img) {
                    var canvas = img.canvas;
                    img.onload = null;

                    if (canvas) {
                        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
                        canvas.width = canvas.height = 0;
                        _this._canvas = null;
                    }

                    // 释放内存。非常重要，否则释放不了image的内存
                    img.src = '';
                    img = null;
                }

                function doProccess(file, el) {
                    if (/image\/\w+/.test(file.type)) {
                        var reader = new FileReader();
                        reader.onload = function () {
                            var img = new Image();
                            img.src = this.result;
                            var basedata = _this._doCompress(img, file.type);

                            if (_this.$el._.children('label').length > ops.max) {
                                el.style.display = 'none';
                                return false;
                            }

                            var $spanload = $('<label class="btn ils imgload"><img src="' + basedata + '"><span data-id="' + ops.num + '">\u5220\u9664</span></label>');

                            el._.before($spanload);

                            if (_this.$el._.children('label').length > ops.max) {
                                el.style.display = 'none';
                            }

                            ops.uplist.push({
                                id: ops.num,
                                url: './img/avater.jpg'
                            });
                            $this._.children('input[type="hidden"]').value = JSON.stringify(ops.uplist);

                            var cots = 1;
                            $spanload._.attr({ process: '10%' });
                            var ttmm = setInterval(function () {
                                var hb = cots + '%';
                                $spanload._.attr({ process: hb });
                                cots++;
                                if (cots > 99) {
                                    clearInterval(ttmm);
                                    $spanload._.attr({ class: 'btn ils active' });
                                    $this._.removeClass('error');
                                }
                            }, 10);

                            // _this._upload({data: this.result, name: file.name}, ops.num, $spanload)

                            if (ops.backfn) {
                                ops.backfn({
                                    id: ops.num,
                                    data: this.result,
                                    name: file.name
                                });
                            }

                            ops.num++;

                            destroy(img);
                        };

                        reader.onerror = function () {
                            $.fn.notification({
                                text: '发送错误，请重试。',
                                type: 'error'
                            });
                        };

                        if (sizeOk(file.size)) {
                            reader.readAsDataURL(file);
                        } else {
                            if (!_this.nblob) {
                                $this.value = '';
                            }
                            $.fn.notification({
                                text: '图片太大，请上传小于' + ops.size + '的图片',
                                type: 'info'
                            });
                        }
                    } else {
                        var sd;
                        $this._.attr('accept') === null ? sd = 'others' : sd = $this._.attr('accept');
                        if (sd.indexOf('image') === -1) {
                            $parent._.addClass('file');
                        } else {
                            $.fn.notification({
                                text: '\u8BF7\u9009\u62E9\u6B63\u786E\u7684\u56FE\u7247\u683C\u5F0F\u3002', //请选择正确的图片格式。
                                type: 'info'
                            });
                        }
                    }
                }

                if (!window.FileReader) {
                    if (!$('#imgupload')) {
                        var iframeSrc = /^https/i.test(window.location.href || '') ? 'javascript:false' : 'about:blank';
                        var _form = $('<div class="">\n                        <iframe name="ifimgup" src="' + iframeSrc + '"></iframe>\n                        <form id="imgupload" action="//172.19.5.11/web/newImage/upload" method="post" enctype="multipart/form-data" target="ifimgup">\n                            <input type="file" id="filePath" name="filePath">\n                        </form>\n                    </div>');

                        $('body').append(_form);

                        var $form = _form._.find('#imgupload');
                        var $iframe = _form._.find('iframe');
                        var $path = _form._.find('#filePath');

                        $path.onchange = function () {
                            $form.submit();
                        };

                        $iframe.onload = function () {
                            console.log('loaded');
                            var fam = $iframe.contentWindow;
                            console.log(fam.document.body.innerText);
                        };

                        var prevs = _this.$el._.find('input[type="file"]')._.parent();
                        _this.$el._.find('input[type="file"]')._.remove();

                        prevs.onclick = function (e) {
                            e.stopPropagation();
                            e.preventDefault();

                            $path._.fire('click');
                        };

                        // const el = $this._.parent()
                        //
                        // var $spanload = $(`<label class="btn imgload"><img src=""><span data-id="${ops.num}">删除</span></label>`)
                        //
                        // $spanload._.attr({'style': 'filter: progid:DXImageTransform.Microsoft.AlphaImageLoader(sizingMethod="scale",src="' + $this.value + '")'})
                        //
                        // el._.before($spanload)
                    }
                } else {
                    _this.$el._.on('change', 'input[type="file"]', function (e) {
                        e.stopPropagation();
                        e.preventDefault();

                        var $this = this,
                            files = e.target.files;

                        for (var i = 0; i < files.length; i++) {
                            doProccess(files[i], $this._.parent());
                        }

                        $this.value = '';
                    });
                }

                _this.$el._.on(Event.CLICK, 'span', function (e) {
                    e.preventDefault();
                    e.stopPropagation();

                    var $span = this,
                        id = $span._.data('id');

                    if (ops.backfn) {
                        ops.backfn(id);
                    } else {
                        for (var ls in ops.uplist) {
                            if (ops.uplist.hasOwnProperty(ls)) {
                                if (ops.uplist[ls].id == id) {
                                    ops.uplist.splice(ls, 1);
                                }
                            }
                        }
                        $this._.children('input[type="hidden"]').value = JSON.stringify(ops.uplist);
                    }

                    if (_this.$el._.children('label').length > 1) {
                        $span._.parent()._.remove();
                        var labels = _this.$el._.children('label');
                        if (labels.length && labels.length <= ops.max) {
                            labels[labels.length - 1].style.display = 'inline-block';
                        } else {
                            labels.style.display = 'inline-block';
                        }
                    } else {
                        $span._.parent()._.removeAttr('style')._.removeClass('active');
                    }
                });
            }

            // static

        }], [{
            key: '_interface',
            value: function _interface(config) {
                var data = this._.data(DATA_KEY);
                var _config = $.extends({}, Default, this._.data());

                if ((typeof config === 'undefined' ? 'undefined' : _typeof(config)) === 'object') {
                    $.extend(_config, config);
                }

                var action = typeof config === 'string' ? config : _config;

                if (!data) {
                    data = new Imgup(this, _config);
                    this._.data(DATA_KEY, data);
                }

                if (typeof action === 'string') {
                    if (data[action] === undefined) {
                        throw new Error('No method named "' + action + '"');
                    }
                    data[action]();
                }
            }
        }, {
            key: 'VERSION',
            get: function get() {
                return VERSION;
            }
        }]);

        return Imgup;
    }();

    // Data Api implementation


    $$(Selector.DATA_TOGGLE).forEach(function (item, i) {
        Imgup._interface.call(item, item._.data());
    });

    $.add(NAME, Imgup._interface);

    return Imgup;
}(Bliss, Bliss.$); /**
                    * Imgup
                    * @param null
                    * @returns null
                    * @author Dr.Who
                    * @editTime 2016-07-19
                    * @use class .imgup
                    */
'use strict';

/**
 * Imgbox
 * @param null
 * @returns null
 * @author Dr.Who
 * @editTime 2017-09-19
 */
;(function ($, $$) {
    var $gallery = null,
        $thumbnails,
        $image,
        $thumbImg,
        imageWidth,
        imageHeight,
        imgRatio,
        ratio = 1.2,
        //图片缩放倍率
    thumbnailsWidth = 180,
        //右下角缩略图宽度
    thumbnailsHeight = 120,
        //右下角缩略图高度
    isVertical = false,
        activeIndex = 0,
        cW = document.documentElement.clientWidth,
        cH = document.documentElement.clientHeight,
        list;

    function oc_toggleImage() {
        imageWidth = list[activeIndex].imgWidth;
        imageHeight = list[activeIndex].imgHeight;
        imgRatio = imageWidth / imageHeight;

        $gallery._.find('.image')._.removeClass('active');
        $image = $gallery._.find('.image')[activeIndex];
        if (!$image) {
            $image = $gallery._.find('.image');
        }
        $image._.addClass('active');
        $image._.style({
            width: imageWidth,
            height: imageHeight
        });
        $image._.removeClass('rotate0 rotate90 rotate180 rotate270');

        $thumbImg = $thumbnails._.find('img');
        $thumbImg._.attr({ src: list[activeIndex].url });

        $thumbImg.removeAttribute('class');
        $thumbImg.removeAttribute('style');
        isVertical = false;
        $thumbnails.style.display = 'none';

        oc_setImagePosition();
    }

    function oc_setData(el, father) {
        var imgs = father._.find('img'),
            src = el._.attr('src'),
            imgHeight = el.naturalHeight,
            imgWidth = el.naturalWidth,
            ratio = imgWidth / imgHeight,
            wH = 415,
            wW = 615,
            winHeight,
            winWidth,
            windowMargin = 15,
            maxHeight = cH - windowMargin * 2,
            maxWidth = cW - windowMargin;

        winWidth = Math.max(wW, imgWidth);
        winHeight = Math.max(wH, imgHeight);

        if (winWidth > maxWidth) {
            winWidth = maxWidth;
            winHeight = Math.max(wH, Math.ceil(winWidth / ratio));
            if (imgWidth > winWidth) {
                imgWidth = winWidth;
                imgHeight = Math.ceil(imgWidth / ratio);
            }
        }

        if (winHeight > maxHeight) {
            winHeight = maxHeight;
            winWidth = Math.max(wW, Math.ceil(winHeight * ratio));
            if (imgHeight > winHeight) {
                imgHeight = winHeight;
                imgWidth = Math.ceil(imgHeight * ratio);
            }
        }

        list = [];

        if (!imgs.length) {
            var temp = [];
            temp.push(imgs);
            imgs = temp;
        }

        imgs.forEach(function (item, i) {
            var url = item._.attr('src'),
                nH = item.naturalHeight,
                nW = item.naturalWidth,
                ratio = nW / nH,
                w = nW,
                h = nH;

            if (url == src) {
                activeIndex = i;
                w = imgWidth;
                h = imgHeight;
            } else {
                if (nW > winWidth) {
                    w = winWidth;
                    nH = h = Math.ceil(w / ratio);
                    if (h > winHeight) {
                        nH = h = winHeight;
                        w = Math.ceil(h * ratio);
                    }
                }
                if (nH > winHeight) {
                    h = winHeight;
                    w = Math.ceil(h * ratio);
                    if (w > winWidth) {
                        w = winWidth;
                        h = Math.ceil(w / ratio);
                    }
                }
            }

            list.push({
                url: url,
                imgHeight: h,
                imgWidth: w
            });
        });

        list.forEach(function (item, i) {
            var images = $('<img class="image" src="' + item.url + '" style="width:' + item.imgWidth + 'px;height:' + item.imgHeight + 'px;left:' + (cW - item.imgWidth) / 2 + 'px;top:' + (cH - item.imgHeight) / 2 + 'px"ondragstart="return false;"/>');
            $gallery._.append(images);
        });

        oc_toggleImage();
    }

    function oc_setImagePosition() {
        //设置图片位置
        var w = $image.width,
            h = $image.height;

        var left = (cW - w) / 2,
            top = (cH - h) / 2;

        $image._.style({
            left: left + 'px',
            top: top + 'px'
        });
    }

    function oc_event() {
        var isFirefox = navigator.userAgent.indexOf('Firefox') > -1,
            MOUSEWHEEL_EVENT = isFirefox ? 'DOMMouseScroll' : 'mousewheel',
            thumbX,
            thumbY,
            $bigger = $gallery._.find('.oper_bigger'),
            $smaller = $gallery._.find('.oper_smaller'),
            $rotate = $gallery._.find('.oper_rotate'),
            $prev = $gallery._.find('.oper_prev'),
            $next = $gallery._.find('.oper_next'),
            $btnclose = $gallery._.find('.oper_close'),
            $close = $gallery._.find('.loading-close');

        $thumbnails = $gallery._.find('.thumbnails');

        function closed() {
            $gallery._.addClass('hidbox');
            $('body')._.removeClass('overlay-layer-top');

            setTimeout(function () {
                $gallery._.remove();
                $gallery = null;
            }, 300);
        }

        function biggerImage() {
            var w = $image._.style('width'),
                h = $image._.style('height'),
                nextW = w * ratio,
                nextH = h * ratio;
            if (nextW - w < 1) nextW = Math.ceil(nextW);
            var percent = (nextW / imageWidth * 100).toFixed(0);
            if (percent > 90 && percent < 110) {
                percent = 100;
                nextW = imageWidth;
                nextH = imageHeight;
            } else if (percent > 1600) {
                percent = 1600;
                nextW = imageWidth * 16;
                nextH = imageHeight * 16;
            }

            $image._.style({
                width: nextW + 'px',
                height: nextH + 'px'
            });
            oc_setImagePosition();
            // showPercentTip(percent);
            showThumbnails(nextW, nextH);
        }

        function smallerImage() {
            var w = $image._.style('width'),
                h = $image._.style('height'),
                nextW,
                nextH,
                percent = (w / ratio / imageWidth * 100).toFixed(0);

            if (percent < 5) {
                percent = 5;
                nextW = imageWidth / 20;
                nextH = imageHeight / 20;
            } else if (percent > 90 && percent < 110) {
                percent = 100;
                nextW = imageWidth;
                nextH = imageHeight;
            } else {
                nextW = w / ratio;
                nextH = h / ratio;
            }

            $image._.style({
                width: nextW + 'px',
                height: nextH + 'px'
            });
            oc_setImagePosition();
            // showPercentTip(percent);
            showThumbnails(nextW, nextH);
        }

        function mouseWheelScroll(e) {
            var _delta = parseInt(e.wheelDelta || -e.detail);
            //向上滚动
            if (_delta > 0) {
                biggerImage();
            } else {
                //向下滚动
                smallerImage();
            }
        }

        //设置缩略图拖拽区域
        function setThumbnails() {
            var $img = $thumbnails._.find('img'),
                sW = $img.width,
                sH = $img.height,
                w = $image.width,
                h = $image.height,
                imf = $image.getBoundingClientRect(),
                imfl = imf.left,
                imft = imf.top,
                tW,
                tH,
                tl,
                tt;

            if (isVertical) {
                sW = [sH, sH = sW][0];
                w = [h, h = w][0];
            }

            tW = sW / (w / cW);
            if (w < cW) tW = sW;
            tH = sH / (h / cH);
            if (h < cH) tH = sH;
            tl = (thumbnailsWidth - sW) / 2 + -imfl / w * sW;
            if (w < cW) tl = (thumbnailsWidth - sW) / 2;
            tt = (thumbnailsHeight - sH) / 2 + -imft / h * sH;
            if (h < cH) tt = (thumbnailsHeight - sH) / 2;
            $thumbnails._.find('.thumbDrag')._.style({
                width: tW + 'px',
                height: tH + 'px',
                left: tl + 'px',
                top: tt + 'px'
            });
        }

        //显示缩略图
        function showThumbnails(width, height) {
            if (isVertical) width = [height, height = width][0];
            if (width > cW || height > cH) {
                $thumbnails.style.display = 'block';
                setThumbnails();
            } else {
                $thumbnails.style.display = 'none';
            }
        }

        function resizeThumbImg(rotateDeg) {
            var maxW = thumbnailsWidth,
                maxH = thumbnailsHeight;
            if (rotateDeg == '90' || rotateDeg == '270') {
                maxW = [maxH, maxH = maxW][0];
            }
            $thumbImg._.style({
                maxWidth: maxW,
                maxHeight: maxH
            });

            $thumbnails.style.display = 'none';
        }

        //上一张
        $prev.onclick = function () {
            if (activeIndex > 0) {
                activeIndex--;
                oc_toggleImage();
            }
        };

        //下一张
        $next.onclick = function () {
            if (activeIndex < list.length - 1) {
                activeIndex++;
                oc_toggleImage();
            }
        };

        //键盘左右键
        // document.onkeydown = function(e){
        // 	e = e || window.event;
        // 	if (e.keyCode) {
        // 		if(e.keyCode == 37 ){
        // 			$prev.click();
        // 		}
        // 		if(e.keyCode == 39 ){
        // 			$next.click();
        // 		}
        // 	}
        // };

        //关闭
        $close.onclick = closed;
        $btnclose.onclick = closed;

        //放大图片
        $bigger.onclick = biggerImage;

        //缩小图片
        $smaller.onclick = smallerImage;

        window.onresize = function () {
            cW = document.documentElement.clientWidth;
            cH = document.documentElement.clientHeight;
            oc_setImagePosition();
        };

        //旋转
        $rotate.onclick = function () {
            var rotateClass = $image._.attr('class').match(/(rotate)(\d*)/);
            if (rotateClass) {
                var nextDeg = (rotateClass[2] * 1 + 90) % 360;
                $image._.removeClass(rotateClass[0])._.addClass('rotate' + nextDeg);
                $thumbImg._.removeClass(rotateClass[0])._.addClass('rotate' + nextDeg);
                // resizeImage(nextDeg);
                resizeThumbImg(nextDeg);
                isVertical = nextDeg == 90 || nextDeg == 270;
            } else {
                $image._.addClass('rotate90');
                $thumbImg._.addClass('rotate90');
                // resizeImage("90");
                resizeThumbImg('90');
                isVertical = true;
            }
        };

        if (document.attachEvent) {
            $gallery.attachEvent('on' + MOUSEWHEEL_EVENT, function (e) {
                e.stopPropagation();
                e.preventDefault();
                mouseWheelScroll(e);
            });
        } else if (document.addEventListener) {
            $gallery.addEventListener(MOUSEWHEEL_EVENT, function (e) {
                e.stopPropagation();
                e.preventDefault();
                mouseWheelScroll(e);
            }, false);
        }

        $thumbnails.onmouseenter = function (e) {
            thumbX = -1;
        };

        $thumbnails.onmousedown = function (e) {
            thumbX = e.pageX || e.clientX;
            thumbY = e.pageY || e.clientY;
            e.stopPropagation();
        };

        $thumbnails.onmousemove = function (e) {
            if (thumbX > 0) {
                var nextDragX = e.pageX || e.clientX;
                var nextDragY = e.pageY || e.clientY;
                var $td = $thumbnails._.find('.thumbDrag'),
                    imageWidth = $image._.style('width'),
                    imageHeight = $image._.style('height'),
                    left = parseFloat($td._.style('left')) + (nextDragX - thumbX),
                    top = parseFloat($td._.style('top')) + (nextDragY - thumbY),
                    w = $td._.style('width'),
                    h = $td._.style('height'),
                    it,
                    il,
                    maxL,
                    maxT;

                if (isVertical) {
                    thumbnailsWidth = [thumbnailsHeight, thumbnailsHeight = thumbnailsWidth][0];
                    imageWidth = [imageHeight, imageHeight = imageWidth][0];
                }
                ;it = (thumbnailsHeight - thumbnailsHeight) / 2, il = (thumbnailsWidth - thumbnailsWidth) / 2, maxL = thumbnailsWidth - w - il - 2, //减去2像素边框部分
                maxT = thumbnailsHeight - h - it - 2;

                if (left < il) left = il;else if (left > maxL) left = maxL;

                if (top < it) top = it;else if (top > maxT) top = maxT;

                $td._.style({
                    left: left + 'px',
                    top: top + 'px'
                });

                thumbX = nextDragX;
                thumbY = nextDragY;

                if (imageWidth < cW) left = (cW - imageWidth) / 2;else left = -imageWidth * (left - il) / thumbnailsWidth;

                if (imageHeight < cH) top = (cH - imageHeight) / 2;else top = -imageHeight * (top - it) / thumbnailsHeight;

                $image._.style({
                    left: left + 'px',
                    top: top + 'px'
                });
            }
        };

        $thumbnails.onmouseup = function (e) {
            thumbX = -1;
        };

        $thumbnails._.find('.thumbClose').onclick = function () {
            $thumbnails.style.display = 'none';
        };
    }

    function imgbox(el, type) {
        activeIndex = 0;
        isVertical = false;
        $gallery = $('<div class="oc-gallery showbox">\n        <span class="loading-close">&nbsp;</span>\n        <div class="tool">\n            <div class="toolct">\n                <button class="btn t-white oper_bigger" type="button">\u653E\u5927</button>\n                <button class="btn t-white oper_smaller" type="button">\u7F29\u5C0F</button>\n                <button class="btn t-white oper_rotate" type="button">\u65CB\u8F6C</button>\n                <button class="btn t-white oper_prev" type="button">\u4E0A\u4E00\u5F20</button>\n                <button class="btn t-white oper_next" type="button">\u4E0B\u4E00\u5F20</button>\n                <button class="btn t-white oper_close" type="button">\u5173\u95ED</button>\n            </div>\n        </div>\n        <div class="thumbnails">\n            <button class="btn thumbClose" type="button">\u5173\u95ED\u7F29\u7565\u56FE</button>\n            <img ondragstart="return false;"/>\n            <div class="thumbDrag"><span></span></div>\n        </div>\n    </div>');

        $('body')._.append($gallery);

        oc_event();

        var father;

        if (!type) {
            father = el._.parent('.imgbox');
        } else {
            father = el._.parent('.imgup');
        }

        oc_setData(el, father);

        $('body')._.addClass('overlay-layer-top');
    }

    $('body')._.on('click', '.imgbox img', function () {
        imgbox(this);
    });

    $('body')._.on('click', '.imgup img', function () {
        imgbox(this, true);
    });
})(Bliss, Bliss.$);
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var City = function ($, $$) {
    // Constants
    var NAME = 'city';
    var VERSION = '1.0.0';
    var DATA_KEY = 'oc.city';

    var Event = {
        CLICK: Util.getEvent('click')
    };

    var Default = {
        index: 0 // 备用，删减选项卡使用
    };

    var DefaultType = {
        index: 'number'
    };

    var ClassName = {
        SELECT: '.city',
        ACTIVE: 'active'
    };

    var Selector = {
        DATA_TOGGLE: '[data-toggle="city"]'

        // Class Definition
    };
    var City = function () {
        function City(element, config) {
            _classCallCheck(this, City);

            this.$el = element;
            this._config = this._getConfig(config);
            this._init();
        }

        // getters


        _createClass(City, [{
            key: 'dispose',


            // public
            value: function dispose() {
                $(this.$el).off(Event.CLICK);
                $.removeData(this.$el, DATA_KEY);

                this._config = null;
            }
        }, {
            key: 'update',
            value: function update() {
                this._update();
            }

            // private

        }, {
            key: '_getConfig',
            value: function _getConfig(config) {
                config = $.extends({}, Default, config);
                Util.typeCheckConfig(NAME, config, DefaultType);
                return config;
            }
        }, {
            key: '_setCityData',
            value: function _setCityData(data, obj, str) {
                var ops = this._config;
                data = Area[data];
                obj.innerHTML = '';
                if (data) {
                    Object.keys(data).forEach(function (item, i) {
                        var span = $('<span data-id="' + item + '">' + data[item] + '</span>');
                        if (str && item == ops.ctx[str]) {
                            span._.addClass('active');
                        }

                        obj._.append(span);
                    });
                } else {
                    obj._.append('<span data-id="">\u5E02\u533A</span>');
                }
            }
        }, {
            key: '_setTop',
            value: function _setTop(obj) {
                var act = obj._.children('.active');
                obj.scrollTop = act.offsetTop - 75 + act.offsetHeight / 2;
            }
        }, {
            key: '_update',
            value: function _update() {
                var $el = this.$el;
                var ops = this._config;
                var $input = $el._.children('input'),
                    $ctx = $el._.children('.city-content'),
                    $province = $ctx._.children('.city-province'),
                    $city = $ctx._.children('.city-city'),
                    $district = $ctx._.children('.city-district'),
                    $title = $el._.children('.city-title');

                ops.ctx = JSON.parse($input.value);
                this._setCityData(86, $province, 'province');
                this._setCityData(ops.ctx.province, $city, 'city');
                this._setCityData(ops.ctx.city, $district, 'district');
                var ct = ops.ctx.provinceStr + ' / ' + ops.ctx.cityStr + ' / ' + ops.ctx.districtStr;
                $title.innerHTML = ct;
                $title.title = ct;
                this._setTop($province);
                this._setTop($city);
                this._setTop($district);
            }
        }, {
            key: '_init',
            value: function _init() {
                var _this = this;
                var $el = _this.$el;
                var ops = _this._config;

                var $input = $el._.children('input'),
                    $title = $('<button type="button" class="btn city-title">请选择省市区</button>'),
                    $ctx = $('<div class="city-content clearfix">\n                                <div class="city-province"></div>\n                                <div class="city-city"></div>\n                                <div class="city-district"></div>\n                            </div>'),
                    $province = $ctx._.children('.city-province'),
                    $city = $ctx._.children('.city-city'),
                    $district = $ctx._.children('.city-district');

                function doInit() {
                    ops.ctx = {
                        province: '',
                        provinceStr: '',
                        city: '',
                        cityStr: '',
                        district: '',
                        districtStr: ''
                    };
                    _this._setCityData(86, $province);
                }

                function setJson() {
                    var ct = ops.ctx.provinceStr + ' / ' + ops.ctx.cityStr + ' / ' + ops.ctx.districtStr;
                    $title.innerHTML = ct;
                    $title.title = ct;
                    $input.value = JSON.stringify(ops.ctx);
                    $el._.removeClass(ClassName.ACTIVE);
                    $el._.removeClass('error');
                }

                function clearJson() {
                    $title.innerHTML = '请选择省市区';
                    $title.title = '请选择省市区';
                    $input.value = '';
                }

                $ctx.onclick = function (e) {
                    e.stopPropagation();
                    e.preventDefault();
                };

                $title.onclick = function (e) {
                    e.stopPropagation();
                    e.preventDefault();

                    if (!$el._.hasClass(ClassName.ACTIVE)) {
                        $el._.addClass('dismiss');
                    }

                    if ($el._.hasClass(ClassName.ACTIVE)) {
                        $el._.removeClass(ClassName.ACTIVE);
                    } else {
                        $$(ClassName.SELECT)._.removeClass(ClassName.ACTIVE);
                        $el._.addClass(ClassName.ACTIVE);
                    }
                };

                $province._.on(Event.CLICK, 'span', function () {
                    var id = this._.data('id');
                    var str = this.innerHTML;
                    ops.ctx.province = id;
                    ops.ctx.provinceStr = str;
                    $province._.children('span')._.removeClass(ClassName.ACTIVE);
                    this._.addClass(ClassName.ACTIVE);
                    _this._setCityData(id, $city);
                    $district.innerHTML = '';
                    clearJson();
                });

                $city._.on(Event.CLICK, 'span', function () {
                    var id = this._.data('id');
                    var str = this.innerHTML;
                    ops.ctx.city = id;
                    ops.ctx.cityStr = str;
                    $city._.children('span')._.removeClass(ClassName.ACTIVE);
                    this._.addClass(ClassName.ACTIVE);
                    _this._setCityData(id, $district);
                    clearJson();
                });

                $district._.on(Event.CLICK, 'span', function () {
                    var id = this._.data('id');
                    var str = this.innerHTML;
                    ops.ctx.district = id;
                    ops.ctx.districtStr = str;
                    $district._.children('span')._.removeClass(ClassName.ACTIVE);
                    this._.addClass(ClassName.ACTIVE);
                    setJson();
                });

                $el._.append($title);
                $el._.append($ctx);

                if (!$input.value) {
                    doInit();
                } else {
                    try {
                        _this._update();
                    } catch (e) {
                        doInit();
                    }
                }
            }

            // static

        }], [{
            key: '_interface',
            value: function _interface(config) {
                var data = this._.data(DATA_KEY);
                var _config = $.extends({}, Default, this._.data());

                if ((typeof config === 'undefined' ? 'undefined' : _typeof(config)) === 'object') {
                    $.extend(_config, config);
                }

                var action = typeof config === 'string' ? config : _config;

                if (!data) {
                    data = new City(this, _config);
                    this._.data(DATA_KEY, data);
                }

                if (typeof action === 'string') {
                    if (data[action] === undefined) {
                        throw new Error('No method named "' + action + '"');
                    }
                    data[action]();
                }
            }
        }, {
            key: 'VERSION',
            get: function get() {
                return VERSION;
            }
        }]);

        return City;
    }();

    // Data Api implementation


    $$(Selector.DATA_TOGGLE).forEach(function (item, i) {
        City._interface.call(item, item._.data());
    });

    document.addEventListener(Event.CLICK, function () {
        $$(ClassName.SELECT)._.removeClass(ClassName.ACTIVE);
    }, false);

    $.add(NAME, City._interface);

    return City;
}(Bliss, Bliss.$);