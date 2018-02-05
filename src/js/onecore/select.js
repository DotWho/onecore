import Util from './util'

const Select = (($, $$) => {
    // Constants
    const NAME = 'select'
    const VERSION = '1.0.0'
    const DATA_KEY = 'oc.select'

    const Event = {
        CLICK: Util.getEvent('click')
    }

    const Default = {
        select: ''
    }

    const DefaultType = {
        select: '(number|string)'
    }

    const ClassName = {
        HOVER: 'hover',
        ACTIVE: 'active',
        OVERLAY: 'overlay-layer',
        BODY: 'body',
        SELECT: '.select',
        DISABLED: 'disabled'
    }

    const Selector = {
        DATA_TOGGLE: '[data-toggle="select"]'
    }

    // Class Definition
    class Select {

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
            this.$el._.off(Event.CLICK)
            $.removeData(this.$el, DATA_KEY)

            this._config = null
        }

        update(){
            const $this = this.$el,
                $select = $this.parentNode,
                $button = $select._.children('button')

            let ops = this._config,
                selected = $this.value,
                oriName = $this._.find('option')[0].innerHTML || '&nbsp;';

            $select.value = selected
            $select._.fire('change')
            $button.innerHTML = oriName
            $select._.children('ul').innerHTML = ''

            this._factory($this, $select, $button, selected)
        }

        // private
        _getConfig(config) {
            config = $.extends({}, Default, config)
            Util.typeCheckConfig(NAME, config, DefaultType)
            return config
        }

        _factory($this, $select, $button, selected) {
            $this._.find('option').forEach(function(item, i){
                var $option = $('<li class="btn" data-select="'+item.value+'">'+item.innerHTML+'</li>')
                if(selected == item.value) {
                    $button.innerHTML = item.textContent
                    $option._.addClass(ClassName.HOVER)
                }
                $select._.find('ul')._.append($option)
            })
        }

        _init() {
            const $this = this.$el
            let ops = this._config

            let selected = ops.select || $this.value,
                oriName = $this._.find('option')[0].innerHTML || '&nbsp;',
                $select = $(`<div class="select"><button type="button" class="btn">${oriName}</button><ul></ul></div>`),
                $button = $select._.children('button')

            $this.value = selected

            if(ops.direction){
                $select._.find('ul')._.addClass('seltop')
            }

            this._factory($this, $select, $button, selected)

            $select._.addClass($this._.attr('class'))
            $select._.after($this)._.append($this)

            if($this._.attr(ClassName.DISABLED) || $this._.attr('readonly')){
                $button._.attr(ClassName.DISABLED, true)
            }else{
                $button.onclick = function (e) {
                    e.stopPropagation()
                    e.preventDefault()

                    if(!$select._.hasClass(ClassName.ACTIVE)){
                        $select._.addClass('dismiss')
                    }

                    if($select._.hasClass(ClassName.ACTIVE)){
                        $select._.removeClass(ClassName.ACTIVE)
                    } else {
                        $$(ClassName.SELECT)._.removeClass(ClassName.ACTIVE)
                        $select._.addClass(ClassName.ACTIVE)
                    }

                    if(window.screen.width <= 480){
                        $(ClassName.BODY)._.addClass(ClassName.OVERLAY)
                    }
                }

                $select._.on(Event.CLICK, 'li', function (e) {
                    e.stopPropagation()
                    e.preventDefault()

                    $button.textContent = this.textContent
                    $this.value = this._.data('select')
                    $this._.fire('change')
                    $select._.find('li')._.removeClass(ClassName.HOVER)
                    this._.addClass(ClassName.HOVER)
                    $select._.removeClass(ClassName.ACTIVE)

                    if(window.screen.width <= 480){
                        $(ClassName.BODY)._.removeClass(ClassName.OVERLAY)
                    }
                })
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
                data = new Select(this, _config)
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
    $$(Selector.DATA_TOGGLE).forEach(function(item, i){
        Select._interface.call(item , item._.data())
    })

    document.addEventListener(Event.CLICK, function(){
        $$(ClassName.SELECT)._.removeClass(ClassName.ACTIVE)
    }, false);

    $.add(NAME, Select._interface)

    return Select

})(Bliss, Bliss.$)

export default Select
