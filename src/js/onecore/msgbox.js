/**
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
import Util from './util'

const Msgbox = (($, $$) => {
    // Constants
    const NAME = 'msgbox'
    const VERSION = '1.0.0'
    const DATA_KEY = 'oc.msgbox'

    const Event = {
        CLICK: Util.getEvent('click')
    }

    const Default = {
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
    }

    const DefaultType = {
        type: 'string',
        textY: 'string',
        textN: 'string',
        close: 'boolean',
        num: 'number'
    }

    const ClassName = {
        SHOW: 'showbox',
        HIDE: 'hidbox',
        MSGHD: 'msgboxhide',
        LOAD: 'loading'
    }

    // Class Definition
    class Msgbox {

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

        _hide() {
            const ops = this._config

            if (ops.$div) {
                ops.$div._.addClass(ClassName.MSGHD)
                ops.$msgctx._.addClass(ClassName.HIDE)
                this._requFrame()
            }
        }

        _requFrame() {
            let requFrame
            let ops = this._config

            function closeDone() {
                if (ops.$div._.style('visibility') === 'hidden') {
                    cancelAnimationFrame(requFrame)
                    ops.$div._.remove()
                    ops.$div = null
                    ops.$msgctx = null
                    ops.$msgdiv = null
                    ops = null
                    requFrame = null
                } else {
                    requFrame = requestAnimationFrame(closeDone)
                }
            }

            requFrame = requestAnimationFrame(closeDone)
        }

        _success() {
            const ops = this._config

            if (ops.success) {
                ops.success()
            } else {
                this._hide()
            }
        }

        _error() {
            const ops = this._config

            if (ops.error) {
                ops.error()
            } else {
                this._hide()
            }
        }

        _init() {
            const _this = this
            let ops = _this._config

            let $div = $(`<div class="msgbox">
                    <span class="loading-close"></span>
                    <div class="msgctx">
                        <div class="msgbar">
                            <label></label>
                            <span class="close"></span>
                        </div>
                        <div class="msgdiv"></div>
                    </div>
                </div>`),
            $msgctx = $div.querySelector('.msgctx'),
            $msgdiv = $div.querySelector('.msgdiv')

            let $btn = $('<div class="msgbtn"></div>'),
                $btn1 = $(`<button type="button" class="btn msgbtn-y" dark>${ops.textY}</button>`),
                $btn2 = $(`<button type="button" class="btn msgbtn-n" dark>${ops.textN}</button>`)

            if (window.screen.width <= 480) { ops.w = '80%' }

            if (window.screen.height - 127 < Number(ops.h)) { ops.h = '95%' }

            if (ops.url) {
                doAjax()
            } else {
                if (ops.html) {
                    $msgdiv._.append(ops.html)
                } else {
                    ops.w = ops.w || 280
                    ops.num = ops.num || 1
                    ops.title = ops.title || '\u63d0\u793a'
                    $msgdiv.innerHTML = ops.text
                }
                $msgctx._.addClass(ClassName.SHOW)
            }

            var $btnh
            if (ops.num && !ops.custom) {
                if (ops.num === 1) {
                    $btn1.onclick = function(event) {
                        _this._success()
                    }
                    $btn._.append($btn1)
                } else {
                    $btn1.onclick = function(event) {
                        _this._success()
                    }
                    $btn2.onclick = function(event) {
                        _this._error()
                    }
                    $btn._.append($btn1, $btn2)
                }

                if (ops.bind) {
                    $btn1._.off('click')
                    $btnh = $btn1
                    if (!ops.url) {
                        ops.bind($btn1, $msgdiv)
                    }
                }
            } else {
                var custom = ops.custom
                for (var i = 0; i < custom.length; i++) {
                    var data = custom[i],
                        $button = $('<button type="button" class="btn ' + data.class + '" dark>' + data.text + '</button>')

                    $btnh = $button
                    $btn._.append($button)
                    if (data.bind && !ops.url) {
                        data.bind($button, $msgdiv)
                    } else {
                        if (data.clickfn) {
                            $button.onclick = data.clickfn
                        } else {
                            $button.onclick = function() {
                                _this._hide()
                            }
                        }
                    }
                    $button = null
                }
            }

            $msgctx._.append($btn)

            $msgctx._.style({
                width: ops.w + 'px',
                height: ops.h + 'px'
            })

            $msgctx.querySelector('.msgbar > label').innerHTML = ops.title

            $div.querySelector('.loading-close').onclick = function() {
                _this._hide()
            }

            if (ops.close) {
                $div.querySelector('.close').onclick = function() {
                    _this._hide()
                }
            } else {
                $div.querySelector('.close')._.remove()
            }

            function doAjax() {
                $div._.addClass(ClassName.LOAD)._.removeClass('loaderror')

                $.fetch(ops.url, {
                    data: ops.data,
                	responseType: "html"
                }).then(function(data){
                    $msgdiv.innerHTML = data
                    $msgctx.addClass(ClassName.SHOW)
                    $div.removeClass(ClassName.LOAD)
                    if (ops.bind) {
                        ops.bind($btnh, $msgdiv)
                    }
                    if (ops.done) {
                        ops.done($msgdiv)
                    }
                }).catch(function(error){
                    $div._.addClass('loaderror')
                    if ($div._.find('.errorshow')) {
                        var loadero = $(`<div class="errorshow text-center">
                            <p>\u52a0\u8f7d\u5931\u8d25</p>
                            <button type="button" class="btn">\u91cd\u8bd5</button>
                            </div>`)

                        loadero._.find('button').onclick = function(event) {
                            event.preventDefault()
                            doAjax()
                        }
                        $div._.append(loadero)
                    }
                });
            }

            $('body')._.append($div)
            ops.$div = $div
            ops.$msgctx = $msgctx
            ops.$msgdiv = $msgdiv
        }

        // static
        static _interface(config) {
            function msgRemove() {
                setTimeout(() => {
                    this._.remove()
                }, 1000)
            }

            const _config = $.extends({}, Default, config)

            if (typeof config === 'object') {
                let data = new Msgbox(this, _config)
            }else{
                let str = '.'
                if(config === 'last'){
                    str = '.msgbox:last'
                }
                const msgbox = $$('.msgbox')
                if(msgbox.length > 0){
                    let i = 0
                    if(config === 'last'){
                        i = msgbox.length - 1
                    }

                    for (;i < msgbox.length; i++) {
                        msgbox[i]._.addClass(ClassName.MSGHD).querySelector('.msgctx')._.addClass(ClassName.HIDE)
                        msgRemove.apply(msgbox[i])
                    }
                }
            }
        }
    }

    // jQuery
    $.fn[NAME] = Msgbox._interface
    $.fn[NAME].Constructor = Msgbox

    return Msgbox

})(Bliss, Bliss.$)

export default Msgbox
