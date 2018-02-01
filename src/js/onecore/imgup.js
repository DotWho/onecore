/**
 * Imgup
 * @param null
 * @returns null
 * @author Dr.Who
 * @editTime 2016-07-19
 * @use class .imgup
 */
import Util from './util'

const Imgup = (($, $$) => {
    // Constants
    const NAME = 'imgup'
    const VERSION = '1.0.0'
    const DATA_KEY = 'oc.imgup'

    const Event = {
        CLICK: Util.getEvent('click')
    }

    const Default = {
        max: 1,
        size: '10MB',
        num: 1,
        mult: true,
        uplist: []
        // backfn: null //function (map) {}//返回map
    }

    const DefaultType = {
        max: 'number',
        size: 'string',
        num: 'number',
        mult: 'bool',
        uplist: 'array'
        // backfn: '(function|null)'
    }

    const ClassName = {
        ACTIVE: 'active',
        MISS: 'dismiss',
        OVERLAY: 'overlay-layer'
    }

    const Selector = {
        DATA_TOGGLE: '[data-toggle="imgup"]'
    }

    // Class Definition
    class Imgup {

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
            config = $.extends({}, Default, config)
            Util.typeCheckConfig(NAME, config, DefaultType)
            return config
        }

        _upload(img, num, spanlk) {
            const _this = this
            const $this = _this.$el

            let ops = _this._config

            function convertBase64UrlToBlob(urlData) {
                var imgType = urlData.split(',')[0]
                imgType = imgType.split(':')[1]
                imgType = imgType.split(';')[0]
                var bytes = window.atob(urlData.split(',')[1]) //去掉url的头，并转换为byte
                //处理异常,将ascii码小于0的转换为大于0
                var ab = new ArrayBuffer(bytes.length)
                var ia = new Uint8Array(ab)
                for (var i = 0; i < bytes.length; i++) {
                    ia[i] = bytes.charCodeAt(i)
                }

                return new Blob([ab], {
                    type: imgType
                })
            }

            function uploadProgress(evt) {
                if (evt.lengthComputable) {
                    // var percentComplete = Math.round(evt.loaded * 100 / evt.total)
                } else {
                    console.log('unable to compute')
                }
            }

            function uploadComplete(evt) {
                var data = JSON.parse(evt.currentTarget.response)
                if (data.result == 1) {
                    data = data.body
                    for (var i = 0; i < data.length; i++) {
                        ops.uplist.push({
                            id: num,
                            url: data[i].url,
                            relativeUrl: data[i].relativeUrl
                        })
                    }
                    $this._.children('input[type="hidden"]').value = JSON.stringify(ops.uplist)
                    spanlk._.attr({'class': 'btn active'})
                    $this._.removeClass('error')
                } else {
                    console.log('失败')
                }
            }

            function uploadFailed(evt) {
                $.fn.notification({
                    text: '上传文件失败，请重试。',
                    type: 'error'
                })
            }

            function uploadCanceled(evt) {
                $.fn.notification({
                    text: '上传文件被取消，上传失败。',
                    type: 'error'
                })
            }

            var oData = new FormData(),
                xhr = new XMLHttpRequest()

            oData.append('filePath', convertBase64UrlToBlob(img.data), img.name)

            oData.append('style', $this._.data('style') ? $this._.data('style') : '1')

            oData.append('userId', $this._.data('userId'))

            xhr.upload.addEventListener('progress', uploadProgress, false)
            xhr.addEventListener('load', uploadComplete, false)
            xhr.addEventListener('error', uploadFailed, false)
            xhr.addEventListener('abort', uploadCanceled, false)
            xhr.open('POST', 'image/upload')
            xhr.send(oData)
        }

        _doCompress(img, type) {
            var canvas = document.createElement('canvas'),
                width = img.width,
                height = img.height,
                ctx = canvas.getContext('2d'),
                scale = width / height,
                wleng = width.toString().length

            if (scale > 1) {
                scale = height / width
            } else if (scale === 1) {
                scale = 0.8
            }

            while (wleng > 3) {
                width = parseInt(width * scale)
                height = parseInt(height * scale)
                wleng = width.toString().length
            }

            canvas.width = width
            canvas.height = height
            ctx.drawImage(img, 0, 0, width, height)

            var base = canvas.toDataURL(type)

            if (base === 'data:,') {
                base = img.src
            }

            return base
        }

        _init() {
            const _this = this
            const $this = _this.$el

            let ops = _this._config,
                $input = $this._.find('input[type="hidden"]').value,
                size = ['Bytes', 'KB', 'MB'],
                sizes,
                display = ''

            ops.uplist = []
            if(ops.max) ops.max = parseInt(ops.max);
            if(ops.num) ops.num = parseInt(ops.num);

            if ($input.length > 0) {
                ops.uplist = JSON.parse($input)
                ops.num = ops.uplist.length + 1
                for (var i = 0; i < ops.uplist.length; i++) {
                    var data = ops.uplist[i]

                    $this._.append(`<label class="btn active"><img src="${data.url}"><span data-id="${data.id}">删除</span></label>`)
                }
            }

            if (ops.max == $this._.children('label').length) {
                display = 'style="display:none;"'
            }

            $this._.append(`<label class="btn" ${display}>
                <input type="file" data-off="true" accept="image/gif,image/jpeg,image/png" multiple>
                <span>删除</span>
            </label>`)

            function bytesToSize(bytes) {
                //显示大小
                if (bytes === 0) return 'n/a'
                var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)))
                sizes = i
                return (bytes / Math.pow(1024, i)).toFixed(1) + size[i]
            }

            function sizeOk(fileSize) {
                var sResultFileSize = bytesToSize(fileSize),
                    unit,
                    isbool = false
                if (ops.size === 0) {
                    isbool = true
                } else {
                    for (var i = 0; i < 3; i++) {
                        if (ops.size.lastIndexOf(size[i]) >= 1) {
                            unit = i
                            break
                        }
                    }

                    if (unit > sizes) {
                        isbool = true
                    } else if (unit === sizes) {
                        if (parseFloat(sResultFileSize) <= parseFloat(ops.size)) {
                            isbool = true
                        }
                    }
                }
                return isbool
            }

            function destroy(img) {
                var canvas = img.canvas
                img.onload = null

                if (canvas) {
                    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
                    canvas.width = canvas.height = 0
                    _this._canvas = null
                }

                // 释放内存。非常重要，否则释放不了image的内存
                img.src = ''
                img = null
            }

            function doProccess(file, el) {
                if (/image\/\w+/.test(file.type)) {
                    var reader = new FileReader()
                    reader.onload = function() {
                        var img = new Image()
                        img.src = this.result
                        var basedata = _this._doCompress(img, file.type)

                        if (_this.$el._.children('label').length > ops.max) {
                            el.style.display = 'none'
                            return false
                        }

                        var $spanload = $(`<label class="btn imgload"><img src="${basedata}"><span data-id="${ops.num}">删除</span></label>`)

                        el._.before($spanload)

                        if (_this.$el._.children('label').length > ops.max) {
                            el.style.display = 'none'
                        }

                        ops.uplist.push({
                            id: ops.num,
                            url: 'urlurk'
                        })
                        $this._.children('input[type="hidden"]').value = JSON.stringify(ops.uplist)

                        let cots = 1;
                        $spanload._.attr({'process': '10%'})
                        let ttmm = setInterval(function(){
                            const hb = cots + '%'
                            $spanload._.attr({'process': hb})
                            cots++
                            if(cots > 99){
                                clearInterval(ttmm)
                                $spanload._.attr({'class': 'btn active'})
                                $this._.removeClass('error')
                            }
                        }, 10)

                        // _this._upload({data: this.result, name: file.name}, ops.num, $spanload)

                        if (ops.backfn) {
                            ops.backfn({
                                id: ops.num,
                                data: this.result,
                                name: file.name
                            })
                        }

                        ops.num++

                        destroy(img)
                    }

                    reader.onerror = function() {
                        $.fn.notification({
                            text: '发送错误，请重试。',
                            type: 'error'
                        })
                    }

                    if (sizeOk(file.size)) {
                        reader.readAsDataURL(file)
                    } else {
                        if (!_this.nblob) {
                            $this.value = ''
                        }
                        $.fn.notification({
                            text: '图片太大，请上传小于' + ops.size + '的图片',
                            type: 'info'
                        })
                    }
                } else {
                    var sd
                    $this._.attr('accept') === null ? sd = 'others' : sd = $this._.attr('accept')
                    if (sd.indexOf('image') === -1) {
                        $parent._.addClass('file')
                    } else {
                        $.fn.notification({
                            text: '\u8bf7\u9009\u62e9\u6b63\u786e\u7684\u56fe\u7247\u683c\u5f0f\u3002', //请选择正确的图片格式。
                            type: 'info'
                        })
                    }
                }
            }

            _this.$el._.on('change', 'input[type="file"]', function(e) {
                e.stopPropagation()
                e.preventDefault()

                var $this = this,
                    files = e.target.files

                for (var i = 0; i < files.length; i++) {
                    doProccess(files[i], $this._.parent())
                }

                $this.value = ''

                // try {
                // 	var files = e.target.files
                // 	if(ops.mult){
                // 		for (var i = 0; i < files.length; i++) {
                // 			doProccess(files[i], $this.parent())
                // 		}
                // 	}else{
                // 		doProccess(files[0], $this.parent())
                // 	}
                // } catch (err) {
                // 	$this.select().blur()
                // 	var src = document.selection.createRange().text
                // 	$this.parent().addClass('active').attr('style', 'filter: progid:DXImageTransform.Microsoft.AlphaImageLoader(sizingMethod="scale",src="' + src + '")')
                // 	if(_this.$el.children('label').length < ops.max){
                // 		_this.$el.append('<label>'+
                // 		'<input type="file" accept="image/gif,image/jpeg,image/png">'+
                // 		'<span>删除</span></label>')
                // 	}
                // } finally {
                // 	$this.val('')
                // }
            })

            _this.$el._.on(Event.CLICK, 'span', function(e) {
                e.preventDefault()
                e.stopPropagation()

                var $span = this,
                    id = $span._.data('id')

                if (ops.backfn) {
                    ops.backfn(id)
                } else {
                    for (var ls in ops.uplist) {
                        if (ops.uplist.hasOwnProperty(ls)) {
                            if (ops.uplist[ls].id == id) {
                                ops.uplist.splice(ls, 1)
                            }
                        }
                    }
                    $this._.children('input[type="hidden"]').value = JSON.stringify(ops.uplist)
                }

                if (_this.$el._.children('label').length > 1) {
                    $span._.parent()._.remove()
                    let labels = _this.$el._.children('label')
                    if(labels.length && labels.length <= ops.max) {
                        labels[labels.length-1].style.display = 'inline-block'
                    }else{
                        labels.style.display = 'inline-block'
                    }
                } else {
                    $span._.parent()._.removeAttr('style')._.removeClass('active')
                }
            })
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
                data = new Imgup(this, _config)
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
        Imgup._interface.call(item , item._.data())
    })

    $.add(NAME, Imgup._interface)

    return Imgup

})(Bliss, Bliss.$)

export default Imgup
