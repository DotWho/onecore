window.onload = function () {
    if(navigator.appName == "Microsoft Internet Explorer"){
        if(navigator.appVersion .split(";")[1].replace(/[ ]/g,"")=="MSIE7.0" || navigator.appVersion .split(";")[1].replace(/[ ]/g,"")=="MSIE8.0"){
            var body = document.body;
            var div = document.createElement('div');
            div.innerHTML = '<div class="nospie8 clearfix"><a href="https://download.mozilla.org/?product=firefox-stub&os=win&lang=zh-CN" title="点击升级浏览器" style="width: 84px;"></a><a href="http://img1.hongtiantao.com/browsers/ChromeStandalone_V43.0.2357.134_Setup.1436927123.exe" title="点击升级浏览器" style="width: 102px;"></a><a href="http://support.microsoft.com/zh-cn/help/17621/internet-explorer-downloads?spm=875.7931836/A.a2226mw.1.dxrrJX" title="点击升级浏览器" style="width: 95px;"></a></div>';
          body.className = 'overlay-layer';
          body.appendChild(div);
        }
    }
}
