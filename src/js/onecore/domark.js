/**
 * DoMark
 * @param null
 * @returns null
 * @author Dr.Who
 * @editTime 2017-07-19
 */
var DoMark = function(el, options) {
    this.$el = $(el);
    this.options = $.extend({}, DoMark.DEFAULTS, options);
};

DoMark.VERSION = '1.0.0';

DoMark.DEFAULTS = {
    $canvas: null,
    paint: false,
    canvas: null,
    context: null,
    width: 0,
    height: 0,
    curColor: "#000",
    curTool: 'brush', // 笔刷
    size: 15, // 笔刷大小
    index: 0, // 当前图片下标
    withdrawn: null, //保存5步内的撤回数据
    nowbg: null, // 现在图片的 img object
    imglist: null,
    maps: null, //记录保存后的图片data，以便上传
    rotate: 0
};

DoMark.prototype.update = function() {
    var _this = this,
        $this = _this.$el,
        ops = _this.options;

    if (ops.maps.length !== ops.imglist.length) {
        $.fn.msgbox({
            tips: '未完成打码，请继续。'
        });
        return;
    }

    function convertBase64UrlToBlob(urlData) {
        var imgType = urlData.split(',')[0];
        imgType = imgType.split(':')[1];
        imgType = imgType.split(';')[0];
        var bytes = window.atob(urlData.split(',')[1]); //去掉url的头，并转换为byte
        //处理异常,将ascii码小于0的转换为大于0
        var ab = new ArrayBuffer(bytes.length);
        var ia = new Uint8Array(ab);
        for (var i = 0; i < bytes.length; i++) {
            ia[i] = bytes.charCodeAt(i);
        }

        return new Blob([ab], {
            type: imgType
        });
    }

    function uploadProgress(evt) {
        if (evt.lengthComputable) {
            var percentComplete = Math.round(evt.loaded * 100 / evt.total);
            $.fn.msgbox({
                loading: true,
                success: function(next) {
                    console.log(percentComplete);
                    setTimeout(function() {
                        next();
                    }, 3000);
                }
            });
        } else {
            console.log('unable to compute');
        }
    }

    function uploadComplete(evt) {
        var data = JSON.parse(evt.currentTarget.response);
        if (data.result === 1) {
            data = data.body;
            var xg = []
            for (var i = 0; i < data.length; i++) {
                xg.push(data[i])
            }
            console.log(xg);
            $this.children('input[type="hidden"]').val(JSON.stringify(xg));
            ops.$box.addClass('hidbox');
            if (ops.done) {
                ops.done(_this.$el, evt);
            }
        } else {
            console.log('失败');
        }
    }

    function uploadFailed(evt) {
        $.fn.msgbox({
            text: '上传文件失败，请重试。'
        });
    }

    function uploadCanceled(evt) {
        $.fn.msgbox({
            text: '上传文件被取消，上传失败。'
        });
    }

    var oData = new FormData(),
        xhr = new XMLHttpRequest();

    $.each(ops.maps, function(i, el) {
        oData.append('filePath', convertBase64UrlToBlob(el.data), el.name);
    });

    oData.append('style', $this.data('style') ? $this.data('style') : '1');

    oData.append('userId', $this.data('userId'));

    xhr.upload.addEventListener('progress', uploadProgress, false);
    xhr.addEventListener('load', uploadComplete, false);
    xhr.addEventListener('error', uploadFailed, false);
    xhr.addEventListener('abort', uploadCanceled, false);
    xhr.open('POST', 'image/upload');
    xhr.send(oData);
}

DoMark.prototype.created = function() {
    var ops = this.options,
        data = ops.canvas.toDataURL(ops.imglist[ops.index].type),
        mrak = ops.context.getImageData(0, 0, ops.width, ops.height);

    ops.maps[ops.index] = {
        data: data,
        mrak: mrak,
        rotate: ops.rotate,
        name: ops.imglist[ops.index].name
    }

    if (ops.maps[ops.index]) {
        $.fn.msgbox({
            tips: '保存成功'
        });
        ops.$box.find('.mark-next').trigger('click');
    }
};

