$(document).on('ready', function () {
  // initialization of header
  $.HSCore.components.HSHeader.init($('#header'))

  // initialization of forms
  $.HSCore.helpers.HSFocusState.init()

  // initialization of show animations
  $.HSCore.components.HSShowAnimation.init('.js-animation-link')

  // initialization of sticky blocks
  setTimeout(function () {
    $.HSCore.components.HSStickyBlock.init('.js-sticky-block')
  }, 300)

  // initialization of go to
  $.HSCore.components.HSGoTo.init('.js-go-to')
  // initialization of HSScrollNav component
  $.HSCore.components.HSScrollNav.init($('#scrollNav'), {
    duration: 700
  })
})