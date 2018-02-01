+ function ($) {
    "use strict";
    var initPX,
        initPY,
        movePX,
        movePY,
        startTouch,
        mousedown,
        tempw = 0,
        temph = 0,
        lastW = 0,
        lastH = 0,
        lastX = 0,
        lastY = 0,
        movevalX = 0,
        movevalY = 0,
        imgw, //图片宽度
        imgh, //图片高度
        imgData, //图片数据
        imgType, //图片类型
        tempImg, 
        imgRot = 0; //图片旋转角度
    
    var startTouch1,
        mousedown1,
        lock = true;

    var privates = {
            show: function ($opts) {
                var $shot = $("<div class=\"screenshot showbox\"><a href=\"javascript:;\" class=\"btn btn-upimg shotlabel upimg\">上传图片</a><a href=\"javascript:;\" class=\"btn shotlabel btn-stcal otcak\">取消</a><div class=\"shot-img\"><div id=\"overlay\"><div class=\"overlay-t\"></div><span id=\"overscale\"></span></div><canvas id=\"canshot\"></canvas><input type=\"file\" id=\"shotfile\" class=\"hide\"></div><div class=\"shot-over\"><div class=\"col-lg-3\"><img id=\"shotimg\"></div><div class=\"col-lg-3\"><a href=\"javascript:;\" class=\"btn btn-shotlock lock\">锁定横纵比</a><a href=\"javascript:;\" class=\"btn btn-upimg\">重传图片</a></div><div class=\"col-lg-3\"><a href=\"javascript:;\" class=\"btn btn-antiwise\">逆时针</a><a href=\"javascript:;\" class=\"btn btn-wise\">顺时针</a></div><div class=\"col-lg-3\"><a href=\"javascript:;\" class=\"btn btn-shot\">确定</a><a href=\"javascript:;\" class=\"btn btn-stcal\">取消</a></div></div></div>");
                $("body").append($shot);
                $("body").addClass("overlay-layer");
                privates.event($opts, $shot);
            },
            destroy: function (img) {
                var canvas = img.canvas;
                img.onload = null;

                if (canvas) {
                    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
                    canvas.width = canvas.height = 0;
                    this._canvas = null;
                }

                // 释放内存。非常重要，否则释放不了image的内存。
                img.src = "";
                img = null;
            },
            event: function ($opts, $shot) {
                var canvas = document.getElementById("canshot"),
                    ctx = canvas.getContext("2d"),
                    _img = new Image(),
                    tmpcan = document.createElement("canvas"),
                    tmpctx = tmpcan.getContext("2d"),
                    tmpimg = new Image(),
                    $overlay = $("#overlay"),
                    $canshot = $("#canshot"),
                    $overscale = $("#overscale"),
                    $shotimg = $(".shot-img");
                
                //显示大小
                function bytesToSize(bytes) {
                    var sizes = ['Bytes', 'KB', 'MB'];
                    if (bytes == 0) return 'n/a';
                    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
                    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
                };

                //缩小图片
                function scaleImg() {
                    _img.src = imgData;
                    
                    var screenW = $(window).outerWidth(),
                        screenH = $(window).height();
                    
                    var width = _img.width,
                        height = _img.height,
                        scale = width / height;

                    if (scale >= 1) {
                        scale = height / width;
                    }
                    
                    if(scale === 1){
                        scale = 0.8;
                    }

                    while (width > screenW || height > screenH) {
                        width = parseInt(width * scale);
                        height = parseInt(height * scale);
                    }

                    canvas.width = width;
                    canvas.height = height;
                    
                    ctx.drawImage(_img, 0, 0, width, height);

                    tempImg = canvas.toDataURL(imgType);
                    
                    imgw = width;
                    imgh = height;
                    tempw = width;
                    temph = height;

                    $shotimg.css({
                        "width": canvas.width + 6,
                        "height": canvas.height + 6
                    });

                    cutImg();

                    $overlay.on("mousedown touchstart", page_touchstart);
                    $overscale.on("mousedown touchstart", page_touchstart2);
                    
                }

                //剪切覆盖区
                function cutImg() {
                    tmpimg.src = tempImg;
                    var left = $overlay.offset().left - $shotimg.offset().left - ($canshot.offset().left - $shotimg.offset().left),
                        top = $overlay.offset().top - $shotimg.offset().top - ($canshot.offset().top - $shotimg.offset().top),
                        width = $overlay.width(),
                        height = $overlay.height();

                    tmpcan.width = width;
                    tmpcan.height = height;

                    tmpctx.drawImage(tmpimg, left, top, width, height, 0, 0, width, height);
                    $("#shotimg").attr("src", tmpcan.toDataURL(imgType));
                    privates.destroy(tmpimg);
                }

                //旋转图片
                function rotate() {
                    lastX = 0;
                    lastY = 0;
                    $overlay.removeAttr("style");
                    _img.src = imgData;

                    //角度转为弧度
                    if (!imgRot) {
                        imgRot = 0;
                    }

                    var rotation = Math.PI * imgRot / 180,
                        c = Math.round(Math.cos(rotation) * 1000) / 1000,
                        s = Math.round(Math.sin(rotation) * 1000) / 1000;

                    //旋转后canvas标签的大小
                    canvas.height = Math.abs(c * imgh) + Math.abs(s * imgw);
                    canvas.width = Math.abs(c * imgw) + Math.abs(s * imgh);

                    //改变中心点
                    if (rotation <= Math.PI / 2) {
                        ctx.translate(s * imgh, 0);
                    } else if (rotation <= Math.PI) {
                        ctx.translate(canvas.width, -c * imgh);
                    } else if (rotation <= 1.5 * Math.PI) {
                        ctx.translate(-c * imgw, canvas.height);
                    } else {
                        ctx.translate(0, -s * imgw);
                    }

                    //旋转90°
                    ctx.rotate(rotation);

                    //绘制
                    ctx.drawImage(_img, 0, 0, imgw, imgh);

                    tempw = canvas.width;
                    temph = canvas.height;

                    $shotimg.css({
                        "width": canvas.width + 6,
                        "height": canvas.height + 6
                    });
                    
                    tempImg = canvas.toDataURL(imgType);
                    cutImg();
                }

                //触摸开始-overlay框位置
                function page_touchstart(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    startTouch = true;
                    "touchstart" === e.type ? initPX = window.event.touches[0].pageX : (initPX = e.x || e.pageX, mousedown = true);
                    "touchstart" === e.type ? initPY = window.event.touches[0].pageY : (initPY = e.y || e.pageY, mousedown = true);
                    $overscale.unbind();
                    $("body").on("mousemove touchmove", $overlay, page_touchmove);
                    $("body").on("mouseup touchend", $overlay, page_touchend);
                };

                //触摸移动-overlay框位置
                function page_touchmove(e) {
                    e.preventDefault();
                    e.stopPropagation();

                    if (startTouch) {
                        //判断是否开始或者在移动中获取值
                        "touchmove" === e.type ? movePX = window.event.touches[0].pageX : mousedown && (movePX = e.x || e.pageX);
                        "touchmove" === e.type ? movePY = window.event.touches[0].pageY : mousedown && (movePY = e.y || e.pageY);
                        movevalX = (movePX - initPX) * 2 + lastX;
                        movevalY = (movePY - initPY) * 2 + lastY;

                        var cansW = $canshot.outerWidth() - $overlay.outerWidth(),
                            cansH = $canshot.outerHeight() - $overlay.outerHeight();

                        if (movevalX < -cansW) {
                            movevalX = -cansW;
                        } else if (movevalX > cansW) {
                            movevalX = cansW;
                        }

                        if (movevalY < -cansH) {
                            movevalY = -cansH;
                        } else if (movevalY > cansH) {
                            movevalY = cansH;
                        }

                        $overlay.css({
                            "left": movevalX,
                            "top": movevalY
                        });
                    }
                };

                //触摸结束-overlay框位置
                function page_touchend(e) {
                    if (startTouch) {
                        /* 初始化值 */
                        startTouch = false; //是否成功移动
                        mousedown = false; //取消鼠标按下的控制值

                        lastX = movevalX;
                        lastY = movevalY;
                        
                        cutImg();
                        
                        $overscale.on("mousedown touchstart", page_touchstart2);
                        $overlay.unbind("mousemove touchmove mouseup touchend");
                    }
                };

                //触摸开始-overlay框大小
                function page_touchstart2(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    startTouch1 = true;
                    "touchstart" === e.type ? initPX = window.event.touches[0].pageX : (initPX = e.x || e.pageX, mousedown1 = true);
                    "touchstart" === e.type ? initPY = window.event.touches[0].pageY : (initPY = e.y || e.pageY, mousedown1 = true);
                    lastW = $overlay.outerWidth();
                    lastH = $overlay.outerHeight();
                    $overlay.unbind();
                    $("body").on("mousemove touchmove", $overscale, page_touchmove2);
                    $("body").on("mouseup touchend", $overscale, page_touchend2);
                };

                //触摸移动-overlay框大小
                function page_touchmove2(e) {
                    e.preventDefault();
                    e.stopPropagation();

                    if (startTouch1) {
                        //判断是否开始或者在移动中获取值
                        "touchmove" === e.type ? movePX = window.event.touches[0].pageX : mousedown1 && (movePX = e.x || e.pageX);
                        "touchmove" === e.type ? movePY = window.event.touches[0].pageY : mousedown1 && (movePY = e.y || e.pageY);
                        
                        if (lock) {
                            movevalX = movevalY = (movePX - initPX) * 2 + lastW;
                        }else{
                            movevalX = (movePX - initPX) * 2 + lastW;
                            movevalY = (movePY - initPY) * 2 + lastH;
                        }
                            
                        if (movevalX > tempw) {
                            movevalX = tempw;
                        } else if (32 > movevalX) {
                            movevalX = 32;
                        }

                        if (movevalY > temph) {
                            movevalY = temph;
                        } else if (32 > movevalY) {
                            movevalY = 32;
                        }
                        
                        if (lock) {
                            if(movevalX === tempw) {
                                movevalY = movevalX;
                            }
                            if(movevalY === temph) {
                                movevalX = movevalY;
                            }
                        }
                        
                        $overlay.css({
                            "width": movevalX,
                            "height": movevalY
                        });
                        
                    }
                };

                //触摸结束-overlay框大小
                function page_touchend2(e) {
                    if (startTouch1) {
                        /* 初始化值 */
                        startTouch1 = false; //是否成功移动
                        mousedown1 = false; //取消鼠标按下的控制值

                        lastW = movevalX;
                        lastH = movevalY;
                        
                        cutImg();
                        
                        $overlay.on("mousedown touchstart", page_touchstart);
                        
                        $overscale.unbind("mousemove touchmove mouseup touchend");
                    }
                };

                $shot.on("change", "#shotfile", function () {
                    var file = this.files[0],
                        reader = new FileReader();
                    imgType = this.files[0].type;
//                    var sResultFileSize = bytesToSize(this.files[0].size);
//                    console.log(sResultFileSize);
                    
                    reader.onload = function () {
                        imgData = this.result;
                        $overlay.removeAttr("style");
                        $shot.find(".shot-img").show();
                        $shot.find(".shot-over").show();
                        $shot.find(".shotlabel").hide();
                        scaleImg();
                    }
                    reader.onerror = function () {
                        alert("error");
                    }
                    reader.readAsDataURL(file);
                });

                $shot.on("click", ".btn-antiwise", function () {
                    imgRot -= 90;
                    if (imgRot === -90) {
                        imgRot = 270;
                    }
                    rotate();
                });

                $shot.on("click", ".btn-wise", function () {
                    imgRot += 90;
                    if (imgRot === 360) {
                        imgRot = 0;
                    }
                    rotate();
                });

                $shot.on("click", ".btn-upimg", function () {
                    $("#shotfile").trigger("click");
                });

                $shot.on("click", ".btn-shot", function () {
                    $("#"+$opts.objid+"").val($("#shotimg").attr("src"));
                    $("body").removeClass("overlay-layer");
                    $shot.addClass("hidbox");
                });

                $shot.on("click", ".btn-stcal", function () {
                    $("body").removeClass("overlay-layer");
                    $shot.addClass("hidbox");
                });

                $shot.on("click", ".btn-shotlock", function () {
                    $(this).toggleClass("lock");
                    $overlay.css({
                        "width": $overlay.outerWidth(),
                        "height": $overlay.outerWidth()
                    });
                    if ($(this).hasClass("lock")) {
                        lock = true;
                    }else{
                        lock = false;
                    }
                });
            }
        },
        methods = {
            init: function (options) {
                return $.each($(this), function () {
                    var $opts = $.extend({
                        max: "",
                        objid: null
                    }, options);
                    lastW = 0;
                    lastH = 0;
                    lastX = 0;
                    lastY = 0;
                    imgRot = 0;
                    startTouch = false;
                    mousedown = false;
                    $(".screenshot").remove();
                    privates.show($opts);
                });
            }
        };

    $.fn.screenshot = function (method) {
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === "object" || !method) {
            return methods.init.apply(this, arguments);
        } else {
            $.error("Method" + method + "does not exist");
        }
    };
}(jQuery);

//zoomIn: function (){
//    this.ratio*=1.1;
//    setBackground();
//},
//zoomOut: function (){
//    this.ratio*=0.9;
//    setBackground();
//}
//setBackground = function(){
//    var w =  parseInt(obj.image.width)*obj.ratio;
//    var h =  parseInt(obj.image.height)*obj.ratio;
//}