+(function (factory) {
	'use strict';
	// Register as an AMD module, compatible with script loaders like RequireJS.
	if (typeof define === 'function' && define.amd) {
		define(['jquery'], factory);
	}
	else {
		factory(jQuery);
	}
}(function ($) {
    'use strict';

    var scrolllist = new Array([]);

    var Anchor = function (el, options) {
		this.$el = $(el);
        this.options = $.extend({}, options);
    };

    Anchor.VERSION  = '1.0.0';

	Anchor.DEFAULTS = {
        list_a: null
    };

    Anchor.prototype.init = function () {
        var _this = this;

		function doAnchor() {
			var id = $(this).attr('data-anchor'),
				top = 0;
			if(document.getElementById(id)){
				top = document.getElementById(id).offsetTop;
			}
            scrolllist.push({
                id: id,
                top: top
            });
		}

        $.each($('[data-anchor]'), doAnchor);

        scrolllist.push({
            id: null,
            top: document.body.scrollHeight
        });

        $('[data-anchor]').click(function () {
        	var $this = $(this);
			$(document).off('scroll.oc.anchor');
			var anchorId = $this.attr('data-anchor');
            if(anchorId){
                $('html,body').animate({scrollTop: $('#'+anchorId).offset().top}, 300, function(){
                    _this.setting();
                    $(document).on('scroll.oc.anchor', function(){
			            _this.setting();
			        });
                });
            }
        });

        this.event();
    };

    Anchor.prototype.setting = function () {
        var _this = this;
        function resetacd (id) {
            // var $this = $('[data-anchor="'+id+'"]'),
			// 	$a = $this.parents('div').prev(),
			// 	$div = $this.parents('div');
			// if($a.siblings($div) && $a.length === 1){
			// 	console.log(1);
			// 	//$this.click();
			// 	// _this.$el.find('div a').removeClass('hover');
			// 	// $this.addClass('hover');
			// }else{
			// 	console.log($this);
			// 	//$this.click();
			// 	//_this.$el.children('a').removeClass('active').next('div').stop().slideUp(200);
			// 	//$this.addClass('active').next('div').stop().slideDown(200);
			// }
			//console.log(id);
			var $this = $('[data-anchor="'+id+'"]');
			var $hide = $this.next('.adn-hide');
			if($hide.length > 0){
				_this.$el.find('.adn-hide').removeAttr('style');
				$this.addClass('active');
				$hide.css('height', $hide.data('height'));
			}else{
				var $a = $this.parent('.adn-hide');
				if($a.length > 0){
					_this.$el.find('.adn-hide a').removeClass('active');
					$this.addClass('active');
				}
			}
        }

        var scrTop = document.body.scrollTop || document.documentElement.scrollTop;
        //if(scrTop <= document.body.scrollHeight / 2){
            for(var i = 0; i < scrolllist.length - 1; i++){
                if(scrolllist[i].top <=  scrTop && scrTop < scrolllist[i+1].top){
                    resetacd(scrolllist[i].id);
                    break;
                }
            }
        // }else{
        //     for(var x = scrolllist.length - 1; x > 0; x--){
        //         if(scrolllist[x].top > scrTop && scrTop >= scrolllist[x-1].top){
        //             resetacd(scrolllist[x-1].id);
        //             break;
        //         }
        //     }
        // }
    };

    Anchor.prototype.event = function () {
        var _this = this;
		_this.options.list_a = _this.$el.find('a');
        _this.setting();
        $(document).on('scroll.oc.anchor', function(){
            _this.setting();
        });
    };

    function Plugin(option) {
		return this.each(function () {
            var $this = $(this),
                data = $this.data('oc.anchor'),
                options = typeof option == 'object' && option;
            if (!data) $this.data('oc.anchor', (data = new Anchor(this, options)));
			data.init();
        });
    }

    $.fn.anchor = Plugin;

}));
