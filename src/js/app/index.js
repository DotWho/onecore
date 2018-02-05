(function($, $$) {
    $('.hanm-menu').onclick = function() {
        this._.toggleClass('active');
        $('.container-main')._.toggleClass('active');
        $('#aside')._.toggleClass('active');
    };

    // msgbox
    $('body')._.on('click', '.showdigio', function() {
        if (this._.data('v') === 1) {
            $.fn.msgbox({
                title: '提示',
                text: '123'
            });
        } else {
            $.fn.msgbox({
                title: '提示',
                text: '你好',
                num: 2
            });
        }
    });

    $('.showdbol').onclick = function(event) {
        $.fn.msgbox({
            title: '提示',
            text: '123',
            num: 2,
            success: function() {
                $.fn.msgbox({
                    title: '提示',
                    text: '456',
                    num: 2,
                    success: function() {
                        $.fn.msgbox({
                            title: '提示',
                            text: '789',
                            num: 2
                        });
                    }
                });
            }
        });
    };

    function setLogin() {
        return $(`<div class="user">
        <form action="http://192.168.0.112:8080/" method="post" novalidate>
            <input type="text" data-type="number" placeholder="Number" name="login_number" class="fullwidth" value="100,000.00">
            <span class="errorstr">Number</span>
            <input type="text" placeholder="用户名" name="login_name" class="fullwidth" required>
            <span class="errorstr">用户名错误</span>
            <input type="password" placeholder="密码" name="login_pwd" class="fullwidth" required>
            <span class="errorstr">密码长度错误或不能为空</span>
        </form>
        </div>`);
    }

    $('.showlogin').onclick = function(event) {
        let $login = setLogin();

        $.fn.msgbox({
            html: $login,
            w: 300,
            title: '用户登录',
            num: 2,
            textY: '登录',
            bind: function(btn, target) {
                btn._.validate({
                    target: target
                });
            }
        });
    };
    // //if iframe $('.ddd', window.parent.document)

    $('.conbcustome').onclick = function(event) {
        let $login = setLogin();
        $.fn.msgbox({
            html: $login,
            w: 300,
            title: '用户登录',
            custom: [
                {
                    text: '我没啥用',
                    class: 'btn t-red',
                    clickfn: function(event) {
                        console.log(event);
                    }
                },
                {
                    text: '点我提交',
                    class: 'btn t-green',
                    bind: function(btn, target) {
                        console.log(123);
                        // btn.validate({
                        //     target: target
                        // });
                    }
                },
                {
                    text: '点我关闭',
                    class: 'btn t-blue'
                }
            ]
        });
    };

    $('.conbajax').onclick = function(event) {
        $.fn.msgbox({
            url: 'http://www.baidu.com',
            success: function(data) {
                console.log(data);
            },
            error: function(errorstr) {
                return errorstr.statusText;
            },
            w: 300
        });
    };

    // toast
    $('body')._.on('click', '.notics', function() {
        let data = this._.data('v');

        if(!data){
            data = ''
        }

        $.fn.toast({
            text: '这是一条提示消息',
            type: data
        });
    });

    let $aside = $('#aside');
    let $btn = $aside._.find('button');

    $btn._.bind('click', function() {
        let anchor = this._.data('anchor');
        let top = document.getElementById(anchor).offsetTop - 20;

        document.documentElement.scrollTop = top;
        $btn._.removeClass('hover');
        this._.addClass('hover');
    });

    $('.gototop')._.bind('click', function() {
        document.documentElement.scrollTop = 0;
    });

    $('.gotobtm')._.bind('click', function() {
        document.documentElement.scrollTop = 999999;
    });

    // select
    const sle = $('#selmore')

    $('.setnull').onclick = function() {
        sle.innerHTML = ''
        sle.options[0] = new Option('请选择...', '')
        sle.options[1] = new Option('1111111', '1')
        sle._.select('update');
    };

    $('.addoption').onclick = function() {
        sle.options[sle.options.length] = new Option('选项6', '6')
        sle.value = 6;
        sle._.select('update');
    };

    // validate
    $('#btn-test')._.validate({
        success: function(data) {
            console.log(data);
            console.log('success');
        },
        error: function() {
            console.log('error');
        }
    });

    // datepicker
    $('.firsttime')._.datepicker({
        type: 'month',
        min: 'today',
        func: function(time) {
            $('.sendtime').value = '';
            $('.sendtime')._.datepicker({
                type: 'month',
                min: time + '-01'
            });
        }
    });

    // grade
    $.ready().then(function() {
        function selectStars(el, length) {
            el._.children('span')._.removeClass('hover');
            for (let i = 0; i < length; i++) {
                el._.find('span')[i]._.addClass('hover');
            }
        }
        let spanlist = $$('.grade');
        spanlist._.on('mouseover', 'span', function() {
            let $el = this._.parent();
            selectStars($el, this._.index());
        });
        spanlist._.on('mouseout', 'span', function() {
            let $el = this._.parent();
            let $value = $el._.children('input').value;

            $value === ''
                ? $el._.children('span')._.removeClass('hover')
                : selectStars($el, $value);
        });
        spanlist._.on('click', 'span', function() {
            let $el = this._.parent();
            $el._.children('input').value = this._.data('grade');
        });
    });

    // tags
    $.ready().then(function() {
        let tags = $$('.tags');
        tags._.on('click', '.tag', function() {
            this._.remove();
        });

        tags._.on('click', '.tag-add button', function() {
            let $father = this._.parent('.tags');
            let $tagput = $father._.find('.tag-add input');

            if ($tagput.value.length !== 0) {
                let tag = `<button class="btn tag">
                            <label>${$tagput.value}</label>
                            <input type="hidden" name="${$father._.data(
                                'name'
                            )}" value="${$tagput.value}">
                        </button>`;
                $father._.children('.tag-add')._.before(tag);
                $tagput.value = '';
            }
        });
    });

    $.ready().then(function() {
        toStrap();
    });

    const cusvali = $('#cusvali')
    cusvali['validate'] = function() {
        return new Promise(function(resolve, reject) {
            if(cusvali.value == 123){
                cusvali._.removeClass('error')
                resolve()
            } else {
                cusvali._.addClass('error')
                reject()
            }
        })
    }
    cusvali.onchange = function(){
        if(cusvali.value == 123){
            cusvali._.removeClass('error')
        } else {
            cusvali._.addClass('error')
        }
    }
})(Bliss, Bliss.$);
