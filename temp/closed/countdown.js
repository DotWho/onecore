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

    var CountDown = function (el, options) {
        this.$el = $(el);
        this.options = $.extend({}, CountDown.DEFAULTS, options);
    }

    CountDown.VERSION  = '1.0.0';

    CountDown.DEFAULTS = {
        start: null,
		end: null
    }

    CountDown.prototype.show = function () {
		var $hours = this.$el.find('.hours');
		var $minutes = this.$el.find('.minutes');
		var $seconds = this.$el.find('.seconds');

		var startTime = new Date();//服务器现在的时间
	    var day = startTime.getDate();
	    var month = startTime.getMonth() + 1;
	    var year = startTime.getFullYear();
	    var todayDate = year + '/' + month + '/' + day;
	    //console.log(todaydate);
	    var endTime = new Date(todayDate + ' 23:59:00');//结束的时间

		function countDown() {
	        startTime = Math.floor(startTime) + 100;
	        if(endTime - startTime > 0){
	            var hour = ('0' + Math.floor(((endTime - startTime) % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))).slice(-2);
	            var minute = ('0' + Math.floor(((endTime - startTime) % (24 * 60 * 60 * 1000)) / (60 * 1000)) % 60).slice(-2);
	            var second = ('0' + Math.floor(((endTime - startTime) % (24 * 60 * 60 * 1000)) / 1000) % 60 % 60).slice(-2);
	            //var millissecond = ('0' + Math.floor(((endTime - startTime) % (24 * 60 * 60 * 1000)) / 10) % 100).slice(-2);

	            $hours.html(hour);
	            $minutes.html(minute);
	            $seconds.html(second);
	        }else{
	            $hours.html('00');
	            $minutes.html('00');
	            $seconds.html('00');
	        }
	    };
		console.log(123);
		var setinter = setInterval(countDown, 100);
    }

    function Plugin(option) {
        return this.each(function () {
            var $this = $(this),
                data = $this.data('oc.countdown'),
                options = typeof option == 'object' && option;
            if (!data) $this.data('oc.countdown', (data = new CountDown(this, options)));
            data.show();
        });
    }

    $.fn.countdown = Plugin;

    $.each($('.rg-tims'), function(){
        $(this).countdown({
            start: $(this).data('start'),
			end: $(this).data('end')
        });
    });

}));
