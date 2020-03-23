import Util from './util'

const Slider = (($, $$) => {
  // Constants
  const NAME = 'slider'
  const VERSION = '1.0.0'
  const DATA_KEY = 'oc.slider'

  const Event = {
    CLICK: Util.getEvent('click')
  }

  const Default = {
    auto: true,
    arrow: true,
    stop: 5000,
    speed: 300,
    ease: 'ease'
  }

  const DefaultType = {
    auto: 'bool',
    arrow: 'bool',
    stop: 'number',
    speed: 'number',
    ease: 'string'
  }

  const ClassName = {
    HOVER: 'hover'
  }

  const Selector = {
    DATA_TOGGLE: '[data-toggle="slider"]'
  }

  // Class Definition
  class Slider {
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

    _forStyle() {
      const _this = this
      let ops = _this._config,
        position = ops.position,
        cssStr = '',
        olIndex = ops.index

      for (var key in position) {
        if (position.hasOwnProperty(key))
          cssStr += key + ':' + position[key] + ';'
      }

      ops.list.setAttribute('style', cssStr)

      if (olIndex > ops.num) {
        olIndex = 1
      }

      let oli = ops.$ol._.children('li')
      oli._.removeClass(ClassName.HOVER)
      if (olIndex - 1 < 0) {
        olIndex++
      }
      oli[olIndex - 1]._.addClass(ClassName.HOVER)
    }

    _event() {
      const _this = this
      let ops = _this._config,
        timer

      if (ops.arrow) {
        var $prev = $('<span class="s-prev">&nbsp;</span>'),
          $next = $('<span class="s-next">&nbsp;</span>')

        $prev.onclick = function() {
          if (ops.go) {
            ops.go = false
            _this._goDec(false)
          }
        }

        $next.onclick = function() {
          if (ops.go) {
            ops.go = false
            _this._goDec(true)
          }
        }

        _this.$el._.append($prev, $next)
      }

      ops.$ol._.on(Event.CLICK, 'li', function() {
        ops.index = this._.index()
        _this._goDec(true)
      })

      function setInter() {
        timer = setInterval(function() {
          _this._goDec(true)
        }, ops.stop)
      }

      if (ops.auto) {
        _this.$el.onmouseenter = function() {
          clearInterval(timer)
        }
        _this.$el.onmouseleave = function() {
          clearInterval(timer)
          setInter()
        }
        setInter()
      }
    }

    _goDec(dec) {
      //true next, false prev
      const _this = this
      let ops = _this._config,
        nextGo = false

      if (dec) {
        ops.index++
        if (ops.index > ops.num) {
          nextGo = true
        }
      } else {
        ops.index--
        if (ops.index === 0) {
          nextGo = true
        }
      }

      ops.position = {
        transform: `translateX(-${ops.w * ops.index}px)`,
        transition: `transform ${ops.speed}ms ${ops.ease}`
      }

      _this._forStyle()

      setTimeout(() => {
        if (nextGo && dec) {
          ops.index = 1
          ops.position['transform'] = `translateX(-${ops.w}px)`
        } else if (nextGo && !dec) {
          ops.index = ops.num
          ops.position['transform'] = `translateX(-${ops.w * ops.num}px)`
        }
        if (nextGo) {
          ops.position['transition'] = 'none'
          _this._forStyle()
        }
        ops.go = true
      }, ops.speed)
    }

    _setting() {
      const _this = this
      let hidden = 'hidden'

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
          }

        evt = evt || window.event
        if (evt.type in evtMap) {
          //console.log(evtMap[evt.type])
        } else {
          if ((this[hidden] ? 'hidden' : 'visible') === 'hidden') {
            clearInterval(timer)
          } else {
            if (_this.options.auto) {
              setInter()
            }
          }
        }
      }

      function hdvis() {
        if (hidden in document) {
          document.addEventListener('visibilitychange', onvchange)
        } else if ((hidden = 'mozHidden') in document) {
          document.addEventListener('mozvisibilitychange', onvchange)
        } else if ((hidden = 'webkitHidden') in document) {
          document.addEventListener('webkitvisibilitychange', onvchange)
        } else if ((hidden = 'msHidden') in document) {
          document.addEventListener('msvisibilitychange', onvchange)
        } else if ('onfocusin' in document) {
          // IE 9 and lower
          document.onfocusin = document.onfocusout = onvchange
        } else {
          // All others
          window.onpageshow = window.onpagehide = window.onfocus = window.onblur = onvchange
        }
      }

      hdvis()
    }

    _init() {
      const _this = this
      let ops = _this._config

      ops.list = _this.$el._.children('div')
      ops.num = ops.list._.children('a').length

      if (ops.num > 1) {
        ops.list._.append(ops.list._.children('a')[0].cloneNode(true))
        ops.list._.prepend(
          ops.list._.children('a')[ops.num - 1].cloneNode(true)
        )
        ops.w = ops.list._.children('a')[0].offsetWidth
        ops.index = 1
        ops.go = true

        ops.$ol = $('<ol></ol>')

        for (var i = 0; i < ops.num; i++) {
          ops.$ol._.append('<li></li>')
        }
        _this.$el._.append(ops.$ol)

        ops.position = {
          transform: `translateX(-${ops.w}px)`,
          transition: `transform ${ops.speed}ms ${ops.ease}`
        }
        _this._forStyle()

        _this._event()
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
        data = new Slider(this, _config)
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
    Slider._interface.call(item, item._.data())
  })

  $.add(NAME, Slider._interface)

  return Slider
})(Bliss, Bliss.$)

export default Slider
