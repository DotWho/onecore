import Util from './util'

const Page = (($, $$) => {
    // Constants
    const NAME = 'page'
    const VERSION = '1.0.0'
    const DATA_KEY = 'oc.page'

    const Event = {
        CLICK: Util.getEvent('click')
    }

    const Default = {
        total: 10,
        page: 1,
        param: 'page'
    }

    const DefaultType = {
        total: 'number',
        page: 'number',
        param: 'string'
    }

    const Selector = {
        DATA_TOGGLE: '[data-toggle="page"]'
    }

    // Class Definition
    class Page {

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

        update() {
            const _this = this
            const $this = _this.$el
            let ops = _this._config

            function setPage(i){
                let $page = $(`<a href="${ops.url}${i}" class="btn page">${i}</a>`)
                $page._.data('page', i)

                if(ops.page === i){
                    $page._.attr({'href': 'javascript:;'})._.addClass('current')
                }
                ops.$next._.before($page)
            }

            if($this._.children('.page').length > 0){
                $this._.children('.page').forEach(function(item, i){
                    item._.remove()
                })
            }

            _this._setPN()

            if(ops.page > 3){
                if(ops.page + 3 >= ops.total){
                    for (var i = ops.total - 6; i <= ops.total; i++) {
                        setPage(i)
                    }
                }else{
                    for (var i = 3; i > 0; i--) {
                        let $page = $(`<a href="${ops.url}${ops.page-i}" class="btn page">${ops.page-i}</a>`)
                        $page._.data('page', ops.page-i)
                        ops.$next._.before($page)
                    }
                    for (var i = ops.page; i < ops.page + 4; i++) {
                        setPage(i)
                    }
                }
            } else {
                for (var i = 1; i < 8; i++) {
                    setPage(i)
                }
            }
        }

        _setPN() {
            const _this = this
            const $this = _this.$el
            let ops = _this._config

            if(!ops.$prev && !ops.$next){
                let $prev = $(`<a href="${ops.url}${ops.page-1}" class="btn page-prev">&nbsp;</a>`),
                    $next = $(`<a href="${ops.url}${ops.page+1}" class="btn page-next">&nbsp;</a>`)

                $prev._.data('page', ops.page-1)
                $next._.data('page', ops.page+1)

                if(ops.page === 1){
                    $prev._.addClass('disabled')._.attr({'href': 'javascript:;'})
                } else if (ops.page === ops.total){
                    $next._.addClass('disabled')._.attr({'href': 'javascript:;'})
                }

                ops.$prev = $prev
                ops.$next = $next

                $this._.append($prev, $next)
            } else {
                if(ops.page === 1){
                    ops.$prev._.addClass('disabled')._.attr({'href': 'javascript:;'})._.removeData('page')
                }else{
                    ops.$prev._.removeClass('disabled')._.attr({'href': `${ops.url}${ops.page-1}`})._.data('page', ops.page-1)
                }

                if (ops.page === ops.total){
                    ops.$next._.addClass('disabled')._.attr({'href': 'javascript:;'})._.removeData('page')
                }else{
                    ops.$next._.removeClass('disabled')._.attr({'href': `${ops.url}${ops.page+1}`})._.data('page', ops.page+1)
                }
            }
        }

        _init() {
            const _this = this
            const $this = _this.$el
            let ops = _this._config

            function getUrlParam() {
                var reg = new RegExp('(^|&)' + ops.param + '=([^&]*)(&|$)')
                var r = window.location.search.substr(1).match(reg)
                if (r !== null) {
                    let page = parseInt(unescape(r[2]))
                    if(page > ops.total){
                        page = ops.total
                    }
                    return page
                }
                return null
            }

            ops.page = getUrlParam() || ops.page || 1

            ops.url = ops.url || `${window.location.href.split('?')[0]}?${ops.param}=` //'javascript:;'

            _this.update()

            $this._.on(Event.CLICK, 'a', function(e) {
                e.stopPropagation()
                e.preventDefault()

                ops.page = parseInt(this._.data('page'))
                _this.update()
                return false
            });
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
                data = new Page(this, _config)
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
        Page._interface.call(item , item._.data())
    })

    $.add(NAME, Page._interface)

    return Page

})(Bliss, Bliss.$)

export default Page
