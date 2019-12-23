import Util from './util'
import Area from './area'

const City = (($, $$) => {
  // Constants
  const NAME = 'city'
  const VERSION = '1.0.0'
  const DATA_KEY = 'oc.city'

  const Event = {
    CLICK: Util.getEvent('click')
  }

  const Default = {
    index: 0 // 备用，删减选项卡使用
  }

  const DefaultType = {
    index: 'number'
  }

  const ClassName = {
    SELECT: '.city',
    ACTIVE: 'active'
  }

  const Selector = {
    DATA_TOGGLE: '[data-toggle="city"]'
  }

  // Class Definition
  class City {
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

    update() {
      this._update()
    }

    // private
    _getConfig(config) {
      config = $.extends({}, Default, config)
      Util.typeCheckConfig(NAME, config, DefaultType)
      return config
    }

    _setCityData(data, obj, str) {
      let ops = this._config
      data = Area[data]
      obj.innerHTML = ''
      if (data) {
        Object.keys(data).forEach(function(item, i) {
          let span = $(`<span data-id="${item}">${data[item]}</span>`)
          if (str && item == ops.ctx[str]) {
            span._.addClass('active')
          }

          obj._.append(span)
        })
      } else {
        obj._.append(`<span data-id="">市区</span>`)
      }
    }

    _setTop(obj) {
      let act = obj._.children('.active')
      obj.scrollTop = act.offsetTop - 75 + act.offsetHeight / 2
    }

    _update() {
      const $el = this.$el
      let ops = this._config
      let $input = $el._.children('input'),
        $ctx = $el._.children('.city-content'),
        $province = $ctx._.children('.city-province'),
        $city = $ctx._.children('.city-city'),
        $district = $ctx._.children('.city-district'),
        $title = $el._.children('.city-title')

      ops.ctx = JSON.parse($input.value)
      this._setCityData(86, $province, 'province')
      this._setCityData(ops.ctx.province, $city, 'city')
      this._setCityData(ops.ctx.city, $district, 'district')
      let ct = `${ops.ctx.provinceStr} / ${ops.ctx.cityStr} / ${ops.ctx.districtStr}`
      $title.innerHTML = ct
      $title.title = ct
      this._setTop($province)
      this._setTop($city)
      this._setTop($district)
    }

    _init() {
      const _this = this
      const $el = _this.$el
      let ops = _this._config

      let $input = $el._.children('input'),
        $title = $(
          '<button type="button" class="btn city-title">请选择省市区</button>'
        ),
        $ctx = $(`<div class="city-content clearfix">
                                <div class="city-province"></div>
                                <div class="city-city"></div>
                                <div class="city-district"></div>
                            </div>`),
        $province = $ctx._.children('.city-province'),
        $city = $ctx._.children('.city-city'),
        $district = $ctx._.children('.city-district')

      function doInit() {
        ops.ctx = {
          province: '',
          provinceStr: '',
          city: '',
          cityStr: '',
          district: '',
          districtStr: ''
        }
        _this._setCityData(86, $province)
      }

      function setJson() {
        let ct = `${ops.ctx.provinceStr} / ${ops.ctx.cityStr} / ${ops.ctx.districtStr}`
        $title.innerHTML = ct
        $title.title = ct
        $input.value = JSON.stringify(ops.ctx)
        $el._.removeClass(ClassName.ACTIVE)
        $el._.removeClass('error')
      }

      function clearJson() {
        $title.innerHTML = '请选择省市区'
        $title.title = '请选择省市区'
        $input.value = ''
      }

      $ctx.onclick = function(e) {
        e.stopPropagation()
        e.preventDefault()
      }

      $title.onclick = function(e) {
        e.stopPropagation()
        e.preventDefault()

        if (!$el._.hasClass(ClassName.ACTIVE)) {
          $el._.addClass('dismiss')
        }

        if ($el._.hasClass(ClassName.ACTIVE)) {
          $el._.removeClass(ClassName.ACTIVE)
        } else {
          $$(ClassName.SELECT)._.removeClass(ClassName.ACTIVE)
          $el._.addClass(ClassName.ACTIVE)
        }
      }

      $province._.on(Event.CLICK, 'span', function() {
        const id = this._.data('id')
        const str = this.innerHTML
        ops.ctx.province = id
        ops.ctx.provinceStr = str
        $province._.children('span')._.removeClass(ClassName.ACTIVE)
        this._.addClass(ClassName.ACTIVE)
        _this._setCityData(id, $city)
        $district.innerHTML = ''
        clearJson()
      })

      $city._.on(Event.CLICK, 'span', function() {
        const id = this._.data('id')
        const str = this.innerHTML
        ops.ctx.city = id
        ops.ctx.cityStr = str
        $city._.children('span')._.removeClass(ClassName.ACTIVE)
        this._.addClass(ClassName.ACTIVE)
        _this._setCityData(id, $district)
        clearJson()
      })

      $district._.on(Event.CLICK, 'span', function() {
        const id = this._.data('id')
        const str = this.innerHTML
        ops.ctx.district = id
        ops.ctx.districtStr = str
        $district._.children('span')._.removeClass(ClassName.ACTIVE)
        this._.addClass(ClassName.ACTIVE)
        setJson()
      })

      $el._.append($title)
      $el._.append($ctx)

      if (!$input.value) {
        doInit()
      } else {
        try {
          _this._update()
        } catch (e) {
          doInit()
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
        data = new City(this, _config)
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
    City._interface.call(item, item._.data())
  })

  document.addEventListener(
    Event.CLICK,
    function() {
      $$(ClassName.SELECT)._.removeClass(ClassName.ACTIVE)
    },
    false
  )

  $.add(NAME, City._interface)

  return City
})(Bliss, Bliss.$)

export default City
