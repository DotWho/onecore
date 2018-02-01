(function($, $$) {
    'use strict'

    var forStyle = function(position) {
        var cssStr = ''
        for (var key in position) {
            if (position.hasOwnProperty(key)) cssStr += key + ':' + position[key] + ';'
        }
        return cssStr
    }

    var isMobile = window.navigator.userAgent.match(/Mobile/) &&
        window.navigator.userAgent.match(/Mobile/)[0] === 'Mobile',
        eventype = isMobile ? 'touchstart' : 'mousedown',
        duration = 750

    function removeRip() {
        this._.remove()
    }

    $.ready().then(function(){
        document._.on(eventype, '.btn', function(e) {
            if(this.classList.contains('btn') && !this.classList.contains('disabled')) {
                // Prepare the dom
                var rippleEffect = document.createElement('span');

                rippleEffect.className = 'ripple'
                if (this.classList.contains('outline')) {
                    rippleEffect.className = 'ripple rdark'
                }
                this.appendChild(rippleEffect)

                var el = this.getBoundingClientRect(),
                    position = {
                        width: `${el.width * 2}px`,
                        height: `${el.width * 2}px`,
                        top: `${e.clientY - el.top - el.width}px`,
                        left: `${e.clientX -  el.left - el.width}px`,
                        transition: `transform ${duration}ms, opacity ${duration}ms`
                    }
                rippleEffect.setAttribute('style', forStyle(position))

                position['opacity'] = 0
                position['transform'] = 'scale3d(1, 1, 1)'
                rippleEffect.setAttribute('style', forStyle(position))

                setTimeout(function() {
                    removeRip.call(rippleEffect)
                }, duration)
            }
        })

        // start
        var pItem = document.getElementsByClassName('progressive replace'),
            timer

        // throttled scroll/resize
        function scroller(e) {
            timer = timer || setTimeout(function() {
                timer = null
                requestAnimationFrame(inView)
            }, 300)
        }

        // image in view?
        function inView() {
            var wT = window.pageYOffset,
                wB = wT + window.innerHeight,
                cRect, pT, pB, p = 0

            while (p < pItem.length) {
                cRect = pItem[p].getBoundingClientRect()
                pT = wT + cRect.top
                pB = pT + cRect.height

                if (wT < pB && wB > pT) {
                    loadFullImage(pItem[p])
                    pItem[p].classList.remove('replace')
                } else {
                    p++
                }
            }
        }

        // replace with full image
        function loadFullImage(item) {
            if (!item || !item.getAttribute('data-href')) return

            // load image
            var img = new Image()

            if (item.dataset) {
                img.srcset = item.dataset.srcset || ''
                img.sizes = item.dataset.sizes || ''
            }

            img.src = item.getAttribute('data-href')
            img.className = 'reveal'
            if (img.complete) addImg()
            else img.onload = addImg

            // replace image
            function addImg() {
                // disable click
                // item.addEventListener('click', function(e) {
                //     e.preventDefault();
                // }, false)

                // add full image
                item.appendChild(img).addEventListener('animationend', function(e) {
                    // remove preview image
                    var pImg = item.querySelector && item.querySelector('img.preview')
                    if (pImg) {
                        e.target.alt = pImg.alt || ''
                        item.removeChild(pImg)
                        e.target.classList.remove('reveal')
                    }
                })
            }
        }

        // progressive-image.js
        window.addEventListener('scroll', scroller, false)
        window.addEventListener('resize', scroller, false)
        inView()
    });
})(Bliss, Bliss.$);
