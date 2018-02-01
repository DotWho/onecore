/**
* Imgbox
* @param null
* @returns null
* @author Dr.Who
* @editTime 2017-09-19
*/
var $gallery = null,
    $thumbnails,
    $image,
    $thumbImg,
    imageWidth,
    imageHeight,
    imgRatio,
    ratio = 1.2, //图片缩放倍率
    thumbnailsWidth = 180, //右下角缩略图宽度
    thumbnailsHeight = 120, //右下角缩略图高度
    isVertical = false,
    activeIndex = 0,
    cW,
    cH,
    list;

function oc_toggleImage() {
    imageWidth = list[activeIndex].imgWidth
    imageHeight = list[activeIndex].imgHeight
    imgRatio = imageWidth / imageHeight
    cW = document.documentElement.clientWidth
    cH = document.documentElement.clientHeight

    $gallery._.find('.image')._.removeClass('active')
    $image = $gallery._.find('.image[index="' + activeIndex + '"]')._.addClass('active')._.style({
        width: `${imageWidth}px`,
        height: `${imageHeight}px`
    })._.removeClass('rotate0 rotate90 rotate180 rotate270')

    $thumbImg = $thumbnails._.find('img')._.attr({'src': list[activeIndex].url})

    $thumbnails._.find('img').removeAttribute('class')
    $thumbnails._.find('img').removeAttribute('style')
    isVertical = false
    $thumbnails.style.display = 'none'

    oc_setImagePosition()
}

function oc_setData(img, father) {
    var imgs = father._.find('img'),
        src = img.src,
        imgHeight = img.naturalHeight,
        imgWidth = img.naturalWidth,
        ratio = imgWidth / imgHeight,
        wH = 415,
        wW = 615,
        winHeight,
        winWidth,
        windowMargin = 15,
        maxHeight = document.documentElement.clientHeight - windowMargin * 2,
        maxWidth = document.documentElement.clientWidth - windowMargin

    winWidth = Math.max(wW, imgWidth)
    winHeight = Math.max(wH, imgHeight)

    if (winWidth > maxWidth) {
        winWidth = maxWidth
        winHeight = Math.max(wH, Math.ceil(winWidth / ratio))
        if (imgWidth > winWidth) {
            imgWidth = winWidth
            imgHeight = Math.ceil(imgWidth / ratio)
        }
    }

    if (winHeight > maxHeight) {
        winHeight = maxHeight
        winWidth = Math.max(wW, Math.ceil(winHeight * ratio))
        if (imgHeight > winHeight) {
            imgHeight = winHeight
            imgWidth = Math.ceil(imgHeight * ratio)
        }
    }

    list = []

    imgs.forEach(function(item, i){
        var url = item.src,
            nH = item.naturalHeight,
            nW = item.naturalWidth,
            ratio = nW / nH,
            w = nW,
            h = nH

        if (url == src) {
            activeIndex = i
            w = imgWidth
            h = imgHeight
        } else {
            if (nW > winWidth) {
                w = winWidth
                nH = h = Math.ceil(w / ratio)
                if (h > winHeight) {
                    nH = h = winHeight
                    w = Math.ceil(h * ratio)
                }
            }
            if (nH > winHeight) {
                h = winHeight
                w = Math.ceil(h * ratio)
                if (w > winWidth) {
                    w = winWidth
                    h = Math.ceil(w / ratio)
                }
            }
        }
        list.push({
            url: url,
            imgHeight: h,
            imgWidth: w
        })
    })

    list.forEach(function(img, i){
        var images = $('<img class="image" ondragstart="return false;"/>')
        images._.attr({'src': img.url, 'index': i})._.style({
            width: img.imgWidth + 'px',
            height: img.imgHeight + 'px',
            left: ((cW - img.imgWidth) / 2) + 'px',
            top: ((cH - img.imgHeight) / 2) + 'px'
        })
        $gallery._.append(images)
    })

    $image = $gallery._.find('.image')[activeIndex]._.addClass('active')

    oc_toggleImage()
}

function oc_setImagePosition() {
    //设置图片位置
    var w = $image.width,
        h = $image.height,
        cW = document.documentElement.clientWidth,
        cH = document.documentElement.clientHeight

    var left = (cW - w) / 2,
        top = (cH - h) / 2

    $image._.style({'left': left + 'px', 'top': top + 'px'})
}

