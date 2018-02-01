/**
 * validate插件
 * @param Boolean enter 是否回车提交 false
 * @param Function success 成功返回的方法
 * @param Function error 失败返回的方法
 * @returns null
 * @author Dr.Who
 * @editTime 2016-06-08
 * @use $.fn.validate()
 */

import Util from './util'

const Validate = (($) => {
    // Constants
    const NAME = 'validate'
    const VERSION = '1.0.0'
    const DATA_KEY = 'oc.validate'

    const Event = {
        CLICK: Util.getEvent('click')
    }

    const Default = {
        ajax: false,
        url: '',
        bind: true, //是否绑定key或者change事件
        target: '', //指定验证父级
        enter: false,
        erlost: new Array(),
        before: function() {},
        success: function() {},
        error: function() {}
    }

    const DefaultType = {
        ajax: 'bool',
        url: 'string',
        bind: 'bool',
        target: '(element|string)',
        enter: 'bool',
        before: 'function',
        success: 'function',
        error: 'function'
    }

    const ClassName = {
        ACTIVE: 'active',
        MISS: 'dismiss',
        OVERLAY: 'overlay-layer'
    }

    const Selector = {
        DATA_TOGGLE: '[data-toggle="validate"]'
    }

    const codelist = [{
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
    }]

    // Class Definition
    class Validate {

        constructor(element, config) {
            this.$el = element
            this._config = this._getConfig(config)
            this._init()
        }

        // getters
        static get VERSION() {
            return VERSION
        }

        // public
        dispose() {
            $(this.$el).off(Event.CLICK)
            $.removeData(this.$el, DATA_KEY)

            this._config = null
        }

        // private
        _getConfig(config) {
            config = $.extends({}, Default, config)
            Util.typeCheckConfig(NAME, config, DefaultType)
            return config
        }

        _show(el) {
            el._.removeClass('error')
        }

        _hide(el) {
            this._config.erlost.push(el)
            el._.addClass('error')
        }

        _toSub() {
            const _this = this
            const $this = _this.$el
            let ops = _this._config

            if (ops.ajax && ops.success) {
                // $this._.addClass('ajax')._.attr('disabled', true)
                // $.ajax({
                //     url: ops.url || $this.parents('form').attr('action'),
                //     type: 'POST',
                //     data: $this.parents('form').serialize()
                // }).then(function(data) {
                //     ops.success(data)
                // }, function(e) {
                //     $.fn.notification({
                //         text: '网络连接失败，请重试。',
                //         type: 'error'
                //     })
                //     ops.error(e)
                // }).always(function() {
                //     $this.addClass('done').delay(500).queue(function() {
                //         $(this).removeClass('ajax').removeClass('done').removeAttr('disabled').dequeue()
                //     })
                // })
            } else {
                if (!ops.success) {
                    $this._.addClass('ajax')._.attr({'disabled': true})
                    $this._.parent('form').submit()
                } else {
                    ops.success()
                }
            }
        }

        _check(el) {
            const _this = this
            let ops = _this._config

            function changeWidth(i) {
                el._.next()._.children('.cs-line')._.attr({'class': 'cs-line ' + codelist[i].color})
                el._.next()._.attr({'class': 'codestrong showtxt'})._.children('.cs-txt').textContent = codelist[i].name
            }

            function lengthCheck() {
                if (datas.val.length >= datas.minLength && (datas.val.length <= datas.maxLength || !datas.maxLength)) {
                    return true
                } else {
                    return false
                }
            }

            function sizeCheck() {
                if (Number(datas.val) >= datas.minSize && (Number(datas.val) <= datas.maxSize || !datas.maxSize)) {
                    return true
                } else {
                    return false
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
            var count = 0,
                datas = {
                    minSize: 1,
                    maxSize: 0,
                    minLength: 1,
                    maxLength: 0
                }

            datas.type = el._.data('type') || el._.attr('type')
            datas.val = el.value

            if (!datas.type) {
                var nodename = el.nodeName.toLocaleLowerCase()
                if (nodename === 'select') {
                    datas.type = 'select'
                } else if (nodename === 'textarea') {
                    datas.type = 'text'
                }
            }

            datas.type = datas.type.toLocaleLowerCase()
            datas.required = el._.attr('required')

            if (el._.data('allowspace') && 1 != datas.val.split(' ').length) { //allowspace有值不允许中间有空格
                _this._hide(el)
                return false
            }

            if (datas.required || (!datas.required && datas.val) || datas.type === 'checkbox' || datas.type === 'radio') {
                switch (datas.type) {
                    case 'text':
                        if (el._.data('length')) {
                            datas.minLength = el._.data('length')[0] || 1
                            datas.maxLength = el._.data('length')[1]
                        }

                        datas.val = el.value.trim()
                        el.value = datas.val

                        if (lengthCheck()) {
                            _this._show(el)
                        } else {
                            _this._hide(el)
                            count++
                        }
                        break
                    case 'password':
                        if (el._.data('length')) {
                            datas.minLength = el._.data('length')[0] || 6
                            datas.maxLength = el._.data('length')[1] || 18
                        }

                        if (el._.next()._.hasClass('codestrong')) {
                            var modes = 0
                            //正则表达式验证符合要求的
                            if (/\d/.test(datas.val)) modes++ //数字
                            if (/[a-z]/.test(datas.val)) modes++ //小写
                            if (/[A-Z]/.test(datas.val)) modes++ //大写
                            if (/\W/.test(datas.val)) modes++ //特殊字符

                            switch (modes) {
                                case 1:
                                    changeWidth(0)
                                    break
                                case 2:
                                    changeWidth(1)
                                    break
                                case 3:
                                    changeWidth(2)
                                    break
                                case 4:
                                    if (datas.val.length > 11) {
                                        changeWidth(3)
                                    } else {
                                        changeWidth(2)
                                    }
                                    break
                            }

                            if (lengthCheck() && modes > 0) {
                                if (modes > 0) { //1
                                    _this._show(el)
                                } else {
                                    _this._hide(el)
                                    count++
                                }
                            } else {
                                //el.next().attr('class', 'codestrong active').children('.cs-txt').text('输入' + datas.minLength + '-' + datas.maxLength + '位密码，需包含字母及数字').end().children('.cs-line').attr('class', 'cs-line')
                                el._.next()._.attr({'class': 'codestrong active'})
                                ._.children('.cs-txt').textContent = '请输入6-18位字符的密码'
                                el._.next()._.children('.cs-line')._.attr({'class': 'cs-line'})
                                _this._hide(el)
                                count++
                            }
                        } else {
                            if (lengthCheck()) {
                                _this._show(el)
                            } else {
                                _this._hide(el)
                                count++
                            }
                        }

                        const target = ops.target

                        if (target._.find('input[type="password"]').length >= 2) {
                            var pwd1,
                                pwd2
                            if (target._.find('input[type="password"]').length === 2) {
                                pwd1 = target._.find('input[type="password"]')[0]
                                pwd2 = target._.find('input[type="password"]')[1]
                            } else {
                                pwd1 = target._.find('input[type="password"]')[target._.find('input[type="password"]').length - 2]
                                pwd2 = target._.find('input[type="password"]')[target._.find('input[type="password"]').length - 1]
                            }

                            if (pwd1._.attr('required') && pwd2._.attr('required')) {
                                if (pwd1 == el) {
                                    if (0 !== pwd2.value.length) {
                                        if (pwd1.value !== pwd2.value) {
                                            _this._hide(pwd2)
                                            count++
                                        } else {
                                            _this._show(pwd2)
                                        }
                                    }
                                }

                                if (pwd2 == el) {
                                    if (pwd1.value === pwd2.value && 0 !== pwd1.value.length) {
                                        _this._show(el)
                                    } else {
                                        _this._hide(el)
                                        count++
                                    }
                                }
                            }
                        }
                        break
                    case 'email':
                        if (datas.val.match(/^\w+((-\w+)|(\.\w+))*\@[A-Za-z0-9]+((\.|-)[A-Za-z0-9]+)*\.[A-Za-z0-9]+$/) && datas.val.indexOf('。') < 0 && lengthCheck()) {
                            _this._show(el)
                        } else {
                            _this._hide(el)
                            count++
                        }
                        break
                    case 'number':
                        if (el._.data('size')) {
                            datas.minSize = el._.data('size')[0] || 0.01
                            datas.maxSize = el._.data('size')[1]
                        }

                        var point = el._.data('point') || 2
                        var tofix = datas.val.toString().split('.')[1]

                        if (el._.attr('min')) {
                            datas.minSize = el._.attr('min')
                            tofix = false
                        }

                        if (el._.attr('max')) {
                            datas.maxSize = el._.attr('max')
                            tofix = false
                        }

                        if (sizeCheck() && datas.val.match(/^\d+(\.\d+)?$/)) {
                            if (tofix) {
                                if (tofix.length <= point) {
                                    _this._show(el)
                                } else {
                                    _this._hide(el)
                                    count++
                                }
                            } else {
                                _this._show(el)
                            }
                        } else {
                            _this._hide(el)
                            count++
                        }
                        break
                    case 'tel':
                        if (datas.val.match(/^0\d{2,3}-?\d{7,8}$/)) {
                            _this._show(el)
                        } else {
                            _this._hide(el)
                            count++
                        }
                        break
                    case 'mobile':
                        if (datas.val.match(/^1[34578]\d{9}$/)) {
                            _this._show(el)
                        } else {
                            _this._hide(el)
                            count++
                        }
                        break
                    case 'mtel':
                        if (datas.val.match(/^0\d{2,3}-?\d{7,8}$/) || datas.val.match(/^1[34578]\d{9}$/)) {
                            _this._show(el)
                        } else {
                            _this._hide(el)
                            count++
                        }
                        break
                    case 'select':
                        if (el._.parent()._.hasClass('select')) {
                            el = el._.parent()
                        }
                        if (datas.val) {
                            _this._show(el)
                        } else {
                            _this._hide(el)
                            count++
                        }
                        break
                    case 'imgup':
                        if (el.value.length > 0 && el.value != '[]') {
                            _this._show(el._.parent())
                        } else {
                            _this._hide(el._.parent())
                            count++
                        }
                        break
                    case 'citys':
                        var step = el._.parent()._.data('step') || 3
                        if (datas.val.split(',').length >= step) {
                            _this._show(el._.parent())
                        } else {
                            _this._hide(el._.parent())
                            count++
                        }
                        break
                    case 'radio':
                    case 'checkbox':
                        var name = el._.attr('name')
                        if (name && $('[name="' + name + '"]')._.attr('required')) {
                            var ckox = false
                            $$('[name="' + name + '"]').forEach(function(item, i){
                                if (item.checked) {
                                    ckox = true
                                    return
                                }
                            })
                            if (ckox) {
                                $$('[name="' + name + '"]').forEach(function(item, i){
                                    item._.parent()._.removeClass('error')
                                })
                            } else {
                                $$('[name="' + name + '"]').forEach(function(item, i){
                                    item._.parent()._.addClass('error')
                                })
                                count++
                            }
                        } else {
                            if (datas.required) {
                                if (el.checked) {
                                    _this._show(el._.parent())
                                } else {
                                    _this._hide(el._.parent())
                                    count++
                                }
                            }
                        }
                        break
                }
            } else {
                _this._show(el)
            }
            return count
        }

        _init() {
            const _this = this
            const $this = _this.$el
            let ops = _this._config

            if (ops.check) {
                ops.erlos = new Array()

                var checklist = ops.check.split(','),
                    nums = 0

                for (var i = 0; i < checklist.length; i++) {
                    nums += _this._check($(checklist[i]))
                }

                if (ops.before) {
                    nums += ops.before()
                }

                if (0 === nums) {
                    //ops.success()
                    _this.toSub()
                } else {
                    ops.error(ops.erlost)
                }
            } else {
                ops.target = ops.target || $this._.parent('form')

                $this.onclick = function() {
                    ops.erlost.length = 0

                    let wrong = 0,
                        ckList = [],
                        wlist = ops.target.querySelectorAll('*')

                    wlist = Array.prototype.slice.call(wlist)
                    wlist.forEach(function(item, i){
                        var nodename = item.nodeName.toLocaleLowerCase()
                        switch (nodename) {
                            case 'input':
                                ckList.push(item)
                                break;
                            case 'textarea':
                                ckList.push(item)
                                break;
                            case 'select':
                                ckList.push(item)
                                break;
                        }
                    })

                    ckList.forEach(function(item, i){
                        if (!item._.data('off')) {
                            wrong += _this._check(item)
                        }
                    })

                    ckList.length = 0

                    if (ops.before) {
                        wrong += ops.before()
                    }

                    // if ($$('.imgup').length > 0 && 0 === wrong) {
                    //     var imgNum = 0
                    //     $$('input, textarea, select').forEach(function(item, i){
                    //         if (item._.children('label')._.hasClass('imgload')) {
                    //             ops.erlost.push($(this))
                    //             imgNum++
                    //         }
                    //     })
                    //     if (imgNum > 0) {
                    //         wrong++
                    //         $.fn.notification({
                    //             text: '你有' + imgNum + '张图片正在上传中，请稍后提交。',
                    //             type: 'info'
                    //         })
                    //     }
                    // }

                    if (0 === wrong) {
                        _this.toSub()
                    } else {
                        ops.error(ops.erlost)
                    }
                }

                if(ops.enter){
                    $('body')._.off('keydown')
                    $('body').onkeydown = function(e) {
                       13 === e.which && $this.click()
                   }
                }

                if (ops.bind) {
                    let nodeList = new Array(),
                        getAll = ops.target.querySelectorAll('*')

                    getAll = Array.prototype.slice.call(getAll)
                    getAll.forEach(function(item, i){
                        var nodename = item.nodeName.toLocaleLowerCase()
                        switch (nodename) {
                            case 'input':
                                nodeList.push(item)
                                break;
                            case 'textarea':
                                nodeList.push(item)
                                break;
                            case 'select':
                                nodeList.push(item)
                                break;
                        }
                    })

                    nodeList.forEach(function(item, i){
                        if (!item._.data('off')) {
                            if (item._.data('keyup')) {
                                item._.off('keyup')
                                item.onkeyup = function() {
                                    _this._check(item)
                                }
                            } else {
                                item._.off('change')
                                item.onchange = function() {
                                    _this._check(item)
                                }
                            }
                        }
                    })

                    nodeList.length = 0
                }
            }
        }

        // static
        static _interface(config) {
            let data = this._.data(DATA_KEY)
            const _config = $.extends({}, Default, this._.data())

            if (typeof config === 'object') {
                $.extend(_config, config)
            }

            const action = typeof config === 'string' ? config : _config

            if (!data) {
                data = new Validate(this, _config)
                this._.data(DATA_KEY, data)
            }

            if (typeof action === 'string') {
                if (data[action] === undefined) {
                    throw new Error(`No method named "${action}"`)
                }
                data[action]()
            }
        }
    }

    // $.fn[NAME] = Validate._interface
    // $.fn[NAME].Constructor = Validate

    $.add(NAME, Validate._interface)

    return Validate

})(Bliss, Bliss.$)

export default Validate
