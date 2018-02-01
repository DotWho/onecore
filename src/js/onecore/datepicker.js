// 现在
//ops.year
//ops.month
//ops.day
// 缓存
//ops.tYear
//ops.tMonth
// 选择
//ops.sYear
//ops.sMonth
//ops.sDay
import Util from './util'

const Datepicker = (($, $$) => {
    // Constants
    const NAME = 'datepicker'
    const VERSION = '1.0.0'
    const DATA_KEY = 'oc.datepicker'

    const Event = {
        CLICK: Util.getEvent('click')
    }

    const Default = {
        format: 'yyyy-MM-dd',
        min: '',
        max: '',
        content: ''
    }

    const DefaultType = {
        format: 'string',
        min: '(number|string)',
        max: '(number|string)',
        content: 'string'
    }

    const ClassName = {
        BODY: 'body',
        ACTIVE: 'active',
        HIDE: 'hidbox',
        OVERLAY: 'overlay-layer',
        WEEK: '.oc-calendar-week',
        MONTH: '.oc-calendar-monthday',
        ACT: '.oc-calendar-actions',
        HOUR: '.hour',
        MINS: '.mins',
        SEDS: '.seds',
        HINP: '.hourput',
        MINP: '.minsput',
        SINP: '.sedsput',
        DTPK: '.datepicker'
    }

    const Selector = {
        DATA_TOGGLE: '[data-toggle="datepicker"]'
    }

    // Class Definition
    class Datepicker {

        constructor(element, config) {
            this.$el = element
            this.$input = this.$el._.children('input')
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

        // private
        _getConfig(config) {
            config = $.extends({}, Default, config)
            Util.typeCheckConfig(NAME, config, DefaultType)
            return config
        }

        _event() {
            const _this = this,
                $this = _this.$el,
                $input = _this.$input

            let ops = _this._config,
                ones = true

            if(ops.type){
                _this._years()
            }else{
                _this._days()
            }

            // ops.btn._.off(Event.CLICK)
            ops.btn._.bind(Event.CLICK, function (e) {
                e.stopPropagation()
                e.preventDefault()

                if(ones){
                    ones = false
                    // if(window.screen.width > 480){
                    // 	ops.content.css({
                    // 		left: $this[0].offsetLeft,
                    // 		top: $this[0].offsetTop + $this.outerHeight()
                    // 	})
                    // }
                    if(window.screen.width <= 480){
                        $(ClassName.BODY)._.addClass(ClassName.OVERLAY)
                    }
                    $this._.append(ops.content)
                }

                if($this._.hasClass(ClassName.ACTIVE)){
                    if(window.screen.width <= 480){
                        $(ClassName.BODY)._.addClass(ClassName.OVERLAY)
                    }
                    $this._.removeClass(ClassName.ACTIVE)
                    ops.content._.addClass(ClassName.HIDE)
                } else {
                    $$(ClassName.DTPK)._.removeClass(ClassName.ACTIVE)._.find('.oc-calendar')._.addClass(ClassName.HIDE)
                    $this._.addClass(ClassName.ACTIVE)
                    ops.content._.removeClass(ClassName.HIDE)
                }
            })

            ops.content._.find('.oc-calendar-clear')._.bind(Event.CLICK, function(e){
                e.stopPropagation()
                e.preventDefault()

                ops.btn.innerHTML = '&nbsp;'
                $input.value = ''
            })

            ops.content._.find('.oc-calendar-close')._.bind(Event.CLICK, function(e){
                e.stopPropagation()
                e.preventDefault()

                _this.$el._.removeClass(ClassName.ACTIVE)
                ops.content._.addClass(ClassName.HIDE)
                if(window.screen.width <= 480){
                    $(ClassName.BODY)._.removeClass(ClassName.OVERLAY)
                }
            })

            ops.content._.find('.oc-calendar-today')._.bind(Event.CLICK, function(e){
                e.stopPropagation()
                e.preventDefault()

                const today = new Date()
                ops.tYear = today.getFullYear()
                ops.tMonth = today.getMonth()+1
                ops.tDay = today.getDate()
                // if(!ops.content.find(ClassName.MONTH)
                // .find('div').eq(1)
                // .find('[data-n='+ops.tDay+']').hasClass('none')){
                // 	ops.pickTime = _this._times(today)
                // 	$input.val(_this.timeFormat(ops.pickTime))
                // }
                _this._days()
            })
        }

        _timex() {
            const _this = this
            let ops = _this._config
            let $time = ops.content._.find('.oc-calendar-time')

            _this._toolbar('timex')
            ops.content._.find(ClassName.WEEK).style.display = 'none'
            ops.content._.find(ClassName.MONTH).style.display = 'none'
            ops.content._.find(ClassName.ACT).style.display = 'none'

            if(!$time){
                $time = $(`<div class="oc-calendar-time">
                    <div class="sfmdiv">
                        <div class="hour"></div>
                        <div class="mins"></div>
                        <div class="seds"></div>
                    </div>
                    <div class="seltime clearfix">
                        <input type="number" class="hourput" min="0" max="23" value="${ops.tH}">
                        <span>:</span>
                        <input type="number" class="minsput" min="0" max="59" value="${ops.tM}">
                        <span>:</span>
                        <input type="number" class="sedsput" min="0" max="59" value="${ops.tS}">
                        <button type="button" class="btn timeck">确定</button>
                    </div>
                </div>`)

                ops.content._.append($time)

                for (var i = 0; i < 24; i++) {
                    var x = i
                    if(x.toString().length === 1){
                        x = '0' + i
                    }
                    $time._.find(ClassName.HOUR)._.append(`<span data-tm="${x}">${x}时</span>`)
                }

                for (var g = 0; g < 60; g++) {
                    var n = g
                    if(n.toString().length === 1){
                        n = '0' + g
                    }
                    $time._.find(ClassName.MINS)._.append(`<span data-tm="${n}">${n}分</span>`)
                    $time._.find(ClassName.SEDS)._.append(`<span data-tm="${n}">${n}秒</span>`)
                }

                if(typeof ops.time === 'number'){
                    ops.time = parseInt(ops.time)
                }else{
                    ops.time = 3
                }

                var hourTop = 0
                if(ops.time > 0){
                    $time._.find(ClassName.HOUR)._.bind('mousewheel DOMMouseScroll', function(e){
                        e.preventDefault()
                        var value = e.wheelDelta || -e.detail
                        var delta = Math.max(-1, Math.min(1, value))
                        //e.originalEvent.wheelDelta => 120(up) or -120(down) 谷歌IE内核
                        //e.originalEvent.detail => -3(up) or 3(down) 火狐内核
                        if(delta > 0){
                            hourTop -= 36
                            if(hourTop < 0){
                                hourTop = 0
                            }
                            $time._.find(ClassName.HOUR).scrollTop = hourTop
                        }else{
                            var h = ($time._.find(ClassName.HOUR)._.children('span').length-1) * 36
                            hourTop += 36
                            if(hourTop > h){
                                hourTop = h
                            }
                            $time._.find(ClassName.HOUR).scrollTop = hourTop
                        }
                        $time._.find(ClassName.HOUR)._.children('span')._.removeClass(ClassName.ACTIVE)
                        var $act = $time._.find(ClassName.HOUR)._.children('span')[hourTop / 36]
                        $act._.addClass(ClassName.ACTIVE)
                        $time._.find(ClassName.HINP).value = $act._.data('tm')
                    })
                }else{
                    $time._.find(ClassName.HOUR)._.children('span').style.display = 'none'
                    $time._.find(ClassName.HINP)._.attr('disabled', true)
                }


                var minsTop = 0
                if(ops.time > 1){
                    $time._.find(ClassName.MINS)._.bind('mousewheel DOMMouseScroll', function(e){
                        e.preventDefault()
                        var value = e.wheelDelta || -e.detail
                        var delta = Math.max(-1, Math.min(1, value))
                        if(delta > 0){
                            minsTop -= 36
                            if(minsTop < 0){
                                minsTop = 0
                            }
                            $time._.find(ClassName.MINS).scrollTop = minsTop
                        }else{
                            var h = ($time._.find(ClassName.MINS)._.children('span').length-1) * 36
                            minsTop += 36
                            if(minsTop > h){
                                minsTop = h
                            }
                            $time._.find(ClassName.MINS).scrollTop = minsTop
                        }
                        $time._.find(ClassName.MINS)._.children('span')._.removeClass(ClassName.ACTIVE)
                        var $act = $time._.find(ClassName.MINS)._.children('span')[minsTop / 36]
                        $act._.addClass(ClassName.ACTIVE)
                        $time._.find(ClassName.MINP).value = $act._.data('tm')
                    })
                }else{
                    $time._.find(ClassName.MINS)._.children('span').style.display = 'none'
                    $time._.find(ClassName.MINP)._.attr('disabled', true)
                }


                var sedsTop = 0
                if(ops.time > 2){
                    $time._.find(ClassName.SEDS)._.bind('mousewheel DOMMouseScroll', function(e){
                        e.preventDefault()
                        var value = e.wheelDelta || -e.detail
                        var delta = Math.max(-1, Math.min(1, value))
                        if(delta > 0){
                            sedsTop -= 36
                            if(sedsTop < 0){
                                sedsTop = 0
                            }
                            $time._.find(ClassName.SEDS).scrollTop = sedsTop
                        }else{
                            var h = ($time._.find(ClassName.SEDS)._.children('span').length-1) * 36
                            sedsTop += 36
                            if(sedsTop > h){
                                sedsTop = h
                            }
                            $time._.find(ClassName.SEDS).scrollTop = sedsTop
                        }
                        $time._.find(ClassName.SEDS)._.children('span')._.removeClass(ClassName.ACTIVE)
                        var $act = $time._.find(ClassName.SEDS)._.children('span')[sedsTop / 36]
                        $act._.addClass(ClassName.ACTIVE)
                        $time._.find(ClassName.SINP).value = $act._.data('tm')
                    })
                }else{
                    $time._.find(ClassName.SEDS)._.children('span').style.display = 'none'
                    $time._.find(ClassName.SINP)._.attr('disabled', true)
                }

                //-----------------------------------------
                $time._.find(ClassName.HINP)._.bind('change', function(){
                    var v = this.value
                    if(v.length === 0){
                        v = 0
                    }
                    v = parseInt(v)
                    if(v < 0){
                        v = 0
                    }
                    if(v > 23){
                        v = 23
                    }
                    hourTop = v * 36
                    $time._.find(ClassName.HOUR).scrollTop = hourTop
                    $time._.find(ClassName.HOUR)._.children('span')[v]._.addClass(ClassName.ACTIVE)
                    if(v.toString().length === 1){
                        v = '0' + v
                    }
                    this.value = v
                })

                $time._.find(ClassName.MINP)._.bind('change', function(){
                    var v = this.value
                    if(v.length === 0){
                        v = 0
                    }
                    v = parseInt(v)
                    if(v < 0){
                        v = 0
                    }
                    if(v > 59){
                        v = 59
                    }
                    minsTop = v * 36
                    $time._.find(ClassName.MINS).scrollTop = minsTop
                    $time._.find(ClassName.MINS)._.children('span')[v]._.addClass(ClassName.ACTIVE)
                    if(v.toString().length === 1){
                        v = '0' + v
                    }
                    this.value = v
                })

                $time._.find(ClassName.SINP)._.bind('change', function(){
                    var v = this.value
                    if(v.length === 0){
                        v = 0
                    }
                    v = parseInt(v)
                    if(v < 0){
                        v = 0
                    }
                    if(v > 59){
                        v = 59
                    }
                    sedsTop = v * 36
                    $time._.find(ClassName.SEDS).scrollTop = sedsTop
                    $time._.find(ClassName.SEDS)._.children('span')[v]._.addClass(ClassName.ACTIVE)
                    if(v.toString().length === 1){
                        v = '0' + v
                    }
                    this.value = v
                })

                $time._.find(ClassName.HINP)._.fire('change')
                $time._.find(ClassName.MINP)._.fire('change')
                $time._.find(ClassName.SINP)._.fire('change')

                //----------------------------
                $time._.find('button').onclick = function(){
                    var h = $time._.find(ClassName.HINP).value
                    var m = $time._.find(ClassName.MINP).value
                    var s = $time._.find(ClassName.SINP).value
                    ops.pickTime = _this._times(new Date(ops.tYear, ops.tMonth-1, ops.tDay))
                    var _val = new Date(ops.tYear, ops.tMonth-1, ops.tDay,h,m,s).getTime()
                    ops.btn.textContent = _this._timeFormat(_val, ops.format + ' hh:mm:ss')
                    _this.$input.value = _this._timeFormat(_val, ops.format + ' hh:mm:ss')
                    ops.content._.addClass(ClassName.HIDE)
                    _this.$el._.removeClass(ClassName.ACTIVE)
                    if(window.screen.width <= 480){
                        $(ClassName.BODY)._.removeClass(ClassName.OVERLAY)
                    }
                }
            }else{
                $time.style.display = 'block'
            }
        }

        _days() {
            const _this = this
            let ops = _this._config

            _this._showDays()
            _this._toolbar('day')

            // 点击日
            ops.content._.on(Event.CLICK, '.day', function(e){
                e.stopPropagation()
                e.preventDefault()

                if(!this._.hasClass('none')){
                    ops.content._.find('.day')._.removeClass(ClassName.ACTIVE)
                    this._.addClass(ClassName.ACTIVE)
                    ops.tDay = this._.data('n')
                    ops.pickTime = _this._times(new Date(ops.tYear, ops.tMonth-1, ops.tDay))
                    if(ops.time){
                        _this._timex()
                    }else{
                        ops.btn.textContent = _this._timeFormat(ops.pickTime)
                        _this.$input.value = _this._timeFormat(ops.pickTime)
                        _this.$el._.removeClass(ClassName.ACTIVE)
                        ops.content._.addClass(ClassName.HIDE)
                        if(window.screen.width <= 480){
                            $(ClassName.BODY)._.removeClass(ClassName.OVERLAY)
                        }
                    }
                }
            })
        }

        _showDays() {
            const _this = this
            let ops = _this._config
            let $monthday = ops.content._.find(ClassName.MONTH)
            let $oldDiv
            let requFrame

            function nextGo(){
                if($oldDiv._.style('visibility') === 'hidden'){
                    cancelAnimationFrame(requFrame)
                    $oldDiv._.remove()
                }else{
                    requFrame = requestAnimationFrame(nextGo)
                }
            }
            ops.content._.find(ClassName.WEEK).style.display = 'block'
            $monthday.style.display = 'block'
            ops.content._.find(ClassName.ACT).style.display = 'block'

            var firstday = new Date(ops.tYear, ops.tMonth-1, 1, '', '', ''),
                lastday = new Date(ops.tYear, ops.tMonth, 0).getDate(),
                date = firstday.getDay(),
                $row = '<div><div class="oc-calendar-monthday-row">'

            for(var i = 1; i < 42; i++){
                if(i <= date || i > lastday + date){
                    $row += '<span class="oc-calendar-none">&nbsp;</span>'
                }else{
                    // today
                    var now = '',
                        xDate = i - date,
                        xTime = _this._times(new Date(ops.tYear, ops.tMonth-1, xDate))
                    if(xTime === ops.today){
                        now += ' today'
                    }
                    if (xTime === ops.pickTime) {
                        now += ' active'
                    }
                    if ((ops.max && xTime > ops.max) || (ops.min && xTime < ops.min)) {
                        now += ' none'
                    }
                    $row += `<button type="button" class="btn day${now}" data-n="${xDate}">${xDate}</button>`
                }
                if(i % 7 === 0 && i !== 0){
                    $row += '</div><div class="oc-calendar-monthday-row">'
                }
            }
            $row += '</div></div>'
            $row = $($row)

            $monthday._.append($row)

            if($monthday._.children('div').length > 0){
                $oldDiv = $monthday._.children('div')[0]
                if(ops.nx){
                    $row._.addClass('oc-calendarIn-next')
                    $oldDiv._.attr({'class': 'oc-calendarOut-next'})
                }else{
                    $row._.addClass('oc-calendarIn-prev')
                    $oldDiv._.attr({'class': 'oc-calendarOut-prev'})
                }
                requFrame = requestAnimationFrame(nextGo)
            }
        }

        _months() {
            const _this = this
            let ops = _this._config

            function setMonth(el) {
                var minYear,
                    maxYear,
                    minMonth,
                    pt = new Date(ops.pickTime)

                // maxMonth

                if(ops.year === ops.tYear){
                    el._.children()[ops.month-1]._.addClass('tonow')
                }else{
                    el._.children()._.removeClass('tonow')
                }

                if(ops.tYear === pt.getFullYear() && ops.tMonth === pt.getMonth()+1){
                    el._.children()[ops.sMonth-1]._.addClass(ClassName.ACTIVE)
                }else{
                    el._.children()._.removeClass(ClassName.ACTIVE)
                }

                if(ops.min || ops.max){
                    el._.children()._.removeClass('none')
                }

                if(ops.min){
                    minYear = new Date(ops.min).getFullYear()
                    minMonth = new Date(ops.min).getMonth()+1
                    if(ops.tYear === minYear){
                        for(var m = 0; m < minMonth-1; m++){
                            el._.children()[m]._.addClass('none')
                        }
                    }
                    if(ops.tYear < minYear){
                        el._.children()._.addClass('none')
                    }
                }

                if(ops.max){
                    maxYear = new Date(ops.max).getFullYear()
                    m = new Date(ops.max).getMonth()+1

                    if(ops.tYear === maxYear){
                        for(; m < 12; m++){
                            el._.children()[m]._.addClass('none')
                        }
                    }
                    if(ops.tYear > maxYear){
                        el._.children()._.addClass('none')
                    }
                }
            }

            if(!ops.content._.find('.oc-calendar-month')){
                var $months = $(`<div class="oc-calendar-month">
                    <button type="button" class="btn" data-month="1">一月</button>
                    <button type="button" class="btn" data-month="2">二月</button>
                    <button type="button" class="btn" data-month="3">三月</button>
                    <button type="button" class="btn" data-month="4">四月</button>
                    <button type="button" class="btn" data-month="5">五月</button>
                    <button type="button" class="btn" data-month="6">六月</button>
                    <button type="button" class="btn" data-month="7">七月</button>
                    <button type="button" class="btn" data-month="8">八月</button>
                    <button type="button" class="btn" data-month="9">九月</button>
                    <button type="button" class="btn" data-month="10">十月</button>
                    <button type="button" class="btn" data-month="11">十一月</button>
                    <button type="button" class="btn" data-month="12">十二月</button>
                </div>`)

                ops.content._.append($months)

                var _month = ops.content._.find('.oc-calendar-month')

                setMonth(_month)

                _month._.on(Event.CLICK, 'button', function(e){
                    e.stopPropagation()
                    e.preventDefault()

                    _month._.children('button')._.removeClass(ClassName.ACTIVE)
                    this._.addClass(ClassName.ACTIVE)
                    ops.tMonth = this._.data('month')
                    ops.sMonth = ops.tMonth
                    if(ops.type === 'month'){
                        ops.content._.addClass(ClassName.HIDE)
                        var pktime = ops.tYear + '/' + ops.sMonth + '/1'
                        ops.pickTime = _this._times(pktime)
                        var ym = _this._timeFormat(pktime, 'yyyy-MM')
                        ops.btn.textContent = ym
                        _this.$input.value = ym
                        if(ops.func){
                            ops.func(ym)
                        }
                        _this.$el._.removeClass(ClassName.ACTIVE)
                        if(window.screen.width <= 480){
                            $(ClassName.BODY)._.removeClass(ClassName.OVERLAY)
                        }
                    }else{
                        _this._toolbar('day')
                        _month.style.display = 'none'
                        _this._showDays()
                    }
                })
            }else{
                var _month = ops.content._.find('.oc-calendar-month')
                _month.style.display = 'block'
                setMonth(_month)
            }
            _this._toolbar('month')
        }

        _years() {
            const _this = this
            let ops = _this._config

            var minYear,
                maxYear

            if(ops.min){
                minYear = new Date(ops.min).getFullYear()
            }

            if(ops.max){
                maxYear = new Date(ops.max).getFullYear()
            }

            function setYear() {
                var $years = ops.content._.find('.oc-calendar-year')
                $years.style.display = 'block'
                $years.innerHTML = ''
                var y = ops.tYear - 6

                for(; y < (ops.tYear + 6); y++){
                    var $y = $('<button type="button" class="btn" data-year="'+y+'">'+y+'</button>')
                    if(ops.year === y) {
                        $y._.addClass('tonow')
                    }
                    if(ops.sYear === y) {
                        $y._.addClass(ClassName.ACTIVE)
                    }
                    if(minYear && minYear > y){
                        $y._.addClass('none')
                    }
                    if(maxYear && maxYear < y){
                        $y._.addClass('none')
                    }
                    $years._.append($y)
                }
            }

            if(!ops.content._.find('.oc-calendar-year')){
                var $years = $('<div class="oc-calendar-year"></div>')
                ops.content._.append($years)
                setYear()
                var _year= ops.content._.find('.oc-calendar-year')

                _year._.on(Event.CLICK, 'button', function(e){
                    e.stopPropagation()
                    e.preventDefault()

                    _year._.children('button')._.removeClass(ClassName.ACTIVE)
                    this._.addClass(ClassName.ACTIVE)
                    ops.tYear = parseInt(this._.data('year'))
                    ops.sYear = ops.tYear
                    if(ops.type === 'year'){
                        ops.content._.addClass(ClassName.HIDE)
                        ops.btn.textContent = ops.sYear
                        _this.$input.value = ops.sYear
                        _this.$el._.removeClass(ClassName.ACTIVE)
                        if(window.screen.width <= 480){
                            $(ClassName.BODY)._.removeClass(ClassName.OVERLAY)
                        }
                    }else{
                        _this._toolbar('month')
                        _year.style.display = 'none'
                        _this._months()
                    }
                })
            }else{
                setYear()
            }
            _this._toolbar('year')
        }

        _toolbar(type) {
            const _this = this
            let ops = _this._config
            let $oldBtn = null
            let $newBtn = null
            let firstin = false
            let requFrame

            function nextTitle(){
                if($oldBtn._.style('visibility') === 'hidden'){
                    cancelAnimationFrame(requFrame)
                    $oldBtn._.remove()
                    ops.content._.find('.toolbar-next')._.removeClass('disme')
                    ops.content._.find('.toolbar-prev')._.removeClass('disme')
                }else{
                    requFrame = requestAnimationFrame(nextTitle)
                }
            }

            function setTitle(type) {
                var title = '',
                    $title = ops.content._.find('.oc-calendar-toolbar-title')
                switch (type) {
                    case 'timex':
                        title = `${ops.tYear}/${ops.tMonth}/${ops.tDay}`
                        title = _this._timeFormat(title, 'yyyy年MM月dd日')
                        break
                    case 'day':
                        title = `${ops.tYear}/${ops.tMonth}/1`
                        title = _this._timeFormat(title, 'yyyy年MM月')
                        break
                    case 'month':
                        title = ops.tYear
                        break
                    case 'year':
                        title = `${ops.tYear - 6} - ${ops.tYear + 5}`
                        break
                }

                $title._.children('button')._.data('select', type)
                $title._.children('button').innerHTML = title

                if(firstin){
                    ops.content._.find('.toolbar-next')._.addClass('disme')
                    ops.content._.find('.toolbar-prev')._.addClass('disme')

                    $oldBtn = $title._.children('button')
                    $newBtn = $(`<button type="button" class="btn">${title}</button>`)
                    $newBtn._.data('select', type)

                    if(ops.nx){
                        $newBtn._.addClass('oc-calendarIn-next')
                        $oldBtn._.attr({'class': 'oc-calendarOut-next'})
                    }else{
                        $newBtn._.addClass('oc-calendarIn-prev')
                        $oldBtn._.attr({'class': 'oc-calendarOut-prev'})
                    }

                    $title._.append($newBtn)
                    requFrame = requestAnimationFrame(nextTitle)
                }

                firstin = true
            }

            if(ops.content._.find('.oc-calendar-toolbar-title')){
                setTitle(type)
            }else{
                var $toolbar = $(`<button type="button" class="btn toolbar-prev"></button>
                    <div class="oc-calendar-toolbar-title">
                        <button type="button" class="btn"></button>
                    </div>
                    <button type="button" class="btn toolbar-next">
                </button>`)

                var ttbar = ops.content._.find('.oc-calendar-toolbar')
                $toolbar.forEach(function (item, i) {
                    ttbar._.append(item)
                })
                setTitle(type)

                // 下个月
                ops.content._.on(Event.CLICK, '.toolbar-next', function(e){
                    e.stopPropagation()
                    e.preventDefault()

                    if(this._.hasClass('disme')){
                        return
                    }
                    var select = ops.content._.find('.oc-calendar-toolbar-title button')._.data('select')
                    ops.nx = true
                    var next = true

                    if(select === 'day'){
                        ops.tMonth++
                        if (ops.tMonth > 12) {
                            ops.tYear++
                            ops.tMonth = 1
                        }
                        _this._showDays()
                    }else if(select === 'month'){
                        ops.tYear++
                        _this._months()
                    }else if(select === 'year'){
                        ops.tYear += 11
                        _this._years()
                    }else{
                        var tt = _this._times(ops.pickTime)
                        tt += 24*60*60*1000
                        if(ops.max >= tt || !ops.max){
                            var timen = new Date(tt)
                            ops.tYear = timen.getFullYear()
                            ops.tMonth = timen.getMonth()+1
                            ops.tDay = timen.getDate()
                            ops.pickTime = _this._times(`${ops.tYear}/${ops.tMonth}/${ops.tDay}`)
                        }else{
                            next = false
                        }
                    }
                    if(next) {
                        setTitle(select)
                    }
                })

                // 上个月
                ops.content._.on('click', '.toolbar-prev', function(e){
                    e.stopPropagation()
                    e.preventDefault()

                    if(this._.hasClass('disme')){
                        return
                    }
                    var select = ops.content._.find('.oc-calendar-toolbar-title button')._.data('select')
                    ops.nx = false
                    var next = true

                    if(select === 'day'){
                        ops.tMonth--
                        if (ops.tMonth < 1) {
                            ops.tYear--
                            ops.tMonth = 12
                        }
                        _this._showDays()
                    }else if(select === 'month'){
                        ops.tYear--
                        _this._months()
                    }else if(select === 'year'){
                        ops.tYear -= 11
                        _this._years()
                    }else{
                        var tt = _this._times(ops.pickTime)
                        tt -= 24*60*60*1000
                        if(ops.min <= tt || !ops.min){
                            var timen = new Date(tt)
                            ops.tYear = timen.getFullYear()
                            ops.tMonth = timen.getMonth()+1
                            ops.tDay = timen.getDate()
                            ops.pickTime = _this._times(`${ops.tYear}/${ops.tMonth}/${ops.tDay}`)
                        }else{
                            next = false
                        }
                    }
                    if(next) setTitle(select)
                })

                // 转到月
                ops.content._.on('click', '.oc-calendar-toolbar-title button', function(e){
                    e.stopPropagation()
                    e.preventDefault()

                    var select = this._.data('select')
                    if(select === 'timex'){
                        ops.content._.find('.oc-calendar-time').style.display = 'none'
                        _this._days()
                    }else if(select === 'day'){
                        ops.content._.find(ClassName.WEEK).style.display = 'none'
                        ops.content._.find(ClassName.MONTH).style.display = 'none'
                        ops.content._.find(ClassName.ACT).style.display = 'none'
                        _this._months()
                    }else if (select === 'month') {
                        ops.content._.find(ClassName.WEEK).style.display = 'none'
                        ops.content._.find(ClassName.MONTH).style.display = 'none'
                        ops.content._.find(ClassName.ACT).style.display = 'none'
                        ops.content._.find('.oc-calendar-month').style.display = 'none'
                        _this._years()
                    }
                })
            }
        }

        _timeFormat(time, fmt) {
            if(!fmt){
                fmt = this._config.format
            }
            time = new Date(time)
            var o = {
                'M+': time.getMonth() + 1, //月
                'd+': time.getDate(), //日
                'h+': time.getHours(), // 小时
                'm+': time.getMinutes(), // 分
                's+': time.getSeconds() // 秒
            }
            if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (time.getFullYear() + '').substr(4 - RegExp.$1.length))
            for (var k in o)
                if (new RegExp('(' + k + ')').test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (('00' + o[k]).substr(('' + o[k]).length)))

            return fmt
        }

        _times(time, type, sfm) {
            function ieFactory (str) {
                str = str.replace(/[/.]/g, '-')
                str = str.split('-')
                return new Date(str[0], str[1] - 1, str[2], '', '', '')
            }

            function getTimes(time) {
                var temp = parseInt(time)
                if(temp.toString().length > 5){
                    time = new Date(parseInt(temp))
                }else{
                    time = new Date(time)
                }
                if(sfm){
                    time = new Date(time.getFullYear(), time.getMonth(), time.getDate(), time.getHours(), time.getMinutes(), time.getSeconds()).getTime()
                }else{
                    time = new Date(time.getFullYear(), time.getMonth(), time.getDate(), '', '', '').getTime()
                }

                return time
            }

            function replaceTime(time) {
                time = time.toString()
                .replace(/([^\u0000-\u00FF])/g, '/')
                .replace(/\./g, '/')
                .replace(/\-/g, '/')

                return time
            }

            time = replaceTime(time)

            if(time.substr(time.length-1, time.length) === '/'){
                time = time.substr(0, time.length-1)
            }

            if ('NaN' == new Date(time)) {
                time = ieFactory(time)
            }else{
                time = getTimes(time)
            }

            if(type){
                type = type.toString()
                if (type === 'year') {
                    time = new Date(time).getFullYear()
                }else if (type === 'month') {
                    time = new Date(time)
                    time = time.getFullYear() + '/' + time.getMonth()
                } else if (type.indexOf('+') === 0) {
                    type = Number(type.substr(1)) * 1000
                    time = time + (type*60*60*24)
                } else if (type.indexOf('-') === 0) {
                    type = Number(type.substr(1)) * 1000
                    time = time - (type*60*60*24)
                } else {
                    if (type !== 'today') {
                        type = replaceTime(type)
                        time = getTimes(type)
                    }
                }
            }

            return time
        }

        _init() {
            const _this = this
            const $this = _this.$el
            const $input = _this.$input
            let ops = _this._config
            let today

            $this._.addClass('datepicker')
            ops.btn = $('<button type="button" class="btn">&nbsp;</button>')
            $this._.append(ops.btn)

            // console.log(_this._times('2017年6月28日', 'year'))
            // console.log(_this._times('2017/06/28', 'month'))
            // console.log(_this._times('2017-06-28', '+100'))
            // console.log(_this._times('2017.06.28', '-100'))
            // console.log(_this._times('1498579200000'))

            today = new Date()

            ops.today = _this._times(today)
            ops.year = today.getFullYear()
            ops.month = today.getMonth()+1
            ops.day = today.getDate()

            if(ops.time){
                ops.tH = 0
                ops.tM = 0
                ops.tS = 0
            }

            ops.sYear = ops.year
            ops.sMonth = ops.month
            ops.sDay = ops.day

            if($input.value.length > 0){
                ops.btn.textContent = $input.value
                const selday = new Date($input.value)
                ops.pickTime = _this._times(selday, null, ops.time ? true : false)
                ops.tYear = selday.getFullYear()
                ops.tMonth = selday.getMonth()+1
                ops.tDay = selday.getDate()
                if(ops.time){
                    ops.tH = selday.getHours()
                    ops.tM = selday.getMinutes()
                    ops.tS = selday.getSeconds()
                }
            }else{
                ops.tYear = ops.year
                ops.tMonth = ops.month
                ops.tDay = ops.day
            }

            if (ops.min) {
                ops.min = _this._times(ops.today, ops.min)
                ops.tYear = new Date(ops.min).getFullYear()
                ops.tMonth = new Date(ops.min).getMonth()+1
            }
            if (ops.max) {
                ops.max = _this._times(ops.today, ops.max)
                if(!ops.min){
                    ops.tYear = new Date(ops.max).getFullYear()
                    ops.tMonth = new Date(ops.max).getMonth()+1
                }
            }

            ops.content = $(`<div class="oc-calendar showbox">
                    <div class="oc-calendar-toolbar"></div>
                    <div class="oc-calendar-week" style="display:none;">
                        <span>日</span>
                        <span>一</span>
                        <span>二</span>
                        <span>三</span>
                        <span>四</span>
                        <span>五</span>
                        <span>六</span>
                    </div>
                    <div class="oc-calendar-monthday" style="display:none;"></div>
                    <div class="oc-calendar-actions" style="display:none;">
                        <button type="button" class="btn oc-calendar-clear">清除</button>
                        <button type="button" class="btn oc-calendar-today">今日</button>
                        <button type="button" class="btn oc-calendar-close">关闭</button>
                    </div>
                </div>`)

            ops.content.onclick = function(e) {
                e.preventDefault()
                e.stopPropagation()
            }

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
                data = new Datepicker(this, _config)
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
        Datepicker._interface.call(item , item._.data())
    })

    document.addEventListener(Event.CLICK, function(e){
        let datels = $$(ClassName.DTPK)._
        datels.removeClass(ClassName.ACTIVE)
        datels.find('.oc-calendar')._.addClass(ClassName.HIDE)
        if(window.screen.width <= 480){
            $(ClassName.BODY)._.removeClass(ClassName.OVERLAY)
        }
    }, false);

    $.add(NAME, Datepicker._interface)

    return Datepicker

})(Bliss, Bliss.$)

export default Datepicker