function oc_event() {
    var isFirefox = navigator.userAgent.indexOf('Firefox') > -1,
        MOUSEWHEEL_EVENT = isFirefox ? 'DOMMouseScroll' : 'mousewheel',
        thumbX,
        thumbY,
        $bigger = $gallery._.find('.oper_bigger'),
        $smaller = $gallery._.find('.oper_smaller'),
        $rotate = $gallery._.find('.oper_rotate'),
        $prev = $gallery._.find('.oper_prev'),
        $next = $gallery._.find('.oper_next'),
        $btnclose = $gallery._.find('.oper_close'),
        $close = $gallery._.find('.loading-close')

    $thumbnails = $gallery._.find('.thumbnails')

    function closed() {
        $gallery._.addClass('hidbox')
        $('body')._.removeClass('overlay-layer-top')
        setTimeout(function () {
            $gallery._.remove()
        }, 300)
    }

    function biggerImage() {
        var w = parseInt($image._.style('width')),
            h = parseInt($image._.style('height')),
            nextW = w * ratio,
            nextH = h * ratio

        if (nextW - w < 1) nextW = Math.ceil(nextW);

        var percent = (nextW / imageWidth * 100).toFixed(0)

        if (percent > 90 && percent < 110) {
            percent = 100
            nextW = imageWidth
            nextH = imageHeight
        } else if (percent > 1600) {
            percent = 1600
            nextW = imageWidth * 16
            nextH = imageHeight * 16
        }

        $image._.style({'width': `${nextW}px`, 'height': `${nextH}px`})
        oc_setImagePosition()
        // showPercentTip(percent)
        showThumbnails(nextW, nextH)
    }

    function smallerImage() {
        var w = parseInt($image._.style('width')),
            h = parseInt($image._.style('height')),
            nextW,
            nextH,
            percent = (w / ratio / imageWidth * 100).toFixed(0)

        if (percent < 5) {
            percent = 5
            nextW = imageWidth / 20
            nextH = imageHeight / 20
        } else if (percent > 90 && percent < 110) {
            percent = 100
            nextW = imageWidth
            nextH = imageHeight
        } else {
            nextW = w / ratio
            nextH = h / ratio
        }

        $image._.style({'width': `${nextW}px`, 'height': `${nextH}px`})
        oc_setImagePosition()
        // showPercentTip(percent)
        showThumbnails(nextW, nextH)
    }

    //显示百分比提示
    // function showPercentTip(percent) {
    //     if($gallery._.find('.percentTip')){
    //         $gallery._.find('.percentTip').remove()
    //     } else {
    //         $gallery._.append(`<div class="percentTip"><span>${percent}%</span></div>`)
    //     }
    // }

    function mouseWheelScroll(e) {
        var _delta = parseInt(e.wheelDelta || -e.detail)
        //向上滚动
        if (_delta > 0) {
            biggerImage()
        }
        //向下滚动
        else {
            smallerImage()
        }
    }

    //设置缩略图拖拽区域
    function setThumbnails() {
        var $img = $thumbnails._.find('img'),
            sW = $img.width,
            sH = $img.height,
            w = $image.width,
            h = $image.height,
            imf = $image.getBoundingClientRect(),
            imfl = imf.left,
            imft = imf.top,
            cW = document.documentElement.clientWidth,
            cH = document.documentElement.clientHeight,
            tW,
            tH,
            tl,
            tt

        if (isVertical) {
            sW = [sH, sH = sW][0]
            w = [h, h = w][0]
        }

        tW = sW / (w / cW)
        if (w < cW) tW = sW
        tH = sH / (h / cH)
        if (h < cH) tH = sH
        tl = (thumbnailsWidth - sW) / 2 + -imfl / w * sW
        if (w < cW) tl = (thumbnailsWidth - sW) / 2
        tt = (thumbnailsHeight - sH) / 2 + -imft / h * sH
        if (h < cH) tt = (thumbnailsHeight - sH) / 2

        $thumbnails._.find('.thumbDrag')._.style({
            width: tW + 'px',
            height: tH + 'px',
            left: tl + 'px',
            top: tt + 'px'
        })
    }

    //显示缩略图
    function showThumbnails(width, height) {
        if (isVertical) width = [height, height = width][0]
        if (width > document.documentElement.clientWidth || height > document.documentElement.clientHeight) {
            $thumbnails.style.display = 'block'
            setThumbnails()
        } else {
            $thumbnails.style.display = 'none'
        }
    }

    function resizeThumbImg(rotateDeg) {
        var maxW = thumbnailsWidth,
            maxH = thumbnailsHeight
        if (rotateDeg == '90' || rotateDeg == '270') {
            maxW = [maxH, maxH = maxW][0]
        }
        $thumbImg._.style({
            maxWidth: maxW + 'px',
            maxHeight: maxH + 'px'
        })

        $thumbnails.style.display = 'none'
    }

    //上一张
    $prev.onclick = function() {
        if (activeIndex > 0) {
            activeIndex--
            oc_toggleImage()
        }
    }

    //下一张
    $next.onclick = function() {
        if (activeIndex < list.length - 1) {
            activeIndex++
            oc_toggleImage()
        }
    }

    //键盘左右键
    document.onkeydown = function(e) {
        e = e || window.event
        if (e.keyCode) {
            if (e.keyCode == 37) {
                $prev._.fire('click')
            }
            if (e.keyCode == 39) {
                $next._.fire('click')
            }
        }
    }

    //关闭
    $close.onclick = closed
    $btnclose.onclick = closed

    //放大图片
    $bigger.onclick = biggerImage

    //缩小图片
    $smaller.onclick = smallerImage

    window.onresize = oc_setImagePosition

    //旋转
    $rotate.onclick = function() {
        var rotateClass = $image._.attr('class').match(/(rotate)(\d*)/)
        if (rotateClass) {
            var nextDeg = (rotateClass[2] * 1 + 90) % 360
            $image._.removeClass(rotateClass[0])._.addClass('rotate' + nextDeg)
            $thumbImg._.removeClass(rotateClass[0])._.addClass("rotate" + nextDeg)
            // resizeImage(nextDeg)
            resizeThumbImg(nextDeg)
            isVertical = nextDeg == 90 || nextDeg == 270
        } else {
            $image._.addClass('rotate90')
            $thumbImg._.addClass('rotate90')
            // resizeImage("90")
            resizeThumbImg('90')
            isVertical = true
        }
    }

    if (document.attachEvent) {
        document.attachEvent('on' + MOUSEWHEEL_EVENT, function(e) {
            mouseWheelScroll(e)
        })
    } else if (document.addEventListener) {
        document.addEventListener(MOUSEWHEEL_EVENT, function(e) {
            mouseWheelScroll(e)
        }, false)
    }

    //缩略图
    $thumbnails._.style({
        height: thumbnailsHeight + 'px',
        width: thumbnailsWidth + 'px'
    })
    $thumbnails.onmouseenter = function(e) {
        thumbX = -1
    }
    $thumbnails.onmousedown = function(e) {
        thumbX = e.pageX || e.clientX
        thumbY = e.pageY || e.clientY

        cW = document.documentElement.clientWidth
        cH = document.documentElement.clientHeight
        e.stopPropagation()
    }
    $thumbnails.onmousemove = function(e) {
        if (thumbX > 0) {
            var nextDragX = e.pageX || e.clientX
            var nextDragY = e.pageY || e.clientY
            var $td = this._.find('.thumbDrag'),
                imageWidth = $image._.style('width'),
                imageHeight = $image._.style('height'),
                thumbImgWidth = $thumbImg.width,
                thumbImgHeight = $thumbImg.height,
                left = parseFloat($td._.style('left')) + (nextDragX - thumbX),
                top = parseFloat($td._.style('top')) + (nextDragY - thumbY),
                w = $td.width,
                h = $td.height,
                it,
                il,
                maxL,
                maxT

            if (isVertical) {
                thumbImgWidth = [thumbImgHeight, thumbImgHeight = thumbImgWidth][0]
                imageWidth = [imageHeight, imageHeight = imageWidth][0]
            }
            it = (thumbnailsHeight - thumbImgHeight) / 2,
                il = (thumbnailsWidth - thumbImgWidth) / 2,
                maxL = thumbnailsWidth - w - il - 2, //减去2像素边框部分
                maxT = thumbnailsHeight - h - it - 2

            if (left < il) left = il
            else if (left > maxL) left = maxL

            if (top < it) top = it
            else if (top > maxT) top = maxT

            $td._.style({
                left: left + 'px',
                top: top + 'px'
            })

            thumbX = nextDragX
            thumbY = nextDragY

            if (imageWidth < cW) left = (cW - imageWidth) / 2
            else left = -imageWidth * (left - il) / thumbImgWidth

            if (imageHeight < cH) top = (cH - imageHeight) / 2
            else top = -imageHeight * (top - it) / thumbImgHeight

            $image._.style({'top': top, 'left': left})
        }
    }
    $thumbnails.onmouseup = function(e) {
        thumbX = -1
    }

    $thumbnails._.find('.thumbClose').onclick = function() {
        $thumbnails.style.display = 'none'
    }
}