DoMark.prototype.rotate = function(imgRot, back) {
    var ops = this.options;

    ops.withdrawn.length = 0;

    //角度转为弧度
    if (!imgRot) {
        imgRot = 0;
    }

    ops.rotate = imgRot;

    var rotation = Math.PI * imgRot / 180,
        c = Math.round(Math.cos(rotation) * 1000) / 1000,
        s = Math.round(Math.sin(rotation) * 1000) / 1000;

    var tmpcan = document.createElement("canvas"),
        tmpctx = tmpcan.getContext("2d"),
        tempImg = ops.imglist[ops.index].url;

    ops.nowbg = new Image();
    ops.nowbg.onload = function() {
        tmpcan.width = ops.nowbg.width;
        tmpcan.height = ops.nowbg.height;

        tmpctx.drawImage(ops.nowbg, 0, 0, tmpcan.width, tmpcan.height);
        tmpctx.save();

        //旋转后canvas标签的大小
        tmpcan.height = Math.abs(c * ops.nowbg.height) + Math.abs(s * ops.nowbg.width);
        tmpcan.width = Math.abs(c * ops.nowbg.width) + Math.abs(s * ops.nowbg.height);

        //改变中心点
        if (rotation <= Math.PI / 2) {
            tmpctx.translate(s * ops.nowbg.height, 0);
        } else if (rotation <= Math.PI) {
            tmpctx.translate(tmpcan.width, -c * ops.nowbg.height);
        } else if (rotation <= 1.5 * Math.PI) {
            tmpctx.translate(-c * ops.nowbg.width, tmpcan.height);
        } else {
            tmpctx.translate(0, -s * ops.nowbg.width);
        }

        //旋转90°
        tmpctx.rotate(rotation);
        tmpctx.drawImage(ops.nowbg, 0, 0);

        ops.nowbg = tmpcan;

        ops.canvas.width = tmpcan.width;
        ops.canvas.height = tmpcan.height;

        var imgx = tmpctx.getImageData(0, 0, tmpcan.width, tmpcan.height);

        ops.$canvas.css({
            width: tmpcan.width,
            height: tmpcan.height
        });

        ops.width = tmpcan.width;
        ops.height = tmpcan.height;

        if (back) {
            ops.context.putImageData(ops.maps[ops.index].mrak, 0, 0);
        } else {
            ops.context.putImageData(imgx, 0, 0);
        }

        // 释放内存。非常重要，否则释放不了image的内存
        // tmpctx.clearRect(0, 0, tmpcan.width, tmpcan.height);
        // tmpcan.width = tmpcan.height = 0;
        // tmpcan = null;
        //
        // ops.nowbg.src = '';
        // ops.nowbg = null;
    }

    ops.nowbg.src = tempImg;
}

