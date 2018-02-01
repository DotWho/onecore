// (function($, $$){
//     $() with a1
//     const a1 = $('#a1')
//     if(a1) a1.innerHTML = 'true';
//
//     // $$() with a2
//     const a2 = $$('div')
//     const a2d = $('#a2')
//     if(a2.length > 0) a2d.innerHTML = 'true';
//
//     // after with after
//     const $after = $('#after')
//     const str = $('<span>AFTER</span>')
//     str._.after($after)
//     $after.innerHTML = 'true'
//
//     // attr with attr
//     const $attr = $('#attr')
//     const vv = {
//         x: 1,
//         y: 2
//     }
//     $attr._.attr(vv)
//     $attr.innerHTML = 'true'
//
//     // before with before
//     const $before = $('#before')
//     const str1 = $('<span>BEFORE</span>')
//     str1._.before($before)
//     $before.innerHTML = 'true'
//
//     //inside with inside
//     const $inside = $('#inside')
//     const str2 = $('<span>INSIDE</span>')
//     $inside.innerHTML = 'true '
//     str2._.inside($inside)
//
//     // properties with properties
//     const $proties = $('#properties')
//     const proties = document.createElement("button")._.properties({
//     	className: "btn green",
//     	textContent: "Next Step",
//     	onclick: function() { console.log('yes'); }
//     });
//
//     if(proties) {
//         $proties.innerHTML = 'true '
//         proties._.inside($proties)
//     }
//
//     // start with Start
//     const $start = $('#start')
//     const str3 = $('<span>START</span>')
//     $start.innerHTML = ' true'
//     str3._.start($start)
//
//     // style with style
//     const $style = $('#style')
//     $style._.style({
//     	backgroundColor: "red"
//     });
//     $style.innerHTML = 'true'
//
//
//     // on with on
//     const $on = $('#bind')
//     $on._.bind('click', function(){
//         $on.innerHTML += 'true'
//     })
//
//     // off with off
//     const $off = $('#off')
//     $off._.bind('click', function(){
//         $on._.off('click')
//         $off.innerHTML = 'true'
//     })
//
//
//     // fire with fire
//     const $fire = $('#fire')
//     const $fire2 = $('#fire2')
//     $fire2._.bind('click', function(){
//         console.log('im fire2');
//         $fire.innerHTML = 'true'
//     })
//     $fire._.bind('click', function(){
//         $.fire($fire2, 'click')
//     })
//
//     // once with once
//     const $once = $('#once')
//     $once._.once('click', function(){
//         $once.innerHTML = 'true'
//     })
//
//     // ready with ready
//     const $ready = $('#ready')
//     $.ready().then(function(){
//     	$ready.innerHTML = 'true'
//     });
//
//     // each with each
//     const $each = $('#each')
//     const $h4 = $$('h4')
//     $.each($h4, function (i, el) {
//         // console.log(el);
//     })
//     $each.innerHTML = 'true'
//
//     // extend with extend
//     const $extend = $('#extend')
//     const o1 = {foo: 1, bar:2}
//     const o2 = $.extend(o1, {foo: 3, baz: 4});
//     $extend.innerHTML = JSON.stringify(o2)
//
//     // live with live
//     const $range = $('#range')
//     const $rgnum = $('#rgnum')
//     let $live = $('#live')
//     let xxs = {
//         value: 1,
//         xm: 5
//     }
//     $range.value = xxs.value
//     $range._.bind('change', function(){
//         xxs.value = this.value
//     })
//     $.live(xxs, 'value', function(v){
//         $rgnum.innerHTML = v
//     })
//
//     // type with type
//     const $type = $('#type')
//     const type = $.type(xxs)
//     $type.innerHTML = type
//
//     // fetch with fetch
//     const $dofetch = $('.dofetch')
//     $dofetch._.bind('click', function(){
//         $.fetch("/api/create", {
//         	method: "POST",
//         	responseType: "json"
//         }).then(function(){
//         	alert("success!");
//         }).catch(function(error){
//             alert(error.status);
//         	// console.error(error, "code: " + error.status);
//         });
//         const cv = {
//             data: [{a:'hj'}]
//         }
//         $.hooks.run("fetch-args", cv);
//     })
//
//     $.hooks.add("fetch-args", function(env) {
//     	if ($.type(env.data) === "object") {
//     		env.data = Object.keys(env.data).map(function(key){
//     			return key + "=" + encodeURIComponent(o.data[key]);
//     		}).join("&");
//     	}
//     });
// })(Bliss, Bliss.$)
//
// var xot = 1;
// $('.btngg').onclick = function () {
//     if(xot > 1){
//         return
//     }
//     var xf = $('<button type="button" class="btn green">click2</button>')
//     $('.btngg').after(xf)
//     xot = 2
// }
//
// $('.btngg')._.addClass('class_name')

// console.log($('.btngg')._.style('visibility'));
//
// console.log($('.xcv')._.find('.av2'));
//
// console.log($('.xcv')._.hasClass('xcv'));
//
// console.log($('.av1')._.next());
//
// console.log($('.av2')._.prev());
//
// console.log($('.av1')._.parent());
//
// console.log($('.av1')._.removeClass('av1'));
//
// console.log($('.av3')._.attr('class'));
//
// console.log($('#oc_data')._.data('oc'));
//
// console.log($('#oc_data')._.tdata('oc', '99999999999'));
//
// console.log($('#oc_remdata')._.removeData('oc'));
//
// $.removeData($('#oc_data'), 'oc')


// $('#on')._.on('click', 'li', function () {
//     console.log(this);
// })

// $$('#on li')._.once('click', function () {
//     console.log(123);
// })
//
// $('.teste')._.style({
//     backgroundColor: '#000'
// })._.addClass('class_name')._.attr({
//     x: 1,
//     y: 2
// })._.inside($('.testx'))._.addClass('class_name1')
//
// console.log($('.li55')._.parent());
// console.log($('.li55')._.parent('ul'));
// console.log($('#on')._.children('li')._.addClass('ggg'));
//
// $('.li3').onclick = function(){
//     this._.index()
// }


var data = $('.ghj')._.data()
console.log(data);
$('.ghj')._.data('x', 999)
console.log($('.ghj')._.data());
console.log($('.ghj')._.data('y'));
