// requestAnimationFrame
var lastTime = 0,
    vendors = ['webkit', 'moz'];

for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
    window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
    window.cancelAnimationFrame =
      window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
}

if (!window.requestAnimationFrame){
    window.requestAnimationFrame = function(callback, element) {
        var currTime = new Date().getTime();
        var timeToCall = Math.max(0, 16 - (currTime - lastTime));
        var id = window.setTimeout(function() { callback(currTime + timeToCall); },
          timeToCall);
        lastTime = currTime + timeToCall;
        return id;
    };
}

if (!window.cancelAnimationFrame){
    window.cancelAnimationFrame = function(id) {
        clearTimeout(id);
    };
}

function getStyle(obj, attr) {
    if (obj.currentStyle) {
        return obj.currentStyle[attr];
    } else {
        return document.defaultView.getComputedStyle(obj, null)[attr];
    }
}

// Placeholder
function setPlaceholder (_this) {
    var _parent = _this.parentNode,
        defaultValue = _this.getAttribute('placeholder') || null,
        inputChangeEvent = typeof(_this.oninput) === 'object' ? 'input' : 'propertychange',//绑定oninput/onpropertychange事件
        span = document.createElement('span');

    if(defaultValue){
        var css = 'position:absolute;z-index:1;display:inline-block;overflow:hidden;color:#aca899;text-indent:10px;'
                + 'width:' + _this.clientWidth + 'px;'
                + 'height:' + _this.clientHeight + 'px;'
                + 'margin-top:' + getStyle(_this,'marginTop') + ';'
                + 'margin-left:' + getStyle(_this,'marginLeft') + ';'
                + 'padding-top:' + (parseInt(getStyle(_this,'paddingTop'))) + 'px;'
                + 'padding-left:' + (parseInt(getStyle(_this,'paddingLeft'))) + 'px;'
                + 'line-height:' + _this.clientHeight + 'px;';

        span.innerHTML = defaultValue;
        span.style.cssText = css;
        _parent.insertBefore(span, _parent.childNodes[0]);

        if(0 !== _this.value.length){
            span.style.display = 'none';
        }

        if(span.addEventListener){
            span.addEventListener('click', function(){
                _this.focus();
            }, false);
            if(9 === document.documentMode){
                _this.addEventListener('blur', function(){
                    span.style.display = _this.value.length !== 0 ? 'none' : 'inline-block';
                }, false);
            }
            _this.addEventListener(inputChangeEvent, function(){
                span.style.display = _this.value.length !== 0 ? 'none' : 'inline-block';
            }, false);
        }else{
            span.attachEvent('onclick', function(){
                _this.focus();
            });
            if(inputChangeEvent === 'propertychange'){
                inputChangeEvent = 'onpropertychange';
            }else{
                inputChangeEvent = 'oninput';
            }
            _this.attachEvent(inputChangeEvent, function(){
                span.style.display = _this.value.length !== 0 ? 'none' : 'inline-block';
            });
        }
    }
}

window.onload = function() {
    if (!('placeholder' in document.createElement('input'))) {
        var input = document.getElementsByTagName('input'),
            textarea = document.getElementsByTagName('textarea');

        for (var i = 0; i < input.length; i++) {
            setPlaceholder(input[i]);
        }
        for (var j = 0; j < textarea.length; j++) {
            setPlaceholder(textarea[j]);
        }
    }
};