DoMark.prototype.event = function() {
    // var _this = this,
    //     ops = _this.options,
    //     ins = 0;

    // var clickX = new Array();
    // var clickY = new Array();
    // var clickDrag = new Array();
    //
    // var getPos = function(event) {
    //     var rect = ops.canvas.getBoundingClientRect();
    //     var x = event.pageX - rect.left;
    //     var y = event.pageY - rect.top;
    //     if (x <= 0) x = 0;
    //     if (x >= rect.width) x = rect.width;
    //     if (y <= 0) y = 0;
    //     if (y >= rect.height) y = rect.height;
    //
    //     return {
    //         x: x,
    //         y: y
    //     }
    // }

    // function redraw(event) {
    //     ops.context.save();
    //
    //     var pos = getPos(event),
    //         size = ops.size;
    //
    //     if (ops.curTool === 'eraser') {
    //         ops.context.clearRect(pos.x - (size / 2), pos.y - (size / 2), size, size);
    //         ops.context.drawImage(ops.nowbg, 0, 0, ops.width, ops.height);
    //     } else if (ops.curTool === 'brush') {
    //         for (var i = 0; i < clickX.length; i++) {
    //             ops.context.beginPath();
    //             if (clickDrag[i] && i) {
    //                 ops.context.moveTo(clickX[i - 1], clickY[i - 1]);
    //             } else {
    //                 ops.context.moveTo(clickX[i], clickY[i]);
    //             }
    //             ops.context.lineTo(clickX[i], clickY[i]);
    //             ops.context.closePath();
    //
    //             ops.context.strokeStyle = ops.curColor;
    //             ops.context.lineJoin = 'round';
    //             ops.context.lineWidth = size;
    //             ops.context.stroke();
    //         }
    //     } else {
    //         //获取当前位置1PX的颜色值
    //         var data = ops.context.getImageData(pos.x - (size / 2), pos.y - (size / 2), size, size).data;
    //
    //         var r = 0,
    //             g = 0,
    //             b = 0;
    //
    //         for (var row = 0; row < size; row++) {
    //             for (var col = 0; col < size; col++) {
    //                 r += data[((size * row) + col) * 4];
    //                 g += data[((size * row) + col) * 4 + 1];
    //                 b += data[((size * row) + col) * 4 + 2];
    //             }
    //         }
    //
    //         r = Math.round(r / (size * size));
    //         g = Math.round(g / (size * size));
    //         b = Math.round(b / (size * size));
    //
    //         var color = 'rgba(' + r + ', ' + g + ', ' + g + ', .7)';
    //
    //         ops.context.beginPath();
    //         ops.context.save();
    //         ops.context.fillStyle = color;
    //         ops.context.fillRect(pos.x - (size / 2), pos.y - (size / 2), size, size);
    //     }
    //     ops.context.restore();
    // }

    // function addClick(x, y, dragging) {
    //     clickX.push(x);
    //     clickY.push(y);
    //     clickDrag.push(dragging);
    // }

    // function gbOper() {
    //     if (ops.curTool !== 'eraser') {
    //         ops.context.globalCompositeOperation = 'source-over';
    //     } else {
    //         ops.context.globalCompositeOperation = 'destination-over';
    //     }
    // }

    // function record() {
    //     var back = ops.context.getImageData(0, 0, ops.width, ops.height);
    //     ops.withdrawn.push(back);
    //     ins = ops.withdrawn.length;
    //     if (ins > 5) {
    //         ops.withdrawn.shift();
    //         ins--;
    //     }
    // }

    // ops.$canvas.mousedown(function(event) {
    //     event.stopPropagation();
    //     record();
    //     ops.paint = true;
    //     if (ops.curTool === 'brush') {
    //         var mouseX = event.pageX - this.offsetLeft;
    //         var mouseY = event.pageY - this.offsetTop;
    //         clickX.length = 0;
    //         clickY.length = 0;
    //         clickDrag.length = 0;
    //         addClick(mouseX, mouseY, false);
    //     }
    //     redraw.call(self, event);
    // });

    // ops.$canvas.mousemove(function(event) {
    //     event.stopPropagation();
    //     if (ops.paint) {
    //         if (ops.curTool === 'brush') {
    //             addClick(event.pageX - this.offsetLeft, event.pageY - this.offsetTop, true);
    //         }
    //         redraw.call(self, event);
    //     }
    // });

    // ops.$canvas.mouseup(function(e) {
    //     ops.paint = false;
    // });

    // ops.$canvas.mouseleave(function(e) {
    //     ops.paint = false;
    // });

    // function toHide(obj) {
    //     ops.$box.find('.mark-brush').removeClass('active');
    //     ops.$box.find('.mark-mosaic').removeClass('active');
    //     ops.$box.find('.mark-eraser').removeClass('active');
    //     if (obj === 'eraser') {
    //         ops.$box.find('.mark-mosaic').next().addClass('hide');
    //         ops.$box.find('.mark-brush').next().addClass('hide');
    //     } else if (obj === 'mosaic') {
    //         ops.$box.find('.mark-eraser').next().addClass('hide');
    //         ops.$box.find('.mark-brush').next().addClass('hide');
    //     } else {
    //         ops.$box.find('.mark-mosaic').next().addClass('hide');
    //         ops.$box.find('.mark-eraser').next().addClass('hide');
    //     }
    // }

    // 笔刷
    ops.$box.find('.mark-brush').click(function() {
        toHide('brush');
        $(this).addClass('active').next().toggleClass('hide');
        ops.size = ops.$box.find('.rg-brush').val();
        ops.curTool = 'brush';
        ops.context.globalCompositeOperation = 'source-over';
    });

    // 笔刷大小
    ops.$box.find('.rg-brush').change(function() {
        var _v = $(this).val();
        ops.size = _v;
        $(this).next().text(_v);
    });

    // 马赛克
    ops.$box.find('.mark-mosaic').click(function() {
        toHide('mosaic');
        $(this).addClass('active').next().toggleClass('hide');
        ops.size = ops.$box.find('.rg-mosaic').val();
        ops.curTool = 'mosaic';
        ops.context.globalCompositeOperation = 'source-over';
    });

    // 马赛克大小
    ops.$box.find('.rg-mosaic').change(function() {
        var _v = $(this).val();
        ops.size = _v;
        $(this).next().text(_v);
    });

    // 橡皮擦
    ops.$box.find('.mark-eraser').click(function() {
        toHide('eraser');
        $(this).addClass('active').next().toggleClass('hide');
        ops.size = ops.$box.find('.rg-eraser').val();
        ops.curTool = 'eraser';
        gbOper();
    });

    // 橡皮擦大小
    ops.$box.find('.rg-eraser').change(function() {
        var _v = $(this).val();
        ops.size = _v;
        $(this).next().text(_v);
    });

    // 颜色
    ops.$box.find('.mark-color').click(function() {
        ops.$box.find('.mark-color').removeClass('active');
        $(this).addClass('active');
        var colorId = $(this).data('id');
        switch (colorId) {
            case 1:
                ops.curColor = '#000';
                break;
            case 2:
                ops.curColor = '#f44336';
                break;
            case 3:
                ops.curColor = '#2196f3';
                break;
        }
    });

    // 撤回
    ops.$box.find('.mark-back').click(function() {
        if (ops.withdrawn[ins - 1]) {
            ops.context.putImageData(ops.withdrawn[ins - 1], 0, 0);
            delete(ops.withdrawn[ins - 1]);
            ins--;
        }
    });

    // 旋转
    var rol = 0;
    ops.$box.find('.mark-around').click(function() {
        rol += 90;
        if (rol === 360) {
            rol = 0;
        }
        _this.rotate(rol);
    });

    // 上一张
    ops.$box.find('.mark-prev').click(function() {
        if (ops.index > 0) {
            ops.index--;
            ops.withdrawn.length = 0;
            if (ops.maps[ops.index]) {
                _this.rotate(ops.maps[ops.index].rotate, true);
            } else {
                _this.rotate();
            }
        }
    });

    // 下一张
    ops.$box.find('.mark-next').click(function() {
        if (ops.index < ops.imglist.length - 1) {
            ops.index++;
            ops.withdrawn.length = 0;
            if (ops.maps[ops.index]) {
                _this.rotate(ops.maps[ops.index].rotate, true);
            } else {
                _this.rotate();
            }
        }
    });

    ops.$box.find('.loading-close').click(function() {
        ops.$box.addClass('hidbox');
    });

    // 保存
    ops.$box.find('.mark-save').click(function() {
        _this.created();
    });

    // 提交数据
    ops.$box.find('.mark-update').click(function() {
        _this.update();
    });
}

