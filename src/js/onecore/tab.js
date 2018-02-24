import Util from './util'

const Tab = (($, $$) => {
    // Constants
    const NAME = 'tab'
    const VERSION = '1.0.0'
    const DATA_KEY = 'oc.tab'

    const Event = {
        CLICK: Util.getEvent('click')
    }

    const Default = {
        num: 0, //button length
        index: 0, //show index
        lastIndex: 0 //last index
    }

    const DefaultType = {
        num: 'number',
        index: 'number',
        lastIndex: 'number'
    }

    const ClassName = {
        ACTIVE: 'active'
    }

    const Selector = {
        DATA_TOGGLE: '[data-toggle="tab"]'
    }

    // Class Definition
    class Tab {
        constructor(element, config) {
            this.$el = element
            this.$nav = this.$el._.children('.tab-list')
            this.$context = this.$el._.children('.tab-context')._.children(
                'div'
            )
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

        _animate(ajas) {
            const _this = this
            let ops = _this._config,
                $last = _this.$context[ops.lastIndex],
                $now = _this.$context[ops.index],
                requFrame

            function ckanim() {
                if ($now._.style('opacity') === '1') {
                    cancelAnimationFrame(requFrame)
                    $now._.addClass(ClassName.ACTIVE)
                } else {
                    requFrame = requestAnimationFrame(ckanim)
                }
            }

            $last._.attr({ class: 'oc-tab-out' })
            if (ajas) {
                $now._.attr({ class: 'oc-tab-in oc-tab-load loading' })
            } else {
                $now._.attr({ class: 'oc-tab-in' })
            }

            requFrame = requestAnimationFrame(ckanim)
        }

        _event() {
            const _this = this
            let ops = _this._config

            function doAjax(num) {
                var el = _this.$context[num]

                el._.addClass('loading')

                _this._animate(true)

                // $.ajax({
                //     url: el.data('url'),
                //     success: function(data) {
                //         el.append(data).removeClass('loading').removeClass('oc-tab-load')
                //     }
                // })
            }

            _this.$nav._.on(Event.CLICK, 'button', function(e) {
                e.preventDefault()

                ops.lastIndex = ops.index
                ops.index = this._.index()
                _this.$nav._.children('button')
                    ._.removeClass(ClassName.ACTIVE)
                    [ops.index]._.addClass(ClassName.ACTIVE)
                if (
                    _this.$context[ops.index].innerHTML === '' &&
                    _this.$context[ops.index]._.data('url')
                ) {
                    doAjax(ops.index)
                } else {
                    _this._animate()
                }
            })

            if (
                _this.$context[0].innerHTML === '' &&
                _this.$context[0]._.data('url')
            ) {
                doAjax(0)
            }
        }

        _init() {
            const _this = this
            let ops = _this._config

            ops.num = _this.$nav._.children('button').length
            _this.$nav._.children('button')[0]._.addClass(ClassName.ACTIVE)
            _this.$context[0]._.addClass('oc-tab-in active')
            _this._event()
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
                data = new Tab(this, _config)
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

    // Data Api implementation
    $$(Selector.DATA_TOGGLE).forEach(function(item, i) {
        Tab._interface.call(item, item._.data())
    })

    $.add(NAME, Tab._interface)

    return Tab
})(Bliss, Bliss.$)

export default Tab
