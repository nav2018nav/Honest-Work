/*
 * HS Mega Menu - jQuery Plugin
 * @version: 1.0.0 (Sun, 26 Feb 2017)
 * @requires: jQuery v1.6 or later
 * @author: HtmlStream
 * @event-namespace: .HSMegaMenu
 * @browser-support: IE9+
 * @license:
 *
 * Copyright 2017 HtmlStream
 *
 */
; (function ($) {
  'use strict'


	/**
	 * Creates a mega menu.
	 *
	 * @constructor
	 * @param {HTMLElement|jQuery} element - The element to create the mega menu for.
	 * @param {Object} options - The options
	 */
  function MegaMenu(element, options) {

    var self = this

		/**
		 * Current element.
		 *
		 * @public
		 */
    this.$element = $(element)

		/**
		 * Current options set by the caller including defaults.
		 *
		 * @public
		 */
    this.options = $.extend(true, {}, MegaMenu.defaults, options)


		/**
		 * Collection of menu elements.
		 *
		 * @private
		 */
    this._items = $()


    Object.defineProperties(this, {

			/**
			 * Contains composed selector of menu items.
			 *
			 * @public
			 */
      itemsSelector: {
        get: function () {
          return self.options.classMap.hasSubMenu + ',' +
            self.options.classMap.hasMegaMenu
        }
      },

			/**
			 * Contains chain of active items.
			 *
			 * @private
			 */
      _tempChain: {
        value: null,
        writable: true
      },

			/**
			 * Contains current behavior state.
			 *
			 * @public
			 */
      state: {
        value: null,
        writable: true
      }

    })

    this.initialize()

  };


	/**
	 * Default options of the mega menu.
	 *
	 * @public
	 */
  MegaMenu.defaults = {
    event: 'hover',
    direction: 'horizontal',
    breakpoint: 991,
    animationIn: false,
    animationOut: false,

    rtl: false,
    hideTimeOut: 300,

    // For 'vertical' direction only
    sideBarRatio: 1 / 4,
    pageContainer: $('body'),

    classMap: {
      initialized: '.hs-menu-initialized',
      mobileState: '.hs-mobile-state',

      subMenu: '.hs-sub-menu',
      hasSubMenu: '.hs-has-sub-menu',
      hasSubMenuActive: '.hs-sub-menu-opened',

      megaMenu: '.hs-mega-menu',
      hasMegaMenu: '.hs-has-mega-menu',
      hasMegaMenuActive: '.hs-mega-menu-opened'
    },

    mobileSpeed: 400,
    mobileEasing: 'linear',

    beforeOpen: function () {},
    beforeClose: function () {},
    afterOpen: function () {},
    afterClose: function () {}
  }


	/**
	 * Initialization of the plugin.
	 *
	 * @protected
	 */
  MegaMenu.prototype.initialize = function () {

    var self = this,
      $w = $(window)

    if (this.options.rtl) this.$element.addClass('hs-rtl')

    this.$element
      .addClass(this.options.classMap.initialized.slice(1))
      .addClass('hs-menu-' + this.options.direction)



    // Independent events
    $w.on('resize.HSMegaMenu', function (e) {

      if (self.resizeTimeOutId) clearTimeout(self.resizeTimeOutId)

      self.resizeTimeOutId = setTimeout(function () {

        if (window.innerWidth <= self.options.breakpoint && self.state == 'desktop') self.initMobileBehavior()
        else if (window.innerWidth > self.options.breakpoint && self.state == 'mobile') self.initDesktopBehavior()

        self.refresh()

      }, 50)

    })

    $(document)
      .on('click.HSMegaMenu', function (e) {

        var $parents = $(e.target).parents(self.itemsSelector)
        self.closeAll($parents.add($(e.target)))

      })
      .on('keyup.HSMegaMenu', function (e) {
        if (e.keyCode && e.keyCode == 27) self.closeAll()
      })

    if (window.innerWidth <= this.options.breakpoint) this.initMobileBehavior()
    else if (window.innerWidth > this.options.breakpoint) this.initDesktopBehavior()

    this.smartPositions()

    return this

  }

  MegaMenu.prototype.smartPositions = function () {

    var self = this,
      $submenus = this.$element.find(this.options.classMap.subMenu)

    $submenus.each(function (i, el) {

      MenuItem.smartPosition($(el), self.options)

    })

  }

	/**
	 * Binding events to menu elements.
	 *
	 * @protected
	 */
  MegaMenu.prototype.bindEvents = function () {

    var self = this,
      selector

    // Hover case
    if (this.options.event === 'hover' && !_isTouch()) {
      this.$element
        .on(
          'mouseenter.HSMegaMenu',
          this.options.classMap.hasMegaMenu + ':not([data-event="click"]),' +
          this.options.classMap.hasSubMenu + ':not([data-event="click"])',
          function (e) {

            var $this = $(this),
              $chain = $this.parents(self.itemsSelector)

            // Lazy initialization
            if (!$this.data('HSMenuItem')) {
              self.initMenuItem($this, self.getType($this))
            }

            $chain = $chain.add($this)

            self.closeAll($chain)

            $chain.each(function (i, el) {

              var HSMenuItem = $(el).data('HSMenuItem')

              if (HSMenuItem.hideTimeOutId) clearTimeout(HSMenuItem.hideTimeOutId)
              HSMenuItem.show()

            })

            self._items = self._items.not($chain)
            self._tempChain = $chain

            e.preventDefault()
            e.stopPropagation()
          }
        )
        .on(
          'mouseleave.HSMegaMenu',
          this.options.classMap.hasMegaMenu + ':not([data-event="click"]),' +
          this.options.classMap.hasSubMenu + ':not([data-event="click"])',
          function (e) {

            var $this = $(this),
              HSMenuItem = $this.data('HSMenuItem'),
              $chain = $(e.relatedTarget).parents(self.itemsSelector)

            HSMenuItem.hideTimeOutId = setTimeout(function () {
              self.closeAll($chain)
            }, self.options.hideTimeOut)

            self._items = self._items.add(self._tempChain)
            self._tempChain = null

            e.preventDefault()
            e.stopPropagation()
          }
        )
        .on(
          'click.HSMegaMenu',
          this.options.classMap.hasMegaMenu + '[data-event="click"] > a, ' +
          this.options.classMap.hasSubMenu + '[data-event="click"] > a',
          function (e) {

            var $this = $(this).parent('[data-event="click"]'),
              HSMenuItem

            // Lazy initialization
            if (!$this.data('HSMenuItem')) {
              self.initMenuItem($this, self.getType($this))
            }


            self.closeAll($this.add(
              $this.parents(self.itemsSelector)
            ))

            HSMenuItem = $this
              .data('HSMenuItem')

            if (HSMenuItem.isOpened) {
              HSMenuItem.hide()
            }
            else {
              HSMenuItem.show()
            }


            e.preventDefault()
            e.stopPropagation()

          }
        )
    }
    // Click case
    else {

      this.$element
        .on(
          'click.HSMegaMenu',
          (_isTouch() ?
            this.options.classMap.hasMegaMenu + ' > a, ' +
            this.options.classMap.hasSubMenu + ' > a' :
            this.options.classMap.hasMegaMenu + ':not([data-event="hover"]) > a,' +
            this.options.classMap.hasSubMenu + ':not([data-event="hover"]) > a'),
          function (e) {

            var $this = $(this).parent(),
              HSMenuItem,
              $parents = $this.parents(self.itemsSelector)

            // Lazy initialization
            if (!$this.data('HSMenuItem')) {
              self.initMenuItem($this, self.getType($this))
            }

            self.closeAll($this.add(
              $this.parents(self.itemsSelector)
            ))

            HSMenuItem = $this
              .addClass('hs-event-prevented')
              .data('HSMenuItem')

            if (HSMenuItem.isOpened) {
              HSMenuItem.hide()
            }
            else {
              HSMenuItem.show()
            }

            e.preventDefault()
            e.stopPropagation()
          }
        )

      if (!_isTouch()) {
        this.$element
          .on(
            'mouseenter.HSMegaMenu',
            this.options.classMap.hasMegaMenu + '[data-event="hover"],' +
            this.options.classMap.hasSubMenu + '[data-event="hover"]',
            function (e) {

              var $this = $(this),
                $parents = $this.parents(self.itemsSelector)

              // Lazy initialization
              if (!$this.data('HSMenuItem')) {
                self.initMenuItem($this, self.getType($this))
              }

              self.closeAll($this.add($parents))

              $parents.add($this).each(function (i, el) {

                var HSMenuItem = $(el).data('HSMenuItem')

                if (HSMenuItem.hideTimeOutId) clearTimeout(HSMenuItem.hideTimeOutId)
                HSMenuItem.show()

              })

              e.preventDefault()
              e.stopPropagation()
            }
          )
          .on(
            'mouseleave.HSMegaMenu',
            this.options.classMap.hasMegaMenu + '[data-event="hover"],' +
            this.options.classMap.hasSubMenu + '[data-event="hover"]',
            function (e) {

              var $this = $(this),
                HSMenuItem = $this.data('HSMenuItem')

              HSMenuItem.hideTimeOutId = setTimeout(function () {

                self.closeAll(
                  $(e.relatedTarget).parents(self.itemsSelector)
                )

              }, self.options.hideTimeOut)

              e.preventDefault()
              e.stopPropagation()
            }
          )
      }
    }

  }

	/**
	 * Initialization of certain menu item.
	 *
	 * @protected
	 */
  MegaMenu.prototype.initMenuItem = function (element, type) {

    var self = this,
      Item = new MenuItem(
        element,
        element.children(
          self.options.classMap[type === 'mega-menu' ? 'megaMenu' : 'subMenu']
        ),
        $.extend(true, {type: type}, self.options, element.data()),
        self.$element
      )

    element.data('HSMenuItem', Item)
    this._items = this._items.add(element)

  }

	/**
	 * Destroys of desktop behavior, then makes initialization of mobile behavior.
	 *
	 * @protected
	 */
  MegaMenu.prototype.initMobileBehavior = function () {

    var self = this

    this.state = 'mobile'

    this.$element
      .off('.HSMegaMenu')
      .addClass(this.options.classMap.mobileState.slice(1))
      .on('click.HSMegaMenu', self.options.classMap.hasSubMenu + ' > a, ' + self.options.classMap.hasMegaMenu + ' > a', function (e) {

        var $this = $(this).parent(),
          MenuItemInstance

        // Lazy initialization
        if (!$this.data('HSMenuItem')) {
          self.initMenuItem($this, self.getType($this))
        }

        self.closeAll($this.parents(self.itemsSelector).add($this))

        MenuItemInstance = $this
          .data('HSMenuItem')

        console.log(MenuItemInstance.isOpened)

        if (MenuItemInstance.isOpened) {
          MenuItemInstance.mobileHide()
        }
        else {
          MenuItemInstance.mobileShow()
        }

        e.preventDefault()
        e.stopPropagation()

      })
      .find(this.itemsSelector)
      .not(
        this.options.classMap.hasSubMenuActive + ',' +
        this.options.classMap.hasMegaMenuActive
      )
      .children(
        this.options.classMap.subMenu + ',' +
        this.options.classMap.megaMenu
      )
      .hide()

  }

	/**
	 * Destroys of mobile behavior, then makes initialization of desktop behavior.
	 *
	 * @protected
	 */
  MegaMenu.prototype.initDesktopBehavior = function () {

    this.state = 'desktop'

    this.$element
      .removeClass(this.options.classMap.mobileState.slice(1))
      .off('.HSMegaMenu')
      .find(this.itemsSelector)
      .not(
        this.options.classMap.hasSubMenuActive + ',' +
        this.options.classMap.hasMegaMenuActive
      )
      .children(
        this.options.classMap.subMenu + ',' +
        this.options.classMap.megaMenu
      )
      .hide()

    this.bindEvents()

  }

	/**
	 * Hides all of opened submenus/megamenus.
	 *
	 * @param {jQuery} except - collection of elements, which shouldn't be closed.
	 * @return {jQuery}
	 * @public
	 */
  MegaMenu.prototype.closeAll = function (except) {

    var self = this

    return this._items.not(except && except.length ? except : $()).each(function (i, el) {

      $(el)
        .removeClass('hs-event-prevented')
        .data('HSMenuItem')[self.state == 'mobile' ? 'mobileHide' : 'hide']()

    })

  }

	/**
	 * Returns type of sub menu based on specified menu item.
	 *
	 * @param {jQuery} item
	 * @return {String|null}
	 * @public
	 */
  MegaMenu.prototype.getType = function (item) {

    if (!item || !item.length) return null

    return item.hasClass(this.options.classMap.hasSubMenu.slice(1)) ? 'sub-menu' :
      (item.hasClass(this.options.classMap.hasMegaMenu.slice(1)) ? 'mega-menu' : null)

  }

	/**
	 * Returns current menu state.
	 *
	 * @return {String}
	 * @public
	 */
  MegaMenu.prototype.getState = function () {
    return this.state
  }

	/**
	 * Updates bounds of all menu items.
	 *
	 * @return {jQuery}
	 * @public
	 */
  MegaMenu.prototype.refresh = function () {

    return this._items.add(this._tempChain).each(function (i, el) {
      $(el).data('HSMenuItem')._updateMenuBounds()
    })

  }


	/**
	 * Creates a mega-menu element.
	 *
	 * @param {jQuery} element
	 * @param {jQuery} menu
	 * @param {Object} options
	 * @param {jQuery} container
	 * @constructor
	 */
  function MenuItem(element, menu, options, container) {

    var self = this

		/**
		 * Current menu item element.
		 *
		 * @public
		 */
    this.$element = element

		/**
		 * Current mega menu element.
		 *
		 * @public
		 */
    this.menu = menu

		/**
		 * Item options.
		 *
		 * @public
		 */
    this.options = options


		/**
		 * MegaMenu container.
		 *
		 * @public
		 */
    this.$container = container

    Object.defineProperties(this, {

			/**
			 * Contains css class of menu item element.
			 *
			 * @public
			 */
      itemClass: {
        get: function () {
          return self.options.type === 'mega-menu' ?
            self.options.classMap.hasMegaMenu :
            self.options.classMap.hasSubMenu
        }
      },

			/**
			 * Contains css active-class of menu item element.
			 *
			 * @public
			 */
      activeItemClass: {
        get: function () {
          return self.options.type === 'mega-menu' ?
            self.options.classMap.hasMegaMenuActive :
            self.options.classMap.hasSubMenuActive
        }
      },

			/**
			 * Contains css class of menu element.
			 *
			 * @public
			 */
      menuClass: {
        get: function () {
          return self.options.type === 'mega-menu' ?
            self.options.classMap.megaMenu :
            self.options.classMap.subMenu
        }
      },

      isOpened: {
        get: function () {
          return this.$element.hasClass(this.activeItemClass.slice(1))
        }
      }

    })


    this.menu.addClass('animated').on('click.HSMegaMenu', function (e) {
      self._updateMenuBounds()
    })

    if (this.$element.data('max-width')) this.menu.css('max-width', this.$element.data('max-width'))
    if (this.$element.data('position')) this.menu.addClass('hs-position-' + this.$element.data('position'))


    if (this.options.animationOut) {

      this.menu.on('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function (e) {

        if (self.menu.hasClass(self.options.animationOut)) {
          self.$element.removeClass(self.activeItemClass.slice(1))
          self.options.afterClose.call(self, self.$element, self.menu)
        }

        if (self.menu.hasClass(self.options.animationIn)) {
          self.options.afterOpen.call(self, self.$element, self.menu)
        }

        e.stopPropagation()
        e.preventDefault()
      })
    }

  }

	/**
	 * Shows the mega-menu item.
	 *
	 * @public
	 * @return {MenuItem}
	 */
  MenuItem.prototype.show = function () {
    if (!this.menu.length) return this

    this.$element.addClass(this.activeItemClass.slice(1))

    if (this.options.direction == 'horizontal') this.smartPosition(this.menu, this.options)

    this._updateMenuBounds()

    if (this.options.animationOut) {
      this.menu.removeClass(this.options.animationOut)
    }
    else {
      this.options.afterOpen.call(this, this.$element, this.menu)
    }

    if (this.options.animationIn) this.menu.addClass(this.options.animationIn)

    return this
  }

	/**
	 * Hides the mega-menu item.
	 *
	 * @public
	 * @return {MenuItem}
	 */
  MenuItem.prototype.hide = function () {

    var self = this

    if (!this.menu.length) return this

    if (!this.options.animationOut) {
      this.$element.removeClass(this.activeItemClass.slice(1))
    }

    if (this.options.animationIn) this.menu.removeClass(this.options.animationIn)
    if (this.options.animationOut) {
      this.menu
        .addClass(this.options.animationOut)
    }
    else {
      this.options.afterClose.call(this, this.$element, this.menu)
    }

    return this
  }

	/**
	 * Shows the mega-menu item.
	 *
	 * @public
	 * @return {MenuItem}
	 */
  MenuItem.prototype.mobileShow = function () {
    var self = this

    if (!this.menu.length) return this



    this.menu
      .removeClass(this.options.animationIn)
      .removeClass(this.options.animationOut)
      .stop()
      .slideDown({
        duration: self.options.mobileSpeed,
        easing: self.options.mobileEasing,
        complete: function () {
          self.options.afterOpen.call(self, self.$element, self.menu)
        }
      })

    this.$element.addClass(this.activeItemClass.slice(1))

    return this
  }

	/**
	 * Hides the mega-menu item.
	 *
	 * @public
	 * @return {MenuItem}
	 */
  MenuItem.prototype.mobileHide = function () {
    var self = this

    if (!this.menu.length) return this

    this.menu.stop().slideUp({
      duration: self.options.mobileSpeed,
      easing: self.options.mobileEasing,
      complete: function () {
        self.options.afterClose.call(self, self.$element, self.menu)
      }
    })

    this.$element.removeClass(this.activeItemClass.slice(1))

    return this
  }

	/**
	 * Check, if element is in viewport.
	 *
	 * @param {jQuery} element
	 * @param {Object} options
	 * @public
	 */
  MenuItem.prototype.smartPosition = function (element, options) {

    MenuItem.smartPosition(element, options)

  }

	/**
	 * Check, if element is in viewport.
	 *
	 * @param {jQuery} element
	 * @param {Object} options
	 * @static
	 * @public
	 */
  MenuItem.smartPosition = function (element, options) {
    if (!element && !element.length) return

    var $w = $(window)

    element.removeClass('hs-reversed')

    if (!options.rtl) {

      if (element.offset().left + element.outerWidth() > window.innerWidth) {
        element.addClass('hs-reversed')
      }

    }
    else {

      if (element.offset().left < 0) {
        element.addClass('hs-reversed')
      }

    }
  }

	/**
	 * Updates bounds of current opened menu.
	 *
	 * @private
	 */
  MenuItem.prototype._updateMenuBounds = function () {

    var width = 'auto'

    if (this.options.direction == 'vertical' && this.options.type == 'mega-menu') {

      if (this.$container && this.$container.data('HSMegaMenu').getState() == 'desktop') {
        if (!this.options.pageContainer.length) this.options.pageContainer = $('body')
        width = this.options.pageContainer.outerWidth() * (1 - this.options.sideBarRatio)
      }
      else {
        width = 'auto'
      }


      this.menu.css({
        'width': width,
        'height': 'auto'
      })

      if (this.menu.outerHeight() > this.$container.outerHeight()) {
        return
      }

      this.menu.css('height', '100%')
    }

  }

	/**
	 * The jQuery plugin for the MegaMenu.
	 *
	 * @public
	 */
  $.fn.HSMegaMenu = function (options) {

    return this.each(function (i, el) {

      var $this = $(this)

      if (!$this.data('HSMegaMenu')) {
        $this.data('HSMegaMenu', new MegaMenu($this, options))
      }

    })

  }

	/**
	 * Helper function for detect touch events in the environment.
	 *
	 * @return {Boolean}
	 * @private
	 */
  function _isTouch() {
    return ('ontouchstart' in window)
  }

})(jQuery)

  /*
  == malihu jquery custom scrollbar plugin == 
  Version: 3.1.5 
  Plugin URI: http://manos.malihu.gr/jquery-custom-content-scroller 
  Author: malihu
  Author URI: http://manos.malihu.gr
  License: MIT License (MIT)
  */

  /*
  Copyright Manos Malihutsakis (email: manos@malihu.gr)
  
  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:
  
  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.
  
  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  THE SOFTWARE.
  */

  /*
  The code below is fairly long, fully commented and should be normally used in development. 
  For production, use either the minified jquery.mCustomScrollbar.min.js script or 
  the production-ready jquery.mCustomScrollbar.concat.min.js which contains the plugin 
  and dependencies (minified). 
  */

  (function (factory) {
    if (typeof define === "function" && define.amd) {
      define(["jquery"], factory)
    } else if (typeof module !== "undefined" && module.exports) {
      module.exports = factory
    } else {
      factory(jQuery, window, document)
    }
  }(function ($) {
    (function (init) {
      var _rjs = typeof define === "function" && define.amd, /* RequireJS */
        _njs = typeof module !== "undefined" && module.exports, /* NodeJS */
        _dlp = ("https:" == document.location.protocol) ? "https:" : "http:", /* location protocol */
        _url = "cdnjs.cloudflare.com/ajax/libs/jquery-mousewheel/3.1.13/jquery.mousewheel.min.js"
      if (!_rjs) {
        if (_njs) {
          require("jquery-mousewheel")($)
        } else {
          /* load jquery-mousewheel plugin (via CDN) if it's not present or not loaded via RequireJS 
          (works when mCustomScrollbar fn is called on window load) */
          $.event.special.mousewheel || $("head").append(decodeURI("%3Cscript src=" + _dlp + "//" + _url + "%3E%3C/script%3E"))
        }
      }
      init()
    }(function () {

      /* 
      ----------------------------------------
      PLUGIN NAMESPACE, PREFIX, DEFAULT SELECTOR(S) 
      ----------------------------------------
      */

      var pluginNS = "mCustomScrollbar",
        pluginPfx = "mCS",
        defaultSelector = ".mCustomScrollbar",





        /* 
        ----------------------------------------
        DEFAULT OPTIONS 
        ----------------------------------------
        */

        defaults = {
          /*
          set element/content width/height programmatically 
          values: boolean, pixels, percentage 
            option						default
            -------------------------------------
            setWidth					false
            setHeight					false
          */
          /*
          set the initial css top property of content  
          values: string (e.g. "-100px", "10%" etc.)
          */
          setTop: 0,
          /*
          set the initial css left property of content  
          values: string (e.g. "-100px", "10%" etc.)
          */
          setLeft: 0,
          /* 
          scrollbar axis (vertical and/or horizontal scrollbars) 
          values (string): "y", "x", "yx"
          */
          axis: "y",
          /*
          position of scrollbar relative to content  
          values (string): "inside", "outside" ("outside" requires elements with position:relative)
          */
          scrollbarPosition: "inside",
          /*
          scrolling inertia
          values: integer (milliseconds)
          */
          scrollInertia: 950,
          /* 
          auto-adjust scrollbar dragger length
          values: boolean
          */
          autoDraggerLength: true,
          /*
          auto-hide scrollbar when idle 
          values: boolean
            option						default
            -------------------------------------
            autoHideScrollbar			false
          */
          /*
          auto-expands scrollbar on mouse-over and dragging
          values: boolean
            option						default
            -------------------------------------
            autoExpandScrollbar			false
          */
          /*
          always show scrollbar, even when there's nothing to scroll 
          values: integer (0=disable, 1=always show dragger rail and buttons, 2=always show dragger rail, dragger and buttons), boolean
          */
          alwaysShowScrollbar: 0,
          /*
          scrolling always snaps to a multiple of this number in pixels
          values: integer, array ([y,x])
            option						default
            -------------------------------------
            snapAmount					null
          */
          /*
          when snapping, snap with this number in pixels as an offset 
          values: integer
          */
          snapOffset: 0,
          /* 
          mouse-wheel scrolling
          */
          mouseWheel: {
            /* 
            enable mouse-wheel scrolling
            values: boolean
            */
            enable: true,
            /* 
            scrolling amount in pixels
            values: "auto", integer 
            */
            scrollAmount: "auto",
            /* 
            mouse-wheel scrolling axis 
            the default scrolling direction when both vertical and horizontal scrollbars are present 
            values (string): "y", "x" 
            */
            axis: "y",
            /* 
            prevent the default behaviour which automatically scrolls the parent element(s) when end of scrolling is reached 
            values: boolean
              option						default
              -------------------------------------
              preventDefault				null
            */
            /*
            the reported mouse-wheel delta value. The number of lines (translated to pixels) one wheel notch scrolls.  
            values: "auto", integer 
            "auto" uses the default OS/browser value 
            */
            deltaFactor: "auto",
            /*
            normalize mouse-wheel delta to -1 or 1 (disables mouse-wheel acceleration) 
            values: boolean
              option						default
              -------------------------------------
              normalizeDelta				null
            */
            /*
            invert mouse-wheel scrolling direction 
            values: boolean
              option						default
              -------------------------------------
              invert						null
            */
            /*
            the tags that disable mouse-wheel when cursor is over them
            */
            disableOver: ["select", "option", "keygen", "datalist", "textarea"]
          },
          /* 
          scrollbar buttons
          */
          scrollButtons: {
            /*
            enable scrollbar buttons
            values: boolean
              option						default
              -------------------------------------
              enable						null
            */
            /*
            scrollbar buttons scrolling type 
            values (string): "stepless", "stepped"
            */
            scrollType: "stepless",
            /*
            scrolling amount in pixels
            values: "auto", integer 
            */
            scrollAmount: "auto"
            /*
            tabindex of the scrollbar buttons
            values: false, integer
              option						default
              -------------------------------------
              tabindex					null
            */
          },
          /* 
          keyboard scrolling
          */
          keyboard: {
            /*
            enable scrolling via keyboard
            values: boolean
            */
            enable: true,
            /*
            keyboard scrolling type 
            values (string): "stepless", "stepped"
            */
            scrollType: "stepless",
            /*
            scrolling amount in pixels
            values: "auto", integer 
            */
            scrollAmount: "auto"
          },
          /*
          enable content touch-swipe scrolling 
          values: boolean, integer, string (number)
          integer values define the axis-specific minimum amount required for scrolling momentum
          */
          contentTouchScroll: 25,
          /*
          enable/disable document (default) touch-swipe scrolling 
          */
          documentTouchScroll: true,
          /*
          advanced option parameters
          */
          advanced: {
            /*
            auto-expand content horizontally (for "x" or "yx" axis) 
            values: boolean, integer (the value 2 forces the non scrollHeight/scrollWidth method, the value 3 forces the scrollHeight/scrollWidth method)
              option						default
              -------------------------------------
              autoExpandHorizontalScroll	null
            */
            /*
            auto-scroll to elements with focus
            */
            autoScrollOnFocus: "input,textarea,select,button,datalist,keygen,a[tabindex],area,object,[contenteditable='true']",
            /*
            auto-update scrollbars on content, element or viewport resize 
            should be true for fluid layouts/elements, adding/removing content dynamically, hiding/showing elements, content with images etc. 
            values: boolean
            */
            updateOnContentResize: true,
            /*
            auto-update scrollbars each time each image inside the element is fully loaded 
            values: "auto", boolean
            */
            updateOnImageLoad: "auto",
            /*
            auto-update scrollbars based on the amount and size changes of specific selectors 
            useful when you need to update the scrollbar(s) automatically, each time a type of element is added, removed or changes its size 
            values: boolean, string (e.g. "ul li" will auto-update scrollbars each time list-items inside the element are changed) 
            a value of true (boolean) will auto-update scrollbars each time any element is changed
              option						default
              -------------------------------------
              updateOnSelectorChange		null
            */
            /*
            extra selectors that'll allow scrollbar dragging upon mousemove/up, pointermove/up, touchend etc. (e.g. "selector-1, selector-2")
              option						default
              -------------------------------------
              extraDraggableSelectors		null
            */
            /*
            extra selectors that'll release scrollbar dragging upon mouseup, pointerup, touchend etc. (e.g. "selector-1, selector-2")
              option						default
              -------------------------------------
              releaseDraggableSelectors	null
            */
            /*
            auto-update timeout 
            values: integer (milliseconds)
            */
            autoUpdateTimeout: 60
          },
          /* 
          scrollbar theme 
          values: string (see CSS/plugin URI for a list of ready-to-use themes)
          */
          theme: "light",
          /*
          user defined callback functions
          */
          callbacks: {
            /*
            Available callbacks: 
              callback					default
              -------------------------------------
              onCreate					null
              onInit						null
              onScrollStart				null
              onScroll					null
              onTotalScroll				null
              onTotalScrollBack			null
              whileScrolling				null
              onOverflowY					null
              onOverflowX					null
              onOverflowYNone				null
              onOverflowXNone				null
              onImageLoad					null
              onSelectorChange			null
              onBeforeUpdate				null
              onUpdate					null
            */
            onTotalScrollOffset: 0,
            onTotalScrollBackOffset: 0,
            alwaysTriggerOffsets: true
          }
          /*
          add scrollbar(s) on all elements matching the current selector, now and in the future 
          values: boolean, string 
          string values: "on" (enable), "once" (disable after first invocation), "off" (disable)
          liveSelector values: string (selector)
            option						default
            -------------------------------------
            live						false
            liveSelector				null
          */
        },





        /* 
        ----------------------------------------
        VARS, CONSTANTS 
        ----------------------------------------
        */

        totalInstances = 0, /* plugin instances amount */
        liveTimers = {}, /* live option timers */
        oldIE = (window.attachEvent && !window.addEventListener) ? 1 : 0, /* detect IE < 9 */
        touchActive = false, touchable, /* global touch vars (for touch and pointer events) */
        /* general plugin classes */
        classes = [
          "mCSB_dragger_onDrag", "mCSB_scrollTools_onDrag", "mCS_img_loaded", "mCS_disabled", "mCS_destroyed", "mCS_no_scrollbar",
          "mCS-autoHide", "mCS-dir-rtl", "mCS_no_scrollbar_y", "mCS_no_scrollbar_x", "mCS_y_hidden", "mCS_x_hidden", "mCSB_draggerContainer",
          "mCSB_buttonUp", "mCSB_buttonDown", "mCSB_buttonLeft", "mCSB_buttonRight"
        ],





        /* 
        ----------------------------------------
        METHODS 
        ----------------------------------------
        */

        methods = {

          /* 
          plugin initialization method 
          creates the scrollbar(s), plugin data object and options
          ----------------------------------------
          */

          init: function (options) {

            var options = $.extend(true, {}, defaults, options),
              selector = _selector.call(this) /* validate selector */

            /* 
            if live option is enabled, monitor for elements matching the current selector and 
            apply scrollbar(s) when found (now and in the future) 
            */
            if (options.live) {
              var liveSelector = options.liveSelector || this.selector || defaultSelector, /* live selector(s) */
                $liveSelector = $(liveSelector) /* live selector(s) as jquery object */
              if (options.live === "off") {
                /* 
                disable live if requested 
                usage: $(selector).mCustomScrollbar({live:"off"}); 
                */
                removeLiveTimers(liveSelector)
                return
              }
              liveTimers[liveSelector] = setTimeout(function () {
                /* call mCustomScrollbar fn on live selector(s) every half-second */
                $liveSelector.mCustomScrollbar(options)
                if (options.live === "once" && $liveSelector.length) {
                  /* disable live after first invocation */
                  removeLiveTimers(liveSelector)
                }
              }, 500)
            } else {
              removeLiveTimers(liveSelector)
            }

            /* options backward compatibility (for versions < 3.0.0) and normalization */
            options.setWidth = (options.set_width) ? options.set_width : options.setWidth
            options.setHeight = (options.set_height) ? options.set_height : options.setHeight
            options.axis = (options.horizontalScroll) ? "x" : _findAxis(options.axis)
            options.scrollInertia = options.scrollInertia > 0 && options.scrollInertia < 17 ? 17 : options.scrollInertia
            if (typeof options.mouseWheel !== "object" && options.mouseWheel == true) { /* old school mouseWheel option (non-object) */
              options.mouseWheel = {enable: true, scrollAmount: "auto", axis: "y", preventDefault: false, deltaFactor: "auto", normalizeDelta: false, invert: false}
            }
            options.mouseWheel.scrollAmount = !options.mouseWheelPixels ? options.mouseWheel.scrollAmount : options.mouseWheelPixels
            options.mouseWheel.normalizeDelta = !options.advanced.normalizeMouseWheelDelta ? options.mouseWheel.normalizeDelta : options.advanced.normalizeMouseWheelDelta
            options.scrollButtons.scrollType = _findScrollButtonsType(options.scrollButtons.scrollType)

            _theme(options) /* theme-specific options */

            /* plugin constructor */
            return $(selector).each(function () {

              var $this = $(this)

              if (!$this.data(pluginPfx)) { /* prevent multiple instantiations */

                /* store options and create objects in jquery data */
                $this.data(pluginPfx, {
                  idx: ++totalInstances, /* instance index */
                  opt: options, /* options */
                  scrollRatio: {y: null, x: null}, /* scrollbar to content ratio */
                  overflowed: null, /* overflowed axis */
                  contentReset: {y: null, x: null}, /* object to check when content resets */
                  bindEvents: false, /* object to check if events are bound */
                  tweenRunning: false, /* object to check if tween is running */
                  sequential: {}, /* sequential scrolling object */
                  langDir: $this.css("direction"), /* detect/store direction (ltr or rtl) */
                  cbOffsets: null, /* object to check whether callback offsets always trigger */
                  /* 
                  object to check how scrolling events where last triggered 
                  "internal" (default - triggered by this script), "external" (triggered by other scripts, e.g. via scrollTo method) 
                  usage: object.data("mCS").trigger
                  */
                  trigger: null,
                  /* 
                  object to check for changes in elements in order to call the update method automatically 
                  */
                  poll: {size: {o: 0, n: 0}, img: {o: 0, n: 0}, change: {o: 0, n: 0}}
                })

                var d = $this.data(pluginPfx), o = d.opt,
                  /* HTML data attributes */
                  htmlDataAxis = $this.data("mcs-axis"), htmlDataSbPos = $this.data("mcs-scrollbar-position"), htmlDataTheme = $this.data("mcs-theme")

                if (htmlDataAxis) {o.axis = htmlDataAxis} /* usage example: data-mcs-axis="y" */
                if (htmlDataSbPos) {o.scrollbarPosition = htmlDataSbPos} /* usage example: data-mcs-scrollbar-position="outside" */
                if (htmlDataTheme) { /* usage example: data-mcs-theme="minimal" */
                  o.theme = htmlDataTheme
                  _theme(o) /* theme-specific options */
                }

                _pluginMarkup.call(this) /* add plugin markup */

                if (d && o.callbacks.onCreate && typeof o.callbacks.onCreate === "function") {o.callbacks.onCreate.call(this)} /* callbacks: onCreate */

                $("#mCSB_" + d.idx + "_container img:not(." + classes[2] + ")").addClass(classes[2]) /* flag loaded images */

                methods.update.call(null, $this) /* call the update method */

              }

            })

          },
          /* ---------------------------------------- */



          /* 
          plugin update method 
          updates content and scrollbar(s) values, events and status 
          ----------------------------------------
          usage: $(selector).mCustomScrollbar("update");
          */

          update: function (el, cb) {

            var selector = el || _selector.call(this) /* validate selector */

            return $(selector).each(function () {

              var $this = $(this)

              if ($this.data(pluginPfx)) { /* check if plugin has initialized */

                var d = $this.data(pluginPfx), o = d.opt,
                  mCSB_container = $("#mCSB_" + d.idx + "_container"),
                  mCustomScrollBox = $("#mCSB_" + d.idx),
                  mCSB_dragger = [$("#mCSB_" + d.idx + "_dragger_vertical"), $("#mCSB_" + d.idx + "_dragger_horizontal")]

                if (!mCSB_container.length) {return }

                if (d.tweenRunning) {_stop($this)} /* stop any running tweens while updating */

                if (cb && d && o.callbacks.onBeforeUpdate && typeof o.callbacks.onBeforeUpdate === "function") {o.callbacks.onBeforeUpdate.call(this)} /* callbacks: onBeforeUpdate */

                /* if element was disabled or destroyed, remove class(es) */
                if ($this.hasClass(classes[3])) {$this.removeClass(classes[3])}
                if ($this.hasClass(classes[4])) {$this.removeClass(classes[4])}

                /* css flexbox fix, detect/set max-height */
                mCustomScrollBox.css("max-height", "none")
                if (mCustomScrollBox.height() !== $this.height()) {mCustomScrollBox.css("max-height", $this.height())}

                _expandContentHorizontally.call(this) /* expand content horizontally */

                if (o.axis !== "y" && !o.advanced.autoExpandHorizontalScroll) {
                  mCSB_container.css("width", _contentWidth(mCSB_container))
                }

                d.overflowed = _overflowed.call(this) /* determine if scrolling is required */

                _scrollbarVisibility.call(this) /* show/hide scrollbar(s) */

                /* auto-adjust scrollbar dragger length analogous to content */
                if (o.autoDraggerLength) {_setDraggerLength.call(this)}

                _scrollRatio.call(this) /* calculate and store scrollbar to content ratio */

                _bindEvents.call(this) /* bind scrollbar events */

                /* reset scrolling position and/or events */
                var to = [Math.abs(mCSB_container[0].offsetTop), Math.abs(mCSB_container[0].offsetLeft)]
                if (o.axis !== "x") { /* y/yx axis */
                  if (!d.overflowed[0]) { /* y scrolling is not required */
                    _resetContentPosition.call(this) /* reset content position */
                    if (o.axis === "y") {
                      _unbindEvents.call(this)
                    } else if (o.axis === "yx" && d.overflowed[1]) {
                      _scrollTo($this, to[1].toString(), {dir: "x", dur: 0, overwrite: "none"})
                    }
                  } else if (mCSB_dragger[0].height() > mCSB_dragger[0].parent().height()) {
                    _resetContentPosition.call(this) /* reset content position */
                  } else { /* y scrolling is required */
                    _scrollTo($this, to[0].toString(), {dir: "y", dur: 0, overwrite: "none"})
                    d.contentReset.y = null
                  }
                }
                if (o.axis !== "y") { /* x/yx axis */
                  if (!d.overflowed[1]) { /* x scrolling is not required */
                    _resetContentPosition.call(this) /* reset content position */
                    if (o.axis === "x") {
                      _unbindEvents.call(this)
                    } else if (o.axis === "yx" && d.overflowed[0]) {
                      _scrollTo($this, to[0].toString(), {dir: "y", dur: 0, overwrite: "none"})
                    }
                  } else if (mCSB_dragger[1].width() > mCSB_dragger[1].parent().width()) {
                    _resetContentPosition.call(this) /* reset content position */
                  } else { /* x scrolling is required */
                    _scrollTo($this, to[1].toString(), {dir: "x", dur: 0, overwrite: "none"})
                    d.contentReset.x = null
                  }
                }

                /* callbacks: onImageLoad, onSelectorChange, onUpdate */
                if (cb && d) {
                  if (cb === 2 && o.callbacks.onImageLoad && typeof o.callbacks.onImageLoad === "function") {
                    o.callbacks.onImageLoad.call(this)
                  } else if (cb === 3 && o.callbacks.onSelectorChange && typeof o.callbacks.onSelectorChange === "function") {
                    o.callbacks.onSelectorChange.call(this)
                  } else if (o.callbacks.onUpdate && typeof o.callbacks.onUpdate === "function") {
                    o.callbacks.onUpdate.call(this)
                  }
                }

                _autoUpdate.call(this) /* initialize automatic updating (for dynamic content, fluid layouts etc.) */

              }

            })

          },
          /* ---------------------------------------- */



          /* 
          plugin scrollTo method 
          triggers a scrolling event to a specific value
          ----------------------------------------
          usage: $(selector).mCustomScrollbar("scrollTo",value,options);
          */

          scrollTo: function (val, options) {

            /* prevent silly things like $(selector).mCustomScrollbar("scrollTo",undefined); */
            if (typeof val == "undefined" || val == null) {return }

            var selector = _selector.call(this) /* validate selector */

            return $(selector).each(function () {

              var $this = $(this)

              if ($this.data(pluginPfx)) { /* check if plugin has initialized */

                var d = $this.data(pluginPfx), o = d.opt,
                  /* method default options */
                  methodDefaults = {
                    trigger: "external", /* method is by default triggered externally (e.g. from other scripts) */
                    scrollInertia: o.scrollInertia, /* scrolling inertia (animation duration) */
                    scrollEasing: "mcsEaseInOut", /* animation easing */
                    moveDragger: false, /* move dragger instead of content */
                    timeout: 60, /* scroll-to delay */
                    callbacks: true, /* enable/disable callbacks */
                    onStart: true,
                    onUpdate: true,
                    onComplete: true
                  },
                  methodOptions = $.extend(true, {}, methodDefaults, options),
                  to = _arr.call(this, val), dur = methodOptions.scrollInertia > 0 && methodOptions.scrollInertia < 17 ? 17 : methodOptions.scrollInertia

                /* translate yx values to actual scroll-to positions */
                to[0] = _to.call(this, to[0], "y")
                to[1] = _to.call(this, to[1], "x")

                /* 
                check if scroll-to value moves the dragger instead of content. 
                Only pixel values apply on dragger (e.g. 100, "100px", "-=100" etc.) 
                */
                if (methodOptions.moveDragger) {
                  to[0] *= d.scrollRatio.y
                  to[1] *= d.scrollRatio.x
                }

                methodOptions.dur = _isTabHidden() ? 0 : dur //skip animations if browser tab is hidden

                setTimeout(function () {
                  /* do the scrolling */
                  if (to[0] !== null && typeof to[0] !== "undefined" && o.axis !== "x" && d.overflowed[0]) { /* scroll y */
                    methodOptions.dir = "y"
                    methodOptions.overwrite = "all"
                    _scrollTo($this, to[0].toString(), methodOptions)
                  }
                  if (to[1] !== null && typeof to[1] !== "undefined" && o.axis !== "y" && d.overflowed[1]) { /* scroll x */
                    methodOptions.dir = "x"
                    methodOptions.overwrite = "none"
                    _scrollTo($this, to[1].toString(), methodOptions)
                  }
                }, methodOptions.timeout)

              }

            })

          },
          /* ---------------------------------------- */



          /*
          plugin stop method 
          stops scrolling animation
          ----------------------------------------
          usage: $(selector).mCustomScrollbar("stop");
          */
          stop: function () {

            var selector = _selector.call(this) /* validate selector */

            return $(selector).each(function () {

              var $this = $(this)

              if ($this.data(pluginPfx)) { /* check if plugin has initialized */

                _stop($this)

              }

            })

          },
          /* ---------------------------------------- */



          /*
          plugin disable method 
          temporarily disables the scrollbar(s) 
          ----------------------------------------
          usage: $(selector).mCustomScrollbar("disable",reset); 
          reset (boolean): resets content position to 0 
          */
          disable: function (r) {

            var selector = _selector.call(this) /* validate selector */

            return $(selector).each(function () {

              var $this = $(this)

              if ($this.data(pluginPfx)) { /* check if plugin has initialized */

                var d = $this.data(pluginPfx)

                _autoUpdate.call(this, "remove") /* remove automatic updating */

                _unbindEvents.call(this) /* unbind events */

                if (r) {_resetContentPosition.call(this)} /* reset content position */

                _scrollbarVisibility.call(this, true) /* show/hide scrollbar(s) */

                $this.addClass(classes[3]) /* add disable class */

              }

            })

          },
          /* ---------------------------------------- */



          /*
          plugin destroy method 
          completely removes the scrollbar(s) and returns the element to its original state
          ----------------------------------------
          usage: $(selector).mCustomScrollbar("destroy"); 
          */
          destroy: function () {

            var selector = _selector.call(this) /* validate selector */

            return $(selector).each(function () {

              var $this = $(this)

              if ($this.data(pluginPfx)) { /* check if plugin has initialized */

                var d = $this.data(pluginPfx), o = d.opt,
                  mCustomScrollBox = $("#mCSB_" + d.idx),
                  mCSB_container = $("#mCSB_" + d.idx + "_container"),
                  scrollbar = $(".mCSB_" + d.idx + "_scrollbar")

                if (o.live) {removeLiveTimers(o.liveSelector || $(selector).selector)} /* remove live timers */

                _autoUpdate.call(this, "remove") /* remove automatic updating */

                _unbindEvents.call(this) /* unbind events */

                _resetContentPosition.call(this) /* reset content position */

                $this.removeData(pluginPfx) /* remove plugin data object */

                _delete(this, "mcs") /* delete callbacks object */

                /* remove plugin markup */
                scrollbar.remove() /* remove scrollbar(s) first (those can be either inside or outside plugin's inner wrapper) */
                mCSB_container.find("img." + classes[2]).removeClass(classes[2]) /* remove loaded images flag */
                mCustomScrollBox.replaceWith(mCSB_container.contents()) /* replace plugin's inner wrapper with the original content */
                /* remove plugin classes from the element and add destroy class */
                $this.removeClass(pluginNS + " _" + pluginPfx + "_" + d.idx + " " + classes[6] + " " + classes[7] + " " + classes[5] + " " + classes[3]).addClass(classes[4])

              }

            })

          }
          /* ---------------------------------------- */

        },





        /* 
        ----------------------------------------
        FUNCTIONS
        ----------------------------------------
        */

        /* validates selector (if selector is invalid or undefined uses the default one) */
        _selector = function () {
          return (typeof $(this) !== "object" || $(this).length < 1) ? defaultSelector : this
        },
        /* -------------------- */


        /* changes options according to theme */
        _theme = function (obj) {
          var fixedSizeScrollbarThemes = ["rounded", "rounded-dark", "rounded-dots", "rounded-dots-dark"],
            nonExpandedScrollbarThemes = ["rounded-dots", "rounded-dots-dark", "3d", "3d-dark", "3d-thick", "3d-thick-dark", "inset", "inset-dark", "inset-2", "inset-2-dark", "inset-3", "inset-3-dark"],
            disabledScrollButtonsThemes = ["minimal", "minimal-dark"],
            enabledAutoHideScrollbarThemes = ["minimal", "minimal-dark"],
            scrollbarPositionOutsideThemes = ["minimal", "minimal-dark"]
          obj.autoDraggerLength = $.inArray(obj.theme, fixedSizeScrollbarThemes) > -1 ? false : obj.autoDraggerLength
          obj.autoExpandScrollbar = $.inArray(obj.theme, nonExpandedScrollbarThemes) > -1 ? false : obj.autoExpandScrollbar
          obj.scrollButtons.enable = $.inArray(obj.theme, disabledScrollButtonsThemes) > -1 ? false : obj.scrollButtons.enable
          obj.autoHideScrollbar = $.inArray(obj.theme, enabledAutoHideScrollbarThemes) > -1 ? true : obj.autoHideScrollbar
          obj.scrollbarPosition = $.inArray(obj.theme, scrollbarPositionOutsideThemes) > -1 ? "outside" : obj.scrollbarPosition
        },
        /* -------------------- */


        /* live option timers removal */
        removeLiveTimers = function (selector) {
          if (liveTimers[selector]) {
            clearTimeout(liveTimers[selector])
            _delete(liveTimers, selector)
          }
        },
        /* -------------------- */


        /* normalizes axis option to valid values: "y", "x", "yx" */
        _findAxis = function (val) {
          return (val === "yx" || val === "xy" || val === "auto") ? "yx" : (val === "x" || val === "horizontal") ? "x" : "y"
        },
        /* -------------------- */


        /* normalizes scrollButtons.scrollType option to valid values: "stepless", "stepped" */
        _findScrollButtonsType = function (val) {
          return (val === "stepped" || val === "pixels" || val === "step" || val === "click") ? "stepped" : "stepless"
        },
        /* -------------------- */


        /* generates plugin markup */
        _pluginMarkup = function () {
          var $this = $(this), d = $this.data(pluginPfx), o = d.opt,
            expandClass = o.autoExpandScrollbar ? " " + classes[1] + "_expand" : "",
            scrollbar = ["<div id='mCSB_" + d.idx + "_scrollbar_vertical' class='mCSB_scrollTools mCSB_" + d.idx + "_scrollbar mCS-" + o.theme + " mCSB_scrollTools_vertical" + expandClass + "'><div class='" + classes[12] + "'><div id='mCSB_" + d.idx + "_dragger_vertical' class='mCSB_dragger' style='position:absolute;'><div class='mCSB_dragger_bar' /></div><div class='mCSB_draggerRail' /></div></div>", "<div id='mCSB_" + d.idx + "_scrollbar_horizontal' class='mCSB_scrollTools mCSB_" + d.idx + "_scrollbar mCS-" + o.theme + " mCSB_scrollTools_horizontal" + expandClass + "'><div class='" + classes[12] + "'><div id='mCSB_" + d.idx + "_dragger_horizontal' class='mCSB_dragger' style='position:absolute;'><div class='mCSB_dragger_bar' /></div><div class='mCSB_draggerRail' /></div></div>"],
            wrapperClass = o.axis === "yx" ? "mCSB_vertical_horizontal" : o.axis === "x" ? "mCSB_horizontal" : "mCSB_vertical",
            scrollbars = o.axis === "yx" ? scrollbar[0] + scrollbar[1] : o.axis === "x" ? scrollbar[1] : scrollbar[0],
            contentWrapper = o.axis === "yx" ? "<div id='mCSB_" + d.idx + "_container_wrapper' class='mCSB_container_wrapper' />" : "",
            autoHideClass = o.autoHideScrollbar ? " " + classes[6] : "",
            scrollbarDirClass = (o.axis !== "x" && d.langDir === "rtl") ? " " + classes[7] : ""
          if (o.setWidth) {$this.css("width", o.setWidth)} /* set element width */
          if (o.setHeight) {$this.css("height", o.setHeight)} /* set element height */
          o.setLeft = (o.axis !== "y" && d.langDir === "rtl") ? "989999px" : o.setLeft /* adjust left position for rtl direction */
          $this.addClass(pluginNS + " _" + pluginPfx + "_" + d.idx + autoHideClass + scrollbarDirClass).wrapInner("<div id='mCSB_" + d.idx + "' class='mCustomScrollBox mCS-" + o.theme + " " + wrapperClass + "'><div id='mCSB_" + d.idx + "_container' class='mCSB_container' style='position:relative; top:" + o.setTop + "; left:" + o.setLeft + ";' dir='" + d.langDir + "' /></div>")
          var mCustomScrollBox = $("#mCSB_" + d.idx),
            mCSB_container = $("#mCSB_" + d.idx + "_container")
          if (o.axis !== "y" && !o.advanced.autoExpandHorizontalScroll) {
            mCSB_container.css("width", _contentWidth(mCSB_container))
          }
          if (o.scrollbarPosition === "outside") {
            if ($this.css("position") === "static") { /* requires elements with non-static position */
              $this.css("position", "relative")
            }
            $this.css("overflow", "visible")
            mCustomScrollBox.addClass("mCSB_outside").after(scrollbars)
          } else {
            mCustomScrollBox.addClass("mCSB_inside").append(scrollbars)
            mCSB_container.wrap(contentWrapper)
          }
          _scrollButtons.call(this) /* add scrollbar buttons */
          /* minimum dragger length */
          var mCSB_dragger = [$("#mCSB_" + d.idx + "_dragger_vertical"), $("#mCSB_" + d.idx + "_dragger_horizontal")]
          mCSB_dragger[0].css("min-height", mCSB_dragger[0].height())
          mCSB_dragger[1].css("min-width", mCSB_dragger[1].width())
        },
        /* -------------------- */


        /* calculates content width */
        _contentWidth = function (el) {
          var val = [el[0].scrollWidth, Math.max.apply(Math, el.children().map(function () {return $(this).outerWidth(true)}).get())], w = el.parent().width()
          return val[0] > w ? val[0] : val[1] > w ? val[1] : "100%"
        },
        /* -------------------- */


        /* expands content horizontally */
        _expandContentHorizontally = function () {
          var $this = $(this), d = $this.data(pluginPfx), o = d.opt,
            mCSB_container = $("#mCSB_" + d.idx + "_container")
          if (o.advanced.autoExpandHorizontalScroll && o.axis !== "y") {
            /* calculate scrollWidth */
            mCSB_container.css({"width": "auto", "min-width": 0, "overflow-x": "scroll"})
            var w = Math.ceil(mCSB_container[0].scrollWidth)
            if (o.advanced.autoExpandHorizontalScroll === 3 || (o.advanced.autoExpandHorizontalScroll !== 2 && w > mCSB_container.parent().width())) {
              mCSB_container.css({"width": w, "min-width": "100%", "overflow-x": "inherit"})
            } else {
              /* 
              wrap content with an infinite width div and set its position to absolute and width to auto. 
              Setting width to auto before calculating the actual width is important! 
              We must let the browser set the width as browser zoom values are impossible to calculate.
              */
              mCSB_container.css({"overflow-x": "inherit", "position": "absolute"})
                .wrap("<div class='mCSB_h_wrapper' style='position:relative; left:0; width:999999px;' />")
                .css({ /* set actual width, original position and un-wrap */
                  /* 
                  get the exact width (with decimals) and then round-up. 
                  Using jquery outerWidth() will round the width value which will mess up with inner elements that have non-integer width
                  */
                  "width": (Math.ceil(mCSB_container[0].getBoundingClientRect().right + 0.4) - Math.floor(mCSB_container[0].getBoundingClientRect().left)),
                  "min-width": "100%",
                  "position": "relative"
                }).unwrap()
            }
          }
        },
        /* -------------------- */


        /* adds scrollbar buttons */
        _scrollButtons = function () {
          var $this = $(this), d = $this.data(pluginPfx), o = d.opt,
            mCSB_scrollTools = $(".mCSB_" + d.idx + "_scrollbar:first"),
            tabindex = !_isNumeric(o.scrollButtons.tabindex) ? "" : "tabindex='" + o.scrollButtons.tabindex + "'",
            btnHTML = [
              "<a href='#' class='" + classes[13] + "' " + tabindex + " />",
              "<a href='#' class='" + classes[14] + "' " + tabindex + " />",
              "<a href='#' class='" + classes[15] + "' " + tabindex + " />",
              "<a href='#' class='" + classes[16] + "' " + tabindex + " />"
            ],
            btn = [(o.axis === "x" ? btnHTML[2] : btnHTML[0]), (o.axis === "x" ? btnHTML[3] : btnHTML[1]), btnHTML[2], btnHTML[3]]
          if (o.scrollButtons.enable) {
            mCSB_scrollTools.prepend(btn[0]).append(btn[1]).next(".mCSB_scrollTools").prepend(btn[2]).append(btn[3])
          }
        },
        /* -------------------- */


        /* auto-adjusts scrollbar dragger length */
        _setDraggerLength = function () {
          var $this = $(this), d = $this.data(pluginPfx),
            mCustomScrollBox = $("#mCSB_" + d.idx),
            mCSB_container = $("#mCSB_" + d.idx + "_container"),
            mCSB_dragger = [$("#mCSB_" + d.idx + "_dragger_vertical"), $("#mCSB_" + d.idx + "_dragger_horizontal")],
            ratio = [mCustomScrollBox.height() / mCSB_container.outerHeight(false), mCustomScrollBox.width() / mCSB_container.outerWidth(false)],
            l = [
              parseInt(mCSB_dragger[0].css("min-height")), Math.round(ratio[0] * mCSB_dragger[0].parent().height()),
              parseInt(mCSB_dragger[1].css("min-width")), Math.round(ratio[1] * mCSB_dragger[1].parent().width())
            ],
            h = oldIE && (l[1] < l[0]) ? l[0] : l[1], w = oldIE && (l[3] < l[2]) ? l[2] : l[3]
          mCSB_dragger[0].css({
            "height": h, "max-height": (mCSB_dragger[0].parent().height() - 10)
          }).find(".mCSB_dragger_bar").css({"line-height": l[0] + "px"})
          mCSB_dragger[1].css({
            "width": w, "max-width": (mCSB_dragger[1].parent().width() - 10)
          })
        },
        /* -------------------- */


        /* calculates scrollbar to content ratio */
        _scrollRatio = function () {
          var $this = $(this), d = $this.data(pluginPfx),
            mCustomScrollBox = $("#mCSB_" + d.idx),
            mCSB_container = $("#mCSB_" + d.idx + "_container"),
            mCSB_dragger = [$("#mCSB_" + d.idx + "_dragger_vertical"), $("#mCSB_" + d.idx + "_dragger_horizontal")],
            scrollAmount = [mCSB_container.outerHeight(false) - mCustomScrollBox.height(), mCSB_container.outerWidth(false) - mCustomScrollBox.width()],
            ratio = [
              scrollAmount[0] / (mCSB_dragger[0].parent().height() - mCSB_dragger[0].height()),
              scrollAmount[1] / (mCSB_dragger[1].parent().width() - mCSB_dragger[1].width())
            ]
          d.scrollRatio = {y: ratio[0], x: ratio[1]}
        },
        /* -------------------- */


        /* toggles scrolling classes */
        _onDragClasses = function (el, action, xpnd) {
          var expandClass = xpnd ? classes[0] + "_expanded" : "",
            scrollbar = el.closest(".mCSB_scrollTools")
          if (action === "active") {
            el.toggleClass(classes[0] + " " + expandClass); scrollbar.toggleClass(classes[1])
            el[0]._draggable = el[0]._draggable ? 0 : 1
          } else {
            if (!el[0]._draggable) {
              if (action === "hide") {
                el.removeClass(classes[0]); scrollbar.removeClass(classes[1])
              } else {
                el.addClass(classes[0]); scrollbar.addClass(classes[1])
              }
            }
          }
        },
        /* -------------------- */


        /* checks if content overflows its container to determine if scrolling is required */
        _overflowed = function () {
          var $this = $(this), d = $this.data(pluginPfx),
            mCustomScrollBox = $("#mCSB_" + d.idx),
            mCSB_container = $("#mCSB_" + d.idx + "_container"),
            contentHeight = d.overflowed == null ? mCSB_container.height() : mCSB_container.outerHeight(false),
            contentWidth = d.overflowed == null ? mCSB_container.width() : mCSB_container.outerWidth(false),
            h = mCSB_container[0].scrollHeight, w = mCSB_container[0].scrollWidth
          if (h > contentHeight) {contentHeight = h}
          if (w > contentWidth) {contentWidth = w}
          return [contentHeight > mCustomScrollBox.height(), contentWidth > mCustomScrollBox.width()]
        },
        /* -------------------- */


        /* resets content position to 0 */
        _resetContentPosition = function () {
          var $this = $(this), d = $this.data(pluginPfx), o = d.opt,
            mCustomScrollBox = $("#mCSB_" + d.idx),
            mCSB_container = $("#mCSB_" + d.idx + "_container"),
            mCSB_dragger = [$("#mCSB_" + d.idx + "_dragger_vertical"), $("#mCSB_" + d.idx + "_dragger_horizontal")]
          _stop($this) /* stop any current scrolling before resetting */
          if ((o.axis !== "x" && !d.overflowed[0]) || (o.axis === "y" && d.overflowed[0])) { /* reset y */
            mCSB_dragger[0].add(mCSB_container).css("top", 0)
            _scrollTo($this, "_resetY")
          }
          if ((o.axis !== "y" && !d.overflowed[1]) || (o.axis === "x" && d.overflowed[1])) { /* reset x */
            var cx = dx = 0
            if (d.langDir === "rtl") { /* adjust left position for rtl direction */
              cx = mCustomScrollBox.width() - mCSB_container.outerWidth(false)
              dx = Math.abs(cx / d.scrollRatio.x)
            }
            mCSB_container.css("left", cx)
            mCSB_dragger[1].css("left", dx)
            _scrollTo($this, "_resetX")
          }
        },
        /* -------------------- */


        /* binds scrollbar events */
        _bindEvents = function () {
          var $this = $(this), d = $this.data(pluginPfx), o = d.opt
          if (!d.bindEvents) { /* check if events are already bound */
            _draggable.call(this)
            if (o.contentTouchScroll) {_contentDraggable.call(this)}
            _selectable.call(this)
            if (o.mouseWheel.enable) { /* bind mousewheel fn when plugin is available */
              function _mwt() {
                mousewheelTimeout = setTimeout(function () {
                  if (!$.event.special.mousewheel) {
                    _mwt()
                  } else {
                    clearTimeout(mousewheelTimeout)
                    _mousewheel.call($this[0])
                  }
                }, 100)
              }
              var mousewheelTimeout
              _mwt()
            }
            _draggerRail.call(this)
            _wrapperScroll.call(this)
            if (o.advanced.autoScrollOnFocus) {_focus.call(this)}
            if (o.scrollButtons.enable) {_buttons.call(this)}
            if (o.keyboard.enable) {_keyboard.call(this)}
            d.bindEvents = true
          }
        },
        /* -------------------- */


        /* unbinds scrollbar events */
        _unbindEvents = function () {
          var $this = $(this), d = $this.data(pluginPfx), o = d.opt,
            namespace = pluginPfx + "_" + d.idx,
            sb = ".mCSB_" + d.idx + "_scrollbar",
            sel = $("#mCSB_" + d.idx + ",#mCSB_" + d.idx + "_container,#mCSB_" + d.idx + "_container_wrapper," + sb + " ." + classes[12] + ",#mCSB_" + d.idx + "_dragger_vertical,#mCSB_" + d.idx + "_dragger_horizontal," + sb + ">a"),
            mCSB_container = $("#mCSB_" + d.idx + "_container")
          if (o.advanced.releaseDraggableSelectors) {sel.add($(o.advanced.releaseDraggableSelectors))}
          if (o.advanced.extraDraggableSelectors) {sel.add($(o.advanced.extraDraggableSelectors))}
          if (d.bindEvents) { /* check if events are bound */
            /* unbind namespaced events from document/selectors */
            $(document).add($(!_canAccessIFrame() || top.document)).unbind("." + namespace)
            sel.each(function () {
              $(this).unbind("." + namespace)
            })
            /* clear and delete timeouts/objects */
            clearTimeout($this[0]._focusTimeout); _delete($this[0], "_focusTimeout")
            clearTimeout(d.sequential.step); _delete(d.sequential, "step")
            clearTimeout(mCSB_container[0].onCompleteTimeout); _delete(mCSB_container[0], "onCompleteTimeout")
            d.bindEvents = false
          }
        },
        /* -------------------- */


        /* toggles scrollbar visibility */
        _scrollbarVisibility = function (disabled) {
          var $this = $(this), d = $this.data(pluginPfx), o = d.opt,
            contentWrapper = $("#mCSB_" + d.idx + "_container_wrapper"),
            content = contentWrapper.length ? contentWrapper : $("#mCSB_" + d.idx + "_container"),
            scrollbar = [$("#mCSB_" + d.idx + "_scrollbar_vertical"), $("#mCSB_" + d.idx + "_scrollbar_horizontal")],
            mCSB_dragger = [scrollbar[0].find(".mCSB_dragger"), scrollbar[1].find(".mCSB_dragger")]
          if (o.axis !== "x") {
            if (d.overflowed[0] && !disabled) {
              scrollbar[0].add(mCSB_dragger[0]).add(scrollbar[0].children("a")).css("display", "block")
              content.removeClass(classes[8] + " " + classes[10])
            } else {
              if (o.alwaysShowScrollbar) {
                if (o.alwaysShowScrollbar !== 2) {mCSB_dragger[0].css("display", "none")}
                content.removeClass(classes[10])
              } else {
                scrollbar[0].css("display", "none")
                content.addClass(classes[10])
              }
              content.addClass(classes[8])
            }
          }
          if (o.axis !== "y") {
            if (d.overflowed[1] && !disabled) {
              scrollbar[1].add(mCSB_dragger[1]).add(scrollbar[1].children("a")).css("display", "block")
              content.removeClass(classes[9] + " " + classes[11])
            } else {
              if (o.alwaysShowScrollbar) {
                if (o.alwaysShowScrollbar !== 2) {mCSB_dragger[1].css("display", "none")}
                content.removeClass(classes[11])
              } else {
                scrollbar[1].css("display", "none")
                content.addClass(classes[11])
              }
              content.addClass(classes[9])
            }
          }
          if (!d.overflowed[0] && !d.overflowed[1]) {
            $this.addClass(classes[5])
          } else {
            $this.removeClass(classes[5])
          }
        },
        /* -------------------- */


        /* returns input coordinates of pointer, touch and mouse events (relative to document) */
        _coordinates = function (e) {
          var t = e.type, o = e.target.ownerDocument !== document && frameElement !== null ? [$(frameElement).offset().top, $(frameElement).offset().left] : null,
            io = _canAccessIFrame() && e.target.ownerDocument !== top.document && frameElement !== null ? [$(e.view.frameElement).offset().top, $(e.view.frameElement).offset().left] : [0, 0]
          switch (t) {
            case "pointerdown": case "MSPointerDown": case "pointermove": case "MSPointerMove": case "pointerup": case "MSPointerUp":
              return o ? [e.originalEvent.pageY - o[0] + io[0], e.originalEvent.pageX - o[1] + io[1], false] : [e.originalEvent.pageY, e.originalEvent.pageX, false]
              break
            case "touchstart": case "touchmove": case "touchend":
              var touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0],
                touches = e.originalEvent.touches.length || e.originalEvent.changedTouches.length
              return e.target.ownerDocument !== document ? [touch.screenY, touch.screenX, touches > 1] : [touch.pageY, touch.pageX, touches > 1]
              break
            default:
              return o ? [e.pageY - o[0] + io[0], e.pageX - o[1] + io[1], false] : [e.pageY, e.pageX, false]
          }
        },
        /* -------------------- */


        /* 
        SCROLLBAR DRAG EVENTS
        scrolls content via scrollbar dragging 
        */
        _draggable = function () {
          var $this = $(this), d = $this.data(pluginPfx), o = d.opt,
            namespace = pluginPfx + "_" + d.idx,
            draggerId = ["mCSB_" + d.idx + "_dragger_vertical", "mCSB_" + d.idx + "_dragger_horizontal"],
            mCSB_container = $("#mCSB_" + d.idx + "_container"),
            mCSB_dragger = $("#" + draggerId[0] + ",#" + draggerId[1]),
            draggable, dragY, dragX,
            rds = o.advanced.releaseDraggableSelectors ? mCSB_dragger.add($(o.advanced.releaseDraggableSelectors)) : mCSB_dragger,
            eds = o.advanced.extraDraggableSelectors ? $(!_canAccessIFrame() || top.document).add($(o.advanced.extraDraggableSelectors)) : $(!_canAccessIFrame() || top.document)
          mCSB_dragger.bind("contextmenu." + namespace, function (e) {
            e.preventDefault() //prevent right click
          }).bind("mousedown." + namespace + " touchstart." + namespace + " pointerdown." + namespace + " MSPointerDown." + namespace, function (e) {
            e.stopImmediatePropagation()
            e.preventDefault()
            if (!_mouseBtnLeft(e)) {return } /* left mouse button only */
            touchActive = true
            if (oldIE) {document.onselectstart = function () {return false}} /* disable text selection for IE < 9 */
            _iframe.call(mCSB_container, false) /* enable scrollbar dragging over iframes by disabling their events */
            _stop($this)
            draggable = $(this)
            var offset = draggable.offset(), y = _coordinates(e)[0] - offset.top, x = _coordinates(e)[1] - offset.left,
              h = draggable.height() + offset.top, w = draggable.width() + offset.left
            if (y < h && y > 0 && x < w && x > 0) {
              dragY = y
              dragX = x
            }
            _onDragClasses(draggable, "active", o.autoExpandScrollbar)
          }).bind("touchmove." + namespace, function (e) {
            e.stopImmediatePropagation()
            e.preventDefault()
            var offset = draggable.offset(), y = _coordinates(e)[0] - offset.top, x = _coordinates(e)[1] - offset.left
            _drag(dragY, dragX, y, x)
          })
          $(document).add(eds).bind("mousemove." + namespace + " pointermove." + namespace + " MSPointerMove." + namespace, function (e) {
            if (draggable) {
              var offset = draggable.offset(), y = _coordinates(e)[0] - offset.top, x = _coordinates(e)[1] - offset.left
              if (dragY === y && dragX === x) {return } /* has it really moved? */
              _drag(dragY, dragX, y, x)
            }
          }).add(rds).bind("mouseup." + namespace + " touchend." + namespace + " pointerup." + namespace + " MSPointerUp." + namespace, function (e) {
            if (draggable) {
              _onDragClasses(draggable, "active", o.autoExpandScrollbar)
              draggable = null
            }
            touchActive = false
            if (oldIE) {document.onselectstart = null} /* enable text selection for IE < 9 */
            _iframe.call(mCSB_container, true) /* enable iframes events */
          })
          function _drag(dragY, dragX, y, x) {
            mCSB_container[0].idleTimer = o.scrollInertia < 233 ? 250 : 0
            if (draggable.attr("id") === draggerId[1]) {
              var dir = "x", to = ((draggable[0].offsetLeft - dragX) + x) * d.scrollRatio.x
            } else {
              var dir = "y", to = ((draggable[0].offsetTop - dragY) + y) * d.scrollRatio.y
            }
            _scrollTo($this, to.toString(), {dir: dir, drag: true})
          }
        },
        /* -------------------- */


        /* 
        TOUCH SWIPE EVENTS
        scrolls content via touch swipe 
        Emulates the native touch-swipe scrolling with momentum found in iOS, Android and WP devices 
        */
        _contentDraggable = function () {
          var $this = $(this), d = $this.data(pluginPfx), o = d.opt,
            namespace = pluginPfx + "_" + d.idx,
            mCustomScrollBox = $("#mCSB_" + d.idx),
            mCSB_container = $("#mCSB_" + d.idx + "_container"),
            mCSB_dragger = [$("#mCSB_" + d.idx + "_dragger_vertical"), $("#mCSB_" + d.idx + "_dragger_horizontal")],
            draggable, dragY, dragX, touchStartY, touchStartX, touchMoveY = [], touchMoveX = [], startTime, runningTime, endTime, distance, speed, amount,
            durA = 0, durB, overwrite = o.axis === "yx" ? "none" : "all", touchIntent = [], touchDrag, docDrag,
            iframe = mCSB_container.find("iframe"),
            events = [
              "touchstart." + namespace + " pointerdown." + namespace + " MSPointerDown." + namespace, //start
              "touchmove." + namespace + " pointermove." + namespace + " MSPointerMove." + namespace, //move
              "touchend." + namespace + " pointerup." + namespace + " MSPointerUp." + namespace //end
            ],
            touchAction = document.body.style.touchAction !== undefined && document.body.style.touchAction !== ""
          mCSB_container.bind(events[0], function (e) {
            _onTouchstart(e)
          }).bind(events[1], function (e) {
            _onTouchmove(e)
          })
          mCustomScrollBox.bind(events[0], function (e) {
            _onTouchstart2(e)
          }).bind(events[2], function (e) {
            _onTouchend(e)
          })
          if (iframe.length) {
            iframe.each(function () {
              $(this).bind("load", function () {
                /* bind events on accessible iframes */
                if (_canAccessIFrame(this)) {
                  $(this.contentDocument || this.contentWindow.document).bind(events[0], function (e) {
                    _onTouchstart(e)
                    _onTouchstart2(e)
                  }).bind(events[1], function (e) {
                    _onTouchmove(e)
                  }).bind(events[2], function (e) {
                    _onTouchend(e)
                  })
                }
              })
            })
          }
          function _onTouchstart(e) {
            if (!_pointerTouch(e) || touchActive || _coordinates(e)[2]) {touchable = 0; return }
            touchable = 1; touchDrag = 0; docDrag = 0; draggable = 1
            $this.removeClass("mCS_touch_action")
            var offset = mCSB_container.offset()
            dragY = _coordinates(e)[0] - offset.top
            dragX = _coordinates(e)[1] - offset.left
            touchIntent = [_coordinates(e)[0], _coordinates(e)[1]]
          }
          function _onTouchmove(e) {
            if (!_pointerTouch(e) || touchActive || _coordinates(e)[2]) {return }
            if (!o.documentTouchScroll) {e.preventDefault()}
            e.stopImmediatePropagation()
            if (docDrag && !touchDrag) {return }
            if (draggable) {
              runningTime = _getTime()
              var offset = mCustomScrollBox.offset(), y = _coordinates(e)[0] - offset.top, x = _coordinates(e)[1] - offset.left,
                easing = "mcsLinearOut"
              touchMoveY.push(y)
              touchMoveX.push(x)
              touchIntent[2] = Math.abs(_coordinates(e)[0] - touchIntent[0]); touchIntent[3] = Math.abs(_coordinates(e)[1] - touchIntent[1])
              if (d.overflowed[0]) {
                var limit = mCSB_dragger[0].parent().height() - mCSB_dragger[0].height(),
                  prevent = ((dragY - y) > 0 && (y - dragY) > -(limit * d.scrollRatio.y) && (touchIntent[3] * 2 < touchIntent[2] || o.axis === "yx"))
              }
              if (d.overflowed[1]) {
                var limitX = mCSB_dragger[1].parent().width() - mCSB_dragger[1].width(),
                  preventX = ((dragX - x) > 0 && (x - dragX) > -(limitX * d.scrollRatio.x) && (touchIntent[2] * 2 < touchIntent[3] || o.axis === "yx"))
              }
              if (prevent || preventX) { /* prevent native document scrolling */
                if (!touchAction) {e.preventDefault()}
                touchDrag = 1
              } else {
                docDrag = 1
                $this.addClass("mCS_touch_action")
              }
              if (touchAction) {e.preventDefault()}
              amount = o.axis === "yx" ? [(dragY - y), (dragX - x)] : o.axis === "x" ? [null, (dragX - x)] : [(dragY - y), null]
              mCSB_container[0].idleTimer = 250
              if (d.overflowed[0]) {_drag(amount[0], durA, easing, "y", "all", true)}
              if (d.overflowed[1]) {_drag(amount[1], durA, easing, "x", overwrite, true)}
            }
          }
          function _onTouchstart2(e) {
            if (!_pointerTouch(e) || touchActive || _coordinates(e)[2]) {touchable = 0; return }
            touchable = 1
            e.stopImmediatePropagation()
            _stop($this)
            startTime = _getTime()
            var offset = mCustomScrollBox.offset()
            touchStartY = _coordinates(e)[0] - offset.top
            touchStartX = _coordinates(e)[1] - offset.left
            touchMoveY = []; touchMoveX = []
          }
          function _onTouchend(e) {
            if (!_pointerTouch(e) || touchActive || _coordinates(e)[2]) {return }
            draggable = 0
            e.stopImmediatePropagation()
            touchDrag = 0; docDrag = 0
            endTime = _getTime()
            var offset = mCustomScrollBox.offset(), y = _coordinates(e)[0] - offset.top, x = _coordinates(e)[1] - offset.left
            if ((endTime - runningTime) > 30) {return }
            speed = 1000 / (endTime - startTime)
            var easing = "mcsEaseOut", slow = speed < 2.5,
              diff = slow ? [touchMoveY[touchMoveY.length - 2], touchMoveX[touchMoveX.length - 2]] : [0, 0]
            distance = slow ? [(y - diff[0]), (x - diff[1])] : [y - touchStartY, x - touchStartX]
            var absDistance = [Math.abs(distance[0]), Math.abs(distance[1])]
            speed = slow ? [Math.abs(distance[0] / 4), Math.abs(distance[1] / 4)] : [speed, speed]
            var a = [
              Math.abs(mCSB_container[0].offsetTop) - (distance[0] * _m((absDistance[0] / speed[0]), speed[0])),
              Math.abs(mCSB_container[0].offsetLeft) - (distance[1] * _m((absDistance[1] / speed[1]), speed[1]))
            ]
            amount = o.axis === "yx" ? [a[0], a[1]] : o.axis === "x" ? [null, a[1]] : [a[0], null]
            durB = [(absDistance[0] * 4) + o.scrollInertia, (absDistance[1] * 4) + o.scrollInertia]
            var md = parseInt(o.contentTouchScroll) || 0 /* absolute minimum distance required */
            amount[0] = absDistance[0] > md ? amount[0] : 0
            amount[1] = absDistance[1] > md ? amount[1] : 0
            if (d.overflowed[0]) {_drag(amount[0], durB[0], easing, "y", overwrite, false)}
            if (d.overflowed[1]) {_drag(amount[1], durB[1], easing, "x", overwrite, false)}
          }
          function _m(ds, s) {
            var r = [s * 1.5, s * 2, s / 1.5, s / 2]
            if (ds > 90) {
              return s > 4 ? r[0] : r[3]
            } else if (ds > 60) {
              return s > 3 ? r[3] : r[2]
            } else if (ds > 30) {
              return s > 8 ? r[1] : s > 6 ? r[0] : s > 4 ? s : r[2]
            } else {
              return s > 8 ? s : r[3]
            }
          }
          function _drag(amount, dur, easing, dir, overwrite, drag) {
            if (!amount) {return }
            _scrollTo($this, amount.toString(), {dur: dur, scrollEasing: easing, dir: dir, overwrite: overwrite, drag: drag})
          }
        },
        /* -------------------- */


        /* 
        SELECT TEXT EVENTS 
        scrolls content when text is selected 
        */
        _selectable = function () {
          var $this = $(this), d = $this.data(pluginPfx), o = d.opt, seq = d.sequential,
            namespace = pluginPfx + "_" + d.idx,
            mCSB_container = $("#mCSB_" + d.idx + "_container"),
            wrapper = mCSB_container.parent(),
            action
          mCSB_container.bind("mousedown." + namespace, function (e) {
            if (touchable) {return }
            if (!action) {action = 1; touchActive = true}
          }).add(document).bind("mousemove." + namespace, function (e) {
            if (!touchable && action && _sel()) {
              var offset = mCSB_container.offset(),
                y = _coordinates(e)[0] - offset.top + mCSB_container[0].offsetTop, x = _coordinates(e)[1] - offset.left + mCSB_container[0].offsetLeft
              if (y > 0 && y < wrapper.height() && x > 0 && x < wrapper.width()) {
                if (seq.step) {_seq("off", null, "stepped")}
              } else {
                if (o.axis !== "x" && d.overflowed[0]) {
                  if (y < 0) {
                    _seq("on", 38)
                  } else if (y > wrapper.height()) {
                    _seq("on", 40)
                  }
                }
                if (o.axis !== "y" && d.overflowed[1]) {
                  if (x < 0) {
                    _seq("on", 37)
                  } else if (x > wrapper.width()) {
                    _seq("on", 39)
                  }
                }
              }
            }
          }).bind("mouseup." + namespace + " dragend." + namespace, function (e) {
            if (touchable) {return }
            if (action) {action = 0; _seq("off", null)}
            touchActive = false
          })
          function _sel() {
            return window.getSelection ? window.getSelection().toString() :
              document.selection && document.selection.type != "Control" ? document.selection.createRange().text : 0
          }
          function _seq(a, c, s) {
            seq.type = s && action ? "stepped" : "stepless"
            seq.scrollAmount = 10
            _sequentialScroll($this, a, c, "mcsLinearOut", s ? 60 : null)
          }
        },
        /* -------------------- */


        /* 
        MOUSE WHEEL EVENT
        scrolls content via mouse-wheel 
        via mouse-wheel plugin (https://github.com/brandonaaron/jquery-mousewheel)
        */
        _mousewheel = function () {
          if (!$(this).data(pluginPfx)) {return } /* Check if the scrollbar is ready to use mousewheel events (issue: #185) */
          var $this = $(this), d = $this.data(pluginPfx), o = d.opt,
            namespace = pluginPfx + "_" + d.idx,
            mCustomScrollBox = $("#mCSB_" + d.idx),
            mCSB_dragger = [$("#mCSB_" + d.idx + "_dragger_vertical"), $("#mCSB_" + d.idx + "_dragger_horizontal")],
            iframe = $("#mCSB_" + d.idx + "_container").find("iframe")
          if (iframe.length) {
            iframe.each(function () {
              $(this).bind("load", function () {
                /* bind events on accessible iframes */
                if (_canAccessIFrame(this)) {
                  $(this.contentDocument || this.contentWindow.document).bind("mousewheel." + namespace, function (e, delta) {
                    _onMousewheel(e, delta)
                  })
                }
              })
            })
          }
          mCustomScrollBox.bind("mousewheel." + namespace, function (e, delta) {
            _onMousewheel(e, delta)
          })
          function _onMousewheel(e, delta) {
            _stop($this)
            if (_disableMousewheel($this, e.target)) {return } /* disables mouse-wheel when hovering specific elements */
            var deltaFactor = o.mouseWheel.deltaFactor !== "auto" ? parseInt(o.mouseWheel.deltaFactor) : (oldIE && e.deltaFactor < 100) ? 100 : e.deltaFactor || 100,
              dur = o.scrollInertia
            if (o.axis === "x" || o.mouseWheel.axis === "x") {
              var dir = "x",
                px = [Math.round(deltaFactor * d.scrollRatio.x), parseInt(o.mouseWheel.scrollAmount)],
                amount = o.mouseWheel.scrollAmount !== "auto" ? px[1] : px[0] >= mCustomScrollBox.width() ? mCustomScrollBox.width() * 0.9 : px[0],
                contentPos = Math.abs($("#mCSB_" + d.idx + "_container")[0].offsetLeft),
                draggerPos = mCSB_dragger[1][0].offsetLeft,
                limit = mCSB_dragger[1].parent().width() - mCSB_dragger[1].width(),
                dlt = o.mouseWheel.axis === "y" ? (e.deltaY || delta) : e.deltaX
            } else {
              var dir = "y",
                px = [Math.round(deltaFactor * d.scrollRatio.y), parseInt(o.mouseWheel.scrollAmount)],
                amount = o.mouseWheel.scrollAmount !== "auto" ? px[1] : px[0] >= mCustomScrollBox.height() ? mCustomScrollBox.height() * 0.9 : px[0],
                contentPos = Math.abs($("#mCSB_" + d.idx + "_container")[0].offsetTop),
                draggerPos = mCSB_dragger[0][0].offsetTop,
                limit = mCSB_dragger[0].parent().height() - mCSB_dragger[0].height(),
                dlt = e.deltaY || delta
            }
            if ((dir === "y" && !d.overflowed[0]) || (dir === "x" && !d.overflowed[1])) {return }
            if (o.mouseWheel.invert || e.webkitDirectionInvertedFromDevice) {dlt = -dlt}
            if (o.mouseWheel.normalizeDelta) {dlt = dlt < 0 ? -1 : 1}
            if ((dlt > 0 && draggerPos !== 0) || (dlt < 0 && draggerPos !== limit) || o.mouseWheel.preventDefault) {
              e.stopImmediatePropagation()
              e.preventDefault()
            }
            if (e.deltaFactor < 5 && !o.mouseWheel.normalizeDelta) {
              //very low deltaFactor values mean some kind of delta acceleration (e.g. osx trackpad), so adjusting scrolling accordingly
              amount = e.deltaFactor; dur = 17
            }
            _scrollTo($this, (contentPos - (dlt * amount)).toString(), {dir: dir, dur: dur})
          }
        },
        /* -------------------- */


        /* checks if iframe can be accessed */
        _canAccessIFrameCache = new Object(),
        _canAccessIFrame = function (iframe) {
          var result = false, cacheKey = false, html = null
          if (iframe === undefined) {
            cacheKey = "#empty"
          } else if ($(iframe).attr("id") !== undefined) {
            cacheKey = $(iframe).attr("id")
          }
          if (cacheKey !== false && _canAccessIFrameCache[cacheKey] !== undefined) {
            return _canAccessIFrameCache[cacheKey]
          }
          if (!iframe) {
            try {
              var doc = top.document
              html = doc.body.innerHTML
            } catch (err) {/* do nothing */}
            result = (html !== null)
          } else {
            try {
              var doc = iframe.contentDocument || iframe.contentWindow.document
              html = doc.body.innerHTML
            } catch (err) {/* do nothing */}
            result = (html !== null)
          }
          if (cacheKey !== false) {_canAccessIFrameCache[cacheKey] = result}
          return result
        },
        /* -------------------- */


        /* switches iframe's pointer-events property (drag, mousewheel etc. over cross-domain iframes) */
        _iframe = function (evt) {
          var el = this.find("iframe")
          if (!el.length) {return } /* check if content contains iframes */
          var val = !evt ? "none" : "auto"
          el.css("pointer-events", val) /* for IE11, iframe's display property should not be "block" */
        },
        /* -------------------- */


        /* disables mouse-wheel when hovering specific elements like select, datalist etc. */
        _disableMousewheel = function (el, target) {
          var tag = target.nodeName.toLowerCase(),
            tags = el.data(pluginPfx).opt.mouseWheel.disableOver,
            /* elements that require focus */
            focusTags = ["select", "textarea"]
          return $.inArray(tag, tags) > -1 && !($.inArray(tag, focusTags) > -1 && !$(target).is(":focus"))
        },
        /* -------------------- */


        /* 
        DRAGGER RAIL CLICK EVENT
        scrolls content via dragger rail 
        */
        _draggerRail = function () {
          var $this = $(this), d = $this.data(pluginPfx),
            namespace = pluginPfx + "_" + d.idx,
            mCSB_container = $("#mCSB_" + d.idx + "_container"),
            wrapper = mCSB_container.parent(),
            mCSB_draggerContainer = $(".mCSB_" + d.idx + "_scrollbar ." + classes[12]),
            clickable
          mCSB_draggerContainer.bind("mousedown." + namespace + " touchstart." + namespace + " pointerdown." + namespace + " MSPointerDown." + namespace, function (e) {
            touchActive = true
            if (!$(e.target).hasClass("mCSB_dragger")) {clickable = 1}
          }).bind("touchend." + namespace + " pointerup." + namespace + " MSPointerUp." + namespace, function (e) {
            touchActive = false
          }).bind("click." + namespace, function (e) {
            if (!clickable) {return }
            clickable = 0
            if ($(e.target).hasClass(classes[12]) || $(e.target).hasClass("mCSB_draggerRail")) {
              _stop($this)
              var el = $(this), mCSB_dragger = el.find(".mCSB_dragger")
              if (el.parent(".mCSB_scrollTools_horizontal").length > 0) {
                if (!d.overflowed[1]) {return }
                var dir = "x",
                  clickDir = e.pageX > mCSB_dragger.offset().left ? -1 : 1,
                  to = Math.abs(mCSB_container[0].offsetLeft) - (clickDir * (wrapper.width() * 0.9))
              } else {
                if (!d.overflowed[0]) {return }
                var dir = "y",
                  clickDir = e.pageY > mCSB_dragger.offset().top ? -1 : 1,
                  to = Math.abs(mCSB_container[0].offsetTop) - (clickDir * (wrapper.height() * 0.9))
              }
              _scrollTo($this, to.toString(), {dir: dir, scrollEasing: "mcsEaseInOut"})
            }
          })
        },
        /* -------------------- */


        /* 
        FOCUS EVENT
        scrolls content via element focus (e.g. clicking an input, pressing TAB key etc.)
        */
        _focus = function () {
          var $this = $(this), d = $this.data(pluginPfx), o = d.opt,
            namespace = pluginPfx + "_" + d.idx,
            mCSB_container = $("#mCSB_" + d.idx + "_container"),
            wrapper = mCSB_container.parent()
          mCSB_container.bind("focusin." + namespace, function (e) {
            var el = $(document.activeElement),
              nested = mCSB_container.find(".mCustomScrollBox").length,
              dur = 0
            if (!el.is(o.advanced.autoScrollOnFocus)) {return }
            _stop($this)
            clearTimeout($this[0]._focusTimeout)
            $this[0]._focusTimer = nested ? (dur + 17) * nested : 0
            $this[0]._focusTimeout = setTimeout(function () {
              var to = [_childPos(el)[0], _childPos(el)[1]],
                contentPos = [mCSB_container[0].offsetTop, mCSB_container[0].offsetLeft],
                isVisible = [
                  (contentPos[0] + to[0] >= 0 && contentPos[0] + to[0] < wrapper.height() - el.outerHeight(false)),
                  (contentPos[1] + to[1] >= 0 && contentPos[0] + to[1] < wrapper.width() - el.outerWidth(false))
                ],
                overwrite = (o.axis === "yx" && !isVisible[0] && !isVisible[1]) ? "none" : "all"
              if (o.axis !== "x" && !isVisible[0]) {
                _scrollTo($this, to[0].toString(), {dir: "y", scrollEasing: "mcsEaseInOut", overwrite: overwrite, dur: dur})
              }
              if (o.axis !== "y" && !isVisible[1]) {
                _scrollTo($this, to[1].toString(), {dir: "x", scrollEasing: "mcsEaseInOut", overwrite: overwrite, dur: dur})
              }
            }, $this[0]._focusTimer)
          })
        },
        /* -------------------- */


        /* sets content wrapper scrollTop/scrollLeft always to 0 */
        _wrapperScroll = function () {
          var $this = $(this), d = $this.data(pluginPfx),
            namespace = pluginPfx + "_" + d.idx,
            wrapper = $("#mCSB_" + d.idx + "_container").parent()
          wrapper.bind("scroll." + namespace, function (e) {
            if (wrapper.scrollTop() !== 0 || wrapper.scrollLeft() !== 0) {
              $(".mCSB_" + d.idx + "_scrollbar").css("visibility", "hidden") /* hide scrollbar(s) */
            }
          })
        },
        /* -------------------- */


        /* 
        BUTTONS EVENTS
        scrolls content via up, down, left and right buttons 
        */
        _buttons = function () {
          var $this = $(this), d = $this.data(pluginPfx), o = d.opt, seq = d.sequential,
            namespace = pluginPfx + "_" + d.idx,
            sel = ".mCSB_" + d.idx + "_scrollbar",
            btn = $(sel + ">a")
          btn.bind("contextmenu." + namespace, function (e) {
            e.preventDefault() //prevent right click
          }).bind("mousedown." + namespace + " touchstart." + namespace + " pointerdown." + namespace + " MSPointerDown." + namespace + " mouseup." + namespace + " touchend." + namespace + " pointerup." + namespace + " MSPointerUp." + namespace + " mouseout." + namespace + " pointerout." + namespace + " MSPointerOut." + namespace + " click." + namespace, function (e) {
            e.preventDefault()
            if (!_mouseBtnLeft(e)) {return } /* left mouse button only */
            var btnClass = $(this).attr("class")
            seq.type = o.scrollButtons.scrollType
            switch (e.type) {
              case "mousedown": case "touchstart": case "pointerdown": case "MSPointerDown":
                if (seq.type === "stepped") {return }
                touchActive = true
                d.tweenRunning = false
                _seq("on", btnClass)
                break
              case "mouseup": case "touchend": case "pointerup": case "MSPointerUp":
              case "mouseout": case "pointerout": case "MSPointerOut":
                if (seq.type === "stepped") {return }
                touchActive = false
                if (seq.dir) {_seq("off", btnClass)}
                break
              case "click":
                if (seq.type !== "stepped" || d.tweenRunning) {return }
                _seq("on", btnClass)
                break
            }
            function _seq(a, c) {
              seq.scrollAmount = o.scrollButtons.scrollAmount
              _sequentialScroll($this, a, c)
            }
          })
        },
        /* -------------------- */


        /* 
        KEYBOARD EVENTS
        scrolls content via keyboard 
        Keys: up arrow, down arrow, left arrow, right arrow, PgUp, PgDn, Home, End
        */
        _keyboard = function () {
          var $this = $(this), d = $this.data(pluginPfx), o = d.opt, seq = d.sequential,
            namespace = pluginPfx + "_" + d.idx,
            mCustomScrollBox = $("#mCSB_" + d.idx),
            mCSB_container = $("#mCSB_" + d.idx + "_container"),
            wrapper = mCSB_container.parent(),
            editables = "input,textarea,select,datalist,keygen,[contenteditable='true']",
            iframe = mCSB_container.find("iframe"),
            events = ["blur." + namespace + " keydown." + namespace + " keyup." + namespace]
          if (iframe.length) {
            iframe.each(function () {
              $(this).bind("load", function () {
                /* bind events on accessible iframes */
                if (_canAccessIFrame(this)) {
                  $(this.contentDocument || this.contentWindow.document).bind(events[0], function (e) {
                    _onKeyboard(e)
                  })
                }
              })
            })
          }
          mCustomScrollBox.attr("tabindex", "0").bind(events[0], function (e) {
            _onKeyboard(e)
          })
          function _onKeyboard(e) {
            switch (e.type) {
              case "blur":
                if (d.tweenRunning && seq.dir) {_seq("off", null)}
                break
              case "keydown": case "keyup":
                var code = e.keyCode ? e.keyCode : e.which, action = "on"
                if ((o.axis !== "x" && (code === 38 || code === 40)) || (o.axis !== "y" && (code === 37 || code === 39))) {
                  /* up (38), down (40), left (37), right (39) arrows */
                  if (((code === 38 || code === 40) && !d.overflowed[0]) || ((code === 37 || code === 39) && !d.overflowed[1])) {return }
                  if (e.type === "keyup") {action = "off"}
                  if (!$(document.activeElement).is(editables)) {
                    e.preventDefault()
                    e.stopImmediatePropagation()
                    _seq(action, code)
                  }
                } else if (code === 33 || code === 34) {
                  /* PgUp (33), PgDn (34) */
                  if (d.overflowed[0] || d.overflowed[1]) {
                    e.preventDefault()
                    e.stopImmediatePropagation()
                  }
                  if (e.type === "keyup") {
                    _stop($this)
                    var keyboardDir = code === 34 ? -1 : 1
                    if (o.axis === "x" || (o.axis === "yx" && d.overflowed[1] && !d.overflowed[0])) {
                      var dir = "x", to = Math.abs(mCSB_container[0].offsetLeft) - (keyboardDir * (wrapper.width() * 0.9))
                    } else {
                      var dir = "y", to = Math.abs(mCSB_container[0].offsetTop) - (keyboardDir * (wrapper.height() * 0.9))
                    }
                    _scrollTo($this, to.toString(), {dir: dir, scrollEasing: "mcsEaseInOut"})
                  }
                } else if (code === 35 || code === 36) {
                  /* End (35), Home (36) */
                  if (!$(document.activeElement).is(editables)) {
                    if (d.overflowed[0] || d.overflowed[1]) {
                      e.preventDefault()
                      e.stopImmediatePropagation()
                    }
                    if (e.type === "keyup") {
                      if (o.axis === "x" || (o.axis === "yx" && d.overflowed[1] && !d.overflowed[0])) {
                        var dir = "x", to = code === 35 ? Math.abs(wrapper.width() - mCSB_container.outerWidth(false)) : 0
                      } else {
                        var dir = "y", to = code === 35 ? Math.abs(wrapper.height() - mCSB_container.outerHeight(false)) : 0
                      }
                      _scrollTo($this, to.toString(), {dir: dir, scrollEasing: "mcsEaseInOut"})
                    }
                  }
                }
                break
            }
            function _seq(a, c) {
              seq.type = o.keyboard.scrollType
              seq.scrollAmount = o.keyboard.scrollAmount
              if (seq.type === "stepped" && d.tweenRunning) {return }
              _sequentialScroll($this, a, c)
            }
          }
        },
        /* -------------------- */


        /* scrolls content sequentially (used when scrolling via buttons, keyboard arrows etc.) */
        _sequentialScroll = function (el, action, trigger, e, s) {
          var d = el.data(pluginPfx), o = d.opt, seq = d.sequential,
            mCSB_container = $("#mCSB_" + d.idx + "_container"),
            once = seq.type === "stepped" ? true : false,
            steplessSpeed = o.scrollInertia < 26 ? 26 : o.scrollInertia, /* 26/1.5=17 */
            steppedSpeed = o.scrollInertia < 1 ? 17 : o.scrollInertia
          switch (action) {
            case "on":
              seq.dir = [
                (trigger === classes[16] || trigger === classes[15] || trigger === 39 || trigger === 37 ? "x" : "y"),
                (trigger === classes[13] || trigger === classes[15] || trigger === 38 || trigger === 37 ? -1 : 1)
              ]
              _stop(el)
              if (_isNumeric(trigger) && seq.type === "stepped") {return }
              _on(once)
              break
            case "off":
              _off()
              if (once || (d.tweenRunning && seq.dir)) {
                _on(true)
              }
              break
          }

          /* starts sequence */
          function _on(once) {
            if (o.snapAmount) {seq.scrollAmount = !(o.snapAmount instanceof Array) ? o.snapAmount : seq.dir[0] === "x" ? o.snapAmount[1] : o.snapAmount[0]} /* scrolling snapping */
            var c = seq.type !== "stepped", /* continuous scrolling */
              t = s ? s : !once ? 1000 / 60 : c ? steplessSpeed / 1.5 : steppedSpeed, /* timer */
              m = !once ? 2.5 : c ? 7.5 : 40, /* multiplier */
              contentPos = [Math.abs(mCSB_container[0].offsetTop), Math.abs(mCSB_container[0].offsetLeft)],
              ratio = [d.scrollRatio.y > 10 ? 10 : d.scrollRatio.y, d.scrollRatio.x > 10 ? 10 : d.scrollRatio.x],
              amount = seq.dir[0] === "x" ? contentPos[1] + (seq.dir[1] * (ratio[1] * m)) : contentPos[0] + (seq.dir[1] * (ratio[0] * m)),
              px = seq.dir[0] === "x" ? contentPos[1] + (seq.dir[1] * parseInt(seq.scrollAmount)) : contentPos[0] + (seq.dir[1] * parseInt(seq.scrollAmount)),
              to = seq.scrollAmount !== "auto" ? px : amount,
              easing = e ? e : !once ? "mcsLinear" : c ? "mcsLinearOut" : "mcsEaseInOut",
              onComplete = !once ? false : true
            if (once && t < 17) {
              to = seq.dir[0] === "x" ? contentPos[1] : contentPos[0]
            }
            _scrollTo(el, to.toString(), {dir: seq.dir[0], scrollEasing: easing, dur: t, onComplete: onComplete})
            if (once) {
              seq.dir = false
              return
            }
            clearTimeout(seq.step)
            seq.step = setTimeout(function () {
              _on()
            }, t)
          }
          /* stops sequence */
          function _off() {
            clearTimeout(seq.step)
            _delete(seq, "step")
            _stop(el)
          }
        },
        /* -------------------- */


        /* returns a yx array from value */
        _arr = function (val) {
          var o = $(this).data(pluginPfx).opt, vals = []
          if (typeof val === "function") {val = val()} /* check if the value is a single anonymous function */
          /* check if value is object or array, its length and create an array with yx values */
          if (!(val instanceof Array)) { /* object value (e.g. {y:"100",x:"100"}, 100 etc.) */
            vals[0] = val.y ? val.y : val.x || o.axis === "x" ? null : val
            vals[1] = val.x ? val.x : val.y || o.axis === "y" ? null : val
          } else { /* array value (e.g. [100,100]) */
            vals = val.length > 1 ? [val[0], val[1]] : o.axis === "x" ? [null, val[0]] : [val[0], null]
          }
          /* check if array values are anonymous functions */
          if (typeof vals[0] === "function") {vals[0] = vals[0]()}
          if (typeof vals[1] === "function") {vals[1] = vals[1]()}
          return vals
        },
        /* -------------------- */


        /* translates values (e.g. "top", 100, "100px", "#id") to actual scroll-to positions */
        _to = function (val, dir) {
          if (val == null || typeof val == "undefined") {return }
          var $this = $(this), d = $this.data(pluginPfx), o = d.opt,
            mCSB_container = $("#mCSB_" + d.idx + "_container"),
            wrapper = mCSB_container.parent(),
            t = typeof val
          if (!dir) {dir = o.axis === "x" ? "x" : "y"}
          var contentLength = dir === "x" ? mCSB_container.outerWidth(false) - wrapper.width() : mCSB_container.outerHeight(false) - wrapper.height(),
            contentPos = dir === "x" ? mCSB_container[0].offsetLeft : mCSB_container[0].offsetTop,
            cssProp = dir === "x" ? "left" : "top"
          switch (t) {
            case "function": /* this currently is not used. Consider removing it */
              return val()
              break
            case "object": /* js/jquery object */
              var obj = val.jquery ? val : $(val)
              if (!obj.length) {return }
              return dir === "x" ? _childPos(obj)[1] : _childPos(obj)[0]
              break
            case "string": case "number":
              if (_isNumeric(val)) { /* numeric value */
                return Math.abs(val)
              } else if (val.indexOf("%") !== -1) { /* percentage value */
                return Math.abs(contentLength * parseInt(val) / 100)
              } else if (val.indexOf("-=") !== -1) { /* decrease value */
                return Math.abs(contentPos - parseInt(val.split("-=")[1]))
              } else if (val.indexOf("+=") !== -1) { /* inrease value */
                var p = (contentPos + parseInt(val.split("+=")[1]))
                return p >= 0 ? 0 : Math.abs(p)
              } else if (val.indexOf("px") !== -1 && _isNumeric(val.split("px")[0])) { /* pixels string value (e.g. "100px") */
                return Math.abs(val.split("px")[0])
              } else {
                if (val === "top" || val === "left") { /* special strings */
                  return 0
                } else if (val === "bottom") {
                  return Math.abs(wrapper.height() - mCSB_container.outerHeight(false))
                } else if (val === "right") {
                  return Math.abs(wrapper.width() - mCSB_container.outerWidth(false))
                } else if (val === "first" || val === "last") {
                  var obj = mCSB_container.find(":" + val)
                  return dir === "x" ? _childPos(obj)[1] : _childPos(obj)[0]
                } else {
                  if ($(val).length) { /* jquery selector */
                    return dir === "x" ? _childPos($(val))[1] : _childPos($(val))[0]
                  } else { /* other values (e.g. "100em") */
                    mCSB_container.css(cssProp, val)
                    methods.update.call(null, $this[0])
                    return
                  }
                }
              }
              break
          }
        },
        /* -------------------- */


        /* calls the update method automatically */
        _autoUpdate = function (rem) {
          var $this = $(this), d = $this.data(pluginPfx), o = d.opt,
            mCSB_container = $("#mCSB_" + d.idx + "_container")
          if (rem) {
            /* 
            removes autoUpdate timer 
            usage: _autoUpdate.call(this,"remove");
            */
            clearTimeout(mCSB_container[0].autoUpdate)
            _delete(mCSB_container[0], "autoUpdate")
            return
          }
          upd()
          function upd() {
            clearTimeout(mCSB_container[0].autoUpdate)
            if ($this.parents("html").length === 0) {
              /* check element in dom tree */
              $this = null
              return
            }
            mCSB_container[0].autoUpdate = setTimeout(function () {
              /* update on specific selector(s) length and size change */
              if (o.advanced.updateOnSelectorChange) {
                d.poll.change.n = sizesSum()
                if (d.poll.change.n !== d.poll.change.o) {
                  d.poll.change.o = d.poll.change.n
                  doUpd(3)
                  return
                }
              }
              /* update on main element and scrollbar size changes */
              if (o.advanced.updateOnContentResize) {
                d.poll.size.n = $this[0].scrollHeight + $this[0].scrollWidth + mCSB_container[0].offsetHeight + $this[0].offsetHeight + $this[0].offsetWidth
                if (d.poll.size.n !== d.poll.size.o) {
                  d.poll.size.o = d.poll.size.n
                  doUpd(1)
                  return
                }
              }
              /* update on image load */
              if (o.advanced.updateOnImageLoad) {
                if (!(o.advanced.updateOnImageLoad === "auto" && o.axis === "y")) { //by default, it doesn't run on vertical content
                  d.poll.img.n = mCSB_container.find("img").length
                  if (d.poll.img.n !== d.poll.img.o) {
                    d.poll.img.o = d.poll.img.n
                    mCSB_container.find("img").each(function () {
                      imgLoader(this)
                    })
                    return
                  }
                }
              }
              if (o.advanced.updateOnSelectorChange || o.advanced.updateOnContentResize || o.advanced.updateOnImageLoad) {upd()}
            }, o.advanced.autoUpdateTimeout)
          }
          /* a tiny image loader */
          function imgLoader(el) {
            if ($(el).hasClass(classes[2])) {doUpd(); return }
            var img = new Image()
            function createDelegate(contextObject, delegateMethod) {
              return function () {return delegateMethod.apply(contextObject, arguments)}
            }
            function imgOnLoad() {
              this.onload = null
              $(el).addClass(classes[2])
              doUpd(2)
            }
            img.onload = createDelegate(img, imgOnLoad)
            img.src = el.src
          }
          /* returns the total height and width sum of all elements matching the selector */
          function sizesSum() {
            if (o.advanced.updateOnSelectorChange === true) {o.advanced.updateOnSelectorChange = "*"}
            var total = 0, sel = mCSB_container.find(o.advanced.updateOnSelectorChange)
            if (o.advanced.updateOnSelectorChange && sel.length > 0) {sel.each(function () {total += this.offsetHeight + this.offsetWidth})}
            return total
          }
          /* calls the update method */
          function doUpd(cb) {
            clearTimeout(mCSB_container[0].autoUpdate)
            methods.update.call(null, $this[0], cb)
          }
        },
        /* -------------------- */


        /* snaps scrolling to a multiple of a pixels number */
        _snapAmount = function (to, amount, offset) {
          return (Math.round(to / amount) * amount - offset)
        },
        /* -------------------- */


        /* stops content and scrollbar animations */
        _stop = function (el) {
          var d = el.data(pluginPfx),
            sel = $("#mCSB_" + d.idx + "_container,#mCSB_" + d.idx + "_container_wrapper,#mCSB_" + d.idx + "_dragger_vertical,#mCSB_" + d.idx + "_dragger_horizontal")
          sel.each(function () {
            _stopTween.call(this)
          })
        },
        /* -------------------- */


        /* 
        ANIMATES CONTENT 
        This is where the actual scrolling happens
        */
        _scrollTo = function (el, to, options) {
          var d = el.data(pluginPfx), o = d.opt,
            defaults = {
              trigger: "internal",
              dir: "y",
              scrollEasing: "mcsEaseOut",
              drag: false,
              dur: o.scrollInertia,
              overwrite: "all",
              callbacks: true,
              onStart: true,
              onUpdate: true,
              onComplete: true
            },
            options = $.extend(defaults, options),
            dur = [options.dur, (options.drag ? 0 : options.dur)],
            mCustomScrollBox = $("#mCSB_" + d.idx),
            mCSB_container = $("#mCSB_" + d.idx + "_container"),
            wrapper = mCSB_container.parent(),
            totalScrollOffsets = o.callbacks.onTotalScrollOffset ? _arr.call(el, o.callbacks.onTotalScrollOffset) : [0, 0],
            totalScrollBackOffsets = o.callbacks.onTotalScrollBackOffset ? _arr.call(el, o.callbacks.onTotalScrollBackOffset) : [0, 0]
          d.trigger = options.trigger
          if (wrapper.scrollTop() !== 0 || wrapper.scrollLeft() !== 0) { /* always reset scrollTop/Left */
            $(".mCSB_" + d.idx + "_scrollbar").css("visibility", "visible")
            wrapper.scrollTop(0).scrollLeft(0)
          }
          if (to === "_resetY" && !d.contentReset.y) {
            /* callbacks: onOverflowYNone */
            if (_cb("onOverflowYNone")) {o.callbacks.onOverflowYNone.call(el[0])}
            d.contentReset.y = 1
          }
          if (to === "_resetX" && !d.contentReset.x) {
            /* callbacks: onOverflowXNone */
            if (_cb("onOverflowXNone")) {o.callbacks.onOverflowXNone.call(el[0])}
            d.contentReset.x = 1
          }
          if (to === "_resetY" || to === "_resetX") {return }
          if ((d.contentReset.y || !el[0].mcs) && d.overflowed[0]) {
            /* callbacks: onOverflowY */
            if (_cb("onOverflowY")) {o.callbacks.onOverflowY.call(el[0])}
            d.contentReset.x = null
          }
          if ((d.contentReset.x || !el[0].mcs) && d.overflowed[1]) {
            /* callbacks: onOverflowX */
            if (_cb("onOverflowX")) {o.callbacks.onOverflowX.call(el[0])}
            d.contentReset.x = null
          }
          if (o.snapAmount) { /* scrolling snapping */
            var snapAmount = !(o.snapAmount instanceof Array) ? o.snapAmount : options.dir === "x" ? o.snapAmount[1] : o.snapAmount[0]
            to = _snapAmount(to, snapAmount, o.snapOffset)
          }
          switch (options.dir) {
            case "x":
              var mCSB_dragger = $("#mCSB_" + d.idx + "_dragger_horizontal"),
                property = "left",
                contentPos = mCSB_container[0].offsetLeft,
                limit = [
                  mCustomScrollBox.width() - mCSB_container.outerWidth(false),
                  mCSB_dragger.parent().width() - mCSB_dragger.width()
                ],
                scrollTo = [to, to === 0 ? 0 : (to / d.scrollRatio.x)],
                tso = totalScrollOffsets[1],
                tsbo = totalScrollBackOffsets[1],
                totalScrollOffset = tso > 0 ? tso / d.scrollRatio.x : 0,
                totalScrollBackOffset = tsbo > 0 ? tsbo / d.scrollRatio.x : 0
              break
            case "y":
              var mCSB_dragger = $("#mCSB_" + d.idx + "_dragger_vertical"),
                property = "top",
                contentPos = mCSB_container[0].offsetTop,
                limit = [
                  mCustomScrollBox.height() - mCSB_container.outerHeight(false),
                  mCSB_dragger.parent().height() - mCSB_dragger.height()
                ],
                scrollTo = [to, to === 0 ? 0 : (to / d.scrollRatio.y)],
                tso = totalScrollOffsets[0],
                tsbo = totalScrollBackOffsets[0],
                totalScrollOffset = tso > 0 ? tso / d.scrollRatio.y : 0,
                totalScrollBackOffset = tsbo > 0 ? tsbo / d.scrollRatio.y : 0
              break
          }
          if (scrollTo[1] < 0 || (scrollTo[0] === 0 && scrollTo[1] === 0)) {
            scrollTo = [0, 0]
          } else if (scrollTo[1] >= limit[1]) {
            scrollTo = [limit[0], limit[1]]
          } else {
            scrollTo[0] = -scrollTo[0]
          }
          if (!el[0].mcs) {
            _mcs()  /* init mcs object (once) to make it available before callbacks */
            if (_cb("onInit")) {o.callbacks.onInit.call(el[0])} /* callbacks: onInit */
          }
          clearTimeout(mCSB_container[0].onCompleteTimeout)
          _tweenTo(mCSB_dragger[0], property, Math.round(scrollTo[1]), dur[1], options.scrollEasing)
          if (!d.tweenRunning && ((contentPos === 0 && scrollTo[0] >= 0) || (contentPos === limit[0] && scrollTo[0] <= limit[0]))) {return }
          _tweenTo(mCSB_container[0], property, Math.round(scrollTo[0]), dur[0], options.scrollEasing, options.overwrite, {
            onStart: function () {
              if (options.callbacks && options.onStart && !d.tweenRunning) {
                /* callbacks: onScrollStart */
                if (_cb("onScrollStart")) {_mcs(); o.callbacks.onScrollStart.call(el[0])}
                d.tweenRunning = true
                _onDragClasses(mCSB_dragger)
                d.cbOffsets = _cbOffsets()
              }
            }, onUpdate: function () {
              if (options.callbacks && options.onUpdate) {
                /* callbacks: whileScrolling */
                if (_cb("whileScrolling")) {_mcs(); o.callbacks.whileScrolling.call(el[0])}
              }
            }, onComplete: function () {
              if (options.callbacks && options.onComplete) {
                if (o.axis === "yx") {clearTimeout(mCSB_container[0].onCompleteTimeout)}
                var t = mCSB_container[0].idleTimer || 0
                mCSB_container[0].onCompleteTimeout = setTimeout(function () {
                  /* callbacks: onScroll, onTotalScroll, onTotalScrollBack */
                  if (_cb("onScroll")) {_mcs(); o.callbacks.onScroll.call(el[0])}
                  if (_cb("onTotalScroll") && scrollTo[1] >= limit[1] - totalScrollOffset && d.cbOffsets[0]) {_mcs(); o.callbacks.onTotalScroll.call(el[0])}
                  if (_cb("onTotalScrollBack") && scrollTo[1] <= totalScrollBackOffset && d.cbOffsets[1]) {_mcs(); o.callbacks.onTotalScrollBack.call(el[0])}
                  d.tweenRunning = false
                  mCSB_container[0].idleTimer = 0
                  _onDragClasses(mCSB_dragger, "hide")
                }, t)
              }
            }
          })
          /* checks if callback function exists */
          function _cb(cb) {
            return d && o.callbacks[cb] && typeof o.callbacks[cb] === "function"
          }
          /* checks whether callback offsets always trigger */
          function _cbOffsets() {
            return [o.callbacks.alwaysTriggerOffsets || contentPos >= limit[0] + tso, o.callbacks.alwaysTriggerOffsets || contentPos <= -tsbo]
          }
          /* 
          populates object with useful values for the user 
          values: 
            content: this.mcs.content
            content top position: this.mcs.top 
            content left position: this.mcs.left 
            dragger top position: this.mcs.draggerTop 
            dragger left position: this.mcs.draggerLeft 
            scrolling y percentage: this.mcs.topPct 
            scrolling x percentage: this.mcs.leftPct 
            scrolling direction: this.mcs.direction
          */
          function _mcs() {
            var cp = [mCSB_container[0].offsetTop, mCSB_container[0].offsetLeft], /* content position */
              dp = [mCSB_dragger[0].offsetTop, mCSB_dragger[0].offsetLeft], /* dragger position */
              cl = [mCSB_container.outerHeight(false), mCSB_container.outerWidth(false)], /* content length */
              pl = [mCustomScrollBox.height(), mCustomScrollBox.width()] /* content parent length */
            el[0].mcs = {
              content: mCSB_container, /* original content wrapper as jquery object */
              top: cp[0], left: cp[1], draggerTop: dp[0], draggerLeft: dp[1],
              topPct: Math.round((100 * Math.abs(cp[0])) / (Math.abs(cl[0]) - pl[0])), leftPct: Math.round((100 * Math.abs(cp[1])) / (Math.abs(cl[1]) - pl[1])),
              direction: options.dir
            }
            /* 
            this refers to the original element containing the scrollbar(s)
            usage: this.mcs.top, this.mcs.leftPct etc. 
            */
          }
        },
        /* -------------------- */


        /* 
        CUSTOM JAVASCRIPT ANIMATION TWEEN 
        Lighter and faster than jquery animate() and css transitions 
        Animates top/left properties and includes easings 
        */
        _tweenTo = function (el, prop, to, duration, easing, overwrite, callbacks) {
          if (!el._mTween) {el._mTween = {top: {}, left: {}}}
          var callbacks = callbacks || {},
            onStart = callbacks.onStart || function () {}, onUpdate = callbacks.onUpdate || function () {}, onComplete = callbacks.onComplete || function () {},
            startTime = _getTime(), _delay, progress = 0, from = el.offsetTop, elStyle = el.style, _request, tobj = el._mTween[prop]
          if (prop === "left") {from = el.offsetLeft}
          var diff = to - from
          tobj.stop = 0
          if (overwrite !== "none") {_cancelTween()}
          _startTween()
          function _step() {
            if (tobj.stop) {return }
            if (!progress) {onStart.call()}
            progress = _getTime() - startTime
            _tween()
            if (progress >= tobj.time) {
              tobj.time = (progress > tobj.time) ? progress + _delay - (progress - tobj.time) : progress + _delay - 1
              if (tobj.time < progress + 1) {tobj.time = progress + 1}
            }
            if (tobj.time < duration) {tobj.id = _request(_step)} else {onComplete.call()}
          }
          function _tween() {
            if (duration > 0) {
              tobj.currVal = _ease(tobj.time, from, diff, duration, easing)
              elStyle[prop] = Math.round(tobj.currVal) + "px"
            } else {
              elStyle[prop] = to + "px"
            }
            onUpdate.call()
          }
          function _startTween() {
            _delay = 1000 / 60
            tobj.time = progress + _delay
            _request = (!window.requestAnimationFrame) ? function (f) {_tween(); return setTimeout(f, 0.01)} : window.requestAnimationFrame
            tobj.id = _request(_step)
          }
          function _cancelTween() {
            if (tobj.id == null) {return }
            if (!window.requestAnimationFrame) {
              clearTimeout(tobj.id)
            } else {window.cancelAnimationFrame(tobj.id)}
            tobj.id = null
          }
          function _ease(t, b, c, d, type) {
            switch (type) {
              case "linear": case "mcsLinear":
                return c * t / d + b
                break
              case "mcsLinearOut":
                t /= d; t--; return c * Math.sqrt(1 - t * t) + b
                break
              case "easeInOutSmooth":
                t /= d / 2
                if (t < 1) return c / 2 * t * t + b
                t--
                return -c / 2 * (t * (t - 2) - 1) + b
                break
              case "easeInOutStrong":
                t /= d / 2
                if (t < 1) return c / 2 * Math.pow(2, 10 * (t - 1)) + b
                t--
                return c / 2 * (-Math.pow(2, -10 * t) + 2) + b
                break
              case "easeInOut": case "mcsEaseInOut":
                t /= d / 2
                if (t < 1) return c / 2 * t * t * t + b
                t -= 2
                return c / 2 * (t * t * t + 2) + b
                break
              case "easeOutSmooth":
                t /= d; t--
                return -c * (t * t * t * t - 1) + b
                break
              case "easeOutStrong":
                return c * (-Math.pow(2, -10 * t / d) + 1) + b
                break
              case "easeOut": case "mcsEaseOut": default:
                var ts = (t /= d) * t, tc = ts * t
                return b + c * (0.499999999999997 * tc * ts + -2.5 * ts * ts + 5.5 * tc + -6.5 * ts + 4 * t)
            }
          }
        },
        /* -------------------- */


        /* returns current time */
        _getTime = function () {
          if (window.performance && window.performance.now) {
            return window.performance.now()
          } else {
            if (window.performance && window.performance.webkitNow) {
              return window.performance.webkitNow()
            } else {
              if (Date.now) {return Date.now()} else {return new Date().getTime()}
            }
          }
        },
        /* -------------------- */


        /* stops a tween */
        _stopTween = function () {
          var el = this
          if (!el._mTween) {el._mTween = {top: {}, left: {}}}
          var props = ["top", "left"]
          for (var i = 0; i < props.length; i++) {
            var prop = props[i]
            if (el._mTween[prop].id) {
              if (!window.requestAnimationFrame) {
                clearTimeout(el._mTween[prop].id)
              } else {window.cancelAnimationFrame(el._mTween[prop].id)}
              el._mTween[prop].id = null
              el._mTween[prop].stop = 1
            }
          }
        },
        /* -------------------- */


        /* deletes a property (avoiding the exception thrown by IE) */
        _delete = function (c, m) {
          try {delete c[m]} catch (e) {c[m] = null}
        },
        /* -------------------- */


        /* detects left mouse button */
        _mouseBtnLeft = function (e) {
          return !(e.which && e.which !== 1)
        },
        /* -------------------- */


        /* detects if pointer type event is touch */
        _pointerTouch = function (e) {
          var t = e.originalEvent.pointerType
          return !(t && t !== "touch" && t !== 2)
        },
        /* -------------------- */


        /* checks if value is numeric */
        _isNumeric = function (val) {
          return !isNaN(parseFloat(val)) && isFinite(val)
        },
        /* -------------------- */


        /* returns element position according to content */
        _childPos = function (el) {
          var p = el.parents(".mCSB_container")
          return [el.offset().top - p.offset().top, el.offset().left - p.offset().left]
        },
        /* -------------------- */


        /* checks if browser tab is hidden/inactive via Page Visibility API */
        _isTabHidden = function () {
          var prop = _getHiddenProp()
          if (!prop) return false
          return document[prop]
          function _getHiddenProp() {
            var pfx = ["webkit", "moz", "ms", "o"]
            if ("hidden" in document) return "hidden" //natively supported
            for (var i = 0; i < pfx.length; i++) { //prefixed
              if ((pfx[i] + "Hidden") in document)
                return pfx[i] + "Hidden"
            }
            return null //not supported
          }
        }
      /* -------------------- */





      /* 
      ----------------------------------------
      PLUGIN SETUP 
      ----------------------------------------
      */

      /* plugin constructor functions */
      $.fn[pluginNS] = function (method) { /* usage: $(selector).mCustomScrollbar(); */
        if (methods[method]) {
          return methods[method].apply(this, Array.prototype.slice.call(arguments, 1))
        } else if (typeof method === "object" || !method) {
          return methods.init.apply(this, arguments)
        } else {
          $.error("Method " + method + " does not exist")
        }
      }
      $[pluginNS] = function (method) { /* usage: $.mCustomScrollbar(); */
        if (methods[method]) {
          return methods[method].apply(this, Array.prototype.slice.call(arguments, 1))
        } else if (typeof method === "object" || !method) {
          return methods.init.apply(this, arguments)
        } else {
          $.error("Method " + method + " does not exist")
        }
      }

      /* 
      allow setting plugin default options. 
      usage: $.mCustomScrollbar.defaults.scrollInertia=500; 
      to apply any changed default options on default selectors (below), use inside document ready fn 
      e.g.: $(document).ready(function(){ $.mCustomScrollbar.defaults.scrollInertia=500; });
      */
      $[pluginNS].defaults = defaults

      /* 
      add window object (window.mCustomScrollbar) 
      usage: if(window.mCustomScrollbar){console.log("custom scrollbar plugin loaded");}
      */
      window[pluginNS] = true

      $(window).bind("load", function () {

        $(defaultSelector)[pluginNS]() /* add scrollbars automatically on default selector */

        /* extend jQuery expressions */
        $.extend($.expr[":"], {
          /* checks if element is within scrollable viewport */
          mcsInView: $.expr[":"].mcsInView || function (el) {
            var $el = $(el), content = $el.parents(".mCSB_container"), wrapper, cPos
            if (!content.length) {return }
            wrapper = content.parent()
            cPos = [content[0].offsetTop, content[0].offsetLeft]
            return cPos[0] + _childPos($el)[0] >= 0 && cPos[0] + _childPos($el)[0] < wrapper.height() - $el.outerHeight(false) &&
              cPos[1] + _childPos($el)[1] >= 0 && cPos[1] + _childPos($el)[1] < wrapper.width() - $el.outerWidth(false)
          },
          /* checks if element or part of element is in view of scrollable viewport */
          mcsInSight: $.expr[":"].mcsInSight || function (el, i, m) {
            var $el = $(el), elD, content = $el.parents(".mCSB_container"), wrapperView, pos, wrapperViewPct,
              pctVals = m[3] === "exact" ? [[1, 0], [1, 0]] : [[0.9, 0.1], [0.6, 0.4]]
            if (!content.length) {return }
            elD = [$el.outerHeight(false), $el.outerWidth(false)]
            pos = [content[0].offsetTop + _childPos($el)[0], content[0].offsetLeft + _childPos($el)[1]]
            wrapperView = [content.parent()[0].offsetHeight, content.parent()[0].offsetWidth]
            wrapperViewPct = [elD[0] < wrapperView[0] ? pctVals[0] : pctVals[1], elD[1] < wrapperView[1] ? pctVals[0] : pctVals[1]]
            return pos[0] - (wrapperView[0] * wrapperViewPct[0][0]) < 0 && pos[0] + elD[0] - (wrapperView[0] * wrapperViewPct[0][1]) >= 0 &&
              pos[1] - (wrapperView[1] * wrapperViewPct[1][0]) < 0 && pos[1] + elD[1] - (wrapperView[1] * wrapperViewPct[1][1]) >= 0
          },
          /* checks if element is overflowed having visible scrollbar(s) */
          mcsOverflow: $.expr[":"].mcsOverflow || function (el) {
            var d = $(el).data(pluginPfx)
            if (!d) {return }
            return d.overflowed[0] || d.overflowed[1]
          }
        })

      })

    }))
  }));

/*!
 * jQuery Validation Plugin v1.17.0
 *
 * https://jqueryvalidation.org/
 *
 * Copyright (c) 2017 Jörn Zaefferer
 * Released under the MIT license
 */
(function (factory) {
  if (typeof define === "function" && define.amd) {
    define(["jquery"], factory)
  } else if (typeof module === "object" && module.exports) {
    module.exports = factory(require("jquery"))
  } else {
    factory(jQuery)
  }
}(function ($) {

  $.extend($.fn, {

    // https://jqueryvalidation.org/validate/
    validate: function (options) {

      // If nothing is selected, return nothing; can't chain anyway
      if (!this.length) {
        if (options && options.debug && window.console) {
          console.warn("Nothing selected, can't validate, returning nothing.")
        }
        return
      }

      // Check if a validator for this form was already created
      var validator = $.data(this[0], "validator")
      if (validator) {
        return validator
      }

      // Add novalidate tag if HTML5.
      this.attr("novalidate", "novalidate")

      validator = new $.validator(options, this[0])
      $.data(this[0], "validator", validator)

      if (validator.settings.onsubmit) {

        this.on("click.validate", ":submit", function (event) {

          // Track the used submit button to properly handle scripted
          // submits later.
          validator.submitButton = event.currentTarget

          // Allow suppressing validation by adding a cancel class to the submit button
          if ($(this).hasClass("cancel")) {
            validator.cancelSubmit = true
          }

          // Allow suppressing validation by adding the html5 formnovalidate attribute to the submit button
          if ($(this).attr("formnovalidate") !== undefined) {
            validator.cancelSubmit = true
          }
        })

        // Validate the form on submit
        this.on("submit.validate", function (event) {
          if (validator.settings.debug) {

            // Prevent form submit to be able to see console output
            event.preventDefault()
          }
          function handle() {
            var hidden, result

            // Insert a hidden input as a replacement for the missing submit button
            // The hidden input is inserted in two cases:
            //   - A user defined a `submitHandler`
            //   - There was a pending request due to `remote` method and `stopRequest()`
            //     was called to submit the form in case it's valid
            if (validator.submitButton && (validator.settings.submitHandler || validator.formSubmitted)) {
              hidden = $("<input type='hidden'/>")
                .attr("name", validator.submitButton.name)
                .val($(validator.submitButton).val())
                .appendTo(validator.currentForm)
            }

            if (validator.settings.submitHandler) {
              result = validator.settings.submitHandler.call(validator, validator.currentForm, event)
              if (hidden) {

                // And clean up afterwards; thanks to no-block-scope, hidden can be referenced
                hidden.remove()
              }
              if (result !== undefined) {
                return result
              }
              return false
            }
            return true
          }

          // Prevent submit for invalid forms or custom submit handlers
          if (validator.cancelSubmit) {
            validator.cancelSubmit = false
            return handle()
          }
          if (validator.form()) {
            if (validator.pendingRequest) {
              validator.formSubmitted = true
              return false
            }
            return handle()
          } else {
            validator.focusInvalid()
            return false
          }
        })
      }

      return validator
    },

    // https://jqueryvalidation.org/valid/
    valid: function () {
      var valid, validator, errorList

      if ($(this[0]).is("form")) {
        valid = this.validate().form()
      } else {
        errorList = []
        valid = true
        validator = $(this[0].form).validate()
        this.each(function () {
          valid = validator.element(this) && valid
          if (!valid) {
            errorList = errorList.concat(validator.errorList)
          }
        })
        validator.errorList = errorList
      }
      return valid
    },

    // https://jqueryvalidation.org/rules/
    rules: function (command, argument) {
      var element = this[0],
        settings, staticRules, existingRules, data, param, filtered

      // If nothing is selected, return empty object; can't chain anyway
      if (element == null) {
        return
      }

      if (!element.form && element.hasAttribute("contenteditable")) {
        element.form = this.closest("form")[0]
        element.name = this.attr("name")
      }

      if (element.form == null) {
        return
      }

      if (command) {
        settings = $.data(element.form, "validator").settings
        staticRules = settings.rules
        existingRules = $.validator.staticRules(element)
        switch (command) {
          case "add":
            $.extend(existingRules, $.validator.normalizeRule(argument))

            // Remove messages from rules, but allow them to be set separately
            delete existingRules.messages
            staticRules[element.name] = existingRules
            if (argument.messages) {
              settings.messages[element.name] = $.extend(settings.messages[element.name], argument.messages)
            }
            break
          case "remove":
            if (!argument) {
              delete staticRules[element.name]
              return existingRules
            }
            filtered = {}
            $.each(argument.split(/\s/), function (index, method) {
              filtered[method] = existingRules[method]
              delete existingRules[method]
            })
            return filtered
        }
      }

      data = $.validator.normalizeRules(
        $.extend(
          {},
          $.validator.classRules(element),
          $.validator.attributeRules(element),
          $.validator.dataRules(element),
          $.validator.staticRules(element)
        ), element)

      // Make sure required is at front
      if (data.required) {
        param = data.required
        delete data.required
        data = $.extend({required: param}, data)
      }

      // Make sure remote is at back
      if (data.remote) {
        param = data.remote
        delete data.remote
        data = $.extend(data, {remote: param})
      }

      return data
    }
  })

  // Custom selectors
  $.extend($.expr.pseudos || $.expr[":"], {		// '|| $.expr[ ":" ]' here enables backwards compatibility to jQuery 1.7. Can be removed when dropping jQ 1.7.x support

    // https://jqueryvalidation.org/blank-selector/
    blank: function (a) {
      return !$.trim("" + $(a).val())
    },

    // https://jqueryvalidation.org/filled-selector/
    filled: function (a) {
      var val = $(a).val()
      return val !== null && !!$.trim("" + val)
    },

    // https://jqueryvalidation.org/unchecked-selector/
    unchecked: function (a) {
      return !$(a).prop("checked")
    }
  })

  // Constructor for validator
  $.validator = function (options, form) {
    this.settings = $.extend(true, {}, $.validator.defaults, options)
    this.currentForm = form
    this.init()
  }

  // https://jqueryvalidation.org/jQuery.validator.format/
  $.validator.format = function (source, params) {
    if (arguments.length === 1) {
      return function () {
        var args = $.makeArray(arguments)
        args.unshift(source)
        return $.validator.format.apply(this, args)
      }
    }
    if (params === undefined) {
      return source
    }
    if (arguments.length > 2 && params.constructor !== Array) {
      params = $.makeArray(arguments).slice(1)
    }
    if (params.constructor !== Array) {
      params = [params]
    }
    $.each(params, function (i, n) {
      source = source.replace(new RegExp("\\{" + i + "\\}", "g"), function () {
        return n
      })
    })
    return source
  }

  $.extend($.validator, {

    defaults: {
      messages: {},
      groups: {},
      rules: {},
      errorClass: "error",
      pendingClass: "pending",
      validClass: "valid",
      errorElement: "label",
      focusCleanup: false,
      focusInvalid: true,
      errorContainer: $([]),
      errorLabelContainer: $([]),
      onsubmit: true,
      ignore: ":hidden",
      ignoreTitle: false,
      onfocusin: function (element) {
        this.lastActive = element

        // Hide error label and remove error class on focus if enabled
        if (this.settings.focusCleanup) {
          if (this.settings.unhighlight) {
            this.settings.unhighlight.call(this, element, this.settings.errorClass, this.settings.validClass)
          }
          this.hideThese(this.errorsFor(element))
        }
      },
      onfocusout: function (element) {
        if (!this.checkable(element) && (element.name in this.submitted || !this.optional(element))) {
          this.element(element)
        }
      },
      onkeyup: function (element, event) {

        // Avoid revalidate the field when pressing one of the following keys
        // Shift       => 16
        // Ctrl        => 17
        // Alt         => 18
        // Caps lock   => 20
        // End         => 35
        // Home        => 36
        // Left arrow  => 37
        // Up arrow    => 38
        // Right arrow => 39
        // Down arrow  => 40
        // Insert      => 45
        // Num lock    => 144
        // AltGr key   => 225
        var excludedKeys = [
          16, 17, 18, 20, 35, 36, 37,
          38, 39, 40, 45, 144, 225
        ]

        if (event.which === 9 && this.elementValue(element) === "" || $.inArray(event.keyCode, excludedKeys) !== -1) {
          return
        } else if (element.name in this.submitted || element.name in this.invalid) {
          this.element(element)
        }
      },
      onclick: function (element) {

        // Click on selects, radiobuttons and checkboxes
        if (element.name in this.submitted) {
          this.element(element)

          // Or option elements, check parent select in that case
        } else if (element.parentNode.name in this.submitted) {
          this.element(element.parentNode)
        }
      },
      highlight: function (element, errorClass, validClass) {
        if (element.type === "radio") {
          this.findByName(element.name).addClass(errorClass).removeClass(validClass)
        } else {
          $(element).addClass(errorClass).removeClass(validClass)
        }
      },
      unhighlight: function (element, errorClass, validClass) {
        if (element.type === "radio") {
          this.findByName(element.name).removeClass(errorClass).addClass(validClass)
        } else {
          $(element).removeClass(errorClass).addClass(validClass)
        }
      }
    },

    // https://jqueryvalidation.org/jQuery.validator.setDefaults/
    setDefaults: function (settings) {
      $.extend($.validator.defaults, settings)
    },

    messages: {
      required: "This field is required.",
      remote: "Please fix this field.",
      email: "Please enter a valid email address.",
      url: "Please enter a valid URL.",
      date: "Please enter a valid date.",
      dateISO: "Please enter a valid date (ISO).",
      number: "Please enter a valid number.",
      digits: "Please enter only digits.",
      equalTo: "Please enter the same value again.",
      maxlength: $.validator.format("Please enter no more than {0} characters."),
      minlength: $.validator.format("Please enter at least {0} characters."),
      rangelength: $.validator.format("Please enter a value between {0} and {1} characters long."),
      range: $.validator.format("Please enter a value between {0} and {1}."),
      max: $.validator.format("Please enter a value less than or equal to {0}."),
      min: $.validator.format("Please enter a value greater than or equal to {0}."),
      step: $.validator.format("Please enter a multiple of {0}.")
    },

    autoCreateRanges: false,

    prototype: {

      init: function () {
        this.labelContainer = $(this.settings.errorLabelContainer)
        this.errorContext = this.labelContainer.length && this.labelContainer || $(this.currentForm)
        this.containers = $(this.settings.errorContainer).add(this.settings.errorLabelContainer)
        this.submitted = {}
        this.valueCache = {}
        this.pendingRequest = 0
        this.pending = {}
        this.invalid = {}
        this.reset()

        var groups = (this.groups = {}),
          rules
        $.each(this.settings.groups, function (key, value) {
          if (typeof value === "string") {
            value = value.split(/\s/)
          }
          $.each(value, function (index, name) {
            groups[name] = key
          })
        })
        rules = this.settings.rules
        $.each(rules, function (key, value) {
          rules[key] = $.validator.normalizeRule(value)
        })

        function delegate(event) {

          // Set form expando on contenteditable
          if (!this.form && this.hasAttribute("contenteditable")) {
            this.form = $(this).closest("form")[0]
            this.name = $(this).attr("name")
          }

          var validator = $.data(this.form, "validator"),
            eventType = "on" + event.type.replace(/^validate/, ""),
            settings = validator.settings
          if (settings[eventType] && !$(this).is(settings.ignore)) {
            settings[eventType].call(validator, this, event)
          }
        }

        $(this.currentForm)
          .on("focusin.validate focusout.validate keyup.validate",
            ":text, [type='password'], [type='file'], select, textarea, [type='number'], [type='search'], " +
            "[type='tel'], [type='url'], [type='email'], [type='datetime'], [type='date'], [type='month'], " +
            "[type='week'], [type='time'], [type='datetime-local'], [type='range'], [type='color'], " +
            "[type='radio'], [type='checkbox'], [contenteditable], [type='button']", delegate)

          // Support: Chrome, oldIE
          // "select" is provided as event.target when clicking a option
          .on("click.validate", "select, option, [type='radio'], [type='checkbox']", delegate)

        if (this.settings.invalidHandler) {
          $(this.currentForm).on("invalid-form.validate", this.settings.invalidHandler)
        }
      },

      // https://jqueryvalidation.org/Validator.form/
      form: function () {
        this.checkForm()
        $.extend(this.submitted, this.errorMap)
        this.invalid = $.extend({}, this.errorMap)
        if (!this.valid()) {
          $(this.currentForm).triggerHandler("invalid-form", [this])
        }
        this.showErrors()
        return this.valid()
      },

      checkForm: function () {
        this.prepareForm()
        for (var i = 0, elements = (this.currentElements = this.elements()); elements[i]; i++) {
          this.check(elements[i])
        }
        return this.valid()
      },

      // https://jqueryvalidation.org/Validator.element/
      element: function (element) {
        var cleanElement = this.clean(element),
          checkElement = this.validationTargetFor(cleanElement),
          v = this,
          result = true,
          rs, group

        if (checkElement === undefined) {
          delete this.invalid[cleanElement.name]
        } else {
          this.prepareElement(checkElement)
          this.currentElements = $(checkElement)

          // If this element is grouped, then validate all group elements already
          // containing a value
          group = this.groups[checkElement.name]
          if (group) {
            $.each(this.groups, function (name, testgroup) {
              if (testgroup === group && name !== checkElement.name) {
                cleanElement = v.validationTargetFor(v.clean(v.findByName(name)))
                if (cleanElement && cleanElement.name in v.invalid) {
                  v.currentElements.push(cleanElement)
                  result = v.check(cleanElement) && result
                }
              }
            })
          }

          rs = this.check(checkElement) !== false
          result = result && rs
          if (rs) {
            this.invalid[checkElement.name] = false
          } else {
            this.invalid[checkElement.name] = true
          }

          if (!this.numberOfInvalids()) {

            // Hide error containers on last error
            this.toHide = this.toHide.add(this.containers)
          }
          this.showErrors()

          // Add aria-invalid status for screen readers
          $(element).attr("aria-invalid", !rs)
        }

        return result
      },

      // https://jqueryvalidation.org/Validator.showErrors/
      showErrors: function (errors) {
        if (errors) {
          var validator = this

          // Add items to error list and map
          $.extend(this.errorMap, errors)
          this.errorList = $.map(this.errorMap, function (message, name) {
            return {
              message: message,
              element: validator.findByName(name)[0]
            }
          })

          // Remove items from success list
          this.successList = $.grep(this.successList, function (element) {
            return !(element.name in errors)
          })
        }
        if (this.settings.showErrors) {
          this.settings.showErrors.call(this, this.errorMap, this.errorList)
        } else {
          this.defaultShowErrors()
        }
      },

      // https://jqueryvalidation.org/Validator.resetForm/
      resetForm: function () {
        if ($.fn.resetForm) {
          $(this.currentForm).resetForm()
        }
        this.invalid = {}
        this.submitted = {}
        this.prepareForm()
        this.hideErrors()
        var elements = this.elements()
          .removeData("previousValue")
          .removeAttr("aria-invalid")

        this.resetElements(elements)
      },

      resetElements: function (elements) {
        var i

        if (this.settings.unhighlight) {
          for (i = 0; elements[i]; i++) {
            this.settings.unhighlight.call(this, elements[i],
              this.settings.errorClass, "")
            this.findByName(elements[i].name).removeClass(this.settings.validClass)
          }
        } else {
          elements
            .removeClass(this.settings.errorClass)
            .removeClass(this.settings.validClass)
        }
      },

      numberOfInvalids: function () {
        return this.objectLength(this.invalid)
      },

      objectLength: function (obj) {
        /* jshint unused: false */
        var count = 0,
          i
        for (i in obj) {

          // This check allows counting elements with empty error
          // message as invalid elements
          if (obj[i] !== undefined && obj[i] !== null && obj[i] !== false) {
            count++
          }
        }
        return count
      },

      hideErrors: function () {
        this.hideThese(this.toHide)
      },

      hideThese: function (errors) {
        errors.not(this.containers).text("")
        this.addWrapper(errors).hide()
      },

      valid: function () {
        return this.size() === 0
      },

      size: function () {
        return this.errorList.length
      },

      focusInvalid: function () {
        if (this.settings.focusInvalid) {
          try {
            $(this.findLastActive() || this.errorList.length && this.errorList[0].element || [])
              .filter(":visible")
              .focus()

              // Manually trigger focusin event; without it, focusin handler isn't called, findLastActive won't have anything to find
              .trigger("focusin")
          } catch (e) {

            // Ignore IE throwing errors when focusing hidden elements
          }
        }
      },

      findLastActive: function () {
        var lastActive = this.lastActive
        return lastActive && $.grep(this.errorList, function (n) {
          return n.element.name === lastActive.name
        }).length === 1 && lastActive
      },

      elements: function () {
        var validator = this,
          rulesCache = {}

        // Select all valid inputs inside the form (no submit or reset buttons)
        return $(this.currentForm)
          .find("input, select, textarea, [contenteditable]")
          .not(":submit, :reset, :image, :disabled")
          .not(this.settings.ignore)
          .filter(function () {
            var name = this.name || $(this).attr("name") // For contenteditable
            if (!name && validator.settings.debug && window.console) {
              console.error("%o has no name assigned", this)
            }

            // Set form expando on contenteditable
            if (this.hasAttribute("contenteditable")) {
              this.form = $(this).closest("form")[0]
              this.name = name
            }

            // Select only the first element for each name, and only those with rules specified
            if (name in rulesCache || !validator.objectLength($(this).rules())) {
              return false
            }

            rulesCache[name] = true
            return true
          })
      },

      clean: function (selector) {
        return $(selector)[0]
      },

      errors: function () {
        var errorClass = this.settings.errorClass.split(" ").join(".")
        return $(this.settings.errorElement + "." + errorClass, this.errorContext)
      },

      resetInternals: function () {
        this.successList = []
        this.errorList = []
        this.errorMap = {}
        this.toShow = $([])
        this.toHide = $([])
      },

      reset: function () {
        this.resetInternals()
        this.currentElements = $([])
      },

      prepareForm: function () {
        this.reset()
        this.toHide = this.errors().add(this.containers)
      },

      prepareElement: function (element) {
        this.reset()
        this.toHide = this.errorsFor(element)
      },

      elementValue: function (element) {
        var $element = $(element),
          type = element.type,
          val, idx

        if (type === "radio" || type === "checkbox") {
          return this.findByName(element.name).filter(":checked").val()
        } else if (type === "number" && typeof element.validity !== "undefined") {
          return element.validity.badInput ? "NaN" : $element.val()
        }

        if (element.hasAttribute("contenteditable")) {
          val = $element.text()
        } else {
          val = $element.val()
        }

        if (type === "file") {

          // Modern browser (chrome & safari)
          if (val.substr(0, 12) === "C:\\fakepath\\") {
            return val.substr(12)
          }

          // Legacy browsers
          // Unix-based path
          idx = val.lastIndexOf("/")
          if (idx >= 0) {
            return val.substr(idx + 1)
          }

          // Windows-based path
          idx = val.lastIndexOf("\\")
          if (idx >= 0) {
            return val.substr(idx + 1)
          }

          // Just the file name
          return val
        }

        if (typeof val === "string") {
          return val.replace(/\r/g, "")
        }
        return val
      },

      check: function (element) {
        element = this.validationTargetFor(this.clean(element))

        var rules = $(element).rules(),
          rulesCount = $.map(rules, function (n, i) {
            return i
          }).length,
          dependencyMismatch = false,
          val = this.elementValue(element),
          result, method, rule, normalizer

        // Prioritize the local normalizer defined for this element over the global one
        // if the former exists, otherwise user the global one in case it exists.
        if (typeof rules.normalizer === "function") {
          normalizer = rules.normalizer
        } else if (typeof this.settings.normalizer === "function") {
          normalizer = this.settings.normalizer
        }

        // If normalizer is defined, then call it to retreive the changed value instead
        // of using the real one.
        // Note that `this` in the normalizer is `element`.
        if (normalizer) {
          val = normalizer.call(element, val)

          if (typeof val !== "string") {
            throw new TypeError("The normalizer should return a string value.")
          }

          // Delete the normalizer from rules to avoid treating it as a pre-defined method.
          delete rules.normalizer
        }

        for (method in rules) {
          rule = {method: method, parameters: rules[method]}
          try {
            result = $.validator.methods[method].call(this, val, element, rule.parameters)

            // If a method indicates that the field is optional and therefore valid,
            // don't mark it as valid when there are no other rules
            if (result === "dependency-mismatch" && rulesCount === 1) {
              dependencyMismatch = true
              continue
            }
            dependencyMismatch = false

            if (result === "pending") {
              this.toHide = this.toHide.not(this.errorsFor(element))
              return
            }

            if (!result) {
              this.formatAndAdd(element, rule)
              return false
            }
          } catch (e) {
            if (this.settings.debug && window.console) {
              console.log("Exception occurred when checking element " + element.id + ", check the '" + rule.method + "' method.", e)
            }
            if (e instanceof TypeError) {
              e.message += ".  Exception occurred when checking element " + element.id + ", check the '" + rule.method + "' method."
            }

            throw e
          }
        }
        if (dependencyMismatch) {
          return
        }
        if (this.objectLength(rules)) {
          this.successList.push(element)
        }
        return true
      },

      // Return the custom message for the given element and validation method
      // specified in the element's HTML5 data attribute
      // return the generic message if present and no method specific message is present
      customDataMessage: function (element, method) {
        return $(element).data("msg" + method.charAt(0).toUpperCase() +
          method.substring(1).toLowerCase()) || $(element).data("msg")
      },

      // Return the custom message for the given element name and validation method
      customMessage: function (name, method) {
        var m = this.settings.messages[name]
        return m && (m.constructor === String ? m : m[method])
      },

      // Return the first defined argument, allowing empty strings
      findDefined: function () {
        for (var i = 0; i < arguments.length; i++) {
          if (arguments[i] !== undefined) {
            return arguments[i]
          }
        }
        return undefined
      },

      // The second parameter 'rule' used to be a string, and extended to an object literal
      // of the following form:
      // rule = {
      //     method: "method name",
      //     parameters: "the given method parameters"
      // }
      //
      // The old behavior still supported, kept to maintain backward compatibility with
      // old code, and will be removed in the next major release.
      defaultMessage: function (element, rule) {
        if (typeof rule === "string") {
          rule = {method: rule}
        }

        var message = this.findDefined(
          this.customMessage(element.name, rule.method),
          this.customDataMessage(element, rule.method),

          // 'title' is never undefined, so handle empty string as undefined
          !this.settings.ignoreTitle && element.title || undefined,
          $.validator.messages[rule.method],
          "<strong>Warning: No message defined for " + element.name + "</strong>"
        ),
          theregex = /\$?\{(\d+)\}/g
        if (typeof message === "function") {
          message = message.call(this, rule.parameters, element)
        } else if (theregex.test(message)) {
          message = $.validator.format(message.replace(theregex, "{$1}"), rule.parameters)
        }

        return message
      },

      formatAndAdd: function (element, rule) {
        var message = this.defaultMessage(element, rule)

        this.errorList.push({
          message: message,
          element: element,
          method: rule.method
        })

        this.errorMap[element.name] = message
        this.submitted[element.name] = message
      },

      addWrapper: function (toToggle) {
        if (this.settings.wrapper) {
          toToggle = toToggle.add(toToggle.parent(this.settings.wrapper))
        }
        return toToggle
      },

      defaultShowErrors: function () {
        var i, elements, error
        for (i = 0; this.errorList[i]; i++) {
          error = this.errorList[i]
          if (this.settings.highlight) {
            this.settings.highlight.call(this, error.element, this.settings.errorClass, this.settings.validClass)
          }
          this.showLabel(error.element, error.message)
        }
        if (this.errorList.length) {
          this.toShow = this.toShow.add(this.containers)
        }
        if (this.settings.success) {
          for (i = 0; this.successList[i]; i++) {
            this.showLabel(this.successList[i])
          }
        }
        if (this.settings.unhighlight) {
          for (i = 0, elements = this.validElements(); elements[i]; i++) {
            this.settings.unhighlight.call(this, elements[i], this.settings.errorClass, this.settings.validClass)
          }
        }
        this.toHide = this.toHide.not(this.toShow)
        this.hideErrors()
        this.addWrapper(this.toShow).show()
      },

      validElements: function () {
        return this.currentElements.not(this.invalidElements())
      },

      invalidElements: function () {
        return $(this.errorList).map(function () {
          return this.element
        })
      },

      showLabel: function (element, message) {
        var place, group, errorID, v,
          error = this.errorsFor(element),
          elementID = this.idOrName(element),
          describedBy = $(element).attr("aria-describedby")

        if (error.length) {

          // Refresh error/success class
          error.removeClass(this.settings.validClass).addClass(this.settings.errorClass)

          // Replace message on existing label
          error.html(message)
        } else {

          // Create error element
          error = $("<" + this.settings.errorElement + ">")
            .attr("id", elementID + "-error")
            .addClass(this.settings.errorClass)
            .html(message || "")

          // Maintain reference to the element to be placed into the DOM
          place = error
          if (this.settings.wrapper) {

            // Make sure the element is visible, even in IE
            // actually showing the wrapped element is handled elsewhere
            place = error.hide().show().wrap("<" + this.settings.wrapper + "/>").parent()
          }
          if (this.labelContainer.length) {
            this.labelContainer.append(place)
          } else if (this.settings.errorPlacement) {
            this.settings.errorPlacement.call(this, place, $(element))
          } else {
            place.insertAfter(element)
          }

          // Link error back to the element
          if (error.is("label")) {

            // If the error is a label, then associate using 'for'
            error.attr("for", elementID)

            // If the element is not a child of an associated label, then it's necessary
            // to explicitly apply aria-describedby
          } else if (error.parents("label[for='" + this.escapeCssMeta(elementID) + "']").length === 0) {
            errorID = error.attr("id")

            // Respect existing non-error aria-describedby
            if (!describedBy) {
              describedBy = errorID
            } else if (!describedBy.match(new RegExp("\\b" + this.escapeCssMeta(errorID) + "\\b"))) {

              // Add to end of list if not already present
              describedBy += " " + errorID
            }
            $(element).attr("aria-describedby", describedBy)

            // If this element is grouped, then assign to all elements in the same group
            group = this.groups[element.name]
            if (group) {
              v = this
              $.each(v.groups, function (name, testgroup) {
                if (testgroup === group) {
                  $("[name='" + v.escapeCssMeta(name) + "']", v.currentForm)
                    .attr("aria-describedby", error.attr("id"))
                }
              })
            }
          }
        }
        if (!message && this.settings.success) {
          error.text("")
          if (typeof this.settings.success === "string") {
            error.addClass(this.settings.success)
          } else {
            this.settings.success(error, element)
          }
        }
        this.toShow = this.toShow.add(error)
      },

      errorsFor: function (element) {
        var name = this.escapeCssMeta(this.idOrName(element)),
          describer = $(element).attr("aria-describedby"),
          selector = "label[for='" + name + "'], label[for='" + name + "'] *"

        // 'aria-describedby' should directly reference the error element
        if (describer) {
          selector = selector + ", #" + this.escapeCssMeta(describer)
            .replace(/\s+/g, ", #")
        }

        return this
          .errors()
          .filter(selector)
      },

      // See https://api.jquery.com/category/selectors/, for CSS
      // meta-characters that should be escaped in order to be used with JQuery
      // as a literal part of a name/id or any selector.
      escapeCssMeta: function (string) {
        return string.replace(/([\\!"#$%&'()*+,./:;<=>?@\[\]^`{|}~])/g, "\\$1")
      },

      idOrName: function (element) {
        return this.groups[element.name] || (this.checkable(element) ? element.name : element.id || element.name)
      },

      validationTargetFor: function (element) {

        // If radio/checkbox, validate first element in group instead
        if (this.checkable(element)) {
          element = this.findByName(element.name)
        }

        // Always apply ignore filter
        return $(element).not(this.settings.ignore)[0]
      },

      checkable: function (element) {
        return (/radio|checkbox/i).test(element.type)
      },

      findByName: function (name) {
        return $(this.currentForm).find("[name='" + this.escapeCssMeta(name) + "']")
      },

      getLength: function (value, element) {
        switch (element.nodeName.toLowerCase()) {
          case "select":
            return $("option:selected", element).length
          case "input":
            if (this.checkable(element)) {
              return this.findByName(element.name).filter(":checked").length
            }
        }
        return value.length
      },

      depend: function (param, element) {
        return this.dependTypes[typeof param] ? this.dependTypes[typeof param](param, element) : true
      },

      dependTypes: {
        "boolean": function (param) {
          return param
        },
        "string": function (param, element) {
          return !!$(param, element.form).length
        },
        "function": function (param, element) {
          return param(element)
        }
      },

      optional: function (element) {
        var val = this.elementValue(element)
        return !$.validator.methods.required.call(this, val, element) && "dependency-mismatch"
      },

      startRequest: function (element) {
        if (!this.pending[element.name]) {
          this.pendingRequest++
          $(element).addClass(this.settings.pendingClass)
          this.pending[element.name] = true
        }
      },

      stopRequest: function (element, valid) {
        this.pendingRequest--

        // Sometimes synchronization fails, make sure pendingRequest is never < 0
        if (this.pendingRequest < 0) {
          this.pendingRequest = 0
        }
        delete this.pending[element.name]
        $(element).removeClass(this.settings.pendingClass)
        if (valid && this.pendingRequest === 0 && this.formSubmitted && this.form()) {
          $(this.currentForm).submit()

          // Remove the hidden input that was used as a replacement for the
          // missing submit button. The hidden input is added by `handle()`
          // to ensure that the value of the used submit button is passed on
          // for scripted submits triggered by this method
          if (this.submitButton) {
            $("input:hidden[name='" + this.submitButton.name + "']", this.currentForm).remove()
          }

          this.formSubmitted = false
        } else if (!valid && this.pendingRequest === 0 && this.formSubmitted) {
          $(this.currentForm).triggerHandler("invalid-form", [this])
          this.formSubmitted = false
        }
      },

      previousValue: function (element, method) {
        method = typeof method === "string" && method || "remote"

        return $.data(element, "previousValue") || $.data(element, "previousValue", {
          old: null,
          valid: true,
          message: this.defaultMessage(element, {method: method})
        })
      },

      // Cleans up all forms and elements, removes validator-specific events
      destroy: function () {
        this.resetForm()

        $(this.currentForm)
          .off(".validate")
          .removeData("validator")
          .find(".validate-equalTo-blur")
          .off(".validate-equalTo")
          .removeClass("validate-equalTo-blur")
      }

    },

    classRuleSettings: {
      required: {required: true},
      email: {email: true},
      url: {url: true},
      date: {date: true},
      dateISO: {dateISO: true},
      number: {number: true},
      digits: {digits: true},
      creditcard: {creditcard: true}
    },

    addClassRules: function (className, rules) {
      if (className.constructor === String) {
        this.classRuleSettings[className] = rules
      } else {
        $.extend(this.classRuleSettings, className)
      }
    },

    classRules: function (element) {
      var rules = {},
        classes = $(element).attr("class")

      if (classes) {
        $.each(classes.split(" "), function () {
          if (this in $.validator.classRuleSettings) {
            $.extend(rules, $.validator.classRuleSettings[this])
          }
        })
      }
      return rules
    },

    normalizeAttributeRule: function (rules, type, method, value) {

      // Convert the value to a number for number inputs, and for text for backwards compability
      // allows type="date" and others to be compared as strings
      if (/min|max|step/.test(method) && (type === null || /number|range|text/.test(type))) {
        value = Number(value)

        // Support Opera Mini, which returns NaN for undefined minlength
        if (isNaN(value)) {
          value = undefined
        }
      }

      if (value || value === 0) {
        rules[method] = value
      } else if (type === method && type !== "range") {

        // Exception: the jquery validate 'range' method
        // does not test for the html5 'range' type
        rules[method] = true
      }
    },

    attributeRules: function (element) {
      var rules = {},
        $element = $(element),
        type = element.getAttribute("type"),
        method, value

      for (method in $.validator.methods) {

        // Support for <input required> in both html5 and older browsers
        if (method === "required") {
          value = element.getAttribute(method)

          // Some browsers return an empty string for the required attribute
          // and non-HTML5 browsers might have required="" markup
          if (value === "") {
            value = true
          }

          // Force non-HTML5 browsers to return bool
          value = !!value
        } else {
          value = $element.attr(method)
        }

        this.normalizeAttributeRule(rules, type, method, value)
      }

      // 'maxlength' may be returned as -1, 2147483647 ( IE ) and 524288 ( safari ) for text inputs
      if (rules.maxlength && /-1|2147483647|524288/.test(rules.maxlength)) {
        delete rules.maxlength
      }

      return rules
    },

    dataRules: function (element) {
      var rules = {},
        $element = $(element),
        type = element.getAttribute("type"),
        method, value

      for (method in $.validator.methods) {
        value = $element.data("rule" + method.charAt(0).toUpperCase() + method.substring(1).toLowerCase())
        this.normalizeAttributeRule(rules, type, method, value)
      }
      return rules
    },

    staticRules: function (element) {
      var rules = {},
        validator = $.data(element.form, "validator")

      if (validator.settings.rules) {
        rules = $.validator.normalizeRule(validator.settings.rules[element.name]) || {}
      }
      return rules
    },

    normalizeRules: function (rules, element) {

      // Handle dependency check
      $.each(rules, function (prop, val) {

        // Ignore rule when param is explicitly false, eg. required:false
        if (val === false) {
          delete rules[prop]
          return
        }
        if (val.param || val.depends) {
          var keepRule = true
          switch (typeof val.depends) {
            case "string":
              keepRule = !!$(val.depends, element.form).length
              break
            case "function":
              keepRule = val.depends.call(element, element)
              break
          }
          if (keepRule) {
            rules[prop] = val.param !== undefined ? val.param : true
          } else {
            $.data(element.form, "validator").resetElements($(element))
            delete rules[prop]
          }
        }
      })

      // Evaluate parameters
      $.each(rules, function (rule, parameter) {
        rules[rule] = $.isFunction(parameter) && rule !== "normalizer" ? parameter(element) : parameter
      })

      // Clean number parameters
      $.each(["minlength", "maxlength"], function () {
        if (rules[this]) {
          rules[this] = Number(rules[this])
        }
      })
      $.each(["rangelength", "range"], function () {
        var parts
        if (rules[this]) {
          if ($.isArray(rules[this])) {
            rules[this] = [Number(rules[this][0]), Number(rules[this][1])]
          } else if (typeof rules[this] === "string") {
            parts = rules[this].replace(/[\[\]]/g, "").split(/[\s,]+/)
            rules[this] = [Number(parts[0]), Number(parts[1])]
          }
        }
      })

      if ($.validator.autoCreateRanges) {

        // Auto-create ranges
        if (rules.min != null && rules.max != null) {
          rules.range = [rules.min, rules.max]
          delete rules.min
          delete rules.max
        }
        if (rules.minlength != null && rules.maxlength != null) {
          rules.rangelength = [rules.minlength, rules.maxlength]
          delete rules.minlength
          delete rules.maxlength
        }
      }

      return rules
    },

    // Converts a simple string to a {string: true} rule, e.g., "required" to {required:true}
    normalizeRule: function (data) {
      if (typeof data === "string") {
        var transformed = {}
        $.each(data.split(/\s/), function () {
          transformed[this] = true
        })
        data = transformed
      }
      return data
    },

    // https://jqueryvalidation.org/jQuery.validator.addMethod/
    addMethod: function (name, method, message) {
      $.validator.methods[name] = method
      $.validator.messages[name] = message !== undefined ? message : $.validator.messages[name]
      if (method.length < 3) {
        $.validator.addClassRules(name, $.validator.normalizeRule(name))
      }
    },

    // https://jqueryvalidation.org/jQuery.validator.methods/
    methods: {

      // https://jqueryvalidation.org/required-method/
      required: function (value, element, param) {

        // Check if dependency is met
        if (!this.depend(param, element)) {
          return "dependency-mismatch"
        }
        if (element.nodeName.toLowerCase() === "select") {

          // Could be an array for select-multiple or a string, both are fine this way
          var val = $(element).val()
          return val && val.length > 0
        }
        if (this.checkable(element)) {
          return this.getLength(value, element) > 0
        }
        return value.length > 0
      },

      // https://jqueryvalidation.org/email-method/
      email: function (value, element) {

        // From https://html.spec.whatwg.org/multipage/forms.html#valid-e-mail-address
        // Retrieved 2014-01-14
        // If you have a problem with this implementation, report a bug against the above spec
        // Or use custom methods to implement your own email validation
        return this.optional(element) || /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(value)
      },

      // https://jqueryvalidation.org/url-method/
      url: function (value, element) {

        // Copyright (c) 2010-2013 Diego Perini, MIT licensed
        // https://gist.github.com/dperini/729294
        // see also https://mathiasbynens.be/demo/url-regex
        // modified to allow protocol-relative URLs
        return this.optional(element) || /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})).?)(?::\d{2,5})?(?:[/?#]\S*)?$/i.test(value)
      },

      // https://jqueryvalidation.org/date-method/
      date: function (value, element) {
        return this.optional(element) || !/Invalid|NaN/.test(new Date(value).toString())
      },

      // https://jqueryvalidation.org/dateISO-method/
      dateISO: function (value, element) {
        return this.optional(element) || /^\d{4}[\/\-](0?[1-9]|1[012])[\/\-](0?[1-9]|[12][0-9]|3[01])$/.test(value)
      },

      // https://jqueryvalidation.org/number-method/
      number: function (value, element) {
        return this.optional(element) || /^(?:-?\d+|-?\d{1,3}(?:,\d{3})+)?(?:\.\d+)?$/.test(value)
      },

      // https://jqueryvalidation.org/digits-method/
      digits: function (value, element) {
        return this.optional(element) || /^\d+$/.test(value)
      },

      // https://jqueryvalidation.org/minlength-method/
      minlength: function (value, element, param) {
        var length = $.isArray(value) ? value.length : this.getLength(value, element)
        return this.optional(element) || length >= param
      },

      // https://jqueryvalidation.org/maxlength-method/
      maxlength: function (value, element, param) {
        var length = $.isArray(value) ? value.length : this.getLength(value, element)
        return this.optional(element) || length <= param
      },

      // https://jqueryvalidation.org/rangelength-method/
      rangelength: function (value, element, param) {
        var length = $.isArray(value) ? value.length : this.getLength(value, element)
        return this.optional(element) || (length >= param[0] && length <= param[1])
      },

      // https://jqueryvalidation.org/min-method/
      min: function (value, element, param) {
        return this.optional(element) || value >= param
      },

      // https://jqueryvalidation.org/max-method/
      max: function (value, element, param) {
        return this.optional(element) || value <= param
      },

      // https://jqueryvalidation.org/range-method/
      range: function (value, element, param) {
        return this.optional(element) || (value >= param[0] && value <= param[1])
      },

      // https://jqueryvalidation.org/step-method/
      step: function (value, element, param) {
        var type = $(element).attr("type"),
          errorMessage = "Step attribute on input type " + type + " is not supported.",
          supportedTypes = ["text", "number", "range"],
          re = new RegExp("\\b" + type + "\\b"),
          notSupported = type && !re.test(supportedTypes.join()),
          decimalPlaces = function (num) {
            var match = ("" + num).match(/(?:\.(\d+))?$/)
            if (!match) {
              return 0
            }

            // Number of digits right of decimal point.
            return match[1] ? match[1].length : 0
          },
          toInt = function (num) {
            return Math.round(num * Math.pow(10, decimals))
          },
          valid = true,
          decimals

        // Works only for text, number and range input types
        // TODO find a way to support input types date, datetime, datetime-local, month, time and week
        if (notSupported) {
          throw new Error(errorMessage)
        }

        decimals = decimalPlaces(param)

        // Value can't have too many decimals
        if (decimalPlaces(value) > decimals || toInt(value) % toInt(param) !== 0) {
          valid = false
        }

        return this.optional(element) || valid
      },

      // https://jqueryvalidation.org/equalTo-method/
      equalTo: function (value, element, param) {

        // Bind to the blur event of the target in order to revalidate whenever the target field is updated
        var target = $(param)
        if (this.settings.onfocusout && target.not(".validate-equalTo-blur").length) {
          target.addClass("validate-equalTo-blur").on("blur.validate-equalTo", function () {
            $(element).valid()
          })
        }
        return value === target.val()
      },

      // https://jqueryvalidation.org/remote-method/
      remote: function (value, element, param, method) {
        if (this.optional(element)) {
          return "dependency-mismatch"
        }

        method = typeof method === "string" && method || "remote"

        var previous = this.previousValue(element, method),
          validator, data, optionDataString

        if (!this.settings.messages[element.name]) {
          this.settings.messages[element.name] = {}
        }
        previous.originalMessage = previous.originalMessage || this.settings.messages[element.name][method]
        this.settings.messages[element.name][method] = previous.message

        param = typeof param === "string" && {url: param} || param
        optionDataString = $.param($.extend({data: value}, param.data))
        if (previous.old === optionDataString) {
          return previous.valid
        }

        previous.old = optionDataString
        validator = this
        this.startRequest(element)
        data = {}
        data[element.name] = value
        $.ajax($.extend(true, {
          mode: "abort",
          port: "validate" + element.name,
          dataType: "json",
          data: data,
          context: validator.currentForm,
          success: function (response) {
            var valid = response === true || response === "true",
              errors, message, submitted

            validator.settings.messages[element.name][method] = previous.originalMessage
            if (valid) {
              submitted = validator.formSubmitted
              validator.resetInternals()
              validator.toHide = validator.errorsFor(element)
              validator.formSubmitted = submitted
              validator.successList.push(element)
              validator.invalid[element.name] = false
              validator.showErrors()
            } else {
              errors = {}
              message = response || validator.defaultMessage(element, {method: method, parameters: value})
              errors[element.name] = previous.message = message
              validator.invalid[element.name] = true
              validator.showErrors(errors)
            }
            previous.valid = valid
            validator.stopRequest(element, valid)
          }
        }, param))
        return "pending"
      }
    }

  })

  // Ajax mode: abort
  // usage: $.ajax({ mode: "abort"[, port: "uniqueport"]});
  // if mode:"abort" is used, the previous request on that port (port can be undefined) is aborted via XMLHttpRequest.abort()

  var pendingRequests = {},
    ajax

  // Use a prefilter if available (1.5+)
  if ($.ajaxPrefilter) {
    $.ajaxPrefilter(function (settings, _, xhr) {
      var port = settings.port
      if (settings.mode === "abort") {
        if (pendingRequests[port]) {
          pendingRequests[port].abort()
        }
        pendingRequests[port] = xhr
      }
    })
  } else {

    // Proxy ajax
    ajax = $.ajax
    $.ajax = function (settings) {
      var mode = ("mode" in settings ? settings : $.ajaxSettings).mode,
        port = ("port" in settings ? settings : $.ajaxSettings).port
      if (mode === "abort") {
        if (pendingRequests[port]) {
          pendingRequests[port].abort()
        }
        pendingRequests[port] = ajax.apply(this, arguments)
        return pendingRequests[port]
      }
      return ajax.apply(this, arguments)
    }
  }
  return $
}))

  // ==================================================
  // fancyBox v3.1.24
  //
  // Licensed GPLv3 for open source use
  // or fancyBox Commercial License for commercial use
  //
  // http://fancyapps.com/fancybox/
  // Copyright 2017 fancyApps
  //
  // ==================================================
  ; (function (window, document, $, undefined) {
    'use strict'

    // If there's no jQuery, fancyBox can't work
    // =========================================

    if (!$) {
      return
    }

    // Check if fancyBox is already initialized
    // ========================================

    if ($.fn.fancybox) {

      $.error('fancyBox already initialized')

      return
    }

    // Private default settings
    // ========================

    var defaults = {

      // Enable infinite gallery navigation
      loop: false,

      // Space around image, ignored if zoomed-in or viewport smaller than 800px
      margin: [44, 0],

      // Horizontal space between slides
      gutter: 50,

      // Enable keyboard navigation
      keyboard: true,

      // Should display navigation arrows at the screen edges
      arrows: true,

      // Should display infobar (counter and arrows at the top)
      infobar: false,

      // Should display toolbar (buttons at the top)
      toolbar: true,

      // What buttons should appear in the top right corner.
      // Buttons will be created using templates from `btnTpl` option
      // and they will be placed into toolbar (class="fancybox-toolbar"` element)
      buttons: [
        'slideShow',
        'fullScreen',
        'thumbs',
        'close'
      ],

      // Detect "idle" time in seconds
      idleTime: 4,

      // Should display buttons at top right corner of the content
      // If 'auto' - they will be created for content having type 'html', 'inline' or 'ajax'
      // Use template from `btnTpl.smallBtn` for customization
      smallBtn: 'auto',

      // Disable right-click and use simple image protection for images
      protect: false,

      // Shortcut to make content "modal" - disable keyboard navigtion, hide buttons, etc
      modal: false,

      image: {

        // Wait for images to load before displaying
        // Requires predefined image dimensions
        // If 'auto' - will zoom in thumbnail if 'width' and 'height' attributes are found
        preload: "auto",

      },

      ajax: {

        // Object containing settings for ajax request
        settings: {

          // This helps to indicate that request comes from the modal
          // Feel free to change naming
          data: {
            fancybox: true
          }
        }

      },

      iframe: {

        // Iframe template
        tpl: '<iframe id="fancybox-frame{rnd}" name="fancybox-frame{rnd}" class="fancybox-iframe" frameborder="0" vspace="0" hspace="0" webkitAllowFullScreen mozallowfullscreen allowFullScreen allowtransparency="true" src=""></iframe>',

        // Preload iframe before displaying it
        // This allows to calculate iframe content width and height
        // (note: Due to "Same Origin Policy", you can't get cross domain data).
        preload: true,

        // Custom CSS styling for iframe wrapping element
        // You can use this to set custom iframe dimensions
        css: {},

        // Iframe tag attributes
        attr: {
          scrolling: 'auto'
        }

      },

      // Open/close animation type
      // Possible values:
      //   false            - disable
      //   "zoom"           - zoom images from/to thumbnail
      //   "fade"
      //   "zoom-in-out"
      //
      animationEffect: "zoom",

      // Duration in ms for open/close animation
      animationDuration: 366,

      // Should image change opacity while zooming
      // If opacity is 'auto', then opacity will be changed if image and thumbnail have different aspect ratios
      zoomOpacity: 'auto',

      // Transition effect between slides
      //
      // Possible values:
      //   false            - disable
      //   "fade'
      //   "slide'
      //   "circular'
      //   "tube'
      //   "zoom-in-out'
      //   "rotate'
      //
      transitionEffect: "fade",

      // Duration in ms for transition animation
      transitionDuration: 366,

      // Custom CSS class for slide element
      slideClass: '',

      // Custom CSS class for layout
      baseClass: '',

      // Base template for layout
      baseTpl:
        '<div class="fancybox-container" role="dialog" tabindex="-1">' +
        '<div class="fancybox-bg"></div>' +
        '<div class="fancybox-inner">' +
        '<div class="fancybox-infobar">' +
        '<button data-fancybox-prev title="{{PREV}}" class="fancybox-button fancybox-button--left"></button>' +
        '<div class="fancybox-infobar__body">' +
        '<span data-fancybox-index></span>&nbsp;/&nbsp;<span data-fancybox-count></span>' +
        '</div>' +
        '<button data-fancybox-next title="{{NEXT}}" class="fancybox-button fancybox-button--right"></button>' +
        '</div>' +
        '<div class="fancybox-toolbar">' +
        '{{BUTTONS}}' +
        '</div>' +
        '<div class="fancybox-navigation">' +
        '<button data-fancybox-prev title="{{PREV}}" class="fancybox-arrow fancybox-arrow--left" />' +
        '<button data-fancybox-next title="{{NEXT}}" class="fancybox-arrow fancybox-arrow--right" />' +
        '</div>' +
        '<div class="fancybox-stage"></div>' +
        '<div class="fancybox-caption-wrap">' +
        '<div class="fancybox-caption"></div>' +
        '</div>' +
        '</div>' +
        '</div>',

      // Loading indicator template
      spinnerTpl: '<div class="fancybox-loading"></div>',

      // Error message template
      errorTpl: '<div class="fancybox-error"><p>{{ERROR}}<p></div>',

      btnTpl: {
        slideShow: '<button data-fancybox-play class="fancybox-button fancybox-button--play" title="{{PLAY_START}}"></button>',
        fullScreen: '<button data-fancybox-fullscreen class="fancybox-button fancybox-button--fullscreen" title="{{FULL_SCREEN}}"></button>',
        thumbs: '<button data-fancybox-thumbs class="fancybox-button fancybox-button--thumbs" title="{{THUMBS}}"></button>',
        close: '<button data-fancybox-close class="fancybox-button fancybox-button--close" title="{{CLOSE}}"></button>',

        // This small close button will be appended to your html/inline/ajax content by default,
        // if "smallBtn" option is not set to false
        smallBtn: '<button data-fancybox-close class="fancybox-close-small" title="{{CLOSE}}"></button>'
      },

      // Container is injected into this element
      parentEl: 'body',


      // Focus handling
      // ==============

      // Try to focus on the first focusable element after opening
      autoFocus: true,

      // Put focus back to active element after closing
      backFocus: true,

      // Do not let user to focus on element outside modal content
      trapFocus: true,


      // Module specific options
      // =======================

      fullScreen: {
        autoStart: false,
      },

      touch: {
        vertical: true,  // Allow to drag content vertically
        momentum: true   // Continue movement after releasing mouse/touch when panning
      },

      // Hash value when initializing manually,
      // set `false` to disable hash change
      hash: null,

      // Customize or add new media types
      // Example:
      /*
      media : {
          youtube : {
              params : {
                  autoplay : 0
              }
          }
      }
      */
      media: {},

      slideShow: {
        autoStart: false,
        speed: 4000
      },

      thumbs: {
        autoStart: false,   // Display thumbnails on opening
        hideOnClose: true     // Hide thumbnail grid when closing animation starts
      },

      // Callbacks
      //==========

      // See Documentation/API/Events for more information
      // Example:
      /*
          afterShow: function( instance, current ) {
               console.info( 'Clicked element:' );
               console.info( current.opts.$orig );
          }
      */

      onInit: $.noop,  // When instance has been initialized

      beforeLoad: $.noop,  // Before the content of a slide is being loaded
      afterLoad: $.noop,  // When the content of a slide is done loading

      beforeShow: $.noop,  // Before open animation starts
      afterShow: $.noop,  // When content is done loading and animating

      beforeClose: $.noop,  // Before the instance attempts to close. Return false to cancel the close.
      afterClose: $.noop,  // After instance has been closed

      onActivate: $.noop,  // When instance is brought to front
      onDeactivate: $.noop,  // When other instance has been activated


      // Interaction
      // ===========

      // Use options below to customize taken action when user clicks or double clicks on the fancyBox area,
      // each option can be string or method that returns value.
      //
      // Possible values:
      //   "close"           - close instance
      //   "next"            - move to next gallery item
      //   "nextOrClose"     - move to next gallery item or close if gallery has only one item
      //   "toggleControls"  - show/hide controls
      //   "zoom"            - zoom image (if loaded)
      //   false             - do nothing

      // Clicked on the content
      clickContent: function (current, event) {
        return current.type === 'image' ? 'zoom' : false
      },

      // Clicked on the slide
      clickSlide: 'close',

      // Clicked on the background (backdrop) element
      clickOutside: 'close',

      // Same as previous two, but for double click
      dblclickContent: false,
      dblclickSlide: false,
      dblclickOutside: false,


      // Custom options when mobile device is detected
      // =============================================

      mobile: {
        clickContent: function (current, event) {
          return current.type === 'image' ? 'toggleControls' : false
        },
        clickSlide: function (current, event) {
          return current.type === 'image' ? 'toggleControls' : "close"
        },
        dblclickContent: function (current, event) {
          return current.type === 'image' ? 'zoom' : false
        },
        dblclickSlide: function (current, event) {
          return current.type === 'image' ? 'zoom' : false
        }
      },


      // Internationalization
      // ============

      lang: 'en',
      i18n: {
        'en': {
          CLOSE: 'Close',
          NEXT: 'Next',
          PREV: 'Previous',
          ERROR: 'The requested content cannot be loaded. <br/> Please try again later.',
          PLAY_START: 'Start slideshow',
          PLAY_STOP: 'Pause slideshow',
          FULL_SCREEN: 'Full screen',
          THUMBS: 'Thumbnails'
        },
        'de': {
          CLOSE: 'Schliessen',
          NEXT: 'Weiter',
          PREV: 'Zurück',
          ERROR: 'Die angeforderten Daten konnten nicht geladen werden. <br/> Bitte versuchen Sie es später nochmal.',
          PLAY_START: 'Diaschau starten',
          PLAY_STOP: 'Diaschau beenden',
          FULL_SCREEN: 'Vollbild',
          THUMBS: 'Vorschaubilder'
        }
      }

    }

    // Few useful variables and methods
    // ================================

    var $W = $(window)
    var $D = $(document)

    var called = 0


    // Check if an object is a jQuery object and not a native JavaScript object
    // ========================================================================

    var isQuery = function (obj) {
      return obj && obj.hasOwnProperty && obj instanceof $
    }


    // Handle multiple browsers for "requestAnimationFrame" and "cancelAnimationFrame"
    // ===============================================================================

    var requestAFrame = (function () {
      return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        // if all else fails, use setTimeout
        function (callback) {
          return window.setTimeout(callback, 1000 / 60)
        }
    })()


    // Detect the supported transition-end event property name
    // =======================================================

    var transitionEnd = (function () {
      var t, el = document.createElement("fakeelement")

      var transitions = {
        "transition": "transitionend",
        "OTransition": "oTransitionEnd",
        "MozTransition": "transitionend",
        "WebkitTransition": "webkitTransitionEnd"
      }

      for (t in transitions) {
        if (el.style[t] !== undefined) {
          return transitions[t]
        }
      }
    })()


    // Force redraw on an element.
    // This helps in cases where the browser doesn't redraw an updated element properly.
    // =================================================================================

    var forceRedraw = function ($el) {
      return ($el && $el.length && $el[0].offsetHeight)
    }


    // Class definition
    // ================

    var FancyBox = function (content, opts, index) {
      var self = this

      self.opts = $.extend(true, {index: index}, defaults, opts || {})

      // Exclude buttons option from deep merging
      if (opts && $.isArray(opts.buttons)) {
        self.opts.buttons = opts.buttons
      }

      self.id = self.opts.id || ++called
      self.group = []

      self.currIndex = parseInt(self.opts.index, 10) || 0
      self.prevIndex = null

      self.prevPos = null
      self.currPos = 0

      self.firstRun = null

      // Create group elements from original item collection
      self.createGroup(content)

      if (!self.group.length) {
        return
      }

      // Save last active element and current scroll position
      self.$lastFocus = $(document.activeElement).blur()

      // Collection of gallery objects
      self.slides = {}

      self.init(content)

    }

    $.extend(FancyBox.prototype, {

      // Create DOM structure
      // ====================

      init: function () {
        var self = this

        var testWidth, $container, buttonStr

        var firstItemOpts = self.group[self.currIndex].opts

        self.scrollTop = $D.scrollTop()
        self.scrollLeft = $D.scrollLeft()


        // Hide scrollbars
        // ===============

        if (!$.fancybox.getInstance() && !$.fancybox.isMobile && $('body').css('overflow') !== 'hidden') {
          testWidth = $('body').width()

          $('html').addClass('fancybox-enabled')

          // Compare body width after applying "overflow: hidden"
          testWidth = $('body').width() - testWidth

          // If width has changed - compensate missing scrollbars by adding right margin
          if (testWidth > 1) {
            $('head').append('<style id="fancybox-style-noscroll" type="text/css">.compensate-for-scrollbar, .fancybox-enabled body { margin-right: ' + testWidth + 'px; }</style>')
          }
        }


        // Build html markup and set references
        // ====================================

        // Build html code for buttons and insert into main template
        buttonStr = ''

        $.each(firstItemOpts.buttons, function (index, value) {
          buttonStr += (firstItemOpts.btnTpl[value] || '')
        })

        // Create markup from base template, it will be initially hidden to
        // avoid unnecessary work like painting while initializing is not complete
        $container = $(self.translate(self, firstItemOpts.baseTpl.replace('\{\{BUTTONS\}\}', buttonStr)))
          .addClass('fancybox-is-hidden')
          .attr('id', 'fancybox-container-' + self.id)
          .addClass(firstItemOpts.baseClass)
          .data('FancyBox', self)
          .prependTo(firstItemOpts.parentEl)

        // Create object holding references to jQuery wrapped nodes
        self.$refs = {
          container: $container
        };

        ['bg', 'inner', 'infobar', 'toolbar', 'stage', 'caption'].forEach(function (item) {
          self.$refs[item] = $container.find('.fancybox-' + item)
        })

        // Check for redundant elements
        if (!firstItemOpts.arrows || self.group.length < 2) {
          $container.find('.fancybox-navigation').remove()
        }

        if (!firstItemOpts.infobar) {
          self.$refs.infobar.remove()
        }

        if (!firstItemOpts.toolbar) {
          self.$refs.toolbar.remove()
        }

        self.trigger('onInit')

        // Bring to front and enable events
        self.activate()

        // Build slides, load and reveal content
        self.jumpTo(self.currIndex)
      },


      // Simple i18n support - replaces object keys found in template
      // with corresponding values
      // ============================================================

      translate: function (obj, str) {
        var arr = obj.opts.i18n[obj.opts.lang]

        return str.replace(/\{\{(\w+)\}\}/g, function (match, n) {
          var value = arr[n]

          if (value === undefined) {
            return match
          }

          return value
        })
      },

      // Create array of gally item objects
      // Check if each object has valid type and content
      // ===============================================

      createGroup: function (content) {
        var self = this
        var items = $.makeArray(content)

        $.each(items, function (i, item) {
          var obj = {},
            opts = {},
            data = [],
            $item,
            type,
            src,
            srcParts

          // Step 1 - Make sure we have an object
          // ====================================

          if ($.isPlainObject(item)) {

            // We probably have manual usage here, something like
            // $.fancybox.open( [ { src : "image.jpg", type : "image" } ] )

            obj = item
            opts = item.opts || item

          } else if ($.type(item) === 'object' && $(item).length) {

            // Here we propbably have jQuery collection returned by some selector

            $item = $(item)
            data = $item.data()

            opts = 'options' in data ? data.options : {}
            opts = $.type(opts) === 'object' ? opts : {}

            obj.src = 'src' in data ? data.src : (opts.src || $item.attr('href'));

            ['width', 'height', 'thumb', 'type', 'filter'].forEach(function (item) {
              if (item in data) {
                opts[item] = data[item]
              }
            })

            if ('srcset' in data) {
              opts.image = {srcset: data.srcset}
            }

            opts.$orig = $item

            if (!obj.type && !obj.src) {
              obj.type = 'inline'
              obj.src = item
            }

          } else {

            // Assume we have a simple html code, for example:
            // $.fancybox.open( '<div><h1>Hi!</h1></div>' );

            obj = {
              type: 'html',
              src: item + ''
            }

          }

          // Each gallery object has full collection of options
          obj.opts = $.extend(true, {}, self.opts, opts)

          if ($.fancybox.isMobile) {
            obj.opts = $.extend(true, {}, obj.opts, obj.opts.mobile)
          }


          // Step 2 - Make sure we have content type, if not - try to guess
          // ==============================================================

          type = obj.type || obj.opts.type
          src = obj.src || ''

          if (!type && src) {
            if (src.match(/(^data:image\/[a-z0-9+\/=]*,)|(\.(jp(e|g|eg)|gif|png|bmp|webp|svg|ico)((\?|#).*)?$)/i)) {
              type = 'image'

            } else if (src.match(/\.(pdf)((\?|#).*)?$/i)) {
              type = 'pdf'

            } else if (src.charAt(0) === '#') {
              type = 'inline'
            }
          }

          obj.type = type


          // Step 3 - Some adjustments
          // =========================

          obj.index = self.group.length

          // Check if $orig and $thumb objects exist
          if (obj.opts.$orig && !obj.opts.$orig.length) {
            delete obj.opts.$orig
          }

          if (!obj.opts.$thumb && obj.opts.$orig) {
            obj.opts.$thumb = obj.opts.$orig.find('img:first')
          }

          if (obj.opts.$thumb && !obj.opts.$thumb.length) {
            delete obj.opts.$thumb
          }

          // Caption is a "special" option, it can be passed as a method
          if ($.type(obj.opts.caption) === 'function') {
            obj.opts.caption = obj.opts.caption.apply(item, [self, obj])

          } else if ('caption' in data) {
            obj.opts.caption = data.caption
          }

          // Make sure we have caption as a string
          obj.opts.caption = obj.opts.caption === undefined ? '' : obj.opts.caption + ''

          // Check if url contains "filter" used to filter the content
          // Example: "ajax.html #something"
          if (type === 'ajax') {
            srcParts = src.split(/\s+/, 2)

            if (srcParts.length > 1) {
              obj.src = srcParts.shift()

              obj.opts.filter = srcParts.shift()
            }
          }

          if (obj.opts.smallBtn == 'auto') {

            if ($.inArray(type, ['html', 'inline', 'ajax']) > -1) {
              obj.opts.toolbar = false
              obj.opts.smallBtn = true

            } else {
              obj.opts.smallBtn = false
            }

          }

          // If the type is "pdf", then simply load file into iframe
          if (type === 'pdf') {
            obj.type = 'iframe'

            obj.opts.iframe.preload = false
          }

          // Hide all buttons and disable interactivity for modal items
          if (obj.opts.modal) {

            obj.opts = $.extend(true, obj.opts, {
              // Remove buttons
              infobar: 0,
              toolbar: 0,

              smallBtn: 0,

              // Disable keyboard navigation
              keyboard: 0,

              // Disable some modules
              slideShow: 0,
              fullScreen: 0,
              thumbs: 0,
              touch: 0,

              // Disable click event handlers
              clickContent: false,
              clickSlide: false,
              clickOutside: false,
              dblclickContent: false,
              dblclickSlide: false,
              dblclickOutside: false
            })

          }

          // Step 4 - Add processed object to group
          // ======================================

          self.group.push(obj)

        })

      },


      // Attach an event handler functions for:
      //   - navigation buttons
      //   - browser scrolling, resizing;
      //   - focusing
      //   - keyboard
      //   - detect idle
      // ======================================

      addEvents: function () {
        var self = this

        self.removeEvents()

        // Make navigation elements clickable
        self.$refs.container.on('click.fb-close', '[data-fancybox-close]', function (e) {
          e.stopPropagation()
          e.preventDefault()

          self.close(e)

        }).on('click.fb-prev touchend.fb-prev', '[data-fancybox-prev]', function (e) {
          e.stopPropagation()
          e.preventDefault()

          self.previous()

        }).on('click.fb-next touchend.fb-next', '[data-fancybox-next]', function (e) {
          e.stopPropagation()
          e.preventDefault()

          self.next()

        })


        // Handle page scrolling and browser resizing
        $W.on('orientationchange.fb resize.fb', function (e) {

          if (e && e.originalEvent && e.originalEvent.type === "resize") {

            requestAFrame(function () {
              self.update()
            })

          } else {

            self.$refs.stage.hide()

            setTimeout(function () {
              self.$refs.stage.show()

              self.update()
            }, 500)

          }

        })

        // Trap keyboard focus inside of the modal, so the user does not accidentally tab outside of the modal
        // (a.k.a. "escaping the modal")
        $D.on('focusin.fb', function (e) {
          var instance = $.fancybox ? $.fancybox.getInstance() : null

          if (instance.isClosing || !instance.current || !instance.current.opts.trapFocus || $(e.target).hasClass('fancybox-container') || $(e.target).is(document)) {
            return
          }

          if (instance && $(e.target).css('position') !== 'fixed' && !instance.$refs.container.has(e.target).length) {
            e.stopPropagation()

            instance.focus()

            // Sometimes page gets scrolled, set it back
            $W.scrollTop(self.scrollTop).scrollLeft(self.scrollLeft)
          }
        })


        // Enable keyboard navigation
        $D.on('keydown.fb', function (e) {
          var current = self.current,
            keycode = e.keyCode || e.which

          if (!current || !current.opts.keyboard) {
            return
          }

          if ($(e.target).is('input') || $(e.target).is('textarea')) {
            return
          }

          // Backspace and Esc keys
          if (keycode === 8 || keycode === 27) {
            e.preventDefault()

            self.close(e)

            return
          }

          // Left arrow and Up arrow
          if (keycode === 37 || keycode === 38) {
            e.preventDefault()

            self.previous()

            return
          }

          // Righ arrow and Down arrow
          if (keycode === 39 || keycode === 40) {
            e.preventDefault()

            self.next()

            return
          }

          self.trigger('afterKeydown', e, keycode)
        })


        // Hide controls after some inactivity period
        if (self.group[self.currIndex].opts.idleTime) {
          self.idleSecondsCounter = 0

          $D.on('mousemove.fb-idle mouseenter.fb-idle mouseleave.fb-idle mousedown.fb-idle touchstart.fb-idle touchmove.fb-idle scroll.fb-idle keydown.fb-idle', function () {
            self.idleSecondsCounter = 0

            if (self.isIdle) {
              self.showControls()
            }

            self.isIdle = false
          })

          self.idleInterval = window.setInterval(function () {

            self.idleSecondsCounter++

            if (self.idleSecondsCounter >= self.group[self.currIndex].opts.idleTime) {
              self.isIdle = true
              self.idleSecondsCounter = 0

              self.hideControls()
            }

          }, 1000)
        }

      },


      // Remove events added by the core
      // ===============================

      removeEvents: function () {
        var self = this

        $W.off('orientationchange.fb resize.fb')
        $D.off('focusin.fb keydown.fb .fb-idle')

        this.$refs.container.off('.fb-close .fb-prev .fb-next')

        if (self.idleInterval) {
          window.clearInterval(self.idleInterval)

          self.idleInterval = null
        }
      },


      // Change to previous gallery item
      // ===============================

      previous: function (duration) {
        return this.jumpTo(this.currPos - 1, duration)
      },


      // Change to next gallery item
      // ===========================

      next: function (duration) {
        return this.jumpTo(this.currPos + 1, duration)
      },


      // Switch to selected gallery item
      // ===============================

      jumpTo: function (pos, duration, slide) {
        var self = this,
          firstRun,
          loop,
          current,
          previous,
          canvasWidth,
          currentPos,
          transitionProps

        var groupLen = self.group.length

        if (self.isSliding || self.isClosing || (self.isAnimating && self.firstRun)) {
          return
        }

        pos = parseInt(pos, 10)
        loop = self.current ? self.current.opts.loop : self.opts.loop

        if (!loop && (pos < 0 || pos >= groupLen)) {
          return false
        }

        firstRun = self.firstRun = (self.firstRun === null)

        if (groupLen < 2 && !firstRun && !!self.isSliding) {
          return
        }

        previous = self.current

        self.prevIndex = self.currIndex
        self.prevPos = self.currPos

        // Create slides
        current = self.createSlide(pos)

        if (groupLen > 1) {
          if (loop || current.index > 0) {
            self.createSlide(pos - 1)
          }

          if (loop || current.index < groupLen - 1) {
            self.createSlide(pos + 1)
          }
        }

        self.current = current
        self.currIndex = current.index
        self.currPos = current.pos

        self.trigger('beforeShow', firstRun)

        self.updateControls()

        currentPos = $.fancybox.getTranslate(current.$slide)

        current.isMoved = (currentPos.left !== 0 || currentPos.top !== 0) && !current.$slide.hasClass('fancybox-animated')
        current.forcedDuration = undefined

        if ($.isNumeric(duration)) {
          current.forcedDuration = duration
        } else {
          duration = current.opts[firstRun ? 'animationDuration' : 'transitionDuration']
        }

        duration = parseInt(duration, 10)

        // Fresh start - reveal container, current slide and start loading content
        if (firstRun) {

          if (current.opts.animationEffect && duration) {
            self.$refs.container.css('transition-duration', duration + 'ms')
          }

          self.$refs.container.removeClass('fancybox-is-hidden')

          forceRedraw(self.$refs.container)

          self.$refs.container.addClass('fancybox-is-open')

          // Make first slide visible (to display loading icon, if needed)
          current.$slide.addClass('fancybox-slide--current')

          self.loadSlide(current)

          self.preload()

          return
        }

        // Clean up
        $.each(self.slides, function (index, slide) {
          $.fancybox.stop(slide.$slide)
        })

        // Make current that slide is visible even if content is still loading
        current.$slide.removeClass('fancybox-slide--next fancybox-slide--previous').addClass('fancybox-slide--current')

        // If slides have been dragged, animate them to correct position
        if (current.isMoved) {
          canvasWidth = Math.round(current.$slide.width())

          $.each(self.slides, function (index, slide) {
            var pos = slide.pos - current.pos

            $.fancybox.animate(slide.$slide, {
              top: 0,
              left: (pos * canvasWidth) + (pos * slide.opts.gutter)
            }, duration, function () {

              slide.$slide.removeAttr('style').removeClass('fancybox-slide--next fancybox-slide--previous')

              if (slide.pos === self.currPos) {
                current.isMoved = false

                self.complete()
              }
            })
          })

        } else {
          self.$refs.stage.children().removeAttr('style')
        }

        // Start transition that reveals current content
        // or wait when it will be loaded

        if (current.isLoaded) {
          self.revealContent(current)

        } else {
          self.loadSlide(current)
        }

        self.preload()

        if (previous.pos === current.pos) {
          return
        }

        // Handle previous slide
        // =====================

        transitionProps = 'fancybox-slide--' + (previous.pos > current.pos ? 'next' : 'previous')

        previous.$slide.removeClass('fancybox-slide--complete fancybox-slide--current fancybox-slide--next fancybox-slide--previous')

        previous.isComplete = false

        if (!duration || (!current.isMoved && !current.opts.transitionEffect)) {
          return
        }

        if (current.isMoved) {
          previous.$slide.addClass(transitionProps)

        } else {

          transitionProps = 'fancybox-animated ' + transitionProps + ' fancybox-fx-' + current.opts.transitionEffect

          $.fancybox.animate(previous.$slide, transitionProps, duration, function () {
            previous.$slide.removeClass(transitionProps).removeAttr('style')
          })

        }

      },


      // Create new "slide" element
      // These are gallery items  that are actually added to DOM
      // =======================================================

      createSlide: function (pos) {

        var self = this
        var $slide
        var index

        index = pos % self.group.length
        index = index < 0 ? self.group.length + index : index

        if (!self.slides[pos] && self.group[index]) {
          $slide = $('<div class="fancybox-slide"></div>').appendTo(self.$refs.stage)

          self.slides[pos] = $.extend(true, {}, self.group[index], {
            pos: pos,
            $slide: $slide,
            isLoaded: false,
          })

          self.updateSlide(self.slides[pos])
        }

        return self.slides[pos]
      },


      // Scale image to the actual size of the image
      // ===========================================

      scaleToActual: function (x, y, duration) {

        var self = this

        var current = self.current
        var $what = current.$content

        var imgPos, posX, posY, scaleX, scaleY

        var canvasWidth = parseInt(current.$slide.width(), 10)
        var canvasHeight = parseInt(current.$slide.height(), 10)

        var newImgWidth = current.width
        var newImgHeight = current.height

        if (!(current.type == 'image' && !current.hasError) || !$what || self.isAnimating) {
          return
        }

        $.fancybox.stop($what)

        self.isAnimating = true

        x = x === undefined ? canvasWidth * 0.5 : x
        y = y === undefined ? canvasHeight * 0.5 : y

        imgPos = $.fancybox.getTranslate($what)

        scaleX = newImgWidth / imgPos.width
        scaleY = newImgHeight / imgPos.height

        // Get center position for original image
        posX = (canvasWidth * 0.5 - newImgWidth * 0.5)
        posY = (canvasHeight * 0.5 - newImgHeight * 0.5)

        // Make sure image does not move away from edges
        if (newImgWidth > canvasWidth) {
          posX = imgPos.left * scaleX - ((x * scaleX) - x)

          if (posX > 0) {
            posX = 0
          }

          if (posX < canvasWidth - newImgWidth) {
            posX = canvasWidth - newImgWidth
          }
        }

        if (newImgHeight > canvasHeight) {
          posY = imgPos.top * scaleY - ((y * scaleY) - y)

          if (posY > 0) {
            posY = 0
          }

          if (posY < canvasHeight - newImgHeight) {
            posY = canvasHeight - newImgHeight
          }
        }

        self.updateCursor(newImgWidth, newImgHeight)

        $.fancybox.animate($what, {
          top: posY,
          left: posX,
          scaleX: scaleX,
          scaleY: scaleY
        }, duration || 330, function () {
          self.isAnimating = false
        })

        // Stop slideshow
        if (self.SlideShow && self.SlideShow.isActive) {
          self.SlideShow.stop()
        }
      },


      // Scale image to fit inside parent element
      // ========================================

      scaleToFit: function (duration) {

        var self = this

        var current = self.current
        var $what = current.$content
        var end

        if (!(current.type == 'image' && !current.hasError) || !$what || self.isAnimating) {
          return
        }

        $.fancybox.stop($what)

        self.isAnimating = true

        end = self.getFitPos(current)

        self.updateCursor(end.width, end.height)

        $.fancybox.animate($what, {
          top: end.top,
          left: end.left,
          scaleX: end.width / $what.width(),
          scaleY: end.height / $what.height()
        }, duration || 330, function () {
          self.isAnimating = false
        })

      },

      // Calculate image size to fit inside viewport
      // ===========================================

      getFitPos: function (slide) {
        var self = this
        var $what = slide.$content

        var imgWidth = slide.width
        var imgHeight = slide.height

        var margin = slide.opts.margin

        var canvasWidth, canvasHeight, minRatio, width, height

        if (!$what || !$what.length || (!imgWidth && !imgHeight)) {
          return false
        }

        // Convert "margin to CSS style: [ top, right, bottom, left ]
        if ($.type(margin) === "number") {
          margin = [margin, margin]
        }

        if (margin.length == 2) {
          margin = [margin[0], margin[1], margin[0], margin[1]]
        }

        if ($W.width() < 800) {
          margin = [0, 0, 0, 0]
        }

        // We can not use $slide width here, because it can have different diemensions while in transiton
        canvasWidth = parseInt(self.$refs.stage.width(), 10) - (margin[1] + margin[3])
        canvasHeight = parseInt(self.$refs.stage.height(), 10) - (margin[0] + margin[2])

        minRatio = Math.min(1, canvasWidth / imgWidth, canvasHeight / imgHeight)

        width = Math.floor(minRatio * imgWidth)
        height = Math.floor(minRatio * imgHeight)

        // Use floor rounding to make sure it really fits
        return {
          top: Math.floor((canvasHeight - height) * 0.5) + margin[0],
          left: Math.floor((canvasWidth - width) * 0.5) + margin[3],
          width: width,
          height: height
        }

      },


      // Update position and content of all slides
      // =========================================

      update: function () {

        var self = this

        $.each(self.slides, function (key, slide) {
          self.updateSlide(slide)
        })

      },


      // Update slide position and scale content to fit
      // ==============================================

      updateSlide: function (slide) {

        var self = this
        var $what = slide.$content

        if ($what && (slide.width || slide.height)) {
          $.fancybox.stop($what)

          $.fancybox.setTranslate($what, self.getFitPos(slide))

          if (slide.pos === self.currPos) {
            self.updateCursor()
          }
        }

        slide.$slide.trigger('refresh')

        self.trigger('onUpdate', slide)

      },

      // Update cursor style depending if content can be zoomed
      // ======================================================

      updateCursor: function (nextWidth, nextHeight) {

        var self = this
        var isScaledDown

        var $container = self.$refs.container.removeClass('fancybox-is-zoomable fancybox-can-zoomIn fancybox-can-drag fancybox-can-zoomOut')

        if (!self.current || self.isClosing) {
          return
        }

        if (self.isZoomable()) {

          $container.addClass('fancybox-is-zoomable')

          if (nextWidth !== undefined && nextHeight !== undefined) {
            isScaledDown = nextWidth < self.current.width && nextHeight < self.current.height

          } else {
            isScaledDown = self.isScaledDown()
          }

          if (isScaledDown) {

            // If image is scaled down, then, obviously, it can be zoomed to full size
            $container.addClass('fancybox-can-zoomIn')

          } else {

            if (self.current.opts.touch) {

              // If image size ir largen than available available and touch module is not disable,
              // then user can do panning
              $container.addClass('fancybox-can-drag')

            } else {
              $container.addClass('fancybox-can-zoomOut')
            }

          }

        } else if (self.current.opts.touch) {
          $container.addClass('fancybox-can-drag')
        }

      },


      // Check if current slide is zoomable
      // ==================================

      isZoomable: function () {

        var self = this

        var current = self.current
        var fitPos

        if (!current || self.isClosing) {
          return
        }

        // Assume that slide is zoomable if
        //   - image is loaded successfuly
        //   - click action is "zoom"
        //   - actual size of the image is smaller than available area
        if (current.type === 'image' && current.isLoaded && !current.hasError &&
          (current.opts.clickContent === 'zoom' || ($.isFunction(current.opts.clickContent) && current.opts.clickContent(current) === "zoom"))
        ) {

          fitPos = self.getFitPos(current)

          if (current.width > fitPos.width || current.height > fitPos.height) {
            return true
          }

        }

        return false

      },


      // Check if current image dimensions are smaller than actual
      // =========================================================

      isScaledDown: function () {

        var self = this

        var current = self.current
        var $what = current.$content

        var rez = false

        if ($what) {
          rez = $.fancybox.getTranslate($what)
          rez = rez.width < current.width || rez.height < current.height
        }

        return rez

      },


      // Check if image dimensions exceed parent element
      // ===============================================

      canPan: function () {

        var self = this

        var current = self.current
        var $what = current.$content

        var rez = false

        if ($what) {
          rez = self.getFitPos(current)
          rez = Math.abs($what.width() - rez.width) > 1 || Math.abs($what.height() - rez.height) > 1

        }

        return rez

      },


      // Load content into the slide
      // ===========================

      loadSlide: function (slide) {

        var self = this, type, $slide
        var ajaxLoad

        if (slide.isLoading) {
          return
        }

        if (slide.isLoaded) {
          return
        }

        slide.isLoading = true

        self.trigger('beforeLoad', slide)

        type = slide.type
        $slide = slide.$slide

        $slide
          .off('refresh')
          .trigger('onReset')
          .addClass('fancybox-slide--' + (type || 'unknown'))
          .addClass(slide.opts.slideClass)

        // Create content depending on the type

        switch (type) {

          case 'image':

            self.setImage(slide)

            break

          case 'iframe':

            self.setIframe(slide)

            break

          case 'html':

            self.setContent(slide, slide.src || slide.content)

            break

          case 'inline':

            if ($(slide.src).length) {
              self.setContent(slide, $(slide.src))

            } else {
              self.setError(slide)
            }

            break

          case 'ajax':

            self.showLoading(slide)

            ajaxLoad = $.ajax($.extend({}, slide.opts.ajax.settings, {
              url: slide.src,
              success: function (data, textStatus) {

                if (textStatus === 'success') {
                  self.setContent(slide, data)
                }

              },
              error: function (jqXHR, textStatus) {

                if (jqXHR && textStatus !== 'abort') {
                  self.setError(slide)
                }

              }
            }))

            $slide.one('onReset', function () {
              ajaxLoad.abort()
            })

            break

          default:

            self.setError(slide)

            break

        }

        return true

      },


      // Use thumbnail image, if possible
      // ================================

      setImage: function (slide) {

        var self = this
        var srcset = slide.opts.image.srcset

        var found, temp, pxRatio, windowWidth

        // If we have "srcset", then we need to find matching "src" value.
        // This is necessary, because when you set an src attribute, the browser will preload the image
        // before any javascript or even CSS is applied.
        if (srcset) {
          pxRatio = window.devicePixelRatio || 1
          windowWidth = window.innerWidth * pxRatio

          temp = srcset.split(',').map(function (el) {
            var ret = {}

            el.trim().split(/\s+/).forEach(function (el, i) {
              var value = parseInt(el.substring(0, el.length - 1), 10)

              if (i === 0) {
                return (ret.url = el)
              }

              if (value) {
                ret.value = value
                ret.postfix = el[el.length - 1]
              }

            })

            return ret
          })

          // Sort by value
          temp.sort(function (a, b) {
            return a.value - b.value
          })

          // Ok, now we have an array of all srcset values
          for (var j = 0; j < temp.length; j++) {
            var el = temp[j]

            if ((el.postfix === 'w' && el.value >= windowWidth) || (el.postfix === 'x' && el.value >= pxRatio)) {
              found = el
              break
            }
          }

          // If not found, take the last one
          if (!found && temp.length) {
            found = temp[temp.length - 1]
          }

          if (found) {
            slide.src = found.url

            // If we have default width/height values, we can calculate height for matching source
            if (slide.width && slide.height && found.postfix == 'w') {
              slide.height = (slide.width / slide.height) * found.value
              slide.width = found.value
            }
          }
        }

        // This will be wrapper containing both ghost and actual image
        slide.$content = $('<div class="fancybox-image-wrap"></div>')
          .addClass('fancybox-is-hidden')
          .appendTo(slide.$slide)


        // If we have a thumbnail, we can display it while actual image is loading
        // Users will not stare at black screen and actual image will appear gradually
        if (slide.opts.preload !== false && slide.opts.width && slide.opts.height && (slide.opts.thumb || slide.opts.$thumb)) {

          slide.width = slide.opts.width
          slide.height = slide.opts.height

          slide.$ghost = $('<img />')
            .one('error', function () {

              $(this).remove()

              slide.$ghost = null

              self.setBigImage(slide)

            })
            .one('load', function () {

              self.afterLoad(slide)

              self.setBigImage(slide)

            })
            .addClass('fancybox-image')
            .appendTo(slide.$content)
            .attr('src', slide.opts.thumb || slide.opts.$thumb.attr('src'))

        } else {

          self.setBigImage(slide)

        }

      },


      // Create full-size image
      // ======================

      setBigImage: function (slide) {
        var self = this
        var $img = $('<img />')

        slide.$image = $img
          .one('error', function () {

            self.setError(slide)

          })
          .one('load', function () {

            // Clear timeout that checks if loading icon needs to be displayed
            clearTimeout(slide.timouts)

            slide.timouts = null

            if (self.isClosing) {
              return
            }

            slide.width = this.naturalWidth
            slide.height = this.naturalHeight

            if (slide.opts.image.srcset) {
              $img.attr('sizes', '100vw').attr('srcset', slide.opts.image.srcset)
            }

            self.hideLoading(slide)

            if (slide.$ghost) {

              slide.timouts = setTimeout(function () {
                slide.timouts = null

                slide.$ghost.hide()

              }, Math.min(300, Math.max(1000, slide.height / 1600)))

            } else {
              self.afterLoad(slide)
            }

          })
          .addClass('fancybox-image')
          .attr('src', slide.src)
          .appendTo(slide.$content)

        if ($img[0].complete) {
          $img.trigger('load')

        } else if ($img[0].error) {
          $img.trigger('error')

        } else {

          slide.timouts = setTimeout(function () {
            if (!$img[0].complete && !slide.hasError) {
              self.showLoading(slide)
            }

          }, 100)

        }

      },


      // Create iframe wrapper, iframe and bindings
      // ==========================================

      setIframe: function (slide) {
        var self = this,
          opts = slide.opts.iframe,
          $slide = slide.$slide,
          $iframe

        slide.$content = $('<div class="fancybox-content' + (opts.preload ? ' fancybox-is-hidden' : '') + '"></div>')
          .css(opts.css)
          .appendTo($slide)

        $iframe = $(opts.tpl.replace(/\{rnd\}/g, new Date().getTime()))
          .attr(opts.attr)
          .appendTo(slide.$content)

        if (opts.preload) {

          self.showLoading(slide)

          // Unfortunately, it is not always possible to determine if iframe is successfully loaded
          // (due to browser security policy)

          $iframe.on('load.fb error.fb', function (e) {
            this.isReady = 1

            slide.$slide.trigger('refresh')

            self.afterLoad(slide)
          })

          // Recalculate iframe content size
          // ===============================

          $slide.on('refresh.fb', function () {
            var $wrap = slide.$content,
              $contents,
              $body,
              scrollWidth,
              frameWidth,
              frameHeight

            if ($iframe[0].isReady !== 1) {
              return
            }

            // Check if content is accessible,
            // it will fail if frame is not with the same origin

            try {
              $contents = $iframe.contents()
              $body = $contents.find('body')

            } catch (ignore) {}

            // Calculate dimensions for the wrapper
            if ($body && $body.length && !(opts.css.width !== undefined && opts.css.height !== undefined)) {

              scrollWidth = $iframe[0].contentWindow.document.documentElement.scrollWidth

              frameWidth = Math.ceil($body.outerWidth(true) + ($wrap.width() - scrollWidth))
              frameHeight = Math.ceil($body.outerHeight(true))

              // Resize wrapper to fit iframe content
              $wrap.css({
                'width': opts.css.width === undefined ? frameWidth + ($wrap.outerWidth() - $wrap.innerWidth()) : opts.css.width,
                'height': opts.css.height === undefined ? frameHeight + ($wrap.outerHeight() - $wrap.innerHeight()) : opts.css.height
              })

            }

            $wrap.removeClass('fancybox-is-hidden')

          })

        } else {

          this.afterLoad(slide)

        }

        $iframe.attr('src', slide.src)

        if (slide.opts.smallBtn === true) {
          slide.$content.prepend(self.translate(slide, slide.opts.btnTpl.smallBtn))
        }

        // Remove iframe if closing or changing gallery item
        $slide.one('onReset', function () {

          // This helps IE not to throw errors when closing
          try {

            $(this).find('iframe').hide().attr('src', '//about:blank')

          } catch (ignore) {}

          $(this).empty()

          slide.isLoaded = false

        })

      },


      // Wrap and append content to the slide
      // ======================================

      setContent: function (slide, content) {

        var self = this

        if (self.isClosing) {
          return
        }

        self.hideLoading(slide)

        slide.$slide.empty()

        if (isQuery(content) && content.parent().length) {

          // If content is a jQuery object, then it will be moved to the slide.
          // The placeholder is created so we will know where to put it back.
          // If user is navigating gallery fast, then the content might be already inside fancyBox
          // =====================================================================================

          // Make sure content is not already moved to fancyBox
          content.parent('.fancybox-slide--inline').trigger('onReset')

          // Create temporary element marking original place of the content
          slide.$placeholder = $('<div></div>').hide().insertAfter(content)

          // Make sure content is visible
          content.css('display', 'inline-block')

        } else if (!slide.hasError) {

          // If content is just a plain text, try to convert it to html
          if ($.type(content) === 'string') {
            content = $('<div>').append($.trim(content)).contents()

            // If we have text node, then add wrapping element to make vertical alignment work
            if (content[0].nodeType === 3) {
              content = $('<div>').html(content)
            }
          }

          // If "filter" option is provided, then filter content
          if (slide.opts.filter) {
            content = $('<div>').html(content).find(slide.opts.filter)
          }

        }

        slide.$slide.one('onReset', function () {

          // Put content back
          if (slide.$placeholder) {
            slide.$placeholder.after(content.hide()).remove()

            slide.$placeholder = null
          }

          // Remove custom close button
          if (slide.$smallBtn) {
            slide.$smallBtn.remove()

            slide.$smallBtn = null
          }

          // Remove content and mark slide as not loaded
          if (!slide.hasError) {
            $(this).empty()

            slide.isLoaded = false
          }

        })

        slide.$content = $(content).appendTo(slide.$slide)

        if (slide.opts.smallBtn && !slide.$smallBtn) {
          slide.$smallBtn = $(self.translate(slide, slide.opts.btnTpl.smallBtn)).appendTo(slide.$content)
        }

        this.afterLoad(slide)
      },

      // Display error message
      // =====================

      setError: function (slide) {

        slide.hasError = true

        slide.$slide.removeClass('fancybox-slide--' + slide.type)

        this.setContent(slide, this.translate(slide, slide.opts.errorTpl))

      },


      // Show loading icon inside the slide
      // ==================================

      showLoading: function (slide) {

        var self = this

        slide = slide || self.current

        if (slide && !slide.$spinner) {
          slide.$spinner = $(self.opts.spinnerTpl).appendTo(slide.$slide)
        }

      },

      // Remove loading icon from the slide
      // ==================================

      hideLoading: function (slide) {

        var self = this

        slide = slide || self.current

        if (slide && slide.$spinner) {
          slide.$spinner.remove()

          delete slide.$spinner
        }

      },


      // Adjustments after slide content has been loaded
      // ===============================================

      afterLoad: function (slide) {

        var self = this

        if (self.isClosing) {
          return
        }

        slide.isLoading = false
        slide.isLoaded = true

        self.trigger('afterLoad', slide)

        self.hideLoading(slide)

        if (slide.opts.protect && slide.$content && !slide.hasError) {

          // Disable right click
          slide.$content.on('contextmenu.fb', function (e) {
            if (e.button == 2) {
              e.preventDefault()
            }

            return true
          })

          // Add fake element on top of the image
          // This makes a bit harder for user to select image
          if (slide.type === 'image') {
            $('<div class="fancybox-spaceball"></div>').appendTo(slide.$content)
          }

        }

        self.revealContent(slide)

      },


      // Make content visible
      // This method is called right after content has been loaded or
      // user navigates gallery and transition should start
      // ============================================================

      revealContent: function (slide) {

        var self = this
        var $slide = slide.$slide

        var effect, effectClassName, duration, opacity, end, start = false

        effect = slide.opts[self.firstRun ? 'animationEffect' : 'transitionEffect']
        duration = slide.opts[self.firstRun ? 'animationDuration' : 'transitionDuration']

        duration = parseInt(slide.forcedDuration === undefined ? duration : slide.forcedDuration, 10)

        if (slide.isMoved || slide.pos !== self.currPos || !duration) {
          effect = false
        }

        // Check if can zoom
        if (effect === 'zoom' && !(slide.pos === self.currPos && duration && slide.type === 'image' && !slide.hasError && (start = self.getThumbPos(slide)))) {
          effect = 'fade'
        }


        // Zoom animation
        // ==============

        if (effect === 'zoom') {
          end = self.getFitPos(slide)

          end.scaleX = end.width / start.width
          end.scaleY = end.height / start.height

          delete end.width
          delete end.height

          // Check if we need to animate opacity
          opacity = slide.opts.zoomOpacity

          if (opacity == 'auto') {
            opacity = Math.abs(slide.width / slide.height - start.width / start.height) > 0.1
          }

          if (opacity) {
            start.opacity = 0.1
            end.opacity = 1
          }

          // Draw image at start position
          $.fancybox.setTranslate(slide.$content.removeClass('fancybox-is-hidden'), start)

          forceRedraw(slide.$content)

          // Start animation
          $.fancybox.animate(slide.$content, end, duration, function () {
            self.complete()
          })

          return
        }


        self.updateSlide(slide)


        // Simply show content
        // ===================

        if (!effect) {
          forceRedraw($slide)

          slide.$content.removeClass('fancybox-is-hidden')

          if (slide.pos === self.currPos) {
            self.complete()
          }

          return
        }

        $.fancybox.stop($slide)

        effectClassName = 'fancybox-animated fancybox-slide--' + (slide.pos > self.prevPos ? 'next' : 'previous') + ' fancybox-fx-' + effect

        $slide.removeAttr('style').removeClass('fancybox-slide--current fancybox-slide--next fancybox-slide--previous').addClass(effectClassName)

        slide.$content.removeClass('fancybox-is-hidden')

        //Force reflow for CSS3 transitions
        forceRedraw($slide)

        $.fancybox.animate($slide, 'fancybox-slide--current', duration, function (e) {
          $slide.removeClass(effectClassName).removeAttr('style')

          if (slide.pos === self.currPos) {
            self.complete()
          }

        }, true)

      },


      // Check if we can and have to zoom from thumbnail
      //================================================

      getThumbPos: function (slide) {

        var self = this
        var rez = false

        // Check if element is inside the viewport by at least 1 pixel
        var isElementVisible = function ($el) {
          var element = $el[0]

          var elementRect = element.getBoundingClientRect()
          var parentRects = []

          var visibleInAllParents

          while (element.parentElement !== null) {
            if ($(element.parentElement).css('overflow') === 'hidden' || $(element.parentElement).css('overflow') === 'auto') {
              parentRects.push(element.parentElement.getBoundingClientRect())
            }

            element = element.parentElement
          }

          visibleInAllParents = parentRects.every(function (parentRect) {
            var visiblePixelX = Math.min(elementRect.right, parentRect.right) - Math.max(elementRect.left, parentRect.left)
            var visiblePixelY = Math.min(elementRect.bottom, parentRect.bottom) - Math.max(elementRect.top, parentRect.top)

            return visiblePixelX > 0 && visiblePixelY > 0
          })

          return visibleInAllParents &&
            elementRect.bottom > 0 && elementRect.right > 0 &&
            elementRect.left < $(window).width() && elementRect.top < $(window).height()
        }

        var $thumb = slide.opts.$thumb
        var thumbPos = $thumb ? $thumb.offset() : 0
        var slidePos

        if (thumbPos && $thumb[0].ownerDocument === document && isElementVisible($thumb)) {
          slidePos = self.$refs.stage.offset()

          rez = {
            top: thumbPos.top - slidePos.top + parseFloat($thumb.css("border-top-width") || 0),
            left: thumbPos.left - slidePos.left + parseFloat($thumb.css("border-left-width") || 0),
            width: $thumb.width(),
            height: $thumb.height(),
            scaleX: 1,
            scaleY: 1
          }
        }

        return rez
      },


      // Final adjustments after current gallery item is moved to position
      // and it`s content is loaded
      // ==================================================================

      complete: function () {

        var self = this

        var current = self.current
        var slides = {}

        if (current.isMoved || !current.isLoaded || current.isComplete) {
          return
        }

        current.isComplete = true

        current.$slide.siblings().trigger('onReset')

        // Trigger any CSS3 transiton inside the slide
        forceRedraw(current.$slide)

        current.$slide.addClass('fancybox-slide--complete')

        // Remove unnecessary slides
        $.each(self.slides, function (key, slide) {
          if (slide.pos >= self.currPos - 1 && slide.pos <= self.currPos + 1) {
            slides[slide.pos] = slide

          } else if (slide) {

            $.fancybox.stop(slide.$slide)

            slide.$slide.unbind().remove()
          }
        })

        self.slides = slides

        self.updateCursor()

        self.trigger('afterShow')

        // Try to focus on the first focusable element
        if ($(document.activeElement).is('[disabled]') || (current.opts.autoFocus && !(current.type == 'image' || current.type === 'iframe'))) {
          self.focus()
        }

      },


      // Preload next and previous slides
      // ================================

      preload: function () {
        var self = this
        var next, prev

        if (self.group.length < 2) {
          return
        }

        next = self.slides[self.currPos + 1]
        prev = self.slides[self.currPos - 1]

        if (next && next.type === 'image') {
          self.loadSlide(next)
        }

        if (prev && prev.type === 'image') {
          self.loadSlide(prev)
        }

      },


      // Try to find and focus on the first focusable element
      // ====================================================

      focus: function () {
        var current = this.current
        var $el

        if (this.isClosing) {
          return
        }

        // Skip for images and iframes
        $el = current && current.isComplete ? current.$slide.find('button,:input,[tabindex],a').filter(':not([disabled]):visible:first') : null
        $el = $el && $el.length ? $el : this.$refs.container

        $el.focus()
      },


      // Activates current instance - brings container to the front and enables keyboard,
      // notifies other instances about deactivating
      // =================================================================================

      activate: function () {
        var self = this

        // Deactivate all instances
        $('.fancybox-container').each(function () {
          var instance = $(this).data('FancyBox')

          // Skip self and closing instances
          if (instance && instance.uid !== self.uid && !instance.isClosing) {
            instance.trigger('onDeactivate')
          }

        })

        if (self.current) {
          if (self.$refs.container.index() > 0) {
            self.$refs.container.prependTo(document.body)
          }

          self.updateControls()
        }

        self.trigger('onActivate')

        self.addEvents()

      },


      // Start closing procedure
      // This will start "zoom-out" animation if needed and clean everything up afterwards
      // =================================================================================

      close: function (e, d) {

        var self = this
        var current = self.current

        var effect, duration
        var $what, opacity, start, end

        var done = function () {
          self.cleanUp(e)
        }

        if (self.isClosing) {
          return false
        }

        self.isClosing = true

        // If beforeClose callback prevents closing, make sure content is centered
        if (self.trigger('beforeClose', e) === false) {
          self.isClosing = false

          requestAFrame(function () {
            self.update()
          })

          return false
        }

        // Remove all events
        // If there are multiple instances, they will be set again by "activate" method
        self.removeEvents()

        if (current.timouts) {
          clearTimeout(current.timouts)
        }

        $what = current.$content
        effect = current.opts.animationEffect
        duration = $.isNumeric(d) ? d : (effect ? current.opts.animationDuration : 0)

        // Remove other slides
        current.$slide.off(transitionEnd).removeClass('fancybox-slide--complete fancybox-slide--next fancybox-slide--previous fancybox-animated')

        current.$slide.siblings().trigger('onReset').remove()

        // Trigger animations
        if (duration) {
          self.$refs.container.removeClass('fancybox-is-open').addClass('fancybox-is-closing')
        }

        // Clean up
        self.hideLoading(current)

        self.hideControls()

        self.updateCursor()

        // Check if possible to zoom-out
        if (effect === 'zoom' && !(e !== true && $what && duration && current.type === 'image' && !current.hasError && (end = self.getThumbPos(current)))) {
          effect = 'fade'
        }

        if (effect === 'zoom') {
          $.fancybox.stop($what)

          start = $.fancybox.getTranslate($what)

          start.width = start.width * start.scaleX
          start.height = start.height * start.scaleY

          // Check if we need to animate opacity
          opacity = current.opts.zoomOpacity

          if (opacity == 'auto') {
            opacity = Math.abs(current.width / current.height - end.width / end.height) > 0.1
          }

          if (opacity) {
            end.opacity = 0
          }

          start.scaleX = start.width / end.width
          start.scaleY = start.height / end.height

          start.width = end.width
          start.height = end.height

          $.fancybox.setTranslate(current.$content, start)

          $.fancybox.animate(current.$content, end, duration, done)

          return true
        }

        if (effect && duration) {

          // If skip animation
          if (e === true) {
            setTimeout(done, duration)

          } else {
            $.fancybox.animate(current.$slide.removeClass('fancybox-slide--current'), 'fancybox-animated fancybox-slide--previous fancybox-fx-' + effect, duration, done)
          }

        } else {
          done()
        }

        return true
      },


      // Final adjustments after removing the instance
      // =============================================

      cleanUp: function (e) {
        var self = this,
          instance

        self.current.$slide.trigger('onReset')

        self.$refs.container.empty().remove()

        self.trigger('afterClose', e)

        // Place back focus
        if (self.$lastFocus && !!self.current.opts.backFocus) {
          self.$lastFocus.focus()
        }

        self.current = null

        // Check if there are other instances
        instance = $.fancybox.getInstance()

        if (instance) {
          instance.activate()

        } else {

          $W.scrollTop(self.scrollTop).scrollLeft(self.scrollLeft)

          $('html').removeClass('fancybox-enabled')

          $('#fancybox-style-noscroll').remove()
        }

      },


      // Call callback and trigger an event
      // ==================================

      trigger: function (name, slide) {
        var args = Array.prototype.slice.call(arguments, 1),
          self = this,
          obj = slide && slide.opts ? slide : self.current,
          rez

        if (obj) {
          args.unshift(obj)

        } else {
          obj = self
        }

        args.unshift(self)

        if ($.isFunction(obj.opts[name])) {
          rez = obj.opts[name].apply(obj, args)
        }

        if (rez === false) {
          return rez
        }

        if (name === 'afterClose') {
          $D.trigger(name + '.fb', args)

        } else {
          self.$refs.container.trigger(name + '.fb', args)
        }

      },


      // Update infobar values, navigation button states and reveal caption
      // ==================================================================

      updateControls: function (force) {

        var self = this

        var current = self.current
        var index = current.index
        var opts = current.opts
        var caption = opts.caption
        var $caption = self.$refs.caption

        // Recalculate content dimensions
        current.$slide.trigger('refresh')

        self.$caption = caption && caption.length ? $caption.html(caption) : null

        if (!self.isHiddenControls) {
          self.showControls()
        }

        // Update info and navigation elements
        $('[data-fancybox-count]').html(self.group.length)
        $('[data-fancybox-index]').html(index + 1)

        $('[data-fancybox-prev]').prop('disabled', (!opts.loop && index <= 0))
        $('[data-fancybox-next]').prop('disabled', (!opts.loop && index >= self.group.length - 1))

      },

      // Hide toolbar and caption
      // ========================

      hideControls: function () {

        this.isHiddenControls = true

        this.$refs.container.removeClass('fancybox-show-infobar fancybox-show-toolbar fancybox-show-caption fancybox-show-nav')

      },

      showControls: function () {

        var self = this
        var opts = self.current ? self.current.opts : self.opts
        var $container = self.$refs.container

        self.isHiddenControls = false
        self.idleSecondsCounter = 0

        $container
          .toggleClass('fancybox-show-toolbar', !!(opts.toolbar && opts.buttons))
          .toggleClass('fancybox-show-infobar', !!(opts.infobar && self.group.length > 1))
          .toggleClass('fancybox-show-nav', !!(opts.arrows && self.group.length > 1))
          .toggleClass('fancybox-is-modal', !!opts.modal)

        if (self.$caption) {
          $container.addClass('fancybox-show-caption ')

        } else {
          $container.removeClass('fancybox-show-caption')
        }

      },


      // Toggle toolbar and caption
      // ==========================

      toggleControls: function () {

        if (this.isHiddenControls) {
          this.showControls()

        } else {
          this.hideControls()
        }

      },


    })


    $.fancybox = {

      version: "3.1.24",
      defaults: defaults,


      // Get current instance and execute a command.
      //
      // Examples of usage:
      //
      //   $instance = $.fancybox.getInstance();
      //   $.fancybox.getInstance().jumpTo( 1 );
      //   $.fancybox.getInstance( 'jumpTo', 1 );
      //   $.fancybox.getInstance( function() {
      //       console.info( this.currIndex );
      //   });
      // ======================================================

      getInstance: function (command) {
        var instance = $('.fancybox-container:not(".fancybox-is-closing"):first').data('FancyBox')
        var args = Array.prototype.slice.call(arguments, 1)

        if (instance instanceof FancyBox) {

          if ($.type(command) === 'string') {
            instance[command].apply(instance, args)

          } else if ($.type(command) === 'function') {
            command.apply(instance, args)

          }

          return instance
        }

        return false

      },


      // Create new instance
      // ===================

      open: function (items, opts, index) {
        return new FancyBox(items, opts, index)
      },


      // Close current or all instances
      // ==============================

      close: function (all) {
        var instance = this.getInstance()

        if (instance) {
          instance.close()

          // Try to find and close next instance

          if (all === true) {
            this.close()
          }
        }

      },

      // Close instances and unbind all events
      // ==============================

      destroy: function () {

        this.close(true)

        $D.off('click.fb-start')

      },


      // Try to detect mobile devices
      // ============================

      isMobile: document.createTouch !== undefined && /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent),


      // Detect if 'translate3d' support is available
      // ============================================

      use3d: (function () {
        var div = document.createElement('div')

        return window.getComputedStyle && window.getComputedStyle(div).getPropertyValue('transform') && !(document.documentMode && document.documentMode < 11)
      }()),


      // Helper function to get current visual state of an element
      // returns array[ top, left, horizontal-scale, vertical-scale, opacity ]
      // =====================================================================

      getTranslate: function ($el) {
        var matrix

        if (!$el || !$el.length) {
          return false
        }

        matrix = $el.eq(0).css('transform')

        if (matrix && matrix.indexOf('matrix') !== -1) {
          matrix = matrix.split('(')[1]
          matrix = matrix.split(')')[0]
          matrix = matrix.split(',')
        } else {
          matrix = []
        }

        if (matrix.length) {

          // If IE
          if (matrix.length > 10) {
            matrix = [matrix[13], matrix[12], matrix[0], matrix[5]]

          } else {
            matrix = [matrix[5], matrix[4], matrix[0], matrix[3]]
          }

          matrix = matrix.map(parseFloat)

        } else {
          matrix = [0, 0, 1, 1]

          var transRegex = /\.*translate\((.*)px,(.*)px\)/i
          var transRez = transRegex.exec($el.eq(0).attr('style'))

          if (transRez) {
            matrix[0] = parseFloat(transRez[2])
            matrix[1] = parseFloat(transRez[1])
          }
        }

        return {
          top: matrix[0],
          left: matrix[1],
          scaleX: matrix[2],
          scaleY: matrix[3],
          opacity: parseFloat($el.css('opacity')),
          width: $el.width(),
          height: $el.height()
        }

      },


      // Shortcut for setting "translate3d" properties for element
      // Can set be used to set opacity, too
      // ========================================================

      setTranslate: function ($el, props) {
        var str = ''
        var css = {}

        if (!$el || !props) {
          return
        }

        if (props.left !== undefined || props.top !== undefined) {
          str = (props.left === undefined ? $el.position().left : props.left) + 'px, ' + (props.top === undefined ? $el.position().top : props.top) + 'px'

          if (this.use3d) {
            str = 'translate3d(' + str + ', 0px)'

          } else {
            str = 'translate(' + str + ')'
          }
        }

        if (props.scaleX !== undefined && props.scaleY !== undefined) {
          str = (str.length ? str + ' ' : '') + 'scale(' + props.scaleX + ', ' + props.scaleY + ')'
        }

        if (str.length) {
          css.transform = str
        }

        if (props.opacity !== undefined) {
          css.opacity = props.opacity
        }

        if (props.width !== undefined) {
          css.width = props.width
        }

        if (props.height !== undefined) {
          css.height = props.height
        }

        return $el.css(css)
      },


      // Simple CSS transition handler
      // =============================

      animate: function ($el, to, duration, callback, leaveAnimationName) {
        var event = transitionEnd || 'transitionend'

        if ($.isFunction(duration)) {
          callback = duration
          duration = null
        }

        if (!$.isPlainObject(to)) {
          $el.removeAttr('style')
        }

        $el.on(event, function (e) {

          // Skip events from child elements and z-index change
          if (e && e.originalEvent && (!$el.is(e.originalEvent.target) || e.originalEvent.propertyName == 'z-index')) {
            return
          }

          $el.off(event)

          if ($.isPlainObject(to)) {

            if (to.scaleX !== undefined && to.scaleY !== undefined) {
              $el.css('transition-duration', '0ms')

              to.width = Math.round($el.width() * to.scaleX)
              to.height = Math.round($el.height() * to.scaleY)

              to.scaleX = 1
              to.scaleY = 1

              $.fancybox.setTranslate($el, to)
            }

          } else if (leaveAnimationName !== true) {
            $el.removeClass(to)
          }

          if ($.isFunction(callback)) {
            callback(e)
          }

        })

        if ($.isNumeric(duration)) {
          $el.css('transition-duration', duration + 'ms')
        }

        if ($.isPlainObject(to)) {
          $.fancybox.setTranslate($el, to)

        } else {
          $el.addClass(to)
        }

        $el.data("timer", setTimeout(function () {
          $el.trigger('transitionend')
        }, duration + 16))

      },

      stop: function ($el) {
        clearTimeout($el.data("timer"))

        $el.off(transitionEnd)
      }

    }


    // Default click handler for "fancyboxed" links
    // ============================================

    function _run(e) {
      var target = e.currentTarget,
        opts = e.data ? e.data.options : {},
        items = opts.selector ? $(opts.selector) : (e.data ? e.data.items : []),
        value = $(target).attr('data-fancybox') || '',
        index = 0,
        active = $.fancybox.getInstance()

      e.preventDefault()
      e.stopPropagation()

      // Avoid opening multiple times
      if (active && active.current.opts.$orig.is(target)) {
        return
      }

      // Get all related items and find index for clicked one
      if (value) {
        items = items.length ? items.filter('[data-fancybox="' + value + '"]') : $('[data-fancybox="' + value + '"]')
        index = items.index(target)

        // Sometimes current item can not be found
        // (for example, when slider clones items)
        if (index < 0) {
          index = 0
        }

      } else {
        items = [target]
      }

      $.fancybox.open(items, opts, index)
    }


    // Create a jQuery plugin
    // ======================

    $.fn.fancybox = function (options) {
      var selector

      options = options || {}
      selector = options.selector || false

      if (selector) {

        $('body').off('click.fb-start', selector).on('click.fb-start', selector, {
          options: options
        }, _run)

      } else {

        this.off('click.fb-start').on('click.fb-start', {
          items: this,
          options: options
        }, _run)

      }

      return this
    }


    // Self initializing plugin
    // ========================

    $D.on('click.fb-start', '[data-fancybox]', _run)

  }(window, document, window.jQuery));

// ==========================================================================
//
// Media
// Adds additional media type support
//
// ==========================================================================
; (function ($) {

  'use strict'

  // Formats matching url to final form

  var format = function (url, rez, params) {
    if (!url) {
      return
    }

    params = params || ''

    if ($.type(params) === "object") {
      params = $.param(params, true)
    }

    $.each(rez, function (key, value) {
      url = url.replace('$' + key, value || '')
    })

    if (params.length) {
      url += (url.indexOf('?') > 0 ? '&' : '?') + params
    }

    return url
  }

  // Object containing properties for each media type

  var defaults = {
    youtube: {
      matcher: /(youtube\.com|youtu\.be|youtube\-nocookie\.com)\/(watch\?(.*&)?v=|v\/|u\/|embed\/?)?(videoseries\?list=(.*)|[\w-]{11}|\?listType=(.*)&list=(.*))(.*)/i,
      params: {
        autoplay: 1,
        autohide: 1,
        fs: 1,
        rel: 0,
        hd: 1,
        wmode: 'transparent',
        enablejsapi: 1,
        html5: 1
      },
      paramPlace: 8,
      type: 'iframe',
      url: '//www.youtube.com/embed/$4',
      thumb: '//img.youtube.com/vi/$4/hqdefault.jpg'
    },

    vimeo: {
      matcher: /^.+vimeo.com\/(.*\/)?([\d]+)(.*)?/,
      params: {
        autoplay: 1,
        hd: 1,
        show_title: 1,
        show_byline: 1,
        show_portrait: 0,
        fullscreen: 1,
        api: 1
      },
      paramPlace: 3,
      type: 'iframe',
      url: '//player.vimeo.com/video/$2'
    },

    metacafe: {
      matcher: /metacafe.com\/watch\/(\d+)\/(.*)?/,
      type: 'iframe',
      url: '//www.metacafe.com/embed/$1/?ap=1'
    },

    dailymotion: {
      matcher: /dailymotion.com\/video\/(.*)\/?(.*)/,
      params: {
        additionalInfos: 0,
        autoStart: 1
      },
      type: 'iframe',
      url: '//www.dailymotion.com/embed/video/$1'
    },

    vine: {
      matcher: /vine.co\/v\/([a-zA-Z0-9\?\=\-]+)/,
      type: 'iframe',
      url: '//vine.co/v/$1/embed/simple'
    },

    instagram: {
      matcher: /(instagr\.am|instagram\.com)\/p\/([a-zA-Z0-9_\-]+)\/?/i,
      type: 'image',
      url: '//$1/p/$2/media/?size=l'
    },

    // Examples:
    // http://maps.google.com/?ll=48.857995,2.294297&spn=0.007666,0.021136&t=m&z=16
    // https://www.google.com/maps/@37.7852006,-122.4146355,14.65z
    // https://www.google.com/maps/place/Googleplex/@37.4220041,-122.0833494,17z/data=!4m5!3m4!1s0x0:0x6c296c66619367e0!8m2!3d37.4219998!4d-122.0840572
    gmap_place: {
      matcher: /(maps\.)?google\.([a-z]{2,3}(\.[a-z]{2})?)\/(((maps\/(place\/(.*)\/)?\@(.*),(\d+.?\d+?)z))|(\?ll=))(.*)?/i,
      type: 'iframe',
      url: function (rez) {
        return '//maps.google.' + rez[2] + '/?ll=' + (rez[9] ? rez[9] + '&z=' + Math.floor(rez[10]) + (rez[12] ? rez[12].replace(/^\//, "&") : '') : rez[12]) + '&output=' + (rez[12] && rez[12].indexOf('layer=c') > 0 ? 'svembed' : 'embed')
      }
    },

    // Examples:
    // https://www.google.com/maps/search/Empire+State+Building/
    // https://www.google.com/maps/search/?api=1&query=centurylink+field
    // https://www.google.com/maps/search/?api=1&query=47.5951518,-122.3316393
    gmap_search: {
      matcher: /(maps\.)?google\.([a-z]{2,3}(\.[a-z]{2})?)\/(maps\/search\/)(.*)/i,
      type: 'iframe',
      url: function (rez) {
        return '//maps.google.' + rez[2] + '/maps?q=' + rez[5].replace('query=', 'q=').replace('api=1', '') + '&output=embed'
      }
    }
  }

  $(document).on('onInit.fb', function (e, instance) {

    $.each(instance.group, function (i, item) {

      var url = item.src || '',
        type = false,
        media,
        thumb,
        rez,
        params,
        urlParams,
        o,
        provider

      // Skip items that already have content type
      if (item.type) {
        return
      }

      media = $.extend(true, {}, defaults, item.opts.media)

      // Look for any matching media type
      $.each(media, function (n, el) {
        rez = url.match(el.matcher)
        o = {}
        provider = n

        if (!rez) {
          return
        }

        type = el.type

        if (el.paramPlace && rez[el.paramPlace]) {
          urlParams = rez[el.paramPlace]

          if (urlParams[0] == '?') {
            urlParams = urlParams.substring(1)
          }

          urlParams = urlParams.split('&')

          for (var m = 0; m < urlParams.length; ++m) {
            var p = urlParams[m].split('=', 2)

            if (p.length == 2) {
              o[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "))
            }
          }
        }

        params = $.extend(true, {}, el.params, item.opts[n], o)

        url = $.type(el.url) === "function" ? el.url.call(this, rez, params, item) : format(el.url, rez, params)
        thumb = $.type(el.thumb) === "function" ? el.thumb.call(this, rez, params, item) : format(el.thumb, rez)

        if (provider === 'vimeo') {
          url = url.replace('&%23', '#')
        }

        return false
      })

      // If it is found, then change content type and update the url

      if (type) {
        item.src = url
        item.type = type

        if (!item.opts.thumb && !(item.opts.$thumb && item.opts.$thumb.length)) {
          item.opts.thumb = thumb
        }

        if (type === 'iframe') {
          $.extend(true, item.opts, {
            iframe: {
              preload: false,
              attr: {
                scrolling: "no"
              }
            }
          })

          item.contentProvider = provider

          item.opts.slideClass += ' fancybox-slide--' + (provider == 'gmap_place' || provider == 'gmap_search' ? 'map' : 'video')
        }

      } else {

        // If no content type is found, then set it to `image` as fallback
        item.type = 'image'
      }

    })

  })

}(window.jQuery));

// ==========================================================================
//
// Guestures
// Adds touch guestures, handles click and tap events
//
// ==========================================================================
; (function (window, document, $) {
  'use strict'

  var requestAFrame = (function () {
    return window.requestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      window.oRequestAnimationFrame ||
      // if all else fails, use setTimeout
      function (callback) {
        return window.setTimeout(callback, 1000 / 60)
      }
  })()


  var cancelAFrame = (function () {
    return window.cancelAnimationFrame ||
      window.webkitCancelAnimationFrame ||
      window.mozCancelAnimationFrame ||
      window.oCancelAnimationFrame ||
      function (id) {
        window.clearTimeout(id)
      }
  })()


  var pointers = function (e) {
    var result = []

    e = e.originalEvent || e || window.e
    e = e.touches && e.touches.length ? e.touches : (e.changedTouches && e.changedTouches.length ? e.changedTouches : [e])

    for (var key in e) {

      if (e[key].pageX) {
        result.push({x: e[key].pageX, y: e[key].pageY})

      } else if (e[key].clientX) {
        result.push({x: e[key].clientX, y: e[key].clientY})
      }
    }

    return result
  }

  var distance = function (point2, point1, what) {
    if (!point1 || !point2) {
      return 0
    }

    if (what === 'x') {
      return point2.x - point1.x

    } else if (what === 'y') {
      return point2.y - point1.y
    }

    return Math.sqrt(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2))
  }

  var isClickable = function ($el) {
    if ($el.is('a,button,input,select,textarea') || $.isFunction($el.get(0).onclick)) {
      return true
    }

    // Check for attributes like data-fancybox-next or data-fancybox-close
    for (var i = 0, atts = $el[0].attributes, n = atts.length; i < n; i++) {
      if (atts[i].nodeName.substr(0, 14) === 'data-fancybox-') {
        return true
      }
    }

    return false
  }

  var hasScrollbars = function (el) {
    var overflowY = window.getComputedStyle(el)['overflow-y']
    var overflowX = window.getComputedStyle(el)['overflow-x']

    var vertical = (overflowY === 'scroll' || overflowY === 'auto') && el.scrollHeight > el.clientHeight
    var horizontal = (overflowX === 'scroll' || overflowX === 'auto') && el.scrollWidth > el.clientWidth

    return vertical || horizontal
  }

  var isScrollable = function ($el) {
    var rez = false

    while (true) {
      rez = hasScrollbars($el.get(0))

      if (rez) {
        break
      }

      $el = $el.parent()

      if (!$el.length || $el.hasClass('fancybox-stage') || $el.is('body')) {
        break
      }
    }

    return rez
  }


  var Guestures = function (instance) {
    var self = this

    self.instance = instance

    self.$bg = instance.$refs.bg
    self.$stage = instance.$refs.stage
    self.$container = instance.$refs.container

    self.destroy()

    self.$container.on('touchstart.fb.touch mousedown.fb.touch', $.proxy(self, 'ontouchstart'))
  }

  Guestures.prototype.destroy = function () {
    this.$container.off('.fb.touch')
  }

  Guestures.prototype.ontouchstart = function (e) {
    var self = this

    var $target = $(e.target)
    var instance = self.instance
    var current = instance.current
    var $content = current.$content

    var isTouchDevice = (e.type == 'touchstart')

    // Do not respond to both events
    if (isTouchDevice) {
      self.$container.off('mousedown.fb.touch')
    }

    // Ignore clicks while zooming or closing
    if (!current || self.instance.isAnimating || self.instance.isClosing) {
      e.stopPropagation()
      e.preventDefault()

      return
    }

    // Ignore right click
    if (e.originalEvent && e.originalEvent.button == 2) {
      return
    }

    // Ignore taping on links, buttons, input elements
    if (!$target.length || isClickable($target) || isClickable($target.parent())) {
      return
    }

    // Ignore clicks on the scrollbar
    if (e.originalEvent.clientX > $target[0].clientWidth + $target.offset().left) {
      return
    }

    self.startPoints = pointers(e)

    // Prevent zooming if already swiping
    if (!self.startPoints || (self.startPoints.length > 1 && instance.isSliding)) {
      return
    }

    self.$target = $target
    self.$content = $content
    self.canTap = true

    $(document).off('.fb.touch')

    $(document).on(isTouchDevice ? 'touchend.fb.touch touchcancel.fb.touch' : 'mouseup.fb.touch mouseleave.fb.touch', $.proxy(self, "ontouchend"))
    $(document).on(isTouchDevice ? 'touchmove.fb.touch' : 'mousemove.fb.touch', $.proxy(self, "ontouchmove"))

    e.stopPropagation()

    if (!(instance.current.opts.touch || instance.canPan()) || !($target.is(self.$stage) || self.$stage.find($target).length)) {

      // Prevent ghosting
      if ($target.is('img')) {
        e.preventDefault()
      }

      return
    }

    if (!($.fancybox.isMobile && (isScrollable(self.$target) || isScrollable(self.$target.parent())))) {
      e.preventDefault()
    }

    self.canvasWidth = Math.round(current.$slide[0].clientWidth)
    self.canvasHeight = Math.round(current.$slide[0].clientHeight)

    self.startTime = new Date().getTime()
    self.distanceX = self.distanceY = self.distance = 0

    self.isPanning = false
    self.isSwiping = false
    self.isZooming = false

    self.sliderStartPos = self.sliderLastPos || {top: 0, left: 0}
    self.contentStartPos = $.fancybox.getTranslate(self.$content)
    self.contentLastPos = null

    if (self.startPoints.length === 1 && !self.isZooming) {
      self.canTap = !instance.isSliding

      if (current.type === 'image' && (self.contentStartPos.width > self.canvasWidth + 1 || self.contentStartPos.height > self.canvasHeight + 1)) {

        $.fancybox.stop(self.$content)

        self.$content.css('transition-duration', '0ms')

        self.isPanning = true

      } else {

        self.isSwiping = true
      }

      self.$container.addClass('fancybox-controls--isGrabbing')
    }

    if (self.startPoints.length === 2 && !instance.isAnimating && !current.hasError && current.type === 'image' && (current.isLoaded || current.$ghost)) {
      self.isZooming = true

      self.isSwiping = false
      self.isPanning = false

      $.fancybox.stop(self.$content)

      self.$content.css('transition-duration', '0ms')

      self.centerPointStartX = ((self.startPoints[0].x + self.startPoints[1].x) * 0.5) - $(window).scrollLeft()
      self.centerPointStartY = ((self.startPoints[0].y + self.startPoints[1].y) * 0.5) - $(window).scrollTop()

      self.percentageOfImageAtPinchPointX = (self.centerPointStartX - self.contentStartPos.left) / self.contentStartPos.width
      self.percentageOfImageAtPinchPointY = (self.centerPointStartY - self.contentStartPos.top) / self.contentStartPos.height

      self.startDistanceBetweenFingers = distance(self.startPoints[0], self.startPoints[1])
    }

  }

  Guestures.prototype.ontouchmove = function (e) {

    var self = this

    self.newPoints = pointers(e)

    if ($.fancybox.isMobile && (isScrollable(self.$target) || isScrollable(self.$target.parent()))) {
      e.stopPropagation()

      self.canTap = false

      return
    }

    if (!(self.instance.current.opts.touch || self.instance.canPan()) || !self.newPoints || !self.newPoints.length) {
      return
    }

    self.distanceX = distance(self.newPoints[0], self.startPoints[0], 'x')
    self.distanceY = distance(self.newPoints[0], self.startPoints[0], 'y')

    self.distance = distance(self.newPoints[0], self.startPoints[0])

    // Skip false ontouchmove events (Chrome)
    if (self.distance > 0) {

      if (!(self.$target.is(self.$stage) || self.$stage.find(self.$target).length)) {
        return
      }

      e.stopPropagation()
      e.preventDefault()

      if (self.isSwiping) {
        self.onSwipe()

      } else if (self.isPanning) {
        self.onPan()

      } else if (self.isZooming) {
        self.onZoom()
      }

    }

  }

  Guestures.prototype.onSwipe = function () {

    var self = this

    var swiping = self.isSwiping
    var left = self.sliderStartPos.left || 0
    var angle

    if (swiping === true) {

      if (Math.abs(self.distance) > 10) {

        self.canTap = false

        if (self.instance.group.length < 2 && self.instance.opts.touch.vertical) {
          self.isSwiping = 'y'

        } else if (self.instance.isSliding || self.instance.opts.touch.vertical === false || (self.instance.opts.touch.vertical === 'auto' && $(window).width() > 800)) {
          self.isSwiping = 'x'

        } else {
          angle = Math.abs(Math.atan2(self.distanceY, self.distanceX) * 180 / Math.PI)

          self.isSwiping = (angle > 45 && angle < 135) ? 'y' : 'x'
        }

        self.instance.isSliding = self.isSwiping

        // Reset points to avoid jumping, because we dropped first swipes to calculate the angle
        self.startPoints = self.newPoints

        $.each(self.instance.slides, function (index, slide) {
          $.fancybox.stop(slide.$slide)

          slide.$slide.css('transition-duration', '0ms')

          slide.inTransition = false

          if (slide.pos === self.instance.current.pos) {
            self.sliderStartPos.left = $.fancybox.getTranslate(slide.$slide).left
          }
        })

        //self.instance.current.isMoved = true;

        // Stop slideshow
        if (self.instance.SlideShow && self.instance.SlideShow.isActive) {
          self.instance.SlideShow.stop()
        }
      }

    } else {

      if (swiping == 'x') {

        // Sticky edges
        if (self.distanceX > 0 && (self.instance.group.length < 2 || (self.instance.current.index === 0 && !self.instance.current.opts.loop))) {
          left = left + Math.pow(self.distanceX, 0.8)

        } else if (self.distanceX < 0 && (self.instance.group.length < 2 || (self.instance.current.index === self.instance.group.length - 1 && !self.instance.current.opts.loop))) {
          left = left - Math.pow(-self.distanceX, 0.8)

        } else {
          left = left + self.distanceX
        }

      }

      self.sliderLastPos = {
        top: swiping == 'x' ? 0 : self.sliderStartPos.top + self.distanceY,
        left: left
      }

      if (self.requestId) {
        cancelAFrame(self.requestId)

        self.requestId = null
      }

      self.requestId = requestAFrame(function () {

        if (self.sliderLastPos) {
          $.each(self.instance.slides, function (index, slide) {
            var pos = slide.pos - self.instance.currPos

            $.fancybox.setTranslate(slide.$slide, {
              top: self.sliderLastPos.top,
              left: self.sliderLastPos.left + (pos * self.canvasWidth) + (pos * slide.opts.gutter)
            })
          })

          self.$container.addClass('fancybox-is-sliding')
        }

      })

    }

  }

  Guestures.prototype.onPan = function () {

    var self = this

    var newOffsetX, newOffsetY, newPos

    self.canTap = false

    if (self.contentStartPos.width > self.canvasWidth) {
      newOffsetX = self.contentStartPos.left + self.distanceX

    } else {
      newOffsetX = self.contentStartPos.left
    }

    newOffsetY = self.contentStartPos.top + self.distanceY

    newPos = self.limitMovement(newOffsetX, newOffsetY, self.contentStartPos.width, self.contentStartPos.height)

    newPos.scaleX = self.contentStartPos.scaleX
    newPos.scaleY = self.contentStartPos.scaleY

    self.contentLastPos = newPos

    if (self.requestId) {
      cancelAFrame(self.requestId)

      self.requestId = null
    }

    self.requestId = requestAFrame(function () {
      $.fancybox.setTranslate(self.$content, self.contentLastPos)
    })
  }

  // Make panning sticky to the edges
  Guestures.prototype.limitMovement = function (newOffsetX, newOffsetY, newWidth, newHeight) {

    var self = this

    var minTranslateX, minTranslateY, maxTranslateX, maxTranslateY

    var canvasWidth = self.canvasWidth
    var canvasHeight = self.canvasHeight

    var currentOffsetX = self.contentStartPos.left
    var currentOffsetY = self.contentStartPos.top

    var distanceX = self.distanceX
    var distanceY = self.distanceY

    // Slow down proportionally to traveled distance

    minTranslateX = Math.max(0, canvasWidth * 0.5 - newWidth * 0.5)
    minTranslateY = Math.max(0, canvasHeight * 0.5 - newHeight * 0.5)

    maxTranslateX = Math.min(canvasWidth - newWidth, canvasWidth * 0.5 - newWidth * 0.5)
    maxTranslateY = Math.min(canvasHeight - newHeight, canvasHeight * 0.5 - newHeight * 0.5)

    if (newWidth > canvasWidth) {

      //   ->
      if (distanceX > 0 && newOffsetX > minTranslateX) {
        newOffsetX = minTranslateX - 1 + Math.pow(-minTranslateX + currentOffsetX + distanceX, 0.8) || 0
      }

      //    <-
      if (distanceX < 0 && newOffsetX < maxTranslateX) {
        newOffsetX = maxTranslateX + 1 - Math.pow(maxTranslateX - currentOffsetX - distanceX, 0.8) || 0
      }

    }

    if (newHeight > canvasHeight) {

      //   \/
      if (distanceY > 0 && newOffsetY > minTranslateY) {
        newOffsetY = minTranslateY - 1 + Math.pow(-minTranslateY + currentOffsetY + distanceY, 0.8) || 0
      }

      //   /\
      if (distanceY < 0 && newOffsetY < maxTranslateY) {
        newOffsetY = maxTranslateY + 1 - Math.pow(maxTranslateY - currentOffsetY - distanceY, 0.8) || 0
      }

    }

    return {
      top: newOffsetY,
      left: newOffsetX
    }

  }


  Guestures.prototype.limitPosition = function (newOffsetX, newOffsetY, newWidth, newHeight) {

    var self = this

    var canvasWidth = self.canvasWidth
    var canvasHeight = self.canvasHeight

    if (newWidth > canvasWidth) {
      newOffsetX = newOffsetX > 0 ? 0 : newOffsetX
      newOffsetX = newOffsetX < canvasWidth - newWidth ? canvasWidth - newWidth : newOffsetX

    } else {

      // Center horizontally
      newOffsetX = Math.max(0, canvasWidth / 2 - newWidth / 2)

    }

    if (newHeight > canvasHeight) {
      newOffsetY = newOffsetY > 0 ? 0 : newOffsetY
      newOffsetY = newOffsetY < canvasHeight - newHeight ? canvasHeight - newHeight : newOffsetY

    } else {

      // Center vertically
      newOffsetY = Math.max(0, canvasHeight / 2 - newHeight / 2)

    }

    return {
      top: newOffsetY,
      left: newOffsetX
    }

  }

  Guestures.prototype.onZoom = function () {

    var self = this

    // Calculate current distance between points to get pinch ratio and new width and height

    var currentWidth = self.contentStartPos.width
    var currentHeight = self.contentStartPos.height

    var currentOffsetX = self.contentStartPos.left
    var currentOffsetY = self.contentStartPos.top

    var endDistanceBetweenFingers = distance(self.newPoints[0], self.newPoints[1])

    var pinchRatio = endDistanceBetweenFingers / self.startDistanceBetweenFingers

    var newWidth = Math.floor(currentWidth * pinchRatio)
    var newHeight = Math.floor(currentHeight * pinchRatio)

    // This is the translation due to pinch-zooming
    var translateFromZoomingX = (currentWidth - newWidth) * self.percentageOfImageAtPinchPointX
    var translateFromZoomingY = (currentHeight - newHeight) * self.percentageOfImageAtPinchPointY

    //Point between the two touches

    var centerPointEndX = ((self.newPoints[0].x + self.newPoints[1].x) / 2) - $(window).scrollLeft()
    var centerPointEndY = ((self.newPoints[0].y + self.newPoints[1].y) / 2) - $(window).scrollTop()

    // And this is the translation due to translation of the centerpoint
    // between the two fingers

    var translateFromTranslatingX = centerPointEndX - self.centerPointStartX
    var translateFromTranslatingY = centerPointEndY - self.centerPointStartY

    // The new offset is the old/current one plus the total translation

    var newOffsetX = currentOffsetX + (translateFromZoomingX + translateFromTranslatingX)
    var newOffsetY = currentOffsetY + (translateFromZoomingY + translateFromTranslatingY)

    var newPos = {
      top: newOffsetY,
      left: newOffsetX,
      scaleX: self.contentStartPos.scaleX * pinchRatio,
      scaleY: self.contentStartPos.scaleY * pinchRatio
    }

    self.canTap = false

    self.newWidth = newWidth
    self.newHeight = newHeight

    self.contentLastPos = newPos

    if (self.requestId) {
      cancelAFrame(self.requestId)

      self.requestId = null
    }

    self.requestId = requestAFrame(function () {
      $.fancybox.setTranslate(self.$content, self.contentLastPos)
    })

  }

  Guestures.prototype.ontouchend = function (e) {

    var self = this
    var dMs = Math.max((new Date().getTime()) - self.startTime, 1)

    var swiping = self.isSwiping
    var panning = self.isPanning
    var zooming = self.isZooming

    self.endPoints = pointers(e)

    self.$container.removeClass('fancybox-controls--isGrabbing')

    $(document).off('.fb.touch')

    if (self.requestId) {
      cancelAFrame(self.requestId)

      self.requestId = null
    }

    self.isSwiping = false
    self.isPanning = false
    self.isZooming = false

    if (self.canTap) {
      return self.onTap(e)
    }

    self.speed = 366

    // Speed in px/ms
    self.velocityX = self.distanceX / dMs * 0.5
    self.velocityY = self.distanceY / dMs * 0.5

    self.speedX = Math.max(self.speed * 0.5, Math.min(self.speed * 1.5, (1 / Math.abs(self.velocityX)) * self.speed))

    if (panning) {
      self.endPanning()

    } else if (zooming) {
      self.endZooming()

    } else {
      self.endSwiping(swiping)
    }

    return
  }

  Guestures.prototype.endSwiping = function (swiping) {

    var self = this
    var ret = false

    self.instance.isSliding = false
    self.sliderLastPos = null

    // Close if swiped vertically / navigate if horizontally
    if (swiping == 'y' && Math.abs(self.distanceY) > 50) {

      // Continue vertical movement
      $.fancybox.animate(self.instance.current.$slide, {
        top: self.sliderStartPos.top + self.distanceY + (self.velocityY * 150),
        opacity: 0
      }, 150)

      ret = self.instance.close(true, 300)

    } else if (swiping == 'x' && self.distanceX > 50 && self.instance.group.length > 1) {
      ret = self.instance.previous(self.speedX)

    } else if (swiping == 'x' && self.distanceX < -50 && self.instance.group.length > 1) {
      ret = self.instance.next(self.speedX)
    }

    if (ret === false && (swiping == 'x' || swiping == 'y')) {
      self.instance.jumpTo(self.instance.current.index, 150)
    }

    self.$container.removeClass('fancybox-is-sliding')

  }

  // Limit panning from edges
  // ========================

  Guestures.prototype.endPanning = function () {

    var self = this
    var newOffsetX, newOffsetY, newPos

    if (!self.contentLastPos) {
      return
    }

    if (self.instance.current.opts.touch.momentum === false) {
      newOffsetX = self.contentLastPos.left
      newOffsetY = self.contentLastPos.top

    } else {

      // Continue movement
      newOffsetX = self.contentLastPos.left + (self.velocityX * self.speed)
      newOffsetY = self.contentLastPos.top + (self.velocityY * self.speed)
    }

    newPos = self.limitPosition(newOffsetX, newOffsetY, self.contentStartPos.width, self.contentStartPos.height)

    newPos.width = self.contentStartPos.width
    newPos.height = self.contentStartPos.height

    $.fancybox.animate(self.$content, newPos, 330)
  }


  Guestures.prototype.endZooming = function () {

    var self = this

    var current = self.instance.current

    var newOffsetX, newOffsetY, newPos, reset

    var newWidth = self.newWidth
    var newHeight = self.newHeight

    if (!self.contentLastPos) {
      return
    }

    newOffsetX = self.contentLastPos.left
    newOffsetY = self.contentLastPos.top

    reset = {
      top: newOffsetY,
      left: newOffsetX,
      width: newWidth,
      height: newHeight,
      scaleX: 1,
      scaleY: 1
    }

    // Reset scalex/scaleY values; this helps for perfomance and does not break animation
    $.fancybox.setTranslate(self.$content, reset)

    if (newWidth < self.canvasWidth && newHeight < self.canvasHeight) {
      self.instance.scaleToFit(150)

    } else if (newWidth > current.width || newHeight > current.height) {
      self.instance.scaleToActual(self.centerPointStartX, self.centerPointStartY, 150)

    } else {

      newPos = self.limitPosition(newOffsetX, newOffsetY, newWidth, newHeight)

      // Switch from scale() to width/height or animation will not work correctly
      $.fancybox.setTranslate(self.content, $.fancybox.getTranslate(self.$content))

      $.fancybox.animate(self.$content, newPos, 150)
    }

  }

  Guestures.prototype.onTap = function (e) {
    var self = this
    var $target = $(e.target)

    var instance = self.instance
    var current = instance.current

    var endPoints = (e && pointers(e)) || self.startPoints

    var tapX = endPoints[0] ? endPoints[0].x - self.$stage.offset().left : 0
    var tapY = endPoints[0] ? endPoints[0].y - self.$stage.offset().top : 0

    var where

    var process = function (prefix) {

      var action = current.opts[prefix]

      if ($.isFunction(action)) {
        action = action.apply(instance, [current, e])
      }

      if (!action) {
        return
      }

      switch (action) {

        case "close":

          instance.close(self.startEvent)

          break

        case "toggleControls":

          instance.toggleControls(true)

          break

        case "next":

          instance.next()

          break

        case "nextOrClose":

          if (instance.group.length > 1) {
            instance.next()

          } else {
            instance.close(self.startEvent)
          }

          break

        case "zoom":

          if (current.type == 'image' && (current.isLoaded || current.$ghost)) {

            if (instance.canPan()) {
              instance.scaleToFit()

            } else if (instance.isScaledDown()) {
              instance.scaleToActual(tapX, tapY)

            } else if (instance.group.length < 2) {
              instance.close(self.startEvent)
            }
          }

          break
      }

    }

    // Ignore right click
    if (e.originalEvent && e.originalEvent.button == 2) {
      return
    }

    // Skip if current slide is not in the center
    if (instance.isSliding) {
      return
    }

    // Skip if clicked on the scrollbar
    if (tapX > $target[0].clientWidth + $target.offset().left) {
      return
    }

    // Check where is clicked
    if ($target.is('.fancybox-bg,.fancybox-inner,.fancybox-outer,.fancybox-container')) {
      where = 'Outside'

    } else if ($target.is('.fancybox-slide')) {
      where = 'Slide'

    } else if (instance.current.$content && instance.current.$content.has(e.target).length) {
      where = 'Content'

    } else {
      return
    }

    // Check if this is a double tap
    if (self.tapped) {

      // Stop previously created single tap
      clearTimeout(self.tapped)
      self.tapped = null

      // Skip if distance between taps is too big
      if (Math.abs(tapX - self.tapX) > 50 || Math.abs(tapY - self.tapY) > 50 || instance.isSliding) {
        return this
      }

      // OK, now we assume that this is a double-tap
      process('dblclick' + where)

    } else {

      // Single tap will be processed if user has not clicked second time within 300ms
      // or there is no need to wait for double-tap
      self.tapX = tapX
      self.tapY = tapY

      if (current.opts['dblclick' + where] && current.opts['dblclick' + where] !== current.opts['click' + where]) {
        self.tapped = setTimeout(function () {
          self.tapped = null

          process('click' + where)

        }, 300)

      } else {
        process('click' + where)
      }

    }

    return this
  }

  $(document).on('onActivate.fb', function (e, instance) {
    if (instance && !instance.Guestures) {
      instance.Guestures = new Guestures(instance)
    }
  })

  $(document).on('beforeClose.fb', function (e, instance) {
    if (instance && instance.Guestures) {
      instance.Guestures.destroy()
    }
  })


}(window, document, window.jQuery));

// ==========================================================================
//
// SlideShow
// Enables slideshow functionality
//
// Example of usage:
// $.fancybox.getInstance().SlideShow.start()
//
// ==========================================================================
; (function (document, $) {
  'use strict'

  var SlideShow = function (instance) {
    this.instance = instance
    this.init()
  }

  $.extend(SlideShow.prototype, {
    timer: null,
    isActive: false,
    $button: null,
    speed: 3000,

    init: function () {
      var self = this

      self.$button = self.instance.$refs.toolbar.find('[data-fancybox-play]').on('click', function () {
        self.toggle()
      })

      if (self.instance.group.length < 2 || !self.instance.group[self.instance.currIndex].opts.slideShow) {
        self.$button.hide()
      }
    },

    set: function () {
      var self = this

      // Check if reached last element
      if (self.instance && self.instance.current && (self.instance.current.opts.loop || self.instance.currIndex < self.instance.group.length - 1)) {
        self.timer = setTimeout(function () {
          self.instance.next()

        }, self.instance.current.opts.slideShow.speed || self.speed)

      } else {
        self.stop()
        self.instance.idleSecondsCounter = 0
        self.instance.showControls()
      }

    },

    clear: function () {
      var self = this

      clearTimeout(self.timer)

      self.timer = null
    },

    start: function () {
      var self = this
      var current = self.instance.current

      if (self.instance && current && (current.opts.loop || current.index < self.instance.group.length - 1)) {

        self.isActive = true

        self.$button
          .attr('title', current.opts.i18n[current.opts.lang].PLAY_STOP)
          .addClass('fancybox-button--pause')

        if (current.isComplete) {
          self.set()
        }
      }
    },

    stop: function () {
      var self = this
      var current = self.instance.current

      self.clear()

      self.$button
        .attr('title', current.opts.i18n[current.opts.lang].PLAY_START)
        .removeClass('fancybox-button--pause')

      self.isActive = false
    },

    toggle: function () {
      var self = this

      if (self.isActive) {
        self.stop()

      } else {
        self.start()
      }
    }

  })

  $(document).on({
    'onInit.fb': function (e, instance) {
      if (instance && !instance.SlideShow) {
        instance.SlideShow = new SlideShow(instance)
      }
    },

    'beforeShow.fb': function (e, instance, current, firstRun) {
      var SlideShow = instance && instance.SlideShow

      if (firstRun) {

        if (SlideShow && current.opts.slideShow.autoStart) {
          SlideShow.start()
        }

      } else if (SlideShow && SlideShow.isActive) {
        SlideShow.clear()
      }
    },

    'afterShow.fb': function (e, instance, current) {
      var SlideShow = instance && instance.SlideShow

      if (SlideShow && SlideShow.isActive) {
        SlideShow.set()
      }
    },

    'afterKeydown.fb': function (e, instance, current, keypress, keycode) {
      var SlideShow = instance && instance.SlideShow

      // "P" or Spacebar
      if (SlideShow && current.opts.slideShow && (keycode === 80 || keycode === 32) && !$(document.activeElement).is('button,a,input')) {
        keypress.preventDefault()

        SlideShow.toggle()
      }
    },

    'beforeClose.fb onDeactivate.fb': function (e, instance) {
      var SlideShow = instance && instance.SlideShow

      if (SlideShow) {
        SlideShow.stop()
      }
    }
  })

  // Page Visibility API to pause slideshow when window is not active
  $(document).on("visibilitychange", function () {
    var instance = $.fancybox.getInstance()
    var SlideShow = instance && instance.SlideShow

    if (SlideShow && SlideShow.isActive) {
      if (document.hidden) {
        SlideShow.clear()

      } else {
        SlideShow.set()
      }
    }
  })

}(document, window.jQuery));

// ==========================================================================
//
// FullScreen
// Adds fullscreen functionality
//
// ==========================================================================
; (function (document, $) {
  'use strict'

  // Collection of methods supported by user browser
  var fn = (function () {

    var fnMap = [
      [
        'requestFullscreen',
        'exitFullscreen',
        'fullscreenElement',
        'fullscreenEnabled',
        'fullscreenchange',
        'fullscreenerror'
      ],
      // new WebKit
      [
        'webkitRequestFullscreen',
        'webkitExitFullscreen',
        'webkitFullscreenElement',
        'webkitFullscreenEnabled',
        'webkitfullscreenchange',
        'webkitfullscreenerror'

      ],
      // old WebKit (Safari 5.1)
      [
        'webkitRequestFullScreen',
        'webkitCancelFullScreen',
        'webkitCurrentFullScreenElement',
        'webkitCancelFullScreen',
        'webkitfullscreenchange',
        'webkitfullscreenerror'

      ],
      [
        'mozRequestFullScreen',
        'mozCancelFullScreen',
        'mozFullScreenElement',
        'mozFullScreenEnabled',
        'mozfullscreenchange',
        'mozfullscreenerror'
      ],
      [
        'msRequestFullscreen',
        'msExitFullscreen',
        'msFullscreenElement',
        'msFullscreenEnabled',
        'MSFullscreenChange',
        'MSFullscreenError'
      ]
    ]

    var val
    var ret = {}
    var i, j

    for (i = 0; i < fnMap.length; i++) {
      val = fnMap[i]

      if (val && val[1] in document) {
        for (j = 0; j < val.length; j++) {
          ret[fnMap[0][j]] = val[j]
        }

        return ret
      }
    }

    return false
  })()

  // If browser does not have Full Screen API, then simply unset default button template and stop
  if (!fn) {
    $.fancybox.defaults.btnTpl.fullScreen = false

    return
  }

  var FullScreen = {
    request: function (elem) {

      elem = elem || document.documentElement

      elem[fn.requestFullscreen](elem.ALLOW_KEYBOARD_INPUT)

    },
    exit: function () {

      document[fn.exitFullscreen]()

    },
    toggle: function (elem) {

      elem = elem || document.documentElement

      if (this.isFullscreen()) {
        this.exit()

      } else {
        this.request(elem)
      }

    },
    isFullscreen: function () {

      return Boolean(document[fn.fullscreenElement])

    },
    enabled: function () {

      return Boolean(document[fn.fullscreenEnabled])

    }
  }

  $(document).on({
    'onInit.fb': function (e, instance) {
      var $container

      var $button = instance.$refs.toolbar.find('[data-fancybox-fullscreen]')

      if (instance && !instance.FullScreen && instance.group[instance.currIndex].opts.fullScreen) {
        $container = instance.$refs.container

        $container.on('click.fb-fullscreen', '[data-fancybox-fullscreen]', function (e) {

          e.stopPropagation()
          e.preventDefault()

          FullScreen.toggle($container[0])

        })

        if (instance.opts.fullScreen && instance.opts.fullScreen.autoStart === true) {
          FullScreen.request($container[0])
        }

        // Expose API
        instance.FullScreen = FullScreen

      } else {
        $button.hide()
      }

    },

    'afterKeydown.fb': function (e, instance, current, keypress, keycode) {

      // "P" or Spacebar
      if (instance && instance.FullScreen && keycode === 70) {
        keypress.preventDefault()

        instance.FullScreen.toggle(instance.$refs.container[0])
      }

    },

    'beforeClose.fb': function (instance) {
      if (instance && instance.FullScreen) {
        FullScreen.exit()
      }
    }
  })

  $(document).on(fn.fullscreenchange, function () {
    var instance = $.fancybox.getInstance()

    // If image is zooming, then force to stop and reposition properly
    if (instance.current && instance.current.type === 'image' && instance.isAnimating) {
      instance.current.$content.css('transition', 'none')

      instance.isAnimating = false

      instance.update(true, true, 0)
    }

  })

}(document, window.jQuery));

// ==========================================================================
//
// Thumbs
// Displays thumbnails in a grid
//
// ==========================================================================
; (function (document, $) {
  'use strict'

  var FancyThumbs = function (instance) {
    this.instance = instance
    this.init()
  }

  $.extend(FancyThumbs.prototype, {

    $button: null,
    $grid: null,
    $list: null,
    isVisible: false,

    init: function () {
      var self = this

      var first = self.instance.group[0],
        second = self.instance.group[1]

      self.$button = self.instance.$refs.toolbar.find('[data-fancybox-thumbs]')

      if (self.instance.group.length > 1 && self.instance.group[self.instance.currIndex].opts.thumbs && (
        (first.type == 'image' || first.opts.thumb || first.opts.$thumb) &&
        (second.type == 'image' || second.opts.thumb || second.opts.$thumb)
      )) {

        self.$button.on('click', function () {
          self.toggle()
        })

        self.isActive = true

      } else {
        self.$button.hide()

        self.isActive = false
      }

    },

    create: function () {
      var instance = this.instance,
        list,
        src

      this.$grid = $('<div class="fancybox-thumbs"></div>').appendTo(instance.$refs.container)

      list = '<ul>'

      $.each(instance.group, function (i, item) {

        src = item.opts.thumb || (item.opts.$thumb ? item.opts.$thumb.attr('src') : null)

        if (!src && item.type === 'image') {
          src = item.src
        }

        if (src && src.length) {
          list += '<li data-index="' + i + '"  tabindex="0" class="fancybox-thumbs-loading"><img data-src="' + src + '" /></li>'
        }

      })

      list += '</ul>'

      this.$list = $(list).appendTo(this.$grid).on('click', 'li', function () {
        instance.jumpTo($(this).data('index'))
      })

      this.$list.find('img').hide().one('load', function () {

        var $parent = $(this).parent().removeClass('fancybox-thumbs-loading'),
          thumbWidth = $parent.outerWidth(),
          thumbHeight = $parent.outerHeight(),
          width,
          height,
          widthRatio,
          heightRatio

        width = this.naturalWidth || this.width
        height = this.naturalHeight || this.height

        //Calculate thumbnail width/height and center it

        widthRatio = width / thumbWidth
        heightRatio = height / thumbHeight

        if (widthRatio >= 1 && heightRatio >= 1) {
          if (widthRatio > heightRatio) {
            width = width / heightRatio
            height = thumbHeight

          } else {
            width = thumbWidth
            height = height / widthRatio
          }
        }

        $(this).css({
          width: Math.floor(width),
          height: Math.floor(height),
          'margin-top': Math.min(0, Math.floor(thumbHeight * 0.3 - height * 0.3)),
          'margin-left': Math.min(0, Math.floor(thumbWidth * 0.5 - width * 0.5))
        }).show()

      })
        .each(function () {
          this.src = $(this).data('src')
        })

    },

    focus: function () {

      if (this.instance.current) {
        this.$list
          .children()
          .removeClass('fancybox-thumbs-active')
          .filter('[data-index="' + this.instance.current.index + '"]')
          .addClass('fancybox-thumbs-active')
          .focus()
      }

    },

    close: function () {
      this.$grid.hide()
    },

    update: function () {

      this.instance.$refs.container.toggleClass('fancybox-show-thumbs', this.isVisible)

      if (this.isVisible) {

        if (!this.$grid) {
          this.create()
        }

        this.instance.trigger('onThumbsShow')

        this.focus()

      } else if (this.$grid) {
        this.instance.trigger('onThumbsHide')
      }

      // Update content position
      this.instance.update()

    },

    hide: function () {
      this.isVisible = false
      this.update()
    },

    show: function () {
      this.isVisible = true
      this.update()
    },

    toggle: function () {
      this.isVisible = !this.isVisible
      this.update()
    }

  })

  $(document).on({

    'onInit.fb': function (e, instance) {
      if (instance && !instance.Thumbs) {
        instance.Thumbs = new FancyThumbs(instance)
      }
    },

    'beforeShow.fb': function (e, instance, item, firstRun) {
      var Thumbs = instance && instance.Thumbs

      if (!Thumbs || !Thumbs.isActive) {
        return
      }

      if (item.modal) {
        Thumbs.$button.hide()

        Thumbs.hide()

        return
      }

      if (firstRun && instance.opts.thumbs.autoStart === true) {
        Thumbs.show()
      }

      if (Thumbs.isVisible) {
        Thumbs.focus()
      }
    },

    'afterKeydown.fb': function (e, instance, current, keypress, keycode) {
      var Thumbs = instance && instance.Thumbs

      // "G"
      if (Thumbs && Thumbs.isActive && keycode === 71) {
        keypress.preventDefault()

        Thumbs.toggle()
      }
    },

    'beforeClose.fb': function (e, instance) {
      var Thumbs = instance && instance.Thumbs

      if (Thumbs && Thumbs.isVisible && instance.opts.thumbs.hideOnClose !== false) {
        Thumbs.close()
      }
    }

  })

}(document, window.jQuery));

// ==========================================================================
//
// Hash
// Enables linking to each modal
//
// ==========================================================================
; (function (document, window, $) {
  'use strict'

  // Simple $.escapeSelector polyfill (for jQuery prior v3)
  if (!$.escapeSelector) {
    $.escapeSelector = function (sel) {
      var rcssescape = /([\0-\x1f\x7f]|^-?\d)|^-$|[^\x80-\uFFFF\w-]/g
      var fcssescape = function (ch, asCodePoint) {
        if (asCodePoint) {
          // U+0000 NULL becomes U+FFFD REPLACEMENT CHARACTER
          if (ch === "\0") {
            return "\uFFFD"
          }

          // Control characters and (dependent upon position) numbers get escaped as code points
          return ch.slice(0, -1) + "\\" + ch.charCodeAt(ch.length - 1).toString(16) + " "
        }

        // Other potentially-special ASCII characters get backslash-escaped
        return "\\" + ch
      }

      return (sel + "").replace(rcssescape, fcssescape)
    }
  }

  // Create new history entry only once
  var shouldCreateHistory = true

  // Variable containing last hash value set by fancyBox
  // It will be used to determine if fancyBox needs to close after hash change is detected
  var currentHash = null

  // Throttling the history change
  var timerID = null

  // Get info about gallery name and current index from url
  function parseUrl() {
    var hash = window.location.hash.substr(1)
    var rez = hash.split('-')
    var index = rez.length > 1 && /^\+?\d+$/.test(rez[rez.length - 1]) ? parseInt(rez.pop(-1), 10) || 1 : 1
    var gallery = rez.join('-')

    // Index is starting from 1
    if (index < 1) {
      index = 1
    }

    return {
      hash: hash,
      index: index,
      gallery: gallery
    }
  }

  // Trigger click evnt on links to open new fancyBox instance
  function triggerFromUrl(url) {
    var $el

    if (url.gallery !== '') {

      // If we can find element matching 'data-fancybox' atribute, then trigger click event for that ..
      $el = $("[data-fancybox='" + $.escapeSelector(url.gallery) + "']").eq(url.index - 1)

      if (!$el.length) {
        // .. if not, try finding element by ID
        $el = $("#" + $.escapeSelector(url.gallery) + "")
      }

      if ($el.length) {
        shouldCreateHistory = false

        $el.trigger('click')
      }

    }
  }

  // Get gallery name from current instance
  function getGallery(instance) {
    var opts

    if (!instance) {
      return false
    }

    opts = instance.current ? instance.current.opts : instance.opts

    return opts.$orig ? opts.$orig.data('fancybox') : (opts.hash || '')
  }

  // Star when DOM becomes ready
  $(function () {

    // Small delay is used to allow other scripts to process "dom ready" event
    setTimeout(function () {

      // Check if this module is not disabled
      if ($.fancybox.defaults.hash === false) {
        return
      }

      // Update hash when opening/closing fancyBox
      $(document).on({
        'onInit.fb': function (e, instance) {
          var url, gallery

          if (instance.group[instance.currIndex].opts.hash === false) {
            return
          }

          url = parseUrl()
          gallery = getGallery(instance)

          // Make sure gallery start index matches index from hash
          if (gallery && url.gallery && gallery == url.gallery) {
            instance.currIndex = url.index - 1
          }

        },

        'beforeShow.fb': function (e, instance, current) {
          var gallery

          if (current.opts.hash === false) {
            return
          }

          gallery = getGallery(instance)

          // Update window hash
          if (gallery && gallery !== '') {

            if (window.location.hash.indexOf(gallery) < 0) {
              instance.opts.origHash = window.location.hash
            }

            currentHash = gallery + (instance.group.length > 1 ? '-' + (current.index + 1) : '')

            if ('replaceState' in window.history) {
              if (timerID) {
                clearTimeout(timerID)
              }

              timerID = setTimeout(function () {
                window.history[shouldCreateHistory ? 'pushState' : 'replaceState']({}, document.title, window.location.pathname + window.location.search + '#' + currentHash)

                timerID = null

                shouldCreateHistory = false

              }, 300)

            } else {
              window.location.hash = currentHash
            }

          }

        },

        'beforeClose.fb': function (e, instance, current) {
          var gallery, origHash

          if (timerID) {
            clearTimeout(timerID)
          }

          if (current.opts.hash === false) {
            return
          }

          gallery = getGallery(instance)
          origHash = instance && instance.opts.origHash ? instance.opts.origHash : ''

          // Remove hash from location bar
          if (gallery && gallery !== '') {

            if ('replaceState' in history) {
              window.history.replaceState({}, document.title, window.location.pathname + window.location.search + origHash)

            } else {
              window.location.hash = origHash

              // Keep original scroll position
              $(window).scrollTop(instance.scrollTop).scrollLeft(instance.scrollLeft)
            }
          }

          currentHash = null
        }
      })

      // Check if need to close after url has changed
      $(window).on('hashchange.fb', function () {
        var url = parseUrl()

        if ($.fancybox.getInstance()) {
          if (currentHash && currentHash !== url.gallery + '-' + url.index && !(url.index === 1 && currentHash == url.gallery)) {
            currentHash = null

            $.fancybox.close()

            shouldCreateHistory = true
          }

        } else if (url.gallery !== '') {
          triggerFromUrl(url)
        }
      })

      // Check current hash and trigger click event on matching element to start fancyBox, if needed
      triggerFromUrl(parseUrl())

    }, 50)

  })


}(document, window, window.jQuery))


  /*
       _ _      _       _
   ___| (_) ___| | __  (_)___
  / __| | |/ __| |/ /  | / __|
  \__ \ | | (__|   < _ | \__ \
  |___/_|_|\___|_|\_(_)/ |___/
                     |__/
  
   Version: 1.8.0
    Author: Ken Wheeler
   Website: http://kenwheeler.github.io
      Docs: http://kenwheeler.github.io/slick
      Repo: http://github.com/kenwheeler/slick
    Issues: http://github.com/kenwheeler/slick/issues
  
   */
  /* global window, document, define, jQuery, setInterval, clearInterval */
  ; (function (factory) {
    'use strict'
    if (typeof define === 'function' && define.amd) {
      define(['jquery'], factory)
    } else if (typeof exports !== 'undefined') {
      module.exports = factory(require('jquery'))
    } else {
      factory(jQuery)
    }

  }(function ($) {
    'use strict'
    var Slick = window.Slick || {}

    Slick = (function () {

      var instanceUid = 0

      function Slick(element, settings) {

        var _ = this, dataSettings

        _.defaults = {
          accessibility: true,
          adaptiveHeight: false,
          appendArrows: $(element),
          appendDots: $(element),
          arrows: true,
          asNavFor: null,
          prevArrow: '<button class="slick-prev" aria-label="Previous" type="button">Previous</button>',
          nextArrow: '<button class="slick-next" aria-label="Next" type="button">Next</button>',
          autoplay: false,
          autoplaySpeed: 3000,
          centerMode: false,
          centerPadding: '50px',
          cssEase: 'ease',
          customPaging: function (slider, i) {
            return $('<button type="button" />').text(i + 1)
          },
          dots: false,
          dotsClass: 'slick-dots',
          draggable: true,
          easing: 'linear',
          edgeFriction: 0.35,
          fade: false,
          focusOnSelect: false,
          focusOnChange: false,
          infinite: true,
          initialSlide: 0,
          lazyLoad: 'ondemand',
          mobileFirst: false,
          pauseOnHover: true,
          pauseOnFocus: true,
          pauseOnDotsHover: false,
          respondTo: 'window',
          responsive: null,
          rows: 1,
          rtl: false,
          slide: '',
          slidesPerRow: 1,
          slidesToShow: 1,
          slidesToScroll: 1,
          speed: 500,
          swipe: true,
          swipeToSlide: false,
          touchMove: true,
          touchThreshold: 5,
          useCSS: true,
          useTransform: true,
          variableWidth: false,
          vertical: false,
          verticalSwiping: false,
          waitForAnimate: true,
          zIndex: 1000
        }

        _.initials = {
          animating: false,
          dragging: false,
          autoPlayTimer: null,
          currentDirection: 0,
          currentLeft: null,
          currentSlide: 0,
          direction: 1,
          $dots: null,
          listWidth: null,
          listHeight: null,
          loadIndex: 0,
          $nextArrow: null,
          $prevArrow: null,
          scrolling: false,
          slideCount: null,
          slideWidth: null,
          $slideTrack: null,
          $slides: null,
          sliding: false,
          slideOffset: 0,
          swipeLeft: null,
          swiping: false,
          $list: null,
          touchObject: {},
          transformsEnabled: false,
          unslicked: false
        }

        $.extend(_, _.initials)

        _.activeBreakpoint = null
        _.animType = null
        _.animProp = null
        _.breakpoints = []
        _.breakpointSettings = []
        _.cssTransitions = false
        _.focussed = false
        _.interrupted = false
        _.hidden = 'hidden'
        _.paused = true
        _.positionProp = null
        _.respondTo = null
        _.rowCount = 1
        _.shouldClick = true
        _.$slider = $(element)
        _.$slidesCache = null
        _.transformType = null
        _.transitionType = null
        _.visibilityChange = 'visibilitychange'
        _.windowWidth = 0
        _.windowTimer = null

        dataSettings = $(element).data('slick') || {}

        _.options = $.extend({}, _.defaults, settings, dataSettings)

        _.currentSlide = _.options.initialSlide

        _.originalSettings = _.options

        if (typeof document.mozHidden !== 'undefined') {
          _.hidden = 'mozHidden'
          _.visibilityChange = 'mozvisibilitychange'
        } else if (typeof document.webkitHidden !== 'undefined') {
          _.hidden = 'webkitHidden'
          _.visibilityChange = 'webkitvisibilitychange'
        }

        _.autoPlay = $.proxy(_.autoPlay, _)
        _.autoPlayClear = $.proxy(_.autoPlayClear, _)
        _.autoPlayIterator = $.proxy(_.autoPlayIterator, _)
        _.changeSlide = $.proxy(_.changeSlide, _)
        _.clickHandler = $.proxy(_.clickHandler, _)
        _.selectHandler = $.proxy(_.selectHandler, _)
        _.setPosition = $.proxy(_.setPosition, _)
        _.swipeHandler = $.proxy(_.swipeHandler, _)
        _.dragHandler = $.proxy(_.dragHandler, _)
        _.keyHandler = $.proxy(_.keyHandler, _)

        _.instanceUid = instanceUid++

        // A simple way to check for HTML strings
        // Strict HTML recognition (must start with <)
        // Extracted from jQuery v1.11 source
        _.htmlExpr = /^(?:\s*(<[\w\W]+>)[^>]*)$/


        _.registerBreakpoints()
        _.init(true)

      }

      return Slick

    }())

    Slick.prototype.activateADA = function () {
      var _ = this

      _.$slideTrack.find('.slick-active').attr({
        'aria-hidden': 'false'
      }).find('a, input, button, select').attr({
        'tabindex': '0'
      })

    }

    Slick.prototype.addSlide = Slick.prototype.slickAdd = function (markup, index, addBefore) {

      var _ = this

      if (typeof (index) === 'boolean') {
        addBefore = index
        index = null
      } else if (index < 0 || (index >= _.slideCount)) {
        return false
      }

      _.unload()

      if (typeof (index) === 'number') {
        if (index === 0 && _.$slides.length === 0) {
          $(markup).appendTo(_.$slideTrack)
        } else if (addBefore) {
          $(markup).insertBefore(_.$slides.eq(index))
        } else {
          $(markup).insertAfter(_.$slides.eq(index))
        }
      } else {
        if (addBefore === true) {
          $(markup).prependTo(_.$slideTrack)
        } else {
          $(markup).appendTo(_.$slideTrack)
        }
      }

      _.$slides = _.$slideTrack.children(this.options.slide)

      _.$slideTrack.children(this.options.slide).detach()

      _.$slideTrack.append(_.$slides)

      _.$slides.each(function (index, element) {
        $(element).attr('data-slick-index', index)
      })

      _.$slidesCache = _.$slides

      _.reinit()

    }

    Slick.prototype.animateHeight = function () {
      var _ = this
      // Old
      // if (_.options.slidesToShow === 1 && _.options.adaptiveHeight === true && _.options.vertical === false) {
      if (_.options.slidesToShow === 1 && _.options.adaptiveHeight === true) {
        var targetHeight = _.$slides.eq(_.currentSlide).outerHeight(true)
        _.$list.animate({
          height: targetHeight
        }, _.options.speed)
      }
    }

    Slick.prototype.animateSlide = function (targetLeft, callback) {

      var animProps = {},
        _ = this

      _.animateHeight()

      if (_.options.rtl === true && _.options.vertical === false) {
        targetLeft = -targetLeft
      }
      if (_.transformsEnabled === false) {
        if (_.options.vertical === false) {
          _.$slideTrack.animate({
            left: targetLeft
          }, _.options.speed, _.options.easing, callback)
        } else {
          _.$slideTrack.animate({
            top: targetLeft
          }, _.options.speed, _.options.easing, callback)
        }

      } else {

        if (_.cssTransitions === false) {
          if (_.options.rtl === true) {
            _.currentLeft = -(_.currentLeft)
          }
          $({
            animStart: _.currentLeft
          }).animate({
            animStart: targetLeft
          }, {
            duration: _.options.speed,
            easing: _.options.easing,
            step: function (now) {
              now = Math.ceil(now)

              if (_.options.vertical === false) {
                animProps[_.animType] = 'translate(' +
                  now + 'px, 0px)'
                _.$slideTrack.css(animProps)
              } else {
                animProps[_.animType] = 'translate(0px,' +
                  now + 'px)'
                _.$slideTrack.css(animProps)
              }
            },
            complete: function () {
              if (callback) {
                callback.call()
              }
            }
          })

        } else {

          _.applyTransition()
          targetLeft = Math.ceil(targetLeft)

          if (_.options.vertical === false) {
            animProps[_.animType] = 'translate3d(' + targetLeft + 'px, 0px, 0px)'
          } else {
            animProps[_.animType] = 'translate3d(0px,' + targetLeft + 'px, 0px)'
          }
          _.$slideTrack.css(animProps)

          if (callback) {
            setTimeout(function () {

              _.disableTransition()

              callback.call()
            }, _.options.speed)
          }

        }

      }

    }

    Slick.prototype.getNavTarget = function () {

      var _ = this,
        asNavFor = _.options.asNavFor

      if (asNavFor && asNavFor !== null) {
        asNavFor = $(asNavFor).not(_.$slider)
      }

      return asNavFor

    }

    Slick.prototype.asNavFor = function (index) {

      var _ = this,
        asNavFor = _.getNavTarget()

      if (asNavFor !== null && typeof asNavFor === 'object') {
        asNavFor.each(function () {
          var target = $(this).slick('getSlick')
          if (!target.unslicked) {
            target.slideHandler(index, true)
          }
        })
      }

    }

    Slick.prototype.applyTransition = function (slide) {

      var _ = this,
        transition = {}

      if (_.options.fade === false) {
        transition[_.transitionType] = _.transformType + ' ' + _.options.speed + 'ms ' + _.options.cssEase
      } else {
        transition[_.transitionType] = 'opacity ' + _.options.speed + 'ms ' + _.options.cssEase
      }

      if (_.options.fade === false) {
        _.$slideTrack.css(transition)
      } else {
        _.$slides.eq(slide).css(transition)
      }

    }

    Slick.prototype.autoPlay = function () {

      var _ = this

      _.autoPlayClear()

      if (_.slideCount > _.options.slidesToShow) {
        _.autoPlayTimer = setInterval(_.autoPlayIterator, _.options.autoplaySpeed)
      }

    }

    Slick.prototype.autoPlayClear = function () {

      var _ = this

      if (_.autoPlayTimer) {
        clearInterval(_.autoPlayTimer)
      }

    }

    Slick.prototype.autoPlayIterator = function () {

      var _ = this,
        slideTo = _.currentSlide + _.options.slidesToScroll

      if (!_.paused && !_.interrupted && !_.focussed) {

        if (_.options.infinite === false) {

          if (_.direction === 1 && (_.currentSlide + 1) === (_.slideCount - 1)) {
            _.direction = 0
          }

          else if (_.direction === 0) {

            slideTo = _.currentSlide - _.options.slidesToScroll

            if (_.currentSlide - 1 === 0) {
              _.direction = 1
            }

          }

        }

        _.slideHandler(slideTo)

      }

    }

    Slick.prototype.buildArrows = function () {

      var _ = this

      if (_.options.arrows === true) {

        _.$prevArrow = $(_.options.prevArrow).addClass('slick-arrow')
        _.$nextArrow = $(_.options.nextArrow).addClass('slick-arrow')

        if (_.slideCount > _.options.slidesToShow) {

          _.$prevArrow.removeClass('slick-hidden').removeAttr('aria-hidden tabindex')
          _.$nextArrow.removeClass('slick-hidden').removeAttr('aria-hidden tabindex')

          if (_.htmlExpr.test(_.options.prevArrow)) {
            _.$prevArrow.prependTo(_.options.appendArrows)
          }

          if (_.htmlExpr.test(_.options.nextArrow)) {
            _.$nextArrow.appendTo(_.options.appendArrows)
          }

          if (_.options.infinite !== true) {
            _.$prevArrow
              .addClass('slick-disabled')
              .attr('aria-disabled', 'true')
          }

        } else {

          _.$prevArrow.add(_.$nextArrow)

            .addClass('slick-hidden')
            .attr({
              'aria-disabled': 'true',
              'tabindex': '-1'
            })

        }

      }

    }

    Slick.prototype.buildDots = function () {

      var _ = this,
        i, dot

      if (_.options.dots === true) {

        _.$slider.addClass('slick-dotted')

        dot = $('<ul />').addClass(_.options.dotsClass)

        for (i = 0; i <= _.getDotCount(); i += 1) {
          dot.append($('<li />').append(_.options.customPaging.call(this, _, i)))
        }

        _.$dots = dot.appendTo(_.options.appendDots)

        _.$dots.find('li').first().addClass('slick-active')

      }

    }

    Slick.prototype.buildOut = function () {

      var _ = this

      _.$slides =
        _.$slider
          .children(_.options.slide + ':not(.slick-cloned)')
          .addClass('slick-slide')

      _.slideCount = _.$slides.length

      _.$slides.each(function (index, element) {
        $(element)
          .attr('data-slick-index', index)
          .data('originalStyling', $(element).attr('style') || '')
      })

      _.$slider.addClass('slick-slider')

      _.$slideTrack = (_.slideCount === 0) ?
        $('<div class="slick-track"/>').appendTo(_.$slider) :
        _.$slides.wrapAll('<div class="slick-track"/>').parent()

      _.$list = _.$slideTrack.wrap(
        '<div class="slick-list"/>').parent()
      _.$slideTrack.css('opacity', 0)

      if (_.options.centerMode === true || _.options.swipeToSlide === true) {
        _.options.slidesToScroll = 1
      }

      $('img[data-lazy]', _.$slider).not('[src]').addClass('slick-loading')

      _.setupInfinite()

      _.buildArrows()

      _.buildDots()

      _.updateDots()


      _.setSlideClasses(typeof _.currentSlide === 'number' ? _.currentSlide : 0)

      if (_.options.draggable === true) {
        _.$list.addClass('draggable')
      }

    }

    Slick.prototype.buildRows = function () {

      var _ = this, a, b, c, newSlides, numOfSlides, originalSlides, slidesPerSection

      newSlides = document.createDocumentFragment()
      originalSlides = _.$slider.children()

      if (_.options.rows > 1) {

        slidesPerSection = _.options.slidesPerRow * _.options.rows
        numOfSlides = Math.ceil(
          originalSlides.length / slidesPerSection
        )

        for (a = 0; a < numOfSlides; a++) {
          var slide = document.createElement('div')
          for (b = 0; b < _.options.rows; b++) {
            var row = document.createElement('div')
            for (c = 0; c < _.options.slidesPerRow; c++) {
              var target = (a * slidesPerSection + ((b * _.options.slidesPerRow) + c))
              if (originalSlides.get(target)) {
                row.appendChild(originalSlides.get(target))
              }
            }
            slide.appendChild(row)
          }
          newSlides.appendChild(slide)
        }

        _.$slider.empty().append(newSlides)
        _.$slider.children().children().children()
          .css({
            'width': (100 / _.options.slidesPerRow) + '%',
            'display': 'inline-block'
          })

      }

    }

    Slick.prototype.checkResponsive = function (initial, forceUpdate) {

      var _ = this,
        breakpoint, targetBreakpoint, respondToWidth, triggerBreakpoint = false
      var sliderWidth = _.$slider.width()
      var windowWidth = window.innerWidth || $(window).width()

      if (_.respondTo === 'window') {
        respondToWidth = windowWidth
      } else if (_.respondTo === 'slider') {
        respondToWidth = sliderWidth
      } else if (_.respondTo === 'min') {
        respondToWidth = Math.min(windowWidth, sliderWidth)
      }

      if (_.options.responsive &&
        _.options.responsive.length &&
        _.options.responsive !== null) {

        targetBreakpoint = null

        for (breakpoint in _.breakpoints) {
          if (_.breakpoints.hasOwnProperty(breakpoint)) {
            if (_.originalSettings.mobileFirst === false) {
              if (respondToWidth < _.breakpoints[breakpoint]) {
                targetBreakpoint = _.breakpoints[breakpoint]
              }
            } else {
              if (respondToWidth > _.breakpoints[breakpoint]) {
                targetBreakpoint = _.breakpoints[breakpoint]
              }
            }
          }
        }

        if (targetBreakpoint !== null) {
          if (_.activeBreakpoint !== null) {
            if (targetBreakpoint !== _.activeBreakpoint || forceUpdate) {
              _.activeBreakpoint =
                targetBreakpoint
              if (_.breakpointSettings[targetBreakpoint] === 'unslick') {
                _.unslick(targetBreakpoint)
              } else {
                _.options = $.extend({}, _.originalSettings,
                  _.breakpointSettings[
                  targetBreakpoint])
                if (initial === true) {
                  _.currentSlide = _.options.initialSlide
                }
                _.refresh(initial)
              }
              triggerBreakpoint = targetBreakpoint
            }
          } else {
            _.activeBreakpoint = targetBreakpoint
            if (_.breakpointSettings[targetBreakpoint] === 'unslick') {
              _.unslick(targetBreakpoint)
            } else {
              _.options = $.extend({}, _.originalSettings,
                _.breakpointSettings[
                targetBreakpoint])
              if (initial === true) {
                _.currentSlide = _.options.initialSlide
              }
              _.refresh(initial)
            }
            triggerBreakpoint = targetBreakpoint
          }
        } else {
          if (_.activeBreakpoint !== null) {
            _.activeBreakpoint = null
            _.options = _.originalSettings
            if (initial === true) {
              _.currentSlide = _.options.initialSlide
            }
            _.refresh(initial)
            triggerBreakpoint = targetBreakpoint
          }
        }

        // only trigger breakpoints during an actual break. not on initialize.
        if (!initial && triggerBreakpoint !== false) {
          _.$slider.trigger('breakpoint', [_, triggerBreakpoint])
        }
      }

    }

    Slick.prototype.changeSlide = function (event, dontAnimate) {

      var _ = this,
        $target = $(event.currentTarget),
        indexOffset, slideOffset, unevenOffset

      // If target is a link, prevent default action.
      if ($target.is('a')) {
        event.preventDefault()
      }

      // If target is not the <li> element (ie: a child), find the <li>.
      if (!$target.is('li')) {
        $target = $target.closest('li')
      }

      unevenOffset = (_.slideCount % _.options.slidesToScroll !== 0)
      indexOffset = unevenOffset ? 0 : (_.slideCount - _.currentSlide) % _.options.slidesToScroll

      switch (event.data.message) {

        case 'previous':
          slideOffset = indexOffset === 0 ? _.options.slidesToScroll : _.options.slidesToShow - indexOffset
          if (_.slideCount > _.options.slidesToShow) {
            _.slideHandler(_.currentSlide - slideOffset, false, dontAnimate)
          }
          break

        case 'next':
          slideOffset = indexOffset === 0 ? _.options.slidesToScroll : indexOffset
          if (_.slideCount > _.options.slidesToShow) {
            _.slideHandler(_.currentSlide + slideOffset, false, dontAnimate)
          }
          break

        case 'index':
          var index = event.data.index === 0 ? 0 :
            event.data.index || $target.index() * _.options.slidesToScroll

          _.slideHandler(_.checkNavigable(index), false, dontAnimate)
          $target.children().trigger('focus')
          break

        default:
          return
      }

    }

    Slick.prototype.checkNavigable = function (index) {

      var _ = this,
        navigables, prevNavigable

      navigables = _.getNavigableIndexes()
      prevNavigable = 0
      if (index > navigables[navigables.length - 1]) {
        index = navigables[navigables.length - 1]
      } else {
        for (var n in navigables) {
          if (index < navigables[n]) {
            index = prevNavigable
            break
          }
          prevNavigable = navigables[n]
        }
      }

      return index
    }

    Slick.prototype.cleanUpEvents = function () {

      var _ = this

      if (_.options.dots && _.$dots !== null) {

        $('li', _.$dots)
          .off('click.slick', _.changeSlide)
          .off('mouseenter.slick', $.proxy(_.interrupt, _, true))
          .off('mouseleave.slick', $.proxy(_.interrupt, _, false))

        if (_.options.accessibility === true) {
          _.$dots.off('keydown.slick', _.keyHandler)
        }
      }

      _.$slider.off('focus.slick blur.slick')

      if (_.options.arrows === true && _.slideCount > _.options.slidesToShow) {
        _.$prevArrow && _.$prevArrow.off('click.slick', _.changeSlide)
        _.$nextArrow && _.$nextArrow.off('click.slick', _.changeSlide)

        if (_.options.accessibility === true) {
          _.$prevArrow && _.$prevArrow.off('keydown.slick', _.keyHandler)
          _.$nextArrow && _.$nextArrow.off('keydown.slick', _.keyHandler)
        }
      }

      _.$list.off('touchstart.slick mousedown.slick', _.swipeHandler)
      _.$list.off('touchmove.slick mousemove.slick', _.swipeHandler)
      _.$list.off('touchend.slick mouseup.slick', _.swipeHandler)
      _.$list.off('touchcancel.slick mouseleave.slick', _.swipeHandler)

      _.$list.off('click.slick', _.clickHandler)

      $(document).off(_.visibilityChange, _.visibility)

      _.cleanUpSlideEvents()

      if (_.options.accessibility === true) {
        _.$list.off('keydown.slick', _.keyHandler)
      }

      if (_.options.focusOnSelect === true) {
        $(_.$slideTrack).children().off('click.slick', _.selectHandler)
      }

      $(window).off('orientationchange.slick.slick-' + _.instanceUid, _.orientationChange)

      $(window).off('resize.slick.slick-' + _.instanceUid, _.resize)

      $('[draggable!=true]', _.$slideTrack).off('dragstart', _.preventDefault)

      $(window).off('load.slick.slick-' + _.instanceUid, _.setPosition)

    }

    Slick.prototype.cleanUpSlideEvents = function () {

      var _ = this

      _.$list.off('mouseenter.slick', $.proxy(_.interrupt, _, true))
      _.$list.off('mouseleave.slick', $.proxy(_.interrupt, _, false))

    }

    Slick.prototype.cleanUpRows = function () {

      var _ = this, originalSlides

      if (_.options.rows > 1) {
        originalSlides = _.$slides.children().children()
        originalSlides.removeAttr('style')
        _.$slider.empty().append(originalSlides)
      }

    }

    Slick.prototype.clickHandler = function (event) {

      var _ = this

      if (_.shouldClick === false) {
        event.stopImmediatePropagation()
        event.stopPropagation()
        event.preventDefault()
      }

    }

    Slick.prototype.destroy = function (refresh) {

      var _ = this

      _.autoPlayClear()

      _.touchObject = {}

      _.cleanUpEvents()

      $('.slick-cloned', _.$slider).detach()

      if (_.$dots) {
        _.$dots.remove()
      }

      if (_.$prevArrow && _.$prevArrow.length) {

        _.$prevArrow
          .removeClass('slick-disabled slick-arrow slick-hidden')
          .removeAttr('aria-hidden aria-disabled tabindex')
          .css('display', '')

        if (_.htmlExpr.test(_.options.prevArrow)) {
          _.$prevArrow.remove()
        }
      }

      if (_.$nextArrow && _.$nextArrow.length) {

        _.$nextArrow
          .removeClass('slick-disabled slick-arrow slick-hidden')
          .removeAttr('aria-hidden aria-disabled tabindex')
          .css('display', '')

        if (_.htmlExpr.test(_.options.nextArrow)) {
          _.$nextArrow.remove()
        }
      }


      if (_.$slides) {

        _.$slides
          .removeClass('slick-slide slick-active slick-center slick-visible slick-current')
          .removeAttr('aria-hidden')
          .removeAttr('data-slick-index')
          .each(function () {
            $(this).attr('style', $(this).data('originalStyling'))
          })

        _.$slideTrack.children(this.options.slide).detach()

        _.$slideTrack.detach()

        _.$list.detach()

        _.$slider.append(_.$slides)
      }

      _.cleanUpRows()

      _.$slider.removeClass('slick-slider')
      _.$slider.removeClass('slick-initialized')
      _.$slider.removeClass('slick-dotted')

      _.unslicked = true

      if (!refresh) {
        _.$slider.trigger('destroy', [_])
      }

    }

    Slick.prototype.disableTransition = function (slide) {

      var _ = this,
        transition = {}

      transition[_.transitionType] = ''

      if (_.options.fade === false) {
        _.$slideTrack.css(transition)
      } else {
        _.$slides.eq(slide).css(transition)
      }

    }

    Slick.prototype.fadeSlide = function (slideIndex, callback) {

      var _ = this

      if (_.cssTransitions === false) {

        _.$slides.eq(slideIndex).css({
          zIndex: _.options.zIndex
        })

        _.$slides.eq(slideIndex).animate({
          opacity: 1
        }, _.options.speed, _.options.easing, callback)

      } else {

        _.applyTransition(slideIndex)

        _.$slides.eq(slideIndex).css({
          opacity: 1,
          zIndex: _.options.zIndex
        })

        if (callback) {
          setTimeout(function () {

            _.disableTransition(slideIndex)

            callback.call()
          }, _.options.speed)
        }

      }

    }

    Slick.prototype.fadeSlideOut = function (slideIndex) {

      var _ = this

      if (_.cssTransitions === false) {

        _.$slides.eq(slideIndex).animate({
          opacity: 0,
          zIndex: _.options.zIndex - 2
        }, _.options.speed, _.options.easing)

      } else {

        _.applyTransition(slideIndex)

        _.$slides.eq(slideIndex).css({
          opacity: 0,
          zIndex: _.options.zIndex - 2
        })

      }

    }

    Slick.prototype.filterSlides = Slick.prototype.slickFilter = function (filter) {

      var _ = this

      if (filter !== null) {

        _.$slidesCache = _.$slides

        _.unload()

        _.$slideTrack.children(this.options.slide).detach()

        _.$slidesCache.filter(filter).appendTo(_.$slideTrack)

        _.reinit()

      }

    }

    Slick.prototype.focusHandler = function () {

      var _ = this

      _.$slider
        .off('focus.slick blur.slick')
        .on('focus.slick blur.slick', '*', function (event) {

          event.stopImmediatePropagation()
          var $sf = $(this)

          setTimeout(function () {

            if (_.options.pauseOnFocus) {
              _.focussed = $sf.is(':focus')
              _.autoPlay()
            }

          }, 0)

        })
    }

    Slick.prototype.getCurrent = Slick.prototype.slickCurrentSlide = function () {

      var _ = this
      return _.currentSlide

    }

    Slick.prototype.getDotCount = function () {

      var _ = this

      var breakPoint = 0
      var counter = 0
      var pagerQty = 0

      if (_.options.infinite === true) {
        if (_.slideCount <= _.options.slidesToShow) {
          ++pagerQty
        } else {
          while (breakPoint < _.slideCount) {
            ++pagerQty
            breakPoint = counter + _.options.slidesToScroll
            counter += _.options.slidesToScroll <= _.options.slidesToShow ? _.options.slidesToScroll : _.options.slidesToShow
          }
        }
      } else if (_.options.centerMode === true) {
        pagerQty = _.slideCount
      } else if (!_.options.asNavFor) {
        pagerQty = 1 + Math.ceil((_.slideCount - _.options.slidesToShow) / _.options.slidesToScroll)
      } else {
        while (breakPoint < _.slideCount) {
          ++pagerQty
          breakPoint = counter + _.options.slidesToScroll
          counter += _.options.slidesToScroll <= _.options.slidesToShow ? _.options.slidesToScroll : _.options.slidesToShow
        }
      }

      return pagerQty - 1

    }

    Slick.prototype.getLeft = function (slideIndex) {

      var _ = this,
        targetLeft,
        verticalHeight,
        verticalOffset = 0,
        targetSlide,
        coef,
        slidesHeightsArray = [],
        newslidesHeightsArray = []

      for (var i = 0; i < _.$slides.length; i++) {
        slidesHeightsArray[i] = _.$slides[i].clientHeight
      }

      _.slideOffset = 0
      verticalHeight = _.$slides.first().outerHeight(true)

      if (_.options.infinite === true) {
        if (_.slideCount > _.options.slidesToShow) {
          _.slideOffset = (_.slideWidth * _.options.slidesToShow) * -1
          coef = -1

          if (_.options.vertical === true && _.options.centerMode === true) {
            if (_.options.slidesToShow === 2) {
              coef = -1.5
            } else if (_.options.slidesToShow === 1) {
              coef = -2
            }
          }

          if (_.options.vertical === true && _.options.infinite === true) {
            verticalHeight = _.$slides.last().outerHeight(true)
          }

          verticalOffset = (verticalHeight * _.options.slidesToShow) * coef
        }
        if (_.slideCount % _.options.slidesToScroll !== 0) {
          if (slideIndex + _.options.slidesToScroll > _.slideCount && _.slideCount > _.options.slidesToShow) {
            if (slideIndex > _.slideCount) {
              _.slideOffset = ((_.options.slidesToShow - (slideIndex - _.slideCount)) * _.slideWidth) * -1
              verticalOffset = ((_.options.slidesToShow - (slideIndex - _.slideCount)) * verticalHeight) * -1
            } else {
              _.slideOffset = ((_.slideCount % _.options.slidesToScroll) * _.slideWidth) * -1
              verticalOffset = ((_.slideCount % _.options.slidesToScroll) * verticalHeight) * -1
            }
          }
        }
      } else {
        if (slideIndex + _.options.slidesToShow > _.slideCount) {
          _.slideOffset = ((slideIndex + _.options.slidesToShow) - _.slideCount) * _.slideWidth
          verticalOffset = ((slideIndex + _.options.slidesToShow) - _.slideCount) * verticalHeight
        }
      }

      if (_.slideCount <= _.options.slidesToShow) {
        _.slideOffset = 0
        verticalOffset = 0
      }

      if (_.options.centerMode === true && _.slideCount <= _.options.slidesToShow) {
        _.slideOffset = ((_.slideWidth * Math.floor(_.options.slidesToShow)) / 2) - ((_.slideWidth * _.slideCount) / 2)
      } else if (_.options.centerMode === true && _.options.infinite === true) {
        _.slideOffset += _.slideWidth * Math.floor(_.options.slidesToShow / 2) - _.slideWidth
      } else if (_.options.centerMode === true) {
        _.slideOffset = 0
        _.slideOffset += _.slideWidth * Math.floor(_.options.slidesToShow / 2)
      }

      if (_.options.vertical === false) {
        targetLeft = ((slideIndex * _.slideWidth) * -1) + _.slideOffset
      } else {
        newslidesHeightsArray = slidesHeightsArray.slice(0, slideIndex)

        var total = newslidesHeightsArray.length !== 0 ? newslidesHeightsArray.reduce(function (a, b) {
          return a + b
        }) : 0

        targetLeft = (total * -1) + verticalOffset
      }

      if (_.options.variableWidth === true) {

        if (_.slideCount <= _.options.slidesToShow || _.options.infinite === false) {
          targetSlide = _.$slideTrack.children('.slick-slide').eq(slideIndex)
        } else {
          targetSlide = _.$slideTrack.children('.slick-slide').eq(slideIndex + _.options.slidesToShow)
        }

        if (_.options.rtl === true) {
          if (targetSlide[0]) {
            targetLeft = (_.$slideTrack.width() - targetSlide[0].offsetLeft - targetSlide.width()) * -1
          } else {
            targetLeft = 0
          }
        } else {
          targetLeft = targetSlide[0] ? targetSlide[0].offsetLeft * -1 : 0
        }

        if (_.options.centerMode === true) {
          if (_.slideCount <= _.options.slidesToShow || _.options.infinite === false) {
            targetSlide = _.$slideTrack.children('.slick-slide').eq(slideIndex)
          } else {
            targetSlide = _.$slideTrack.children('.slick-slide').eq(slideIndex + _.options.slidesToShow + 1)
          }

          if (_.options.rtl === true) {
            if (targetSlide[0]) {
              targetLeft = (_.$slideTrack.width() - targetSlide[0].offsetLeft - targetSlide.width()) * -1
            } else {
              targetLeft = 0
            }
          } else {
            targetLeft = targetSlide[0] ? targetSlide[0].offsetLeft * -1 : 0
          }

          targetLeft += (_.$list.width() - targetSlide.outerWidth()) / 2
        }
      }

      return targetLeft

    }

    Slick.prototype.getOption = Slick.prototype.slickGetOption = function (option) {

      var _ = this

      return _.options[option]

    }

    Slick.prototype.getNavigableIndexes = function () {

      var _ = this,
        breakPoint = 0,
        counter = 0,
        indexes = [],
        max

      if (_.options.infinite === false) {
        max = _.slideCount
      } else {
        breakPoint = _.options.slidesToScroll * -1
        counter = _.options.slidesToScroll * -1
        max = _.slideCount * 2
      }

      while (breakPoint < max) {
        indexes.push(breakPoint)
        breakPoint = counter + _.options.slidesToScroll
        counter += _.options.slidesToScroll <= _.options.slidesToShow ? _.options.slidesToScroll : _.options.slidesToShow
      }

      return indexes

    }

    Slick.prototype.getSlick = function () {

      return this

    }

    Slick.prototype.getSlideCount = function () {

      var _ = this,
        slidesTraversed, swipedSlide, centerOffset

      centerOffset = _.options.centerMode === true ? _.slideWidth * Math.floor(_.options.slidesToShow / 2) : 0

      if (_.options.swipeToSlide === true) {
        _.$slideTrack.find('.slick-slide').each(function (index, slide) {
          if (slide.offsetLeft - centerOffset + ($(slide).outerWidth() / 2) > (_.swipeLeft * -1)) {
            swipedSlide = slide
            return false
          }
        })

        slidesTraversed = Math.abs($(swipedSlide).attr('data-slick-index') - _.currentSlide) || 1

        return slidesTraversed

      } else {
        return _.options.slidesToScroll
      }

    }

    Slick.prototype.goTo = Slick.prototype.slickGoTo = function (slide, dontAnimate) {

      var _ = this

      _.changeSlide({
        data: {
          message: 'index',
          index: parseInt(slide)
        }
      }, dontAnimate)

    }

    Slick.prototype.init = function (creation) {

      var _ = this

      if (!$(_.$slider).hasClass('slick-initialized')) {

        $(_.$slider).addClass('slick-initialized')

        _.buildRows()
        _.buildOut()
        _.setProps()
        _.startLoad()
        _.loadSlider()
        _.initializeEvents()
        _.updateArrows()
        _.updateDots()
        _.checkResponsive(true)
        _.focusHandler()

      }

      if (creation) {
        _.$slider.trigger('init', [_])
      }

      if (_.options.accessibility === true) {
        _.initADA()
      }

      if (_.options.autoplay) {

        _.paused = false
        _.autoPlay()

      }

    }

    Slick.prototype.initADA = function () {
      var _ = this,
        numDotGroups = Math.ceil(_.slideCount / _.options.slidesToShow),
        tabControlIndexes = _.getNavigableIndexes().filter(function (val) {
          return (val >= 0) && (val < _.slideCount)
        })

      _.$slides.add(_.$slideTrack.find('.slick-cloned')).attr({
        'aria-hidden': 'true',
        'tabindex': '-1'
      }).find('a, input, button, select').attr({
        'tabindex': '-1'
      })

      if (_.$dots !== null) {
        _.$slides.not(_.$slideTrack.find('.slick-cloned')).each(function (i) {
          var slideControlIndex = tabControlIndexes.indexOf(i)

          $(this).attr({
            'role': 'tabpanel',
            'id': 'slick-slide' + _.instanceUid + i,
            'tabindex': -1
          })

          if (slideControlIndex !== -1) {
            $(this).attr({
              'aria-describedby': 'slick-slide-control' + _.instanceUid + slideControlIndex
            })
          }
        })

        _.$dots.attr('role', 'tablist').find('li').each(function (i) {
          var mappedSlideIndex = tabControlIndexes[i]

          $(this).attr({
            'role': 'presentation'
          })

          $(this).find('button').first().attr({
            'role': 'tab',
            'id': 'slick-slide-control' + _.instanceUid + i,
            'aria-controls': 'slick-slide' + _.instanceUid + mappedSlideIndex,
            'aria-label': (i + 1) + ' of ' + numDotGroups,
            'aria-selected': null,
            'tabindex': '-1'
          })

        }).eq(_.currentSlide).find('button').attr({
          'aria-selected': 'true',
          'tabindex': '0'
        }).end()
      }

      for (var i = _.currentSlide, max = i + _.options.slidesToShow; i < max; i++) {
        _.$slides.eq(i).attr('tabindex', 0)
      }

      _.activateADA()

    }

    Slick.prototype.initArrowEvents = function () {

      var _ = this

      if (_.options.arrows === true && _.slideCount > _.options.slidesToShow) {
        _.$prevArrow
          .off('click.slick')
          .on('click.slick', {
            message: 'previous'
          }, _.changeSlide)
        _.$nextArrow
          .off('click.slick')
          .on('click.slick', {
            message: 'next'
          }, _.changeSlide)

        if (_.options.accessibility === true) {
          _.$prevArrow.on('keydown.slick', _.keyHandler)
          _.$nextArrow.on('keydown.slick', _.keyHandler)
        }
      }

    }

    Slick.prototype.initDotEvents = function () {

      var _ = this

      if (_.options.dots === true) {
        $('li', _.$dots).on('click.slick', {
          message: 'index'
        }, _.changeSlide)

        if (_.options.accessibility === true) {
          _.$dots.on('keydown.slick', _.keyHandler)
        }
      }

      if (_.options.dots === true && _.options.pauseOnDotsHover === true) {

        $('li', _.$dots)
          .on('mouseenter.slick', $.proxy(_.interrupt, _, true))
          .on('mouseleave.slick', $.proxy(_.interrupt, _, false))

      }

    }

    Slick.prototype.initSlideEvents = function () {

      var _ = this

      if (_.options.pauseOnHover) {

        _.$list.on('mouseenter.slick', $.proxy(_.interrupt, _, true))
        _.$list.on('mouseleave.slick', $.proxy(_.interrupt, _, false))

      }

    }

    Slick.prototype.initializeEvents = function () {

      var _ = this

      _.initArrowEvents()

      _.initDotEvents()
      _.initSlideEvents()

      _.$list.on('touchstart.slick mousedown.slick', {
        action: 'start'
      }, _.swipeHandler)
      _.$list.on('touchmove.slick mousemove.slick', {
        action: 'move'
      }, _.swipeHandler)
      _.$list.on('touchend.slick mouseup.slick', {
        action: 'end'
      }, _.swipeHandler)
      _.$list.on('touchcancel.slick mouseleave.slick', {
        action: 'end'
      }, _.swipeHandler)

      _.$list.on('click.slick', _.clickHandler)

      $(document).on(_.visibilityChange, $.proxy(_.visibility, _))

      if (_.options.accessibility === true) {
        _.$list.on('keydown.slick', _.keyHandler)
      }

      if (_.options.focusOnSelect === true) {
        $(_.$slideTrack).children().on('click.slick', _.selectHandler)
      }

      $(window).on('orientationchange.slick.slick-' + _.instanceUid, $.proxy(_.orientationChange, _))

      $(window).on('resize.slick.slick-' + _.instanceUid, $.proxy(_.resize, _))

      $('[draggable!=true]', _.$slideTrack).on('dragstart', _.preventDefault)

      $(window).on('load.slick.slick-' + _.instanceUid, _.setPosition)
      $(_.setPosition)

    }

    Slick.prototype.initUI = function () {

      var _ = this

      if (_.options.arrows === true && _.slideCount > _.options.slidesToShow) {

        _.$prevArrow.show()
        _.$nextArrow.show()

      }

      if (_.options.dots === true && _.slideCount > _.options.slidesToShow) {

        _.$dots.show()

      }

    }

    Slick.prototype.keyHandler = function (event) {

      var _ = this
      //Dont slide if the cursor is inside the form fields and arrow keys are pressed
      if (!event.target.tagName.match('TEXTAREA|INPUT|SELECT')) {
        if (event.keyCode === 37 && _.options.accessibility === true) {
          _.changeSlide({
            data: {
              message: _.options.rtl === true ? 'next' : 'previous'
            }
          })
        } else if (event.keyCode === 39 && _.options.accessibility === true) {
          _.changeSlide({
            data: {
              message: _.options.rtl === true ? 'previous' : 'next'
            }
          })
        }
      }

    }

    Slick.prototype.lazyLoad = function () {

      var _ = this,
        loadRange, cloneRange, rangeStart, rangeEnd

      function loadImages(imagesScope) {

        $('img[data-lazy]', imagesScope).each(function () {

          var image = $(this),
            imageSource = $(this).attr('data-lazy'),
            imageSrcSet = $(this).attr('data-srcset'),
            imageSizes = $(this).attr('data-sizes') || _.$slider.attr('data-sizes'),
            imageToLoad = document.createElement('img')

          imageToLoad.onload = function () {

            image
              .animate({opacity: 0}, 100, function () {

                if (imageSrcSet) {
                  image
                    .attr('srcset', imageSrcSet)

                  if (imageSizes) {
                    image
                      .attr('sizes', imageSizes)
                  }
                }

                image
                  .attr('src', imageSource)
                  .animate({opacity: 1}, 200, function () {
                    image
                      .removeAttr('data-lazy data-srcset data-sizes')
                      .removeClass('slick-loading')
                  })
                _.$slider.trigger('lazyLoaded', [_, image, imageSource])
              })

          }

          imageToLoad.onerror = function () {

            image
              .removeAttr('data-lazy')
              .removeClass('slick-loading')
              .addClass('slick-lazyload-error')

            _.$slider.trigger('lazyLoadError', [_, image, imageSource])

          }

          imageToLoad.src = imageSource

        })

      }

      if (_.options.centerMode === true) {
        if (_.options.infinite === true) {
          rangeStart = _.currentSlide + (_.options.slidesToShow / 2 + 1)
          rangeEnd = rangeStart + _.options.slidesToShow + 2
        } else {
          rangeStart = Math.max(0, _.currentSlide - (_.options.slidesToShow / 2 + 1))
          rangeEnd = 2 + (_.options.slidesToShow / 2 + 1) + _.currentSlide
        }
      } else {
        rangeStart = _.options.infinite ? _.options.slidesToShow + _.currentSlide : _.currentSlide
        rangeEnd = Math.ceil(rangeStart + _.options.slidesToShow)
        if (_.options.fade === true) {
          if (rangeStart > 0) rangeStart--
          if (rangeEnd <= _.slideCount) rangeEnd++
        }
      }

      loadRange = _.$slider.find('.slick-slide').slice(rangeStart, rangeEnd)

      if (_.options.lazyLoad === 'anticipated') {
        var prevSlide = rangeStart - 1,
          nextSlide = rangeEnd,
          $slides = _.$slider.find('.slick-slide')

        for (var i = 0; i < _.options.slidesToScroll; i++) {
          if (prevSlide < 0) prevSlide = _.slideCount - 1
          loadRange = loadRange.add($slides.eq(prevSlide))
          loadRange = loadRange.add($slides.eq(nextSlide))
          prevSlide--
          nextSlide++
        }
      }

      loadImages(loadRange)

      if (_.slideCount <= _.options.slidesToShow) {
        cloneRange = _.$slider.find('.slick-slide')
        loadImages(cloneRange)
      } else
        if (_.currentSlide >= _.slideCount - _.options.slidesToShow) {
          cloneRange = _.$slider.find('.slick-cloned').slice(0, _.options.slidesToShow)
          loadImages(cloneRange)
        } else if (_.currentSlide === 0) {
          cloneRange = _.$slider.find('.slick-cloned').slice(_.options.slidesToShow * -1)
          loadImages(cloneRange)
        }

    }

    Slick.prototype.loadSlider = function () {

      var _ = this

      _.setPosition()

      _.$slideTrack.css({
        opacity: 1
      })

      _.$slider.removeClass('slick-loading')

      _.initUI()

      if (_.options.lazyLoad === 'progressive') {
        _.progressiveLazyLoad()
      }

    }

    Slick.prototype.next = Slick.prototype.slickNext = function () {

      var _ = this

      _.changeSlide({
        data: {
          message: 'next'
        }
      })

    }

    Slick.prototype.orientationChange = function () {

      var _ = this

      _.checkResponsive()
      _.setPosition()

    }

    Slick.prototype.pause = Slick.prototype.slickPause = function () {

      var _ = this

      _.autoPlayClear()
      _.paused = true

    }

    Slick.prototype.play = Slick.prototype.slickPlay = function () {

      var _ = this

      _.autoPlay()
      _.options.autoplay = true
      _.paused = false
      _.focussed = false
      _.interrupted = false

    }

    Slick.prototype.postSlide = function (index) {

      var _ = this

      if (!_.unslicked) {

        _.$slider.trigger('afterChange', [_, index])

        _.animating = false

        if (_.slideCount > _.options.slidesToShow) {
          _.setPosition()
        }

        _.swipeLeft = null

        if (_.options.autoplay) {
          _.autoPlay()
        }

        if (_.options.accessibility === true) {
          _.initADA()

          if (_.options.focusOnChange) {
            var $currentSlide = $(_.$slides.get(_.currentSlide))
            $currentSlide.attr('tabindex', 0).focus()
          }
        }

      }

    }

    Slick.prototype.prev = Slick.prototype.slickPrev = function () {

      var _ = this

      _.changeSlide({
        data: {
          message: 'previous'
        }
      })

    }

    Slick.prototype.preventDefault = function (event) {

      event.preventDefault()

    }

    Slick.prototype.progressiveLazyLoad = function (tryCount) {

      tryCount = tryCount || 1

      var _ = this,
        $imgsToLoad = $('img[data-lazy]', _.$slider),
        image,
        imageSource,
        imageSrcSet,
        imageSizes,
        imageToLoad

      if ($imgsToLoad.length) {

        image = $imgsToLoad.first()
        imageSource = image.attr('data-lazy')
        imageSrcSet = image.attr('data-srcset')
        imageSizes = image.attr('data-sizes') || _.$slider.attr('data-sizes')
        imageToLoad = document.createElement('img')

        imageToLoad.onload = function () {

          if (imageSrcSet) {
            image
              .attr('srcset', imageSrcSet)

            if (imageSizes) {
              image
                .attr('sizes', imageSizes)
            }
          }

          image
            .attr('src', imageSource)
            .removeAttr('data-lazy data-srcset data-sizes')
            .removeClass('slick-loading')

          if (_.options.adaptiveHeight === true) {
            _.setPosition()
          }

          _.$slider.trigger('lazyLoaded', [_, image, imageSource])
          _.progressiveLazyLoad()

        }

        imageToLoad.onerror = function () {

          if (tryCount < 3) {

            /**
             * try to load the image 3 times,
             * leave a slight delay so we don't get
             * servers blocking the request.
             */
            setTimeout(function () {
              _.progressiveLazyLoad(tryCount + 1)
            }, 500)

          } else {

            image
              .removeAttr('data-lazy')
              .removeClass('slick-loading')
              .addClass('slick-lazyload-error')

            _.$slider.trigger('lazyLoadError', [_, image, imageSource])

            _.progressiveLazyLoad()

          }

        }

        imageToLoad.src = imageSource

      } else {

        _.$slider.trigger('allImagesLoaded', [_])

      }

    }

    Slick.prototype.refresh = function (initializing) {

      var _ = this, currentSlide, lastVisibleIndex

      lastVisibleIndex = _.slideCount - _.options.slidesToShow

      // in non-infinite sliders, we don't want to go past the
      // last visible index.
      if (!_.options.infinite && (_.currentSlide > lastVisibleIndex)) {
        _.currentSlide = lastVisibleIndex
      }

      // if less slides than to show, go to start.
      if (_.slideCount <= _.options.slidesToShow) {
        _.currentSlide = 0

      }

      currentSlide = _.currentSlide

      _.destroy(true)

      $.extend(_, _.initials, {currentSlide: currentSlide})

      _.init()

      if (!initializing) {

        _.changeSlide({
          data: {
            message: 'index',
            index: currentSlide
          }
        }, false)

      }

    }

    Slick.prototype.registerBreakpoints = function () {

      var _ = this, breakpoint, currentBreakpoint, l,
        responsiveSettings = _.options.responsive || null

      if ($.type(responsiveSettings) === 'array' && responsiveSettings.length) {

        _.respondTo = _.options.respondTo || 'window'

        for (breakpoint in responsiveSettings) {

          l = _.breakpoints.length - 1

          if (responsiveSettings.hasOwnProperty(breakpoint)) {
            currentBreakpoint = responsiveSettings[breakpoint].breakpoint

            // loop through the breakpoints and cut out any existing
            // ones with the same breakpoint number, we don't want dupes.
            while (l >= 0) {
              if (_.breakpoints[l] && _.breakpoints[l] === currentBreakpoint) {
                _.breakpoints.splice(l, 1)
              }
              l--
            }

            _.breakpoints.push(currentBreakpoint)
            _.breakpointSettings[currentBreakpoint] = responsiveSettings[breakpoint].settings

          }

        }

        _.breakpoints.sort(function (a, b) {
          return (_.options.mobileFirst) ? a - b : b - a
        })

      }

    }

    Slick.prototype.reinit = function () {

      var _ = this

      _.$slides =
        _.$slideTrack
          .children(_.options.slide)
          .addClass('slick-slide')

      _.slideCount = _.$slides.length

      if (_.currentSlide >= _.slideCount && _.currentSlide !== 0) {
        _.currentSlide = _.currentSlide - _.options.slidesToScroll
      }

      if (_.slideCount <= _.options.slidesToShow) {
        _.currentSlide = 0
      }

      _.registerBreakpoints()

      _.setProps()
      _.setupInfinite()
      _.buildArrows()
      _.updateArrows()
      _.initArrowEvents()
      _.buildDots()
      _.updateDots()
      _.initDotEvents()
      _.cleanUpSlideEvents()
      _.initSlideEvents()

      _.checkResponsive(false, true)

      if (_.options.focusOnSelect === true) {
        $(_.$slideTrack).children().on('click.slick', _.selectHandler)
      }

      _.setSlideClasses(typeof _.currentSlide === 'number' ? _.currentSlide : 0)

      _.setPosition()
      _.focusHandler()

      _.paused = !_.options.autoplay
      _.autoPlay()

      _.$slider.trigger('reInit', [_])

    }

    Slick.prototype.resize = function () {

      var _ = this

      if ($(window).width() !== _.windowWidth) {
        clearTimeout(_.windowDelay)
        _.windowDelay = window.setTimeout(function () {
          _.windowWidth = $(window).width()
          _.checkResponsive()
          if (!_.unslicked) {_.setPosition()}
        }, 50)
      }
    }

    Slick.prototype.removeSlide = Slick.prototype.slickRemove = function (index, removeBefore, removeAll) {

      var _ = this

      if (typeof (index) === 'boolean') {
        removeBefore = index
        index = removeBefore === true ? 0 : _.slideCount - 1
      } else {
        index = removeBefore === true ? --index : index
      }

      if (_.slideCount < 1 || index < 0 || index > _.slideCount - 1) {
        return false
      }

      _.unload()

      if (removeAll === true) {
        _.$slideTrack.children().remove()
      } else {
        _.$slideTrack.children(this.options.slide).eq(index).remove()
      }

      _.$slides = _.$slideTrack.children(this.options.slide)

      _.$slideTrack.children(this.options.slide).detach()

      _.$slideTrack.append(_.$slides)

      _.$slidesCache = _.$slides

      _.reinit()

    }

    Slick.prototype.setCSS = function (position) {

      var _ = this,
        positionProps = {},
        x, y

      if (_.options.rtl === true) {
        position = -position
      }
      x = _.positionProp == 'left' ? Math.ceil(position) + 'px' : '0px'
      y = _.positionProp == 'top' ? Math.ceil(position) + 'px' : '0px'

      positionProps[_.positionProp] = position

      if (_.transformsEnabled === false) {
        _.$slideTrack.css(positionProps)
      } else {
        positionProps = {}
        if (_.cssTransitions === false) {
          positionProps[_.animType] = 'translate(' + x + ', ' + y + ')'
          _.$slideTrack.css(positionProps)
        } else {
          positionProps[_.animType] = 'translate3d(' + x + ', ' + y + ', 0px)'
          _.$slideTrack.css(positionProps)
        }
      }

    }

    Slick.prototype.setDimensions = function () {

      var _ = this

      if (_.options.vertical === false) {
        if (_.options.centerMode === true) {
          _.$list.css({
            padding: ('0px ' + _.options.centerPadding)
          })
        }
      } else {
        _.$list.height(_.$slides.first().outerHeight(true) * _.options.slidesToShow)
        if (_.options.centerMode === true) {
          _.$list.css({
            padding: (_.options.centerPadding + ' 0px')
          })
        }
      }

      _.listWidth = _.$list.width()
      _.listHeight = _.$list.height()


      if (_.options.vertical === false && _.options.variableWidth === false) {
        _.slideWidth = Math.ceil(_.listWidth / _.options.slidesToShow)
        _.$slideTrack.width(Math.ceil((_.slideWidth * _.$slideTrack.children('.slick-slide').length)))

      } else if (_.options.variableWidth === true) {
        _.$slideTrack.width(5000 * _.slideCount)
      } else {
        _.slideWidth = Math.ceil(_.listWidth)
        _.$slideTrack.height(Math.ceil((_.$slides.first().outerHeight(true) * _.$slideTrack.children('.slick-slide').length)))
      }

      var offset = _.$slides.first().outerWidth(true) - _.$slides.first().width()
      if (_.options.variableWidth === false) _.$slideTrack.children('.slick-slide').width(_.slideWidth - offset)

    }

    Slick.prototype.setFade = function () {

      var _ = this,
        targetLeft

      _.$slides.each(function (index, element) {
        targetLeft = (_.slideWidth * index) * -1
        if (_.options.rtl === true) {
          $(element).css({
            position: 'relative',
            right: targetLeft,
            top: 0,
            zIndex: _.options.zIndex - 2,
            opacity: 0
          })
        } else {
          $(element).css({
            position: 'relative',
            left: targetLeft,
            top: 0,
            zIndex: _.options.zIndex - 2,
            opacity: 0
          })
        }
      })

      _.$slides.eq(_.currentSlide).css({
        zIndex: _.options.zIndex - 1,
        opacity: 1
      })

    }

    Slick.prototype.setHeight = function () {

      var _ = this

      if (_.options.slidesToShow === 1 && _.options.adaptiveHeight === true) {
        var targetHeight = _.$slides.eq(_.currentSlide).outerHeight(true)
        _.$list.css('height', targetHeight)
      }

    }

    Slick.prototype.setOption =
      Slick.prototype.slickSetOption = function () {

        /**
         * accepts arguments in format of:
         *
         *  - for changing a single option's value:
         *     .slick("setOption", option, value, refresh )
         *
         *  - for changing a set of responsive options:
         *     .slick("setOption", 'responsive', [{}, ...], refresh )
         *
         *  - for updating multiple values at once (not responsive)
         *     .slick("setOption", { 'option': value, ... }, refresh )
         */

        var _ = this, l, item, option, value, refresh = false, type

        if ($.type(arguments[0]) === 'object') {

          option = arguments[0]
          refresh = arguments[1]
          type = 'multiple'

        } else if ($.type(arguments[0]) === 'string') {

          option = arguments[0]
          value = arguments[1]
          refresh = arguments[2]

          if (arguments[0] === 'responsive' && $.type(arguments[1]) === 'array') {

            type = 'responsive'

          } else if (typeof arguments[1] !== 'undefined') {

            type = 'single'

          }

        }

        if (type === 'single') {

          _.options[option] = value


        } else if (type === 'multiple') {

          $.each(option, function (opt, val) {

            _.options[opt] = val

          })


        } else if (type === 'responsive') {

          for (item in value) {

            if ($.type(_.options.responsive) !== 'array') {

              _.options.responsive = [value[item]]

            } else {

              l = _.options.responsive.length - 1

              // loop through the responsive object and splice out duplicates.
              while (l >= 0) {

                if (_.options.responsive[l].breakpoint === value[item].breakpoint) {

                  _.options.responsive.splice(l, 1)

                }

                l--

              }

              _.options.responsive.push(value[item])

            }

          }

        }

        if (refresh) {

          _.unload()
          _.reinit()

        }

      }

    Slick.prototype.setPosition = function () {

      var _ = this

      _.setDimensions()

      _.setHeight()

      if (_.options.fade === false) {
        _.setCSS(_.getLeft(_.currentSlide))
      } else {
        _.setFade()
      }

      _.$slider.trigger('setPosition', [_])

    }

    Slick.prototype.setProps = function () {

      var _ = this,
        bodyStyle = document.body.style

      _.positionProp = _.options.vertical === true ? 'top' : 'left'

      if (_.positionProp === 'top') {
        _.$slider.addClass('slick-vertical')
      } else {
        _.$slider.removeClass('slick-vertical')
      }

      if (bodyStyle.WebkitTransition !== undefined ||
        bodyStyle.MozTransition !== undefined ||
        bodyStyle.msTransition !== undefined) {
        if (_.options.useCSS === true) {
          _.cssTransitions = true
        }
      }

      if (_.options.fade) {
        if (typeof _.options.zIndex === 'number') {
          if (_.options.zIndex < 3) {
            _.options.zIndex = 3
          }
        } else {
          _.options.zIndex = _.defaults.zIndex
        }
      }

      if (bodyStyle.OTransform !== undefined) {
        _.animType = 'OTransform'
        _.transformType = '-o-transform'
        _.transitionType = 'OTransition'
        if (bodyStyle.perspectiveProperty === undefined && bodyStyle.webkitPerspective === undefined) _.animType = false
      }
      if (bodyStyle.MozTransform !== undefined) {
        _.animType = 'MozTransform'
        _.transformType = '-moz-transform'
        _.transitionType = 'MozTransition'
        if (bodyStyle.perspectiveProperty === undefined && bodyStyle.MozPerspective === undefined) _.animType = false
      }
      if (bodyStyle.webkitTransform !== undefined) {
        _.animType = 'webkitTransform'
        _.transformType = '-webkit-transform'
        _.transitionType = 'webkitTransition'
        if (bodyStyle.perspectiveProperty === undefined && bodyStyle.webkitPerspective === undefined) _.animType = false
      }
      if (bodyStyle.msTransform !== undefined) {
        _.animType = 'msTransform'
        _.transformType = '-ms-transform'
        _.transitionType = 'msTransition'
        if (bodyStyle.msTransform === undefined) _.animType = false
      }
      if (bodyStyle.transform !== undefined && _.animType !== false) {
        _.animType = 'transform'
        _.transformType = 'transform'
        _.transitionType = 'transition'
      }
      _.transformsEnabled = _.options.useTransform && (_.animType !== null && _.animType !== false)
    }


    Slick.prototype.setSlideClasses = function (index) {

      var _ = this,
        centerOffset, allSlides, indexOffset, remainder

      allSlides = _.$slider
        .find('.slick-slide')
        .removeClass('slick-active slick-center slick-current')
        .attr('aria-hidden', 'true')

      _.$slides
        .eq(index)
        .addClass('slick-current')

      if (_.options.centerMode === true) {

        var evenCoef = _.options.slidesToShow % 2 === 0 ? 1 : 0

        centerOffset = Math.floor(_.options.slidesToShow / 2)

        if (_.options.infinite === true) {

          if (index >= centerOffset && index <= (_.slideCount - 1) - centerOffset) {
            _.$slides
              .slice(index - centerOffset + evenCoef, index + centerOffset + 1)
              .addClass('slick-active')
              .attr('aria-hidden', 'false')

          } else {

            indexOffset = _.options.slidesToShow + index
            allSlides
              .slice(indexOffset - centerOffset + 1 + evenCoef, indexOffset + centerOffset + 2)
              .addClass('slick-active')
              .attr('aria-hidden', 'false')

          }

          if (index === 0) {

            allSlides
              .eq(allSlides.length - 1 - _.options.slidesToShow)
              .addClass('slick-center')

          } else if (index === _.slideCount - 1) {

            allSlides
              .eq(_.options.slidesToShow)
              .addClass('slick-center')

          }

        }

        _.$slides
          .eq(index)
          .addClass('slick-center')

      } else {

        if (index >= 0 && index <= (_.slideCount - _.options.slidesToShow)) {

          _.$slides
            .slice(index, index + _.options.slidesToShow)
            .addClass('slick-active')
            .attr('aria-hidden', 'false')

        } else if (allSlides.length <= _.options.slidesToShow) {

          allSlides
            .addClass('slick-active')
            .attr('aria-hidden', 'false')

        } else {

          remainder = _.slideCount % _.options.slidesToShow
          indexOffset = _.options.infinite === true ? _.options.slidesToShow + index : index

          if (_.options.slidesToShow == _.options.slidesToScroll && (_.slideCount - index) < _.options.slidesToShow) {

            allSlides
              .slice(indexOffset - (_.options.slidesToShow - remainder), indexOffset + remainder)
              .addClass('slick-active')
              .attr('aria-hidden', 'false')

          } else {

            allSlides
              .slice(indexOffset, indexOffset + _.options.slidesToShow)
              .addClass('slick-active')
              .attr('aria-hidden', 'false')

          }

        }

      }

      if (_.options.lazyLoad === 'ondemand' || _.options.lazyLoad === 'anticipated') {
        _.lazyLoad()
      }
    }

    Slick.prototype.setupInfinite = function () {

      var _ = this,
        i, slideIndex, infiniteCount

      if (_.options.fade === true) {
        _.options.centerMode = false
      }

      if (_.options.infinite === true && _.options.fade === false) {

        slideIndex = null

        if (_.slideCount > _.options.slidesToShow) {

          if (_.options.centerMode === true) {
            infiniteCount = _.options.slidesToShow + 1
          } else {
            infiniteCount = _.options.slidesToShow
          }

          for (i = _.slideCount; i > (_.slideCount -
            infiniteCount); i -= 1) {
            slideIndex = i - 1
            $(_.$slides[slideIndex]).clone(true).attr('id', '')
              .attr('data-slick-index', slideIndex - _.slideCount)
              .prependTo(_.$slideTrack).addClass('slick-cloned')
          }
          for (i = 0; i < infiniteCount + _.slideCount; i += 1) {
            slideIndex = i
            $(_.$slides[slideIndex]).clone(true).attr('id', '')
              .attr('data-slick-index', slideIndex + _.slideCount)
              .appendTo(_.$slideTrack).addClass('slick-cloned')
          }
          _.$slideTrack.find('.slick-cloned').find('[id]').each(function () {
            $(this).attr('id', '')
          })

        }

      }

    }

    Slick.prototype.interrupt = function (toggle) {

      var _ = this

      if (!toggle) {
        _.autoPlay()
      }
      _.interrupted = toggle

    }

    Slick.prototype.selectHandler = function (event) {

      var _ = this

      var targetElement =
        $(event.target).is('.slick-slide') ?
          $(event.target) :
          $(event.target).parents('.slick-slide')

      var index = parseInt(targetElement.attr('data-slick-index'))

      if (!index) index = 0

      if (_.slideCount <= _.options.slidesToShow) {

        _.slideHandler(index, false, true)
        return

      }

      _.slideHandler(index)

    }

    Slick.prototype.slideHandler = function (index, sync, dontAnimate) {

      var targetSlide, animSlide, oldSlide, slideLeft, targetLeft = null,
        _ = this, navTarget

      sync = sync || false

      if (_.animating === true && _.options.waitForAnimate === true) {
        return
      }

      if (_.options.fade === true && _.currentSlide === index) {
        return
      }

      if (sync === false) {
        _.asNavFor(index)
      }

      targetSlide = index
      targetLeft = _.getLeft(targetSlide)
      slideLeft = _.getLeft(_.currentSlide)

      _.currentLeft = _.swipeLeft === null ? slideLeft : _.swipeLeft

      if (_.options.infinite === false && _.options.centerMode === false && (index < 0 || index > _.getDotCount() * _.options.slidesToScroll)) {

        if (_.options.fade === false) {
          targetSlide = _.currentSlide
          if (dontAnimate !== true) {
            _.animateSlide(slideLeft, function () {
              _.postSlide(targetSlide)
            })
          } else {
            _.postSlide(targetSlide)
          }
        }
        return
      } else if (_.options.infinite === false && _.options.centerMode === true && (index < 0 || index > (_.slideCount - _.options.slidesToScroll))) {

        if (_.options.fade === false) {
          targetSlide = _.currentSlide
          if (dontAnimate !== true) {
            _.animateSlide(slideLeft, function () {
              _.postSlide(targetSlide)
            })
          } else {
            _.postSlide(targetSlide)
          }
        }
        return
      }

      if (_.options.autoplay) {
        clearInterval(_.autoPlayTimer)
      }

      if (targetSlide < 0) {
        if (_.slideCount % _.options.slidesToScroll !== 0) {
          animSlide = _.slideCount - (_.slideCount % _.options.slidesToScroll)
        } else {
          animSlide = _.slideCount + targetSlide
        }
      } else if (targetSlide >= _.slideCount) {
        if (_.slideCount % _.options.slidesToScroll !== 0) {
          animSlide = 0
        } else {
          animSlide = targetSlide - _.slideCount
        }
      } else {
        animSlide = targetSlide
      }

      _.animating = true

      _.$slider.trigger('beforeChange', [_, _.currentSlide, animSlide])

      oldSlide = _.currentSlide
      _.currentSlide = animSlide

      _.setSlideClasses(_.currentSlide)

      if (_.options.asNavFor) {

        navTarget = _.getNavTarget()
        navTarget = navTarget.slick('getSlick')

        if (navTarget.slideCount <= navTarget.options.slidesToShow) {
          navTarget.setSlideClasses(_.currentSlide)
        }

      }

      _.updateDots()
      _.updateArrows()

      if (_.options.fade === true) {
        if (dontAnimate !== true) {

          _.fadeSlideOut(oldSlide)

          _.fadeSlide(animSlide, function () {
            _.postSlide(animSlide)
          })

        } else {
          _.postSlide(animSlide)
        }
        _.animateHeight()
        return
      }

      if (dontAnimate !== true) {
        // if (_.options.vertical === false && dontAnimate !== true) {
        _.animateSlide(targetLeft, function () {
          _.postSlide(animSlide)
        })
      }
      // else if (_.options.vertical === true && dontAnimate !== true) {
      //   _.animateSlide(targetLeft, function() {    //
      //     _.postSlide(_.getLeft(index - 1));
      //   });
      // }
      else {
        _.postSlide(animSlide)
      }

    }

    Slick.prototype.startLoad = function () {

      var _ = this

      if (_.options.arrows === true && _.slideCount > _.options.slidesToShow) {

        _.$prevArrow.hide()
        _.$nextArrow.hide()

      }

      if (_.options.dots === true && _.slideCount > _.options.slidesToShow) {

        _.$dots.hide()

      }

      _.$slider.addClass('slick-loading')

    }

    Slick.prototype.swipeDirection = function () {

      var xDist, yDist, r, swipeAngle, _ = this

      xDist = _.touchObject.startX - _.touchObject.curX
      yDist = _.touchObject.startY - _.touchObject.curY
      r = Math.atan2(yDist, xDist)

      swipeAngle = Math.round(r * 180 / Math.PI)
      if (swipeAngle < 0) {
        swipeAngle = 360 - Math.abs(swipeAngle)
      }

      if ((swipeAngle <= 45) && (swipeAngle >= 0)) {
        return (_.options.rtl === false ? 'left' : 'right')
      }
      if ((swipeAngle <= 360) && (swipeAngle >= 315)) {
        return (_.options.rtl === false ? 'left' : 'right')
      }
      if ((swipeAngle >= 135) && (swipeAngle <= 225)) {
        return (_.options.rtl === false ? 'right' : 'left')
      }
      if (_.options.verticalSwiping === true) {
        if ((swipeAngle >= 35) && (swipeAngle <= 135)) {
          return 'down'
        } else {
          return 'up'
        }
      }

      return 'vertical'

    }

    Slick.prototype.swipeEnd = function (event) {

      var _ = this,
        slideCount,
        direction

      _.dragging = false
      _.swiping = false

      if (_.scrolling) {
        _.scrolling = false
        return false
      }

      _.interrupted = false
      _.shouldClick = (_.touchObject.swipeLength > 10) ? false : true

      if (_.touchObject.curX === undefined) {
        return false
      }

      if (_.touchObject.edgeHit === true) {
        _.$slider.trigger('edge', [_, _.swipeDirection()])
      }

      if (_.touchObject.swipeLength >= _.touchObject.minSwipe) {

        direction = _.swipeDirection()

        switch (direction) {

          case 'left':
          case 'down':

            slideCount =
              _.options.swipeToSlide ?
                _.checkNavigable(_.currentSlide + _.getSlideCount()) :
                _.currentSlide + _.getSlideCount()

            _.currentDirection = 0

            break

          case 'right':
          case 'up':

            slideCount =
              _.options.swipeToSlide ?
                _.checkNavigable(_.currentSlide - _.getSlideCount()) :
                _.currentSlide - _.getSlideCount()

            _.currentDirection = 1

            break

          default:


        }

        if (direction != 'vertical') {

          _.slideHandler(slideCount)
          _.touchObject = {}
          _.$slider.trigger('swipe', [_, direction])

        }

      } else {

        if (_.touchObject.startX !== _.touchObject.curX) {

          _.slideHandler(_.currentSlide)
          _.touchObject = {}

        }

      }

    }

    Slick.prototype.swipeHandler = function (event) {

      var _ = this

      if ((_.options.swipe === false) || ('ontouchend' in document && _.options.swipe === false)) {
        return
      } else if (_.options.draggable === false && event.type.indexOf('mouse') !== -1) {
        return
      }

      _.touchObject.fingerCount = event.originalEvent && event.originalEvent.touches !== undefined ?
        event.originalEvent.touches.length : 1

      _.touchObject.minSwipe = _.listWidth / _.options
        .touchThreshold

      if (_.options.verticalSwiping === true) {
        _.touchObject.minSwipe = _.listHeight / _.options
          .touchThreshold
      }

      switch (event.data.action) {

        case 'start':
          _.swipeStart(event)
          break

        case 'move':
          _.swipeMove(event)
          break

        case 'end':
          _.swipeEnd(event)
          break

      }

    }

    Slick.prototype.swipeMove = function (event) {

      var _ = this,
        edgeWasHit = false,
        curLeft, swipeDirection, swipeLength, positionOffset, touches, verticalSwipeLength

      touches = event.originalEvent !== undefined ? event.originalEvent.touches : null

      if (!_.dragging || _.scrolling || touches && touches.length !== 1) {
        return false
      }

      curLeft = _.getLeft(_.currentSlide)

      _.touchObject.curX = touches !== undefined ? touches[0].pageX : event.clientX
      _.touchObject.curY = touches !== undefined ? touches[0].pageY : event.clientY

      _.touchObject.swipeLength = Math.round(Math.sqrt(
        Math.pow(_.touchObject.curX - _.touchObject.startX, 2)))

      verticalSwipeLength = Math.round(Math.sqrt(
        Math.pow(_.touchObject.curY - _.touchObject.startY, 2)))

      if (!_.options.verticalSwiping && !_.swiping && verticalSwipeLength > 4) {
        _.scrolling = true
        return false
      }

      if (_.options.verticalSwiping === true) {
        _.touchObject.swipeLength = verticalSwipeLength
      }

      swipeDirection = _.swipeDirection()

      if (event.originalEvent !== undefined && _.touchObject.swipeLength > 4) {
        _.swiping = true
        event.preventDefault()
      }

      positionOffset = (_.options.rtl === false ? 1 : -1) * (_.touchObject.curX > _.touchObject.startX ? 1 : -1)
      if (_.options.verticalSwiping === true) {
        positionOffset = _.touchObject.curY > _.touchObject.startY ? 1 : -1
      }


      swipeLength = _.touchObject.swipeLength

      _.touchObject.edgeHit = false

      if (_.options.infinite === false) {
        if ((_.currentSlide === 0 && swipeDirection === 'right') || (_.currentSlide >= _.getDotCount() && swipeDirection === 'left')) {
          swipeLength = _.touchObject.swipeLength * _.options.edgeFriction
          _.touchObject.edgeHit = true
        }
      }

      if (_.options.vertical === false) {
        _.swipeLeft = curLeft + swipeLength * positionOffset
      } else {
        _.swipeLeft = curLeft + (swipeLength * (_.$list.height() / _.listWidth)) * positionOffset
      }
      if (_.options.verticalSwiping === true) {
        _.swipeLeft = curLeft + swipeLength * positionOffset
      }

      if (_.options.fade === true || _.options.touchMove === false) {
        return false
      }

      if (_.animating === true) {
        _.swipeLeft = null
        return false
      }

      _.setCSS(_.swipeLeft)

    }

    Slick.prototype.swipeStart = function (event) {

      var _ = this,
        touches

      _.interrupted = true

      if (_.touchObject.fingerCount !== 1 || _.slideCount <= _.options.slidesToShow) {
        _.touchObject = {}
        return false
      }

      if (event.originalEvent !== undefined && event.originalEvent.touches !== undefined) {
        touches = event.originalEvent.touches[0]
      }

      _.touchObject.startX = _.touchObject.curX = touches !== undefined ? touches.pageX : event.clientX
      _.touchObject.startY = _.touchObject.curY = touches !== undefined ? touches.pageY : event.clientY

      _.dragging = true

    }

    Slick.prototype.unfilterSlides = Slick.prototype.slickUnfilter = function () {

      var _ = this

      if (_.$slidesCache !== null) {

        _.unload()

        _.$slideTrack.children(this.options.slide).detach()

        _.$slidesCache.appendTo(_.$slideTrack)

        _.reinit()

      }

    }

    Slick.prototype.unload = function () {

      var _ = this

      $('.slick-cloned', _.$slider).remove()

      if (_.$dots) {
        _.$dots.remove()
      }

      if (_.$prevArrow && _.htmlExpr.test(_.options.prevArrow)) {
        _.$prevArrow.remove()
      }

      if (_.$nextArrow && _.htmlExpr.test(_.options.nextArrow)) {
        _.$nextArrow.remove()
      }

      _.$slides
        .removeClass('slick-slide slick-active slick-visible slick-current')
        .attr('aria-hidden', 'true')
        .css('width', '')

    }

    Slick.prototype.unslick = function (fromBreakpoint) {

      var _ = this
      _.$slider.trigger('unslick', [_, fromBreakpoint])
      _.destroy()

    }

    Slick.prototype.updateArrows = function () {

      var _ = this,
        centerOffset

      centerOffset = Math.floor(_.options.slidesToShow / 2)

      if (_.options.arrows === true &&
        _.slideCount > _.options.slidesToShow &&
        !_.options.infinite) {

        _.$prevArrow.removeClass('slick-disabled').attr('aria-disabled', 'false')
        _.$nextArrow.removeClass('slick-disabled').attr('aria-disabled', 'false')

        if (_.currentSlide === 0) {

          _.$prevArrow.addClass('slick-disabled').attr('aria-disabled', 'true')
          _.$nextArrow.removeClass('slick-disabled').attr('aria-disabled', 'false')

        } else if (_.currentSlide >= _.slideCount - _.options.slidesToShow && _.options.centerMode === false) {

          _.$nextArrow.addClass('slick-disabled').attr('aria-disabled', 'true')
          _.$prevArrow.removeClass('slick-disabled').attr('aria-disabled', 'false')

        } else if (_.currentSlide >= _.slideCount - 1 && _.options.centerMode === true) {

          _.$nextArrow.addClass('slick-disabled').attr('aria-disabled', 'true')
          _.$prevArrow.removeClass('slick-disabled').attr('aria-disabled', 'false')

        }

      }

    }

    Slick.prototype.updateDots = function () {

      var _ = this

      if (_.$dots !== null) {

        _.$dots
          .find('li')
          .removeClass('slick-active')
          .end()

        _.$dots
          .find('li')
          .eq(Math.floor(_.currentSlide / _.options.slidesToScroll))
          .addClass('slick-active')

      }

    }

    Slick.prototype.visibility = function () {

      var _ = this

      if (_.options.autoplay) {

        if (document[_.hidden]) {

          _.interrupted = true

        } else {

          _.interrupted = false

        }

      }

    }

    $.fn.slick = function () {
      var _ = this,
        opt = arguments[0],
        args = Array.prototype.slice.call(arguments, 1),
        l = _.length,
        i,
        ret
      for (i = 0; i < l; i++) {
        if (typeof opt == 'object' || typeof opt == 'undefined')
          _[i].slick = new Slick(_[i], opt)
        else
          ret = _[i].slick[opt].apply(_[i].slick, args)
        if (typeof ret != 'undefined') return ret
      }
      return _
    }

  }))

window.dzsprx_self_options = {}; window.dzsprx_index = 0;
(function (c) {
  c.fn.dzsparallaxer = function (b) {
    if ("undefined" == typeof b && "undefined" != typeof c(this).attr("data-options") && "" != c(this).attr("data-options")) {var n = c(this).attr("data-options"); eval("window.dzsprx_self_options = " + n); b = c.extend({}, window.dzsprx_self_options); window.dzsprx_self_options = c.extend({}, {})} b = c.extend({
      settings_mode: "scroll", mode_scroll: "normal", easing: "easeIn", animation_duration: "20", direction: "normal", js_breakout: "off", breakout_fix: "off", is_fullscreen: "off", settings_movexaftermouse: "off",
      animation_engine: "js", init_delay: "0", init_functional_delay: "0", settings_substract_from_th: 0, settings_detect_out_of_screen: !0, init_functional_remove_delay_on_scroll: "off", settings_makeFunctional: !1, settings_scrollTop_is_another_element_top: null, settings_clip_height_is_window_height: !1, settings_listen_to_object_scroll_top: null, settings_mode_oneelement_max_offset: "20", simple_parallaxer_convert_simple_img_to_bg_if_possible: "on"
    }, b); Math.easeIn = function (b, c, m, n) {return -m * (b /= n) * (b - 2) + c}; Math.easeOutQuad =
      function (b, c, m, n) {b /= n; return -m * b * (b - 2) + c}; Math.easeInOutSine = function (b, c, m, n) {return -m / 2 * (Math.cos(Math.PI * b / n) - 1) + c}; b.settings_mode_oneelement_max_offset = parseInt(b.settings_mode_oneelement_max_offset, 10); var m = parseInt(b.settings_mode_oneelement_max_offset, 10); this.each(function () {
        function n() {
          if (1 == b.settings_makeFunctional) {
            var q = !1, d = document.URL, f = d.indexOf("://") + 3, e = d.indexOf("/", f); d = d.substring(f, e); -1 < d.indexOf("l") && -1 < d.indexOf("c") && -1 < d.indexOf("o") && -1 < d.indexOf("l") && -1 < d.indexOf("a") &&
              -1 < d.indexOf("h") && (q = !0); -1 < d.indexOf("d") && -1 < d.indexOf("i") && -1 < d.indexOf("g") && -1 < d.indexOf("d") && -1 < d.indexOf("z") && -1 < d.indexOf("s") && (q = !0); -1 < d.indexOf("o") && -1 < d.indexOf("z") && -1 < d.indexOf("e") && -1 < d.indexOf("h") && -1 < d.indexOf("t") && (q = !0); -1 < d.indexOf("e") && -1 < d.indexOf("v") && -1 < d.indexOf("n") && -1 < d.indexOf("a") && -1 < d.indexOf("t") && (q = !0); if (0 == q) return
          } b.settings_scrollTop_is_another_element_top && (z = b.settings_scrollTop_is_another_element_top); g = a.find(".dzsparallaxer--target").eq(0); 0 <
            a.find(".dzsparallaxer--blackoverlay").length && (K = a.find(".dzsparallaxer--blackoverlay").eq(0)); 0 < a.find(".dzsparallaxer--fadeouttarget").length && (ba = a.find(".dzsparallaxer--fadeouttarget").eq(0)); a.find(".dzsparallaxer--aftermouse").length && a.find(".dzsparallaxer--aftermouse").each(function () {var a = c(this); L.push(a)}); a.hasClass("wait-readyall") || setTimeout(function () {B = Number(b.animation_duration)}, 300); a.addClass("mode-" + b.settings_mode); a.addClass("animation-engine-" + b.animation_engine); h = a.height()
          "on" == b.settings_movexaftermouse && (x = a.width()); g && (k = g.height(), "on" == b.settings_movexaftermouse && (r = g.width())); b.settings_substract_from_th && (k -= b.settings_substract_from_th); la = h; "2" == b.breakout_fix && console.info(a.prev()); a.attr("data-responsive-reference-width") && (M = Number(a.attr("data-responsive-reference-width"))); a.attr("data-responsive-optimal-height") && (U = Number(a.attr("data-responsive-optimal-height"))); a.find(".dzsprxseparator--bigcurvedline").length && a.find(".dzsprxseparator--bigcurvedline").each(function () {
            var a =
              c(this), b = "#FFFFFF"; a.attr("data-color") && (b = a.attr("data-color")); a.append('<svg class="display-block" width="100%"  viewBox="0 0 2500 100" preserveAspectRatio="none" ><path class="color-bg" fill="' + b + '" d="M2500,100H0c0,0-24.414-1.029,0-6.411c112.872-24.882,2648.299-14.37,2522.026-76.495L2500,100z"/></svg>')
          }); a.find(".dzsprxseparator--2triangles").length && a.find(".dzsprxseparator--2triangles").each(function () {
            var a = c(this), b = "#FFFFFF"; a.attr("data-color") && (b = a.attr("data-color")); a.append('<svg class="display-block" width="100%"  viewBox="0 0 1500 100" preserveAspectRatio="none" ><polygon class="color-bg" fill="' +
              b + '" points="1500,100 0,100 0,0 750,100 1500,0 "/></svg>')
          }); a.find(".dzsprxseparator--triangle").length && a.find(".dzsprxseparator--triangle").each(function () {var a = c(this), b = "#FFFFFF"; a.attr("data-color") && (b = a.attr("data-color")); a.append('<svg class="display-block" width="100%"  viewBox="0 0 2200 100" preserveAspectRatio="none" ><polyline class="color-bg" fill="' + b + '" points="2200,100 0,100 0,0 2200,100 "/></svg>')}); a.get(0) && (a.get(0).api_set_scrollTop_is_another_element_top = function (a) {z = a})
          "horizontal" == b.settings_mode && (g.wrap('<div class="dzsparallaxer--target-con"></div>'), "20" != b.animation_duration && a.find(".horizontal-fog,.dzsparallaxer--target").css({animation: "slideshow " + Number(b.animation_duration) / 1E3 + "s linear infinite"})); is_touch_device() && a.addClass("is-touch"); is_mobile() && a.addClass("is-mobile"); 0 < a.find(".divimage").length || 0 < a.find("img").length ? (q = a.children(".divimage, img").eq(0), 0 == q.length && (q = a.find(".divimage, img").eq(0)), q.attr("data-src") ? (V = q.attr("data-src"),
            c(window).on("scroll.dzsprx" + N, u), u()) : aa()) : aa(); "horizontal" == b.settings_mode && (g.before(g.clone()), g.prev().addClass("cloner"), ca = g.parent().find(".cloner").eq(0))
        } function aa() {
          if (!O) {
            O = !0; is_ie11() && a.addClass("is-ie-11"); c(window).on("resize", W); W(); setInterval(function () {W(null, {call_from: "autocheck"})}, 2E3); a.hasClass("wait-readyall") && setTimeout(function () {u()}, 700); setTimeout(function () {a.addClass("dzsprx-readyall"); u(); a.hasClass("wait-readyall") && (B = Number(b.animation_duration))}, 1E3)
            0 < a.find("*[data-parallaxanimation]").length && a.find("*[data-parallaxanimation]").each(function () {
              var a = c(this); if (a.attr("data-parallaxanimation")) {
                null == I && (I = []); I.push(a); var b = a.attr("data-parallaxanimation"); b = ("window.aux_opts2 = " + b).replace(/'/g, '"'); try {eval(b)} catch (f) {console.info(b, f), window.aux_opts2 = null} if (window.aux_opts2) {
                  for (w = 0; w < window.aux_opts2.length; w++)0 == isNaN(Number(window.aux_opts2[w].initial)) && (window.aux_opts2[w].initial = Number(window.aux_opts2[w].initial)), 0 == isNaN(Number(window.aux_opts2[w].mid)) &&
                    (window.aux_opts2[w].mid = Number(window.aux_opts2[w].mid)), 0 == isNaN(Number(window.aux_opts2[w]["final"])) && (window.aux_opts2[w]["final"] = Number(window.aux_opts2[w]["final"])); a.data("parallax_options", window.aux_opts2)
                }
              }
            }); da && (D = !0, setTimeout(function () {D = !1}, da)); a.hasClass("simple-parallax") ? (g.wrap('<div class="simple-parallax-inner"></div>'), "on" == b.simple_parallaxer_convert_simple_img_to_bg_if_possible && g.attr("data-src") && 0 == g.children().length && g.parent().addClass("is-image"), 0 < m && P()) : P()
            ma = setInterval(xa, 1E3); setTimeout(function () {}, 1500); a.hasClass("use-loading") && (0 < a.find(".divimage").length || 0 < a.children("img").length ? 0 < a.find(".divimage").length && (V && (a.find(".divimage").eq(0).css("background-image", "url(" + V + ")"), a.find(".dzsparallaxer--target-con .divimage").css("background-image", "url(" + V + ")")), E = String(a.find(".divimage").eq(0).css("background-image")).split('"')[1], void 0 == E && (E = String(a.find(".divimage").eq(0).css("background-image")).split("url(")[1], E = String(E).split(")")[0]),
              F = new Image, F.onload = function (c) {a.addClass("loaded"); "horizontal" == b.settings_mode && (console.info(F, E, F.naturalWidth, x, r), J = F.naturalWidth, ea = F.naturalHeight, r = J / ea * h, console.log(J, ea, r, h), g.hasClass("divimage"), console.info(ca), ca.css({left: "calc(-100% + 1px)"}), g.css({width: "100%"}), g.hasClass("repeat-pattern") && (console.info("nw - ", J, "cw - ", x), r = Math.ceil(x / J) * J, console.info("tw - ", r)), a.find(".dzsparallaxer--target-con").css({width: r}))}, F.src = E) : a.addClass("loaded"), setTimeout(function () {
                a.addClass("loaded")
                na()
              }, 1E4)); a.get(0).api_set_update_func = function (a) {G = a}; a.get(0).api_handle_scroll = u; a.get(0).api_destroy = wa; a.get(0).api_destroy_listeners = ya; a.get(0).api_handle_resize = W; if ("scroll" == b.settings_mode || "oneelement" == b.settings_mode) c(window).off("scroll.dzsprx" + N), c(window).on("scroll.dzsprx" + N, u), u(), setTimeout(u, 1E3), document && document.addEventListener && document.addEventListener("touchmove", fa, !1); if ("mouse_body" == b.settings_mode || "on" == b.settings_movexaftermouse || L.length) c(document).on("mousemove",
                fa)
          }
        } function wa() {G = null; oa = !0; G = null; c(window).off("scroll.dzsprx" + N, u); document && document.addEventListener && document.removeEventListener("touchmove", fa, !1)} function xa() {ha = !0} function ya() {console.info("DESTROY LISTENERS", a); clearInterval(ma); c(window).off("scroll.dzsprx" + N)} function W(g, d) {
          x = a.width(); X = window.innerWidth; p = window.innerHeight; var f = {call_from: "event"}; d && (f = c.extend(f, d)); if (!1 !== O) {
            if ("oneelement" == b.settings_mode) {var e = a.css("transform"); a.css("transform", "translate3d(0,0,0)")} y =
              parseInt(a.offset().top, 10); if ("autocheck" == f.call_from && 4 > Math.abs(pa - p) && 4 > Math.abs(qa - y)) return "oneelement" == b.settings_mode && a.css("transform", e), !1; pa = p; qa = y; M && U && (x < M ? a.height(x / M * U) : a.height(U)); 760 > x ? a.addClass("under-760") : a.removeClass("under-760"); 500 > x ? a.addClass("under-500") : a.removeClass("under-500"); ia && clearTimeout(ia); ia = setTimeout(na, 700); "on" == b.js_breakout && (a.css("width", X + "px"), a.css("margin-left", "0"), 0 < a.offset().left && a.css("margin-left", "-" + a.offset().left + "px"))
          }
        } function na() {
          h =
            a.outerHeight(); k = g.outerHeight(); p = window.innerHeight; b.settings_substract_from_th && (k -= b.settings_substract_from_th); b.settings_clip_height_is_window_height && (h = window.innerHeight); 0 == a.hasClass("allbody") && 0 == a.hasClass("dzsparallaxer---window-height") && 0 == M && (k <= la && 0 < k ? ("oneelement" != b.settings_mode && 0 == a.hasClass("do-not-set-js-height") && 0 == a.hasClass("height-is-based-on-content") && a.height(k), h = a.height(), is_ie() && 10 >= version_ie() ? g.css("top", "0") : g.css("transform", ""), K && K.css("opacity", "0")) :
              "oneelement" != b.settings_mode && 0 == a.hasClass("do-not-set-js-height") && a.hasClass("height-is-based-on-content")); g.attr("data-forcewidth_ratio") && (g.width(Number(g.attr("data-forcewidth_ratio")) * g.height()), g.width() < a.width() && g.width(a.width())); clearTimeout(ra); ra = setTimeout(u, 200)
        } function fa(a) {
          if ("mouse_body" == b.settings_mode) {l = a.pageY - c(window).scrollTop(); if (0 == k) return; var d = l / p * (h - k); C = l / h; 0 < d && (d = 0); d < h - k && (d = h - k); 1 < C && (C = 1); 0 > C && (C = 0); Q = d} if ("on" == b.settings_movexaftermouse) {
            var f = a.pageX
            f = f / X * (x - r); 0 < f && (f = 0); f < x - r && (f = x - r); sa = f
          } if (L) for (f = a.pageX, a = a.clientY, f = f / X * m * 2 - m, d = a / p * m * 4 - 2 * m, f > m && (f = m), f < -m && (f = -m), d > m && (d = m), d < -m && (d = -m), a = 0; a < L.length; a++)L[a].css({top: d, left: f}, {queue: !1, duration: 100})
        } function u(n, d) {
          l = c(window).scrollTop(); t = 0; y > l - p && l < y + a.outerHeight() ? D = !1 : b.settings_detect_out_of_screen && (D = !0); z && (l = -parseInt(z.css("top"), 10), z.data("targettop") && (l = -z.data("targettop"))); b.settings_listen_to_object_scroll_top && (l = b.settings_listen_to_object_scroll_top.val); isNaN(l) &&
            (l = 0); n && "on" == b.init_functional_remove_delay_on_scroll && (D = !1); var f = {force_vi_y: null, from: "", force_ch: null, force_th: null, force_th_only_big_diff: !0}; d && (f = c.extend(f, d)); b.settings_clip_height_is_window_height && (h = window.innerHeight); null != f.force_ch && (h = f.force_ch); null != f.force_th && (f.force_th_only_big_diff ? 20 < Math.abs(f.force_th - k) && (k = f.force_th) : k = f.force_th); !1 === O && (p = window.innerHeight, l + p >= a.offset().top && aa()); if (0 != k && !1 !== O && ("scroll" == b.settings_mode || "oneelement" == b.settings_mode)) {
              if ("oneelement" ==
                b.settings_mode) {var e = (l - y + p) / p; a.attr("id"); 0 > e && (e = 0); 1 < e && (e = 1); "reverse" == b.direction && (e = Math.abs(1 - e)); Q = t = 2 * e * b.settings_mode_oneelement_max_offset - b.settings_mode_oneelement_max_offset; a.attr("id")} if ("scroll" == b.settings_mode) {
                  "fromtop" == b.mode_scroll && (t = l / h * (h - k), "on" == b.is_fullscreen && (t = l / (k - p) * (h - k), z && (t = l / (z.height() - p) * (h - k))), "reverse" == b.direction && (t = (1 - l / h) * (h - k), "on" == b.is_fullscreen && (t = (1 - l / (k - p)) * (h - k), z && (t = (1 - l / (z.height() - p)) * (h - k))))); y = a.offset().top; z && (y = -parseInt(z.css("top"),
                    10)); e = (l - (y - p)) / (y + h - (y - p)); "on" == b.is_fullscreen && (e = l / (c("body").height() - p), z && (e = l / (z.outerHeight() - p))); 1 < e && (e = 1); 0 > e && (e = 0); if (I) for (w = 0; w < I.length; w++) {var x = I[w], q = x.data("parallax_options"); if (q) for (var r = 0; r < q.length; r++) {if (.5 >= e) {var u = 2 * e; var A = 2 * e - 1; 0 > A && (A = -A); u = A * q[r].initial + u * q[r].mid} else u = 2 * (e - .5), A = u - 1, 0 > A && (A = -A), u = A * q[r].mid + u * q[r]["final"]; A = q[r].value; A = A.replace(/{{val}}/g, u); x.css(q[r].property, A)} } "normal" == b.mode_scroll && (t = e * (h - k), "reverse" == b.direction && (t = (1 - e) *
                      (h - k)), a.hasClass("debug-target") && console.info(b.mode_scroll, l, y, p, h, y + h, e)); "fromtop" == b.mode_scroll && t < h - k && (t = h - k); a.hasClass("simple-parallax") && (e = (l + p - y) / (p + k), 0 > e && (e = 0), 1 < e && (e = 1), e = Math.abs(1 - e), a.hasClass("is-mobile") && (m = a.height() / 2), t = 2 * e * m - m); ba && (e = Math.abs((l - y) / a.outerHeight() - 1), 1 < e && (e = 1), 0 > e && (e = 0), ba.css("opacity", e)); C = l / h; 0 == a.hasClass("simple-parallax") && (0 < t && (t = 0), t < h - k && (t = h - k)); 1 < C && (C = 1); 0 > C && (C = 0); f.force_vi_y && (t = f.force_vi_y); Q = t; ta = C; if (0 === B || "css" == b.animation_engine) v =
                        Q, 0 == D && (a.hasClass("simple-parallax") ? (g.parent().hasClass("is-image") || a.hasClass("simple-parallax--is-only-image")) && g.css("background-position-y", "calc(50% - " + parseInt(v, 10) + "px)") : is_ie() && 10 >= version_ie() ? g.css("top", "" + v + "px") : (g.css("transform", "translate3d(" + H + "px," + v + "px,0)"), "oneelement" == b.settings_mode && a.css("transform", "translate3d(" + H + "px," + v + "px,0)")))
                }
            }
        } function P() {
          if (D) return requestAnimFrame(P), !1; isNaN(v) && (v = 0); ha && (ha = !1); if ("horizontal" == b.settings_mode) return !1; if (0 === B ||
            "css" == b.animation_engine) return G && G(v), requestAnimFrame(P), !1; R = v; Y = Q - R; S = T; Z = ta - S; "easeIn" == b.easing && (v = Number(Math.easeIn(1, R, Y, B).toFixed(5)), T = Number(Math.easeIn(1, S, Z, B).toFixed(5))); "easeOutQuad" == b.easing && (v = Math.easeOutQuad(1, R, Y, B), T = Math.easeOutQuad(1, S, Z, B)); "easeInOutSine" == b.easing && (v = Math.easeInOutSine(1, R, Y, B), T = Math.easeInOutSine(1, S, Z, B)); H = 0; "on" == b.settings_movexaftermouse && (ja = H, ua = sa - ja, H = Math.easeIn(1, ja, ua, B)); a.hasClass("simple-parallax") ? g.parent().hasClass("is-image") &&
              g.css("background-position-y", "calc(50% - " + parseInt(v, 10) + "px)") : is_ie() && 10 >= version_ie() ? g.css("top", "" + v + "px") : (g.css("transform", "translate3d(" + H + "px," + v + "px,0)"), "oneelement" == b.settings_mode && a.css("transform", "translate3d(" + H + "px," + v + "px,0)")); K && K.css("opacity", T); G && G(v); if (oa) return !1; requestAnimFrame(P)
        } var a = c(this), g = null, ca = null, K = null, ba = null, N = window.dzsprx_index++, w = 0, r = 0, k = 0, h = 0, x = 0, X = 0, p = 0, J = 0, ea = 0, pa = 0, qa = 0, la = 0, ia = 0, B = 0, v = 0, H = 0, T = 0, R = 0, ja = 0, S = 0, Q = 0, sa = 0, ta = 0, Y = 0, ua = 0, Z = 0, G = null,
          z = null, l = 0, t = 0, C = 0, y = 0, V = "", O = !1, ha = !1, I = null, oa = !1, D = !1, ka = 0, da = 0, ma = 0, ra = 0, M = 0, U = 0, L = [], F = null, E = ""; ka = Number(b.init_delay); da = Number(b.init_functional_delay); ka ? setTimeout(n, ka) : n()
      })
  }; window.dzsprx_init = function (b, n) {if ("undefined" != typeof n && "undefined" != typeof n.init_each && 1 == n.init_each) {var m = 0, va; for (va in n) m++; 1 == m && (n = void 0); c(b).each(function () {c(this).dzsparallaxer(n)})} else c(b).dzsparallaxer(n)}
})(jQuery)
function is_mobile() {var c = navigator.userAgent || navigator.vendor || window.opera; return /windows phone/i.test(c) || /android/i.test(c) || /iPad|iPhone|iPod/.test(c) && !window.MSStream ? !0 : !1} function is_touch_device() {return !!("ontouchstart" in window)} window.requestAnimFrame = function () {return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function (c) {window.setTimeout(c, 1E3 / 60)}}()
function is_ie() {var c = window.navigator.userAgent, b = c.indexOf("MSIE "); if (0 < b) return parseInt(c.substring(b + 5, c.indexOf(".", b)), 10); if (0 < c.indexOf("Trident/")) return b = c.indexOf("rv:"), parseInt(c.substring(b + 3, c.indexOf(".", b)), 10); b = c.indexOf("Edge/"); return 0 < b ? parseInt(c.substring(b + 5, c.indexOf(".", b)), 10) : !1} function is_ie11() {return !window.ActiveXObject && "ActiveXObject" in window} function version_ie() {return parseFloat(navigator.appVersion.split("MSIE")[1])}
jQuery(document).ready(function (c) {c(".dzsparallaxer---window-height").each(function () {function b() {n.height(window.innerHeight)} var n = c(this); c(window).on("resize", b); b()}); dzsprx_init(".dzsparallaxer.auto-init", {init_each: !0})});

/**
 * HSCore -
 *
 * @author HtmlStream
 * @version 1.0
 */
;
(function ($) {

  'use strict'

  $.HSCore = {

    /**
     *
     *
     * @param
     *
     * @return
     */
    init: function () {

      $(document).ready(function (e) {
        // Botostrap Tootltips
        $('[data-toggle="tooltip"]').tooltip()

        // Set Background Image Dynamically
        if ($('[data-bg-img-src]').length) $.HSCore.helpers.bgImage($('[data-bg-img-src]'))

        // Extends jQuery
        $.HSCore.helpers.extendjQuery()

        // Detect Internet Explorer (IE)
        $.HSCore.helpers.detectIE()

        // Bootstrap Navigation Options
        $.HSCore.helpers.bootstrapNavOptions.init()

      })

      $(window).on('load', function (e) {

      })

    },

    /**
     *
     *
     * @var
     */
    components: {},

    /**
     *
     *
     * @var
     */
    helpers: {

      Math: {

        getRandomValueFromRange: function (startPoint, endPoint, fixed) {

          var fixedInner = fixed ? fixed : false

          Math.random()

          return fixedInner ? (Math.random() * (endPoint - startPoint) + startPoint) : (Math.floor(Math.random() * (endPoint - startPoint + 1)) + startPoint)

        }

      },

      /**
       * Sets background-image dynamically.
       *
       * @param jQuery collection
       *
       * @return jQuery|undefined
       */
      bgImage: function (collection) {

        if (!collection || !collection.length) return

        return collection.each(function (i, el) {

          var $el = $(el),
            bgImageSrc = $el.data('bg-img-src')

          if (bgImageSrc) $el.css('background-image', 'url(' + bgImageSrc + ')')

        })

      },

      /**
       * Extends basic jQuery functionality
       *
       * @return undefined
       */
      extendjQuery: function () {

        $.fn.extend({

          /**
           * Runs specified function after loading of all images.
           *
           * @return Deferred
           */
          afterImagesLoaded: function () {

            var $imgs = this.find('img[src!=""]')

            if (!$imgs.length) {
              return $.Deferred().resolve().promise()
            }

            var dfds = []

            $imgs.each(function () {
              var dfd = $.Deferred()
              dfds.push(dfd)
              var img = new Image()
              img.onload = function () {
                dfd.resolve()
              }
              img.onerror = function () {
                dfd.resolve()
              }
              img.src = this.src
            })

            return $.when.apply($, dfds)

          }

        })

      },


      /**
       * Detect Internet Explorer (IE)
       *
       * @return version of IE or false, if browser is not Internet Explorer
       */

      detectIE: function () {

        var ua = window.navigator.userAgent

        var trident = ua.indexOf('Trident/')
        if (trident > 0) {
          // IE 11 => return version number
          var rv = ua.indexOf('rv:')
          var ieV = parseInt(ua.substring(rv + 3, ua.indexOf('.', rv)), 10)
          document.querySelector('body').className += ' IE'
        }

        var edge = ua.indexOf('Edge/')
        if (edge > 0) {
          // IE 12 (aka Edge) => return version number
          var ieV = parseInt(ua.substring(edge + 5, ua.indexOf('.', edge)), 10)
          document.querySelector('body').className += ' IE'
        }

        // other browser
        return false

      },


      /**
       * Bootstrap navigation options
       *
       */
      bootstrapNavOptions: {
        init: function () {
          this.mobileHideOnScroll()
        },

        mobileHideOnScroll: function () {
          var $collection = $('.navbar')
          if (!$collection.length) return

          var $w = $(window),
            breakpointsMap = {
              'sm': 576,
              'md': 768,
              'lg': 992,
              'xl': 1200
            }

          $('body').on('click.HSMobileHideOnScroll', '.navbar-toggler', function (e) {
            var $navbar = $(this).closest('.navbar')

            if ($navbar.length) {
              $navbar.data('mobile-menu-scroll-position', $w.scrollTop())
            }
            e.preventDefault()
          })

          $w.on('scroll.HSMobileHideOnScroll', function (e) {
            $collection.each(function (i, el) {
              var $this = $(el), $toggler, $nav, offset, $hamburgers, breakpoint
              if ($this.hasClass('navbar-expand-xl')) breakpoint = breakpointsMap['xl']
              else if ($this.hasClass('navbar-expand-lg')) breakpoint = breakpointsMap['lg']
              else if ($this.hasClass('navbar-expand-md')) breakpoint = breakpointsMap['md']
              else if ($this.hasClass('navbar-expand-xs')) breakpoint = breakpointsMap['xs']

              if ($w.width() > breakpoint) return

              $toggler = $this.find('.navbar-toggler')
              $nav = $this.find('.navbar-collapse')

              if (!$nav.data('mobile-scroll-hide')) return

              if ($nav.length) {
                offset = $this.data('mobile-menu-scroll-position')

                if (Math.abs($w.scrollTop() - offset) > 40 && $nav.hasClass('show')) {
                  $toggler.trigger('click')
                  $hamburgers = $toggler.find('.is-active')
                  if ($hamburgers.length) {
                    $hamburgers.removeClass('is-active')
                  }
                }
              }
            })
          })
        }
      }

    },

    /**
     *
     *
     * @var
     */
    settings: {
      rtl: false
    }

  }

  $.HSCore.init()

})(jQuery)

  /**
   * Header Component.
   *
   * @author Htmlstream
   * @version 1.0
   *
   */
  ; (function ($) {
    'use strict'

    $.HSCore.components.HSHeader = {

      /**
       * Base configuration.
       *
       * @var Object _baseConfig
       */
      _baseConfig: {
        headerFixMoment: 0,
        headerFixEffect: 'slide',
        breakpointsMap: {
          'md': 768,
          'sm': 576,
          'lg': 992,
          'xl': 1200
        }
      },

      /**
       * Initializtion of header.
       *
       * @param jQuery element
       *
       * @return jQuery
       */
      init: function (element) {

        if (!element || element.length !== 1 || element.data('HSHeader')) return

        var self = this

        this.element = element
        this.config = $.extend(true, {}, this._baseConfig, element.data())

        this.observers = this._detectObservers()
        this.fixMediaDifference(this.element)
        this.element.data('HSHeader', new HSHeader(this.element, this.config, this.observers))

        $(window)
          .on('scroll.uHeader', function (e) {

            if ($(window).scrollTop() < ($(element).data('header-fix-moment') - 100) && $(element).data('effect-compensation') === true) {
              $(element).css({
                top: -($(window).scrollTop())
              })
                .addClass($(element).data('effect-compensation-start-class'))
                .removeClass($(element).data('effect-compensation-end-class'))
            } else if ($(element).data('effect-compensation') === true) {
              $(element).css({
                top: 0
              })
                .addClass($(element).data('effect-compensation-end-class'))
                .removeClass($(element).data('effect-compensation-start-class'))
            }

            if ($(window).scrollTop() > 5 && !$(element).hasClass('.u-scrolled')) {
              $(element).addClass('u-scrolled')
            } else {
              $(element).removeClass('u-scrolled')
            }

            element
              .data('HSHeader')
              .notify()

          })
          .on('resize.uHeader', function (e) {

            if (self.resizeTimeOutId) clearTimeout(self.resizeTimeOutId)

            self.resizeTimeOutId = setTimeout(function () {

              element
                .data('HSHeader')
                .checkViewport()
                .update()

            }, 100)

          })
          .trigger('scroll.uHeader')

        return this.element

      },

      /**
       *
       *
       * @param
       *
       * @return
       */
      _detectObservers: function () {

        if (!this.element || !this.element.length) return

        var observers = {
          'xs': [],
          'sm': [],
          'md': [],
          'lg': [],
          'xl': []
        }

        /* ------------------------ xs -------------------------*/

        // Has Hidden Element
        if (this.element.hasClass('u-header--has-hidden-element')) {
          observers['xs'].push(
            new HSHeaderHasHiddenElement(this.element)
          )
        }

        // Sticky top

        if (this.element.hasClass('u-header--sticky-top')) {

          if (this.element.hasClass('u-header--show-hide')) {

            observers['xs'].push(
              new HSHeaderMomentShowHideObserver(this.element)
            )

          }
          else if (this.element.hasClass('u-header--toggle-section')) {

            observers['xs'].push(
              new HSHeaderHideSectionObserver(this.element)
            )

          }

          if (this.element.hasClass('u-header--change-logo')) {

            observers['xs'].push(
              new HSHeaderChangeLogoObserver(this.element)
            )

          }

          if (this.element.hasClass('u-header--change-appearance')) {

            observers['xs'].push(
              new HSHeaderChangeAppearanceObserver(this.element)
            )

          }

        }

        // Floating

        if (this.element.hasClass('u-header--floating')) {

          observers['xs'].push(
            new HSHeaderFloatingObserver(this.element)
          )

        }

        if (this.element.hasClass('u-header--invulnerable')) {
          observers['xs'].push(
            new HSHeaderWithoutBehaviorObserver(this.element)
          )
        }

        // Sticky bottom

        if (this.element.hasClass('u-header--sticky-bottom')) {

          if (this.element.hasClass('u-header--change-appearance')) {
            observers['xs'].push(
              new HSHeaderChangeAppearanceObserver(this.element)
            )
          }

          if (this.element.hasClass('u-header--change-logo')) {

            observers['xs'].push(
              new HSHeaderChangeLogoObserver(this.element)
            )

          }

        }

        // Abs top & Static

        if (this.element.hasClass('u-header--abs-top') || this.element.hasClass('u-header--static')) {

          if (this.element.hasClass('u-header--show-hide')) {

            observers['xs'].push(
              new HSHeaderShowHideObserver(this.element)
            )

          }

          if (this.element.hasClass('u-header--change-logo')) {

            observers['xs'].push(
              new HSHeaderChangeLogoObserver(this.element)
            )

          }

          if (this.element.hasClass('u-header--change-appearance')) {

            observers['xs'].push(
              new HSHeaderChangeAppearanceObserver(this.element)
            )

          }

        }

        // Abs bottom & Abs top 2nd screen

        if (this.element.hasClass('u-header--abs-bottom') || this.element.hasClass('u-header--abs-top-2nd-screen')) {

          observers['xs'].push(
            new HSHeaderStickObserver(this.element)
          )

          if (this.element.hasClass('u-header--change-appearance')) {

            observers['xs'].push(
              new HSHeaderChangeAppearanceObserver(this.element, {
                fixPointSelf: true
              })
            )

          }

          if (this.element.hasClass('u-header--change-logo')) {

            observers['xs'].push(
              new HSHeaderChangeLogoObserver(this.element, {
                fixPointSelf: true
              })
            )

          }

        }

        /* ------------------------ sm -------------------------*/

        // Sticky top

        // Has Hidden Element
        if (this.element.hasClass('u-header--has-hidden-element-sm')) {
          observers['sm'].push(
            new HSHeaderHasHiddenElement(this.element)
          )
        }

        if (this.element.hasClass('u-header--sticky-top-sm')) {

          if (this.element.hasClass('u-header--show-hide-sm')) {

            observers['sm'].push(
              new HSHeaderMomentShowHideObserver(this.element)
            )

          }
          else if (this.element.hasClass('u-header--toggle-section-sm')) {

            observers['sm'].push(
              new HSHeaderHideSectionObserver(this.element)
            )

          }

          if (this.element.hasClass('u-header--change-logo-sm')) {

            observers['sm'].push(
              new HSHeaderChangeLogoObserver(this.element)
            )

          }

          if (this.element.hasClass('u-header--change-appearance-sm')) {

            observers['sm'].push(
              new HSHeaderChangeAppearanceObserver(this.element)
            )

          }

        }

        // Floating

        if (this.element.hasClass('u-header--floating-sm')) {

          observers['sm'].push(
            new HSHeaderFloatingObserver(this.element)
          )

        }

        if (this.element.hasClass('u-header--invulnerable-sm')) {
          observers['sm'].push(
            new HSHeaderWithoutBehaviorObserver(this.element)
          )
        }

        // Sticky bottom

        if (this.element.hasClass('u-header--sticky-bottom-sm')) {

          if (this.element.hasClass('u-header--change-appearance-sm')) {
            observers['sm'].push(
              new HSHeaderChangeAppearanceObserver(this.element)
            )
          }

          if (this.element.hasClass('u-header--change-logo-sm')) {

            observers['sm'].push(
              new HSHeaderChangeLogoObserver(this.element)
            )

          }

        }

        // Abs top & Static

        if (this.element.hasClass('u-header--abs-top-sm') || this.element.hasClass('u-header--static-sm')) {

          if (this.element.hasClass('u-header--show-hide-sm')) {

            observers['sm'].push(
              new HSHeaderShowHideObserver(this.element)
            )

          }

          if (this.element.hasClass('u-header--change-logo-sm')) {

            observers['sm'].push(
              new HSHeaderChangeLogoObserver(this.element)
            )

          }

          if (this.element.hasClass('u-header--change-appearance-sm')) {

            observers['sm'].push(
              new HSHeaderChangeAppearanceObserver(this.element)
            )

          }

        }

        // Abs bottom & Abs top 2nd screen

        if (this.element.hasClass('u-header--abs-bottom-sm') || this.element.hasClass('u-header--abs-top-2nd-screen-sm')) {

          observers['sm'].push(
            new HSHeaderStickObserver(this.element)
          )

          if (this.element.hasClass('u-header--change-appearance-sm')) {

            observers['sm'].push(
              new HSHeaderChangeAppearanceObserver(this.element, {
                fixPointSelf: true
              })
            )

          }

          if (this.element.hasClass('u-header--change-logo-sm')) {

            observers['sm'].push(
              new HSHeaderChangeLogoObserver(this.element, {
                fixPointSelf: true
              })
            )

          }

        }

        /* ------------------------ md -------------------------*/

        // Has Hidden Element
        if (this.element.hasClass('u-header--has-hidden-element-md')) {
          observers['md'].push(
            new HSHeaderHasHiddenElement(this.element)
          )
        }

        // Sticky top

        if (this.element.hasClass('u-header--sticky-top-md')) {

          if (this.element.hasClass('u-header--show-hide-md')) {

            observers['md'].push(
              new HSHeaderMomentShowHideObserver(this.element)
            )

          }
          else if (this.element.hasClass('u-header--toggle-section-md')) {

            observers['md'].push(
              new HSHeaderHideSectionObserver(this.element)
            )

          }

          if (this.element.hasClass('u-header--change-logo-md')) {

            observers['md'].push(
              new HSHeaderChangeLogoObserver(this.element)
            )

          }

          if (this.element.hasClass('u-header--change-appearance-md')) {

            observers['md'].push(
              new HSHeaderChangeAppearanceObserver(this.element)
            )

          }

        }

        // Floating

        if (this.element.hasClass('u-header--floating-md')) {

          observers['md'].push(
            new HSHeaderFloatingObserver(this.element)
          )

        }

        if (this.element.hasClass('u-header--invulnerable-md')) {
          observers['md'].push(
            new HSHeaderWithoutBehaviorObserver(this.element)
          )
        }

        // Sticky bottom

        if (this.element.hasClass('u-header--sticky-bottom-md')) {

          if (this.element.hasClass('u-header--change-appearance-md')) {
            observers['md'].push(
              new HSHeaderChangeAppearanceObserver(this.element)
            )
          }

          if (this.element.hasClass('u-header--change-logo-md')) {

            observers['md'].push(
              new HSHeaderChangeLogoObserver(this.element)
            )

          }

        }

        // Abs top & Static

        if (this.element.hasClass('u-header--abs-top-md') || this.element.hasClass('u-header--static-md')) {

          if (this.element.hasClass('u-header--show-hide-md')) {

            observers['md'].push(
              new HSHeaderShowHideObserver(this.element)
            )

          }

          if (this.element.hasClass('u-header--change-logo-md')) {

            observers['md'].push(
              new HSHeaderChangeLogoObserver(this.element)
            )

          }

          if (this.element.hasClass('u-header--change-appearance-md')) {

            observers['md'].push(
              new HSHeaderChangeAppearanceObserver(this.element)
            )

          }

        }

        // Abs bottom & Abs top 2nd screen

        if (this.element.hasClass('u-header--abs-bottom-md') || this.element.hasClass('u-header--abs-top-2nd-screen-md')) {

          observers['md'].push(
            new HSHeaderStickObserver(this.element)
          )

          if (this.element.hasClass('u-header--change-appearance-md')) {

            observers['md'].push(
              new HSHeaderChangeAppearanceObserver(this.element, {
                fixPointSelf: true
              })
            )

          }

          if (this.element.hasClass('u-header--change-logo-md')) {

            observers['md'].push(
              new HSHeaderChangeLogoObserver(this.element, {
                fixPointSelf: true
              })
            )

          }

        }


        /* ------------------------ lg -------------------------*/

        // Has Hidden Element
        if (this.element.hasClass('u-header--has-hidden-element-lg')) {
          observers['lg'].push(
            new HSHeaderHasHiddenElement(this.element)
          )
        }

        // Sticky top

        if (this.element.hasClass('u-header--sticky-top-lg')) {

          if (this.element.hasClass('u-header--show-hide-lg')) {

            observers['lg'].push(
              new HSHeaderMomentShowHideObserver(this.element)
            )

          }
          else if (this.element.hasClass('u-header--toggle-section-lg')) {

            observers['lg'].push(
              new HSHeaderHideSectionObserver(this.element)
            )

          }

          if (this.element.hasClass('u-header--change-logo-lg')) {

            observers['lg'].push(
              new HSHeaderChangeLogoObserver(this.element)
            )

          }

          if (this.element.hasClass('u-header--change-appearance-lg')) {

            observers['lg'].push(
              new HSHeaderChangeAppearanceObserver(this.element)
            )

          }

        }

        // Floating

        if (this.element.hasClass('u-header--floating-lg')) {

          observers['lg'].push(
            new HSHeaderFloatingObserver(this.element)
          )

        }

        if (this.element.hasClass('u-header--invulnerable-lg')) {
          observers['lg'].push(
            new HSHeaderWithoutBehaviorObserver(this.element)
          )
        }

        // Sticky bottom

        if (this.element.hasClass('u-header--sticky-bottom-lg')) {

          if (this.element.hasClass('u-header--change-appearance-lg')) {
            observers['lg'].push(
              new HSHeaderChangeAppearanceObserver(this.element)
            )
          }

          if (this.element.hasClass('u-header--change-logo-lg')) {

            observers['lg'].push(
              new HSHeaderChangeLogoObserver(this.element)
            )

          }

        }

        // Abs top & Static

        if (this.element.hasClass('u-header--abs-top-lg') || this.element.hasClass('u-header--static-lg')) {

          if (this.element.hasClass('u-header--show-hide-lg')) {

            observers['lg'].push(
              new HSHeaderShowHideObserver(this.element)
            )

          }

          if (this.element.hasClass('u-header--change-logo-lg')) {

            observers['lg'].push(
              new HSHeaderChangeLogoObserver(this.element)
            )

          }

          if (this.element.hasClass('u-header--change-appearance-lg')) {

            observers['lg'].push(
              new HSHeaderChangeAppearanceObserver(this.element)
            )

          }

        }

        // Abs bottom & Abs top 2nd screen

        if (this.element.hasClass('u-header--abs-bottom-lg') || this.element.hasClass('u-header--abs-top-2nd-screen-lg')) {

          observers['lg'].push(
            new HSHeaderStickObserver(this.element)
          )

          if (this.element.hasClass('u-header--change-appearance-lg')) {

            observers['lg'].push(
              new HSHeaderChangeAppearanceObserver(this.element, {
                fixPointSelf: true
              })
            )

          }

          if (this.element.hasClass('u-header--change-logo-lg')) {

            observers['lg'].push(
              new HSHeaderChangeLogoObserver(this.element, {
                fixPointSelf: true
              })
            )

          }

        }

        /* ------------------------ xl -------------------------*/

        // Has Hidden Element
        if (this.element.hasClass('u-header--has-hidden-element-xl')) {
          observers['xl'].push(
            new HSHeaderHasHiddenElement(this.element)
          )
        }

        // Sticky top

        if (this.element.hasClass('u-header--sticky-top-xl')) {

          if (this.element.hasClass('u-header--show-hide-xl')) {

            observers['xl'].push(
              new HSHeaderMomentShowHideObserver(this.element)
            )

          }
          else if (this.element.hasClass('u-header--toggle-section-xl')) {

            observers['xl'].push(
              new HSHeaderHideSectionObserver(this.element)
            )

          }

          if (this.element.hasClass('u-header--change-logo-xl')) {

            observers['xl'].push(
              new HSHeaderChangeLogoObserver(this.element)
            )

          }

          if (this.element.hasClass('u-header--change-appearance-xl')) {

            observers['xl'].push(
              new HSHeaderChangeAppearanceObserver(this.element)
            )

          }

        }

        // Floating

        if (this.element.hasClass('u-header--floating-xl')) {

          observers['xl'].push(
            new HSHeaderFloatingObserver(this.element)
          )

        }

        // Sticky bottom

        if (this.element.hasClass('u-header--invulnerable-xl')) {
          observers['xl'].push(
            new HSHeaderWithoutBehaviorObserver(this.element)
          )
        }

        // Sticky bottom

        if (this.element.hasClass('u-header--sticky-bottom-xl')) {

          if (this.element.hasClass('u-header--change-appearance-xl')) {
            observers['xl'].push(
              new HSHeaderChangeAppearanceObserver(this.element)
            )
          }

          if (this.element.hasClass('u-header--change-logo-xl')) {

            observers['xl'].push(
              new HSHeaderChangeLogoObserver(this.element)
            )

          }

        }

        // Abs top & Static

        if (this.element.hasClass('u-header--abs-top-xl') || this.element.hasClass('u-header--static-xl')) {

          if (this.element.hasClass('u-header--show-hide-xl')) {

            observers['xl'].push(
              new HSHeaderShowHideObserver(this.element)
            )

          }

          if (this.element.hasClass('u-header--change-logo-xl')) {

            observers['xl'].push(
              new HSHeaderChangeLogoObserver(this.element)
            )

          }

          if (this.element.hasClass('u-header--change-appearance-xl')) {

            observers['xl'].push(
              new HSHeaderChangeAppearanceObserver(this.element)
            )

          }

        }

        // Abs bottom & Abs top 2nd screen

        if (this.element.hasClass('u-header--abs-bottom-xl') || this.element.hasClass('u-header--abs-top-2nd-screen-xl')) {

          observers['xl'].push(
            new HSHeaderStickObserver(this.element)
          )

          if (this.element.hasClass('u-header--change-appearance-xl')) {

            observers['xl'].push(
              new HSHeaderChangeAppearanceObserver(this.element, {
                fixPointSelf: true
              })
            )

          }

          if (this.element.hasClass('u-header--change-logo-xl')) {

            observers['xl'].push(
              new HSHeaderChangeLogoObserver(this.element, {
                fixPointSelf: true
              })
            )

          }

        }


        return observers

      },

      /**
       *
       *
       * @param
       *
       * @return
       */
      fixMediaDifference: function (element) {

        if (!element || !element.length || !element.filter('[class*="u-header--side"]').length) return

        var toggleable

        if (element.hasClass('u-header--side-left-xl') || element.hasClass('u-header--side-right-xl')) {

          toggleable = element.find('.navbar-expand-xl')

          if (toggleable.length) {
            toggleable
              .removeClass('navbar-expand-xl')
              .addClass('navbar-expand-lg')
          }

        }
        else if (element.hasClass('u-header--side-left-lg') || element.hasClass('u-header--side-right-lg')) {

          toggleable = element.find('.navbar-expand-lg')

          if (toggleable.length) {
            toggleable
              .removeClass('navbar-expand-lg')
              .addClass('navbar-expand-md')
          }

        }
        else if (element.hasClass('u-header--side-left-md') || element.hasClass('u-header--side-right-md')) {

          toggleable = element.find('.navbar-expand-md')

          if (toggleable.length) {
            toggleable
              .removeClass('navbar-expand-md')
              .addClass('navbar-expand-sm')
          }

        }
        else if (element.hasClass('u-header--side-left-sm') || element.hasClass('u-header--side-right-sm')) {

          toggleable = element.find('.navbar-expand-sm')

          if (toggleable.length) {
            toggleable
              .removeClass('navbar-expand-sm')
              .addClass('navbar-expand')
          }

        }

      }

    }

    /**
     * HSHeader constructor function.
     *
     * @param jQuery element
     * @param Object config
     * @param Object observers
     *
     * @return undefined
     */
    function HSHeader(element, config, observers) {

      if (!element || !element.length) return

      this.element = element
      this.config = config

      this.observers = observers && $.isPlainObject(observers) ? observers : {}

      this.viewport = 'xs'
      this.checkViewport()

    }

    /**
     *
     *
     * @return Object
     */
    HSHeader.prototype.checkViewport = function () {

      var $w = $(window)

      if ($w.width() > this.config.breakpointsMap['sm'] && this.observers['sm'].length) {
        this.prevViewport = this.viewport
        this.viewport = 'sm'

        if (this.element[0].dataset.headerFixMoment && $w.scrollTop() > this.element[0].dataset.headerFixMoment) {

          if (typeof this.config.breakpointsMap['sm'] === 'undefined') {
            this.element.removeClass('js-header-fix-moment')
          } else {
            this.element.addClass('js-header-fix-moment')
          }

        }

        return this
      }

      if ($w.width() > this.config.breakpointsMap['md'] && this.observers['md'].length) {
        this.prevViewport = this.viewport
        this.viewport = 'md'

        if (this.element[0].dataset.headerFixMoment && $w.scrollTop() > this.element[0].dataset.headerFixMoment) {

          if (typeof this.config.breakpointsMap['md'] === 'undefined') {
            this.element.removeClass('js-header-fix-moment')
          } else {
            this.element.addClass('js-header-fix-moment')
          }

        }

        return this
      }

      if ($w.width() > this.config.breakpointsMap['lg'] && this.observers['lg'].length) {
        this.prevViewport = this.viewport
        this.viewport = 'lg'

        if (this.element[0].dataset.headerFixMoment && $w.scrollTop() > this.element[0].dataset.headerFixMoment) {

          if (typeof this.config.breakpointsMap['lg'] === 'undefined') {
            this.element.removeClass('js-header-fix-moment')
          } else {
            this.element.addClass('js-header-fix-moment')
          }

        }

        return this
      }

      if ($w.width() > this.config.breakpointsMap['xl'] && this.observers['xl'].length) {
        this.prevViewport = this.viewport
        this.viewport = 'xl'

        if (this.element[0].dataset.headerFixMoment && $w.scrollTop() > this.element[0].dataset.headerFixMoment) {

          if (typeof this.config.breakpointsMap['xl'] === 'undefined') {
            this.element.removeClass('js-header-fix-moment')
          } else {
            this.element.addClass('js-header-fix-moment')
          }

        }

        return this
      }


      if (this.prevViewport) this.prevViewport = this.viewport

      if (this.element[0].dataset.headerFixMoment && $w.scrollTop() > this.element[0].dataset.headerFixMoment) {

        if (typeof this.config.breakpointsMap['xs'] === 'undefined') {
          this.element.removeClass('js-header-fix-moment')
        } else {
          this.element.addClass('js-header-fix-moment')
        }

      }

      this.viewport = 'xs'


      return this

    }

    /**
     * Notifies all observers.
     *
     * @return Object
     */
    HSHeader.prototype.notify = function () {

      if (this.prevViewport) {
        this.observers[this.prevViewport].forEach(function (observer) {
          observer.destroy()
        })
        this.prevViewport = null
      }

      this.observers[this.viewport].forEach(function (observer) {
        observer.check()
      })

      return this

    }

    /**
     * Reinit all header's observers.
     *
     * @return Object
     */
    HSHeader.prototype.update = function () {

      for (var viewport in this.observers) {

        this.observers[viewport].forEach(function (observer) {
          observer.destroy()
        })

      }

      this.prevViewport = null

      this.observers[this.viewport].forEach(function (observer) {
        observer.reinit()
      })

      return this

    }

    /**
     * Abstract constructor function for each observer.
     *
     * @param jQuery element
     *
     * @return Boolean|undefined
     */
    function HSAbstractObserver(element) {
      if (!element || !element.length) return

      this.element = element
      this.defaultState = true

      this.reinit = function () {

        this
          .destroy()
          .init()
          .check()
      }

      return true
    }

    /**
     * Header's observer which is responsible for 'sticky' behavior.
     *
     * @param jQuery element
     */
    function HSHeaderStickObserver(element) {
      if (!HSAbstractObserver.call(this, element)) return

      this.init()

    }

    /**
     *
     *
     * @param
     *
     * @return
     */
    HSHeaderStickObserver.prototype.init = function () {
      this.defaultState = true
      this.offset = this.element.offset().top

      return this
    }

    /**
     *
     *
     * @param
     *
     * @return
     */
    HSHeaderStickObserver.prototype.destroy = function () {
      this.toDefaultState()

      return this
    }

    /**
     *
     *
     * @param
     *
     * @return
     */
    HSHeaderStickObserver.prototype.check = function () {

      var $w = $(window),
        docScrolled = $w.scrollTop()

      if (docScrolled > this.offset && this.defaultState) {
        this.changeState()
      }
      else if (docScrolled < this.offset && !this.defaultState) {
        this.toDefaultState()
      }

      return this

    }

    /**
     *
     *
     * @param
     *
     * @return
     */
    HSHeaderStickObserver.prototype.changeState = function () {

      this.element.addClass('js-header-fix-moment')
      this.defaultState = !this.defaultState

      return this

    }

    /**
     *
     *
     * @param
     *
     * @return
     */
    HSHeaderStickObserver.prototype.toDefaultState = function () {

      this.element.removeClass('js-header-fix-moment')
      this.defaultState = !this.defaultState

      return this

    }


    /**
     * Header's observer which is responsible for 'show/hide' behavior which is depended on scroll direction.
     *
     * @param jQuery element
     */
    function HSHeaderMomentShowHideObserver(element) {
      if (!HSAbstractObserver.call(this, element)) return

      this.init()
    }

    /**
     *
     *
     * @return Object
     */
    HSHeaderMomentShowHideObserver.prototype.init = function () {
      this.direction = 'down'
      this.delta = 0
      this.defaultState = true

      this.offset = isFinite(this.element.data('header-fix-moment')) && this.element.data('header-fix-moment') !== 0 ? this.element.data('header-fix-moment') : 5
      this.effect = this.element.data('header-fix-effect') ? this.element.data('header-fix-effect') : 'show-hide'

      return this
    }

    /**
     *
     *
     * @return Object
     */
    HSHeaderMomentShowHideObserver.prototype.destroy = function () {
      this.toDefaultState()

      return this
    }

    /**
     *
     *
     * @param
     *
     * @return Object
     */
    HSHeaderMomentShowHideObserver.prototype.checkDirection = function () {

      if ($(window).scrollTop() > this.delta) {
        this.direction = 'down'
      }
      else {
        this.direction = 'up'
      }

      this.delta = $(window).scrollTop()

      return this

    }

    /**
     *
     *
     * @return Object
     */
    HSHeaderMomentShowHideObserver.prototype.toDefaultState = function () {

      switch (this.effect) {
        case 'slide':
          this.element.removeClass('u-header--moved-up')
          break

        case 'fade':
          this.element.removeClass('u-header--faded')
          break

        default:
          this.element.removeClass('u-header--invisible')
      }

      this.defaultState = !this.defaultState

      return this
    }

    /**
     *
     *
     * @return Object
     */
    HSHeaderMomentShowHideObserver.prototype.changeState = function () {

      switch (this.effect) {
        case 'slide':
          this.element.addClass('u-header--moved-up')
          break

        case 'fade':
          this.element.addClass('u-header--faded')
          break

        default:
          this.element.addClass('u-header--invisible')
      }

      this.defaultState = !this.defaultState

      return this
    }

    /**
     *
     *
     * @return Object
     */
    HSHeaderMomentShowHideObserver.prototype.check = function () {

      var docScrolled = $(window).scrollTop()
      this.checkDirection()


      if (docScrolled >= this.offset && this.defaultState && this.direction === 'down') {
        this.changeState()
      }
      else if (!this.defaultState && this.direction === 'up') {
        this.toDefaultState()
      }

      return this

    }

    /**
     *
     *
     * @param
     *
     * @return
     */
    function HSHeaderShowHideObserver(element) {
      if (!HSAbstractObserver.call(this, element)) return

      this.init()
    }

    /**
     *
     *
     * @param
     *
     * @return Object
     */
    HSHeaderShowHideObserver.prototype.init = function () {
      if (!this.defaultState && $(window).scrollTop() > this.offset) return this

      this.defaultState = true
      this.transitionDuration = parseFloat(getComputedStyle(this.element.get(0))['transition-duration'], 10) * 1000

      this.offset = isFinite(this.element.data('header-fix-moment')) && this.element.data('header-fix-moment') > this.element.outerHeight() ? this.element.data('header-fix-moment') : this.element.outerHeight() + 100
      this.effect = this.element.data('header-fix-effect') ? this.element.data('header-fix-effect') : 'show-hide'

      return this
    }

    /**
     *
     *
     * @param
     *
     * @return Object
     */
    HSHeaderShowHideObserver.prototype.destroy = function () {
      if (!this.defaultState && $(window).scrollTop() > this.offset) return this

      this.element.removeClass('u-header--untransitioned')
      this._removeCap()

      return this
    }

    /**
     *
     *
     * @param
     *
     * @return
     */
    HSHeaderShowHideObserver.prototype._insertCap = function () {

      this.element.addClass('js-header-fix-moment u-header--untransitioned')

      if (this.element.hasClass('u-header--static')) {

        $('html').css('padding-top', this.element.outerHeight())

      }

      switch (this.effect) {
        case 'fade':
          this.element.addClass('u-header--faded')
          break

        case 'slide':
          this.element.addClass('u-header--moved-up')
          break

        default:
          this.element.addClass('u-header--invisible')
      }

      this.capInserted = true

    }

    /**
     *
     *
     * @param
     *
     * @return
     */
    HSHeaderShowHideObserver.prototype._removeCap = function () {

      var self = this

      this.element.removeClass('js-header-fix-moment')

      if (this.element.hasClass('u-header--static')) {

        $('html').css('padding-top', 0)

      }

      if (this.removeCapTimeOutId) clearTimeout(this.removeCapTimeOutId)

      this.removeCapTimeOutId = setTimeout(function () {
        self.element.removeClass('u-header--moved-up u-header--faded u-header--invisible')
      }, 10)

      this.capInserted = false

    }


    /**
     *
     *
     * @param
     *
     * @return
     */
    HSHeaderShowHideObserver.prototype.check = function () {

      var $w = $(window)

      if ($w.scrollTop() > this.element.outerHeight() && !this.capInserted) {
        this._insertCap()
      }
      else if ($w.scrollTop() <= this.element.outerHeight() && this.capInserted) {
        this._removeCap()
      }

      if ($w.scrollTop() > this.offset && this.defaultState) {
        this.changeState()
      }
      else if ($w.scrollTop() <= this.offset && !this.defaultState) {
        this.toDefaultState()
      }

    }

    /**
     *
     *
     * @param
     *
     * @return
     */
    HSHeaderShowHideObserver.prototype.changeState = function () {

      this.element.removeClass('u-header--untransitioned')

      if (this.animationTimeoutId) clearTimeout(this.animationTimeoutId)

      switch (this.effect) {
        case 'fade':
          this.element.removeClass('u-header--faded')
          break

        case 'slide':
          this.element.removeClass('u-header--moved-up')
          break

        default:
          this.element.removeClass('u-header--invisible')
      }

      this.defaultState = !this.defaultState

    }

    /**
     *
     *
     * @param
     *
     * @return
     */
    HSHeaderShowHideObserver.prototype.toDefaultState = function () {

      var self = this

      this.animationTimeoutId = setTimeout(function () {
        self.element.addClass('u-header--untransitioned')
      }, this.transitionDuration)


      switch (this.effect) {
        case 'fade':
          this.element.addClass('u-header--faded')
          break
        case 'slide':
          this.element.addClass('u-header--moved-up')
          break
        default:
          this.element.addClass('u-header--invisible')
      }

      this.defaultState = !this.defaultState

    }

    /**
     *
     *
     * @param
     *
     * @return
     */
    function HSHeaderChangeLogoObserver(element, config) {

      if (!HSAbstractObserver.call(this, element)) return

      this.config = {
        fixPointSelf: false
      }

      if (config && $.isPlainObject(config)) this.config = $.extend(true, {}, this.config, config)

      this.init()

    }

    /**
     *
     *
     * @param
     *
     * @return
     */
    HSHeaderChangeLogoObserver.prototype.init = function () {

      if (this.element.hasClass('js-header-fix-moment')) {
        this.hasFixedClass = true
        this.element.removeClass('js-header-fix-moment')
      }
      if (this.config.fixPointSelf) {
        this.offset = this.element.offset().top
      }
      else {
        this.offset = isFinite(this.element.data('header-fix-moment')) ? this.element.data('header-fix-moment') : 0
      }
      if (this.hasFixedClass) {
        this.hasFixedClass = false
        this.element.addClass('js-header-fix-moment')
      }

      this.imgs = this.element.find('.u-header__logo-img')
      this.defaultState = true

      this.mainLogo = this.imgs.filter('.u-header__logo-img--main')
      this.additionalLogo = this.imgs.not('.u-header__logo-img--main')

      if (!this.imgs.length) return this

      return this
    }

    /**
     *
     *
     * @param
     *
     * @return
     */
    HSHeaderChangeLogoObserver.prototype.destroy = function () {
      this.toDefaultState()

      return this
    }

    /**
     *
     *
     * @param
     *
     * @return
     */
    HSHeaderChangeLogoObserver.prototype.check = function () {

      var $w = $(window)

      if (!this.imgs.length) return this

      if ($w.scrollTop() > this.offset && this.defaultState) {
        this.changeState()
      }
      else if ($w.scrollTop() <= this.offset && !this.defaultState) {
        this.toDefaultState()
      }

      return this

    }

    /**
     *
     *
     * @param
     *
     * @return
     */
    HSHeaderChangeLogoObserver.prototype.changeState = function () {

      if (this.mainLogo.length) {
        this.mainLogo.removeClass('u-header__logo-img--main')
      }
      if (this.additionalLogo.length) {
        this.additionalLogo.addClass('u-header__logo-img--main')
      }

      this.defaultState = !this.defaultState

      return this
    }

    /**
     *
     *
     * @param
     *
     * @return
     */
    HSHeaderChangeLogoObserver.prototype.toDefaultState = function () {

      if (this.mainLogo.length) {
        this.mainLogo.addClass('u-header__logo-img--main')
      }
      if (this.additionalLogo.length) {
        this.additionalLogo.removeClass('u-header__logo-img--main')
      }

      this.defaultState = !this.defaultState

      return this
    }

    /**
     *
     *
     * @param
     *
     * @return
     */
    function HSHeaderHideSectionObserver(element) {
      if (!HSAbstractObserver.call(this, element)) return

      this.init()
    }

    /**
     *
     *
     * @param
     *
     * @return Object
     */
    HSHeaderHideSectionObserver.prototype.init = function () {

      this.offset = isFinite(this.element.data('header-fix-moment')) ? this.element.data('header-fix-moment') : 5
      this.section = this.element.find('.u-header__section--hidden')
      this.defaultState = true

      this.sectionHeight = this.section.length ? this.section.outerHeight() : 0


      return this

    }

    /**
     *
     *
     * @param
     *
     * @return
     */
    HSHeaderHideSectionObserver.prototype.destroy = function () {

      if (this.section.length) {

        this.element.css({
          'margin-top': 0
        })

      }

      return this

    }

    /**
     *
     *
     * @param
     *
     * @return
     */
    HSHeaderHideSectionObserver.prototype.check = function () {

      if (!this.section.length) return this

      var $w = $(window),
        docScrolled = $w.scrollTop()

      if (docScrolled > this.offset && this.defaultState) {
        this.changeState()
      }
      else if (docScrolled <= this.offset && !this.defaultState) {
        this.toDefaultState()
      }

      return this

    }

    /**
     *
     *
     * @param
     *
     * @return
     */
    HSHeaderHideSectionObserver.prototype.changeState = function () {

      var self = this

      this.element.stop().animate({
        'margin-top': self.sectionHeight * -1 - 1 // last '-1' is a small fix
      })

      this.defaultState = !this.defaultState
      return this

    }

    /**
     *
     *
     * @param
     *
     * @return
     */
    HSHeaderHideSectionObserver.prototype.toDefaultState = function () {

      this.element.stop().animate({
        'margin-top': 0
      })

      this.defaultState = !this.defaultState
      return this

    }

    /**
     *
     *
     * @param
     *
     * @return
     */
    function HSHeaderChangeAppearanceObserver(element, config) {
      if (!HSAbstractObserver.call(this, element)) return

      this.config = {
        fixPointSelf: false
      }

      if (config && $.isPlainObject(config)) this.config = $.extend(true, {}, this.config, config)

      this.init()
    }

    /**
     *
     *
     * @param
     *
     * @return
     */
    HSHeaderChangeAppearanceObserver.prototype.init = function () {

      if (this.element.hasClass('js-header-fix-moment')) {
        this.hasFixedClass = true
        this.element.removeClass('js-header-fix-moment')
      }

      if (this.config.fixPointSelf) {
        this.offset = this.element.offset().top
      }
      else {
        this.offset = isFinite(this.element.data('header-fix-moment')) ? this.element.data('header-fix-moment') : 5
      }

      if (this.hasFixedClass) {
        this.hasFixedClass = false
        this.element.addClass('js-header-fix-moment')
      }

      this.sections = this.element.find('[data-header-fix-moment-classes]')

      this.defaultState = true


      return this

    }

    /**
     *
     *
     * @param
     *
     * @return
     */
    HSHeaderChangeAppearanceObserver.prototype.destroy = function () {

      this.toDefaultState()

      return this

    }

    /**
     *
     *
     * @param
     *
     * @return
     */
    HSHeaderChangeAppearanceObserver.prototype.check = function () {

      if (!this.sections.length) return this

      var $w = $(window),
        docScrolled = $w.scrollTop()

      if (docScrolled > this.offset && this.defaultState) {
        this.changeState()
      }
      else if (docScrolled <= this.offset && !this.defaultState) {
        this.toDefaultState()
      }

      return this

    }

    /**
     *
     *
     * @param
     *
     * @return
     */
    HSHeaderChangeAppearanceObserver.prototype.changeState = function () {

      this.sections.each(function (i, el) {

        var $this = $(el),
          classes = $this.data('header-fix-moment-classes'),
          exclude = $this.data('header-fix-moment-exclude')

        if (!classes && !exclude) return

        $this.addClass(classes + ' js-header-change-moment')
        $this.removeClass(exclude)

      })

      this.defaultState = !this.defaultState
      return this

    }

    /**
     *
     *
     * @param
     *
     * @return
     */
    HSHeaderChangeAppearanceObserver.prototype.toDefaultState = function () {

      this.sections.each(function (i, el) {

        var $this = $(el),
          classes = $this.data('header-fix-moment-classes'),
          exclude = $this.data('header-fix-moment-exclude')

        if (!classes && !exclude) return

        $this.removeClass(classes + ' js-header-change-moment')
        $this.addClass(exclude)

      })

      this.defaultState = !this.defaultState
      return this

    }

    /**
     *
     *
     * @param
     *
     * @return
     */
    function HSHeaderHasHiddenElement(element, config) {
      if (!HSAbstractObserver.call(this, element)) return

      this.config = {
        animated: true
      }

      if (config && $.isPlainObject(config)) this.config = $.extend(true, {}, this.config, config)

      this.init()
    }

    /**
     *
     *
     * @param
     *
     * @return
     */
    HSHeaderHasHiddenElement.prototype.init = function () {
      this.offset = isFinite(this.element.data('header-fix-moment')) ? this.element.data('header-fix-moment') : 5
      this.elements = this.element.find('.u-header--hidden-element')
      this.defaultState = true
      return this
    }

    /**
     *
     *
     * @param
     *
     * @return
     */
    HSHeaderHasHiddenElement.prototype.destroy = function () {

      this.toDefaultState()

      return this

    }

    /**
     *
     *
     * @param
     *
     * @return
     */
    HSHeaderHasHiddenElement.prototype.check = function () {

      if (!this.elements.length) return this

      var $w = $(window),
        docScrolled = $w.scrollTop()

      if (docScrolled > this.offset && this.defaultState) {
        this.changeState()
      }
      else if (docScrolled <= this.offset && !this.defaultState) {
        this.toDefaultState()
      }

      return this

    }

    /**
     *
     *
     * @param
     *
     * @return
     */
    HSHeaderHasHiddenElement.prototype.changeState = function () {

      if (this.config.animated) {
        this.elements.stop().slideUp()
      }
      else {
        this.elements.hide()
      }

      this.defaultState = !this.defaultState
      return this

    }

    /**
     *
     *
     * @param
     *
     * @return
     */
    HSHeaderHasHiddenElement.prototype.toDefaultState = function () {

      if (this.config.animated) {
        this.elements.stop().slideDown()
      }
      else {
        this.elements.show()
      }

      this.defaultState = !this.defaultState
      return this

    }

    /**
     *
     *
     * @param
     *
     * @return
     */
    function HSHeaderFloatingObserver(element, config) {
      if (!HSAbstractObserver.call(this, element)) return

      this.config = config && $.isPlainObject(config) ? $.extend(true, {}, this.config, config) : {}
      this.init()
    }

    /**
     *
     *
     * @param
     *
     * @return
     */
    HSHeaderFloatingObserver.prototype.init = function () {

      this.offset = this.element.offset().top
      this.sections = this.element.find('.u-header__section')

      this.defaultState = true

      return this

    }

    /**
     *
     *
     * @param
     *
     * @return
     */
    HSHeaderFloatingObserver.prototype.destroy = function () {

      this.toDefaultState()

      return this

    }

    /**
     *
     *
     * @param
     *
     * @return
     */
    HSHeaderFloatingObserver.prototype.check = function () {

      var $w = $(window),
        docScrolled = $w.scrollTop()

      if (docScrolled > this.offset && this.defaultState) {
        this.changeState()
      }
      else if (docScrolled <= this.offset && !this.defaultState) {
        this.toDefaultState()
      }

      return this

    }

    /**
     *
     *
     * @param
     *
     * @return
     */
    HSHeaderFloatingObserver.prototype.changeState = function () {

      this.element
        .addClass('js-header-fix-moment')
        .addClass(this.element.data('header-fix-moment-classes'))
        .removeClass(this.element.data('header-fix-moment-exclude'))

      if (this.sections.length) {
        this.sections.each(function (i, el) {

          var $section = $(el)

          $section.addClass($section.data('header-fix-moment-classes'))
            .removeClass($section.data('header-fix-moment-exclude'))

        })
      }

      this.defaultState = !this.defaultState
      return this

    }

    /**
     *
     *
     * @param
     *
     * @return
     */
    HSHeaderFloatingObserver.prototype.toDefaultState = function () {

      this.element
        .removeClass('js-header-fix-moment')
        .removeClass(this.element.data('header-fix-moment-classes'))
        .addClass(this.element.data('header-fix-moment-exclude'))

      if (this.sections.length) {
        this.sections.each(function (i, el) {

          var $section = $(el)

          $section.removeClass($section.data('header-fix-moment-classes'))
            .addClass($section.data('header-fix-moment-exclude'))

        })
      }

      this.defaultState = !this.defaultState
      return this

    }


    /**
     *
     *
     * @param
     *
     * @return
     */
    function HSHeaderWithoutBehaviorObserver(element) {
      if (!HSAbstractObserver.call(this, element)) return
    }

    HSHeaderWithoutBehaviorObserver.prototype.check = function () {
      return this
    }

    HSHeaderWithoutBehaviorObserver.prototype.init = function () {
      return this
    }

    HSHeaderWithoutBehaviorObserver.prototype.destroy = function () {
      return this
    }

    HSHeaderWithoutBehaviorObserver.prototype.changeState = function () {
      return this
    }

    HSHeaderWithoutBehaviorObserver.prototype.toDefaultState = function () {
      return this
    }


  })(jQuery)

  /**
 * Unfold Content component.
 *
 * @author Htmlstream
 * @version 1.0
 */
  ;
(function ($) {
  'use strict'

  $.HSCore.components.HSUnfold = {

    /**
     * Base configuration of the component.
     *
     * @private
     */
    _baseConfig: {
      unfoldEvent: 'click',
      unfoldType: 'simple',
      unfoldDuration: 300,
      unfoldEasing: 'linear',
      unfoldAnimationIn: 'fadeIn',
      unfoldAnimationOut: 'fadeOut',
      unfoldHideOnScroll: true,
      unfoldHideOnBlur: false,
      unfoldDelay: 350,
      afterOpen: function (invoker) {},
      beforeClose: function (invoker) {},
      afterClose: function (invoker) {}
    },

    /**
     * Collection of all initialized items on the page.
     *
     * @private
     */
    _pageCollection: $(),

    /**
     * Initialization.
     *
     * @param {jQuery} collection
     * @param {Object} config
     *
     * @public
     * @return {jQuery}
     */
    init: function (collection, config) {

      var self

      if (!collection || !collection.length) return

      self = this

      var fieldsQty

      collection.each(function (i, el) {

        var $this = $(el), itemConfig

        if ($this.data('HSUnfold')) return

        itemConfig = config && $.isPlainObject(config) ?
          $.extend(true, {}, self._baseConfig, config, $this.data()) :
          $.extend(true, {}, self._baseConfig, $this.data())

        switch (itemConfig.unfoldType) {

          case 'css-animation':

            $this.data('HSUnfold', new UnfoldCSSAnimation($this, itemConfig))

            break

          case 'jquery-slide':

            $this.data('HSUnfold', new UnfoldJSlide($this, itemConfig))

            break

          default:

            $this.data('HSUnfold', new UnfoldSimple($this, itemConfig))

        }

        self._pageCollection = self._pageCollection.add($this)
        self._bindEvents($this, itemConfig.unfoldEvent, itemConfig.unfoldDelay)
        var UnFold = $(el).data('HSUnfold')

        fieldsQty = $(UnFold.target).find('input, textarea').length

        if ($(UnFold.target).find('[data-unfold-target]').length) {

          $this.addClass('target-of-invoker-has-unfolds')

        }

      })


      var items,
        index = 0

      $(document).on('keydown.HSUnfold', function (e) {

        if (e.keyCode && e.keyCode === 27) {

          self._pageCollection.each(function (i, el) {

            var windW = window.innerWidth,
              optIsMobileOnly = Boolean($(el).data('is-mobile-only'))

            items = $($($(el).data('unfold-target')).children())

            if (!optIsMobileOnly) {

              $(el).data('HSUnfold').hide()

            } else if (optIsMobileOnly && windW < 769) {

              $(el).data('HSUnfold').hide()

            }

            $(el).data('HSUnfold').config.beforeClose.call(self.target, self.element)

          })

        }

        self._pageCollection.each(function (i, el) {
          if (!$($(el).data('unfold-target')).hasClass('u-unfold--hidden')) {

            items = $($($(el).data('unfold-target')).children())

          }
        })

        if (e.keyCode && e.keyCode === 38 || e.keyCode && e.keyCode === 40) {
          e.preventDefault()
        }

        if (e.keyCode && e.keyCode === 38 && index > 0) {
          // up
          index--
        }

        if (e.keyCode && e.keyCode === 40 && index < items.length - 1) {
          // down
          index++
        }

        if (index < 0) {
          index = 0
        }

        if (e.keyCode && e.keyCode === 38 || e.keyCode && e.keyCode === 40) {
          $(items[index]).focus()
        }
      })

      $(window).on('click', function () {

        self._pageCollection.each(function (i, el) {

          var windW = window.innerWidth,
            optIsMobileOnly = Boolean($(el).data('is-mobile-only'))

          if (!optIsMobileOnly) {

            $(el).data('HSUnfold').hide()

          } else if (optIsMobileOnly && windW < 769) {

            $(el).data('HSUnfold').hide()

          }

          $(el).data('HSUnfold').config.beforeClose.call(self.target, self.element)

        })

      })

      self._pageCollection.each(function (i, el) {

        var target = $(el).data('HSUnfold').config.unfoldTarget

        $(target).on('click', function (e) {

          e.stopPropagation()

        })

      })

      $(window).on('scroll.HSUnfold', function () {

        self._pageCollection.each(function (i, el) {

          var UnFold = $(el).data('HSUnfold')

          if (UnFold.getOption('unfoldHideOnScroll') && fieldsQty === 0) {

            UnFold.hide()

          } else if (UnFold.getOption('unfoldHideOnScroll') && !(/iPhone|iPad|iPod/i.test(navigator.userAgent))) {

            UnFold.hide()

          }

        })

      })

      $(window).on('resize.HSUnfold', function () {

        if (self._resizeTimeOutId) clearTimeout(self._resizeTimeOutId)

        self._resizeTimeOutId = setTimeout(function () {

          self._pageCollection.each(function (i, el) {

            var UnFold = $(el).data('HSUnfold')

            UnFold.smartPosition(UnFold.target)

          })

        }, 50)

      })

      return collection

    },

    /**
     * Binds necessary events.
     *
     * @param {jQuery} $invoker
     * @param {String} eventType
     * @param {Number} delay
     * @private
     */
    _bindEvents: function ($invoker, eventType, delay) {

      var $unfold = $($invoker.data('unfold-target'))

      if (eventType === 'hover' && !_isTouch()) {

        $invoker.on('mouseenter.HSUnfold', function () {

          var $invoker = $(this),
            HSUnfold = $invoker.data('HSUnfold')

          if (!HSUnfold) return

          if (HSUnfold.unfoldTimeOut) clearTimeout(HSUnfold.unfoldTimeOut)
          HSUnfold.show()

        })
          .on('mouseleave.HSUnfold', function () {

            var $invoker = $(this),
              HSUnfold = $invoker.data('HSUnfold')

            if (!HSUnfold) return

            HSUnfold.unfoldTimeOut = setTimeout(function () {

              HSUnfold.hide()

            }, delay)

          })

        if ($unfold.length) {

          $unfold.on('mouseenter.HSUnfold', function () {

            var HSUnfold = $invoker.data('HSUnfold')

            if (HSUnfold.unfoldTimeOut) clearTimeout(HSUnfold.unfoldTimeOut)
            HSUnfold.show()

          })
            .on('mouseleave.HSUnfold', function () {

              var HSUnfold = $invoker.data('HSUnfold')

              HSUnfold.unfoldTimeOut = setTimeout(function () {
                HSUnfold.hide()
              }, delay)

            })
        }

      }
      else {

        $invoker.on('click.HSUnfold', function (e) {

          var $curInvoker = $(this),
            $unfoldNotHasInnerUnfolds = $('[data-unfold-target].active:not(.target-of-invoker-has-unfolds)'),
            $unfoldHasInnerUnfold = $('[data-unfold-target].active.target-of-invoker-has-unfolds')

          if (!$curInvoker.data('HSUnfold')) return

          if (!$curInvoker.hasClass('target-of-invoker-has-unfolds')) {

            if ($unfoldNotHasInnerUnfolds.length) {

              $unfoldNotHasInnerUnfolds.data('HSUnfold').toggle()

            }

          } else {

            if ($unfoldHasInnerUnfold.length) {

              $unfoldHasInnerUnfold.data('HSUnfold').toggle()

            }

          }

          $curInvoker.data('HSUnfold').toggle()

          $($($curInvoker.data('unfold-target')).children()[0]).trigger('focus')

          e.stopPropagation()
          e.preventDefault()

        })

      }

    }
  }

  function _isTouch() {
    return 'ontouchstart' in window
  }

  /**
   * Abstract Unfold class.
   *
   * @param {jQuery} element
   * @param {Object} config
   * @abstract
   */
  function AbstractUnfold(element, config) {

    if (!element.length) return false

    this.element = element
    this.config = config

    this.target = $(this.element.data('unfold-target'))

    this.allInvokers = $('[data-unfold-target="' + this.element.data('unfold-target') + '"]')

    this.toggle = function () {
      if (!this.target.length) return this

      if (this.defaultState) {
        this.show()
      }
      else {
        this.hide()
      }

      return this
    }

    this.smartPosition = function (target) {

      if (target.data('baseDirection')) {
        target.css(
          target.data('baseDirection').direction,
          target.data('baseDirection').value
        )
      }

      target.removeClass('u-unfold--reverse-y')

      var $w = $(window),
        styles = getComputedStyle(target.get(0)),
        direction = Math.abs(parseInt(styles.left, 10)) < 40 ? 'left' : 'right',
        targetOuterGeometry = target.offset()

      // horizontal axis
      if (direction === 'right') {

        if (!target.data('baseDirection')) target.data('baseDirection', {
          direction: 'right',
          value: parseInt(styles.right, 10)
        })

        if (targetOuterGeometry.left < 0) {

          target.css(
            'right',
            (parseInt(target.css('right'), 10) - (targetOuterGeometry.left - 10)) * -1
          )

        }

      }
      else {

        if (!target.data('baseDirection')) target.data('baseDirection', {
          direction: 'left',
          value: parseInt(styles.left, 10)
        })

        if (targetOuterGeometry.left + target.outerWidth() > $w.width()) {

          target.css(
            'left',
            (parseInt(target.css('left'), 10) - (targetOuterGeometry.left + target.outerWidth() + 10 - $w.width()))
          )

        }

      }

      // vertical axis
      if (targetOuterGeometry.top + target.outerHeight() - $w.scrollTop() > $w.height()) {

        target.addClass('u-unfold--reverse-y')

      }

    }

    this.getOption = function (option) {
      return this.config[option] ? this.config[option] : null
    }

    return true
  }


  /**
   * UnfoldSimple constructor.
   *
   * @param {jQuery} element
   * @param {Object} config
   * @constructor
   */
  function UnfoldSimple(element, config) {
    if (!AbstractUnfold.call(this, element, config)) return

    Object.defineProperty(this, 'defaultState', {
      get: function () {
        return this.target.hasClass('u-unfold--hidden')
      }
    })

    this.target.addClass('u-unfold--simple')

    this.hide()
  }

  /**
   * Shows Unfold.
   *
   * @public
   * @return {UnfoldSimple}
   */
  UnfoldSimple.prototype.show = function () {

    var activeEls = $(this)[0].config.unfoldTarget

    $('[data-unfold-target="' + activeEls + '"]').addClass('active')

    this.smartPosition(this.target)

    this.target.removeClass('u-unfold--hidden')
    if (this.allInvokers.length) this.allInvokers.attr('aria-expanded', 'true')
    this.config.afterOpen.call(this.target, this.element)

    return this
  }

  /**
   * Hides Unfold.
   *
   * @public
   * @return {UnfoldSimple}
   */
  UnfoldSimple.prototype.hide = function () {

    var activeEls = $(this)[0].config.unfoldTarget

    $('[data-unfold-target="' + activeEls + '"]').removeClass('active')

    this.target.addClass('u-unfold--hidden')
    if (this.allInvokers.length) this.allInvokers.attr('aria-expanded', 'false')
    this.config.afterClose.call(this.target, this.element)

    return this
  }

  /**
   * UnfoldCSSAnimation constructor.
   *
   * @param {jQuery} element
   * @param {Object} config
   * @constructor
   */
  function UnfoldCSSAnimation(element, config) {
    if (!AbstractUnfold.call(this, element, config)) return

    var self = this

    this.target
      .addClass('u-unfold--css-animation u-unfold--hidden')
      .css('animation-duration', self.config.unfoldDuration + 'ms')

    Object.defineProperty(this, 'defaultState', {
      get: function () {
        return this.target.hasClass('u-unfold--hidden')
      }
    })

    if (this.target.length) {

      this.target.on('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function (e) {

        if (self.target.hasClass(self.config.unfoldAnimationOut)) {

          self.target.removeClass(self.config.unfoldAnimationOut)
            .addClass('u-unfold--hidden')


          if (self.allInvokers.length) self.allInvokers.attr('aria-expanded', 'false')

          self.config.afterClose.call(self.target, self.element)
        }

        if (self.target.hasClass(self.config.unfoldAnimationIn)) {

          if (self.allInvokers.length) self.allInvokers.attr('aria-expanded', 'true')

          self.config.afterOpen.call(self.target, self.element)
        }

        e.preventDefault()
        e.stopPropagation()
      })

    }
  }

  /**
   * Shows Unfold.
   *
   * @public
   * @return {UnfoldCSSAnimation}
   */
  UnfoldCSSAnimation.prototype.show = function () {

    var activeEls = $(this)[0].config.unfoldTarget

    $('[data-unfold-target="' + activeEls + '"]').addClass('active')

    this.smartPosition(this.target)

    this.target.removeClass('u-unfold--hidden')
      .removeClass(this.config.unfoldAnimationOut)
      .addClass(this.config.unfoldAnimationIn)

  }

  /**
   * Hides Unfold.
   *
   * @public
   * @return {UnfoldCSSAnimation}
   */
  UnfoldCSSAnimation.prototype.hide = function () {

    var activeEls = $(this)[0].config.unfoldTarget

    $('[data-unfold-target="' + activeEls + '"]').removeClass('active')

    this.target.removeClass(this.config.unfoldAnimationIn)
      .addClass(this.config.unfoldAnimationOut)

  }

  /**
   * UnfoldSlide constructor.
   *
   * @param {jQuery} element
   * @param {Object} config
   * @constructor
   */
  function UnfoldJSlide(element, config) {
    if (!AbstractUnfold.call(this, element, config)) return

    this.target.addClass('u-unfold--jquery-slide u-unfold--hidden').hide()

    Object.defineProperty(this, 'defaultState', {
      get: function () {
        return this.target.hasClass('u-unfold--hidden')
      }
    })
  }

  /**
   * Shows Unfold.
   *
   * @public
   * @return {UnfoldJSlide}
   */
  UnfoldJSlide.prototype.show = function () {

    var self = this

    var activeEls = $(this)[0].config.unfoldTarget

    $('[data-unfold-target="' + activeEls + '"]').addClass('active')

    this.smartPosition(this.target)

    this.target.removeClass('u-unfold--hidden').stop().slideDown({
      duration: self.config.unfoldDuration,
      easing: self.config.unfoldEasing,
      complete: function () {
        self.config.afterOpen.call(self.target, self.element)
      }
    })

  }

  /**
   * Hides Unfold.
   *
   * @public
   * @return {UnfoldJSlide}
   */
  UnfoldJSlide.prototype.hide = function () {

    var self = this

    var activeEls = $(this)[0].config.unfoldTarget

    $('[data-unfold-target="' + activeEls + '"]').removeClass('active')

    this.target.slideUp({
      duration: self.config.unfoldDuration,
      easing: self.config.unfoldEasing,
      complete: function () {
        self.config.afterClose.call(self.target, self.element)
        self.target.addClass('u-unfold--hidden')
      }
    })

  }

})(jQuery)


  /**
   * Focus state helper-wrapper.
   *
   * @author Htmlstream
   * @version 1.0
   *
   */
  ; (function ($) {
    'use strict'

    $.HSCore.helpers.HSFocusState = {
      /**
       * Focus state.
       *
       * @return undefined
       */
      init: function () {
        var collection = $('.js-focus-state input:not([type="checkbox"], [type="radio"]), .js-focus-state textarea, .js-focus-state select')

        if (!collection.length) return

        collection.on('focusin', function () {
          var $this = $(this),
            $thisParent = $this.closest('.js-focus-state')

          $thisParent.addClass('u-focus-state')
        })

        collection.on('focusout', function () {
          var $this = $(this),
            $thisParent = $this.closest('.js-focus-state')

          $thisParent.removeClass('u-focus-state')
        })
      }
    }
  })(jQuery)

  /**
   * HSMalihuScrollBar component.
   *
   * @author Htmlstream
   * @version 1.0
   * @requires malihu jquery custom scrollbar plugin (v3.1.5.)
   *
   */
  ; (function ($) {
    'use strict'

    $.HSCore.components.HSMalihuScrollBar = {

      /**
       * Base configuration.
       *
       * @private
       */
      _baseConfig: {
        scrollInertia: 150,
        theme: 'minimal-dark'
      },

      /**
       * Collection of all initalized items on the page.
       *
       * @private
       */
      _pageCollection: $(),


      /**
       * Initialization of HSMalihuScrollBar component.
       *
       * @param {jQuery} collection
       * @param {Object} config
       *
       * @return {jQuery}
       */
      init: function (collection, config) {

        if (!collection || !collection.length) return

        var self = this

        config = config && $.isPlainObject(config) ? $.extend(true, {}, config, this._baseConfig) : this._baseConfig

        return collection.each(function (i, el) {

          var $this = $(el),
            scrollBar,
            scrollBarThumb,
            itemConfig = $.extend(true, {}, config, $this.data())


          $this.mCustomScrollbar(itemConfig)

          scrollBar = $this.find('.mCSB_scrollTools')
          scrollBarThumb = $this.find('.mCSB_dragger_bar')

          if (scrollBar.length && $this.data('scroll-classes')) {
            scrollBar.addClass($this.data('scroll-classes'))
          }

          if (scrollBarThumb.length && $this.data('scroll-thumb-classes')) {
            scrollBarThumb.addClass($this.data('scroll-thumb-classes'))
          }

          self._pageCollection = self._pageCollection.add($this)

        })

      },

      /**
       * Destroys the component.
       *
       * @param {jQuery} collection
       *
       * @return {jQuery}
       */
      destroy: function (collection) {

        if (!collection && !collection.length) return $()

        var _self = this

        return collection.each(function (i, el) {

          var $this = $(el)

          $this.mCustomScrollbar('destroy')

          _self._pageCollection = _self._pageCollection.not($this)

        })

      }

    }

  })(jQuery)

  /**
 * Fancybox wrapper.
 *
 * @author Htmlstream
 * @version 1.0
 * @requires
 *
 */
  ;
(function ($) {
  'use strict'

  $.HSCore.components.HSFancyBox = {
    /**
     *
     *
     * @var Object _baseConfig
     */
    _baseConfig: {
      parentEl: 'html',
      baseClass: 'u-fancybox-theme',
      slideClass: 'u-fancybox-slide',
      speed: 1000,
      slideSpeedCoefficient: 1,
      infobar: false,
      fullScreen: true,
      thumbs: true,
      closeBtn: true,
      baseTpl: '<div class="fancybox-container" role="dialog" tabindex="-1">' +
        '<div class="fancybox-content">' +
        '<div class="fancybox-bg"></div>' +
        '<div class="fancybox-controls" style="position: relative; z-index: 99999;">' +
        '<div class="fancybox-infobar">' +
        '<div class="fancybox-infobar__body">' +
        '<span data-fancybox-index></span>&nbsp;/&nbsp;<span data-fancybox-count></span>' +
        '</div>' +
        '</div>' +
        '<div class="fancybox-toolbar">{{BUTTONS}}</div>' +
        '</div>' +
        '<div class="fancybox-slider-wrap">' +
        '<button data-fancybox-prev class="fancybox-arrow fancybox-arrow--left" title="Previous"></button>' +
        '<button data-fancybox-next class="fancybox-arrow fancybox-arrow--right" title="Next"></button>' +
        '<div class="fancybox-stage"></div>' +
        '</div>' +
        '<div class="fancybox-caption-wrap">' +
        '<div class="fancybox-caption"></div>' +
        '</div>' +
        '</div>' +
        '</div>',
      animationEffect: 'fade'
    },

    /**
     *
     *
     * @var jQuery pageCollection
     */
    pageCollection: $(),

    /**
     * Initialization of Fancybox wrapper.
     *
     * @param String selector (optional)
     * @param Object config (optional)
     *
     * @return jQuery pageCollection - collection of initialized items.
     */

    init: function (selector, config) {
      if (!selector) return

      var $collection = $(selector)

      if (!$collection.length) return

      config = config && $.isPlainObject(config) ? $.extend(true, {}, this._baseConfig, config) : this._baseConfig

      this.initFancyBox(selector, config)
    },

    initFancyBox: function (el, conf) {
      var $fancybox = $(el)

      $fancybox.on('click', function () {
        var $this = $(this),
          animationDuration = $this.data('speed'),
          isGroup = $this.data('fancybox'),
          isInfinite = Boolean($this.data('is-infinite')),
          slideShowSpeed = $this.data('slideshow-speed')

        $.fancybox.defaults.animationDuration = animationDuration

        if (isInfinite == true) {
          $.fancybox.defaults.loop = true
        }

        if (isGroup) {
          $.fancybox.defaults.transitionEffect = 'slide'
          $.fancybox.defaults.slideShow.speed = slideShowSpeed
        }
      })

      $fancybox.fancybox($.extend(true, {}, conf, {
        beforeShow: function (instance, slide) {
          var $fancyModal = $(instance.$refs.container),
            $fancyOverlay = $(instance.$refs.bg[0]),
            $fancySlide = $(instance.current.$slide),

            animateIn = instance.current.opts.$orig[0].dataset.animateIn,
            animateOut = instance.current.opts.$orig[0].dataset.animateOut,
            speed = instance.current.opts.$orig[0].dataset.speed,
            overlayBG = instance.current.opts.$orig[0].dataset.overlayBg,
            overlayBlurBG = instance.current.opts.$orig[0].dataset.overlayBlurBg

          if (animateIn && $('body').hasClass('u-first-slide-init')) {
            var $fancyPrevSlide = $(instance.slides[instance.prevPos].$slide)

            $fancySlide.addClass('has-animation')

            $fancyPrevSlide.addClass('animated ' + animateOut)

            setTimeout(function () {
              $fancySlide.addClass('animated ' + animateIn)
            }, speed / 2)
          } else if (animateIn) {
            var $fancyPrevSlide = $(instance.slides[instance.prevPos].$slide)

            $fancySlide.addClass('has-animation')

            $fancySlide.addClass('animated ' + animateIn)

            $('body').addClass('u-first-slide-init')

            $fancySlide.on('animationend webkitAnimationEnd oAnimationEnd MSAnimationEnd', function (e) {
              $fancySlide.removeClass(animateIn)
            })
          }

          if (speed) {
            $fancyOverlay.css('transition-duration', speed + 'ms')
          } else {
            $fancyOverlay.css('transition-duration', '1000ms')
          }

          if (overlayBG) {
            $fancyOverlay.css('background-color', overlayBG)
          }

          if (overlayBlurBG) {
            $('body').addClass('g-blur-30')
          }
        },

        beforeClose: function (instance, slide) {
          var $fancyModal = $(instance.$refs.container),
            $fancySlide = $(instance.current.$slide),

            animateIn = instance.current.opts.$orig[0].dataset.animateIn,
            animateOut = instance.current.opts.$orig[0].dataset.animateOut,
            overlayBlurBG = instance.current.opts.$orig[0].dataset.overlayBlurBg

          if (animateOut) {
            $fancySlide.removeClass(animateIn).addClass(animateOut)
            $('body').removeClass('u-first-slide-init')
          }

          if (overlayBlurBG) {
            $('body').removeClass('g-blur-30')
          }
        }
      }))
    }
  }
})(jQuery)

  /**
   * Slick Carousel wrapper.
   *
   * @author Htmlstream
   * @version 1.0
   * @requires
   *
   */
  ;
(function ($) {
  'use strict'

  $.HSCore.components.HSSlickCarousel = {
    /**
     *
     *
     * @var Object _baseConfig
     */
    _baseConfig: {
      autoplay: false,
      infinite: true
    },

    /**
     *
     *
     * @var jQuery pageCollection
     */
    pageCollection: $(),

    /**
     * Initialization of Slick Carousel wrapper.
     *
     * @param String selector (optional)
     * @param Object config (optional)
     *
     * @return jQuery pageCollection - collection of initialized items.
     */
    init: function (selector, config) {
      this.collection = selector && $(selector).length ? $(selector) : $()
      if (!$(selector).length) return

      this.config = config && $.isPlainObject(config) ?
        $.extend({}, this._baseConfig, config) : this._baseConfig

      this.config.itemSelector = selector

      this.initSlickCarousel()

      return this.pageCollection
    },

    initSlickCarousel: function () {
      //Variables
      var $self = this,
        config = $self.config,
        collection = $self.pageCollection

      //Actions
      this.collection.each(function (i, el) {
        //Variables
        var $this = $(el),
          id = $this.attr('id'),

          //Markup elements
          target = $this.data('nav-for'),
          isThumb = $this.data('is-thumbs'),
          arrowsClasses = $this.data('arrows-classes'),
          arrowLeftClasses = $this.data('arrow-left-classes'),
          arrowRightClasses = $this.data('arrow-right-classes'),
          pagiClasses = $this.data('pagi-classes'),
          pagiHelper = $this.data('pagi-helper'),
          $pagiIcons = $this.data('pagi-icons'),
          $prevMarkup = '<div class="js-prev ' + arrowsClasses + ' ' + arrowLeftClasses + '"></div>',
          $nextMarkup = '<div class="js-next ' + arrowsClasses + ' ' + arrowRightClasses + '"></div>',

          //Setters
          setSlidesToShow = $this.data('slides-show'),
          setSlidesToScroll = $this.data('slides-scroll'),
          setAutoplay = $this.data('autoplay'),
          setAnimation = $this.data('animation'),
          setEasing = $this.data('easing'),
          setFade = $this.data('fade'),
          setSpeed = $this.data('speed'),
          setSlidesRows = $this.data('rows'),
          setCenterMode = $this.data('center-mode'),
          setCenterPadding = $this.data('center-padding'),
          setPauseOnHover = $this.data('pause-hover'),
          setVariableWidth = $this.data('variable-width'),
          setInitialSlide = $this.data('initial-slide'),
          setVertical = $this.data('vertical'),
          setRtl = $this.data('rtl'),
          setInEffect = $this.data('in-effect'),
          setOutEffect = $this.data('out-effect'),
          setInfinite = $this.data('infinite'),
          setDataTitlePosition = $this.data('title-pos-inside'),
          setFocusOnSelect = $this.data('focus-on-select'),
          setLazyLoad = $this.data('lazy-load'),
          isAdaptiveHeight = $this.data('adaptive-height'),
          numberedPaging = $this.data('numbered-pagination'),
          setResponsive = JSON.parse(el.getAttribute('data-responsive'))

        if ($this.find('[data-slide-type]').length) {
          $self.videoSupport($this)
        }

        $this.on('init', function (event, slick) {
          $(slick.$slides).css('height', 'auto')

          if (isThumb && setSlidesToShow >= $(slick.$slides).length) {
            $this.addClass('slick-transform-off')
          }
        })

        $this.on('init', function (event, slick) {
          var slide = $(slick.$slides)[slick.currentSlide],
            animatedElements = $(slide).find('[data-scs-animation-in]')

          $(animatedElements).each(function () {
            var animationIn = $(this).data('scs-animation-in'),
              animationDelay = $(this).data('scs-animation-delay'),
              animationDuration = $(this).data('scs-animation-duration')

            $(this).css({
              'animation-delay': animationDelay + 'ms',
              'animation-duration': animationDuration + 'ms'
            })

            $(this).addClass('animated ' + animationIn).css('opacity', 1)
          })
        })

        if (setInEffect && setOutEffect) {
          $this.on('init', function (event, slick) {
            $(slick.$slides).addClass('single-slide')
          })
        }

        if (pagiHelper) {
          $this.on('init', function (event, slick) {
            var $pagination = $this.find('.js-pagination')

            if (!$pagination.length) return

            $pagination.append('<span class="u-dots-helper"></span>')
          })
        }

        if (isThumb) {
          $('#' + id).on('click', '.slick-slide', function (e) {
            e.stopPropagation()

            //Variables
            var i = $(this).data('slick-index')

            if ($('#' + id).slick('slickCurrentSlide') !== i) {
              $('#' + id).slick('slickGoTo', i)
            }
          })
        }

        $this.on('init', function (event, slider) {
          var $pagination = $this.find('.js-pagination')

          if (!$pagination.length) return

          $($pagination[0].children[0]).addClass('slick-current')
        })

        $this.on('init', function (event, slick) {
          var slide = $(slick.$slides)[0],
            animatedElements = $(slide).find('[data-scs-animation-in]')

          $(animatedElements).each(function () {
            var animationIn = $(this).data('scs-animation-in')

            $(this).addClass('animated ' + animationIn).css('opacity', 1)
          })
        })

        if (numberedPaging) {
          $this.on('init', function (event, slick) {
            $(numberedPaging).html('<span class="u-paging__current">1</span><span class="u-paging__divider"></span><span class="u-paging__total">' + slick.slideCount + '</span>')
          })
        }

        $this.slick({
          autoplay: setAutoplay ? true : false,
          autoplaySpeed: setSpeed ? setSpeed : 3000,

          cssEase: setAnimation ? setAnimation : 'ease',
          easing: setEasing ? setEasing : 'linear',
          fade: setFade ? true : false,

          infinite: setInfinite ? true : false,
          initialSlide: setInitialSlide ? setInitialSlide - 1 : 0,
          slidesToShow: setSlidesToShow ? setSlidesToShow : 1,
          slidesToScroll: setSlidesToScroll ? setSlidesToScroll : 1,
          centerMode: setCenterMode ? true : false,
          variableWidth: setVariableWidth ? true : false,
          pauseOnHover: setPauseOnHover ? true : false,
          rows: setSlidesRows ? setSlidesRows : 1,
          vertical: setVertical ? true : false,
          verticalSwiping: setVertical ? true : false,
          rtl: setRtl ? true : false,
          centerPadding: setCenterPadding ? setCenterPadding : 0,
          focusOnSelect: setFocusOnSelect ? true : false,
          lazyLoad: setLazyLoad ? setLazyLoad : false,

          asNavFor: target ? target : false,
          prevArrow: arrowsClasses ? $prevMarkup : false,
          nextArrow: arrowsClasses ? $nextMarkup : false,
          dots: pagiClasses ? true : false,
          dotsClass: 'js-pagination ' + pagiClasses,
          adaptiveHeight: !!isAdaptiveHeight,
          customPaging: function (slider, i) {
            var title = $(slider.$slides[i]).data('title')

            if (title && $pagiIcons) {
              return '<span>' + title + '</span>' + $pagiIcons
            } else if ($pagiIcons) {
              return '<span></span>' + $pagiIcons
            } else if (title && setDataTitlePosition) {
              return '<span>' + title + '</span>'
            } else if (title && !setDataTitlePosition) {
              return '<span></span>' + '<strong class="u-dot-title">' + title + '</strong>'
            } else {
              return '<span></span>'
            }
          },
          responsive: setResponsive
        })

        $this.on('beforeChange', function (event, slider, currentSlide, nextSlide) {
          var nxtSlide = $(slider.$slides)[nextSlide],
            slide = $(slider.$slides)[currentSlide],
            $pagination = $this.find('.js-pagination'),
            animatedElements = $(nxtSlide).find('[data-scs-animation-in]'),
            otherElements = $(slide).find('[data-scs-animation-in]')

          $(otherElements).each(function () {
            var animationIn = $(this).data('scs-animation-in')

            $(this).removeClass('animated ' + animationIn)
          })

          $(animatedElements).each(function () {
            $(this).css('opacity', 0)
          })

          if (!$pagination.length) return

          if (currentSlide > nextSlide) {
            $($pagination[0].children).removeClass('slick-active-right')

            $($pagination[0].children[nextSlide]).addClass('slick-active-right')
          } else {
            $($pagination[0].children).removeClass('slick-active-right')
          }

          $($pagination[0].children).removeClass('slick-current')

          setTimeout(function () {
            $($pagination[0].children[nextSlide]).addClass('slick-current')
          }, .25)
        })

        if (numberedPaging) {
          $this.on('beforeChange', function (event, slick, currentSlide, nextSlide) {
            var i = (nextSlide ? nextSlide : 0) + 1

            $(numberedPaging).html('<span class="u-paging__current">' + i + '</span><span class="u-paging__divider"></span><span class="u-paging__total">' + slick.slideCount + '</span>')
          })
        }

        $this.on('afterChange', function (event, slick, currentSlide) {
          var slide = $(slick.$slides)[currentSlide],
            animatedElements = $(slide).find('[data-scs-animation-in]')

          $(animatedElements).each(function () {
            var animationIn = $(this).data('scs-animation-in'),
              animationDelay = $(this).data('scs-animation-delay'),
              animationDuration = $(this).data('scs-animation-duration')

            $(this).css({
              'animation-delay': animationDelay + 'ms',
              'animation-duration': animationDuration + 'ms'
            })

            $(this).addClass('animated ' + animationIn).css('opacity', 1)
          })
        })

        if (setInEffect && setOutEffect) {
          $this.on('afterChange', function (event, slick, currentSlide, nextSlide) {
            $(slick.$slides).removeClass('animated set-position ' + setInEffect + ' ' + setOutEffect)
          })

          $this.on('beforeChange', function (event, slick, currentSlide) {
            $(slick.$slides[currentSlide]).addClass('animated ' + setOutEffect)
          })

          $this.on('setPosition', function (event, slick) {
            $(slick.$slides[slick.currentSlide]).addClass('animated set-position ' + setInEffect)
          })
        }

        //Actions
        collection = collection.add($this)
      })
    },

    /**
     * Implementation of video support.
     *
     * @param jQuery carousel
     * @param String videoSupport
     *
     * @return undefined
     */
    videoSupport: function (carousel) {
      if (!carousel.length) return

      carousel.on('beforeChange', function (event, slick, currentSlide, nextSlide) {
        var slideType = $(slick.$slides[currentSlide]).data('slide-type'),
          player = $(slick.$slides[currentSlide]).find('iframe').get(0),
          command

        if (slideType == 'vimeo') {
          command = {
            "method": "pause",
            "value": "true"
          }
        } else if (slideType == 'youtube') {
          command = {
            "event": "command",
            "func": "pauseVideo"
          }
        } else {
          return false
        }

        if (player != undefined) {
          player.contentWindow.postMessage(JSON.stringify(command), '*')
        }
      })
    },

    /**
     * Implementation of text animation.
     *
     * @param jQuery carousel
     * @param String textAnimationSelector
     *
     * @requires charming.js, anime.js, textfx.js
     *
     * @return undefined
     */
    initTextAnimation: function (carousel, textAnimationSelector) {
      if (!window.TextFx || !window.anime || !carousel.length) return

      var $text = carousel.find(textAnimationSelector)

      if (!$text.length) return

      $text.each(function (i, el) {
        var $this = $(el)

        if (!$this.data('TextFx')) {
          $this.data('TextFx', new TextFx($this.get(0)))
        }
      })


      carousel.on('beforeChange', function (event, slick, currentSlide, nextSlide) {
        var targets = slick.$slider
          .find('.slick-track')
          .children()

        var currentTarget = targets.eq(currentSlide),
          nextTarget = targets.eq(nextSlide)

        currentTarget = currentTarget.find(textAnimationSelector)
        nextTarget = nextTarget.find(textAnimationSelector)

        if (currentTarget.length) {
          currentTarget.data('TextFx').hide(currentTarget.data('effect') ? currentTarget.data('effect') : 'fx1')
        }

        if (nextTarget.length) {
          nextTarget.data('TextFx').show(nextTarget.data('effect') ? nextTarget.data('effect') : 'fx1')
        }
      })
    }
  }
})(jQuery)
  /**
   * Sticky blocks wrapper.
   *
   * @author Htmlstream
   * @version 1.0
   * @requires
   *
   */
  ; (function ($) {
    'use strict'

    $.HSCore.components.HSStickyBlock = {
      /**
       *
       *
       * @var Object _baseConfig
       */
      _baseConfig: {},

      /**
       *
       *
       * @var jQuery pageCollection
       */
      pageCollection: $(),

      /**
       * Initialization of Sticky blocks wrapper.
       *
       * @param String selector (optional)
       * @param Object config (optional)
       *
       * @return jQuery pageCollection - collection of initialized items.
       */

      init: function (selector, config) {
        this.collection = selector && $(selector).length ? $(selector) : $()
        if (!$(selector).length) return

        this.config = config && $.isPlainObject(config) ?
          $.extend({}, this._baseConfig, config) : this._baseConfig

        this.config.itemSelector = selector

        this.initStickyBlock()

        return this.pageCollection
      },

      initStickyBlock: function () {
        //Variables
        var $self = this,
          config = $self.config,
          collection = $self.pageCollection,
          windW = window.innerWidth

        this.collection.each(function (i, el) {
          //Variables
          var $stickyBlock = $(el),
            stickyBlockClasses = $stickyBlock.attr('class').replace($self.config.itemSelector.substring(1), ''),
            stickyBlockH = $stickyBlock.outerHeight(),
            stickyBlockW = $stickyBlock.outerWidth(),
            stickyBlockParentW = $stickyBlock.parent().width(),
            stickyBlockOffsetTop = $stickyBlock.offset().top,
            stickyBlockOffsetLeft = $stickyBlock.offset().left,
            startPoint = $.isNumeric($stickyBlock.data('start-point')) ? $stickyBlock.data('start-point') : $($stickyBlock.data('start-point')).offset().top,
            endPoint = $.isNumeric($stickyBlock.data('end-point')) ? $stickyBlock.data('end-point') : $($stickyBlock.data('end-point')).offset().top,
            hasStickyHeader = $stickyBlock.data('has-sticky-header'),
            stickyView = $stickyBlock.data('sticky-view'),
            offsetTarget = $stickyBlock.data('offset-target'),
            offsetTargetH = $(offsetTarget).outerHeight(),
            stickyOffsetTop = $stickyBlock.data('offset-top'),
            stickyOffsetBottom = $stickyBlock.data('offset-bottom')

          $('.collapse').on('hidden.bs.collapse', function () {
            endPoint = $.isNumeric($stickyBlock.data('end-point')) ? $stickyBlock.data('end-point') : $($stickyBlock.data('end-point')).offset().top
          })

          $('.collapse').on('shown.bs.collapse', function () {
            endPoint = $.isNumeric($stickyBlock.data('end-point')) ? $stickyBlock.data('end-point') : $($stickyBlock.data('end-point')).offset().top
          })

          //Break function if there are no target element
          if (!$stickyBlock.length) return
          if (stickyBlockH > (endPoint - startPoint)) return

          $self.killSticky($stickyBlock)

          if (stickyView == 'sm' && windW <= 576) {
            $stickyBlock.addClass('die-sticky')
            $self.killSticky($stickyBlock)
          } else if (stickyView == 'md' && windW <= 768) {
            $stickyBlock.addClass('die-sticky')
            $self.killSticky($stickyBlock)
          } else if (stickyView == 'lg' && windW <= 992) {
            $stickyBlock.addClass('die-sticky')
            $self.killSticky($stickyBlock)
          } else if (stickyView == 'xl' && windW <= 1200) {
            $stickyBlock.addClass('die-sticky')
            $self.killSticky($stickyBlock)
          } else {
            $stickyBlock.removeClass('die-sticky')
          }

          $(window).on('resize', function () {
            var windW = window.innerWidth

            $stickyBlock.css({
              'height': ''
            })

            if (stickyView == 'sm' && windW <= 576) {
              $stickyBlock.addClass('die-sticky')
              $self.killSticky($stickyBlock)
            } else if (stickyView == 'md' && windW <= 768) {
              $stickyBlock.addClass('die-sticky')
              $self.killSticky($stickyBlock)
            } else if (stickyView == 'lg' && windW <= 992) {
              $stickyBlock.addClass('die-sticky')
              $self.killSticky($stickyBlock)
            } else if (stickyView == 'xl' && windW <= 1200) {
              $stickyBlock.addClass('die-sticky')
              $self.killSticky($stickyBlock)
            } else {
              $stickyBlock
                .removeClass('die-sticky')
                .css({
                  'top': '',
                  'left': ''
                })
            }

            setTimeout(function () {
              var offsetTop = $(this).scrollTop()
              stickyBlockH = $stickyBlock.outerHeight(),
                stickyBlockW = $stickyBlock.outerWidth(),
                stickyBlockParentW = $stickyBlock.parent().width(),
                stickyBlockOffsetTop = $stickyBlock.offset().top,
                stickyBlockOffsetLeft = $stickyBlock.offset().left,
                startPoint = $.isNumeric($stickyBlock.data('start-point')) ? $stickyBlock.data('start-point') : $($stickyBlock.data('start-point')).offset().top,
                endPoint = $.isNumeric($stickyBlock.data('end-point')) ? $stickyBlock.data('end-point') : $($stickyBlock.data('end-point')).offset().top,
                offsetTargetH = $(offsetTarget).outerHeight()

              if (hasStickyHeader === true) {
                $stickyBlock
                  .not('.die-sticky')
                  .css({
                    'top': offsetTop + offsetTargetH >= (endPoint - stickyBlockH) ? endPoint - stickyBlockH - stickyBlockOffsetTop : offsetTargetH,
                    'left': stickyBlockOffsetLeft,
                    'width': stickyBlockParentW
                  })
              } else {
                $stickyBlock
                  .not('.die-sticky')
                  .css({
                    'top': offsetTop >= (endPoint - stickyBlockH) ? endPoint - stickyBlockH - stickyBlockOffsetTop : 0,
                    'left': stickyBlockOffsetLeft,
                    'width': stickyBlockParentW
                  })
              }
            }, 400)
          })

          var offsetTop = $(this).scrollTop()

          //Add responsive sticky state
          $self.addShadow($stickyBlock, hasStickyHeader ? offsetTop + offsetTargetH : offsetTop, stickyBlockH, stickyBlockW, i, stickyBlockClasses, startPoint, endPoint)

          //Add sticky state
          $self.addSticky($stickyBlock, hasStickyHeader ? offsetTop + offsetTargetH : offsetTop, stickyBlockH, stickyBlockParentW, stickyBlockOffsetLeft, startPoint, endPoint)

          $(window).on('scroll', function () {
            var offsetTop = $(this).scrollTop()

            //Add "shadow" element
            $self.addShadow($stickyBlock, hasStickyHeader ? offsetTop + offsetTargetH : offsetTop, stickyBlockH, stickyBlockParentW, i, stickyBlockClasses, startPoint, endPoint, stickyOffsetTop)

            //Add sticky state
            $self.addSticky($stickyBlock, hasStickyHeader ? offsetTop + offsetTargetH : offsetTop, stickyBlockH, stickyBlockParentW, stickyBlockOffsetLeft, startPoint, endPoint, hasStickyHeader ? offsetTargetH : 0, stickyOffsetTop)

            //Remove sticky state
            $self.removeSticky($stickyBlock, hasStickyHeader ? offsetTop + offsetTargetH : offsetTop, startPoint, stickyOffsetTop)

            if (endPoint) {
              //Add absolute state
              $self.addAbsolute($stickyBlock, stickyBlockH, i, stickyBlockOffsetTop, hasStickyHeader ? offsetTop + offsetTargetH : offsetTop, endPoint, stickyOffsetTop, stickyOffsetBottom)
            }
          })

          $(window).trigger('scroll')

          $('a[href="#"],a[href="#!"]').on('click', function () {
            $self.killSticky($stickyBlock)
          })

          //Add object to collection
          collection = collection.add($stickyBlock)
        })
      },

      addSticky: function (target, offsetTop, targetH, targetW, offsetLeft, startPoint, endPoint, offsetTargetH, stickyOffsetTop) {
        if (offsetTop >= startPoint - stickyOffsetTop && offsetTop < endPoint) {
          target
            .not('.die-sticky')
            .removeClass('position-relative')
            .css({
              'top': '',
              'left': '',
              'width': '',
              'height': ''
            })
            .addClass('position-fixed m-0')
            .css({
              'top': offsetTargetH + stickyOffsetTop,
              'left': offsetLeft,
              'width': targetW,
              'height': targetH
            })
        }
      },

      removeSticky: function (target, offsetTop, startPoint, stickyOffsetTop) {
        if (offsetTop <= startPoint - stickyOffsetTop) {
          target
            .not('.die-sticky')
            .removeClass('position-fixed m-0')
            .css({
              'left': ''
            })
        }
      },

      addAbsolute: function (target, targetH, targetI, targetOffsetTop, offsetTop, endPoint, stickyOffsetTop, stickyOffsetBottom) {
        if (target.hasClass('position-relative')) return

        if (offsetTop >= endPoint - targetH - stickyOffsetTop - stickyOffsetBottom) {
          target
            .not('.die-sticky')
            .removeClass('position-fixed m-0')
            .addClass('position-relative')
            .css({
              'top': endPoint - targetH - targetOffsetTop - stickyOffsetBottom,
              'left': ''
            })
        }
      },

      addShadow: function (target, offsetTop, targetH, targetW, targetI, targetClasses, startPoint, endPoint, stickyOffsetTop, stickyOffsetBottom) {
        if (offsetTop > startPoint - stickyOffsetTop && offsetTop < endPoint - targetH - stickyOffsetBottom) {
          if ($('#shadow' + targetI).length) return

          //Add shadow block
          target
            .not('.die-sticky')
            .before('<div id="shadow' + targetI + '" class="' + targetClasses + '" style="height: ' + targetH + 'px; width: ' + targetW + 'px; margin-top: ' + stickyOffsetTop + 'px; background-color: transparent !important;"></div>')
        } else {
          if (!$('#shadow' + targetI).length) return

          //Remove shadow block
          $('#shadow' + targetI).remove()
        }
      },

      killSticky: function (target) {
        target
          .removeClass('position-fixed m-0')
          .css({
            'top': '',
            'left': '',
            'width': '',
            'height': '',
            'z-index': '1'
          })
      }
    }
  })(jQuery)

  /**
 * Show Animation wrapper.
 *
 * @author Htmlstream
 * @version 1.0
 *
 */
  ; (function ($) {
    'use strict'
    $.HSCore.components.HSShowAnimation = {
      /**
       *
       *
       * @var Object _baseConfig
       */
      _baseConfig: {
        afterShow: function () {}
      },

      /**
       *
       *
       * @var jQuery pageCollection
       */
      pageCollection: $(),

      /**
       * Initialization of Show Animation wrapper.
       *
       * @param String selector (optional)
       * @param Object config (optional)
       *
       * @return jQuery pageCollection - collection of initialized items.
       */

      init: function (selector, config) {
        this.collection = selector && $(selector).length ? $(selector) : $()
        if (!$(selector).length) return

        this.config = config && $.isPlainObject(config) ?
          $.extend({}, this._baseConfig, config) : this._baseConfig

        this.config.itemSelector = selector

        this.initShowEffect()

        return this.pageCollection
      },

      initShowEffect: function () {
        //Variables
        var $self = this,
          config = $self.config,
          collection = $self.pageCollection

        //Actions
        this.collection.each(function (i, el) {
          //Variables
          var $this = $(el),
            linkGroup = $this.data('link-group'),
            $target = $($this.data('target')),
            targetGroup = $target.data('target-group'),
            animateIn = $this.data('animation-in')

          $this.on('click', function (e) {
            e.preventDefault()

            if ($(this).hasClass('active')) return

            $('[data-link-group="' + linkGroup + '"]').removeClass('active')
            $this.addClass('active')

            if (animateIn) {
              $self.addAnimation($target, targetGroup, animateIn, config)
            } else {
              $self.hideShow($target, targetGroup, config)
            }
          })

          // Actions
          collection = collection.add($this)
        })
      },

      hideShow: function (target, targetgroup, config) {
        $('[data-target-group="' + targetgroup + '"]')
          .hide().css('opacity', 0)

        target.show().css('opacity', 1)

        config.afterShow()
      },

      addAnimation: function (target, targetgroup, animatein, config) {
        $('[data-target-group="' + targetgroup + '"]')
          .hide()
          .css('opacity', 0)
          .removeClass('animated ' + animatein)

        target.show()

        config.afterShow()

        setTimeout(function () {
          target
            .css('opacity', 1)
            .addClass('animated ' + animatein)
        }, 50)
      }
    }
  })(jQuery)

  /**
 * HSScrollNav Component.
 *
 * @author Htmlstream
 * @version 1.0
 * @requires jQuery
 *
 */
  ; (function ($) {
    'use strict'

    $.HSCore.components.HSScrollNav = {

      /**
       * Base configuraion of the component.
       *
       * @private
       */
      _baseConfig: {
        duration: 400,
        easing: 'linear',
        over: $(),
        sectionClass: 'u-scroll-nav-section',
        activeItemClass: 'active',
        activeSectionClass: 'active',
        afterShow: function () {},
        beforeShow: function () {},
        parent: $('.u-header')
      },

      /**
       * All initialized item on the page.
       *
       * @private
       */
      _pageCollection: $(),


      /**
       * Initialization of the component.
       *
       * @param {jQuery} collection
       * @param {Object} config
       *
       * @public
       * @return {jQuery}
       */
      init: function (collection, config) {

        var self = this

        if (!collection || !collection.length) return $()

        collection.each(function (i, el) {

          var $this = $(el),
            itemConfig = config && $.isPlainObject(config) ?
              $.extend(true, {}, self._baseConfig, config, $this.data()) :
              $.extend(true, {}, self._baseConfig, $this.data())

          if (!$this.data('HSScrollNav')) {

            $this.data('HSScrollNav', new HSScrollNav($this, itemConfig))

            self._pageCollection = self._pageCollection.add($this)

          }

        })

        $(window).on('scroll.HSScrollNav', function () {

          self._pageCollection.each(function (i, el) {

            $(el).data('HSScrollNav').highlight()

          })

        }).trigger('scroll.HSScrollNav')

        return collection

      }

    }


    /**
     * HSScrollNav.
     *
     * @param {jQuery} element
     * @param {Object} config
     *
     * @constructor
     */
    function HSScrollNav(element, config) {

      /**
       * Current element.
       *
       * @public
       */
      this.element = element

      /**
       * Configuraion.
       *
       * @public
       */
      this.config = config

      /**
       * Sections.
       *
       * @public
       */
      this._items = $()

      this._makeItems()
      this._bindEvents()
    }

    /**
     * Return collection of sections.
     *
     * @private
     * @return {jQuery}
     */
    HSScrollNav.prototype._makeItems = function () {

      var self = this

      this.element.find('a[href^="#"]').each(function (i, el) {

        var $this = $(el)

        if (!$this.data('HSScrollNavSection')) {

          $this.data('HSScrollNavSection', new HSScrollNavSection($this, self.config))

          self._items = self._items.add($this)

        }

      })

    }

    /**
     * Binds necessary events.
     *
     * @private
     * @return {undefined}
     */
    HSScrollNav.prototype._bindEvents = function () {

      var self = this

      this.element.on('click.HSScrollNav', 'a[href^="#"]', function (e) {

        var link = this,
          target = $(this).data('HSScrollNavSection'),
          $parent = $(self.element).parent(),
          parentID = $parent.attr('id'),
          windW = window.innerWidth,
          mobileDestroy = Boolean(self.element[0].dataset.mobileDestroy)

        if (windW <= 769 && mobileDestroy === true) {
          $('[data-target="#' + parentID + '"]').trigger('click')

          $('[data-target="#' + parentID + '"] > .u-hamburger__box').removeClass('is-active')

          $parent.on('hidden.bs.collapse', function () {

            self._lockHightlight = true
            if (self.current) self.current.unhighlight()
            link.blur()
            self.current = $(link).data('HSScrollNavSection')
            self.current.highlight()

            target.show(function () {
              self._lockHightlight = false
            })

          })
        } else {
          self._lockHightlight = true
          if (self.current) self.current.unhighlight()
          link.blur()
          self.current = $(link).data('HSScrollNavSection')
          self.current.highlight()

          target.show(function () {
            self._lockHightlight = false
          })
        }


        e.preventDefault()

      })

    }

    /**
     * Activates necessary menu item.
     *
     * @public
     */
    HSScrollNav.prototype.highlight = function () {

      var self = this, items, currentItem, current, scrollTop

      if (!this._items.length || this._lockHightlight) return

      scrollTop = $(window).scrollTop()

      if (scrollTop + $(window).height() === $(document).height()) {

        this.current = this._items.last().data('HSScrollNavSection')

        this.unhighlight()
        this.current.highlight()
        this.current.changeHash()

        return
      }

      this._items.each(function (i, el) {

        var Section = $(el).data('HSScrollNavSection'),
          $section = Section.section

        if (scrollTop > Section.offset) {
          current = Section
        }

      })

      if (current && this.current != current) {

        this.unhighlight()
        current.highlight()
        if (this.current) current.changeHash()

        this.current = current

      }

    }

    /**
     * Deactivates all menu items.
     *
     * @public
     */
    HSScrollNav.prototype.unhighlight = function () {

      this._items.each(function (i, el) {
        $(el).data('HSScrollNavSection').unhighlight()
      })

    }

    /**
     * HSScrollNavSection.
     *
     * @param {jQuery} element
     *
     * @constructor
     */
    function HSScrollNavSection(element, config) {

      var self = this

      /**
       * Current section.
       *
       * @public
       */
      this.element = element

      /**
       * Configuration.
       *
       * @public
       */
      this.config = config

      /**
       * Getter for acces to the section element.
       *
       * @public
       */
      Object.defineProperty(this, 'section', {
        value: $(self.element.attr('href'))
      })

      /**
       * Getter for determinate position of the section relative to document.
       *
       * @public
       */

      Object.defineProperty(this, 'offset', {
        get: function () {

          var header = config.parent,
            headerStyles = getComputedStyle(header.get(0)),
            headerPosition = headerStyles.position,
            offset = self.section.offset().top


          if (header.length && headerPosition == 'fixed' && parseInt(headerStyles.top) == 0) {
            offset = offset - header.outerHeight() - parseInt(headerStyles.marginTop)
          }

          if (self.config.over.length) {
            offset = offset - self.config.over.outerHeight()
          }

          return offset
        }
      })


    }

    /**
     * Moves to the section.
     *
     * @public
     */
    HSScrollNavSection.prototype.show = function (callback) {

      var self = this

      if (!this.section.length) return

      self.config.beforeShow.call(self.section)

      this.changeHash()

      $('html, body').stop().animate({
        scrollTop: self.offset + 3
      }, {
        duration: self.config.duration,
        easing: self.config.easing,
        complete: function () {
          $('html, body').stop().animate({
            scrollTop: self.offset + 3
          }, {
            duration: self.config.duration,
            easing: self.config.easing,
            complete: function () {
              self.config.afterShow.call(self.section)
              if ($.isFunction(callback)) callback()
            }
          })
        }
      })

    }

    /**
     * Changes location's hash.
     *
     * @public
     */
    HSScrollNavSection.prototype.changeHash = function () {
      this.section.attr('id', '')
      $(this.config.sectionClass).removeClass(this.config.activeSectionClass)
      this.section.addClass(this.config.activeSectionClass)
      window.location.hash = this.element.attr('href')
      this.section.attr('id', this.element.attr('href').slice(1))
    }

    /**
     * Activates the menu item.
     *
     * @public
     */
    HSScrollNavSection.prototype.highlight = function () {

      var parent = this.element.parent('li')
      if (parent.length) parent.addClass(this.config.activeItemClass)

    }

    /**
     * Deactivates the menu item.
     *
     * @public
     */
    HSScrollNavSection.prototype.unhighlight = function () {

      var parent = this.element.parent('li')
      if (parent.length) parent.removeClass(this.config.activeItemClass)

    }

  })(jQuery)

  /**
 * Go To wrapper.
 *
 * @author Htmlstream
 * @version 1.0
 *
 */
  ; (function ($) {
    'use strict'
    $.HSCore.components.HSGoTo = {
      /**
       *
       *
       * @var Object _baseConfig
       */
      _baseConfig: {},

      /**
       *
       *
       * @var jQuery pageCollection
       */
      pageCollection: $(),

      /**
       * Initialization of Go To wrapper.
       *
       * @param String selector (optional)
       * @param Object config (optional)
       *
       * @return jQuery pageCollection - collection of initialized items.
       */

      init: function (selector, config) {
        this.collection = selector && $(selector).length ? $(selector) : $()
        if (!$(selector).length) return

        this.config = config && $.isPlainObject(config) ?
          $.extend({}, this._baseConfig, config) : this._baseConfig

        this.config.itemSelector = selector

        this.initGoTo()

        return this.pageCollection
      },

      initGoTo: function () {
        //Variables
        var $self = this,
          collection = $self.pageCollection

        //Actions
        this.collection.each(function (i, el) {
          //Variables
          var $this = $(el),
            $target = $this.data('target'),
            isReferencedToPage = Boolean($this.data('is-referenced-to-page')),
            type = $this.data('type'),
            showEffect = $this.data('show-effect'),
            hideEffect = $this.data('hide-effect'),
            position = JSON.parse(el.getAttribute('data-position')),
            compensation = $($this.data('compensation')).outerHeight(),
            offsetTop = $this.data('offset-top'),
            targetOffsetTop = function () {
              if (compensation) {
                return $target ? $($target).offset().top - compensation : 0
              } else {
                return $target ? $($target).offset().top : 0
              }
            }

          if (type === 'static') {
            $this.css({
              'display': 'inline-block'
            })
          } else {
            $this.addClass('animated').css({
              'display': 'inline-block',
              'position': type,
              'opacity': 0
            })
          }

          if (type === 'fixed' || type === 'absolute') {
            $this.css(position)
          }

          $this.on('click', function (e) {
            if (!isReferencedToPage) {
              e.preventDefault()

              $('html, body').stop().animate({
                'scrollTop': targetOffsetTop()
              }, 800)
            }
          })

          if (!$this.data('offset-top') && !$this.hasClass('js-animation-was-fired') && type !== 'static') {
            if ($this.offset().top <= $(window).height()) {
              $this.show()

              setTimeout(function () {
                $this.addClass('js-animation-was-fired ' + showEffect).css({
                  'opacity': ''
                })
              })
            }
          }

          if (type !== 'static') {
            $(window).on('scroll', function () {
              if ($this.data('offset-top')) {
                if ($(window).scrollTop() >= offsetTop && !$this.hasClass('js-animation-was-fired')) {
                  $this.show()

                  setTimeout(function () {
                    $this.addClass('js-animation-was-fired ' + showEffect).css({
                      'opacity': ''
                    })
                  })
                } else if ($(window).scrollTop() <= offsetTop && $this.hasClass('js-animation-was-fired')) {
                  $this.removeClass('js-animation-was-fired ' + showEffect)

                  setTimeout(function () {
                    $this.addClass(hideEffect).css({
                      'opacity': 0
                    })
                  }, 100)

                  setTimeout(function () {
                    $this.removeClass(hideEffect).hide()
                  }, 400)
                }
              } else {
                var thisOffsetTop = $this.offset().top

                if (!$this.hasClass('js-animation-was-fired')) {
                  if ($(window).scrollTop() >= thisOffsetTop - $(window).height()) {
                    $this.show()

                    setTimeout(function () {
                      $this.addClass('js-animation-was-fired ' + showEffect).css({
                        'opacity': ''
                      })
                    })
                  }
                }
              }
            })

            $(window).trigger('scroll')
          }

          //Actions
          collection = collection.add($this)
        })
      }
    }
  })(jQuery)
