// window.onerror = function (msg, url, lineNo, columnNo, error) {
//     console.log(`${msg}[${lineNo}:${columnNo}]`);
// };
;(function() {
    'use strict'

    function loadXMLString(txt) {
        const s = document.createElement('div')
        s.style.display = 'none'
        s.innerHTML = txt
        return s.childNodes.length > 1
            ? Array.prototype.slice.call(s.childNodes)
            : s.childNodes[0]
    }

    function getEls(el, expr, type) {
        const matchesSelector =
            el.matches ||
            el.webkitMatchesSelector ||
            el.mozMatchesSelector ||
            el.msMatchesSelector

        while (el) {
            if (matchesSelector.call(el, expr)) {
                break
            }
            switch (type) {
                case 'prev':
                    el = el.previousElementSibling
                    break
                case 'next':
                    el = el.nextElementSibling
                    break
                case 'parent':
                    el = el.parentNode
                    break
            }
        }
        return el
    }

    function overload(callback, start, end) {
        start = start === undefined ? 1 : start
        end = end || start + 1

        if (end - start <= 1) {
            return function() {
                if (
                    arguments.length <= start ||
                    $.type(arguments[start]) === 'string'
                ) {
                    return callback.apply(this, arguments)
                }

                var obj = arguments[start]
                var ret

                for (var key in obj) {
                    var args = Array.prototype.slice.call(arguments)
                    args.splice(start, 1, key, obj[key])
                    ret = callback.apply(this, args)
                }

                return ret
            }
        }

        return overload(overload(callback, start + 1, end), start, end - 1)
    }

    // Copy properties from one object to another. Overwrites allowed.
    // Subtle difference of array vs string whitelist: If property doesn't exist in from, array will not define it.
    function extend(to, from, whitelist) {
        var whitelistType = type(whitelist)

        if (whitelistType === 'string') {
            // To copy gettters/setters, preserve flags etc
            var descriptor = Object.getOwnPropertyDescriptor(from, whitelist)

            if (
                descriptor &&
                (!descriptor.writable ||
                    !descriptor.configurable ||
                    !descriptor.enumerable ||
                    descriptor.get ||
                    descriptor.set)
            ) {
                delete to[whitelist]
                Object.defineProperty(to, whitelist, descriptor)
            } else {
                to[whitelist] = from[whitelist]
            }
        } else if (whitelistType === 'array') {
            whitelist.forEach(function(property) {
                if (property in from) {
                    extend(to, from, property)
                }
            })
        } else {
            for (var property in from) {
                if (whitelist) {
                    if (
                        (whitelistType === 'regexp' &&
                            !whitelist.test(property)) ||
                        (whitelistType === 'function' &&
                            !whitelist.call(from, property))
                    ) {
                        continue
                    }
                }

                extend(to, from, property)
            }
        }

        return to
    }

    /**
     * Returns the [[Class]] of an object in lowercase (eg. array, date, regexp, string etc)
     */
    function type(obj) {
        if (obj === null) {
            return 'null'
        }

        if (obj === undefined) {
            return 'undefined'
        }

        var ret = (
            Object.prototype.toString
                .call(obj)
                .match(/^\[object\s+(.*?)\]$/)[1] || ''
        ).toLowerCase()

        if (ret == 'number' && isNaN(obj)) {
            return 'nan'
        }

        return ret
    }

    var $ = (self.Bliss = extend(function(expr, context) {
        if ((arguments.length == 2 && !context) || !expr) {
            return undefined
        }

        try {
            return $.type(expr) === 'string'
                ? (context || document).querySelector(expr)
                : expr || undefined
        } catch (e) {
            return loadXMLString(expr)
        }
    }, self.Bliss))

    extend($, {
        extend: extend,
        overload: overload,
        type: type,

        property: $.property || '_',
        listeners: self.WeakMap ? new WeakMap() : new Map(),

        original: {
            addEventListener: (self.EventTarget || Node).prototype
                .addEventListener,
            removeEventListener: (self.EventTarget || Node).prototype
                .removeEventListener
        },

        fn: {},

        noop: function() {},

        $: function(expr, context) {
            if (expr instanceof Node || expr instanceof Window) {
                return [expr]
            }

            if (arguments.length == 2 && !context) {
                return []
            }

            return Array.prototype.slice.call(
                typeof expr == 'string'
                    ? (context || document).querySelectorAll(expr)
                    : expr || []
            )
        },

        /*
         * Return first non-undefined value. Mainly used internally.
         */
        defined: function() {
            for (var i = 0; i < arguments.length; i++) {
                if (arguments[i] !== undefined) {
                    return arguments[i]
                } else {
                    return undefined
                }
            }
        },

        each: function(obj, callback, ret) {
            ret = ret || {}

            for (var property in obj) {
                ret[property] = callback.call(obj, property, obj[property])
            }

            return ret
        },

        ready: function(context, callback, isVoid) {
            if (typeof context === 'function' && !callback) {
                callback = context
                context = undefined
            }

            context = context || document

            if (callback) {
                if (context.readyState !== 'loading') {
                    callback()
                } else {
                    $.once(context, 'DOMContentLoaded', function() {
                        callback()
                    })
                }
            }

            if (!isVoid) {
                return new Promise(function(resolve) {
                    $.ready(context, resolve, true)
                })
            }
        },

        // Helper for defining OOP-like “classes”
        Class: function(o) {
            var special = [
                'constructor',
                'extends',
                'abstract',
                'static'
            ].concat(Object.keys($.classProps))
            var init = o.hasOwnProperty('constructor') ? o.constructor : $.noop
            var Class

            if (arguments.length == 2) {
                // Existing class provided
                Class = arguments[0]
                o = arguments[1]
            } else {
                Class = function() {
                    if (
                        this.constructor.__abstract &&
                        this.constructor === Class
                    ) {
                        throw new Error(
                            'Abstract classes cannot be directly instantiated.'
                        )
                    }

                    Class.super && Class.super.apply(this, arguments)

                    init.apply(this, arguments)
                }

                Class.super = o.extends || null

                Class.prototype = $.extend(
                    Object.create(Class.super ? Class.super.prototype : Object),
                    {
                        constructor: Class
                    }
                )

                // For easier calling of super methods
                // This doesn't save us from having to use .call(this) though
                Class.prototype.super = Class.super
                    ? Class.super.prototype
                    : null

                Class.__abstract = !!o.abstract
            }

            var specialFilter = function(property) {
                return (
                    this.hasOwnProperty(property) &&
                    special.indexOf(property) === -1
                )
            }

            // Static methods
            if (o.static) {
                $.extend(Class, o.static, specialFilter)

                for (var property in $.classProps) {
                    if (property in o.static) {
                        $.classProps[property](Class, o.static[property])
                    }
                }
            }

            // Instance methods
            $.extend(Class.prototype, o, specialFilter)

            for (var property in $.classProps) {
                if (property in o) {
                    $.classProps[property](Class.prototype, o[property])
                }
            }

            return Class
        },

        // Properties with special handling in classes
        classProps: {
            // Properties that behave like normal properties but also execute code upon getting/setting
            live: overload(function(obj, property, descriptor) {
                if ($.type(descriptor) === 'function') {
                    descriptor = {
                        set: descriptor
                    }
                }

                Object.defineProperty(obj, property, {
                    get: function() {
                        var value = this['_' + property]
                        console.log(value)
                        var ret =
                            descriptor.get && descriptor.get.call(this, value)
                        return ret !== undefined ? ret : value
                    },
                    set: function(v) {
                        var value = this['_' + property]
                        var ret =
                            descriptor.set &&
                            descriptor.set.call(this, v, value)
                        this['_' + property] = ret !== undefined ? ret : v
                    },
                    configurable: descriptor.configurable,
                    enumerable: descriptor.enumerable
                })

                return obj
            })
        },

        /*
         * Fetch API inspired XHR wrapper. Returns promise.
         */
        fetch: function(url, o) {
            if (!url) {
                throw new TypeError(
                    'URL parameter is mandatory and cannot be ' + url
                )
            }

            // Set defaults & fixup arguments
            var env = extend(
                {
                    url: new URL(url, location),
                    data: '',
                    method: 'GET',
                    headers: {},
                    xhr: new XMLHttpRequest()
                },
                o
            )

            env.method = env.method.toUpperCase()

            $.hooks.run('fetch-args', env)

            // Start sending the request

            if (env.method === 'GET' && env.data) {
                env.url.search += env.data
            }

            document.body.setAttribute('data-loading', env.url)

            env.xhr.open(
                env.method,
                env.url.href,
                env.async !== false,
                env.user,
                env.password
            )

            for (var property in o) {
                if (property === 'upload') {
                    if (env.xhr.upload && typeof o[property] === 'object') {
                        $.extend(env.xhr.upload, o[property])
                    }
                } else if (property in env.xhr) {
                    try {
                        env.xhr[property] = o[property]
                    } catch (e) {
                        self.console && console.error(e)
                    }
                }
            }

            var headerKeys = Object.keys(env.headers).map(function(key) {
                return key.toLowerCase()
            })

            if (
                env.method !== 'GET' &&
                headerKeys.indexOf('content-type') === -1
            ) {
                env.xhr.setRequestHeader(
                    'Content-type',
                    'application/x-www-form-urlencoded'
                )
            }

            for (var header in env.headers) {
                if (env.headers[header] !== undefined) {
                    env.xhr.setRequestHeader(header, env.headers[header])
                }
            }

            var promise = new Promise(function(resolve, reject) {
                env.xhr.onload = function() {
                    document.body.removeAttribute('data-loading')

                    if (
                        env.xhr.status === 0 ||
                        (env.xhr.status >= 200 && env.xhr.status < 300) ||
                        env.xhr.status === 304
                    ) {
                        // Success!
                        resolve(env.xhr)
                    } else {
                        reject(
                            $.extend(Error(env.xhr.statusText), {
                                xhr: env.xhr,
                                get status() {
                                    return this.xhr.status
                                }
                            })
                        )
                    }
                }

                env.xhr.onerror = function() {
                    document.body.removeAttribute('data-loading')
                    reject(
                        $.extend(Error('Network Error'), {
                            xhr: env.xhr
                        })
                    )
                }

                env.xhr.ontimeout = function() {
                    document.body.removeAttribute('data-loading')
                    reject(
                        $.extend(Error('Network Timeout'), {
                            xhr: env.xhr
                        })
                    )
                }

                env.xhr.send(env.method === 'GET' ? null : env.data)
            })
            // Hack: Expose xhr.abort(), by attaching xhr to the promise.
            promise.xhr = env.xhr
            return promise
        },

        // value: function(obj) {
        //     var hasRoot = $.type(obj) !== 'string'
        //
        //     return $.$(arguments).slice(+hasRoot).reduce(function(obj, property) {
        //         return obj && obj[property]
        //     }, hasRoot ? obj : self)
        // },

        extends: function(out) {
            out = out || {}
            for (var i = 1; i < arguments.length; i++) {
                if (!arguments[i]) continue

                for (var key in arguments[i]) {
                    if (arguments[i].hasOwnProperty(key))
                        out[key] = arguments[i][key]
                }
            }
            return out
        }
    })

    $.Hooks = new $.Class({
        add: function(name, callback, first) {
            if (typeof arguments[0] != 'string') {
                // Multiple hooks
                for (var name in arguments[0]) {
                    this.add(name, arguments[0][name], arguments[1])
                }

                return
            }

            ;(Array.isArray(name) ? name : [name]).forEach(function(name) {
                this[name] = this[name] || []

                if (callback) {
                    this[name][first ? 'unshift' : 'push'](callback)
                }
            }, this)
        },

        run: function(name, env) {
            this[name] = this[name] || []
            this[name].forEach(function(callback) {
                callback.call(env && env.context ? env.context : env, env)
            })
        }
    })

    $.hooks = new $.Hooks()

    const _ = $.property

    $.Element = function(subject) {
        this.subject = subject

        // Author-defined element-related data
        this.datas = {}

        // Internal Bliss element-related data
        this.bliss = {}
    }

    $.Element.prototype = {
        // Fire a synthesized event on the element
        fire: function(type, properties) {
            var evt = document.createEvent('HTMLEvents')

            evt.initEvent(type, true, true)

            // Return the result of dispatching the event, so we
            // can know if `e.preventDefault` was called inside it
            return this.dispatchEvent($.extend(evt, properties))
        },

        bind: overload(function(types, options) {
            if (
                arguments.length > 1 &&
                ($.type(options) === 'function' || options.handleEvent)
            ) {
                // options is actually callback
                var callback = options
                options =
                    $.type(arguments[2]) === 'object'
                        ? arguments[2]
                        : {
                              capture: !!arguments[2] // in case it's passed as a boolean 3rd arg
                          }
                options.callback = callback
            }

            var listeners = $.listeners.get(this) || {}

            types
                .trim()
                .split(/\s+/)
                .forEach(function(type) {
                    if (type.indexOf('.') > -1) {
                        type = type.split('.')
                        var className = type[1]
                        type = type[0]
                    }

                    listeners[type] = listeners[type] || []

                    if (
                        listeners[type].filter(function(l) {
                            return (
                                l.callback === options.callback &&
                                l.capture == options.capture
                            )
                        }).length === 0
                    ) {
                        listeners[type].push(
                            $.extend({ className: className }, options)
                        )
                    }

                    $.original.addEventListener.call(
                        this,
                        type,
                        options.callback,
                        options
                    )
                }, this)

            $.listeners.set(this, listeners)
        }, 0),

        off: overload(function(types, options) {
            if (
                options &&
                ($.type(options) === 'function' || options.handleEvent)
            ) {
                var callback = options
                options = arguments[2]
            }

            if ($.type(options) == 'boolean') {
                options = {
                    capture: options
                }
            }

            options = options || {}
            options.callback = options.callback || callback

            var listeners = $.listeners.get(this)

            ;(types || '')
                .trim()
                .split(/\s+/)
                .forEach(function(type) {
                    if (type.indexOf('.') > -1) {
                        type = type.split('.')
                        var className = type[1]
                        type = type[0]
                    }

                    if (type && options.callback) {
                        return $.original.removeEventListener.call(
                            this,
                            type,
                            options.callback,
                            options.capture
                        )
                    }

                    if (!listeners) {
                        return
                    }

                    // Mass unbinding, need to go through listeners
                    for (var ltype in listeners) {
                        if (!type || ltype === type) {
                            // No forEach, because we’re mutating the array
                            for (var i = 0, l; (l = listeners[ltype][i]); i++) {
                                if (
                                    (!className || className === l.className) &&
                                    (!options.callback ||
                                        options.callback === l.callback) &&
                                    !!options.capture == !!l.capture
                                ) {
                                    listeners[ltype].splice(i, 1)
                                    $.original.removeEventListener.call(
                                        this,
                                        ltype,
                                        l.callback,
                                        l.capture
                                    )
                                    i--
                                }
                            }
                        }
                    }
                }, this)
        }, 0),

        removeData: function(name, obj) {
            if (obj) {
                obj.removeAttribute('data-' + name)
            } else {
                this.removeAttribute('data-' + name)
                return this
            }
        }
    }

    /*
     * Properties with custom handling in $.set()
     * Also available as functions directly on element._ and on $
     */
    $.setProps = {
        // Set a bunch of properties on the element
        properties: function(val) {
            $.extend(this, val)
        },

        once: overload(function(types, callback) {
            var me = this
            var once = function() {
                $.off(me, types, once)

                return callback.apply(me, arguments)
            }

            $.bind(this, types, once, { once: true })
        }, 0),

        // Event delegation
        on: overload(
            function(type, selector, callback) {
                $.bind(this, type, function(evt) {
                    var _this = evt.target.closest(selector)
                    if (_this) {
                        callback.call(_this, evt)
                    }
                })
            },
            0,
            2
        ),

        // Set a bunch of inline CSS styles
        style: function(val) {
            if ($.type(val) === 'object') {
                for (var property in val) {
                    if (property in this.style) {
                        // camelCase versions
                        this.style[property] = val[property]
                    } else {
                        // This way we can set CSS Variables too and use normal property names
                        this.style.setProperty(property, val[property])
                    }
                }
                return this
            } else {
                let sty = getComputedStyle(this)[val]
                if (sty.indexOf('px') > 0) {
                    sty = parseFloat(sty)
                }
                return sty
            }
        },

        // Set a bunch of attributes
        attr: function(o) {
            if ($.type(o) === 'object') {
                for (var attribute in o) {
                    this.setAttribute(attribute, o[attribute])
                }
                return this
            } else {
                if (this.getAttribute(o) !== null) {
                    return this.getAttribute(o) == ''
                        ? true
                        : this.getAttribute(o)
                } else {
                    return undefined
                }
            }
        },

        // Append the element inside another element
        append: function() {
            for (var arg in arguments) {
                if (arguments.hasOwnProperty(arg)) {
                    if ($.type(arguments[arg]) === 'string') {
                        arguments[arg] = $(arguments[arg])
                    }

                    if (arguments[arg]) {
                        this.appendChild(arguments[arg])
                    }
                }
            }
            return this
        },

        // Insert the element before another element
        before: function() {
            for (var arg in arguments) {
                if (arguments.hasOwnProperty(arg)) {
                    if ($.type(arguments[arg]) === 'string') {
                        arguments[arg] = $(arguments[arg])
                    }

                    if (arguments[arg]) {
                        this.parentNode.insertBefore(arguments[arg], this)
                    }
                }
            }
            return this
        },

        // Insert the element after another element
        after: function(element) {
            if ($.type(element) === 'string') {
                element = $(element)
            }

            if (element) {
                element.parentNode.insertBefore(this, element.nextSibling)
                return this
            }
        },

        // Insert the element before another element's contents
        prepend: function(element) {
            if ($.type(element) === 'string') {
                element = $(element)
            }

            if (element) {
                this.insertBefore(element, this.firstChild)
                return this
            }
        },

        addClass: function(className) {
            if (className) {
                var classList = className.split(' ')
                for (var cl in classList) {
                    if (classList.hasOwnProperty(cl)) {
                        this.classList.add(classList[cl])
                    }
                }
                return this
            }
        },

        removeClass: function(className) {
            if (className) {
                var classList = className.split(' ')
                for (var cl in classList) {
                    if (classList.hasOwnProperty(cl)) {
                        this.classList.remove(classList[cl])
                    }
                }
                return this
            }
        },

        toggleClass: function(className) {
            this._.hasClass(className)
                ? this._.removeClass(className)
                : this._.addClass(className)
        },

        hasClass: function(className) {
            return this.classList.contains(className)
        },

        data: function(name, options) {
            const attrs = this.attributes
            let _temp = this['tempData'] || {}
            let _data = {},
                i = 0,
                j = attrs.length

            for (i, j; i < j; i++) {
                if (attrs[i].name.substring(0, 5) == 'data-') {
                    try {
                        _data[attrs[i].name.substring(5)] = JSON.parse(
                            attrs[i].value
                        )
                    } catch (e) {
                        _data[attrs[i].name.substring(5)] = attrs[i].value
                    }
                }
            }

            let _new = $.extends({}, _data, _temp)

            if (options) {
                _new[name] = options
                this['tempData'] = _new
                return this
            }

            if (name) {
                return _new[name] && Object.keys(_new).length > 0
                    ? _new[name]
                    : undefined
            } else {
                return _new
            }
        },

        find: function(expr) {
            if (typeof expr == 'string') {
                const qs = this.querySelectorAll(expr)
                if (qs.length === 0) {
                    return undefined
                } else {
                    return qs.length > 1
                        ? Array.prototype.slice.call(qs)
                        : qs[0]
                }
            }
        },

        prev: function(expr) {
            if (typeof expr == 'string') {
                return getEls(this, expr, 'prev')
            } else {
                return this.previousElementSibling
            }
        },

        next: function(expr) {
            if (typeof expr == 'string') {
                return getEls(this, expr, 'next')
            } else {
                return this.nextElementSibling
            }
        },

        parent: function(expr) {
            if (typeof expr == 'string') {
                return getEls(this, expr, 'parent')
            } else {
                return this.parentNode
            }
        },

        children: function(expr) {
            if (typeof expr == 'string') {
                var ary = [],
                    cdr = Array.prototype.slice.call(this.children)

                cdr.forEach(function(el, i) {
                    var matchesSelector =
                        el.matches ||
                        el.webkitMatchesSelector ||
                        el.mozMatchesSelector ||
                        el.msMatchesSelector
                    if (matchesSelector.call(el, expr)) {
                        ary.push(cdr[i])
                    }
                })

                return ary.length > 1 ? ary : ary[0]
            } else {
                return Array.prototype.slice.call(this.children)
            }
        },

        index: function() {
            const arrNodes = Array.prototype.slice.call(
                this.parentNode.children
            )
            return arrNodes.indexOf(this)
        },

        remove: function() {
            if (this && this.parentNode) {
                this.parentNode.removeChild(this)
            }
        }
    }

    $.Array = function(subject) {
        this.subject = subject
    }

    // Extends Bliss with more methods
    $.add = overload(function(method, callback, on, noOverwrite) {
        on = $.extend(
            {
                $: true,
                element: true,
                array: true
            },
            on
        )

        if ($.type(callback) == 'function') {
            if (
                on.element &&
                (!(method in $.Element.prototype) || !noOverwrite)
            ) {
                $.Element.prototype[method] = function() {
                    return (
                        this.subject &&
                        $.defined(
                            callback.apply(this.subject, arguments),
                            this.subject
                        )
                    )
                }
            }

            if (on.array && (!(method in $.Array.prototype) || !noOverwrite)) {
                $.Array.prototype[method] = function() {
                    var args = arguments
                    return this.subject.map(function(element) {
                        return (
                            element &&
                            $.defined(callback.apply(element, args), element)
                        )
                    })
                }
            }

            if (on.$) {
                $.fn[method] = $[method] = callback

                if (on.array || on.element) {
                    $[method] = function() {
                        var args = [].slice.apply(arguments)
                        var subject = args.shift()
                        var Type =
                            on.array && Array.isArray(subject)
                                ? 'Array'
                                : 'Element'

                        return $[Type].prototype[method].apply(
                            {
                                subject: subject
                            },
                            args
                        )
                    }
                }
            }
        }
    }, 0)

    $.add($.Array.prototype, {
        element: false
    })
    $.add($.Element.prototype)
    $.add($.setProps)
    $.add($.classProps, {
        element: false,
        array: false
    })

    // Add native methods on $ and _
    var dummy = document.createElement('_')
    $.add(
        $.extend({}, HTMLElement.prototype, function(method) {
            return $.type(dummy[method]) === 'function'
        }),
        null,
        true
    )
})()
;(function($) {
    'use strict'

    if (!Bliss || Bliss.shy) {
        return
    }

    var _ = Bliss.property

    // Methods requiring Bliss Full
    $.add(
        {
            // Clone elements, with events and data
            clone: function() {
                var clone = this.cloneNode(true)
                var descendants = $.$('*', clone).concat(clone)

                $.$('*', this)
                    .concat(this)
                    .forEach(function(element, i, arr) {
                        $.events(descendants[i], element)
                        descendants[i]._.data = $.extend({}, element._.data)
                    })

                return clone
            }
        },
        {
            array: false
        }
    )

    // Define the _ property on arrays and elements

    Object.defineProperty(Node.prototype, _, {
        // Written for IE compatability (see #49)
        get: function getter() {
            Object.defineProperty(Node.prototype, _, {
                get: undefined
            })
            Object.defineProperty(this, _, {
                value: new $.Element(this)
            })
            Object.defineProperty(Node.prototype, _, {
                get: getter
            })
            return this[_]
        },
        configurable: true
    })

    Object.defineProperty(Array.prototype, _, {
        get: function() {
            Object.defineProperty(this, _, {
                value: new $.Array(this)
            })

            return this[_]
        },
        configurable: true
    })

    // Hijack addEventListener and removeEventListener to store callbacks

    if (self.EventTarget && 'addEventListener' in EventTarget.prototype) {
        EventTarget.prototype.addEventListener = function(
            type,
            callback,
            options
        ) {
            return $.bind(this, type, callback, options)
        }

        EventTarget.prototype.removeEventListener = function(
            type,
            callback,
            options
        ) {
            return $.off(this, type, callback, options)
        }
    }

    // Set $ and $$ convenience methods, if not taken
    self.$ = self.$ || $
    self.$$ = self.$$ || $.$
})(Bliss)
