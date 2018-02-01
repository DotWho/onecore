// function Plugin(option) {
//     return this.each(function () {
//         var $this = $(this),
//             data = $this.data('oc.citys'),
//             options = typeof option == 'object' && option;
//
//         if(option === 'reset'){
//             $this.children('.city-title').removeClass('hastitle').html('请选择省市区').removeAttr('title');
//             $this.find('input').val('');
//             $this.data('oc.citys', null);
//             $this.citys({
//                 url: $this.data('url'),
//                 step: $this.data('step')
//             });
//         } else if (option === 'update'){
//             $this.data('oc.citys', null);
//             $this.citys({
//                 url: $this.data('url'),
//                 step: $this.data('step')
//             });
//         } else {
//             if (!data) $this.data('oc.citys', (data = new Citys(this, options)));
//             data.init();
//         }
//     });
// }




import Util from './util'

const City = (($) => {
    // Constants
    const NAME = 'city'
    const VERSION = '1.0.0'
    const DATA_KEY = 'oc.city'
    const EVENT_KEY = `.${DATA_KEY}`
    const JQUERY_NO_CONFLICT = $.fn[NAME]

    const Event = {
        CLICK: `${Util.getEvent('click')}${EVENT_KEY}`
    }

    const Default = {
        url: '',
        step: 3,
        index: 0
    }

    const DefaultType = {
        url: 'string',
        step: 'number',
        index: 'number'
    }

    const ClassName = {
        ACTIVE: 'active',
        MISS: 'dismiss',
        OVERLAY: 'overlay-layer'
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

        // private
        _getConfig(config) {
            config = $.extend({}, Default, config)
            Util.typeCheckConfig(NAME, config, DefaultType)
            return config
        }

        _init() {
            const _this = this
            const $el = _this.$el
            let ops = _this._config,
                $drop = $('<div class="city-drop"><div class="city-tab clearfix"></div><div class="city-content"></div></div>');

            switch (ops.step) {
                case 1:
                    $drop.children('.city-tab').addClass('one');
                    break;
                case 2:
                    $drop.children('.city-tab').addClass('two');
                    break;
            }

            for (var i = 1; i <= ops.step; i++) {
                switch (i) {
                    case 1:
                        $drop.children('.city-tab').append('<button type="button" class="btn active">省份</button>');
                        $drop.children('.city-content').append('<div class="city-province"></div>');
                        break;
                    case 2:
                        $drop.children('.city-tab').append('<button type="button" class="btn">城市</button>');
                        $drop.children('.city-content').append('<div class="city-city" style="display:none;"></div>');
                        break;
                    case 3:
                        $drop.children('.city-tab').append('<button type="button" class="btn">县区</button>');
                        $drop.children('.city-content').append('<div class="city-district" style="display:none;"></div>');
                        break;
                }
            }

            function changeIndex() {
                $drop.children('.city-tab').children('button').removeClass('active').eq(ops.index).addClass('active');
                $drop.children('.city-content').children('div').hide().eq(ops.index).show();
            }

            var vText = '',
                vTitle = '',
                vId = '',
                isinit = true;

            function getProcince() {
                $.each($drop.find('.city-province').children('a'), function() {
                    if($(this).hasClass('active')){
                        vText += $(this).text();
                        vTitle += $(this).text();
                        vId += $(this).data('id');
                    }
                });
            }

            function getCity() {
                $.each($drop.find('.city-city').children('a'), function() {
                    if($(this).hasClass('active')){
                        vText += '<span>&nbsp;&bull;&nbsp;</span>' + $(this).text();
                        vTitle += ',' + $(this).text();
                        vId += ',' + $(this).data('id');
                    }
                });
            }

            function getDistrict() {
                $.each($drop.find('.city-district').children('a'), function() {
                    if($(this).hasClass('active')){
                        vText += '<span>&nbsp;&bull;&nbsp;</span>' + $(this).text();
                        vTitle += ',' + $(this).text();
                        vId += ',' + $(this).data('id');
                    }
                });
            }

            function getValues(n) {
                vText = '';
                vTitle = '';
                vId = '';

                switch (n) {
                    case 0:
                        $drop.find('.city-city').html('');
                        $drop.find('.city-district').html('');
                        getProcince();
                        break;
                    case 1:
                        $drop.find('.city-district').html('');
                        getProcince();
                        getCity();
                        break;
                    case 2:
                        getProcince();
                        getCity();
                        getDistrict();
                        break;
                }

                $el.find('.city-title').addClass('hastitle').html(vText).attr('title', vTitle);
                $el.find('input').eq(0).val(vId);
                $el.find('input').eq(1).val(vTitle);
            }

            function getData(pram, donext) {
                var isync = true;
                if(donext){
                    isync = false;
                }
                $drop.children('.city-content').children('div').eq(ops.index).html('');
                $.ajax({
                    url: ops.url,
                    async: isync,
                    data: pram
                }).then(function (data) {
                    if(data.result === 1){
                        data = data.body;
                        if(data.length > 0){
                            for (var i = 0; i < data.length; i++) {
                                $drop.children('.city-content').children('div').eq(ops.index).append('<a href="javascript:;" class="btn" data-id="'+data[i].id+'">'+data[i].fullName+'</a>');
                            }
                            if(data.length === 1){
                                $drop.children('.city-content').children('div').eq(ops.index).find('a').trigger('click');
                            }
                        }else{
                            $drop.find('.city-district').append('<a href="javascript:;" class="btn" data-id="null">市区</a>');
                        }
                    }
                });
            }

            if(isinit && $el.find('input').eq(0).val().length > 0){
                setvalue();
            }else{
                isinit = false;
                getData(null);
            }

            function setvalue() {
                getData(null, true);
                var ids = $el.find('input').eq(0).val().split(',');
                $.each($drop.find('.city-province').children('a'), function() {
                    if($(this).data('id') == ids[0]){
                        $(this).addClass('active');
                        ops.index = 1;
                        getData({'provinceId': ids[0]}, true);
                    }
                });
                $.each($drop.find('.city-city').children('a'), function() {
                    if($(this).data('id') == ids[1]){
                        $(this).addClass('active');
                        ops.index = 2;
                        getData({'cityId': ids[1]}, true);
                    }
                });
                if($drop.find('.city-district').children('a').length > 1){
                    $.each($drop.find('.city-district').children('a'), function() {
                        if($(this).data('id') == ids[2]){
                            $(this).addClass('active');
                            ops.index = 0;
                        }
                    });
                }else{
                    $drop.find('.city-district').children('a').addClass('active');
                    ops.index = 0;
                }

                ops.index = ops.step-1;
                getValues(ops.index);
                changeIndex();
            }

            $drop.children('.city-tab').on('click', 'button', function(event) {
                event.preventDefault();
                ops.index = $(this).index();
                changeIndex();
            });

            $drop.children('.city-content').on('click', 'a', function(event) {
                event.preventDefault();
                if($(this).hasClass('active')){
                    if($(this).parent().next().length > 0){
                        ops.index = $(this).parent().index()+1;
                        changeIndex();
                    }else{
                        $el.removeClass('active');
                    }
                }else{
                    $(this).parent().find('a').removeClass('active');
                    $(this).addClass('active');
                    if($(this).parent().next().length > 0){
                        var pram;
                        switch (ops.index) {
                            case 0:
                                pram = {
                                    'provinceId': $(this).data('id')
                                };
                                break;
                            case 1:
                                pram = {
                                    'cityId': $(this).data('id')
                                };
                                break;
                        }
                        ops.index = $(this).parent().index()+1;
                        getData(pram);
                        getValues(ops.index);
                        changeIndex();
                    }else{
                        getValues(2);
                        $el.removeClass('active').removeClass('error');
                    }
                }
            });

            $el.children('.city-title').off('click').click(function(event) {
                event.preventDefault();
                $el.addClass('active');
                $(this).addClass('active');
                if(window.screen.width <= 480){
                    $('body').addClass('overlay-layer');
                }
            });

            $el.one('click.oc.citys', function (e) {
                $(this).addClass('dismiss');
            });

            $(document).on('click.oc.citys touchend.oc.citys', function (e) {
                if (!$el.is(e.target) && 0 === $el.has(e.target).length) {
                    if ($el.hasClass('active')) {
                        $el.removeClass('active');
                        $el.children('.city-title').removeClass('active');
                        if(window.screen.width <= 480){
                            $('body').removeClass('overlay-layer');
                        }
                    }
                }
            });

            $el.append($drop);
        }

        // static
        static _jQueryInterface(config) {
            return this.each(function() {
                const $this = $(this)
                let data = $this.data(DATA_KEY)
                const _config = $.extend({}, Default, $this.data())

                if (typeof config === 'object') {
                    $.extend(_config, config)
                }

                const action = typeof config === 'string' ? config : _config

                if (!data) {
                    if(window.screen.width <= 480){
                        _config.trigger = 'click'
                    }
                    data = new City($this, _config)
                    $this.data(DATA_KEY, data)
                }

                if (typeof action === 'string') {
                    if (data[action] === undefined) {
                        throw new Error(`No method named "${action}"`)
                    }
                    data[action]()
                }
            })
        }
    }

    // Data Api implementation
    $(Selector.DATA_TOGGLE).each(function() {
        const $city = $(this)
        City._jQueryInterface.call($city , $city.data())
    })

    // jQuery
    $.fn[NAME] = City._jQueryInterface
    $.fn[NAME].Constructor = City
    $.fn[NAME].noConflict = function() {
        $.fn[NAME] = JQUERY_NO_CONFLICT
        return City._jQueryInterface
    }

    return City

})(jQuery)

export default City
