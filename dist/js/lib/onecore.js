'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

window.onerror = function (msg, url, lineNo, columnNo, error) {
    console.log(msg + '[' + lineNo + ':' + columnNo + ']');
};
(function () {
    'use strict';

    function loadXMLString(txt) {
        var s = document.createElement('div');
        s.style.display = 'none';
        s.innerHTML = txt;
        return s.childNodes.length > 1 ? Array.prototype.slice.call(s.childNodes) : s.childNodes[0];
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
            return null;
        }

        try {
            return $.type(expr) === 'string' ? (context || document).querySelector(expr) : expr || null;
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

            (Array.isArray(name) ? name : [name]).forEach(function (name) {
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
            if (arguments.length > 1 && ($.type(options) === "function" || options.handleEvent)) {
                // options is actually callback
                var callback = options;
                options = $.type(arguments[2]) === "object" ? arguments[2] : {
                    capture: !!arguments[2] // in case it's passed as a boolean 3rd arg
                };
                options.callback = callback;
            }
            '';
            var listeners = $.listeners.get(this) || {};

            types.trim().split(/\s+/).forEach(function (type) {
                if (type.indexOf(".") > -1) {
                    type = type.split(".");
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

            var listeners = $.listeners.get(this);

            (types || '').trim().split(/\s+/).forEach(function (type) {
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
                var style = getComputedStyle(this)[val];
                if (style.indexOf('px') > 0) {
                    style = style.split('px')[0];
                }
                return style;
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
                    return null;
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
                return _new[name] && Object.keys(_new).length > 0 ? _new[name] : null;
            } else {
                return _new;
            }
        },

        find: function find(expr) {
            if (typeof expr == 'string') {
                var qs = this.querySelectorAll(expr);
                if (qs.length === 0) {
                    return null;
                } else {
                    return qs.length > 1 ? Array.prototype.slice.call(qs) : qs[0];
                }
            }
        },

        prev: function prev() {
            return this.previousElementSibling;
        },

        next: function next() {
            return this.nextElementSibling;
        },

        parent: function parent(expr) {
            if (expr) {
                var el = this;
                var matchesSelector = el.matches || el.webkitMatchesSelector || el.mozMatchesSelector || el.msMatchesSelector;

                while (el) {
                    if (matchesSelector.call(el, expr)) {
                        break;
                    }
                    el = el.parentElement;
                }
                return el;
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
            if (this.parentNode) {
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
'use strict';

(function ($, $$) {
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

    function removeRip() {
        this._.remove();
    }

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
                    removeRip.call(rippleEffect);
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

                var $div = $('<div class="msgbox">\n                    <span class="loading-close"></span>\n                    <div class="msgctx">\n                        <div class="msgbar">\n                            <label></label>\n                            <span class="close"></span>\n                        </div>\n                        <div class="msgdiv"></div>\n                    </div>\n                </div>'),
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
                        ops.title = ops.title || '\u63D0\u793A';
                        $msgdiv.innerHTML = ops.text;
                    }
                    $msgctx._.addClass(ClassName.SHOW);
                }

                var $btnh;
                if (ops.num && !ops.custom) {
                    if (ops.num === 1) {
                        $btn1.onclick = function (event) {
                            _this._success();
                        };
                        $btn._.append($btn1);
                    } else {
                        $btn1.onclick = function (event) {
                            _this._success();
                        };
                        $btn2.onclick = function (event) {
                            _this._error();
                        };
                        $btn._.append($btn1, $btn2);
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

                $msgctx.querySelector('.msgbar > label').innerHTML = ops.title;

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
                        responseType: "html"
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
                        if ($div._.find('.errorshow')) {
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
        type: '(null|string)',
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
                                'transform': 'translateX(-50%)'
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
                                'transform': 'translateX(-50%)'
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

                $select._.addClass($this._.attr('class'))._.after($this)._.append($this);

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

                // ops.btn._.off(Event.CLICK)
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
                        $oldDiv._.attr({ 'class': 'oc-calendarOut-next' });
                    } else {
                        $row._.addClass('oc-calendarIn-prev');
                        $oldDiv._.attr({ 'class': 'oc-calendarOut-prev' });
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
                            $oldBtn._.attr({ 'class': 'oc-calendarOut-next' });
                        } else {
                            $newBtn._.addClass('oc-calendarIn-prev');
                            $oldBtn._.attr({ 'class': 'oc-calendarOut-prev' });
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
                        $page._.attr({ 'href': 'javascript:;' })._.addClass('current');
                    }
                    ops.$next._.before($page);
                }

                if ($this._.children('.page').length > 0) {
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
                        $prev._.addClass('disabled')._.attr({ 'href': 'javascript:;' });
                    } else if (ops.page === ops.total) {
                        $next._.addClass('disabled')._.attr({ 'href': 'javascript:;' });
                    }

                    ops.$prev = $prev;
                    ops.$next = $next;

                    $this._.append($prev, $next);
                } else {
                    if (ops.page === 1) {
                        ops.$prev._.addClass('disabled')._.attr({ 'href': 'javascript:;' })._.removeData('page');
                    } else {
                        ops.$prev._.removeClass('disabled')._.attr({ 'href': '' + ops.url + (ops.page - 1) })._.data('page', ops.page - 1);
                    }

                    if (ops.page === ops.total) {
                        ops.$next._.addClass('disabled')._.attr({ 'href': 'javascript:;' })._.removeData('page');
                    } else {
                        ops.$next._.removeClass('disabled')._.attr({ 'href': '' + ops.url + (ops.page + 1) })._.data('page', ops.page + 1);
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
        ACTIVE: 'active',
        MISS: 'dismiss',
        OVERLAY: 'overlay-layer'
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
                oli._.removeClass('hover');
                if (olIndex - 1 < 0) {
                    olIndex++;
                }
                oli[olIndex - 1]._.addClass('hover');
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
                        focus: v, focusin: v, pageshow: v, blur: h, focusout: h, pagehide: h
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
        ACTIVE: 'active',
        MISS: 'dismiss',
        OVERLAY: 'overlay-layer'
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
                        $now._.addClass('active');
                    } else {
                        requFrame = requestAnimationFrame(ckanim);
                    }
                }

                $last._.attr({ 'class': 'oc-tab-out' });
                if (ajas) {
                    $now._.attr({ 'class': 'oc-tab-in oc-tab-load loading' });
                } else {
                    $now._.attr({ 'class': 'oc-tab-in' });
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
                    _this.$nav._.children('button')._.removeClass('active')[ops.index]._.addClass('active');
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
                _this.$nav._.children('button')[0]._.addClass('active');
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

var Validate = function ($) {
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
        before: function before() {},
        success: function success() {},
        error: function error() {}
    };

    var DefaultType = {
        target: '(element|string)',
        enter: 'bool',
        before: 'function',
        success: 'function',
        error: 'function'
    };

    var ClassName = {};

    var codelist = [{
        //name: '弱 — 需包含字母及数字',
        name: '弱',
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
            value: function _check(el) {
                var _this = this;
                var ops = _this._config;

                function changeWidth(i) {
                    el._.next()._.children('.cs-line')._.attr({ 'class': 'cs-line ' + codelist[i].color });
                    el._.next()._.attr({ 'class': 'codestrong showtxt' })._.children('.cs-txt').textContent = codelist[i].name;
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
                 * @param String type 自定义type
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
                    maxLength: 0
                };

                datas.type = el._.data('type') || el._.attr('type');
                datas.val = el.value;

                if (!datas.type) {
                    var nodename = el.nodeName.toLocaleLowerCase();
                    if (nodename === 'select') {
                        datas.type = 'select';
                    } else if (nodename === 'textarea') {
                        datas.type = 'text';
                    }
                }

                datas.type = datas.type.toLocaleLowerCase();
                datas.required = el._.attr('required');

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

                if (datas.required || !datas.required && datas.val || datas.type === 'checkbox' || datas.type === 'radio') {
                    switch (datas.type) {
                        case 'text':
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
                        // case 'password':
                        //     if (el._.data('length')) {
                        //         datas.minLength = el._.data('length')[0] || 6
                        //         datas.maxLength = el._.data('length')[1] || 18
                        //     }
                        //
                        //     if (el._.next()._.hasClass('codestrong')) {
                        //         var modes = 0
                        //         //正则表达式验证符合要求的
                        //         if (/\d/.test(datas.val)) modes++ //数字
                        //         if (/[a-z]/.test(datas.val)) modes++ //小写
                        //         if (/[A-Z]/.test(datas.val)) modes++ //大写
                        //         if (/\W/.test(datas.val)) modes++ //特殊字符
                        //
                        //         switch (modes) {
                        //             case 1:
                        //                 changeWidth(0)
                        //                 break
                        //             case 2:
                        //                 changeWidth(1)
                        //                 break
                        //             case 3:
                        //                 changeWidth(2)
                        //                 break
                        //             case 4:
                        //                 if (datas.val.length > 11) {
                        //                     changeWidth(3)
                        //                 } else {
                        //                     changeWidth(2)
                        //                 }
                        //                 break
                        //         }
                        //
                        //         if (lengthCheck() && modes > 0) {
                        //             if (modes > 0) { //1
                        //                 _this._success(el)
                        //             } else {
                        //                 _this._error(el)
                        //                 count++
                        //             }
                        //         } else {
                        //             //el.next().attr('class', 'codestrong active').children('.cs-txt').text('输入' + datas.minLength + '-' + datas.maxLength + '位密码，需包含字母及数字').end().children('.cs-line').attr('class', 'cs-line')
                        //             el._.next()._.attr({'class': 'codestrong active'})
                        //             ._.children('.cs-txt').textContent = '请输入6-18位字符的密码'
                        //             el._.next()._.children('.cs-line')._.attr({'class': 'cs-line'})
                        //             _this._error(el)
                        //             count++
                        //         }
                        //     } else {
                        //         if (lengthCheck()) {
                        //             _this._success(el)
                        //         } else {
                        //             _this._error(el)
                        //             count++
                        //         }
                        //     }
                        //
                        //     const target = ops.target
                        //
                        //     if (target._.find('input[type="password"]').length >= 2) {
                        //         var pwd1,
                        //             pwd2
                        //         if (target._.find('input[type="password"]').length === 2) {
                        //             pwd1 = target._.find('input[type="password"]')[0]
                        //             pwd2 = target._.find('input[type="password"]')[1]
                        //         } else {
                        //             pwd1 = target._.find('input[type="password"]')[target._.find('input[type="password"]').length - 2]
                        //             pwd2 = target._.find('input[type="password"]')[target._.find('input[type="password"]').length - 1]
                        //         }
                        //
                        //         if (pwd1._.attr('required') && pwd2._.attr('required')) {
                        //             if (pwd1 == el) {
                        //                 if (0 !== pwd2.value.length) {
                        //                     if (pwd1.value !== pwd2.value) {
                        //                         _this._error(pwd2)
                        //                         count++
                        //                     } else {
                        //                         _this._success(pwd2)
                        //                     }
                        //                 }
                        //             }
                        //
                        //             if (pwd2 == el) {
                        //                 if (pwd1.value === pwd2.value && 0 !== pwd1.value.length) {
                        //                     _this._success(el)
                        //                 } else {
                        //                     _this._error(el)
                        //                     count++
                        //                 }
                        //             }
                        //         }
                        //     }
                        //     break
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
                        // case 'citys':
                        //     var step = el._.parent()._.data('step') || 3
                        //     if (datas.val.split(',').length >= step) {
                        //         _this._success(el._.parent())
                        //     } else {
                        //         _this._error(el._.parent())
                        //         count++
                        //     }
                        //     break
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

                var wrong = 0,
                    ckList = [],
                    wlist = ops.target.querySelectorAll('*');

                wlist = Array.prototype.slice.call(wlist);
                if (wlist.length > 0) {
                    wlist.forEach(function (item, i) {
                        var nodename = item.nodeName.toLocaleLowerCase();
                        switch (nodename) {
                            case 'input':
                                ckList.push(item);
                                break;
                            case 'textarea':
                                ckList.push(item);
                                break;
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

                function checkType(type) {
                    switch (type) {
                        case 'text':
                        case 'email':
                        case 'number':
                        case 'tel':
                        case 'mobile':
                        case 'mtel':
                        case 'select':
                        case 'imgup':
                        case 'radio':
                        case 'checkbox':
                            return true;
                            break;
                        default:
                            return false;
                            break;
                    }
                }

                var opmap = _this._getLsit();

                opmap.forEach(function (item, i) {
                    var type = item._.data('type') || item._.attr('type');
                    if (!item._.data('off') && checkType(type)) {
                        item.onchange = function () {
                            _this._check(item).catch(function () {});
                        };
                        item['validate'] = function () {
                            return _this._check(item);
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
                        console.log("成功");
                        // console.log(data);
                        if (data.length === 0) {
                            if (!ops.success) {
                                $this._.attr({ 'disabled': true })._.parent('form').submit();
                            } else {
                                ops.success();
                            }
                        } else {
                            ops.error(data);
                        }
                    }).catch(function (err) {
                        $this._.removeClass('process');
                        console.log(err);
                        console.log("失败");
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
                        spanlk._.attr({ 'class': 'btn active' });
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

                        $this._.append('<label class="btn active"><img src="' + data.url + '"><span data-id="' + data.id + '">\u5220\u9664</span></label>');
                    }
                }

                if (ops.max == $this._.children('label').length) {
                    display = 'style="display:none;"';
                }

                $this._.append('<label class="btn" ' + display + '>\n                <input type="file" data-off="true" accept="image/gif,image/jpeg,image/png" multiple>\n                <span>\u5220\u9664</span>\n            </label>');

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

                            var $spanload = $('<label class="btn imgload"><img src="' + basedata + '"><span data-id="' + ops.num + '">\u5220\u9664</span></label>');

                            el._.before($spanload);

                            if (_this.$el._.children('label').length > ops.max) {
                                el.style.display = 'none';
                            }

                            ops.uplist.push({
                                id: ops.num,
                                url: 'urlurk'
                            });
                            $this._.children('input[type="hidden"]').value = JSON.stringify(ops.uplist);

                            var cots = 1;
                            $spanload._.attr({ 'process': '10%' });
                            var ttmm = setInterval(function () {
                                var hb = cots + '%';
                                $spanload._.attr({ 'process': hb });
                                cots++;
                                if (cots > 99) {
                                    clearInterval(ttmm);
                                    $spanload._.attr({ 'class': 'btn active' });
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

                _this.$el._.on('change', 'input[type="file"]', function (e) {
                    e.stopPropagation();
                    e.preventDefault();

                    var $this = this,
                        files = e.target.files;

                    for (var i = 0; i < files.length; i++) {
                        doProccess(files[i], $this._.parent());
                    }

                    $this.value = '';

                    // try {
                    // 	var files = e.target.files
                    // 	if(ops.mult){
                    // 		for (var i = 0; i < files.length; i++) {
                    // 			doProccess(files[i], $this.parent())
                    // 		}
                    // 	}else{
                    // 		doProccess(files[0], $this.parent())
                    // 	}
                    // } catch (err) {
                    // 	$this.select().blur()
                    // 	var src = document.selection.createRange().text
                    // 	$this.parent().addClass('active').attr('style', 'filter: progid:DXImageTransform.Microsoft.AlphaImageLoader(sizingMethod="scale",src="' + src + '")')
                    // 	if(_this.$el.children('label').length < ops.max){
                    // 		_this.$el.append('<label>'+
                    // 		'<input type="file" accept="image/gif,image/jpeg,image/png">'+
                    // 		'<span>删除</span></label>')
                    // 	}
                    // } finally {
                    // 	$this.val('')
                    // }
                });

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
	$thumbImg._.attr({ 'src': list[activeIndex].url });

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
};

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
			'width': nextW + 'px',
			'height': nextH + 'px'
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
			'width': nextW + 'px',
			'height': nextH + 'px'
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
		}
		//向下滚动
		else {
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
			$thumbImg._.removeClass(rotateClass[0])._.addClass("rotate" + nextDeg);
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
			it = (thumbnailsHeight - thumbnailsHeight) / 2, il = (thumbnailsWidth - thumbnailsWidth) / 2, maxL = thumbnailsWidth - w - il - 2, //减去2像素边框部分
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