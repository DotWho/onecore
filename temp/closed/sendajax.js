/**
 * sendajax插件
 * @param String type 请求方式('POST' 或 'GET')， 默认'GET'
 * @param Boolean async 默认: true 异步请求。false:同步请求将锁住浏览器，用户其它操作必须等待请求完成才可以执行
 * @param Boolean cache 默认值: true dataType 为 script 和 jsonp 时默认为 false。设置为 false 将不缓存此页面。
 * @param Boolean global 默认值: true  是否触发全局 AJAX 事件。设置为 false 将不会触发全局 AJAX 事件
 * @param Object data 发送到服务器的数据，数组存储，如：{'date': new Date().getTime(), 'state': 1}
 * @param String url 默认值: 当前页地址。发送请求的地址。
 * @param String dataType 预期服务器返回的数据类型，常用的如：xml、html、json、text | jsonp 跨域
 * @param String processData 不要处理发送的数据
 * @param String contentType 不要设置Content-Type请求头
 * @param Function success 当请求之后调用。传入返回后的数据，以及包含成功代码的字符串。
 * @param Function error 在请求出错时调用。传入 XMLHttpRequest 对象，描述错误类型的字符串以及一个异常对象（如果有的话）
 * @param Function complete 当请求完成之后调用这个函数，无论成功或失败。传入 XMLHttpRequest 对象，以及一个包含成功或错误代码的字符串。
 * @param Function done 最终执行函数，对html数据进行筛选
 * @param Boolean replaceURL 默认：false 只在dataType为html时起作用 替换url地址
 * @param Object target 默认：空 只在dataType为html时起作用 请求要填充数据的id或者class名称
 * @returns success & error
 * @author Dr.Who
 * @editTime 2016-05-18
 * @use $.fn.sendajax()
 */

+ (function (factory) {
    'use strict';
    // Register as an AMD module, compatible with script loaders like RequireJS.
    if (typeof define === 'function' && define.amd) {
        define(['jquery'], factory);
    } else {
        factory(jQuery);
    }
}(function ($) {
    'use strict';

    var Sendajax = function (el, options) {
        this.$el = $(el);
        this.options = $.extend({}, Sendajax.DEFAULTS, options);
    };

    Sendajax.VERSION = '1.0.0';

    Sendajax.DEFAULTS = {
        type: 'POST',
        async: true,
        cache: true,
        global: true,
        data: null,
        url: '',
        dataType: 'json',
        processData: true,
        success: function (data, text, xhr) {},
        error: function (xhr, text, e) {
            $.fn.msgbox({
                text: '\u7F51\u7EDC\u8FDE\u63A5\u9519\u8BEF,\u8BF7\u91CD\u65B0\u53D1\u5E03.' //网络连接错误,请重新发布.
            });
        },
        complete: function (xhr, text) {},
        replaceURL: false,
        target: 'body'
    };

    Sendajax.prototype.init = function () {
        this.options.url = this.options.url || this.$el.attr('href');

        if (this.options.dataType === 'html') {
            this.options.type = 'GET';
            //this.options.replaceURL = true;
        }

        this.process();
    };

    Sendajax.prototype.process = function () {
        var $this = this.$el,
            ops = this.options;

        $.ajax({
            type: ops.type,
            async: ops.async,
            cache: ops.cache,
            global: ops.global,
            data: ops.data,
            url: ops.url,
            dataType: ops.dataType,
            processData: ops.processData,
            beforeSend: function (xhr) {
                if (ops.dataType === 'html') {
                    xhr && xhr.setRequestHeader('OneCoreAXJ', true);
                    if ($('#loadingbar').length === 0) {
                        $('body').append('<div id="loadingbar"></div>');
                        $('#loadingbar').addClass('waiting').append($('<dt/><dd/>')).width((50 + Math.random() * 30) + '%');
                    }
                } else {
                    $this.addClass('ajax');
                }
            },
            success: function (data, text, xhr) {
                ops.success(data, text, xhr);
            },
            error: function (xhr, text, e) {
                if (ops.dataType === 'html') {
                    location.href = ops.url;
                } else {
                    ops.error(xhr, text, e);
                }
            },
            complete: function (xhr, text) {
                ops.complete(xhr, text);
            }
        }).always(function () {
            if (ops.dataType === 'html') {
                $('#loadingbar').width('101%').delay(200).fadeOut(400, function () {
                    $(this).remove();
                });
            } else {
                $this.addClass('done').delay(500).queue(function () {
                    $(this).removeClass('ajax').removeClass('done').dequeue();
                });
            }
        }).done(function (data) {
            if (ops.dataType === 'html' && data !== '') {
                try {
                    data = JSON.parse(data);
                    if (data.info !== undefined) {
                        $.fn.msgbox({
                            text: '404'
                        });
                    }
                } catch (e) {
                    if (history.replaceState && ops.replaceURL) {
                        history.pushState({
                            url: window.location.href
                        }, document.title, window.location.href);
                        history.pushState({
                            url: ops.url
                        }, document.title, ops.url);
                    }
                    if (ops.done) {
                        ops.done(data);
                    } else {
                        $(ops.target).html(data);
                    }
                }
            }
        });
    };

    function Plugin(option) {
        var data = new Sendajax(this, option);
        data.init();
    }

    $.fn.sendajax = Plugin;

}));