DoMark.prototype.init = function() {
    var _this = this,
        $this = _this.$el,
        ops = _this.options;

    function getOb(url) {
        var temp = url.lastIndexOf('.'),
            temp2 = url.lastIndexOf('/');

        var type = url.substr(temp + 1);
        if (type === 'jpg') {
            type = 'jpeg';
        }

        var img = {
            name: url.substring(temp2 + 1, temp),
            type: 'image/' + type,
            url: url
        };

        return img;
    }

    function doInit() {
        $('body').append(ops.$box);

        ops.withdrawn = new Array();
        ops.$canvas = ops.$box.find('#canvas');
        ops.canvas = ops.$canvas[0];
        ops.context = ops.canvas.getContext('2d');

        _this.rotate();

        _this.event();
    }

    ops.$box = $('<div class="markbox showbox">' +
        '<span class="loading-close"></span>' +
        '<div class="mark-content">' +
        '<canvas id="canvas"></canvas>' +
        '</div>' +
        '<div class="mark-opers">' +
        '<div>' +
        '<button type="button" class="btn mark-brush active">笔刷</button>' +
        '<div class="clearfix hide">' +
        '<button type="button" class="btn mark-color active" data-id="1">黑色</button>' +
        '<button type="button" class="btn mark-color" data-id="2">红色</button>' +
        '<button type="button" class="btn mark-color" data-id="3">蓝色</button>' +
        '<span>笔刷大小:</span>' +
        '<input type="range" value="15" min="1" class="rg-brush">' +
        '<span>10</span>' +
        '</div>' +
        '</div>' +
        '<div>' +
        '<button type="button" class="btn mark-mosaic">马赛克</button>' +
        '<div class="hide">' +
        '<span>马赛克大小:</span>' +
        '<input type="range" value="30" min="1" class="rg-mosaic">' +
        '<span>30</span>' +
        '</div>' +
        '</div>' +
        '<div>' +
        '<button type="button" class="btn mark-eraser">橡皮擦</button>' +
        '<div class="hide">' +
        '<span>橡皮擦大小:</span>' +
        '<input type="range" value="30" min="1" class="rg-eraser">' +
        '<span>30</span>' +
        '</div>' +
        '</div>' +
        '<button type="button" class="btn mark-around">旋转</button>' +
        '<button type="button" class="btn mark-prev">上一张</button>' +
        '<button type="button" class="btn mark-next">下一张</button>' +
        '<button type="button" class="btn mark-back">撤回</button>' +
        '<button type="button" class="btn mark-save">保存</button>' +
        '<button type="button" class="btn mark-update">提交</button>' +
        '</div>' +
        '</div>');

    $this.find('button').click(function() {
        ops.maps = new Array();
        ops.imglist = new Array();
        ops.index = 0;
        $.each($this.find('img'), function() {
            ops.imglist.push(getOb($(this).data('src')));
        });
        if (!ops.canvas) {
            doInit();
        } else {
            _this.rotate();
            ops.$box.removeClass('hidbox');
        }
    });
};

// function Plugin(option) {
//     return this.each(function() {
//         var $this = $(this),
//             data = $this.data('oc.doMark'),
//             options = typeof option == 'object' && option;
//         if (!data) $this.data('oc.doMark', (data = new DoMark(this, options)));
//         data.init();
//     });
// }
//
// $.fn.doMark = Plugin;
