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
        target: '', //指定验证父级
        enter: false,
        before: function() {},
        success: function() {},
        error: function() {}
    }

    const DefaultType = {
        target: '(element|string)',
        enter: 'bool',
        before: 'function',
        success: 'function',
        error: 'function'
    }

    const ClassName = {

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

        _success(el) {
            el._.removeClass('error')
        }

        _error(el) {
            el._.addClass('error')
        }

        _check(el, type) {
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
             * @param String val input值
             * @param String allowspace 是否允许空格
             * @param String required 允许为空
             * @param String minSize 最小数字
             * @param String maxSize 最大数字
             * @param String minLength 最短长度
             * @param String maxLength 最大长度
             */
            let datas = {
                    minSize: 1,
                    maxSize: 0,
                    minLength: 1,
                    maxLength: 0,
                    val: el.value,
                    required: el._.attr('required')
                }

            if (el._.data('allowspace') && 1 != datas.val.split(' ').length) { //allowspace有值不允许中间有空格
                _this._error(el)
                return false
            }

            if (el._.data('length')) {
                datas.minLength = el._.data('length')[0] || 1
                datas.maxLength = el._.data('length')[1]
            }

            if (el._.data('size')) {
                datas.minSize = el._.data('size')[0] || 0.01
                datas.maxSize = el._.data('size')[1]
            }

            if (datas.required || (!datas.required && datas.val)) {
                switch (type) {
                    case 'text':
                    case 'textarea':
                        return new Promise(function(resolve, reject) {
                            if (lengthCheck()) {
                                _this._success(el)
                                resolve()
                            } else {
                                _this._error(el)
                                reject()
                            }
                        })
                        break
                    case 'password':
                        return new Promise(function(resolve, reject) {
                            if (el._.data('length')) {
                                datas.minLength = el._.data('length')[0] || 6
                                datas.maxLength = el._.data('length')[1] || 18
                            } else {
                                datas.minLength = 8
                                datas.maxLength = 18
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
                                        _this._success(el)
                                        resolve()
                                    } else {
                                        _this._error(el)
                                        count++
                                        reject()
                                    }
                                } else {
                                    el._.next()._.attr({'class': 'codestrong active'})
                                    ._.children('.cs-txt').textContent = `请输入${datas.minLength}-${datas.maxLength}位字符的密码`

                                    el._.next()._.children('.cs-line')._.attr({'class': 'cs-line'})
                                    _this._error(el)
                                    count++
                                    reject()
                                }
                            } else {
                                if (lengthCheck()) {
                                    _this._success(el)
                                    resolve()
                                } else {
                                    _this._error(el)
                                    count++
                                    reject()
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
                                                _this._error(pwd2)
                                                count++
                                                reject()
                                            } else {
                                                _this._success(pwd2)
                                                resolve()
                                            }
                                        }
                                    }

                                    if (pwd2 == el) {
                                        if (pwd1.value === pwd2.value && 0 !== pwd1.value.length) {
                                            _this._success(el)
                                            resolve()
                                        } else {
                                            _this._error(el)
                                            count++
                                            reject()
                                        }
                                    }
                                }
                            }
                        })
                        break
                    case 'email':
                        return new Promise(function(resolve, reject) {
                            if (datas.val.match(/^\w+((-\w+)|(\.\w+))*\@[A-Za-z0-9]+((\.|-)[A-Za-z0-9]+)*\.[A-Za-z0-9]+$/)
                            && datas.val.indexOf('。') < 0 && lengthCheck()) {
                                _this._success(el)
                                resolve()
                            } else {
                                _this._error(el)
                                reject()
                            }
                        })
                        break
                    case 'number':
                        return new Promise(function(resolve, reject) {
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
                                        _this._success(el)
                                        resolve()
                                    } else {
                                        _this._error(el)
                                        reject()
                                    }
                                } else {
                                    _this._success(el)
                                    resolve()
                                }
                            } else {
                                _this._error(el)
                                reject()
                            }
                        })
                        break
                    case 'tel':
                        return new Promise(function(resolve, reject) {
                            if (datas.val.match(/^0\d{2,3}-?\d{7,8}$/)) {
                                _this._success(el)
                                resolve()
                            } else {
                                _this._error(el)
                                reject()
                            }
                        })
                        break
                    case 'mobile':
                        return new Promise(function(resolve, reject) {
                            if (datas.val.match(/^1[3456789]\d{9}$/)) {
                                _this._success(el)
                                resolve()
                            } else {
                                _this._error(el)
                                reject()
                            }
                        })
                        break
                    case 'mtel':
                        return new Promise(function(resolve, reject) {
                            if (datas.val.match(/^0\d{2,3}-?\d{7,8}$/) || datas.val.match(/^1[34578]\d{9}$/)) {
                                _this._success(el)
                                resolve()
                            } else {
                                _this._error(el)
                                reject()
                            }
                        })
                        break
                    case 'select':
                        return new Promise(function(resolve, reject) {
                            if (el._.parent()._.hasClass('select')) {
                                el = el._.parent()
                            }
                            if (datas.val) {
                                _this._success(el)
                                resolve()
                            } else {
                                _this._error(el)
                                reject()
                            }
                        })
                        break
                    case 'imgup':
                        return new Promise(function(resolve, reject) {
                            const fap = el._.parent('.imgup')
                            if (el.value.length > 0 && el.value != '[]') {
                                _this._success(fap)
                                resolve()
                            } else {
                                _this._error(fap)
                                reject()
                            }
                        })
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
                        return new Promise(function(resolve, reject) {
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
                                    resolve()
                                } else {
                                    $$('[name="' + name + '"]').forEach(function(item, i){
                                        item._.parent()._.addClass('error')
                                    })
                                    reject()
                                }
                            } else {
                                if (datas.required) {
                                    if (el.checked) {
                                        _this._success(el._.parent())
                                        resolve()
                                    } else {
                                        _this._error(el._.parent())
                                        reject()
                                    }
                                }
                            }
                        })
                        break
                }
            } else {
                return new Promise(function(resolve, reject) {
                    _this._success(el)
                    resolve()
                })
            }
        }

        _getLsit() {
            const ops = this._config
            ops.target = ops.target || this.$el._.parent('form')

            let wrong = 0,
                ckList = [],
                wlist = ops.target.querySelectorAll('*')

            wlist = Array.prototype.slice.call(wlist)
            if(wlist.length > 0){
                wlist.forEach(function(item, i){
                    var nodename = item.nodeName.toLocaleLowerCase()
                    switch (nodename) {
                        case 'input':
                        case 'textarea':
                        case 'select':
                            ckList.push(item)
                            break;
                    }
                })
            }

            return ckList
        }

        _init() {
            const _this = this
            const $this = _this.$el
            let ops = _this._config

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
                    case 'radio':
                    case 'checkbox':
                        return true
                        break
                    default:
                        return false
                        break
                }
            }

            const opmap = _this._getLsit()

            opmap.forEach(function(item, i){
                let type = item._.data('type') || item._.attr('type')
                if(!type){
                    type = item.nodeName.toLowerCase()
                }
                if (!item._.data('off') && checkType(type)) {
                    if(item._.data('keyup')){

                    }
                    let events = item._.data('keyup') ? 'onkeyup' : 'onchange'
                    item[events] = function () {
                        _this._check(item, type).catch(function(){})
                    }
                    item['validate'] = function () {
                        return _this._check(item, type)
                    }
                }
            })

            if(ops.enter){
                $('body')._.off('keydown')
                $('body').onkeydown = function(e) {
                   13 === e.which && $this.click()
               }
            }

            function PromiseForEach() {
                const opck = _this._getLsit()
                let realResult = []
                let result = Promise.resolve()
                opck.forEach((item, index) => {
                    result = result.then(() => {
                        if(item['validate']){
                            return item['validate']().catch(() => {
                                realResult.push(item)
                            })
                        }
                    })
                })

                return result.then(() => {
                    return realResult
                })
            }

            $this.onclick = function() {
                $this._.addClass('process')
                PromiseForEach().then((data) => {
                    $this._.removeClass('process')
                    // console.log("成功");
                    // console.log(data);
                    if(data.length === 0){
                        if (!ops.success) {
                            $this._.attr({'disabled': true})._.parent('form').submit()
                        } else {
                            const sucses = _this._getLsit()
                            let obj = {}
                            sucses.forEach(function(item, i){
                                let type = item._.data('type') || item._.attr('type')
                                let name = item._.attr('name')
                                if(type && name){
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
                                            obj[name] = item.value
                                        case 'radio':
                                            if(item.checked){
                                                obj[name] = item.value
                                            }
                                            break
                                        case 'checkbox':
                                            if(item.checked){
                                                if(obj[name]){
                                                    obj[name].push(item.value)
                                                } else {
                                                    obj[name] = [item.value]
                                                }
                                            }
                                            break
                                    }
                                }
                            })
                            ops.success(obj)
                        }
                    } else {
                        ops.error(data)
                    }
                }).catch((err) => {
                    $this._.removeClass('process')
                    // console.log(err);
                    // console.log("失败");
                });
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

    $.add(NAME, Validate._interface)

    return Validate

})(Bliss, Bliss.$)

export default Validate
