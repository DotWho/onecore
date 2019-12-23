import Util from './util'

const Dropmenu = (($, $$) => {
  // Constants
  const NAME = 'dropmenu'
  const VERSION = '1.0.0'
  const DATA_KEY = 'oc.dropmenu'

  const Event = {
    ENTER: 'mouseenter',
    CLICK: Util.getEvent('click')
  }

  const Default = {
    direction: 'center',
    trigger: 'click'
  }

  const DefaultType = {
    direction: 'string',
    trigger: 'string'
  }

  const ClassName = {
    ACTIVE: 'active',
    MISS: 'dismiss',
    OVERLAY: 'overlay-layer',
    DPM: '.dropmenu'
  }

  const Selector = {
    DATA_TOGGLE: '[data-toggle="dropmenu"]'
  }

  // Class Definition
  class Dropmenu {
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

    _init() {
      const _this = this
      const $this = _this.$el
      let ops = _this._config

      let $div = $this._.children('div')

      if (window.screen.width > 480) {
        switch (ops.direction) {
          case 'center':
            $div._.style({
              'margin-left': `${-$div.offsetWidth / 2}px`,
              transform: 'translateX(-50%)'
            })
            break
          case 'left':
            $div._.addClass('left')
            break
          case 'right':
            $div._.addClass('right')
            break
          case 'top':
            $div._.style({
              'margin-left': `${-$div.offsetWidth / 2}px`,
              transform: 'translateX(-50%)'
            })
            $div._.addClass('top')
            break
          case 'topleft':
            $div._.addClass('top left')
            break
          case 'topright':
            $div._.addClass('top right')
            break
        }
      }

      if (ops.trigger !== 'mouseenter') {
        const chd = $this._.children()[0]
        chd._.bind(ops.trigger, function(e) {
          e.preventDefault()
          e.stopPropagation()

          if (!$this._.hasClass(ClassName.MISS)) {
            $this._.addClass('dismiss')
          }

          if ($this._.hasClass(ClassName.ACTIVE)) {
            $this._.removeClass(ClassName.ACTIVE)._.addClass(ClassName.MISS)
          } else {
            $$(ClassName.DPM)._.removeClass(ClassName.ACTIVE)
            $this._.addClass(ClassName.ACTIVE)
            if (window.screen.width <= 480) {
              $('body')._.addClass(ClassName.OVERLAY)
            }
          }
        })

        $this._.children()[0]._.next().onclick = function(e) {
          e.preventDefault()
          e.stopPropagation()
        }
      } else {
        $this._.once(Event.ENTER, function(event) {
          $this._.addClass(ClassName.MISS)
        })
        $this._.addClass('dphover')
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
        if (window.screen.width <= 480) {
          _config.trigger = 'click'
        }
        data = new Dropmenu(this, _config)
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
    Dropmenu._interface.call(item, item._.data())
  })

  document.addEventListener(
    Event.CLICK,
    function() {
      $$(ClassName.DPM)._.removeClass(ClassName.ACTIVE)
    },
    false
  )

  $.add(NAME, Dropmenu._interface)

  return Dropmenu
})(Bliss, Bliss.$)

export default Dropmenu
