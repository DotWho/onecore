/**
 * Accordion
 * @param null
 * @returns null
 * @author Dr.Who
 * @editTime 2016-04-29
 * @use class .accordion
 */
var Accordion = function(el, options) {
  this.$el = $(el)
  this.options = $.extend({}, Accordion.DEFAULTS, options)
}

Accordion.VERSION = '1.0.0'

Accordion.DEFAULTS = {}

Accordion.prototype.show = function() {
  var $el = this.$el

  $el.on('click.oc.accordion touchend.oc.accordion', '.adn-more', function(e) {
    e.stopPropagation()
    var $this = $(this),
      $next = $this.next('div')

    if ($this.hasClass('active') || $this.hasClass('showup')) {
      $this.removeClass('active').removeClass('showup')
      $next.slideUp(150)
    } else {
      $this.addClass('active')
      $next.slideDown(150)
    }
  })

  $el.on(
    'click.oc.accordion touchend.oc.accordion',
    'button:not(".adn-more")',
    function(e) {
      e.stopPropagation()
      $.each($el.find('button:not(".adn-more")'), function() {
        $(this).removeClass('selected')
      })

      $(this).addClass('selected')
    }
  )

  $.each($el.find('.adn-more'), function() {
    if ($(this).hasClass('showup')) {
      $(this)
        .next('div')
        .css('display', 'block')
    }
  })
}

function Plugin(option) {
  return this.each(function() {
    var $this = $(this),
      data = $this.data('oc.accordion'),
      options = typeof option == 'object' && option
    if (!data) $this.data('oc.accordion', (data = new Accordion(this, options)))
    data.show()
  })
}

$.fn.accordion = Plugin
