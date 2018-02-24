import Util from './util'

const Toast = (($, $$) => {
    // Constants
    const NAME = 'toast'
    const VERSION = '1.0.0'
    const DATA_KEY = 'oc.toast'

    const Event = {
        CLICK: Util.getEvent('click')
    }

    const Default = {
        text: 'center',
        type: '',
        dect: 'top-right',
        auto: true
    }

    const DefaultType = {
        text: 'string',
        type: 'string',
        dect: 'string',
        auto: 'bool'
    }

    // Class Definition
    class Toast {
        constructor(element, config) {
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

        _init() {
            const _this = this
            let ops = _this._config,
                type = ''

            function closed() {
                $div._.addClass('toastout')
                setTimeout(() => {
                    $div._.remove()
                }, 500)
            }

            if (
                ops.type === 'success' ||
                ops.type === 'warning' ||
                ops.type === 'info' ||
                ops.type === 'error'
            ) {
                type = `<div class="notic n${ops.type}">&nbsp;</div>`
            }

            const $div = $(
                `<div class="toast clearfix">${type}<div class="ctx">${
                    ops.text
                }</div><div class="close">&nbsp;</div></div>`
            )

            if (ops.auto) {
                setTimeout(() => {
                    closed()
                }, 3000)
            }

            $div._.find('.close').onclick = function() {
                closed()
            }

            switch (ops.dect) {
                case 'top':
                    if (!$('.toast-top')) {
                        $('body')._.append('<div class="toast-top"></div>')
                    }
                    $('.toast-top')._.prepend($div)
                    break
                case 'top-right':
                    if (!$('.toast-top-right')) {
                        $('body')._.append(
                            '<div class="toast-top-right"></div>'
                        )
                    }
                    $('.toast-top-right')._.prepend($div)
                    break
                case 'btm':
                    if (!$('.toast-btm')) {
                        $('body')._.append('<div class="toast-btm"></div>')
                    }
                    $('.toast-btm')._.append($div)
                    break
                case 'btm-right':
                    if (!$('.toast-btm-right')) {
                        $('body')._.append(
                            '<div class="toast-btm-right"></div>'
                        )
                    }
                    $('.toast-btm-right')._.append($div)
                    break
            }
        }

        // static
        static _interface(config) {
            const _config = $.extends({}, Default, config)

            if (typeof config === 'object') {
                let data = new Toast(this, _config)
            }
        }
    }

    // jQuery
    $.fn[NAME] = Toast._interface
    $.fn[NAME].Constructor = Toast

    return Toast
})(Bliss, Bliss.$)

export default Toast