function imgbox(el, type) {
    activeIndex = 0
    isVertical = false
    $gallery = $(`<div class="oc-gallery showbox">
        <span class="loading-close">&nbsp;</span>
        <div class="tool">
            <div class="toolct">
                <button class="btn t-white oper_bigger" type="button">放大</button>
                <button class="btn t-white oper_smaller" type="button">缩小</button>
                <button class="btn t-white oper_rotate" type="button">旋转</button>
                <button class="btn t-white oper_prev" type="button">上一张</button>
                <button class="btn t-white oper_next" type="button">下一张</button>
                <button class="btn t-white oper_close" type="button">关闭</button>
            </div>
        </div>
        <div class="thumbnails">
            <button class="btn thumbClose" type="button">关闭缩略图</button>
            <img ondragstart="return false;"/>
            <div class="thumbDrag"><span></span></div>
        </div>
    </div>`)

    $('body')._.append($gallery)

    oc_event()

    var father

    if (!type) {
        father = el._.parent('.imgbox')
    } else {
        father = el._.parent('.imgup')
    }

    oc_setData(el, father)

    $('body')._.addClass('overlay-layer-top')
}

$('body')._.on('click', '.imgbox img', function(){
    imgbox(this)
})

$('body')._.on('click', '.imgup img', function(){
    imgbox(this, true)
})
