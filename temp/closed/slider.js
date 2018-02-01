+(function (factory) {
    'use strict';
    // Register as an AMD module, compatible with script loaders like RequireJS.
    if (typeof define === 'function' && define.amd) {
        define(['jquery'], factory);
    } else {
        factory(jQuery);
    }
}(function ($) {
    'use strict';

    var Slider = function (el, options) {
        this.$el = $(el);
        this.options = $.extend({}, Slider.DEFAULTS, options);
    };

    Slider.VERSION = '1.0.0';

    Slider.DEFAULTS = {
        auto: true,
        drag: true,
        btms: true,
        showspeed: 5000,
        animspeed: 600
    };

    Slider.prototype.resize = function () {
        var _this = this,
            ops = _this.options;

        ops.index = 1;
        ops.comWidth = _this.list.children('div').width();

        if(ops.css3){
            _this.list.css({
                transform: 'translate3d(' + (-ops.comWidth) + 'px, 0, 0)',
                transition: '0ms'
            });
        }else{
            _this.list.css('left', -ops.comWidth);
        }
    };

    Slider.prototype.init = function () {
        var _this = this,
            ops = _this.options;

        function isSuportCss(style) {
            var prefix = ['webkit', 'Moz', 'ms', 'o'],
                i,
                humpString = [],
                htmlStyle = document.documentElement.style,
                _toHumb = function (string) {
                    return string.replace(/-(\w)/g, function ($0, $1) {
                        return $1.toUpperCase();
                    });
                };
            for (i in prefix) {
                humpString.push(_toHumb(prefix[i] + '-' + style));
                humpString.push(_toHumb(style));
            }
            for (i in humpString) {
                if (humpString[i] in htmlStyle) return true;
            }
            return false;
        }

        _this.list = _this.$el.children('.sliderlist');
        ops.num = _this.list.children('div').length;

        if (ops.num > 1) {
            if(isSuportCss('animation-play-state')){
                ops.css3 = true;
            }

            this.resize();

            _this.go = true;

            _this.list.append(_this.list.children('div').eq(0).clone());
            _this.list.prepend(_this.list.children('div').eq(ops.num - 1).clone());

            this.event();
        }
    };

    Slider.prototype.goDec = function (dec) {//true next, false prev
        var _this = this,
            ops = _this.options,
            $this = _this.$el;

        var doTranslate = function() {
            if(ops.css3){
                setTimeout(function () {
                    _this.go = true;
                }, ops.animspeed);

                _this.list.css({
                    transform: 'translate3d(' + (-ops.index * ops.comWidth) + 'px, 0, 0)',
                    transition: ops.animspeed + 'ms'
                });
            }else{
                _this.list.animate({'left': -ops.index * ops.comWidth}, ops.animspeed, function () {
                    _this.go = true;
                });
            }

            doDots();
        };

        function doDots() {
            var _index = ops.index - 1;
            if(ops.index === ops.num+1){
                _index = 0;
            }

            _this.$el.children('ol').children('li').removeClass('hover').eq(_index).addClass('hover');
        }

        if(dec){
            ++ops.index;
            if(ops.index === ops.num+1){
                if(ops.css3){
                    setTimeout(function () {
                        _this.list.css({
                            transform: 'translate3d('+ (-ops.comWidth) +'px, 0, 0)',
                            transition: '0ms'
                        });
                        _this.go = true;
                    }, ops.animspeed);

                    _this.list.css({
                        transform: 'translate3d(' + (-ops.index * ops.comWidth) + 'px, 0, 0)',
                        transition: ops.animspeed + 'ms'
                    });
                }else{
                    _this.list.css('left', 0).animate({'left': -ops.comWidth}, ops.animspeed, function () {
                        _this.go = true;
                    });
                }
                ops.index = 1;
                doDots();
            }else{
                doTranslate();
            }
        }else{
            --ops.index;
            if(ops.index === 0){
                if(ops.css3){
                    setTimeout(function () {
                        _this.list.css({
                            transform: 'translate3d(' + (-ops.num * ops.comWidth) + 'px, 0, 0)',
                            transition: '0ms'
                        });
                        _this.go = true;
                    }, ops.animspeed);

                    _this.list.css({
                        transform: 'translate3d(0, 0, 0)',
                        transition: ops.animspeed + 'ms'
                    });
                }else{
                    _this.list.css('left', -(ops.num+1) * ops.comWidth).animate({'left': -ops.num * ops.comWidth}, ops.animspeed, function () {
                        _this.go = true;
                    });
                }
                ops.index = ops.num;
                doDots();
            }else{
                doTranslate();
            }
        }
    };

    Slider.prototype.drag = function () {
        var _this = this,
            ops = _this.options;

        var bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

        var Draggable = (function() {
            function Draggable($container, callbacks) {
                this.touchend = bind(this.touchend, this);
                this.click = bind(this.click, this);
                this.moved = bind(this.moved, this);
                this.ended = bind(this.ended, this);
                this.began = bind(this.began, this);
                this.coordinate = bind(this.coordinate, this);
                this.off = bind(this.off, this);
                this.on = bind(this.on, this);
                this.toggle = bind(this.toggle, this);
                this.bind = bind(this.bind, this);
                this.$container = $container;
                this.callbacks = callbacks;
                this.toggle();
            }

            Draggable.prototype.bind = function(method) {
                if (method == null) {
                    method = 'on';
                }
                $(document)[method]('mousemove touchmove', this.moved);
                return $(document)[method]('mouseup touchcancel', this.ended);
            };

            Draggable.prototype.toggle = function(method) {
                if (method == null) {
                    method = 'on';
                }
                this.$container[method]('mousedown touchstart', this.began);
                this.$container[method]('touchend', this.touchend);
                return this.$container[method]('click', this.click);
            };

            Draggable.prototype.on = function() {
                return this.toggle('on');
            };

            Draggable.prototype.off = function() {
                return this.toggle('off');
            };

            Draggable.prototype.coordinate = function(event) {
                switch (event.type) {
                    case 'touchstart':
                    case 'touchmove':
                    case 'touchend':
                    case 'touchcancel':
                        return event.originalEvent.touches[0];
                    default:
                        return event;
                }
            };

            Draggable.prototype.began = function(event) {
                var ref;
                if (this.$target || !_this.go) {
                    return;
                }
                event.preventDefault();
                event.stopPropagation();
                this.bind('on');
                this.$target = this.$container;
                this.origin = {
                    x: this.coordinate(event).pageX
                };

                return (ref = this.callbacks) != null ? typeof ref.began === "function" ? ref.began(event) : void 0 : void 0;
            };

            Draggable.prototype.moved = function(event) {
                var ref;
                if (this.$target == null) {
                    return;
                }
                event.preventDefault();
                event.stopPropagation();
                this.moveP = this.coordinate(event).pageX - this.origin.x;
                if(ops.index === 0){
                    ops.index = ops.num;
                }else if(ops.index === ops.num+1){
                    ops.index = 1;
                }
                var moveGo = -ops.index * ops.comWidth + this.moveP;
                if(ops.css3){
                    this.$target.css({
                        transform: 'translate3d(' + moveGo + 'px, 0, 0)',
                        transition: '0ms'
                    });
                }else{
                    _this.list.css('left', moveGo);
                }
                this.dragged = this.$target;
                return (ref = this.callbacks) != null ? typeof ref.moved === "function" ? ref.moved(event) : void 0 : void 0;
            };

            Draggable.prototype.ended = function(event) {
                var ref;
                if (this.$target == null) {
                    return;
                }
                if (event.type !== 'touchend') {
                    event.preventDefault();
                    event.stopPropagation();
                }
                if(!this.moveP && event.type === 'touchend' && event.target.nodeName.toUpperCase() === 'A'){
                    window.open(event.target.href);
                }
                this.bind('off');
                delete this.$target;
                delete this.origin;

                if(this.moveP > 99){
                    _this.go = false;
                    _this.goDec(false);
                }else if(this.moveP < -99){
                    _this.go = false;
                    _this.goDec(true);
                }else{
                    if(this.moveP <= 99){
                        if(ops.css3){
                            _this.list.css({
                                transform: 'translate3d(' + (-ops.index * ops.comWidth) + 'px, 0, 0)',
                                transition: '300ms'
                            });
                        }else{
                            _this.list.stop().animate({
                                'left': -ops.index * ops.comWidth
                            }, 300);
                        }
                    }else{
                        if(ops.css3){
                            _this.list.css({
                                transform: 'translate3d(' + (-ops.index * ops.comWidth) + 'px, 0, 0)',
                                transition: '300ms'
                            });
                        }else{
                            _this.list.stop().animate({
                                'left': -ops.index * ops.comWidth
                            }, 300);
                        }
                    }
                }

                delete this.moveP;

                return (ref = this.callbacks) != null ? typeof ref.ended === "function" ? ref.ended(event) : void 0 : void 0;
            };

            Draggable.prototype.click = function(event) {
                if (!this.dragged) {
                    return;
                }
                event.preventDefault();
                event.stopPropagation();
                return delete this.dragged;
            };

            Draggable.prototype.touchend = function(event) {
                this.ended(event);
                return this.click(event);
            };

            return Draggable;

        })();

        if (this._draggable == null) {
            this._draggable = new Draggable(_this.list);
        }
    };

    Slider.prototype.setting = function () {
        var timer,
            _this = this,
            hidden = 'hidden';

        function onvchange(evt) {
            var v = 'visible', h = 'hidden',
                evtMap = {
                    focus: v, focusin: v, pageshow: v, blur: h, focusout: h, pagehide: h
                };

            evt = evt || window.event;
            if (evt.type in evtMap) {
                //console.log(evtMap[evt.type]);
            } else {
                if ((this[hidden] ? 'hidden' : 'visible') === 'hidden') {
                    clearInterval(timer);
                } else {
                    if (_this.options.auto) {
                        setInter();
                    }
                }
            }
        }

        function hdvis() {
            if (hidden in document) {
                document.addEventListener('visibilitychange', onvchange);
            } else if ((hidden = 'mozHidden') in document) {
                document.addEventListener('mozvisibilitychange', onvchange);
            } else if ((hidden = 'webkitHidden') in document) {
                document.addEventListener('webkitvisibilitychange', onvchange);
            } else if ((hidden = 'msHidden') in document) {
                document.addEventListener('msvisibilitychange', onvchange);
            } else if ('onfocusin' in document) {
                // IE 9 and lower
                document.onfocusin = document.onfocusout = onvchange;
            } else {
                // All others
                window.onpageshow = window.onpagehide = window.onfocus = window.onblur = onvchange;
            }
        }

        function setInter() {
            timer = setInterval(function () {
                _this.goDec(true);
            }, _this.options.showspeed);
        }

        _this.options.drag && _this.drag();

        if (_this.options.auto) {
            _this.$el.on("touchmove.oc.slider mouseenter.oc.slider", function () {
                clearInterval(timer);
            });
            _this.$el.on("touchend.oc.slider mouseleave.oc.slider", function () {
                clearInterval(timer);
                setInter();
            });
            setInter();
            hdvis();
        }
    };

    Slider.prototype.event = function () {
        var _this = this,
            ops = _this.options,
            $ol = $('<ol></ol>');

        for (var i = 0; i < ops.num; i++) {
            0 === i ? $ol.append('<li class="hover"></li>') : $ol.append('<li></li>');
        }
        _this.$el.append($ol);

        if(ops.btms){
            var $prev = $('<span class="s-prev">&nbsp;</span>'),
                $next = $('<span class="s-next">&nbsp;</span>');

            $prev.on('click.oc.slider.prev touchend.oc.slider.prev', function () {
                if(_this.go){
                    _this.go = false;
                    _this.goDec(false);
                }
            });

            $next.on('click.oc.slider.next touchend.oc.slider.next', function () {
                if(_this.go){
                    _this.go = false;
                    _this.goDec(true);
                }
            });

            _this.$el.append($prev, $next);
        }

        function liclick (e) {
            $ol.children('li').removeClass('hover');
            $(e.target).addClass('hover');
            ops.index = $(e.target).index() + 1;
            if(ops.css3){
                _this.list.css({
                    transform: 'translate3d(' + (-ops.index * ops.comWidth) + 'px, 0, 0)',
                    transition: ops.animspeed + 'ms'
                });
            }else{
                _this.list.stop().animate({'left': -ops.index * ops.comWidth}, ops.animspeed);
            }
        }

        $ol.on('click.oc.slider', 'li', liclick);

        $(window).resize(function () {
            _this.resize();
            $ol.children('li').removeClass('hover').eq(0).addClass('hover');
        });

        _this.setting();
    };

    function Plugin(option) {
        return this.each(function () {
            var $this = $(this),
                data = $this.data('oc.slider'),
                options = typeof option == 'object' && option;
            if (!data) $this.data('oc.slider', (data = new Slider(this, options)));
            data.init();
        });
    }

    $.fn.slider = Plugin;

    $.each($('.slider'), function () {
        $(this).slider({
            auto: $(this).data('auto'),
            drag: $(this).data('drag'),
            btms: $(this).data('btms'),
            showspeed: $(this).data('showspeed'),
            animspeed: $(this).data('animspeed')
        });
    });

}));
