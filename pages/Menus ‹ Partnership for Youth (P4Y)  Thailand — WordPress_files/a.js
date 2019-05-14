/* Detect-zoom
 * -----------
 * Cross Browser Zoom and Pixel Ratio Detector
 * Version 1.0.4 | Apr 1 2013
 * dual-licensed under the WTFPL and MIT license
 * Maintained by https://github/tombigel
 * Original developer https://github.com/yonran
 */

//AMD and CommonJS initialization copied from https://github.com/zohararad/audio5js
(function (root, ns, factory) {
    "use strict";

    if (typeof (module) !== 'undefined' && module.exports) { // CommonJS
        module.exports = factory(ns, root);
    } else if (typeof (define) === 'function' && define.amd) { // AMD
        define("factory", function () {
            return factory(ns, root);
        });
    } else {
        root[ns] = factory(ns, root);
    }

}(window, 'detectZoom', function () {

    /**
     * Use devicePixelRatio if supported by the browser
     * @return {Number}
     * @private
     */
    var devicePixelRatio = function () {
        return window.devicePixelRatio || 1;
    };

    /**
     * Fallback function to set default values
     * @return {Object}
     * @private
     */
    var fallback = function () {
        return {
            zoom: 1,
            devicePxPerCssPx: 1
        };
    };
    /**
     * IE 8 and 9: no trick needed!
     * TODO: Test on IE10 and Windows 8 RT
     * @return {Object}
     * @private
     **/
    var ie8 = function () {
        var zoom = Math.round((screen.deviceXDPI / screen.logicalXDPI) * 100) / 100;
        return {
            zoom: zoom,
            devicePxPerCssPx: zoom * devicePixelRatio()
        };
    };

    /**
     * For IE10 we need to change our technique again...
     * thanks https://github.com/stefanvanburen
     * @return {Object}
     * @private
     */
    var ie10 = function () {
        var zoom = Math.round((document.documentElement.offsetHeight / window.innerHeight) * 100) / 100;
        return {
            zoom: zoom,
            devicePxPerCssPx: zoom * devicePixelRatio()
        };
    };

    /**
     * Mobile WebKit
     * the trick: window.innerWIdth is in CSS pixels, while
     * screen.width and screen.height are in system pixels.
     * And there are no scrollbars to mess up the measurement.
     * @return {Object}
     * @private
     */
    var webkitMobile = function () {
        var deviceWidth = (Math.abs(window.orientation) == 90) ? screen.height : screen.width;
        var zoom = deviceWidth / window.innerWidth;
        return {
            zoom: zoom,
            devicePxPerCssPx: zoom * devicePixelRatio()
        };
    };

    /**
     * Desktop Webkit
     * the trick: an element's clientHeight is in CSS pixels, while you can
     * set its line-height in system pixels using font-size and
     * -webkit-text-size-adjust:none.
     * device-pixel-ratio: http://www.webkit.org/blog/55/high-dpi-web-sites/
     *
     * Previous trick (used before http://trac.webkit.org/changeset/100847):
     * documentElement.scrollWidth is in CSS pixels, while
     * document.width was in system pixels. Note that this is the
     * layout width of the document, which is slightly different from viewport
     * because document width does not include scrollbars and might be wider
     * due to big elements.
     * @return {Object}
     * @private
     */
    var webkit = function () {
        var important = function (str) {
            return str.replace(/;/g, " !important;");
        };

        var div = document.createElement('div');
        div.innerHTML = "1<br>2<br>3<br>4<br>5<br>6<br>7<br>8<br>9<br>0";
        div.setAttribute('style', important('font: 100px/1em sans-serif; -webkit-text-size-adjust: none; text-size-adjust: none; height: auto; width: 1em; padding: 0; overflow: visible;'));

        // The container exists so that the div will be laid out in its own flow
        // while not impacting the layout, viewport size, or display of the
        // webpage as a whole.
        // Add !important and relevant CSS rule resets
        // so that other rules cannot affect the results.
        var container = document.createElement('div');
        container.setAttribute('style', important('width:0; height:0; overflow:hidden; visibility:hidden; position: absolute;'));
        container.appendChild(div);

        document.body.appendChild(container);
        var zoom = 1000 / div.clientHeight;
        zoom = Math.round(zoom * 100) / 100;
        document.body.removeChild(container);

        return{
            zoom: zoom,
            devicePxPerCssPx: zoom * devicePixelRatio()
        };
    };

    /**
     * no real trick; device-pixel-ratio is the ratio of device dpi / css dpi.
     * (Note that this is a different interpretation than Webkit's device
     * pixel ratio, which is the ratio device dpi / system dpi).
     *
     * Also, for Mozilla, there is no difference between the zoom factor and the device ratio.
     *
     * @return {Object}
     * @private
     */
    var firefox4 = function () {
        var zoom = mediaQueryBinarySearch('min--moz-device-pixel-ratio', '', 0, 10, 20, 0.0001);
        zoom = Math.round(zoom * 100) / 100;
        return {
            zoom: zoom,
            devicePxPerCssPx: zoom
        };
    };

    /**
     * Firefox 18.x
     * Mozilla added support for devicePixelRatio to Firefox 18,
     * but it is affected by the zoom level, so, like in older
     * Firefox we can't tell if we are in zoom mode or in a device
     * with a different pixel ratio
     * @return {Object}
     * @private
     */
    var firefox18 = function () {
        return {
            zoom: firefox4().zoom,
            devicePxPerCssPx: devicePixelRatio()
        };
    };

    /**
     * works starting Opera 11.11
     * the trick: outerWidth is the viewport width including scrollbars in
     * system px, while innerWidth is the viewport width including scrollbars
     * in CSS px
     * @return {Object}
     * @private
     */
    var opera11 = function () {
        var zoom = window.top.outerWidth / window.top.innerWidth;
        zoom = Math.round(zoom * 100) / 100;
        return {
            zoom: zoom,
            devicePxPerCssPx: zoom * devicePixelRatio()
        };
    };

    /**
     * Use a binary search through media queries to find zoom level in Firefox
     * @param property
     * @param unit
     * @param a
     * @param b
     * @param maxIter
     * @param epsilon
     * @return {Number}
     */
    var mediaQueryBinarySearch = function (property, unit, a, b, maxIter, epsilon) {
        var matchMedia;
        var head, style, div;
        if (window.matchMedia) {
            matchMedia = window.matchMedia;
        } else {
            head = document.getElementsByTagName('head')[0];
            style = document.createElement('style');
            head.appendChild(style);

            div = document.createElement('div');
            div.className = 'mediaQueryBinarySearch';
            div.style.display = 'none';
            document.body.appendChild(div);

            matchMedia = function (query) {
                style.sheet.insertRule('@media ' + query + '{.mediaQueryBinarySearch ' + '{text-decoration: underline} }', 0);
                var matched = getComputedStyle(div, null).textDecoration == 'underline';
                style.sheet.deleteRule(0);
                return {matches: matched};
            };
        }
        var ratio = binarySearch(a, b, maxIter);
        if (div) {
            head.removeChild(style);
            document.body.removeChild(div);
        }
        return ratio;

        function binarySearch(a, b, maxIter) {
            var mid = (a + b) / 2;
            if (maxIter <= 0 || b - a < epsilon) {
                return mid;
            }
            var query = "(" + property + ":" + mid + unit + ")";
            if (matchMedia(query).matches) {
                return binarySearch(mid, b, maxIter - 1);
            } else {
                return binarySearch(a, mid, maxIter - 1);
            }
        }
    };

    /**
     * Generate detection function
     * @private
     */
    var detectFunction = (function () {
        var func = fallback;
        //IE8+
        if (!isNaN(screen.logicalXDPI) && !isNaN(screen.systemXDPI)) {
            func = ie8;
        }
        // IE10+ / Touch
        else if (window.navigator.msMaxTouchPoints) {
            func = ie10;
        }
        //Mobile Webkit
        else if ('orientation' in window && typeof document.body.style.webkitMarquee === 'string') {
            func = webkitMobile;
        }
        //WebKit
        else if (typeof document.body.style.webkitMarquee === 'string') {
            func = webkit;
        }
        //Opera
        else if (navigator.userAgent.indexOf('Opera') >= 0) {
            func = opera11;
        }
        //Last one is Firefox
        //FF 18.x
        else if (window.devicePixelRatio) {
            func = firefox18;
        }
        //FF 4.0 - 17.x
        else if (firefox4().zoom > 0.001) {
            func = firefox4;
        }

        return func;
    }());


    return ({

        /**
         * Ratios.zoom shorthand
         * @return {Number} Zoom level
         */
        zoom: function () {
            return detectFunction().zoom;
        },

        /**
         * Ratios.devicePxPerCssPx shorthand
         * @return {Number} devicePxPerCssPx level
         */
        device: function () {
            return detectFunction().devicePxPerCssPx;
        }
    });
}));

var wpcom_img_zoomer = {
        clientHintSupport: {
                gravatar: false,
                files: false,
                photon: false,
                mshots: false,
                staticAssets: false,
                latex: false,
                imgpress: false,
        },
	useHints: false,
	zoomed: false,
	timer: null,
	interval: 1000, // zoom polling interval in millisecond

	// Should we apply width/height attributes to control the image size?
	imgNeedsSizeAtts: function( img ) {
		// Do not overwrite existing width/height attributes.
		if ( img.getAttribute('width') !== null || img.getAttribute('height') !== null )
			return false;
		// Do not apply the attributes if the image is already constrained by a parent element.
		if ( img.width < img.naturalWidth || img.height < img.naturalHeight )
			return false;
		return true;
	},

        hintsFor: function( service ) {
                if ( this.useHints === false ) {
                        return false;
                }
                if ( this.hints() === false ) {
                        return false;
                }
                if ( typeof this.clientHintSupport[service] === "undefined" ) {
                        return false;
                }
                if ( this.clientHintSupport[service] === true ) {
                        return true;
                }
                return false;
        },

	hints: function() {
		try {
			var chrome = window.navigator.userAgent.match(/\sChrome\/([0-9]+)\.[.0-9]+\s/)
			if (chrome !== null) {
				var version = parseInt(chrome[1], 10)
				if (isNaN(version) === false && version >= 46) {
					return true
				}
			}
		} catch (e) {
			return false
		}
		return false
	},

	init: function() {
		var t = this;
		try{
			t.zoomImages();
			t.timer = setInterval( function() { t.zoomImages(); }, t.interval );
		}
		catch(e){
		}
	},

	stop: function() {
		if ( this.timer )
			clearInterval( this.timer );
	},

	getScale: function() {
		var scale = detectZoom.device();
		// Round up to 1.5 or the next integer below the cap.
		if      ( scale <= 1.0 ) scale = 1.0;
		else if ( scale <= 1.5 ) scale = 1.5;
		else if ( scale <= 2.0 ) scale = 2.0;
		else if ( scale <= 3.0 ) scale = 3.0;
		else if ( scale <= 4.0 ) scale = 4.0;
		else                     scale = 5.0;
		return scale;
	},

	shouldZoom: function( scale ) {
		var t = this;
		// Do not operate on hidden frames.
		if ( "innerWidth" in window && !window.innerWidth )
			return false;
		// Don't do anything until scale > 1
		if ( scale == 1.0 && t.zoomed == false )
			return false;
		return true;
	},

	zoomImages: function() {
		var t = this;
		var scale = t.getScale();
		if ( ! t.shouldZoom( scale ) ){
			return;
		}
		t.zoomed = true;
		// Loop through all the <img> elements on the page.
		var imgs = document.getElementsByTagName("img");

		for ( var i = 0; i < imgs.length; i++ ) {
			// Wait for original images to load
			if ( "complete" in imgs[i] && ! imgs[i].complete )
				continue;

			// Skip images that have srcset attributes.
			if ( imgs[i].hasAttribute('srcset') ) {
				continue;
			}

			// Skip images that don't need processing.
			var imgScale = imgs[i].getAttribute("scale");
			if ( imgScale == scale || imgScale == "0" )
				continue;

			// Skip images that have already failed at this scale
			var scaleFail = imgs[i].getAttribute("scale-fail");
			if ( scaleFail && scaleFail <= scale )
				continue;

			// Skip images that have no dimensions yet.
			if ( ! ( imgs[i].width && imgs[i].height ) )
				continue;

			// Skip images from Lazy Load plugins
			if ( ! imgScale && imgs[i].getAttribute("data-lazy-src") && (imgs[i].getAttribute("data-lazy-src") !== imgs[i].getAttribute("src")))
				continue;

			if ( t.scaleImage( imgs[i], scale ) ) {
				// Mark the img as having been processed at this scale.
				imgs[i].setAttribute("scale", scale);
			}
			else {
				// Set the flag to skip this image.
				imgs[i].setAttribute("scale", "0");
			}
		}
	},

	scaleImage: function( img, scale ) {
		var t = this;
		var newSrc = img.src;

                var isFiles = false;
                var isLatex = false;
                var isPhoton = false;

		// Skip slideshow images
		if ( img.parentNode.className.match(/slideshow-slide/) )
			return false;

		// Scale gravatars that have ?s= or ?size=
		if ( img.src.match( /^https?:\/\/([^\/]*\.)?gravatar\.com\/.+[?&](s|size)=/ ) ) {
                        if ( this.hintsFor( "gravatar" ) === true ) {
                                return false;
                        }
			newSrc = img.src.replace( /([?&](s|size)=)(\d+)/, function( $0, $1, $2, $3 ) {
				// Stash the original size
				var originalAtt = "originals",
				originalSize = img.getAttribute(originalAtt);
				if ( originalSize === null ) {
					originalSize = $3;
					img.setAttribute(originalAtt, originalSize);
					if ( t.imgNeedsSizeAtts( img ) ) {
						// Fix width and height attributes to rendered dimensions.
						img.width = img.width;
						img.height = img.height;
					}
				}
				// Get the width/height of the image in CSS pixels
				var size = img.clientWidth;
				// Convert CSS pixels to device pixels
				var targetSize = Math.ceil(img.clientWidth * scale);
				// Don't go smaller than the original size
				targetSize = Math.max( targetSize, originalSize );
				// Don't go larger than the service supports
				targetSize = Math.min( targetSize, 512 );
				return $1 + targetSize;
			});
		}

		// Scale mshots that have width
		else if ( img.src.match(/^https?:\/\/([^\/]+\.)*(wordpress|wp)\.com\/mshots\/.+[?&]w=\d+/) ) {
                        if ( this.hintsFor( "mshots" ) === true ) {
                                return false;
                        }
			newSrc = img.src.replace( /([?&]w=)(\d+)/, function($0, $1, $2) {
				// Stash the original size
				var originalAtt = 'originalw', originalSize = img.getAttribute(originalAtt);
				if ( originalSize === null ) {
					originalSize = $2;
					img.setAttribute(originalAtt, originalSize);
					if ( t.imgNeedsSizeAtts( img ) ) {
						// Fix width and height attributes to rendered dimensions.
						img.width = img.width;
						img.height = img.height;
					}
				}
				// Get the width of the image in CSS pixels
				var size = img.clientWidth;
				// Convert CSS pixels to device pixels
				var targetSize = Math.ceil(size * scale);
				// Don't go smaller than the original size
				targetSize = Math.max( targetSize, originalSize );
				// Don't go bigger unless the current one is actually lacking
				if ( scale > img.getAttribute("scale") && targetSize <= img.naturalWidth )
					targetSize = $2;
				if ( $2 != targetSize )
					return $1 + targetSize;
				return $0;
			});

			// Update height attribute to match width
			newSrc = newSrc.replace( /([?&]h=)(\d+)/, function($0, $1, $2) {
				if ( newSrc == img.src ) {
					return $0;
				}
				// Stash the original size
				var originalAtt = 'originalh', originalSize = img.getAttribute(originalAtt);
				if ( originalSize === null ) {
					originalSize = $2;
					img.setAttribute(originalAtt, originalSize);
				}
				// Get the height of the image in CSS pixels
				var size = img.clientHeight;
				// Convert CSS pixels to device pixels
				var targetSize = Math.ceil(size * scale);
				// Don't go smaller than the original size
				targetSize = Math.max( targetSize, originalSize );
				// Don't go bigger unless the current one is actually lacking
				if ( scale > img.getAttribute("scale") && targetSize <= img.naturalHeight )
					targetSize = $2;
				if ( $2 != targetSize )
					return $1 + targetSize;
				return $0;
			});
		}

		// Scale simple imgpress queries (s0.wp.com) that only specify w/h/fit
		else if ( img.src.match(/^https?:\/\/([^\/.]+\.)*(wp|wordpress)\.com\/imgpress\?(.+)/) ) {
                        if ( this.hintsFor( "imgpress" ) === true ) {
                                return false; 
                        }
			var imgpressSafeFunctions = ["zoom", "url", "h", "w", "fit", "filter", "brightness", "contrast", "colorize", "smooth", "unsharpmask"];
			// Search the query string for unsupported functions.
			var qs = RegExp.$3.split('&');
			for ( var q in qs ) {
				q = qs[q].split('=')[0];
				if ( imgpressSafeFunctions.indexOf(q) == -1 ) {
					return false;
				}
			}
			// Fix width and height attributes to rendered dimensions.
			img.width = img.width;
			img.height = img.height;
			// Compute new src
			if ( scale == 1 )
				newSrc = img.src.replace(/\?(zoom=[^&]+&)?/, '?');
			else
				newSrc = img.src.replace(/\?(zoom=[^&]+&)?/, '?zoom=' + scale + '&');
		}

		// Scale files.wordpress.com, LaTeX, or Photon images (i#.wp.com)
		else if (
			( isFiles = img.src.match(/^https?:\/\/([^\/]+)\.files\.wordpress\.com\/.+[?&][wh]=/) ) ||
			( isLatex = img.src.match(/^https?:\/\/([^\/.]+\.)*(wp|wordpress)\.com\/latex\.php\?(latex|zoom)=(.+)/) ) ||
			( isPhoton = img.src.match(/^https?:\/\/i[\d]{1}\.wp\.com\/(.+)/) )
		) {
                        if ( false !== isFiles && this.hintsFor( "files" ) === true ) {
                                return false
                        }
                        if ( false !== isLatex && this.hintsFor( "latex" ) === true ) {
                                return false
                        }
                        if ( false !== isPhoton && this.hintsFor( "photon" ) === true ) {
                                return false
                        }
			// Fix width and height attributes to rendered dimensions.
			img.width = img.width;
			img.height = img.height;
			// Compute new src
			if ( scale == 1 ) {
				newSrc = img.src.replace(/\?(zoom=[^&]+&)?/, '?');
			} else {
				newSrc = img.src;

				var url_var = newSrc.match( /([?&]w=)(\d+)/ );
				if ( url_var !== null && url_var[2] ) {
					newSrc = newSrc.replace( url_var[0], url_var[1] + img.width );
				}

				url_var = newSrc.match( /([?&]h=)(\d+)/ );
				if ( url_var !== null && url_var[2] ) {
					newSrc = newSrc.replace( url_var[0], url_var[1] + img.height );
				}

				var zoom_arg = '&zoom=2';
				if ( !newSrc.match( /\?/ ) ) {
					zoom_arg = '?zoom=2';
				}
				img.setAttribute( 'srcset', newSrc + zoom_arg + ' ' + scale + 'x' );
			}
		}

		// Scale static assets that have a name matching *-1x.png or *@1x.png
		else if ( img.src.match(/^https?:\/\/[^\/]+\/.*[-@]([12])x\.(gif|jpeg|jpg|png)(\?|$)/) ) {
                        if ( this.hintsFor( "staticAssets" ) === true ) {
                                return false; 
                        }
			// Fix width and height attributes to rendered dimensions.
			img.width = img.width;
			img.height = img.height;
			var currentSize = RegExp.$1, newSize = currentSize;
			if ( scale <= 1 )
				newSize = 1;
			else
				newSize = 2;
			if ( currentSize != newSize )
				newSrc = img.src.replace(/([-@])[12]x\.(gif|jpeg|jpg|png)(\?|$)/, '$1'+newSize+'x.$2$3');
		}

		else {
			return false;
		}

		// Don't set img.src unless it has changed. This avoids unnecessary reloads.
		if ( newSrc != img.src ) {
			// Store the original img.src
			var prevSrc, origSrc = img.getAttribute("src-orig");
			if ( !origSrc ) {
				origSrc = img.src;
				img.setAttribute("src-orig", origSrc);
			}
			// In case of error, revert img.src
			prevSrc = img.src;
			img.onerror = function(){
				img.src = prevSrc;
				if ( img.getAttribute("scale-fail") < scale )
					img.setAttribute("scale-fail", scale);
				img.onerror = null;
			};
			// Finally load the new image
			img.src = newSrc;
		}

		return true;
	}
};

wpcom_img_zoomer.init();
;
!function(a){a.fn.hoverIntent=function(b,c,d){var e={interval:100,sensitivity:6,timeout:0};e="object"==typeof b?a.extend(e,b):a.isFunction(c)?a.extend(e,{over:b,out:c,selector:d}):a.extend(e,{over:b,out:b,selector:c});var f,g,h,i,j=function(a){f=a.pageX,g=a.pageY},k=function(b,c){return c.hoverIntent_t=clearTimeout(c.hoverIntent_t),Math.sqrt((h-f)*(h-f)+(i-g)*(i-g))<e.sensitivity?(a(c).off("mousemove.hoverIntent",j),c.hoverIntent_s=!0,e.over.apply(c,[b])):(h=f,i=g,c.hoverIntent_t=setTimeout(function(){k(b,c)},e.interval),void 0)},l=function(a,b){return b.hoverIntent_t=clearTimeout(b.hoverIntent_t),b.hoverIntent_s=!1,e.out.apply(b,[a])},m=function(b){var c=a.extend({},b),d=this;d.hoverIntent_t&&(d.hoverIntent_t=clearTimeout(d.hoverIntent_t)),"mouseenter"===b.type?(h=c.pageX,i=c.pageY,a(d).on("mousemove.hoverIntent",j),d.hoverIntent_s||(d.hoverIntent_t=setTimeout(function(){k(c,d)},e.interval))):(a(d).off("mousemove.hoverIntent",j),d.hoverIntent_s&&(d.hoverIntent_t=setTimeout(function(){l(c,d)},e.timeout)))};return this.on({"mouseenter.hoverIntent":m,"mouseleave.hoverIntent":m},e.selector)}}(jQuery);;
!function(a,b,c){function d(a){-1!==i.val().indexOf(a.text().trim())?(a.attr("data-label",a.attr("aria-label")),a.attr("aria-label",a.attr("data-used")),a.attr("aria-pressed",!0),a.addClass("active")):a.attr("data-label")&&(a.attr("aria-label",a.attr("data-label")),a.attr("aria-pressed",!1),a.removeClass("active"))}var e=a(document),f=a(b),g=a(document.body);b.adminMenu={init:function(){},fold:function(){},restoreMenuState:function(){},toggle:function(){},favorites:function(){}},b.columns={init:function(){var b=this;a(".hide-column-tog","#adv-settings").click(function(){var c=a(this),d=c.val();c.prop("checked")?b.checked(d):b.unchecked(d),columns.saveManageColumnsState()})},saveManageColumnsState:function(){var b=this.hidden();a.post(ajaxurl,{action:"hidden-columns",hidden:b,screenoptionnonce:a("#screenoptionnonce").val(),page:pagenow})},checked:function(b){a(".column-"+b).removeClass("hidden"),this.colSpanChange(1)},unchecked:function(b){a(".column-"+b).addClass("hidden"),this.colSpanChange(-1)},hidden:function(){return a(".manage-column[id]").filter(".hidden").map(function(){return this.id}).get().join(",")},useCheckboxesForHidden:function(){this.hidden=function(){return a(".hide-column-tog").not(":checked").map(function(){var a=this.id;return a.substring(a,a.length-5)}).get().join(",")}},colSpanChange:function(b){var c,d=a("table").find(".colspanchange");d.length&&(c=parseInt(d.attr("colspan"),10)+b,d.attr("colspan",c.toString()))}},e.ready(function(){columns.init()}),b.validateForm=function(b){return!a(b).find(".form-required").filter(function(){return""===a(":input:visible",this).val()}).addClass("form-invalid").find(":input:visible").change(function(){a(this).closest(".form-invalid").removeClass("form-invalid")}).length},b.showNotice={warn:function(){var a=commonL10n.warnDelete||"";return!!confirm(a)},note:function(a){alert(a)}},b.screenMeta={element:null,toggles:null,page:null,init:function(){this.element=a("#screen-meta"),this.toggles=a("#screen-meta-links").find(".show-settings"),this.page=a("#wpcontent"),this.toggles.click(this.toggleEvent)},toggleEvent:function(){var b=a("#"+a(this).attr("aria-controls"));b.length&&(b.is(":visible")?screenMeta.close(b,a(this)):screenMeta.open(b,a(this)))},open:function(b,c){a("#screen-meta-links").find(".screen-meta-toggle").not(c.parent()).css("visibility","hidden"),b.parent().show(),b.slideDown("fast",function(){b.focus(),c.addClass("screen-meta-active").attr("aria-expanded",!0)}),e.trigger("screen:options:open")},close:function(b,c){b.slideUp("fast",function(){c.removeClass("screen-meta-active").attr("aria-expanded",!1),a(".screen-meta-toggle").css("visibility",""),b.parent().hide()}),e.trigger("screen:options:close")}},a(".contextual-help-tabs").delegate("a","click",function(b){var c,d=a(this);return b.preventDefault(),!d.is(".active a")&&(a(".contextual-help-tabs .active").removeClass("active"),d.parent("li").addClass("active"),c=a(d.attr("href")),a(".help-tab-content").not(c).removeClass("active").hide(),void c.addClass("active").show())});var h=!1,i=a("#permalink_structure"),j=a(".permalink-structure input:radio"),k=a("#custom_selection"),l=a(".form-table.permalink-structure .available-structure-tags button");j.on("change",function(){"custom"!==this.value&&(i.val(this.value),l.each(function(){d(a(this))}))}),i.on("click input",function(){k.prop("checked",!0)}),i.on("focus",function(b){h=!0,a(this).off(b)}),l.each(function(){d(a(this))}),i.on("change",function(){l.each(function(){d(a(this))})}),l.on("click",function(){var b,c=i.val(),e=i[0].selectionStart,f=i[0].selectionEnd,g=a(this).text().trim(),j=a(this).attr("data-added");return-1!==c.indexOf(g)?(c=c.replace(g+"/",""),i.val("/"===c?"":c),a("#custom_selection_updated").text(j),void d(a(this))):(h||0!==e||0!==f||(e=f=c.length),k.prop("checked",!0),"/"!==c.substr(0,e).substr(-1)&&(g="/"+g),"/"!==c.substr(f,1)&&(g+="/"),i.val(c.substr(0,e)+g+c.substr(f)),a("#custom_selection_updated").text(j),d(a(this)),void(h&&i[0].setSelectionRange&&(b=(c.substr(0,e)+g).length,i[0].setSelectionRange(b,b),i.focus())))}),e.ready(function(){function c(){var b=a("a.wp-has-current-submenu");"folded"===x?b.attr("aria-haspopup","true"):b.attr("aria-haspopup","false")}function d(a){var b,c,d,e,g,h,i,j=a.find(".wp-submenu");g=a.offset().top,h=f.scrollTop(),i=g-h-30,b=g+j.height()+1,c=F.height(),d=60+b-c,e=f.height()+h-50,e<b-d&&(d=b-e),d>i&&(d=i),d>1?j.css("margin-top","-"+d+"px"):j.css("margin-top","")}function h(){a(".notice.is-dismissible").each(function(){var b=a(this),c=a('<button type="button" class="notice-dismiss"><span class="screen-reader-text"></span></button>'),d=commonL10n.dismiss||"";c.find(".screen-reader-text").text(d),c.on("click.wp-dismiss-notice",function(a){a.preventDefault(),b.fadeTo(100,0,function(){b.slideUp(100,function(){b.remove()})})}),b.append(c)})}function i(a){var b=f.scrollTop(),c=!a||"scroll"!==a.type;if(!(B||D||G.data("wp-responsive"))){if(S.menu+S.adminbar<S.window||S.menu+S.adminbar+20>S.wpwrap)return void k();if(R=!0,S.menu+S.adminbar>S.window){if(b<0)return void(O||(O=!0,P=!1,E.css({position:"fixed",top:"",bottom:""})));if(b+S.window>e.height()-1)return void(P||(P=!0,O=!1,E.css({position:"fixed",top:"",bottom:0})));b>N?O?(O=!1,Q=E.offset().top-S.adminbar-(b-N),Q+S.menu+S.adminbar<b+S.window&&(Q=b+S.window-S.menu-S.adminbar),E.css({position:"absolute",top:Q,bottom:""})):!P&&E.offset().top+S.menu<b+S.window&&(P=!0,E.css({position:"fixed",top:"",bottom:0})):b<N?P?(P=!1,Q=E.offset().top-S.adminbar+(N-b),Q+S.menu>b+S.window&&(Q=b),E.css({position:"absolute",top:Q,bottom:""})):!O&&E.offset().top>=b+S.adminbar&&(O=!0,E.css({position:"fixed",top:"",bottom:""})):c&&(O=P=!1,Q=b+S.window-S.menu-S.adminbar-1,Q>0?E.css({position:"absolute",top:Q,bottom:""}):k())}N=b}}function j(){S={window:f.height(),wpwrap:F.height(),adminbar:M.height(),menu:E.height()}}function k(){!B&&R&&(O=P=R=!1,E.css({position:"",top:"",bottom:""}))}function l(){j(),G.data("wp-responsive")?(g.removeClass("sticky-menu"),k()):S.menu+S.adminbar>S.window?(i(),g.removeClass("sticky-menu")):(g.addClass("sticky-menu"),k())}function m(){a(".aria-button-if-js").attr("role","button")}function n(){var a=!1;return b.innerWidth&&(a=Math.max(b.innerWidth,document.documentElement.clientWidth)),a}function o(){var a=n()||961;x=a<=782?"responsive":g.hasClass("folded")||g.hasClass("auto-fold")&&a<=960&&a>782?"folded":"open",e.trigger("wp-menu-state-set",{state:x})}var p,q,r,s,t,u,v,w,x,y=!1,z=a("input.current-page"),A=z.val(),B=/iPhone|iPad|iPod/.test(navigator.userAgent),C=navigator.userAgent.indexOf("Android")!==-1,D=a(document.documentElement).hasClass("ie8"),E=a("#adminmenuwrap"),F=a("#wpwrap"),G=a("#adminmenu"),H=a("#wp-responsive-overlay"),I=a("#wp-toolbar"),J=I.find('a[aria-haspopup="true"]'),K=a(".meta-box-sortables"),L=!1,M=a("#wpadminbar"),N=0,O=!1,P=!1,Q=0,R=!1,S={window:f.height(),wpwrap:F.height(),adminbar:M.height(),menu:E.height()},T=a(".wp-header-end");G.on("click.wp-submenu-head",".wp-submenu-head",function(b){a(b.target).parent().siblings("a").get(0).click()}),a("#collapse-button").on("click.collapse-menu",function(){var b=n()||961;a("#adminmenu div.wp-submenu").css("margin-top",""),b<960?g.hasClass("auto-fold")?(g.removeClass("auto-fold").removeClass("folded"),setUserSetting("unfold",1),setUserSetting("mfold","o"),x="open"):(g.addClass("auto-fold"),setUserSetting("unfold",0),x="folded"):g.hasClass("folded")?(g.removeClass("folded"),setUserSetting("mfold","o"),x="open"):(g.addClass("folded"),setUserSetting("mfold","f"),x="folded"),e.trigger("wp-collapse-menu",{state:x})}),e.on("wp-menu-state-set wp-collapse-menu wp-responsive-activate wp-responsive-deactivate",c),("ontouchstart"in b||/IEMobile\/[1-9]/.test(navigator.userAgent))&&(u=B?"touchstart":"click",g.on(u+".wp-mobile-hover",function(b){G.data("wp-responsive")||a(b.target).closest("#adminmenu").length||G.find("li.opensub").removeClass("opensub")}),G.find("a.wp-has-submenu").on(u+".wp-mobile-hover",function(b){var c=a(this).parent();G.data("wp-responsive")||c.hasClass("opensub")||c.hasClass("wp-menu-open")&&!(c.width()<40)||(b.preventDefault(),d(c),G.find("li.opensub").removeClass("opensub"),c.addClass("opensub"))})),B||C||(G.find("li.wp-has-submenu").hoverIntent({over:function(){var b=a(this),c=b.find(".wp-submenu"),e=parseInt(c.css("top"),10);isNaN(e)||e>-5||G.data("wp-responsive")||(d(b),G.find("li.opensub").removeClass("opensub"),b.addClass("opensub"))},out:function(){G.data("wp-responsive")||a(this).removeClass("opensub").find(".wp-submenu").css("margin-top","")},timeout:200,sensitivity:7,interval:90}),G.on("focus.adminmenu",".wp-submenu a",function(b){G.data("wp-responsive")||a(b.target).closest("li.menu-top").addClass("opensub")}).on("blur.adminmenu",".wp-submenu a",function(b){G.data("wp-responsive")||a(b.target).closest("li.menu-top").removeClass("opensub")}).find("li.wp-has-submenu.wp-not-current-submenu").on("focusin.adminmenu",function(){d(a(this))})),T.length||(T=a(".wrap h1, .wrap h2").first()),a("div.updated, div.error, div.notice").not(".inline, .below-h2").insertAfter(T),e.on("wp-updates-notice-added wp-plugin-install-error wp-plugin-update-error wp-plugin-delete-error wp-theme-install-error wp-theme-delete-error",h),screenMeta.init(),g.on("click","tbody > tr > .check-column :checkbox",function(b){if("undefined"==b.shiftKey)return!0;if(b.shiftKey){if(!y)return!0;p=a(y).closest("form").find(":checkbox").filter(":visible:enabled"),q=p.index(y),r=p.index(this),s=a(this).prop("checked"),0<q&&0<r&&q!=r&&(t=r>q?p.slice(q,r):p.slice(r,q),t.prop("checked",function(){return!!a(this).closest("tr").is(":visible")&&s}))}y=this;var c=a(this).closest("tbody").find(":checkbox").filter(":visible:enabled").not(":checked");return a(this).closest("table").children("thead, tfoot").find(":checkbox").prop("checked",function(){return 0===c.length}),!0}),g.on("click.wp-toggle-checkboxes","thead .check-column :checkbox, tfoot .check-column :checkbox",function(b){var c=a(this),d=c.closest("table"),e=c.prop("checked"),f=b.shiftKey||c.data("wp-toggle");d.children("tbody").filter(":visible").children().children(".check-column").find(":checkbox").prop("checked",function(){return!a(this).is(":hidden,:disabled")&&(f?!a(this).prop("checked"):!!e)}),d.children("thead,  tfoot").filter(":visible").children().children(".check-column").find(":checkbox").prop("checked",function(){return!f&&!!e})}),a("#wpbody-content").on({focusin:function(){clearTimeout(v),w=a(this).find(".row-actions"),a(".row-actions").not(this).removeClass("visible"),w.addClass("visible")},focusout:function(){v=setTimeout(function(){w.removeClass("visible")},30)}},".has-row-actions"),a("tbody").on("click",".toggle-row",function(){a(this).closest("tr").toggleClass("is-expanded")}),a("#default-password-nag-no").click(function(){return setUserSetting("default_password_nag","hide"),a("div.default-password-nag").hide(),!1}),a("#newcontent").bind("keydown.wpevent_InsertTab",function(b){var c,d,e,f,g,h=b.target;if(27==b.keyCode)return b.preventDefault(),void a(h).data("tab-out",!0);if(!(9!=b.keyCode||b.ctrlKey||b.altKey||b.shiftKey)){if(a(h).data("tab-out"))return void a(h).data("tab-out",!1);c=h.selectionStart,d=h.selectionEnd,e=h.value,document.selection?(h.focus(),g=document.selection.createRange(),g.text="\t"):c>=0&&(f=this.scrollTop,h.value=e.substring(0,c).concat("\t",e.substring(d)),h.selectionStart=h.selectionEnd=c+1,this.scrollTop=f),b.stopPropagation&&b.stopPropagation(),b.preventDefault&&b.preventDefault()}}),z.length&&z.closest("form").submit(function(){a('select[name="action"]').val()==-1&&a('select[name="action2"]').val()==-1&&z.val()==A&&z.val("1")}),a('.search-box input[type="search"], .search-box input[type="submit"]').mousedown(function(){a('select[name^="action"]').val("-1")}),a("#contextual-help-link, #show-settings-link").on("focus.scroll-into-view",function(a){a.target.scrollIntoView&&a.target.scrollIntoView(!1)}),function(){function b(){c.prop("disabled",""===d.map(function(){return a(this).val()}).get().join(""))}var c,d,e=a("form.wp-upload-form");e.length&&(c=e.find('input[type="submit"]'),d=e.find('input[type="file"]'),b(),d.on("change",b))}(),B||(f.on("scroll.pin-menu",i),e.on("tinymce-editor-init.pin-menu",function(a,b){b.on("wp-autoresize",j)})),b.wpResponsive={init:function(){var c=this;e.on("wp-responsive-activate.wp-responsive",function(){c.activate()}).on("wp-responsive-deactivate.wp-responsive",function(){c.deactivate()}),a("#wp-admin-bar-menu-toggle a").attr("aria-expanded","false"),a("#wp-admin-bar-menu-toggle").on("click.wp-responsive",function(b){b.preventDefault(),M.find(".hover").removeClass("hover"),F.toggleClass("wp-responsive-open"),F.hasClass("wp-responsive-open")?(a(this).find("a").attr("aria-expanded","true"),a("#adminmenu a:first").focus()):a(this).find("a").attr("aria-expanded","false")}),G.on("click.wp-responsive","li.wp-has-submenu > a",function(b){G.data("wp-responsive")&&(a(this).parent("li").toggleClass("selected"),b.preventDefault())}),c.trigger(),e.on("wp-window-resized.wp-responsive",a.proxy(this.trigger,this)),f.on("load.wp-responsive",function(){var a=navigator.userAgent.indexOf("AppleWebKit/")>-1?f.width():b.innerWidth;a<=782&&c.disableSortables()})},activate:function(){l(),g.hasClass("auto-fold")||g.addClass("auto-fold"),G.data("wp-responsive",1),this.disableSortables()},deactivate:function(){l(),G.removeData("wp-responsive"),this.enableSortables()},trigger:function(){var a=n();a&&(a<=782?L||(e.trigger("wp-responsive-activate"),L=!0):L&&(e.trigger("wp-responsive-deactivate"),L=!1),a<=480?this.enableOverlay():this.disableOverlay())},enableOverlay:function(){0===H.length&&(H=a('<div id="wp-responsive-overlay"></div>').insertAfter("#wpcontent").hide().on("click.wp-responsive",function(){I.find(".menupop.hover").removeClass("hover"),a(this).hide()})),J.on("click.wp-responsive",function(){H.show()})},disableOverlay:function(){J.off("click.wp-responsive"),H.hide()},disableSortables:function(){if(K.length)try{K.sortable("disable")}catch(a){}},enableSortables:function(){if(K.length)try{K.sortable("enable")}catch(a){}}},a(document).ajaxComplete(function(){m()}),e.on("wp-window-resized.set-menu-state",o),e.on("wp-menu-state-set wp-collapse-menu",function(b,c){var d=a("#collapse-button"),e="true",f=commonL10n.collapseMenu;"folded"===c.state&&(e="false",f=commonL10n.expandMenu),d.attr({"aria-expanded":e,"aria-label":f})}),b.wpResponsive.init(),l(),o(),c(),h(),m(),e.on("wp-pin-menu wp-window-resized.pin-menu postboxes-columnchange.pin-menu postbox-toggled.pin-menu wp-collapse-menu.pin-menu wp-scroll-start.pin-menu",l),a(".wp-initial-focus").focus(),g.on("click",".js-update-details-toggle",function(){var b=a(this).closest(".js-update-details"),c=a("#"+b.data("update-details"));c.hasClass("update-details-moved")||c.insertAfter(b).addClass("update-details-moved"),c.toggle(),a(this).attr("aria-expanded",c.is(":visible"))})}),function(){function a(){e.trigger("wp-window-resized")}function c(){b.clearTimeout(d),d=b.setTimeout(a,200)}var d;f.on("resize.wp-fire-once",c)}(),function(){if("-ms-user-select"in document.documentElement.style&&navigator.userAgent.match(/IEMobile\/10\.0/)){var a=document.createElement("style");a.appendChild(document.createTextNode("@-ms-viewport{width:auto!important}")),document.getElementsByTagName("head")[0].appendChild(a)}}()}(jQuery,window);;
"undefined"!=typeof jQuery?("undefined"==typeof jQuery.fn.hoverIntent&&!function(a){a.fn.hoverIntent=function(b,c,d){var e={interval:100,sensitivity:6,timeout:0};e="object"==typeof b?a.extend(e,b):a.isFunction(c)?a.extend(e,{over:b,out:c,selector:d}):a.extend(e,{over:b,out:b,selector:c});var f,g,h,i,j=function(a){f=a.pageX,g=a.pageY},k=function(b,c){return c.hoverIntent_t=clearTimeout(c.hoverIntent_t),Math.sqrt((h-f)*(h-f)+(i-g)*(i-g))<e.sensitivity?(a(c).off("mousemove.hoverIntent",j),c.hoverIntent_s=!0,e.over.apply(c,[b])):(h=f,i=g,void(c.hoverIntent_t=setTimeout(function(){k(b,c)},e.interval)))},l=function(a,b){return b.hoverIntent_t=clearTimeout(b.hoverIntent_t),b.hoverIntent_s=!1,e.out.apply(b,[a])},m=function(b){var c=a.extend({},b),d=this;d.hoverIntent_t&&(d.hoverIntent_t=clearTimeout(d.hoverIntent_t)),"mouseenter"===b.type?(h=c.pageX,i=c.pageY,a(d).on("mousemove.hoverIntent",j),d.hoverIntent_s||(d.hoverIntent_t=setTimeout(function(){k(c,d)},e.interval))):(a(d).off("mousemove.hoverIntent",j),d.hoverIntent_s&&(d.hoverIntent_t=setTimeout(function(){l(c,d)},e.timeout)))};return this.on({"mouseenter.hoverIntent":m,"mouseleave.hoverIntent":m},e.selector)}}(jQuery),jQuery(document).ready(function(a){var b,c,d,e=a("#wpadminbar"),f=!1;b=function(b,c){var d=a(c),e=d.attr("tabindex");e&&d.attr("tabindex","0").attr("tabindex",e)},c=function(b){e.find("li.menupop").on("click.wp-mobile-hover",function(c){var d=a(this);d.parent().is("#wp-admin-bar-root-default")&&!d.hasClass("hover")?(c.preventDefault(),e.find("li.menupop.hover").removeClass("hover"),d.addClass("hover")):d.hasClass("hover")?a(c.target).closest("div").hasClass("ab-sub-wrapper")||(c.stopPropagation(),c.preventDefault(),d.removeClass("hover")):(c.stopPropagation(),c.preventDefault(),d.addClass("hover")),b&&(a("li.menupop").off("click.wp-mobile-hover"),f=!1)})},d=function(){var b=/Mobile\/.+Safari/.test(navigator.userAgent)?"touchstart":"click";a(document.body).on(b+".wp-mobile-hover",function(b){a(b.target).closest("#wpadminbar").length||e.find("li.menupop.hover").removeClass("hover")})},e.removeClass("nojq").removeClass("nojs"),"ontouchstart"in window?(e.on("touchstart",function(){c(!0),f=!0}),d()):/IEMobile\/[1-9]/.test(navigator.userAgent)&&(c(),d()),e.find("li.menupop").hoverIntent({over:function(){f||a(this).addClass("hover")},out:function(){f||a(this).removeClass("hover")},timeout:180,sensitivity:7,interval:100}),window.location.hash&&window.scrollBy(0,-32),a("#wp-admin-bar-get-shortlink").click(function(b){b.preventDefault(),a(this).addClass("selected").children(".shortlink-input").blur(function(){a(this).parents("#wp-admin-bar-get-shortlink").removeClass("selected")}).focus().select()}),a("#wpadminbar li.menupop > .ab-item").bind("keydown.adminbar",function(c){if(13==c.which){var d=a(c.target),e=d.closest(".ab-sub-wrapper"),f=d.parent().hasClass("hover");c.stopPropagation(),c.preventDefault(),e.length||(e=a("#wpadminbar .quicklinks")),e.find(".menupop").removeClass("hover"),f||d.parent().toggleClass("hover"),d.siblings(".ab-sub-wrapper").find(".ab-item").each(b)}}).each(b),a("#wpadminbar .ab-item").bind("keydown.adminbar",function(c){if(27==c.which){var d=a(c.target);c.stopPropagation(),c.preventDefault(),d.closest(".hover").removeClass("hover").children(".ab-item").focus(),d.siblings(".ab-sub-wrapper").find(".ab-item").each(b)}}),e.click(function(b){"wpadminbar"!=b.target.id&&"wp-admin-bar-top-secondary"!=b.target.id||(e.find("li.menupop.hover").removeClass("hover"),a("html, body").animate({scrollTop:0},"fast"),b.preventDefault())}),a(".screen-reader-shortcut").keydown(function(b){var c,d;13==b.which&&(c=a(this).attr("href"),d=navigator.userAgent.toLowerCase(),d.indexOf("applewebkit")!=-1&&c&&"#"==c.charAt(0)&&setTimeout(function(){a(c).focus()},100))}),a("#adminbar-search").on({focus:function(){a("#adminbarsearch").addClass("adminbar-focused")},blur:function(){a("#adminbarsearch").removeClass("adminbar-focused")}}),"sessionStorage"in window&&a("#wp-admin-bar-logout a").click(function(){try{for(var a in sessionStorage)a.indexOf("wp-autosave-")!=-1&&sessionStorage.removeItem(a)}catch(b){}}),navigator.userAgent&&document.body.className.indexOf("no-font-face")===-1&&/Android (1.0|1.1|1.5|1.6|2.0|2.1)|Nokia|Opera Mini|w(eb)?OSBrowser|webOS|UCWEB|Windows Phone OS 7|XBLWP7|ZuneWP7|MSIE 7/.test(navigator.userAgent)&&(document.body.className+=" no-font-face")})):!function(a,b){var c,d=function(a,b,c){a&&"function"==typeof a.addEventListener?a.addEventListener(b,c,!1):a&&"function"==typeof a.attachEvent&&a.attachEvent("on"+b,function(){return c.call(a,window.event)})},e=new RegExp("\\bhover\\b","g"),f=[],g=new RegExp("\\bselected\\b","g"),h=function(a){for(var b=f.length;b--;)if(f[b]&&a==f[b][1])return f[b][0];return!1},i=function(b){for(var d,i,j,k,l,m,n=[],o=0;b&&b!=c&&b!=a;)"LI"==b.nodeName.toUpperCase()&&(n[n.length]=b,i=h(b),i&&clearTimeout(i),b.className=b.className?b.className.replace(e,"")+" hover":"hover",k=b),b=b.parentNode;if(k&&k.parentNode&&(l=k.parentNode,l&&"UL"==l.nodeName.toUpperCase()))for(d=l.childNodes.length;d--;)m=l.childNodes[d],m!=k&&(m.className=m.className?m.className.replace(g,""):"");for(d=f.length;d--;){for(j=!1,o=n.length;o--;)n[o]==f[d][1]&&(j=!0);j||(f[d][1].className=f[d][1].className?f[d][1].className.replace(e,""):"")}},j=function(b){for(;b&&b!=c&&b!=a;)"LI"==b.nodeName.toUpperCase()&&!function(a){var b=setTimeout(function(){a.className=a.className?a.className.replace(e,""):""},500);f[f.length]=[b,a]}(b),b=b.parentNode},k=function(b){for(var d,e,f,h=b.target||b.srcElement;;){if(!h||h==a||h==c)return;if(h.id&&"wp-admin-bar-get-shortlink"==h.id)break;h=h.parentNode}for(b.preventDefault&&b.preventDefault(),b.returnValue=!1,-1==h.className.indexOf("selected")&&(h.className+=" selected"),d=0,e=h.childNodes.length;d<e;d++)if(f=h.childNodes[d],f.className&&-1!=f.className.indexOf("shortlink-input")){f.focus(),f.select(),f.onblur=function(){h.className=h.className?h.className.replace(g,""):""};break}return!1},l=function(a){var b,c,d,e,f,g;if(!("wpadminbar"!=a.id&&"wp-admin-bar-top-secondary"!=a.id||(b=window.pageYOffset||document.documentElement.scrollTop||document.body.scrollTop||0,b<1)))for(g=b>800?130:100,c=Math.min(12,Math.round(b/g)),d=b>800?Math.round(b/30):Math.round(b/20),e=[],f=0;b;)b-=d,b<0&&(b=0),e.push(b),setTimeout(function(){window.scrollTo(0,e.shift())},f*c),f++};d(b,"load",function(){c=a.getElementById("wpadminbar"),a.body&&c&&(a.body.appendChild(c),c.className&&(c.className=c.className.replace(/nojs/,"")),d(c,"mouseover",function(a){i(a.target||a.srcElement)}),d(c,"mouseout",function(a){j(a.target||a.srcElement)}),d(c,"click",k),d(c,"click",function(a){l(a.target||a.srcElement)}),d(document.getElementById("wp-admin-bar-logout"),"click",function(){if("sessionStorage"in window)try{for(var a in sessionStorage)a.indexOf("wp-autosave-")!=-1&&sessionStorage.removeItem(a)}catch(b){}})),b.location.hash&&b.scrollBy(0,-32),navigator.userAgent&&document.body.className.indexOf("no-font-face")===-1&&/Android (1.0|1.1|1.5|1.6|2.0|2.1)|Nokia|Opera Mini|w(eb)?OSBrowser|webOS|UCWEB|Windows Phone OS 7|XBLWP7|ZuneWP7|MSIE 7/.test(navigator.userAgent)&&(document.body.className+=" no-font-face")})}(document,window);;
/**
 * Attempt to re-color SVG icons used in the admin menu or the toolbar
 *
 * @output wp-admin/js/svg-painter.js
 */

window.wp = window.wp || {};

wp.svgPainter = ( function( $, window, document, undefined ) {
	'use strict';
	var selector, base64, painter,
		colorscheme = {},
		elements = [];

	$(document).ready( function() {
		// detection for browser SVG capability
		if ( document.implementation.hasFeature( 'http://www.w3.org/TR/SVG11/feature#Image', '1.1' ) ) {
			$( document.body ).removeClass( 'no-svg' ).addClass( 'svg' );
			wp.svgPainter.init();
		}
	});

	/**
	 * Needed only for IE9
	 *
	 * Based on jquery.base64.js 0.0.3 - https://github.com/yckart/jquery.base64.js
	 *
	 * Based on: https://gist.github.com/Yaffle/1284012
	 *
	 * Copyright (c) 2012 Yannick Albert (http://yckart.com)
	 * Licensed under the MIT license
	 * http://www.opensource.org/licenses/mit-license.php
	 */
	base64 = ( function() {
		var c,
			b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
			a256 = '',
			r64 = [256],
			r256 = [256],
			i = 0;

		function init() {
			while( i < 256 ) {
				c = String.fromCharCode(i);
				a256 += c;
				r256[i] = i;
				r64[i] = b64.indexOf(c);
				++i;
			}
		}

		function code( s, discard, alpha, beta, w1, w2 ) {
			var tmp, length,
				buffer = 0,
				i = 0,
				result = '',
				bitsInBuffer = 0;

			s = String(s);
			length = s.length;

			while( i < length ) {
				c = s.charCodeAt(i);
				c = c < 256 ? alpha[c] : -1;

				buffer = ( buffer << w1 ) + c;
				bitsInBuffer += w1;

				while( bitsInBuffer >= w2 ) {
					bitsInBuffer -= w2;
					tmp = buffer >> bitsInBuffer;
					result += beta.charAt(tmp);
					buffer ^= tmp << bitsInBuffer;
				}
				++i;
			}

			if ( ! discard && bitsInBuffer > 0 ) {
				result += beta.charAt( buffer << ( w2 - bitsInBuffer ) );
			}

			return result;
		}

		function btoa( plain ) {
			if ( ! c ) {
				init();
			}

			plain = code( plain, false, r256, b64, 8, 6 );
			return plain + '===='.slice( ( plain.length % 4 ) || 4 );
		}

		function atob( coded ) {
			var i;

			if ( ! c ) {
				init();
			}

			coded = coded.replace( /[^A-Za-z0-9\+\/\=]/g, '' );
			coded = String(coded).split('=');
			i = coded.length;

			do {
				--i;
				coded[i] = code( coded[i], true, r64, a256, 6, 8 );
			} while ( i > 0 );

			coded = coded.join('');
			return coded;
		}

		return {
			atob: atob,
			btoa: btoa
		};
	})();

	return {
		init: function() {
			painter = this;
			selector = $( '#adminmenu .wp-menu-image, #wpadminbar .ab-item' );

			this.setColors();
			this.findElements();
			this.paint();
		},

		setColors: function( colors ) {
			if ( typeof colors === 'undefined' && typeof window._wpColorScheme !== 'undefined' ) {
				colors = window._wpColorScheme;
			}

			if ( colors && colors.icons && colors.icons.base && colors.icons.current && colors.icons.focus ) {
				colorscheme = colors.icons;
			}
		},

		findElements: function() {
			selector.each( function() {
				var $this = $(this), bgImage = $this.css( 'background-image' );

				if ( bgImage && bgImage.indexOf( 'data:image/svg+xml;base64' ) != -1 ) {
					elements.push( $this );
				}
			});
		},

		paint: function() {
			// loop through all elements
			$.each( elements, function( index, $element ) {
				var $menuitem = $element.parent().parent();

				if ( $menuitem.hasClass( 'current' ) || $menuitem.hasClass( 'wp-has-current-submenu' ) ) {
					// paint icon in 'current' color
					painter.paintElement( $element, 'current' );
				} else {
					// paint icon in base color
					painter.paintElement( $element, 'base' );

					// set hover callbacks
					$menuitem.hover(
						function() {
							painter.paintElement( $element, 'focus' );
						},
						function() {
							// Match the delay from hoverIntent
							window.setTimeout( function() {
								painter.paintElement( $element, 'base' );
							}, 100 );
						}
					);
				}
			});
		},

		paintElement: function( $element, colorType ) {
			var xml, encoded, color;

			if ( ! colorType || ! colorscheme.hasOwnProperty( colorType ) ) {
				return;
			}

			color = colorscheme[ colorType ];

			// only accept hex colors: #101 or #101010
			if ( ! color.match( /^(#[0-9a-f]{3}|#[0-9a-f]{6})$/i ) ) {
				return;
			}

			xml = $element.data( 'wp-ui-svg-' + color );

			if ( xml === 'none' ) {
				return;
			}

			if ( ! xml ) {
				encoded = $element.css( 'background-image' ).match( /.+data:image\/svg\+xml;base64,([A-Za-z0-9\+\/\=]+)/ );

				if ( ! encoded || ! encoded[1] ) {
					$element.data( 'wp-ui-svg-' + color, 'none' );
					return;
				}

				try {
					if ( 'atob' in window ) {
						xml = window.atob( encoded[1] );
					} else {
						xml = base64.atob( encoded[1] );
					}
				} catch ( error ) {}

				if ( xml ) {
					// replace `fill` attributes
					xml = xml.replace( /fill="(.+?)"/g, 'fill="' + color + '"');

					// replace `style` attributes
					xml = xml.replace( /style="(.+?)"/g, 'style="fill:' + color + '"');

					// replace `fill` properties in `<style>` tags
					xml = xml.replace( /fill:.*?;/g, 'fill: ' + color + ';');

					if ( 'btoa' in window ) {
						xml = window.btoa( xml );
					} else {
						xml = base64.btoa( xml );
					}

					$element.data( 'wp-ui-svg-' + color, xml );
				} else {
					$element.data( 'wp-ui-svg-' + color, 'none' );
					return;
				}
			}

			$element.attr( 'style', 'background-image: url("data:image/svg+xml;base64,' + xml + '") !important;' );
		}
	};

})( jQuery, window, document );
;
!function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var c="function"==typeof require&&require;if(!u&&c)return c(o,!0);if(i)return i(o,!0);var a=new Error("Cannot find module '"+o+"'");throw a.code="MODULE_NOT_FOUND",a}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(n){var r=t[o][1][n];return s(r||n)},f,f.exports,e,t,n,r)}return n[o].exports}for(var i="function"==typeof require&&require,o=0;o<r.length;o++)s(r[o]);return s}return e}()({1:[function(t,n,r){(function(n){"use strict";t(2),t(3),t(9),t(8),t(10),t(5),t(6),t(4),t(7),t(279),t(280),n._babelPolyfill&&"undefined"!=typeof console&&console.warn&&console.warn("@babel/polyfill is loaded more than once on this page. This is probably not desirable/intended and may have consequences if different versions of the polyfills are applied sequentially. If you do need to load the polyfill more than once, use @babel/polyfill/noConflict instead to bypass the warning."),n._babelPolyfill=!0}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{10:10,2:2,279:279,280:280,3:3,4:4,5:5,6:6,7:7,8:8,9:9}],2:[function(t,n,r){t(254),t(190),t(192),t(191),t(194),t(196),t(201),t(195),t(193),t(203),t(202),t(198),t(199),t(197),t(189),t(200),t(204),t(205),t(156),t(158),t(157),t(207),t(206),t(177),t(187),t(188),t(178),t(179),t(180),t(181),t(182),t(183),t(184),t(185),t(186),t(160),t(161),t(162),t(163),t(164),t(165),t(166),t(167),t(168),t(169),t(170),t(171),t(172),t(173),t(174),t(175),t(176),t(241),t(246),t(253),t(244),t(236),t(237),t(242),t(247),t(249),t(232),t(233),t(234),t(235),t(238),t(239),t(240),t(243),t(245),t(248),t(250),t(251),t(252),t(151),t(153),t(152),t(155),t(154),t(139),t(137),t(144),t(141),t(147),t(149),t(136),t(143),t(133),t(148),t(131),t(146),t(145),t(138),t(142),t(130),t(132),t(135),t(134),t(150),t(140),t(223),t(224),t(230),t(225),t(226),t(227),t(228),t(229),t(208),t(159),t(231),t(266),t(267),t(255),t(256),t(261),t(264),t(265),t(259),t(262),t(260),t(263),t(257),t(258),t(209),t(210),t(211),t(212),t(213),t(216),t(214),t(215),t(217),t(218),t(219),t(220),t(222),t(221),n.exports=t(30)},{130:130,131:131,132:132,133:133,134:134,135:135,136:136,137:137,138:138,139:139,140:140,141:141,142:142,143:143,144:144,145:145,146:146,147:147,148:148,149:149,150:150,151:151,152:152,153:153,154:154,155:155,156:156,157:157,158:158,159:159,160:160,161:161,162:162,163:163,164:164,165:165,166:166,167:167,168:168,169:169,170:170,171:171,172:172,173:173,174:174,175:175,176:176,177:177,178:178,179:179,180:180,181:181,182:182,183:183,184:184,185:185,186:186,187:187,188:188,189:189,190:190,191:191,192:192,193:193,194:194,195:195,196:196,197:197,198:198,199:199,200:200,201:201,202:202,203:203,204:204,205:205,206:206,207:207,208:208,209:209,210:210,211:211,212:212,213:213,214:214,215:215,216:216,217:217,218:218,219:219,220:220,221:221,222:222,223:223,224:224,225:225,226:226,227:227,228:228,229:229,230:230,231:231,232:232,233:233,234:234,235:235,236:236,237:237,238:238,239:239,240:240,241:241,242:242,243:243,244:244,245:245,246:246,247:247,248:248,249:249,250:250,251:251,252:252,253:253,254:254,255:255,256:256,257:257,258:258,259:259,260:260,261:261,262:262,263:263,264:264,265:265,266:266,267:267,30:30}],3:[function(t,n,r){t(268),n.exports=t(30).Array.includes},{268:268,30:30}],4:[function(t,n,r){t(269),n.exports=t(30).Object.entries},{269:269,30:30}],5:[function(t,n,r){t(270),n.exports=t(30).Object.getOwnPropertyDescriptors},{270:270,30:30}],6:[function(t,n,r){t(271),n.exports=t(30).Object.values},{271:271,30:30}],7:[function(t,n,r){"use strict";t(208),t(272),n.exports=t(30).Promise.finally},{208:208,272:272,30:30}],8:[function(t,n,r){t(273),n.exports=t(30).String.padEnd},{273:273,30:30}],9:[function(t,n,r){t(274),n.exports=t(30).String.padStart},{274:274,30:30}],10:[function(t,n,r){t(275),n.exports=t(127).f("asyncIterator")},{127:127,275:275}],11:[function(t,n,r){n.exports=function(t){if("function"!=typeof t)throw TypeError(t+" is not a function!");return t}},{}],12:[function(t,n,r){var e=t(26);n.exports=function(t,n){if("number"!=typeof t&&"Number"!=e(t))throw TypeError(n);return+t}},{26:26}],13:[function(t,n,r){var e=t(128)("unscopables"),i=Array.prototype;void 0==i[e]&&t(48)(i,e,{}),n.exports=function(t){i[e][t]=!0}},{128:128,48:48}],14:[function(t,n,r){"use strict";var e=t(105)(!0);n.exports=function(t,n,r){return n+(r?e(t,n).length:1)}},{105:105}],15:[function(t,n,r){n.exports=function(t,n,r,e){if(!(t instanceof n)||void 0!==e&&e in t)throw TypeError(r+": incorrect invocation!");return t}},{}],16:[function(t,n,r){var e=t(57);n.exports=function(t){if(!e(t))throw TypeError(t+" is not an object!");return t}},{57:57}],17:[function(t,n,r){"use strict";var e=t(118),i=t(113),o=t(117);n.exports=[].copyWithin||function copyWithin(t,n){var r=e(this),u=o(r.length),c=i(t,u),a=i(n,u),f=arguments.length>2?arguments[2]:void 0,s=Math.min((void 0===f?u:i(f,u))-a,u-c),l=1;for(a<c&&c<a+s&&(l=-1,a+=s-1,c+=s-1);s-- >0;)a in r?r[c]=r[a]:delete r[c],c+=l,a+=l;return r}},{113:113,117:117,118:118}],18:[function(t,n,r){"use strict";var e=t(118),i=t(113),o=t(117);n.exports=function fill(t){for(var n=e(this),r=o(n.length),u=arguments.length,c=i(u>1?arguments[1]:void 0,r),a=u>2?arguments[2]:void 0,f=void 0===a?r:i(a,r);f>c;)n[c++]=t;return n}},{113:113,117:117,118:118}],19:[function(t,n,r){var e=t(116),i=t(117),o=t(113);n.exports=function(t){return function(n,r,u){var c,a=e(n),f=i(a.length),s=o(u,f);if(t&&r!=r){for(;f>s;)if((c=a[s++])!=c)return!0}else for(;f>s;s++)if((t||s in a)&&a[s]===r)return t||s||0;return!t&&-1}}},{113:113,116:116,117:117}],20:[function(t,n,r){var e=t(32),i=t(53),o=t(118),u=t(117),c=t(23);n.exports=function(t,n){var r=1==t,a=2==t,f=3==t,s=4==t,l=6==t,h=5==t||l,p=n||c;return function(n,c,v){for(var d,y,g=o(n),x=i(g),m=e(c,v,3),b=u(x.length),S=0,w=r?p(n,b):a?p(n,0):void 0;b>S;S++)if((h||S in x)&&(d=x[S],y=m(d,S,g),t))if(r)w[S]=y;else if(y)switch(t){case 3:return!0;case 5:return d;case 6:return S;case 2:w.push(d)}else if(s)return!1;return l?-1:f||s?s:w}}},{117:117,118:118,23:23,32:32,53:53}],21:[function(t,n,r){var e=t(11),i=t(118),o=t(53),u=t(117);n.exports=function(t,n,r,c,a){e(n);var f=i(t),s=o(f),l=u(f.length),h=a?l-1:0,p=a?-1:1;if(r<2)for(;;){if(h in s){c=s[h],h+=p;break}if(h+=p,a?h<0:l<=h)throw TypeError("Reduce of empty array with no initial value")}for(;a?h>=0:l>h;h+=p)h in s&&(c=n(c,s[h],h,f));return c}},{11:11,117:117,118:118,53:53}],22:[function(t,n,r){var e=t(57),i=t(55),o=t(128)("species");n.exports=function(t){var n;return i(t)&&(n=t.constructor,"function"!=typeof n||n!==Array&&!i(n.prototype)||(n=void 0),e(n)&&null===(n=n[o])&&(n=void 0)),void 0===n?Array:n}},{128:128,55:55,57:57}],23:[function(t,n,r){var e=t(22);n.exports=function(t,n){return new(e(t))(n)}},{22:22}],24:[function(t,n,r){"use strict";var e=t(11),i=t(57),o=t(52),u=[].slice,c={},a=function(t,n,r){if(!(n in c)){for(var e=[],i=0;i<n;i++)e[i]="a["+i+"]";c[n]=Function("F,a","return new F("+e.join(",")+")")}return c[n](t,r)};n.exports=Function.bind||function bind(t){var n=e(this),r=u.call(arguments,1),c=function(){var e=r.concat(u.call(arguments));return this instanceof c?a(n,e.length,e):o(n,e,t)};return i(n.prototype)&&(c.prototype=n.prototype),c}},{11:11,52:52,57:57}],25:[function(t,n,r){var e=t(26),i=t(128)("toStringTag"),o="Arguments"==e(function(){return arguments}()),u=function(t,n){try{return t[n]}catch(t){}};n.exports=function(t){var n,r,c;return void 0===t?"Undefined":null===t?"Null":"string"==typeof(r=u(n=Object(t),i))?r:o?e(n):"Object"==(c=e(n))&&"function"==typeof n.callee?"Arguments":c}},{128:128,26:26}],26:[function(t,n,r){var e={}.toString;n.exports=function(t){return e.call(t).slice(8,-1)}},{}],27:[function(t,n,r){"use strict";var e=t(75).f,i=t(74),o=t(93),u=t(32),c=t(15),a=t(45),f=t(61),s=t(63),l=t(99),h=t(36),p=t(70).fastKey,v=t(125),d=h?"_s":"size",y=function(t,n){var r,e=p(n);if("F"!==e)return t._i[e];for(r=t._f;r;r=r.n)if(r.k==n)return r};n.exports={getConstructor:function(t,n,r,f){var s=t(function(t,e){c(t,s,n,"_i"),t._t=n,t._i=i(null),t._f=void 0,t._l=void 0,t[d]=0,void 0!=e&&a(e,r,t[f],t)});return o(s.prototype,{clear:function clear(){for(var t=v(this,n),r=t._i,e=t._f;e;e=e.n)e.r=!0,e.p&&(e.p=e.p.n=void 0),delete r[e.i];t._f=t._l=void 0,t[d]=0},delete:function(t){var r=v(this,n),e=y(r,t);if(e){var i=e.n,o=e.p;delete r._i[e.i],e.r=!0,o&&(o.n=i),i&&(i.p=o),r._f==e&&(r._f=i),r._l==e&&(r._l=o),r[d]--}return!!e},forEach:function forEach(t){v(this,n);for(var r,e=u(t,arguments.length>1?arguments[1]:void 0,3);r=r?r.n:this._f;)for(e(r.v,r.k,this);r&&r.r;)r=r.p},has:function has(t){return!!y(v(this,n),t)}}),h&&e(s.prototype,"size",{get:function(){return v(this,n)[d]}}),s},def:function(t,n,r){var e,i,o=y(t,n);return o?o.v=r:(t._l=o={i:i=p(n,!0),k:n,v:r,p:e=t._l,n:void 0,r:!1},t._f||(t._f=o),e&&(e.n=o),t[d]++,"F"!==i&&(t._i[i]=o)),t},getEntry:y,setStrong:function(t,n,r){f(t,n,function(t,r){this._t=v(t,n),this._k=r,this._l=void 0},function(){for(var t=this,n=t._k,r=t._l;r&&r.r;)r=r.p;return t._t&&(t._l=r=r?r.n:t._t._f)?"keys"==n?s(0,r.k):"values"==n?s(0,r.v):s(0,[r.k,r.v]):(t._t=void 0,s(1))},r?"entries":"values",!r,!0),l(n)}}},{125:125,15:15,32:32,36:36,45:45,61:61,63:63,70:70,74:74,75:75,93:93,99:99}],28:[function(t,n,r){"use strict";var e=t(93),i=t(70).getWeak,o=t(16),u=t(57),c=t(15),a=t(45),f=t(20),s=t(47),l=t(125),h=f(5),p=f(6),v=0,d=function(t){return t._l||(t._l=new y)},y=function(){this.a=[]},g=function(t,n){return h(t.a,function(t){return t[0]===n})};y.prototype={get:function(t){var n=g(this,t);if(n)return n[1]},has:function(t){return!!g(this,t)},set:function(t,n){var r=g(this,t);r?r[1]=n:this.a.push([t,n])},delete:function(t){var n=p(this.a,function(n){return n[0]===t});return~n&&this.a.splice(n,1),!!~n}},n.exports={getConstructor:function(t,n,r,o){var f=t(function(t,e){c(t,f,n,"_i"),t._t=n,t._i=v++,t._l=void 0,void 0!=e&&a(e,r,t[o],t)});return e(f.prototype,{delete:function(t){if(!u(t))return!1;var r=i(t);return!0===r?d(l(this,n)).delete(t):r&&s(r,this._i)&&delete r[this._i]},has:function has(t){if(!u(t))return!1;var r=i(t);return!0===r?d(l(this,n)).has(t):r&&s(r,this._i)}}),f},def:function(t,n,r){var e=i(o(n),!0);return!0===e?d(t).set(n,r):e[t._i]=r,t},ufstore:d}},{125:125,15:15,16:16,20:20,45:45,47:47,57:57,70:70,93:93}],29:[function(t,n,r){"use strict";var e=t(46),i=t(40),o=t(94),u=t(93),c=t(70),a=t(45),f=t(15),s=t(57),l=t(42),h=t(62),p=t(100),v=t(51);n.exports=function(t,n,r,d,y,g){var x=e[t],m=x,b=y?"set":"add",S=m&&m.prototype,w={},_=function(t){var n=S[t];o(S,t,"delete"==t?function(t){return!(g&&!s(t))&&n.call(this,0===t?0:t)}:"has"==t?function has(t){return!(g&&!s(t))&&n.call(this,0===t?0:t)}:"get"==t?function get(t){return g&&!s(t)?void 0:n.call(this,0===t?0:t)}:"add"==t?function add(t){return n.call(this,0===t?0:t),this}:function set(t,r){return n.call(this,0===t?0:t,r),this})};if("function"==typeof m&&(g||S.forEach&&!l(function(){(new m).entries().next()}))){var E=new m,F=E[b](g?{}:-0,1)!=E,I=l(function(){E.has(1)}),O=h(function(t){new m(t)}),P=!g&&l(function(){for(var t=new m,n=5;n--;)t[b](n,n);return!t.has(-0)});O||(m=n(function(n,r){f(n,m,t);var e=v(new x,n,m);return void 0!=r&&a(r,y,e[b],e),e}),m.prototype=S,S.constructor=m),(I||P)&&(_("delete"),_("has"),y&&_("get")),(P||F)&&_(b),g&&S.clear&&delete S.clear}else m=d.getConstructor(n,t,y,b),u(m.prototype,r),c.NEED=!0;return p(m,t),w[t]=m,i(i.G+i.W+i.F*(m!=x),w),g||d.setStrong(m,t,y),m}},{100:100,15:15,40:40,42:42,45:45,46:46,51:51,57:57,62:62,70:70,93:93,94:94}],30:[function(t,n,r){var e=n.exports={version:"2.6.1"};"number"==typeof __e&&(__e=e)},{}],31:[function(t,n,r){"use strict";var e=t(75),i=t(92);n.exports=function(t,n,r){n in t?e.f(t,n,i(0,r)):t[n]=r}},{75:75,92:92}],32:[function(t,n,r){var e=t(11);n.exports=function(t,n,r){if(e(t),void 0===n)return t;switch(r){case 1:return function(r){return t.call(n,r)};case 2:return function(r,e){return t.call(n,r,e)};case 3:return function(r,e,i){return t.call(n,r,e,i)}}return function(){return t.apply(n,arguments)}}},{11:11}],33:[function(t,n,r){"use strict";var e=t(42),i=Date.prototype.getTime,o=Date.prototype.toISOString,u=function(t){return t>9?t:"0"+t};n.exports=e(function(){return"0385-07-25T07:06:39.999Z"!=o.call(new Date(-5e13-1))})||!e(function(){o.call(new Date(NaN))})?function toISOString(){if(!isFinite(i.call(this)))throw RangeError("Invalid time value");var t=this,n=t.getUTCFullYear(),r=t.getUTCMilliseconds(),e=n<0?"-":n>9999?"+":"";return e+("00000"+Math.abs(n)).slice(e?-6:-4)+"-"+u(t.getUTCMonth()+1)+"-"+u(t.getUTCDate())+"T"+u(t.getUTCHours())+":"+u(t.getUTCMinutes())+":"+u(t.getUTCSeconds())+"."+(r>99?r:"0"+u(r))+"Z"}:o},{42:42}],34:[function(t,n,r){"use strict";var e=t(16),i=t(119);n.exports=function(t){if("string"!==t&&"number"!==t&&"default"!==t)throw TypeError("Incorrect hint");return i(e(this),"number"!=t)}},{119:119,16:16}],35:[function(t,n,r){n.exports=function(t){if(void 0==t)throw TypeError("Can't call method on  "+t);return t}},{}],36:[function(t,n,r){n.exports=!t(42)(function(){return 7!=Object.defineProperty({},"a",{get:function(){return 7}}).a})},{42:42}],37:[function(t,n,r){var e=t(57),i=t(46).document,o=e(i)&&e(i.createElement);n.exports=function(t){return o?i.createElement(t):{}}},{46:46,57:57}],38:[function(t,n,r){n.exports="constructor,hasOwnProperty,isPrototypeOf,propertyIsEnumerable,toLocaleString,toString,valueOf".split(",")},{}],39:[function(t,n,r){var e=t(83),i=t(80),o=t(84);n.exports=function(t){var n=e(t),r=i.f;if(r)for(var u,c=r(t),a=o.f,f=0;c.length>f;)a.call(t,u=c[f++])&&n.push(u);return n}},{80:80,83:83,84:84}],40:[function(t,n,r){var e=t(46),i=t(30),o=t(48),u=t(94),c=t(32),a=function(t,n,r){var f,s,l,h,p=t&a.F,v=t&a.G,d=t&a.S,y=t&a.P,g=t&a.B,x=v?e:d?e[n]||(e[n]={}):(e[n]||{}).prototype,m=v?i:i[n]||(i[n]={}),b=m.prototype||(m.prototype={});v&&(r=n);for(f in r)s=!p&&x&&void 0!==x[f],l=(s?x:r)[f],h=g&&s?c(l,e):y&&"function"==typeof l?c(Function.call,l):l,x&&u(x,f,l,t&a.U),m[f]!=l&&o(m,f,h),y&&b[f]!=l&&(b[f]=l)};e.core=i,a.F=1,a.G=2,a.S=4,a.P=8,a.B=16,a.W=32,a.U=64,a.R=128,n.exports=a},{30:30,32:32,46:46,48:48,94:94}],41:[function(t,n,r){var e=t(128)("match");n.exports=function(t){var n=/./;try{"/./"[t](n)}catch(r){try{return n[e]=!1,!"/./"[t](n)}catch(t){}}return!0}},{128:128}],42:[function(t,n,r){n.exports=function(t){try{return!!t()}catch(t){return!0}}},{}],43:[function(t,n,r){"use strict";t(224);var e=t(94),i=t(48),o=t(42),u=t(35),c=t(128),a=t(96),f=c("species"),s=!o(function(){var t=/./;return t.exec=function(){var t=[];return t.groups={a:"7"},t},"7"!=="".replace(t,"$<a>")}),l=function(){var t=/(?:)/,n=t.exec;t.exec=function(){return n.apply(this,arguments)};var r="ab".split(t);return 2===r.length&&"a"===r[0]&&"b"===r[1]}();n.exports=function(t,n,r){var h=c(t),p=!o(function(){var n={};return n[h]=function(){return 7},7!=""[t](n)}),v=p?!o(function(){var n=!1,r=/a/;return r.exec=function(){return n=!0,null},"split"===t&&(r.constructor={},r.constructor[f]=function(){return r}),r[h](""),!n}):void 0;if(!p||!v||"replace"===t&&!s||"split"===t&&!l){var d=/./[h],y=r(u,h,""[t],function maybeCallNative(t,n,r,e,i){return n.exec===a?p&&!i?{done:!0,value:d.call(n,r,e)}:{done:!0,value:t.call(r,n,e)}:{done:!1}}),g=y[0],x=y[1];e(String.prototype,t,g),i(RegExp.prototype,h,2==n?function(t,n){return x.call(t,this,n)}:function(t){return x.call(t,this)})}}},{128:128,224:224,35:35,42:42,48:48,94:94,96:96}],44:[function(t,n,r){"use strict";var e=t(16);n.exports=function(){var t=e(this),n="";return t.global&&(n+="g"),t.ignoreCase&&(n+="i"),t.multiline&&(n+="m"),t.unicode&&(n+="u"),t.sticky&&(n+="y"),n}},{16:16}],45:[function(t,n,r){var e=t(32),i=t(59),o=t(54),u=t(16),c=t(117),a=t(129),f={},s={},r=n.exports=function(t,n,r,l,h){var p,v,d,y,g=h?function(){return t}:a(t),x=e(r,l,n?2:1),m=0;if("function"!=typeof g)throw TypeError(t+" is not iterable!");if(o(g)){for(p=c(t.length);p>m;m++)if((y=n?x(u(v=t[m])[0],v[1]):x(t[m]))===f||y===s)return y}else for(d=g.call(t);!(v=d.next()).done;)if((y=i(d,x,v.value,n))===f||y===s)return y};r.BREAK=f,r.RETURN=s},{117:117,129:129,16:16,32:32,54:54,59:59}],46:[function(t,n,r){var e=n.exports="undefined"!=typeof window&&window.Math==Math?window:"undefined"!=typeof self&&self.Math==Math?self:Function("return this")();"number"==typeof __g&&(__g=e)},{}],47:[function(t,n,r){var e={}.hasOwnProperty;n.exports=function(t,n){return e.call(t,n)}},{}],48:[function(t,n,r){var e=t(75),i=t(92);n.exports=t(36)?function(t,n,r){return e.f(t,n,i(1,r))}:function(t,n,r){return t[n]=r,t}},{36:36,75:75,92:92}],49:[function(t,n,r){var e=t(46).document;n.exports=e&&e.documentElement},{46:46}],50:[function(t,n,r){n.exports=!t(36)&&!t(42)(function(){return 7!=Object.defineProperty(t(37)("div"),"a",{get:function(){return 7}}).a})},{36:36,37:37,42:42}],51:[function(t,n,r){var e=t(57),i=t(98).set;n.exports=function(t,n,r){var o,u=n.constructor;return u!==r&&"function"==typeof u&&(o=u.prototype)!==r.prototype&&e(o)&&i&&i(t,o),t}},{57:57,98:98}],52:[function(t,n,r){n.exports=function(t,n,r){var e=void 0===r;switch(n.length){case 0:return e?t():t.call(r);case 1:return e?t(n[0]):t.call(r,n[0]);case 2:return e?t(n[0],n[1]):t.call(r,n[0],n[1]);case 3:return e?t(n[0],n[1],n[2]):t.call(r,n[0],n[1],n[2]);case 4:return e?t(n[0],n[1],n[2],n[3]):t.call(r,n[0],n[1],n[2],n[3])}return t.apply(r,n)}},{}],53:[function(t,n,r){var e=t(26);n.exports=Object("z").propertyIsEnumerable(0)?Object:function(t){return"String"==e(t)?t.split(""):Object(t)}},{26:26}],54:[function(t,n,r){var e=t(64),i=t(128)("iterator"),o=Array.prototype;n.exports=function(t){return void 0!==t&&(e.Array===t||o[i]===t)}},{128:128,64:64}],55:[function(t,n,r){var e=t(26);n.exports=Array.isArray||function isArray(t){return"Array"==e(t)}},{26:26}],56:[function(t,n,r){var e=t(57),i=Math.floor;n.exports=function isInteger(t){return!e(t)&&isFinite(t)&&i(t)===t}},{57:57}],57:[function(t,n,r){n.exports=function(t){return"object"==typeof t?null!==t:"function"==typeof t}},{}],58:[function(t,n,r){var e=t(57),i=t(26),o=t(128)("match");n.exports=function(t){var n;return e(t)&&(void 0!==(n=t[o])?!!n:"RegExp"==i(t))}},{128:128,26:26,57:57}],59:[function(t,n,r){var e=t(16);n.exports=function(t,n,r,i){try{return i?n(e(r)[0],r[1]):n(r)}catch(n){var o=t.return;throw void 0!==o&&e(o.call(t)),n}}},{16:16}],60:[function(t,n,r){"use strict";var e=t(74),i=t(92),o=t(100),u={};t(48)(u,t(128)("iterator"),function(){return this}),n.exports=function(t,n,r){t.prototype=e(u,{next:i(1,r)}),o(t,n+" Iterator")}},{100:100,128:128,48:48,74:74,92:92}],61:[function(t,n,r){"use strict";var e=t(65),i=t(40),o=t(94),u=t(48),c=t(64),a=t(60),f=t(100),s=t(81),l=t(128)("iterator"),h=!([].keys&&"next"in[].keys()),p=function(){return this};n.exports=function(t,n,r,v,d,y,g){a(r,n,v);var x,m,b,S=function(t){if(!h&&t in F)return F[t];switch(t){case"keys":return function keys(){return new r(this,t)};case"values":return function values(){return new r(this,t)}}return function entries(){return new r(this,t)}},w=n+" Iterator",_="values"==d,E=!1,F=t.prototype,I=F[l]||F["@@iterator"]||d&&F[d],O=I||S(d),P=d?_?S("entries"):O:void 0,A="Array"==n?F.entries||I:I;if(A&&(b=s(A.call(new t)))!==Object.prototype&&b.next&&(f(b,w,!0),e||"function"==typeof b[l]||u(b,l,p)),_&&I&&"values"!==I.name&&(E=!0,O=function values(){return I.call(this)}),e&&!g||!h&&!E&&F[l]||u(F,l,O),c[n]=O,c[w]=p,d)if(x={values:_?O:S("values"),keys:y?O:S("keys"),entries:P},g)for(m in x)m in F||o(F,m,x[m]);else i(i.P+i.F*(h||E),n,x);return x}},{100:100,128:128,40:40,48:48,60:60,64:64,65:65,81:81,94:94}],62:[function(t,n,r){var e=t(128)("iterator"),i=!1;try{var o=[7][e]();o.return=function(){i=!0},Array.from(o,function(){throw 2})}catch(t){}n.exports=function(t,n){if(!n&&!i)return!1;var r=!1;try{var o=[7],u=o[e]();u.next=function(){return{done:r=!0}},o[e]=function(){return u},t(o)}catch(t){}return r}},{128:128}],63:[function(t,n,r){n.exports=function(t,n){return{value:n,done:!!t}}},{}],64:[function(t,n,r){n.exports={}},{}],65:[function(t,n,r){n.exports=!1},{}],66:[function(t,n,r){var e=Math.expm1;n.exports=!e||e(10)>22025.465794806718||e(10)<22025.465794806718||-2e-17!=e(-2e-17)?function expm1(t){return 0==(t=+t)?t:t>-1e-6&&t<1e-6?t+t*t/2:Math.exp(t)-1}:e},{}],67:[function(t,n,r){var e=t(69),i=Math.pow,o=i(2,-52),u=i(2,-23),c=i(2,127)*(2-u),a=i(2,-126),f=function(t){return t+1/o-1/o};n.exports=Math.fround||function fround(t){var n,r,i=Math.abs(t),s=e(t);return i<a?s*f(i/a/u)*a*u:(n=(1+u/o)*i,r=n-(n-i),r>c||r!=r?s*(1/0):s*r)}},{69:69}],68:[function(t,n,r){n.exports=Math.log1p||function log1p(t){return(t=+t)>-1e-8&&t<1e-8?t-t*t/2:Math.log(1+t)}},{}],69:[function(t,n,r){n.exports=Math.sign||function sign(t){return 0==(t=+t)||t!=t?t:t<0?-1:1}},{}],70:[function(t,n,r){var e=t(123)("meta"),i=t(57),o=t(47),u=t(75).f,c=0,a=Object.isExtensible||function(){return!0},f=!t(42)(function(){return a(Object.preventExtensions({}))}),s=function(t){u(t,e,{value:{i:"O"+ ++c,w:{}}})},l=function(t,n){if(!i(t))return"symbol"==typeof t?t:("string"==typeof t?"S":"P")+t;if(!o(t,e)){if(!a(t))return"F";if(!n)return"E";s(t)}return t[e].i},h=function(t,n){if(!o(t,e)){if(!a(t))return!0;if(!n)return!1;s(t)}return t[e].w},p=function(t){return f&&v.NEED&&a(t)&&!o(t,e)&&s(t),t},v=n.exports={KEY:e,NEED:!1,fastKey:l,getWeak:h,onFreeze:p}},{123:123,42:42,47:47,57:57,75:75}],71:[function(t,n,r){var e=t(46),i=t(112).set,o=e.MutationObserver||e.WebKitMutationObserver,u=e.process,c=e.Promise,a="process"==t(26)(u);n.exports=function(){var t,n,r,f=function(){var e,i;for(a&&(e=u.domain)&&e.exit();t;){i=t.fn,t=t.next;try{i()}catch(e){throw t?r():n=void 0,e}}n=void 0,e&&e.enter()};if(a)r=function(){u.nextTick(f)};else if(!o||e.navigator&&e.navigator.standalone)if(c&&c.resolve){var s=c.resolve(void 0);r=function(){s.then(f)}}else r=function(){i.call(e,f)};else{var l=!0,h=document.createTextNode("");new o(f).observe(h,{characterData:!0}),r=function(){h.data=l=!l}}return function(e){var i={fn:e,next:void 0};n&&(n.next=i),t||(t=i,r()),n=i}}},{112:112,26:26,46:46}],72:[function(t,n,r){"use strict";function PromiseCapability(t){var n,r;this.promise=new t(function(t,e){if(void 0!==n||void 0!==r)throw TypeError("Bad Promise constructor");n=t,r=e}),this.resolve=e(n),this.reject=e(r)}var e=t(11);n.exports.f=function(t){return new PromiseCapability(t)}},{11:11}],73:[function(t,n,r){"use strict";var e=t(83),i=t(80),o=t(84),u=t(118),c=t(53),a=Object.assign;n.exports=!a||t(42)(function(){var t={},n={},r=Symbol(),e="abcdefghijklmnopqrst";return t[r]=7,e.split("").forEach(function(t){n[t]=t}),7!=a({},t)[r]||Object.keys(a({},n)).join("")!=e})?function assign(t,n){for(var r=u(t),a=arguments.length,f=1,s=i.f,l=o.f;a>f;)for(var h,p=c(arguments[f++]),v=s?e(p).concat(s(p)):e(p),d=v.length,y=0;d>y;)l.call(p,h=v[y++])&&(r[h]=p[h]);return r}:a},{118:118,42:42,53:53,80:80,83:83,84:84}],74:[function(t,n,r){var e=t(16),i=t(76),o=t(38),u=t(101)("IE_PROTO"),c=function(){},a=function(){var n,r=t(37)("iframe"),e=o.length;for(r.style.display="none",t(49).appendChild(r),r.src="javascript:",n=r.contentWindow.document,n.open(),n.write("<script>document.F=Object<\/script>"),n.close(),a=n.F;e--;)delete a.prototype[o[e]];return a()};n.exports=Object.create||function create(t,n){var r;return null!==t?(c.prototype=e(t),r=new c,c.prototype=null,r[u]=t):r=a(),void 0===n?r:i(r,n)}},{101:101,16:16,37:37,38:38,49:49,76:76}],75:[function(t,n,r){var e=t(16),i=t(50),o=t(119),u=Object.defineProperty;r.f=t(36)?Object.defineProperty:function defineProperty(t,n,r){if(e(t),n=o(n,!0),e(r),i)try{return u(t,n,r)}catch(t){}if("get"in r||"set"in r)throw TypeError("Accessors not supported!");return"value"in r&&(t[n]=r.value),t}},{119:119,16:16,36:36,50:50}],76:[function(t,n,r){var e=t(75),i=t(16),o=t(83);n.exports=t(36)?Object.defineProperties:function defineProperties(t,n){i(t);for(var r,u=o(n),c=u.length,a=0;c>a;)e.f(t,r=u[a++],n[r]);return t}},{16:16,36:36,75:75,83:83}],77:[function(t,n,r){var e=t(84),i=t(92),o=t(116),u=t(119),c=t(47),a=t(50),f=Object.getOwnPropertyDescriptor;r.f=t(36)?f:function getOwnPropertyDescriptor(t,n){if(t=o(t),n=u(n,!0),a)try{return f(t,n)}catch(t){}if(c(t,n))return i(!e.f.call(t,n),t[n])}},{116:116,119:119,36:36,47:47,50:50,84:84,92:92}],78:[function(t,n,r){var e=t(116),i=t(79).f,o={}.toString,u="object"==typeof window&&window&&Object.getOwnPropertyNames?Object.getOwnPropertyNames(window):[],c=function(t){try{return i(t)}catch(t){return u.slice()}};n.exports.f=function getOwnPropertyNames(t){return u&&"[object Window]"==o.call(t)?c(t):i(e(t))}},{116:116,79:79}],79:[function(t,n,r){var e=t(82),i=t(38).concat("length","prototype");r.f=Object.getOwnPropertyNames||function getOwnPropertyNames(t){return e(t,i)}},{38:38,82:82}],80:[function(t,n,r){r.f=Object.getOwnPropertySymbols},{}],81:[function(t,n,r){var e=t(47),i=t(118),o=t(101)("IE_PROTO"),u=Object.prototype;n.exports=Object.getPrototypeOf||function(t){return t=i(t),e(t,o)?t[o]:"function"==typeof t.constructor&&t instanceof t.constructor?t.constructor.prototype:t instanceof Object?u:null}},{101:101,118:118,47:47}],82:[function(t,n,r){var e=t(47),i=t(116),o=t(19)(!1),u=t(101)("IE_PROTO");n.exports=function(t,n){var r,c=i(t),a=0,f=[];for(r in c)r!=u&&e(c,r)&&f.push(r);for(;n.length>a;)e(c,r=n[a++])&&(~o(f,r)||f.push(r));return f}},{101:101,116:116,19:19,47:47}],83:[function(t,n,r){var e=t(82),i=t(38);n.exports=Object.keys||function keys(t){return e(t,i)}},{38:38,82:82}],84:[function(t,n,r){r.f={}.propertyIsEnumerable},{}],85:[function(t,n,r){var e=t(40),i=t(30),o=t(42);n.exports=function(t,n){var r=(i.Object||{})[t]||Object[t],u={};u[t]=n(r),e(e.S+e.F*o(function(){r(1)}),"Object",u)}},{30:30,40:40,42:42}],86:[function(t,n,r){var e=t(83),i=t(116),o=t(84).f;n.exports=function(t){return function(n){for(var r,u=i(n),c=e(u),a=c.length,f=0,s=[];a>f;)o.call(u,r=c[f++])&&s.push(t?[r,u[r]]:u[r]);return s}}},{116:116,83:83,84:84}],87:[function(t,n,r){var e=t(79),i=t(80),o=t(16),u=t(46).Reflect;n.exports=u&&u.ownKeys||function ownKeys(t){var n=e.f(o(t)),r=i.f;return r?n.concat(r(t)):n}},{16:16,46:46,79:79,80:80}],88:[function(t,n,r){var e=t(46).parseFloat,i=t(110).trim;n.exports=1/e(t(111)+"-0")!=-1/0?function parseFloat(t){var n=i(String(t),3),r=e(n);return 0===r&&"-"==n.charAt(0)?-0:r}:e},{110:110,111:111,46:46}],89:[function(t,n,r){var e=t(46).parseInt,i=t(110).trim,o=t(111),u=/^[-+]?0[xX]/;n.exports=8!==e(o+"08")||22!==e(o+"0x16")?function parseInt(t,n){var r=i(String(t),3);return e(r,n>>>0||(u.test(r)?16:10))}:e},{110:110,111:111,46:46}],90:[function(t,n,r){n.exports=function(t){try{return{e:!1,v:t()}}catch(t){return{e:!0,v:t}}}},{}],91:[function(t,n,r){var e=t(16),i=t(57),o=t(72);n.exports=function(t,n){if(e(t),i(n)&&n.constructor===t)return n;var r=o.f(t);return(0,r.resolve)(n),r.promise}},{16:16,57:57,72:72}],92:[function(t,n,r){n.exports=function(t,n){return{enumerable:!(1&t),configurable:!(2&t),writable:!(4&t),value:n}}},{}],93:[function(t,n,r){var e=t(94);n.exports=function(t,n,r){for(var i in n)e(t,i,n[i],r);return t}},{94:94}],94:[function(t,n,r){var e=t(46),i=t(48),o=t(47),u=t(123)("src"),c=Function.toString,a=(""+c).split("toString");t(30).inspectSource=function(t){return c.call(t)},(n.exports=function(t,n,r,c){var f="function"==typeof r;f&&(o(r,"name")||i(r,"name",n)),t[n]!==r&&(f&&(o(r,u)||i(r,u,t[n]?""+t[n]:a.join(String(n)))),t===e?t[n]=r:c?t[n]?t[n]=r:i(t,n,r):(delete t[n],i(t,n,r)))})(Function.prototype,"toString",function toString(){return"function"==typeof this&&this[u]||c.call(this)})},{123:123,30:30,46:46,47:47,48:48}],95:[function(t,n,r){"use strict";var e=t(25),i=RegExp.prototype.exec;n.exports=function(t,n){var r=t.exec;if("function"==typeof r){var o=r.call(t,n);if("object"!=typeof o)throw new TypeError("RegExp exec method returned something other than an Object or null");return o}if("RegExp"!==e(t))throw new TypeError("RegExp#exec called on incompatible receiver");return i.call(t,n)}},{25:25}],96:[function(t,n,r){"use strict";var e=t(44),i=RegExp.prototype.exec,o=String.prototype.replace,u=i,c=function(){var t=/a/,n=/b*/g;return i.call(t,"a"),i.call(n,"a"),0!==t.lastIndex||0!==n.lastIndex}(),a=void 0!==/()??/.exec("")[1];(c||a)&&(u=function exec(t){var n,r,u,f,s=this;return a&&(r=new RegExp("^"+s.source+"$(?!\\s)",e.call(s))),c&&(n=s.lastIndex),u=i.call(s,t),c&&u&&(s.lastIndex=s.global?u.index+u[0].length:n),a&&u&&u.length>1&&o.call(u[0],r,function(){for(f=1;f<arguments.length-2;f++)void 0===arguments[f]&&(u[f]=void 0)}),u}),n.exports=u},{44:44}],97:[function(t,n,r){n.exports=Object.is||function is(t,n){return t===n?0!==t||1/t==1/n:t!=t&&n!=n}},{}],98:[function(t,n,r){var e=t(57),i=t(16),o=function(t,n){if(i(t),!e(n)&&null!==n)throw TypeError(n+": can't set as prototype!")};n.exports={set:Object.setPrototypeOf||("__proto__"in{}?function(n,r,e){try{e=t(32)(Function.call,t(77).f(Object.prototype,"__proto__").set,2),e(n,[]),r=!(n instanceof Array)}catch(t){r=!0}return function setPrototypeOf(t,n){return o(t,n),r?t.__proto__=n:e(t,n),t}}({},!1):void 0),check:o}},{16:16,32:32,57:57,77:77}],99:[function(t,n,r){"use strict";var e=t(46),i=t(75),o=t(36),u=t(128)("species");n.exports=function(t){var n=e[t];o&&n&&!n[u]&&i.f(n,u,{configurable:!0,get:function(){return this}})}},{128:128,36:36,46:46,75:75}],100:[function(t,n,r){var e=t(75).f,i=t(47),o=t(128)("toStringTag");n.exports=function(t,n,r){t&&!i(t=r?t:t.prototype,o)&&e(t,o,{configurable:!0,value:n})}},{128:128,47:47,75:75}],101:[function(t,n,r){var e=t(102)("keys"),i=t(123);n.exports=function(t){return e[t]||(e[t]=i(t))}},{102:102,123:123}],102:[function(t,n,r){var e=t(30),i=t(46),o=i["__core-js_shared__"]||(i["__core-js_shared__"]={});(n.exports=function(t,n){return o[t]||(o[t]=void 0!==n?n:{})})("versions",[]).push({version:e.version,mode:t(65)?"pure":"global",copyright:"© 2018 Denis Pushkarev (zloirock.ru)"})},{30:30,46:46,65:65}],103:[function(t,n,r){var e=t(16),i=t(11),o=t(128)("species");n.exports=function(t,n){var r,u=e(t).constructor;return void 0===u||void 0==(r=e(u)[o])?n:i(r)}},{11:11,128:128,16:16}],104:[function(t,n,r){"use strict";var e=t(42);n.exports=function(t,n){return!!t&&e(function(){n?t.call(null,function(){},1):t.call(null)})}},{42:42}],105:[function(t,n,r){var e=t(115),i=t(35);n.exports=function(t){return function(n,r){var o,u,c=String(i(n)),a=e(r),f=c.length;return a<0||a>=f?t?"":void 0:(o=c.charCodeAt(a),o<55296||o>56319||a+1===f||(u=c.charCodeAt(a+1))<56320||u>57343?t?c.charAt(a):o:t?c.slice(a,a+2):u-56320+(o-55296<<10)+65536)}}},{115:115,35:35}],106:[function(t,n,r){var e=t(58),i=t(35);n.exports=function(t,n,r){if(e(n))throw TypeError("String#"+r+" doesn't accept regex!");return String(i(t))}},{35:35,58:58}],107:[function(t,n,r){var e=t(40),i=t(42),o=t(35),u=/"/g,c=function(t,n,r,e){var i=String(o(t)),c="<"+n;return""!==r&&(c+=" "+r+'="'+String(e).replace(u,"&quot;")+'"'),c+">"+i+"</"+n+">"};n.exports=function(t,n){var r={};r[t]=n(c),e(e.P+e.F*i(function(){var n=""[t]('"');return n!==n.toLowerCase()||n.split('"').length>3}),"String",r)}},{35:35,40:40,42:42}],108:[function(t,n,r){var e=t(117),i=t(109),o=t(35);n.exports=function(t,n,r,u){var c=String(o(t)),a=c.length,f=void 0===r?" ":String(r),s=e(n);if(s<=a||""==f)return c;var l=s-a,h=i.call(f,Math.ceil(l/f.length));return h.length>l&&(h=h.slice(0,l)),u?h+c:c+h}},{109:109,117:117,35:35}],109:[function(t,n,r){"use strict";var e=t(115),i=t(35);n.exports=function repeat(t){var n=String(i(this)),r="",o=e(t);if(o<0||o==1/0)throw RangeError("Count can't be negative");for(;o>0;(o>>>=1)&&(n+=n))1&o&&(r+=n);return r}},{115:115,35:35}],110:[function(t,n,r){var e=t(40),i=t(35),o=t(42),u=t(111),c="["+u+"]",a="​",f=RegExp("^"+c+c+"*"),s=RegExp(c+c+"*$"),l=function(t,n,r){var i={},c=o(function(){return!!u[t]()||a[t]()!=a}),f=i[t]=c?n(h):u[t];r&&(i[r]=f),e(e.P+e.F*c,"String",i)},h=l.trim=function(t,n){return t=String(i(t)),1&n&&(t=t.replace(f,"")),2&n&&(t=t.replace(s,"")),t};n.exports=l},{111:111,35:35,40:40,42:42}],111:[function(t,n,r){n.exports="\t\n\v\f\r   ᠎             　\u2028\u2029\ufeff"},{}],
112:[function(t,n,r){var e,i,o,u=t(32),c=t(52),a=t(49),f=t(37),s=t(46),l=s.process,h=s.setImmediate,p=s.clearImmediate,v=s.MessageChannel,d=s.Dispatch,y=0,g={},x=function(){var t=+this;if(g.hasOwnProperty(t)){var n=g[t];delete g[t],n()}},m=function(t){x.call(t.data)};h&&p||(h=function setImmediate(t){for(var n=[],r=1;arguments.length>r;)n.push(arguments[r++]);return g[++y]=function(){c("function"==typeof t?t:Function(t),n)},e(y),y},p=function clearImmediate(t){delete g[t]},"process"==t(26)(l)?e=function(t){l.nextTick(u(x,t,1))}:d&&d.now?e=function(t){d.now(u(x,t,1))}:v?(i=new v,o=i.port2,i.port1.onmessage=m,e=u(o.postMessage,o,1)):s.addEventListener&&"function"==typeof postMessage&&!s.importScripts?(e=function(t){s.postMessage(t+"","*")},s.addEventListener("message",m,!1)):e="onreadystatechange"in f("script")?function(t){a.appendChild(f("script")).onreadystatechange=function(){a.removeChild(this),x.call(t)}}:function(t){setTimeout(u(x,t,1),0)}),n.exports={set:h,clear:p}},{26:26,32:32,37:37,46:46,49:49,52:52}],113:[function(t,n,r){var e=t(115),i=Math.max,o=Math.min;n.exports=function(t,n){return t=e(t),t<0?i(t+n,0):o(t,n)}},{115:115}],114:[function(t,n,r){var e=t(115),i=t(117);n.exports=function(t){if(void 0===t)return 0;var n=e(t),r=i(n);if(n!==r)throw RangeError("Wrong length!");return r}},{115:115,117:117}],115:[function(t,n,r){var e=Math.ceil,i=Math.floor;n.exports=function(t){return isNaN(t=+t)?0:(t>0?i:e)(t)}},{}],116:[function(t,n,r){var e=t(53),i=t(35);n.exports=function(t){return e(i(t))}},{35:35,53:53}],117:[function(t,n,r){var e=t(115),i=Math.min;n.exports=function(t){return t>0?i(e(t),9007199254740991):0}},{115:115}],118:[function(t,n,r){var e=t(35);n.exports=function(t){return Object(e(t))}},{35:35}],119:[function(t,n,r){var e=t(57);n.exports=function(t,n){if(!e(t))return t;var r,i;if(n&&"function"==typeof(r=t.toString)&&!e(i=r.call(t)))return i;if("function"==typeof(r=t.valueOf)&&!e(i=r.call(t)))return i;if(!n&&"function"==typeof(r=t.toString)&&!e(i=r.call(t)))return i;throw TypeError("Can't convert object to primitive value")}},{57:57}],120:[function(t,n,r){"use strict";if(t(36)){var e=t(65),i=t(46),o=t(42),u=t(40),c=t(122),a=t(121),f=t(32),s=t(15),l=t(92),h=t(48),p=t(93),v=t(115),d=t(117),y=t(114),g=t(113),x=t(119),m=t(47),b=t(25),S=t(57),w=t(118),_=t(54),E=t(74),F=t(81),I=t(79).f,O=t(129),P=t(123),A=t(128),M=t(20),k=t(19),N=t(103),j=t(140),T=t(64),L=t(62),R=t(99),C=t(18),D=t(17),G=t(75),W=t(77),U=G.f,V=W.f,B=i.RangeError,z=i.TypeError,q=i.Uint8Array,Y=Array.prototype,K=a.ArrayBuffer,$=a.DataView,J=M(0),H=M(2),X=M(3),Z=M(4),Q=M(5),tt=M(6),nt=k(!0),rt=k(!1),et=j.values,it=j.keys,ot=j.entries,ut=Y.lastIndexOf,ct=Y.reduce,at=Y.reduceRight,ft=Y.join,st=Y.sort,lt=Y.slice,ht=Y.toString,pt=Y.toLocaleString,vt=A("iterator"),dt=A("toStringTag"),yt=P("typed_constructor"),gt=P("def_constructor"),xt=c.CONSTR,mt=c.TYPED,bt=c.VIEW,St=M(1,function(t,n){return It(N(t,t[gt]),n)}),wt=o(function(){return 1===new q(new Uint16Array([1]).buffer)[0]}),_t=!!q&&!!q.prototype.set&&o(function(){new q(1).set({})}),Et=function(t,n){var r=v(t);if(r<0||r%n)throw B("Wrong offset!");return r},Ft=function(t){if(S(t)&&mt in t)return t;throw z(t+" is not a typed array!")},It=function(t,n){if(!(S(t)&&yt in t))throw z("It is not a typed array constructor!");return new t(n)},Ot=function(t,n){return Pt(N(t,t[gt]),n)},Pt=function(t,n){for(var r=0,e=n.length,i=It(t,e);e>r;)i[r]=n[r++];return i},At=function(t,n,r){U(t,n,{get:function(){return this._d[r]}})},Mt=function from(t){var n,r,e,i,o,u,c=w(t),a=arguments.length,s=a>1?arguments[1]:void 0,l=void 0!==s,h=O(c);if(void 0!=h&&!_(h)){for(u=h.call(c),e=[],n=0;!(o=u.next()).done;n++)e.push(o.value);c=e}for(l&&a>2&&(s=f(s,arguments[2],2)),n=0,r=d(c.length),i=It(this,r);r>n;n++)i[n]=l?s(c[n],n):c[n];return i},kt=function of(){for(var t=0,n=arguments.length,r=It(this,n);n>t;)r[t]=arguments[t++];return r},Nt=!!q&&o(function(){pt.call(new q(1))}),jt=function toLocaleString(){return pt.apply(Nt?lt.call(Ft(this)):Ft(this),arguments)},Tt={copyWithin:function copyWithin(t,n){return D.call(Ft(this),t,n,arguments.length>2?arguments[2]:void 0)},every:function every(t){return Z(Ft(this),t,arguments.length>1?arguments[1]:void 0)},fill:function fill(t){return C.apply(Ft(this),arguments)},filter:function filter(t){return Ot(this,H(Ft(this),t,arguments.length>1?arguments[1]:void 0))},find:function find(t){return Q(Ft(this),t,arguments.length>1?arguments[1]:void 0)},findIndex:function findIndex(t){return tt(Ft(this),t,arguments.length>1?arguments[1]:void 0)},forEach:function forEach(t){J(Ft(this),t,arguments.length>1?arguments[1]:void 0)},indexOf:function indexOf(t){return rt(Ft(this),t,arguments.length>1?arguments[1]:void 0)},includes:function includes(t){return nt(Ft(this),t,arguments.length>1?arguments[1]:void 0)},join:function join(t){return ft.apply(Ft(this),arguments)},lastIndexOf:function lastIndexOf(t){return ut.apply(Ft(this),arguments)},map:function map(t){return St(Ft(this),t,arguments.length>1?arguments[1]:void 0)},reduce:function reduce(t){return ct.apply(Ft(this),arguments)},reduceRight:function reduceRight(t){return at.apply(Ft(this),arguments)},reverse:function reverse(){for(var t,n=this,r=Ft(n).length,e=Math.floor(r/2),i=0;i<e;)t=n[i],n[i++]=n[--r],n[r]=t;return n},some:function some(t){return X(Ft(this),t,arguments.length>1?arguments[1]:void 0)},sort:function sort(t){return st.call(Ft(this),t)},subarray:function subarray(t,n){var r=Ft(this),e=r.length,i=g(t,e);return new(N(r,r[gt]))(r.buffer,r.byteOffset+i*r.BYTES_PER_ELEMENT,d((void 0===n?e:g(n,e))-i))}},Lt=function slice(t,n){return Ot(this,lt.call(Ft(this),t,n))},Rt=function set(t){Ft(this);var n=Et(arguments[1],1),r=this.length,e=w(t),i=d(e.length),o=0;if(i+n>r)throw B("Wrong length!");for(;o<i;)this[n+o]=e[o++]},Ct={entries:function entries(){return ot.call(Ft(this))},keys:function keys(){return it.call(Ft(this))},values:function values(){return et.call(Ft(this))}},Dt=function(t,n){return S(t)&&t[mt]&&"symbol"!=typeof n&&n in t&&String(+n)==String(n)},Gt=function getOwnPropertyDescriptor(t,n){return Dt(t,n=x(n,!0))?l(2,t[n]):V(t,n)},Wt=function defineProperty(t,n,r){return!(Dt(t,n=x(n,!0))&&S(r)&&m(r,"value"))||m(r,"get")||m(r,"set")||r.configurable||m(r,"writable")&&!r.writable||m(r,"enumerable")&&!r.enumerable?U(t,n,r):(t[n]=r.value,t)};xt||(W.f=Gt,G.f=Wt),u(u.S+u.F*!xt,"Object",{getOwnPropertyDescriptor:Gt,defineProperty:Wt}),o(function(){ht.call({})})&&(ht=pt=function toString(){return ft.call(this)});var Ut=p({},Tt);p(Ut,Ct),h(Ut,vt,Ct.values),p(Ut,{slice:Lt,set:Rt,constructor:function(){},toString:ht,toLocaleString:jt}),At(Ut,"buffer","b"),At(Ut,"byteOffset","o"),At(Ut,"byteLength","l"),At(Ut,"length","e"),U(Ut,dt,{get:function(){return this[mt]}}),n.exports=function(t,n,r,a){a=!!a;var f=t+(a?"Clamped":"")+"Array",l="get"+t,p="set"+t,v=i[f],g=v||{},x=v&&F(v),m=!v||!c.ABV,w={},_=v&&v.prototype,O=function(t,r){var e=t._d;return e.v[l](r*n+e.o,wt)},P=function(t,r,e){var i=t._d;a&&(e=(e=Math.round(e))<0?0:e>255?255:255&e),i.v[p](r*n+i.o,e,wt)},A=function(t,n){U(t,n,{get:function(){return O(this,n)},set:function(t){return P(this,n,t)},enumerable:!0})};m?(v=r(function(t,r,e,i){s(t,v,f,"_d");var o,u,c,a,l=0,p=0;if(S(r)){if(!(r instanceof K||"ArrayBuffer"==(a=b(r))||"SharedArrayBuffer"==a))return mt in r?Pt(v,r):Mt.call(v,r);o=r,p=Et(e,n);var g=r.byteLength;if(void 0===i){if(g%n)throw B("Wrong length!");if((u=g-p)<0)throw B("Wrong length!")}else if((u=d(i)*n)+p>g)throw B("Wrong length!");c=u/n}else c=y(r),u=c*n,o=new K(u);for(h(t,"_d",{b:o,o:p,l:u,e:c,v:new $(o)});l<c;)A(t,l++)}),_=v.prototype=E(Ut),h(_,"constructor",v)):o(function(){v(1)})&&o(function(){new v(-1)})&&L(function(t){new v,new v(null),new v(1.5),new v(t)},!0)||(v=r(function(t,r,e,i){s(t,v,f);var o;return S(r)?r instanceof K||"ArrayBuffer"==(o=b(r))||"SharedArrayBuffer"==o?void 0!==i?new g(r,Et(e,n),i):void 0!==e?new g(r,Et(e,n)):new g(r):mt in r?Pt(v,r):Mt.call(v,r):new g(y(r))}),J(x!==Function.prototype?I(g).concat(I(x)):I(g),function(t){t in v||h(v,t,g[t])}),v.prototype=_,e||(_.constructor=v));var M=_[vt],k=!!M&&("values"==M.name||void 0==M.name),N=Ct.values;h(v,yt,!0),h(_,mt,f),h(_,bt,!0),h(_,gt,v),(a?new v(1)[dt]==f:dt in _)||U(_,dt,{get:function(){return f}}),w[f]=v,u(u.G+u.W+u.F*(v!=g),w),u(u.S,f,{BYTES_PER_ELEMENT:n}),u(u.S+u.F*o(function(){g.of.call(v,1)}),f,{from:Mt,of:kt}),"BYTES_PER_ELEMENT"in _||h(_,"BYTES_PER_ELEMENT",n),u(u.P,f,Tt),R(f),u(u.P+u.F*_t,f,{set:Rt}),u(u.P+u.F*!k,f,Ct),e||_.toString==ht||(_.toString=ht),u(u.P+u.F*o(function(){new v(1).slice()}),f,{slice:Lt}),u(u.P+u.F*(o(function(){return[1,2].toLocaleString()!=new v([1,2]).toLocaleString()})||!o(function(){_.toLocaleString.call([1,2])})),f,{toLocaleString:jt}),T[f]=k?M:N,e||k||h(_,vt,N)}}else n.exports=function(){}},{103:103,113:113,114:114,115:115,117:117,118:118,119:119,121:121,122:122,123:123,128:128,129:129,140:140,15:15,17:17,18:18,19:19,20:20,25:25,32:32,36:36,40:40,42:42,46:46,47:47,48:48,54:54,57:57,62:62,64:64,65:65,74:74,75:75,77:77,79:79,81:81,92:92,93:93,99:99}],121:[function(t,n,r){"use strict";function packIEEE754(t,n,r){var e,i,o,u=new Array(r),c=8*r-n-1,a=(1<<c)-1,f=a>>1,s=23===n?O(2,-24)-O(2,-77):0,l=0,h=t<0||0===t&&1/t<0?1:0;for(t=I(t),t!=t||t===E?(i=t!=t?1:0,e=a):(e=P(A(t)/M),t*(o=O(2,-e))<1&&(e--,o*=2),t+=e+f>=1?s/o:s*O(2,1-f),t*o>=2&&(e++,o/=2),e+f>=a?(i=0,e=a):e+f>=1?(i=(t*o-1)*O(2,n),e+=f):(i=t*O(2,f-1)*O(2,n),e=0));n>=8;u[l++]=255&i,i/=256,n-=8);for(e=e<<n|i,c+=n;c>0;u[l++]=255&e,e/=256,c-=8);return u[--l]|=128*h,u}function unpackIEEE754(t,n,r){var e,i=8*r-n-1,o=(1<<i)-1,u=o>>1,c=i-7,a=r-1,f=t[a--],s=127&f;for(f>>=7;c>0;s=256*s+t[a],a--,c-=8);for(e=s&(1<<-c)-1,s>>=-c,c+=n;c>0;e=256*e+t[a],a--,c-=8);if(0===s)s=1-u;else{if(s===o)return e?NaN:f?-E:E;e+=O(2,n),s-=u}return(f?-1:1)*e*O(2,s-n)}function unpackI32(t){return t[3]<<24|t[2]<<16|t[1]<<8|t[0]}function packI8(t){return[255&t]}function packI16(t){return[255&t,t>>8&255]}function packI32(t){return[255&t,t>>8&255,t>>16&255,t>>24&255]}function packF64(t){return packIEEE754(t,52,8)}function packF32(t){return packIEEE754(t,23,4)}function addGetter(t,n,r){d(t[x],n,{get:function(){return this[r]}})}function get(t,n,r,e){var i=+r,o=p(i);if(o+n>t[N])throw _(m);var u=t[k]._b,c=o+t[j],a=u.slice(c,c+n);return e?a:a.reverse()}function set(t,n,r,e,i,o){var u=+r,c=p(u);if(c+n>t[N])throw _(m);for(var a=t[k]._b,f=c+t[j],s=e(+i),l=0;l<n;l++)a[f+l]=s[o?l:n-l-1]}var e=t(46),i=t(36),o=t(65),u=t(122),c=t(48),a=t(93),f=t(42),s=t(15),l=t(115),h=t(117),p=t(114),v=t(79).f,d=t(75).f,y=t(18),g=t(100),x="prototype",m="Wrong index!",b=e.ArrayBuffer,S=e.DataView,w=e.Math,_=e.RangeError,E=e.Infinity,F=b,I=w.abs,O=w.pow,P=w.floor,A=w.log,M=w.LN2,k=i?"_b":"buffer",N=i?"_l":"byteLength",j=i?"_o":"byteOffset";if(u.ABV){if(!f(function(){b(1)})||!f(function(){new b(-1)})||f(function(){return new b,new b(1.5),new b(NaN),"ArrayBuffer"!=b.name})){b=function ArrayBuffer(t){return s(this,b),new F(p(t))};for(var T,L=b[x]=F[x],R=v(F),C=0;R.length>C;)(T=R[C++])in b||c(b,T,F[T]);o||(L.constructor=b)}var D=new S(new b(2)),G=S[x].setInt8;D.setInt8(0,2147483648),D.setInt8(1,2147483649),!D.getInt8(0)&&D.getInt8(1)||a(S[x],{setInt8:function setInt8(t,n){G.call(this,t,n<<24>>24)},setUint8:function setUint8(t,n){G.call(this,t,n<<24>>24)}},!0)}else b=function ArrayBuffer(t){s(this,b,"ArrayBuffer");var n=p(t);this._b=y.call(new Array(n),0),this[N]=n},S=function DataView(t,n,r){s(this,S,"DataView"),s(t,b,"DataView");var e=t[N],i=l(n);if(i<0||i>e)throw _("Wrong offset!");if(r=void 0===r?e-i:h(r),i+r>e)throw _("Wrong length!");this[k]=t,this[j]=i,this[N]=r},i&&(addGetter(b,"byteLength","_l"),addGetter(S,"buffer","_b"),addGetter(S,"byteLength","_l"),addGetter(S,"byteOffset","_o")),a(S[x],{getInt8:function getInt8(t){return get(this,1,t)[0]<<24>>24},getUint8:function getUint8(t){return get(this,1,t)[0]},getInt16:function getInt16(t){var n=get(this,2,t,arguments[1]);return(n[1]<<8|n[0])<<16>>16},getUint16:function getUint16(t){var n=get(this,2,t,arguments[1]);return n[1]<<8|n[0]},getInt32:function getInt32(t){return unpackI32(get(this,4,t,arguments[1]))},getUint32:function getUint32(t){return unpackI32(get(this,4,t,arguments[1]))>>>0},getFloat32:function getFloat32(t){return unpackIEEE754(get(this,4,t,arguments[1]),23,4)},getFloat64:function getFloat64(t){return unpackIEEE754(get(this,8,t,arguments[1]),52,8)},setInt8:function setInt8(t,n){set(this,1,t,packI8,n)},setUint8:function setUint8(t,n){set(this,1,t,packI8,n)},setInt16:function setInt16(t,n){set(this,2,t,packI16,n,arguments[2])},setUint16:function setUint16(t,n){set(this,2,t,packI16,n,arguments[2])},setInt32:function setInt32(t,n){set(this,4,t,packI32,n,arguments[2])},setUint32:function setUint32(t,n){set(this,4,t,packI32,n,arguments[2])},setFloat32:function setFloat32(t,n){set(this,4,t,packF32,n,arguments[2])},setFloat64:function setFloat64(t,n){set(this,8,t,packF64,n,arguments[2])}});g(b,"ArrayBuffer"),g(S,"DataView"),c(S[x],u.VIEW,!0),r.ArrayBuffer=b,r.DataView=S},{100:100,114:114,115:115,117:117,122:122,15:15,18:18,36:36,42:42,46:46,48:48,65:65,75:75,79:79,93:93}],122:[function(t,n,r){for(var e,i=t(46),o=t(48),u=t(123),c=u("typed_array"),a=u("view"),f=!(!i.ArrayBuffer||!i.DataView),s=f,l=0,h="Int8Array,Uint8Array,Uint8ClampedArray,Int16Array,Uint16Array,Int32Array,Uint32Array,Float32Array,Float64Array".split(",");l<9;)(e=i[h[l++]])?(o(e.prototype,c,!0),o(e.prototype,a,!0)):s=!1;n.exports={ABV:f,CONSTR:s,TYPED:c,VIEW:a}},{123:123,46:46,48:48}],123:[function(t,n,r){var e=0,i=Math.random();n.exports=function(t){return"Symbol(".concat(void 0===t?"":t,")_",(++e+i).toString(36))}},{}],124:[function(t,n,r){var e=t(46),i=e.navigator;n.exports=i&&i.userAgent||""},{46:46}],125:[function(t,n,r){var e=t(57);n.exports=function(t,n){if(!e(t)||t._t!==n)throw TypeError("Incompatible receiver, "+n+" required!");return t}},{57:57}],126:[function(t,n,r){var e=t(46),i=t(30),o=t(65),u=t(127),c=t(75).f;n.exports=function(t){var n=i.Symbol||(i.Symbol=o?{}:e.Symbol||{});"_"==t.charAt(0)||t in n||c(n,t,{value:u.f(t)})}},{127:127,30:30,46:46,65:65,75:75}],127:[function(t,n,r){r.f=t(128)},{128:128}],128:[function(t,n,r){var e=t(102)("wks"),i=t(123),o=t(46).Symbol,u="function"==typeof o;(n.exports=function(t){return e[t]||(e[t]=u&&o[t]||(u?o:i)("Symbol."+t))}).store=e},{102:102,123:123,46:46}],129:[function(t,n,r){var e=t(25),i=t(128)("iterator"),o=t(64);n.exports=t(30).getIteratorMethod=function(t){if(void 0!=t)return t[i]||t["@@iterator"]||o[e(t)]}},{128:128,25:25,30:30,64:64}],130:[function(t,n,r){var e=t(40);e(e.P,"Array",{copyWithin:t(17)}),t(13)("copyWithin")},{13:13,17:17,40:40}],131:[function(t,n,r){"use strict";var e=t(40),i=t(20)(4);e(e.P+e.F*!t(104)([].every,!0),"Array",{every:function every(t){return i(this,t,arguments[1])}})},{104:104,20:20,40:40}],132:[function(t,n,r){var e=t(40);e(e.P,"Array",{fill:t(18)}),t(13)("fill")},{13:13,18:18,40:40}],133:[function(t,n,r){"use strict";var e=t(40),i=t(20)(2);e(e.P+e.F*!t(104)([].filter,!0),"Array",{filter:function filter(t){return i(this,t,arguments[1])}})},{104:104,20:20,40:40}],134:[function(t,n,r){"use strict";var e=t(40),i=t(20)(6),o="findIndex",u=!0;o in[]&&Array(1)[o](function(){u=!1}),e(e.P+e.F*u,"Array",{findIndex:function findIndex(t){return i(this,t,arguments.length>1?arguments[1]:void 0)}}),t(13)(o)},{13:13,20:20,40:40}],135:[function(t,n,r){"use strict";var e=t(40),i=t(20)(5),o=!0;"find"in[]&&Array(1).find(function(){o=!1}),e(e.P+e.F*o,"Array",{find:function find(t){return i(this,t,arguments.length>1?arguments[1]:void 0)}}),t(13)("find")},{13:13,20:20,40:40}],136:[function(t,n,r){"use strict";var e=t(40),i=t(20)(0),o=t(104)([].forEach,!0);e(e.P+e.F*!o,"Array",{forEach:function forEach(t){return i(this,t,arguments[1])}})},{104:104,20:20,40:40}],137:[function(t,n,r){"use strict";var e=t(32),i=t(40),o=t(118),u=t(59),c=t(54),a=t(117),f=t(31),s=t(129);i(i.S+i.F*!t(62)(function(t){Array.from(t)}),"Array",{from:function from(t){var n,r,i,l,h=o(t),p="function"==typeof this?this:Array,v=arguments.length,d=v>1?arguments[1]:void 0,y=void 0!==d,g=0,x=s(h);if(y&&(d=e(d,v>2?arguments[2]:void 0,2)),void 0==x||p==Array&&c(x))for(n=a(h.length),r=new p(n);n>g;g++)f(r,g,y?d(h[g],g):h[g]);else for(l=x.call(h),r=new p;!(i=l.next()).done;g++)f(r,g,y?u(l,d,[i.value,g],!0):i.value);return r.length=g,r}})},{117:117,118:118,129:129,31:31,32:32,40:40,54:54,59:59,62:62}],138:[function(t,n,r){"use strict";var e=t(40),i=t(19)(!1),o=[].indexOf,u=!!o&&1/[1].indexOf(1,-0)<0;e(e.P+e.F*(u||!t(104)(o)),"Array",{indexOf:function indexOf(t){return u?o.apply(this,arguments)||0:i(this,t,arguments[1])}})},{104:104,19:19,40:40}],139:[function(t,n,r){var e=t(40);e(e.S,"Array",{isArray:t(55)})},{40:40,55:55}],140:[function(t,n,r){"use strict";var e=t(13),i=t(63),o=t(64),u=t(116);n.exports=t(61)(Array,"Array",function(t,n){this._t=u(t),this._i=0,this._k=n},function(){var t=this._t,n=this._k,r=this._i++;return!t||r>=t.length?(this._t=void 0,i(1)):"keys"==n?i(0,r):"values"==n?i(0,t[r]):i(0,[r,t[r]])},"values"),o.Arguments=o.Array,e("keys"),e("values"),e("entries")},{116:116,13:13,61:61,63:63,64:64}],141:[function(t,n,r){"use strict";var e=t(40),i=t(116),o=[].join;e(e.P+e.F*(t(53)!=Object||!t(104)(o)),"Array",{join:function join(t){return o.call(i(this),void 0===t?",":t)}})},{104:104,116:116,40:40,53:53}],142:[function(t,n,r){"use strict";var e=t(40),i=t(116),o=t(115),u=t(117),c=[].lastIndexOf,a=!!c&&1/[1].lastIndexOf(1,-0)<0;e(e.P+e.F*(a||!t(104)(c)),"Array",{lastIndexOf:function lastIndexOf(t){if(a)return c.apply(this,arguments)||0;var n=i(this),r=u(n.length),e=r-1;for(arguments.length>1&&(e=Math.min(e,o(arguments[1]))),e<0&&(e=r+e);e>=0;e--)if(e in n&&n[e]===t)return e||0;return-1}})},{104:104,115:115,116:116,117:117,40:40}],143:[function(t,n,r){"use strict";var e=t(40),i=t(20)(1);e(e.P+e.F*!t(104)([].map,!0),"Array",{map:function map(t){return i(this,t,arguments[1])}})},{104:104,20:20,40:40}],144:[function(t,n,r){"use strict";var e=t(40),i=t(31);e(e.S+e.F*t(42)(function(){function F(){}return!(Array.of.call(F)instanceof F)}),"Array",{of:function of(){for(var t=0,n=arguments.length,r=new("function"==typeof this?this:Array)(n);n>t;)i(r,t,arguments[t++]);return r.length=n,r}})},{31:31,40:40,42:42}],145:[function(t,n,r){"use strict";var e=t(40),i=t(21);e(e.P+e.F*!t(104)([].reduceRight,!0),"Array",{reduceRight:function reduceRight(t){return i(this,t,arguments.length,arguments[1],!0)}})},{104:104,21:21,40:40}],146:[function(t,n,r){"use strict";var e=t(40),i=t(21);e(e.P+e.F*!t(104)([].reduce,!0),"Array",{reduce:function reduce(t){return i(this,t,arguments.length,arguments[1],!1)}})},{104:104,21:21,40:40}],147:[function(t,n,r){"use strict";var e=t(40),i=t(49),o=t(26),u=t(113),c=t(117),a=[].slice;e(e.P+e.F*t(42)(function(){i&&a.call(i)}),"Array",{slice:function slice(t,n){var r=c(this.length),e=o(this);if(n=void 0===n?r:n,"Array"==e)return a.call(this,t,n);for(var i=u(t,r),f=u(n,r),s=c(f-i),l=new Array(s),h=0;h<s;h++)l[h]="String"==e?this.charAt(i+h):this[i+h];return l}})},{113:113,117:117,26:26,40:40,42:42,49:49}],148:[function(t,n,r){"use strict";var e=t(40),i=t(20)(3);e(e.P+e.F*!t(104)([].some,!0),"Array",{some:function some(t){return i(this,t,arguments[1])}})},{104:104,20:20,40:40}],149:[function(t,n,r){"use strict";var e=t(40),i=t(11),o=t(118),u=t(42),c=[].sort,a=[1,2,3];e(e.P+e.F*(u(function(){a.sort(void 0)})||!u(function(){a.sort(null)})||!t(104)(c)),"Array",{sort:function sort(t){return void 0===t?c.call(o(this)):c.call(o(this),i(t))}})},{104:104,11:11,118:118,40:40,42:42}],150:[function(t,n,r){t(99)("Array")},{99:99}],151:[function(t,n,r){var e=t(40);e(e.S,"Date",{now:function(){return(new Date).getTime()}})},{40:40}],152:[function(t,n,r){var e=t(40),i=t(33);e(e.P+e.F*(Date.prototype.toISOString!==i),"Date",{toISOString:i})},{33:33,40:40}],153:[function(t,n,r){"use strict";var e=t(40),i=t(118),o=t(119);e(e.P+e.F*t(42)(function(){return null!==new Date(NaN).toJSON()||1!==Date.prototype.toJSON.call({toISOString:function(){return 1}})}),"Date",{toJSON:function toJSON(t){var n=i(this),r=o(n);return"number"!=typeof r||isFinite(r)?n.toISOString():null}})},{118:118,119:119,40:40,42:42}],154:[function(t,n,r){var e=t(128)("toPrimitive"),i=Date.prototype;e in i||t(48)(i,e,t(34))},{128:128,34:34,48:48}],155:[function(t,n,r){var e=Date.prototype,i=e.toString,o=e.getTime;new Date(NaN)+""!="Invalid Date"&&t(94)(e,"toString",function toString(){var t=o.call(this);return t===t?i.call(this):"Invalid Date"})},{94:94}],156:[function(t,n,r){var e=t(40);e(e.P,"Function",{bind:t(24)})},{24:24,40:40}],157:[function(t,n,r){"use strict";var e=t(57),i=t(81),o=t(128)("hasInstance"),u=Function.prototype;o in u||t(75).f(u,o,{value:function(t){if("function"!=typeof this||!e(t))return!1;if(!e(this.prototype))return t instanceof this;for(;t=i(t);)if(this.prototype===t)return!0;return!1}})},{128:128,57:57,75:75,81:81}],158:[function(t,n,r){var e=t(75).f,i=Function.prototype,o=/^\s*function ([^ (]*)/;"name"in i||t(36)&&e(i,"name",{configurable:!0,get:function(){try{return(""+this).match(o)[1]}catch(t){return""}}})},{36:36,75:75}],159:[function(t,n,r){"use strict";var e=t(27),i=t(125);n.exports=t(29)("Map",function(t){return function Map(){return t(this,arguments.length>0?arguments[0]:void 0)}},{get:function get(t){var n=e.getEntry(i(this,"Map"),t);return n&&n.v},set:function set(t,n){return e.def(i(this,"Map"),0===t?0:t,n)}},e,!0)},{125:125,27:27,29:29}],160:[function(t,n,r){var e=t(40),i=t(68),o=Math.sqrt,u=Math.acosh;e(e.S+e.F*!(u&&710==Math.floor(u(Number.MAX_VALUE))&&u(1/0)==1/0),"Math",{acosh:function acosh(t){return(t=+t)<1?NaN:t>94906265.62425156?Math.log(t)+Math.LN2:i(t-1+o(t-1)*o(t+1))}})},{40:40,68:68}],161:[function(t,n,r){function asinh(t){return isFinite(t=+t)&&0!=t?t<0?-asinh(-t):Math.log(t+Math.sqrt(t*t+1)):t}var e=t(40),i=Math.asinh;e(e.S+e.F*!(i&&1/i(0)>0),"Math",{asinh:asinh})},{40:40}],162:[function(t,n,r){var e=t(40),i=Math.atanh;e(e.S+e.F*!(i&&1/i(-0)<0),"Math",{atanh:function atanh(t){return 0==(t=+t)?t:Math.log((1+t)/(1-t))/2}})},{40:40}],163:[function(t,n,r){var e=t(40),i=t(69);e(e.S,"Math",{cbrt:function cbrt(t){return i(t=+t)*Math.pow(Math.abs(t),1/3)}})},{40:40,69:69}],164:[function(t,n,r){var e=t(40);e(e.S,"Math",{clz32:function clz32(t){return(t>>>=0)?31-Math.floor(Math.log(t+.5)*Math.LOG2E):32}})},{40:40}],165:[function(t,n,r){var e=t(40),i=Math.exp;e(e.S,"Math",{cosh:function cosh(t){return(i(t=+t)+i(-t))/2}})},{40:40}],166:[function(t,n,r){var e=t(40),i=t(66);e(e.S+e.F*(i!=Math.expm1),"Math",{expm1:i})},{40:40,66:66}],167:[function(t,n,r){var e=t(40);e(e.S,"Math",{fround:t(67)})},{40:40,67:67}],168:[function(t,n,r){var e=t(40),i=Math.abs;e(e.S,"Math",{hypot:function hypot(t,n){for(var r,e,o=0,u=0,c=arguments.length,a=0;u<c;)r=i(arguments[u++]),a<r?(e=a/r,o=o*e*e+1,a=r):r>0?(e=r/a,o+=e*e):o+=r;return a===1/0?1/0:a*Math.sqrt(o)}})},{40:40}],169:[function(t,n,r){var e=t(40),i=Math.imul;e(e.S+e.F*t(42)(function(){return-5!=i(4294967295,5)||2!=i.length}),"Math",{imul:function imul(t,n){var r=+t,e=+n,i=65535&r,o=65535&e;return 0|i*o+((65535&r>>>16)*o+i*(65535&e>>>16)<<16>>>0)}})},{40:40,42:42}],170:[function(t,n,r){var e=t(40);e(e.S,"Math",{log10:function log10(t){return Math.log(t)*Math.LOG10E}})},{40:40}],171:[function(t,n,r){var e=t(40);e(e.S,"Math",{log1p:t(68)})},{40:40,68:68}],172:[function(t,n,r){var e=t(40);e(e.S,"Math",{log2:function log2(t){return Math.log(t)/Math.LN2}})},{40:40}],173:[function(t,n,r){var e=t(40);e(e.S,"Math",{sign:t(69)})},{40:40,69:69}],174:[function(t,n,r){var e=t(40),i=t(66),o=Math.exp;e(e.S+e.F*t(42)(function(){return-2e-17!=!Math.sinh(-2e-17)}),"Math",{sinh:function sinh(t){return Math.abs(t=+t)<1?(i(t)-i(-t))/2:(o(t-1)-o(-t-1))*(Math.E/2)}})},{40:40,42:42,66:66}],175:[function(t,n,r){var e=t(40),i=t(66),o=Math.exp;e(e.S,"Math",{tanh:function tanh(t){var n=i(t=+t),r=i(-t);return n==1/0?1:r==1/0?-1:(n-r)/(o(t)+o(-t))}})},{40:40,66:66}],176:[function(t,n,r){var e=t(40);e(e.S,"Math",{trunc:function trunc(t){return(t>0?Math.floor:Math.ceil)(t)}})},{40:40}],177:[function(t,n,r){"use strict";var e=t(46),i=t(47),o=t(26),u=t(51),c=t(119),a=t(42),f=t(79).f,s=t(77).f,l=t(75).f,h=t(110).trim,p=e.Number,v=p,d=p.prototype,y="Number"==o(t(74)(d)),g="trim"in String.prototype,x=function(t){var n=c(t,!1);if("string"==typeof n&&n.length>2){n=g?n.trim():h(n,3);var r,e,i,o=n.charCodeAt(0);if(43===o||45===o){if(88===(r=n.charCodeAt(2))||120===r)return NaN}else if(48===o){switch(n.charCodeAt(1)){case 66:case 98:e=2,i=49;break;case 79:case 111:e=8,i=55;break;default:return+n}for(var u,a=n.slice(2),f=0,s=a.length;f<s;f++)if((u=a.charCodeAt(f))<48||u>i)return NaN;return parseInt(a,e)}}return+n};if(!p(" 0o1")||!p("0b1")||p("+0x1")){p=function Number(t){var n=arguments.length<1?0:t,r=this;return r instanceof p&&(y?a(function(){d.valueOf.call(r)}):"Number"!=o(r))?u(new v(x(n)),r,p):x(n)};for(var m,b=t(36)?f(v):"MAX_VALUE,MIN_VALUE,NaN,NEGATIVE_INFINITY,POSITIVE_INFINITY,EPSILON,isFinite,isInteger,isNaN,isSafeInteger,MAX_SAFE_INTEGER,MIN_SAFE_INTEGER,parseFloat,parseInt,isInteger".split(","),S=0;b.length>S;S++)i(v,m=b[S])&&!i(p,m)&&l(p,m,s(v,m));p.prototype=d,d.constructor=p,t(94)(e,"Number",p)}},{110:110,119:119,26:26,36:36,42:42,46:46,47:47,51:51,74:74,75:75,77:77,79:79,94:94}],178:[function(t,n,r){var e=t(40);e(e.S,"Number",{EPSILON:Math.pow(2,-52)})},{40:40}],179:[function(t,n,r){var e=t(40),i=t(46).isFinite;e(e.S,"Number",{isFinite:function isFinite(t){return"number"==typeof t&&i(t)}})},{40:40,46:46}],180:[function(t,n,r){var e=t(40);e(e.S,"Number",{isInteger:t(56)})},{40:40,56:56}],181:[function(t,n,r){var e=t(40);e(e.S,"Number",{isNaN:function isNaN(t){return t!=t}})},{40:40}],182:[function(t,n,r){var e=t(40),i=t(56),o=Math.abs;e(e.S,"Number",{isSafeInteger:function isSafeInteger(t){return i(t)&&o(t)<=9007199254740991}})},{40:40,56:56}],183:[function(t,n,r){var e=t(40);e(e.S,"Number",{MAX_SAFE_INTEGER:9007199254740991})},{40:40}],184:[function(t,n,r){var e=t(40);e(e.S,"Number",{MIN_SAFE_INTEGER:-9007199254740991})},{40:40}],185:[function(t,n,r){var e=t(40),i=t(88);e(e.S+e.F*(Number.parseFloat!=i),"Number",{parseFloat:i})},{40:40,88:88}],186:[function(t,n,r){var e=t(40),i=t(89);e(e.S+e.F*(Number.parseInt!=i),"Number",{parseInt:i})},{40:40,89:89}],187:[function(t,n,r){"use strict";var e=t(40),i=t(115),o=t(12),u=t(109),c=1..toFixed,a=Math.floor,f=[0,0,0,0,0,0],s="Number.toFixed: incorrect invocation!",l=function(t,n){for(var r=-1,e=n;++r<6;)e+=t*f[r],f[r]=e%1e7,e=a(e/1e7)},h=function(t){for(var n=6,r=0;--n>=0;)r+=f[n],f[n]=a(r/t),r=r%t*1e7},p=function(){for(var t=6,n="";--t>=0;)if(""!==n||0===t||0!==f[t]){var r=String(f[t]);n=""===n?r:n+u.call("0",7-r.length)+r}return n},v=function(t,n,r){return 0===n?r:n%2==1?v(t,n-1,r*t):v(t*t,n/2,r)},d=function(t){for(var n=0,r=t;r>=4096;)n+=12,r/=4096;for(;r>=2;)n+=1,r/=2;return n};e(e.P+e.F*(!!c&&("0.000"!==8e-5.toFixed(3)||"1"!==.9.toFixed(0)||"1.25"!==1.255.toFixed(2)||"1000000000000000128"!==(0xde0b6b3a7640080).toFixed(0))||!t(42)(function(){c.call({})})),"Number",{toFixed:function toFixed(t){var n,r,e,c,a=o(this,s),f=i(t),y="",g="0";if(f<0||f>20)throw RangeError(s);if(a!=a)return"NaN";if(a<=-1e21||a>=1e21)return String(a);if(a<0&&(y="-",a=-a),a>1e-21)if(n=d(a*v(2,69,1))-69,r=n<0?a*v(2,-n,1):a/v(2,n,1),r*=4503599627370496,(n=52-n)>0){for(l(0,r),e=f;e>=7;)l(1e7,0),e-=7;for(l(v(10,e,1),0),e=n-1;e>=23;)h(1<<23),e-=23;h(1<<e),l(1,1),h(2),g=p()}else l(0,r),l(1<<-n,0),g=p()+u.call("0",f);return f>0?(c=g.length,g=y+(c<=f?"0."+u.call("0",f-c)+g:g.slice(0,c-f)+"."+g.slice(c-f))):g=y+g,g}})},{109:109,115:115,12:12,40:40,42:42}],188:[function(t,n,r){"use strict";var e=t(40),i=t(42),o=t(12),u=1..toPrecision;e(e.P+e.F*(i(function(){return"1"!==u.call(1,void 0)})||!i(function(){u.call({})})),"Number",{toPrecision:function toPrecision(t){var n=o(this,"Number#toPrecision: incorrect invocation!");return void 0===t?u.call(n):u.call(n,t)}})},{12:12,40:40,42:42}],189:[function(t,n,r){var e=t(40);e(e.S+e.F,"Object",{assign:t(73)})},{40:40,73:73}],190:[function(t,n,r){var e=t(40);e(e.S,"Object",{create:t(74)})},{40:40,74:74}],191:[function(t,n,r){var e=t(40);e(e.S+e.F*!t(36),"Object",{defineProperties:t(76)})},{36:36,40:40,76:76}],192:[function(t,n,r){var e=t(40);e(e.S+e.F*!t(36),"Object",{defineProperty:t(75).f})},{36:36,40:40,75:75}],193:[function(t,n,r){var e=t(57),i=t(70).onFreeze;t(85)("freeze",function(t){return function freeze(n){return t&&e(n)?t(i(n)):n}})},{57:57,70:70,85:85}],194:[function(t,n,r){var e=t(116),i=t(77).f;t(85)("getOwnPropertyDescriptor",function(){return function getOwnPropertyDescriptor(t,n){return i(e(t),n)}})},{116:116,77:77,85:85}],195:[function(t,n,r){t(85)("getOwnPropertyNames",function(){return t(78).f})},{78:78,85:85}],196:[function(t,n,r){var e=t(118),i=t(81);t(85)("getPrototypeOf",function(){return function getPrototypeOf(t){return i(e(t))}})},{118:118,81:81,85:85}],197:[function(t,n,r){var e=t(57);t(85)("isExtensible",function(t){return function isExtensible(n){return!!e(n)&&(!t||t(n))}})},{57:57,85:85}],198:[function(t,n,r){var e=t(57);t(85)("isFrozen",function(t){return function isFrozen(n){return!e(n)||!!t&&t(n)}})},{57:57,85:85}],199:[function(t,n,r){var e=t(57);t(85)("isSealed",function(t){return function isSealed(n){return!e(n)||!!t&&t(n)}})},{57:57,85:85}],200:[function(t,n,r){var e=t(40);e(e.S,"Object",{is:t(97)})},{40:40,97:97}],201:[function(t,n,r){var e=t(118),i=t(83);t(85)("keys",function(){return function keys(t){return i(e(t))}})},{118:118,83:83,85:85}],202:[function(t,n,r){var e=t(57),i=t(70).onFreeze;t(85)("preventExtensions",function(t){return function preventExtensions(n){return t&&e(n)?t(i(n)):n}})},{57:57,70:70,85:85}],203:[function(t,n,r){var e=t(57),i=t(70).onFreeze;t(85)("seal",function(t){return function seal(n){return t&&e(n)?t(i(n)):n}})},{57:57,70:70,85:85}],204:[function(t,n,r){var e=t(40);e(e.S,"Object",{setPrototypeOf:t(98).set})},{40:40,98:98}],205:[function(t,n,r){"use strict";var e=t(25),i={};i[t(128)("toStringTag")]="z",i+""!="[object z]"&&t(94)(Object.prototype,"toString",function toString(){return"[object "+e(this)+"]"},!0)},{128:128,25:25,94:94}],206:[function(t,n,r){var e=t(40),i=t(88);e(e.G+e.F*(parseFloat!=i),{parseFloat:i})},{40:40,88:88}],207:[function(t,n,r){var e=t(40),i=t(89);e(e.G+e.F*(parseInt!=i),{parseInt:i})},{40:40,89:89}],208:[function(t,n,r){"use strict";var e,i,o,u,c=t(65),a=t(46),f=t(32),s=t(25),l=t(40),h=t(57),p=t(11),v=t(15),d=t(45),y=t(103),g=t(112).set,x=t(71)(),m=t(72),b=t(90),S=t(124),w=t(91),_=a.TypeError,E=a.process,F=E&&E.versions,I=F&&F.v8||"",O=a.Promise,P="process"==s(E),A=function(){},M=i=m.f,k=!!function(){try{var n=O.resolve(1),r=(n.constructor={})[t(128)("species")]=function(t){t(A,A)};return(P||"function"==typeof PromiseRejectionEvent)&&n.then(A)instanceof r&&0!==I.indexOf("6.6")&&-1===S.indexOf("Chrome/66")}catch(t){}}(),N=function(t){var n;return!(!h(t)||"function"!=typeof(n=t.then))&&n},j=function(t,n){if(!t._n){t._n=!0;var r=t._c;x(function(){for(var e=t._v,i=1==t._s,o=0;r.length>o;)!function(n){var r,o,u,c=i?n.ok:n.fail,a=n.resolve,f=n.reject,s=n.domain;try{c?(i||(2==t._h&&R(t),t._h=1),!0===c?r=e:(s&&s.enter(),r=c(e),s&&(s.exit(),u=!0)),r===n.promise?f(_("Promise-chain cycle")):(o=N(r))?o.call(r,a,f):a(r)):f(e)}catch(t){s&&!u&&s.exit(),f(t)}}(r[o++]);t._c=[],t._n=!1,n&&!t._h&&T(t)})}},T=function(t){g.call(a,function(){var n,r,e,i=t._v,o=L(t);if(o&&(n=b(function(){P?E.emit("unhandledRejection",i,t):(r=a.onunhandledrejection)?r({promise:t,reason:i}):(e=a.console)&&e.error&&e.error("Unhandled promise rejection",i)}),t._h=P||L(t)?2:1),t._a=void 0,o&&n.e)throw n.v})},L=function(t){return 1!==t._h&&0===(t._a||t._c).length},R=function(t){g.call(a,function(){var n;P?E.emit("rejectionHandled",t):(n=a.onrejectionhandled)&&n({promise:t,reason:t._v})})},C=function(t){var n=this;n._d||(n._d=!0,n=n._w||n,n._v=t,n._s=2,n._a||(n._a=n._c.slice()),j(n,!0))},D=function(t){var n,r=this;if(!r._d){r._d=!0,r=r._w||r;try{if(r===t)throw _("Promise can't be resolved itself")
;(n=N(t))?x(function(){var e={_w:r,_d:!1};try{n.call(t,f(D,e,1),f(C,e,1))}catch(t){C.call(e,t)}}):(r._v=t,r._s=1,j(r,!1))}catch(t){C.call({_w:r,_d:!1},t)}}};k||(O=function Promise(t){v(this,O,"Promise","_h"),p(t),e.call(this);try{t(f(D,this,1),f(C,this,1))}catch(t){C.call(this,t)}},e=function Promise(t){this._c=[],this._a=void 0,this._s=0,this._d=!1,this._v=void 0,this._h=0,this._n=!1},e.prototype=t(93)(O.prototype,{then:function then(t,n){var r=M(y(this,O));return r.ok="function"!=typeof t||t,r.fail="function"==typeof n&&n,r.domain=P?E.domain:void 0,this._c.push(r),this._a&&this._a.push(r),this._s&&j(this,!1),r.promise},catch:function(t){return this.then(void 0,t)}}),o=function(){var t=new e;this.promise=t,this.resolve=f(D,t,1),this.reject=f(C,t,1)},m.f=M=function(t){return t===O||t===u?new o(t):i(t)}),l(l.G+l.W+l.F*!k,{Promise:O}),t(100)(O,"Promise"),t(99)("Promise"),u=t(30).Promise,l(l.S+l.F*!k,"Promise",{reject:function reject(t){var n=M(this);return(0,n.reject)(t),n.promise}}),l(l.S+l.F*(c||!k),"Promise",{resolve:function resolve(t){return w(c&&this===u?O:this,t)}}),l(l.S+l.F*!(k&&t(62)(function(t){O.all(t).catch(A)})),"Promise",{all:function all(t){var n=this,r=M(n),e=r.resolve,i=r.reject,o=b(function(){var r=[],o=0,u=1;d(t,!1,function(t){var c=o++,a=!1;r.push(void 0),u++,n.resolve(t).then(function(t){a||(a=!0,r[c]=t,--u||e(r))},i)}),--u||e(r)});return o.e&&i(o.v),r.promise},race:function race(t){var n=this,r=M(n),e=r.reject,i=b(function(){d(t,!1,function(t){n.resolve(t).then(r.resolve,e)})});return i.e&&e(i.v),r.promise}})},{100:100,103:103,11:11,112:112,124:124,128:128,15:15,25:25,30:30,32:32,40:40,45:45,46:46,57:57,62:62,65:65,71:71,72:72,90:90,91:91,93:93,99:99}],209:[function(t,n,r){var e=t(40),i=t(11),o=t(16),u=(t(46).Reflect||{}).apply,c=Function.apply;e(e.S+e.F*!t(42)(function(){u(function(){})}),"Reflect",{apply:function apply(t,n,r){var e=i(t),a=o(r);return u?u(e,n,a):c.call(e,n,a)}})},{11:11,16:16,40:40,42:42,46:46}],210:[function(t,n,r){var e=t(40),i=t(74),o=t(11),u=t(16),c=t(57),a=t(42),f=t(24),s=(t(46).Reflect||{}).construct,l=a(function(){function F(){}return!(s(function(){},[],F)instanceof F)}),h=!a(function(){s(function(){})});e(e.S+e.F*(l||h),"Reflect",{construct:function construct(t,n){o(t),u(n);var r=arguments.length<3?t:o(arguments[2]);if(h&&!l)return s(t,n,r);if(t==r){switch(n.length){case 0:return new t;case 1:return new t(n[0]);case 2:return new t(n[0],n[1]);case 3:return new t(n[0],n[1],n[2]);case 4:return new t(n[0],n[1],n[2],n[3])}var e=[null];return e.push.apply(e,n),new(f.apply(t,e))}var a=r.prototype,p=i(c(a)?a:Object.prototype),v=Function.apply.call(t,p,n);return c(v)?v:p}})},{11:11,16:16,24:24,40:40,42:42,46:46,57:57,74:74}],211:[function(t,n,r){var e=t(75),i=t(40),o=t(16),u=t(119);i(i.S+i.F*t(42)(function(){Reflect.defineProperty(e.f({},1,{value:1}),1,{value:2})}),"Reflect",{defineProperty:function defineProperty(t,n,r){o(t),n=u(n,!0),o(r);try{return e.f(t,n,r),!0}catch(t){return!1}}})},{119:119,16:16,40:40,42:42,75:75}],212:[function(t,n,r){var e=t(40),i=t(77).f,o=t(16);e(e.S,"Reflect",{deleteProperty:function deleteProperty(t,n){var r=i(o(t),n);return!(r&&!r.configurable)&&delete t[n]}})},{16:16,40:40,77:77}],213:[function(t,n,r){"use strict";var e=t(40),i=t(16),o=function(t){this._t=i(t),this._i=0;var n,r=this._k=[];for(n in t)r.push(n)};t(60)(o,"Object",function(){var t,n=this,r=n._k;do{if(n._i>=r.length)return{value:void 0,done:!0}}while(!((t=r[n._i++])in n._t));return{value:t,done:!1}}),e(e.S,"Reflect",{enumerate:function enumerate(t){return new o(t)}})},{16:16,40:40,60:60}],214:[function(t,n,r){var e=t(77),i=t(40),o=t(16);i(i.S,"Reflect",{getOwnPropertyDescriptor:function getOwnPropertyDescriptor(t,n){return e.f(o(t),n)}})},{16:16,40:40,77:77}],215:[function(t,n,r){var e=t(40),i=t(81),o=t(16);e(e.S,"Reflect",{getPrototypeOf:function getPrototypeOf(t){return i(o(t))}})},{16:16,40:40,81:81}],216:[function(t,n,r){function get(t,n){var r,u,f=arguments.length<3?t:arguments[2];return a(t)===f?t[n]:(r=e.f(t,n))?o(r,"value")?r.value:void 0!==r.get?r.get.call(f):void 0:c(u=i(t))?get(u,n,f):void 0}var e=t(77),i=t(81),o=t(47),u=t(40),c=t(57),a=t(16);u(u.S,"Reflect",{get:get})},{16:16,40:40,47:47,57:57,77:77,81:81}],217:[function(t,n,r){var e=t(40);e(e.S,"Reflect",{has:function has(t,n){return n in t}})},{40:40}],218:[function(t,n,r){var e=t(40),i=t(16),o=Object.isExtensible;e(e.S,"Reflect",{isExtensible:function isExtensible(t){return i(t),!o||o(t)}})},{16:16,40:40}],219:[function(t,n,r){var e=t(40);e(e.S,"Reflect",{ownKeys:t(87)})},{40:40,87:87}],220:[function(t,n,r){var e=t(40),i=t(16),o=Object.preventExtensions;e(e.S,"Reflect",{preventExtensions:function preventExtensions(t){i(t);try{return o&&o(t),!0}catch(t){return!1}}})},{16:16,40:40}],221:[function(t,n,r){var e=t(40),i=t(98);i&&e(e.S,"Reflect",{setPrototypeOf:function setPrototypeOf(t,n){i.check(t,n);try{return i.set(t,n),!0}catch(t){return!1}}})},{40:40,98:98}],222:[function(t,n,r){function set(t,n,r){var c,l,h=arguments.length<4?t:arguments[3],p=i.f(f(t),n);if(!p){if(s(l=o(t)))return set(l,n,r,h);p=a(0)}if(u(p,"value")){if(!1===p.writable||!s(h))return!1;if(c=i.f(h,n)){if(c.get||c.set||!1===c.writable)return!1;c.value=r,e.f(h,n,c)}else e.f(h,n,a(0,r));return!0}return void 0!==p.set&&(p.set.call(h,r),!0)}var e=t(75),i=t(77),o=t(81),u=t(47),c=t(40),a=t(92),f=t(16),s=t(57);c(c.S,"Reflect",{set:set})},{16:16,40:40,47:47,57:57,75:75,77:77,81:81,92:92}],223:[function(t,n,r){var e=t(46),i=t(51),o=t(75).f,u=t(79).f,c=t(58),a=t(44),f=e.RegExp,s=f,l=f.prototype,h=/a/g,p=/a/g,v=new f(h)!==h;if(t(36)&&(!v||t(42)(function(){return p[t(128)("match")]=!1,f(h)!=h||f(p)==p||"/a/i"!=f(h,"i")}))){f=function RegExp(t,n){var r=this instanceof f,e=c(t),o=void 0===n;return!r&&e&&t.constructor===f&&o?t:i(v?new s(e&&!o?t.source:t,n):s((e=t instanceof f)?t.source:t,e&&o?a.call(t):n),r?this:l,f)};for(var d=u(s),y=0;d.length>y;)!function(t){t in f||o(f,t,{configurable:!0,get:function(){return s[t]},set:function(n){s[t]=n}})}(d[y++]);l.constructor=f,f.prototype=l,t(94)(e,"RegExp",f)}t(99)("RegExp")},{128:128,36:36,42:42,44:44,46:46,51:51,58:58,75:75,79:79,94:94,99:99}],224:[function(t,n,r){"use strict";var e=t(96);t(40)({target:"RegExp",proto:!0,forced:e!==/./.exec},{exec:e})},{40:40,96:96}],225:[function(t,n,r){t(36)&&"g"!=/./g.flags&&t(75).f(RegExp.prototype,"flags",{configurable:!0,get:t(44)})},{36:36,44:44,75:75}],226:[function(t,n,r){"use strict";var e=t(16),i=t(117),o=t(14),u=t(95);t(43)("match",1,function(t,n,r,c){return[function match(r){var e=t(this),i=void 0==r?void 0:r[n];return void 0!==i?i.call(r,e):new RegExp(r)[n](String(e))},function(t){var n=c(r,t,this);if(n.done)return n.value;var a=e(t),f=String(this);if(!a.global)return u(a,f);var s=a.unicode;a.lastIndex=0;for(var l,h=[],p=0;null!==(l=u(a,f));){var v=String(l[0]);h[p]=v,""===v&&(a.lastIndex=o(f,i(a.lastIndex),s)),p++}return 0===p?null:h}]})},{117:117,14:14,16:16,43:43,95:95}],227:[function(t,n,r){"use strict";var e=t(16),i=t(118),o=t(117),u=t(115),c=t(14),a=t(95),f=Math.max,s=Math.min,l=Math.floor,h=/\$([$&`']|\d\d?|<[^>]*>)/g,p=/\$([$&`']|\d\d?)/g,v=function(t){return void 0===t?t:String(t)};t(43)("replace",2,function(t,n,r,d){function getSubstitution(t,n,e,o,u,c){var a=e+t.length,f=o.length,s=p;return void 0!==u&&(u=i(u),s=h),r.call(c,s,function(r,i){var c;switch(i.charAt(0)){case"$":return"$";case"&":return t;case"`":return n.slice(0,e);case"'":return n.slice(a);case"<":c=u[i.slice(1,-1)];break;default:var s=+i;if(0===s)return i;if(s>f){var h=l(s/10);return 0===h?i:h<=f?void 0===o[h-1]?i.charAt(1):o[h-1]+i.charAt(1):i}c=o[s-1]}return void 0===c?"":c})}return[function replace(e,i){var o=t(this),u=void 0==e?void 0:e[n];return void 0!==u?u.call(e,o,i):r.call(String(o),e,i)},function(t,n){var i=d(r,t,this,n);if(i.done)return i.value;var l=e(t),h=String(this),p="function"==typeof n;p||(n=String(n));var y=l.global;if(y){var g=l.unicode;l.lastIndex=0}for(var x=[];;){var m=a(l,h);if(null===m)break;if(x.push(m),!y)break;""===String(m[0])&&(l.lastIndex=c(h,o(l.lastIndex),g))}for(var b="",S=0,w=0;w<x.length;w++){m=x[w];for(var _=String(m[0]),E=f(s(u(m.index),h.length),0),F=[],I=1;I<m.length;I++)F.push(v(m[I]));var O=m.groups;if(p){var P=[_].concat(F,E,h);void 0!==O&&P.push(O);var A=String(n.apply(void 0,P))}else A=getSubstitution(_,h,E,F,O,n);E>=S&&(b+=h.slice(S,E)+A,S=E+_.length)}return b+h.slice(S)}]})},{115:115,117:117,118:118,14:14,16:16,43:43,95:95}],228:[function(t,n,r){"use strict";var e=t(16),i=t(97),o=t(95);t(43)("search",1,function(t,n,r,u){return[function search(r){var e=t(this),i=void 0==r?void 0:r[n];return void 0!==i?i.call(r,e):new RegExp(r)[n](String(e))},function(t){var n=u(r,t,this);if(n.done)return n.value;var c=e(t),a=String(this),f=c.lastIndex;i(f,0)||(c.lastIndex=0);var s=o(c,a);return i(c.lastIndex,f)||(c.lastIndex=f),null===s?-1:s.index}]})},{16:16,43:43,95:95,97:97}],229:[function(t,n,r){"use strict";var e=t(58),i=t(16),o=t(103),u=t(14),c=t(117),a=t(95),f=t(96),s=Math.min,l=[].push,h="length",p=!!function(){try{return new RegExp("x","y")}catch(t){}}();t(43)("split",2,function(t,n,r,v){var d;return d="c"=="abbc".split(/(b)*/)[1]||4!="test".split(/(?:)/,-1)[h]||2!="ab".split(/(?:ab)*/)[h]||4!=".".split(/(.?)(.?)/)[h]||".".split(/()()/)[h]>1||"".split(/.?/)[h]?function(t,n){var i=String(this);if(void 0===t&&0===n)return[];if(!e(t))return r.call(i,t,n);for(var o,u,c,a=[],s=(t.ignoreCase?"i":"")+(t.multiline?"m":"")+(t.unicode?"u":"")+(t.sticky?"y":""),p=0,v=void 0===n?4294967295:n>>>0,d=new RegExp(t.source,s+"g");(o=f.call(d,i))&&!((u=d.lastIndex)>p&&(a.push(i.slice(p,o.index)),o[h]>1&&o.index<i[h]&&l.apply(a,o.slice(1)),c=o[0][h],p=u,a[h]>=v));)d.lastIndex===o.index&&d.lastIndex++;return p===i[h]?!c&&d.test("")||a.push(""):a.push(i.slice(p)),a[h]>v?a.slice(0,v):a}:"0".split(void 0,0)[h]?function(t,n){return void 0===t&&0===n?[]:r.call(this,t,n)}:r,[function split(r,e){var i=t(this),o=void 0==r?void 0:r[n];return void 0!==o?o.call(r,i,e):d.call(String(i),r,e)},function(t,n){var e=v(d,t,this,n,d!==r);if(e.done)return e.value;var f=i(t),l=String(this),h=o(f,RegExp),y=f.unicode,g=(f.ignoreCase?"i":"")+(f.multiline?"m":"")+(f.unicode?"u":"")+(p?"y":"g"),x=new h(p?f:"^(?:"+f.source+")",g),m=void 0===n?4294967295:n>>>0;if(0===m)return[];if(0===l.length)return null===a(x,l)?[l]:[];for(var b=0,S=0,w=[];S<l.length;){x.lastIndex=p?S:0;var _,E=a(x,p?l:l.slice(S));if(null===E||(_=s(c(x.lastIndex+(p?0:S)),l.length))===b)S=u(l,S,y);else{if(w.push(l.slice(b,S)),w.length===m)return w;for(var F=1;F<=E.length-1;F++)if(w.push(E[F]),w.length===m)return w;S=b=_}}return w.push(l.slice(b)),w}]})},{103:103,117:117,14:14,16:16,43:43,58:58,95:95,96:96}],230:[function(t,n,r){"use strict";t(225);var e=t(16),i=t(44),o=t(36),u=/./.toString,c=function(n){t(94)(RegExp.prototype,"toString",n,!0)};t(42)(function(){return"/a/b"!=u.call({source:"a",flags:"b"})})?c(function toString(){var t=e(this);return"/".concat(t.source,"/","flags"in t?t.flags:!o&&t instanceof RegExp?i.call(t):void 0)}):"toString"!=u.name&&c(function toString(){return u.call(this)})},{16:16,225:225,36:36,42:42,44:44,94:94}],231:[function(t,n,r){"use strict";var e=t(27),i=t(125);n.exports=t(29)("Set",function(t){return function Set(){return t(this,arguments.length>0?arguments[0]:void 0)}},{add:function add(t){return e.def(i(this,"Set"),t=0===t?0:t,t)}},e)},{125:125,27:27,29:29}],232:[function(t,n,r){"use strict";t(107)("anchor",function(t){return function anchor(n){return t(this,"a","name",n)}})},{107:107}],233:[function(t,n,r){"use strict";t(107)("big",function(t){return function big(){return t(this,"big","","")}})},{107:107}],234:[function(t,n,r){"use strict";t(107)("blink",function(t){return function blink(){return t(this,"blink","","")}})},{107:107}],235:[function(t,n,r){"use strict";t(107)("bold",function(t){return function bold(){return t(this,"b","","")}})},{107:107}],236:[function(t,n,r){"use strict";var e=t(40),i=t(105)(!1);e(e.P,"String",{codePointAt:function codePointAt(t){return i(this,t)}})},{105:105,40:40}],237:[function(t,n,r){"use strict";var e=t(40),i=t(117),o=t(106),u="".endsWith;e(e.P+e.F*t(41)("endsWith"),"String",{endsWith:function endsWith(t){var n=o(this,t,"endsWith"),r=arguments.length>1?arguments[1]:void 0,e=i(n.length),c=void 0===r?e:Math.min(i(r),e),a=String(t);return u?u.call(n,a,c):n.slice(c-a.length,c)===a}})},{106:106,117:117,40:40,41:41}],238:[function(t,n,r){"use strict";t(107)("fixed",function(t){return function fixed(){return t(this,"tt","","")}})},{107:107}],239:[function(t,n,r){"use strict";t(107)("fontcolor",function(t){return function fontcolor(n){return t(this,"font","color",n)}})},{107:107}],240:[function(t,n,r){"use strict";t(107)("fontsize",function(t){return function fontsize(n){return t(this,"font","size",n)}})},{107:107}],241:[function(t,n,r){var e=t(40),i=t(113),o=String.fromCharCode,u=String.fromCodePoint;e(e.S+e.F*(!!u&&1!=u.length),"String",{fromCodePoint:function fromCodePoint(t){for(var n,r=[],e=arguments.length,u=0;e>u;){if(n=+arguments[u++],i(n,1114111)!==n)throw RangeError(n+" is not a valid code point");r.push(n<65536?o(n):o(55296+((n-=65536)>>10),n%1024+56320))}return r.join("")}})},{113:113,40:40}],242:[function(t,n,r){"use strict";var e=t(40),i=t(106);e(e.P+e.F*t(41)("includes"),"String",{includes:function includes(t){return!!~i(this,t,"includes").indexOf(t,arguments.length>1?arguments[1]:void 0)}})},{106:106,40:40,41:41}],243:[function(t,n,r){"use strict";t(107)("italics",function(t){return function italics(){return t(this,"i","","")}})},{107:107}],244:[function(t,n,r){"use strict";var e=t(105)(!0);t(61)(String,"String",function(t){this._t=String(t),this._i=0},function(){var t,n=this._t,r=this._i;return r>=n.length?{value:void 0,done:!0}:(t=e(n,r),this._i+=t.length,{value:t,done:!1})})},{105:105,61:61}],245:[function(t,n,r){"use strict";t(107)("link",function(t){return function link(n){return t(this,"a","href",n)}})},{107:107}],246:[function(t,n,r){var e=t(40),i=t(116),o=t(117);e(e.S,"String",{raw:function raw(t){for(var n=i(t.raw),r=o(n.length),e=arguments.length,u=[],c=0;r>c;)u.push(String(n[c++])),c<e&&u.push(String(arguments[c]));return u.join("")}})},{116:116,117:117,40:40}],247:[function(t,n,r){var e=t(40);e(e.P,"String",{repeat:t(109)})},{109:109,40:40}],248:[function(t,n,r){"use strict";t(107)("small",function(t){return function small(){return t(this,"small","","")}})},{107:107}],249:[function(t,n,r){"use strict";var e=t(40),i=t(117),o=t(106),u="".startsWith;e(e.P+e.F*t(41)("startsWith"),"String",{startsWith:function startsWith(t){var n=o(this,t,"startsWith"),r=i(Math.min(arguments.length>1?arguments[1]:void 0,n.length)),e=String(t);return u?u.call(n,e,r):n.slice(r,r+e.length)===e}})},{106:106,117:117,40:40,41:41}],250:[function(t,n,r){"use strict";t(107)("strike",function(t){return function strike(){return t(this,"strike","","")}})},{107:107}],251:[function(t,n,r){"use strict";t(107)("sub",function(t){return function sub(){return t(this,"sub","","")}})},{107:107}],252:[function(t,n,r){"use strict";t(107)("sup",function(t){return function sup(){return t(this,"sup","","")}})},{107:107}],253:[function(t,n,r){"use strict";t(110)("trim",function(t){return function trim(){return t(this,3)}})},{110:110}],254:[function(t,n,r){"use strict";var e=t(46),i=t(47),o=t(36),u=t(40),c=t(94),a=t(70).KEY,f=t(42),s=t(102),l=t(100),h=t(123),p=t(128),v=t(127),d=t(126),y=t(39),g=t(55),x=t(16),m=t(57),b=t(116),S=t(119),w=t(92),_=t(74),E=t(78),F=t(77),I=t(75),O=t(83),P=F.f,A=I.f,M=E.f,k=e.Symbol,N=e.JSON,j=N&&N.stringify,T=p("_hidden"),L=p("toPrimitive"),R={}.propertyIsEnumerable,C=s("symbol-registry"),D=s("symbols"),G=s("op-symbols"),W=Object.prototype,U="function"==typeof k,V=e.QObject,B=!V||!V.prototype||!V.prototype.findChild,z=o&&f(function(){return 7!=_(A({},"a",{get:function(){return A(this,"a",{value:7}).a}})).a})?function(t,n,r){var e=P(W,n);e&&delete W[n],A(t,n,r),e&&t!==W&&A(W,n,e)}:A,q=function(t){var n=D[t]=_(k.prototype);return n._k=t,n},Y=U&&"symbol"==typeof k.iterator?function(t){return"symbol"==typeof t}:function(t){return t instanceof k},K=function defineProperty(t,n,r){return t===W&&K(G,n,r),x(t),n=S(n,!0),x(r),i(D,n)?(r.enumerable?(i(t,T)&&t[T][n]&&(t[T][n]=!1),r=_(r,{enumerable:w(0,!1)})):(i(t,T)||A(t,T,w(1,{})),t[T][n]=!0),z(t,n,r)):A(t,n,r)},$=function defineProperties(t,n){x(t);for(var r,e=y(n=b(n)),i=0,o=e.length;o>i;)K(t,r=e[i++],n[r]);return t},J=function create(t,n){return void 0===n?_(t):$(_(t),n)},H=function propertyIsEnumerable(t){var n=R.call(this,t=S(t,!0));return!(this===W&&i(D,t)&&!i(G,t))&&(!(n||!i(this,t)||!i(D,t)||i(this,T)&&this[T][t])||n)},X=function getOwnPropertyDescriptor(t,n){if(t=b(t),n=S(n,!0),t!==W||!i(D,n)||i(G,n)){var r=P(t,n);return!r||!i(D,n)||i(t,T)&&t[T][n]||(r.enumerable=!0),r}},Z=function getOwnPropertyNames(t){for(var n,r=M(b(t)),e=[],o=0;r.length>o;)i(D,n=r[o++])||n==T||n==a||e.push(n);return e},Q=function getOwnPropertySymbols(t){for(var n,r=t===W,e=M(r?G:b(t)),o=[],u=0;e.length>u;)!i(D,n=e[u++])||r&&!i(W,n)||o.push(D[n]);return o};U||(k=function Symbol(){if(this instanceof k)throw TypeError("Symbol is not a constructor!");var t=h(arguments.length>0?arguments[0]:void 0),n=function(r){this===W&&n.call(G,r),i(this,T)&&i(this[T],t)&&(this[T][t]=!1),z(this,t,w(1,r))};return o&&B&&z(W,t,{configurable:!0,set:n}),q(t)},c(k.prototype,"toString",function toString(){return this._k}),F.f=X,I.f=K,t(79).f=E.f=Z,t(84).f=H,t(80).f=Q,o&&!t(65)&&c(W,"propertyIsEnumerable",H,!0),v.f=function(t){return q(p(t))}),u(u.G+u.W+u.F*!U,{Symbol:k});for(var tt="hasInstance,isConcatSpreadable,iterator,match,replace,search,species,split,toPrimitive,toStringTag,unscopables".split(","),nt=0;tt.length>nt;)p(tt[nt++]);for(var rt=O(p.store),et=0;rt.length>et;)d(rt[et++]);u(u.S+u.F*!U,"Symbol",{for:function(t){return i(C,t+="")?C[t]:C[t]=k(t)},keyFor:function keyFor(t){if(!Y(t))throw TypeError(t+" is not a symbol!");for(var n in C)if(C[n]===t)return n},useSetter:function(){B=!0},useSimple:function(){B=!1}}),u(u.S+u.F*!U,"Object",{create:J,defineProperty:K,defineProperties:$,getOwnPropertyDescriptor:X,getOwnPropertyNames:Z,getOwnPropertySymbols:Q}),N&&u(u.S+u.F*(!U||f(function(){var t=k();return"[null]"!=j([t])||"{}"!=j({a:t})||"{}"!=j(Object(t))})),"JSON",{stringify:function stringify(t){for(var n,r,e=[t],i=1;arguments.length>i;)e.push(arguments[i++]);if(r=n=e[1],(m(n)||void 0!==t)&&!Y(t))return g(n)||(n=function(t,n){if("function"==typeof r&&(n=r.call(this,t,n)),!Y(n))return n}),e[1]=n,j.apply(N,e)}}),k.prototype[L]||t(48)(k.prototype,L,k.prototype.valueOf),l(k,"Symbol"),l(Math,"Math",!0),l(e.JSON,"JSON",!0)},{100:100,102:102,116:116,119:119,123:123,126:126,127:127,128:128,16:16,36:36,39:39,40:40,42:42,46:46,47:47,48:48,55:55,57:57,65:65,70:70,74:74,75:75,77:77,78:78,79:79,80:80,83:83,84:84,92:92,94:94}],255:[function(t,n,r){"use strict";var e=t(40),i=t(122),o=t(121),u=t(16),c=t(113),a=t(117),f=t(57),s=t(46).ArrayBuffer,l=t(103),h=o.ArrayBuffer,p=o.DataView,v=i.ABV&&s.isView,d=h.prototype.slice,y=i.VIEW;e(e.G+e.W+e.F*(s!==h),{ArrayBuffer:h}),e(e.S+e.F*!i.CONSTR,"ArrayBuffer",{isView:function isView(t){return v&&v(t)||f(t)&&y in t}}),e(e.P+e.U+e.F*t(42)(function(){return!new h(2).slice(1,void 0).byteLength}),"ArrayBuffer",{slice:function slice(t,n){if(void 0!==d&&void 0===n)return d.call(u(this),t);for(var r=u(this).byteLength,e=c(t,r),i=c(void 0===n?r:n,r),o=new(l(this,h))(a(i-e)),f=new p(this),s=new p(o),v=0;e<i;)s.setUint8(v++,f.getUint8(e++));return o}}),t(99)("ArrayBuffer")},{103:103,113:113,117:117,121:121,122:122,16:16,40:40,42:42,46:46,57:57,99:99}],256:[function(t,n,r){var e=t(40);e(e.G+e.W+e.F*!t(122).ABV,{DataView:t(121).DataView})},{121:121,122:122,40:40}],257:[function(t,n,r){t(120)("Float32",4,function(t){return function Float32Array(n,r,e){return t(this,n,r,e)}})},{120:120}],258:[function(t,n,r){t(120)("Float64",8,function(t){return function Float64Array(n,r,e){return t(this,n,r,e)}})},{120:120}],259:[function(t,n,r){t(120)("Int16",2,function(t){return function Int16Array(n,r,e){return t(this,n,r,e)}})},{120:120}],260:[function(t,n,r){t(120)("Int32",4,function(t){return function Int32Array(n,r,e){return t(this,n,r,e)}})},{120:120}],261:[function(t,n,r){t(120)("Int8",1,function(t){return function Int8Array(n,r,e){return t(this,n,r,e)}})},{120:120}],262:[function(t,n,r){t(120)("Uint16",2,function(t){return function Uint16Array(n,r,e){return t(this,n,r,e)}})},{120:120}],263:[function(t,n,r){t(120)("Uint32",4,function(t){return function Uint32Array(n,r,e){return t(this,n,r,e)}})},{120:120}],264:[function(t,n,r){t(120)("Uint8",1,function(t){return function Uint8Array(n,r,e){return t(this,n,r,e)}})},{120:120}],265:[function(t,n,r){t(120)("Uint8",1,function(t){return function Uint8ClampedArray(n,r,e){return t(this,n,r,e)}},!0)},{120:120}],266:[function(t,n,r){"use strict";var e,i=t(20)(0),o=t(94),u=t(70),c=t(73),a=t(28),f=t(57),s=t(42),l=t(125),h=u.getWeak,p=Object.isExtensible,v=a.ufstore,d={},y=function(t){return function WeakMap(){return t(this,arguments.length>0?arguments[0]:void 0)}},g={get:function get(t){if(f(t)){var n=h(t);return!0===n?v(l(this,"WeakMap")).get(t):n?n[this._i]:void 0}},set:function set(t,n){return a.def(l(this,"WeakMap"),t,n)}},x=n.exports=t(29)("WeakMap",y,g,a,!0,!0);s(function(){return 7!=(new x).set((Object.freeze||Object)(d),7).get(d)})&&(e=a.getConstructor(y,"WeakMap"),c(e.prototype,g),u.NEED=!0,i(["delete","has","get","set"],function(t){var n=x.prototype,r=n[t];o(n,t,function(n,i){if(f(n)&&!p(n)){this._f||(this._f=new e);var o=this._f[t](n,i);return"set"==t?this:o}return r.call(this,n,i)})}))},{125:125,20:20,28:28,29:29,42:42,57:57,70:70,73:73,94:94}],267:[function(t,n,r){"use strict";var e=t(28),i=t(125);t(29)("WeakSet",function(t){return function WeakSet(){return t(this,arguments.length>0?arguments[0]:void 0)}},{add:function add(t){return e.def(i(this,"WeakSet"),t,!0)}},e,!1,!0)},{125:125,28:28,29:29}],268:[function(t,n,r){"use strict";var e=t(40),i=t(19)(!0);e(e.P,"Array",{includes:function includes(t){return i(this,t,arguments.length>1?arguments[1]:void 0)}}),t(13)("includes")},{13:13,19:19,40:40}],269:[function(t,n,r){var e=t(40),i=t(86)(!0);e(e.S,"Object",{entries:function entries(t){return i(t)}})},{40:40,86:86}],270:[function(t,n,r){var e=t(40),i=t(87),o=t(116),u=t(77),c=t(31);e(e.S,"Object",{getOwnPropertyDescriptors:function getOwnPropertyDescriptors(t){for(var n,r,e=o(t),a=u.f,f=i(e),s={},l=0;f.length>l;)void 0!==(r=a(e,n=f[l++]))&&c(s,n,r);return s}})},{116:116,31:31,40:40,77:77,87:87}],271:[function(t,n,r){var e=t(40),i=t(86)(!1);e(e.S,"Object",{values:function values(t){return i(t)}})},{40:40,86:86}],272:[function(t,n,r){"use strict";var e=t(40),i=t(30),o=t(46),u=t(103),c=t(91);e(e.P+e.R,"Promise",{finally:function(t){var n=u(this,i.Promise||o.Promise),r="function"==typeof t;return this.then(r?function(r){return c(n,t()).then(function(){return r})}:t,r?function(r){return c(n,t()).then(function(){throw r})}:t)}})},{103:103,30:30,40:40,46:46,91:91}],273:[function(t,n,r){"use strict";var e=t(40),i=t(108),o=t(124);e(e.P+e.F*/Version\/10\.\d+(\.\d+)? Safari\//.test(o),"String",{padEnd:function padEnd(t){return i(this,t,arguments.length>1?arguments[1]:void 0,!1)}})},{108:108,124:124,40:40}],274:[function(t,n,r){"use strict";var e=t(40),i=t(108),o=t(124);e(e.P+e.F*/Version\/10\.\d+(\.\d+)? Safari\//.test(o),"String",{padStart:function padStart(t){return i(this,t,arguments.length>1?arguments[1]:void 0,!0)}})},{108:108,124:124,40:40}],275:[function(t,n,r){t(126)("asyncIterator")},{126:126}],276:[function(t,n,r){for(var e=t(140),i=t(83),o=t(94),u=t(46),c=t(48),a=t(64),f=t(128),s=f("iterator"),l=f("toStringTag"),h=a.Array,p={CSSRuleList:!0,CSSStyleDeclaration:!1,CSSValueList:!1,ClientRectList:!1,DOMRectList:!1,DOMStringList:!1,DOMTokenList:!0,DataTransferItemList:!1,FileList:!1,HTMLAllCollection:!1,HTMLCollection:!1,HTMLFormElement:!1,HTMLSelectElement:!1,MediaList:!0,MimeTypeArray:!1,NamedNodeMap:!1,NodeList:!0,PaintRequestList:!1,Plugin:!1,PluginArray:!1,SVGLengthList:!1,SVGNumberList:!1,SVGPathSegList:!1,SVGPointList:!1,SVGStringList:!1,SVGTransformList:!1,SourceBufferList:!1,StyleSheetList:!0,TextTrackCueList:!1,TextTrackList:!1,TouchList:!1},v=i(p),d=0;d<v.length;d++){var y,g=v[d],x=p[g],m=u[g],b=m&&m.prototype;if(b&&(b[s]||c(b,s,h),b[l]||c(b,l,g),a[g]=h,x))for(y in e)b[y]||o(b,y,e[y],!0)}},{128:128,140:140,46:46,48:48,64:64,83:83,94:94}],277:[function(t,n,r){var e=t(40),i=t(112);e(e.G+e.B,{setImmediate:i.set,clearImmediate:i.clear})},{112:112,40:40}],278:[function(t,n,r){var e=t(46),i=t(40),o=t(124),u=[].slice,c=/MSIE .\./.test(o),a=function(t){return function(n,r){var e=arguments.length>2,i=!!e&&u.call(arguments,2);return t(e?function(){("function"==typeof n?n:Function(n)).apply(this,i)}:n,r)}};i(i.G+i.B+i.F*c,{setTimeout:a(e.setTimeout),setInterval:a(e.setInterval)})},{124:124,40:40,46:46}],279:[function(t,n,r){t(278),t(277),t(276),n.exports=t(30)},{276:276,277:277,278:278,30:30}],280:[function(t,n,r){!function(t){"use strict";function wrap(t,n,r,e){var i=n&&n.prototype instanceof Generator?n:Generator,o=Object.create(i.prototype),u=new Context(e||[]);return o._invoke=makeInvokeMethod(t,r,u),o}function tryCatch(t,n,r){try{return{type:"normal",arg:t.call(n,r)}}catch(t){return{type:"throw",arg:t}}}function Generator(){}function GeneratorFunction(){}function GeneratorFunctionPrototype(){}function defineIteratorMethods(t){["next","throw","return"].forEach(function(n){t[n]=function(t){return this._invoke(n,t)}})}function AsyncIterator(t){function invoke(n,r,e,o){var u=tryCatch(t[n],t,r);if("throw"!==u.type){var c=u.arg,a=c.value;return a&&"object"==typeof a&&i.call(a,"__await")?Promise.resolve(a.__await).then(function(t){invoke("next",t,e,o)},function(t){invoke("throw",t,e,o)}):Promise.resolve(a).then(function(t){c.value=t,e(c)},function(t){return invoke("throw",t,e,o)})}o(u.arg)}function enqueue(t,r){function callInvokeWithMethodAndArg(){return new Promise(function(n,e){invoke(t,r,n,e)})}return n=n?n.then(callInvokeWithMethodAndArg,callInvokeWithMethodAndArg):callInvokeWithMethodAndArg()}var n;this._invoke=enqueue}function makeInvokeMethod(t,n,r){var e=l;return function invoke(i,o){if(e===p)throw new Error("Generator is already running");if(e===v){if("throw"===i)throw o;return doneResult()}for(r.method=i,r.arg=o;;){var u=r.delegate;if(u){var c=maybeInvokeDelegate(u,r);if(c){if(c===d)continue;return c}}if("next"===r.method)r.sent=r._sent=r.arg;else if("throw"===r.method){if(e===l)throw e=v,r.arg;r.dispatchException(r.arg)}else"return"===r.method&&r.abrupt("return",r.arg);e=p;var a=tryCatch(t,n,r);if("normal"===a.type){if(e=r.done?v:h,a.arg===d)continue;return{value:a.arg,done:r.done}}"throw"===a.type&&(e=v,r.method="throw",r.arg=a.arg)}}}function maybeInvokeDelegate(t,n){var e=t.iterator[n.method];if(e===r){if(n.delegate=null,"throw"===n.method){if(t.iterator.return&&(n.method="return",n.arg=r,maybeInvokeDelegate(t,n),"throw"===n.method))return d;n.method="throw",n.arg=new TypeError("The iterator does not provide a 'throw' method")}return d}var i=tryCatch(e,t.iterator,n.arg);if("throw"===i.type)return n.method="throw",n.arg=i.arg,n.delegate=null,d;var o=i.arg;return o?o.done?(n[t.resultName]=o.value,n.next=t.nextLoc,"return"!==n.method&&(n.method="next",n.arg=r),n.delegate=null,d):o:(n.method="throw",n.arg=new TypeError("iterator result is not an object"),n.delegate=null,d)}function pushTryEntry(t){var n={tryLoc:t[0]};1 in t&&(n.catchLoc=t[1]),2 in t&&(n.finallyLoc=t[2],n.afterLoc=t[3]),this.tryEntries.push(n)}function resetTryEntry(t){var n=t.completion||{};n.type="normal",delete n.arg,t.completion=n}function Context(t){this.tryEntries=[{tryLoc:"root"}],t.forEach(pushTryEntry,this),this.reset(!0)}function values(t){if(t){var n=t[u];if(n)return n.call(t);if("function"==typeof t.next)return t;if(!isNaN(t.length)){var e=-1,o=function next(){for(;++e<t.length;)if(i.call(t,e))return next.value=t[e],next.done=!1,next;return next.value=r,next.done=!0,next};return o.next=o}}return{next:doneResult}}function doneResult(){return{value:r,done:!0}}var r,e=Object.prototype,i=e.hasOwnProperty,o="function"==typeof Symbol?Symbol:{},u=o.iterator||"@@iterator",c=o.asyncIterator||"@@asyncIterator",a=o.toStringTag||"@@toStringTag",f="object"==typeof n,s=t.regeneratorRuntime;if(s)return void(f&&(n.exports=s));s=t.regeneratorRuntime=f?n.exports:{},s.wrap=wrap;var l="suspendedStart",h="suspendedYield",p="executing",v="completed",d={},y={};y[u]=function(){return this};var g=Object.getPrototypeOf,x=g&&g(g(values([])));x&&x!==e&&i.call(x,u)&&(y=x);var m=GeneratorFunctionPrototype.prototype=Generator.prototype=Object.create(y);GeneratorFunction.prototype=m.constructor=GeneratorFunctionPrototype,GeneratorFunctionPrototype.constructor=GeneratorFunction,GeneratorFunctionPrototype[a]=GeneratorFunction.displayName="GeneratorFunction",s.isGeneratorFunction=function(t){var n="function"==typeof t&&t.constructor;return!!n&&(n===GeneratorFunction||"GeneratorFunction"===(n.displayName||n.name))},s.mark=function(t){return Object.setPrototypeOf?Object.setPrototypeOf(t,GeneratorFunctionPrototype):(t.__proto__=GeneratorFunctionPrototype,a in t||(t[a]="GeneratorFunction")),t.prototype=Object.create(m),t},s.awrap=function(t){return{__await:t}},defineIteratorMethods(AsyncIterator.prototype),AsyncIterator.prototype[c]=function(){return this},s.AsyncIterator=AsyncIterator,s.async=function(t,n,r,e){var i=new AsyncIterator(wrap(t,n,r,e));return s.isGeneratorFunction(n)?i:i.next().then(function(t){return t.done?t.value:i.next()})},defineIteratorMethods(m),m[a]="Generator",m[u]=function(){return this},m.toString=function(){return"[object Generator]"},s.keys=function(t){var n=[];for(var r in t)n.push(r);return n.reverse(),function next(){for(;n.length;){var r=n.pop();if(r in t)return next.value=r,next.done=!1,next}return next.done=!0,next}},s.values=values,Context.prototype={constructor:Context,reset:function(t){if(this.prev=0,this.next=0,this.sent=this._sent=r,this.done=!1,this.delegate=null,this.method="next",this.arg=r,this.tryEntries.forEach(resetTryEntry),!t)for(var n in this)"t"===n.charAt(0)&&i.call(this,n)&&!isNaN(+n.slice(1))&&(this[n]=r)},stop:function(){this.done=!0;var t=this.tryEntries[0],n=t.completion;if("throw"===n.type)throw n.arg;return this.rval},dispatchException:function(t){function handle(e,i){return u.type="throw",u.arg=t,n.next=e,i&&(n.method="next",n.arg=r),!!i}if(this.done)throw t;for(var n=this,e=this.tryEntries.length-1;e>=0;--e){var o=this.tryEntries[e],u=o.completion;if("root"===o.tryLoc)return handle("end");if(o.tryLoc<=this.prev){var c=i.call(o,"catchLoc"),a=i.call(o,"finallyLoc");if(c&&a){if(this.prev<o.catchLoc)return handle(o.catchLoc,!0);if(this.prev<o.finallyLoc)return handle(o.finallyLoc)}else if(c){if(this.prev<o.catchLoc)return handle(o.catchLoc,!0)}else{if(!a)throw new Error("try statement without catch or finally");if(this.prev<o.finallyLoc)return handle(o.finallyLoc)}}}},abrupt:function(t,n){for(var r=this.tryEntries.length-1;r>=0;--r){var e=this.tryEntries[r];if(e.tryLoc<=this.prev&&i.call(e,"finallyLoc")&&this.prev<e.finallyLoc){var o=e;break}}o&&("break"===t||"continue"===t)&&o.tryLoc<=n&&n<=o.finallyLoc&&(o=null);var u=o?o.completion:{};return u.type=t,u.arg=n,o?(this.method="next",this.next=o.finallyLoc,d):this.complete(u)},complete:function(t,n){if("throw"===t.type)throw t.arg;return"break"===t.type||"continue"===t.type?this.next=t.arg:"return"===t.type?(this.rval=this.arg=t.arg,this.method="return",this.next="end"):"normal"===t.type&&n&&(this.next=n),d},finish:function(t){for(var n=this.tryEntries.length-1;n>=0;--n){var r=this.tryEntries[n];if(r.finallyLoc===t)return this.complete(r.completion,r.afterLoc),resetTryEntry(r),d}},catch:function(t){for(var n=this.tryEntries.length-1;n>=0;--n){var r=this.tryEntries[n];if(r.tryLoc===t){var e=r.completion;if("throw"===e.type){var i=e.arg;resetTryEntry(r)}return i}}throw new Error("illegal catch attempt")},delegateYield:function(t,n,e){
return this.delegate={iterator:values(t),resultName:n,nextLoc:e},"next"===this.method&&(this.arg=r),d}}}(function(){return this||"object"==typeof self&&self}()||Function("return this")())},{}]},{},[1]);
;
this.wp=this.wp||{},this.wp.hooks=function(n){var r={};function e(t){if(r[t])return r[t].exports;var o=r[t]={i:t,l:!1,exports:{}};return n[t].call(o.exports,o,o.exports,e),o.l=!0,o.exports}return e.m=n,e.c=r,e.d=function(n,r,t){e.o(n,r)||Object.defineProperty(n,r,{enumerable:!0,get:t})},e.r=function(n){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(n,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(n,"__esModule",{value:!0})},e.t=function(n,r){if(1&r&&(n=e(n)),8&r)return n;if(4&r&&"object"==typeof n&&n&&n.__esModule)return n;var t=Object.create(null);if(e.r(t),Object.defineProperty(t,"default",{enumerable:!0,value:n}),2&r&&"string"!=typeof n)for(var o in n)e.d(t,o,function(r){return n[r]}.bind(null,o));return t},e.n=function(n){var r=n&&n.__esModule?function(){return n.default}:function(){return n};return e.d(r,"a",r),r},e.o=function(n,r){return Object.prototype.hasOwnProperty.call(n,r)},e.p="",e(e.s=366)}({366:function(n,r,e){"use strict";e.r(r);var t=function(n){return"string"!=typeof n||""===n?(console.error("The namespace must be a non-empty string."),!1):!!/^[a-zA-Z][a-zA-Z0-9_.\-\/]*$/.test(n)||(console.error("The namespace can only contain numbers, letters, dashes, periods, underscores and slashes."),!1)};var o=function(n){return"string"!=typeof n||""===n?(console.error("The hook name must be a non-empty string."),!1):/^__/.test(n)?(console.error("The hook name cannot begin with `__`."),!1):!!/^[a-zA-Z][a-zA-Z0-9_.-]*$/.test(n)||(console.error("The hook name can only contain numbers, letters, dashes, periods and underscores."),!1)};var i=function(n){return function(r,e,i){var u=arguments.length>3&&void 0!==arguments[3]?arguments[3]:10;if(o(r)&&t(e))if("function"==typeof i)if("number"==typeof u){var c={callback:i,priority:u,namespace:e};if(n[r]){var l,a=n[r].handlers;for(l=a.length;l>0&&!(u>=a[l-1].priority);l--);l===a.length?a[l]=c:a.splice(l,0,c),(n.__current||[]).forEach(function(n){n.name===r&&n.currentIndex>=l&&n.currentIndex++})}else n[r]={handlers:[c],runs:0};"hookAdded"!==r&&F("hookAdded",r,e,i,u)}else console.error("If specified, the hook priority must be a number.");else console.error("The hook callback must be a function.")}};var u=function(n,r){return function(e,i){if(o(e)&&(r||t(i))){if(!n[e])return 0;var u=0;if(r)u=n[e].handlers.length,n[e]={runs:n[e].runs,handlers:[]};else for(var c=n[e].handlers,l=function(r){c[r].namespace===i&&(c.splice(r,1),u++,(n.__current||[]).forEach(function(n){n.name===e&&n.currentIndex>=r&&n.currentIndex--}))},a=c.length-1;a>=0;a--)l(a);return"hookRemoved"!==e&&F("hookRemoved",e,i),u}}};var c=function(n){return function(r){return r in n}};var l=function(n,r){return function(e){n[e]||(n[e]={handlers:[],runs:0}),n[e].runs++;for(var t=n[e].handlers,o=arguments.length,i=new Array(o>1?o-1:0),u=1;u<o;u++)i[u-1]=arguments[u];if(!t||!t.length)return r?i[0]:void 0;var c={name:e,currentIndex:0};for(n.__current.push(c);c.currentIndex<t.length;){var l=t[c.currentIndex].callback.apply(null,i);r&&(i[0]=l),c.currentIndex++}return n.__current.pop(),r?i[0]:void 0}};var a=function(n){return function(){return n.__current&&n.__current.length?n.__current[n.__current.length-1].name:null}};var d=function(n){return function(r){return void 0===r?void 0!==n.__current[0]:!!n.__current[0]&&r===n.__current[0].name}};var s=function(n){return function(r){if(o(r))return n[r]&&n[r].runs?n[r].runs:0}};var f=function(){var n=Object.create(null),r=Object.create(null);return n.__current=[],r.__current=[],{addAction:i(n),addFilter:i(r),removeAction:u(n),removeFilter:u(r),hasAction:c(n),hasFilter:c(r),removeAllActions:u(n,!0),removeAllFilters:u(r,!0),doAction:l(n),applyFilters:l(r,!0),currentAction:a(n),currentFilter:a(r),doingAction:d(n),doingFilter:d(r),didAction:s(n),didFilter:s(r),actions:n,filters:r}};e.d(r,"addAction",function(){return p}),e.d(r,"addFilter",function(){return v}),e.d(r,"removeAction",function(){return m}),e.d(r,"removeFilter",function(){return _}),e.d(r,"hasAction",function(){return A}),e.d(r,"hasFilter",function(){return y}),e.d(r,"removeAllActions",function(){return b}),e.d(r,"removeAllFilters",function(){return g}),e.d(r,"doAction",function(){return F}),e.d(r,"applyFilters",function(){return k}),e.d(r,"currentAction",function(){return x}),e.d(r,"currentFilter",function(){return j}),e.d(r,"doingAction",function(){return I}),e.d(r,"doingFilter",function(){return O}),e.d(r,"didAction",function(){return T}),e.d(r,"didFilter",function(){return w}),e.d(r,"actions",function(){return P}),e.d(r,"filters",function(){return S}),e.d(r,"createHooks",function(){return f});var h=f(),p=h.addAction,v=h.addFilter,m=h.removeAction,_=h.removeFilter,A=h.hasAction,y=h.hasFilter,b=h.removeAllActions,g=h.removeAllFilters,F=h.doAction,k=h.applyFilters,x=h.currentAction,j=h.currentFilter,I=h.doingAction,O=h.doingFilter,T=h.didAction,w=h.didFilter,P=h.actions,S=h.filters}});;
!function(a,b,c){var d=function(){function d(){var c,d,f,h;"string"==typeof b.pagenow&&(z.screenId=b.pagenow),"string"==typeof b.ajaxurl&&(z.url=b.ajaxurl),"object"==typeof b.heartbeatSettings&&(c=b.heartbeatSettings,!z.url&&c.ajaxurl&&(z.url=c.ajaxurl),c.interval&&(z.mainInterval=c.interval,z.mainInterval<15?z.mainInterval=15:z.mainInterval>120&&(z.mainInterval=120)),c.minimalInterval&&(c.minimalInterval=parseInt(c.minimalInterval,10),z.minimalInterval=c.minimalInterval>0&&c.minimalInterval<=600?1e3*c.minimalInterval:0),z.minimalInterval&&z.mainInterval<z.minimalInterval&&(z.mainInterval=z.minimalInterval),z.screenId||(z.screenId=c.screenId||"front"),"disable"===c.suspension&&(z.suspendEnabled=!1)),z.mainInterval=1e3*z.mainInterval,z.originalInterval=z.mainInterval,"undefined"!=typeof document.hidden?(d="hidden",h="visibilitychange",f="visibilityState"):"undefined"!=typeof document.msHidden?(d="msHidden",h="msvisibilitychange",f="msVisibilityState"):"undefined"!=typeof document.webkitHidden&&(d="webkitHidden",h="webkitvisibilitychange",f="webkitVisibilityState"),d&&(document[d]&&(z.hasFocus=!1),y.on(h+".wp-heartbeat",function(){"hidden"===document[f]?(l(),b.clearInterval(z.checkFocusTimer)):(m(),document.hasFocus&&(z.checkFocusTimer=b.setInterval(g,1e4)))})),document.hasFocus&&(z.checkFocusTimer=b.setInterval(g,1e4)),a(b).on("unload.wp-heartbeat",function(){z.suspend=!0,z.xhr&&4!==z.xhr.readyState&&z.xhr.abort()}),b.setInterval(o,3e4),y.ready(function(){z.lastTick=e(),k()})}function e(){return(new Date).getTime()}function f(a){var c,d=a.src;if(d&&/^https?:\/\//.test(d)&&(c=b.location.origin?b.location.origin:b.location.protocol+"//"+b.location.host,0!==d.indexOf(c)))return!1;try{if(a.contentWindow.document)return!0}catch(e){}return!1}function g(){z.hasFocus&&!document.hasFocus()?l():!z.hasFocus&&document.hasFocus()&&m()}function h(a,b){var c;if(a){switch(a){case"abort":break;case"timeout":c=!0;break;case"error":if(503===b&&z.hasConnected){c=!0;break}case"parsererror":case"empty":case"unknown":z.errorcount++,z.errorcount>2&&z.hasConnected&&(c=!0)}c&&!q()&&(z.connectionError=!0,y.trigger("heartbeat-connection-lost",[a,b]),wp.hooks.doAction("heartbeat.connection-lost",a,b))}}function i(){z.hasConnected=!0,q()&&(z.errorcount=0,z.connectionError=!1,y.trigger("heartbeat-connection-restored"),wp.hooks.doAction("heartbeat.connection-restored"))}function j(){var c,d;z.connecting||z.suspend||(z.lastTick=e(),d=a.extend({},z.queue),z.queue={},y.trigger("heartbeat-send",[d]),wp.hooks.doAction("heartbeat.send",d),c={data:d,interval:z.tempInterval?z.tempInterval/1e3:z.mainInterval/1e3,_nonce:"object"==typeof b.heartbeatSettings?b.heartbeatSettings.nonce:"",action:"heartbeat",screen_id:z.screenId,has_focus:z.hasFocus},"customize"===z.screenId&&(c.wp_customize="on"),z.connecting=!0,z.xhr=a.ajax({url:z.url,type:"post",timeout:3e4,data:c,dataType:"json"}).always(function(){z.connecting=!1,k()}).done(function(a,c,d){var e;return a?(i(),a.nonces_expired&&(y.trigger("heartbeat-nonces-expired"),wp.hooks.doAction("heartbeat.nonces-expired")),a.heartbeat_interval&&(e=a.heartbeat_interval,delete a.heartbeat_interval),a.heartbeat_nonce&&"object"==typeof b.heartbeatSettings&&(b.heartbeatSettings.nonce=a.heartbeat_nonce,delete a.heartbeat_nonce),a.rest_nonce&&"object"==typeof b.wpApiSettings&&(b.wpApiSettings.nonce=a.rest_nonce),y.trigger("heartbeat-tick",[a,c,d]),wp.hooks.doAction("heartbeat.tick",a,c,d),void(e&&t(e))):void h("empty")}).fail(function(a,b,c){h(b||"unknown",a.status),y.trigger("heartbeat-error",[a,b,c]),wp.hooks.doAction("heartbeat.error",a,b,c)}))}function k(){var a=e()-z.lastTick,c=z.mainInterval;z.suspend||(z.hasFocus?z.countdown>0&&z.tempInterval&&(c=z.tempInterval,z.countdown--,z.countdown<1&&(z.tempInterval=0)):c=12e4,z.minimalInterval&&c<z.minimalInterval&&(c=z.minimalInterval),b.clearTimeout(z.beatTimer),a<c?z.beatTimer=b.setTimeout(function(){j()},c-a):j())}function l(){z.hasFocus=!1}function m(){z.userActivity=e(),z.suspend=!1,z.hasFocus||(z.hasFocus=!0,k())}function n(){z.userActivityEvents=!1,y.off(".wp-heartbeat-active"),a("iframe").each(function(b,c){f(c)&&a(c.contentWindow).off(".wp-heartbeat-active")}),m()}function o(){var b=z.userActivity?e()-z.userActivity:0;b>3e5&&z.hasFocus&&l(),(z.suspendEnabled&&b>6e5||b>36e5)&&(z.suspend=!0),z.userActivityEvents||(y.on("mouseover.wp-heartbeat-active keyup.wp-heartbeat-active touchend.wp-heartbeat-active",function(){n()}),a("iframe").each(function(b,c){f(c)&&a(c.contentWindow).on("mouseover.wp-heartbeat-active keyup.wp-heartbeat-active touchend.wp-heartbeat-active",function(){n()})}),z.userActivityEvents=!0)}function p(){return z.hasFocus}function q(){return z.connectionError}function r(){z.lastTick=0,k()}function s(){z.suspendEnabled=!1}function t(a,b){var c,d=z.tempInterval?z.tempInterval:z.mainInterval;if(a){switch(a){case"fast":case 5:c=5e3;break;case 15:c=15e3;break;case 30:c=3e4;break;case 60:c=6e4;break;case 120:c=12e4;break;case"long-polling":return z.mainInterval=0,0;default:c=z.originalInterval}z.minimalInterval&&c<z.minimalInterval&&(c=z.minimalInterval),5e3===c?(b=parseInt(b,10)||30,b=b<1||b>30?30:b,z.countdown=b,z.tempInterval=c):(z.countdown=0,z.tempInterval=0,z.mainInterval=c),c!==d&&k()}return z.tempInterval?z.tempInterval/1e3:z.mainInterval/1e3}function u(a,b,c){return!!a&&((!c||!this.isQueued(a))&&(z.queue[a]=b,!0))}function v(a){if(a)return z.queue.hasOwnProperty(a)}function w(a){a&&delete z.queue[a]}function x(a){if(a)return this.isQueued(a)?z.queue[a]:c}var y=a(document),z={suspend:!1,suspendEnabled:!0,screenId:"",url:"",lastTick:0,queue:{},mainInterval:60,tempInterval:0,originalInterval:0,minimalInterval:0,countdown:0,connecting:!1,connectionError:!1,errorcount:0,hasConnected:!1,hasFocus:!0,userActivity:0,userActivityEvents:!1,checkFocusTimer:0,beatTimer:0};return d(),{hasFocus:p,connectNow:r,disableSuspend:s,interval:t,hasConnectionError:q,enqueue:u,dequeue:w,isQueued:v,getQueuedItem:x}};b.wp=b.wp||{},b.wp.heartbeat=new d}(jQuery,window);;
!function(a){function b(){var b,d=a("#wp-auth-check"),f=a("#wp-auth-check-form"),g=e.find(".wp-auth-fallback-expired"),h=!1;f.length&&(a(window).on("beforeunload.wp-auth-check",function(a){a.originalEvent.returnValue=window.authcheckL10n.beforeunload}),b=a('<iframe id="wp-auth-check-frame" frameborder="0">').attr("title",g.text()),b.on("load",function(){var b,i;h=!0,f.removeClass("loading");try{i=a(this).contents().find("body"),b=i.height()}catch(j){return e.addClass("fallback"),d.css("max-height",""),f.remove(),void g.focus()}b?i&&i.hasClass("interim-login-success")?c():d.css("max-height",b+40+"px"):i&&i.length||(e.addClass("fallback"),d.css("max-height",""),f.remove(),g.focus())}).attr("src",f.data("src")),f.append(b)),a("body").addClass("modal-open"),e.removeClass("hidden"),b?(b.focus(),setTimeout(function(){h||(e.addClass("fallback"),f.remove(),g.focus())},1e4)):g.focus()}function c(){a(window).off("beforeunload.wp-auth-check"),"undefined"==typeof adminpage||"post-php"!==adminpage&&"post-new-php"!==adminpage||"undefined"==typeof wp||!wp.heartbeat||(a(document).off("heartbeat-tick.wp-auth-check"),wp.heartbeat.connectNow()),e.fadeOut(200,function(){e.addClass("hidden").css("display",""),a("#wp-auth-check-frame").remove(),a("body").removeClass("modal-open")})}function d(){var a=parseInt(window.authcheckL10n.interval,10)||180;f=(new Date).getTime()+1e3*a}var e,f;a(document).on("heartbeat-tick.wp-auth-check",function(a,f){"wp-auth-check"in f&&(d(),!f["wp-auth-check"]&&e.hasClass("hidden")?b():f["wp-auth-check"]&&!e.hasClass("hidden")&&c())}).on("heartbeat-send.wp-auth-check",function(a,b){(new Date).getTime()>f&&(b["wp-auth-check"]=!0)}).ready(function(){d(),e=a("#wp-auth-check-wrap"),e.find(".wp-auth-check-close").on("click",function(){c()})})}(jQuery);;
// Make the list of internal blogs in adminbar scrollable

jQuery( document ).ready( function( $ ) {
	// Handle the tap on menus on mobile, override the core js.
	$(document.body).off( '.wp-mobile-hover' );
	$('#wpadminbar').off('touchstart');

	setTimeout( function() {
		$('li.menupop').on( 'touchstart', function(e) {
			var $target = $(e.target).closest( 'li' );

			if ( $target.hasClass( 'menupop' ) && $target.attr( 'id' ) != 'wp-admin-bar-switch-site' ) {
				e.preventDefault();

				$('li.menupop').not($(this)).removeClass( 'hover' );
				$(this).toggleClass( 'hover' );
			}
		});
	}, 10 );

	// Handle sub menu list of sites scrolling (pre-calypso toolbar view)
	var ul = $('#wpadminbar #wp-admin-bar-my-sites'),
		li = ul.find('> li').not('.adminbar-handle'),
		size = Math.floor( ( $(window).height() - 100 ) / 30 ), // approx, based on current styling
		topHandle, bottomHandle, interval, speed = 100;

	if ( ! ul.length || li.length < size + 1 || ul.find('li:first').hasClass('.adminbar-handle') )
		return;

	function move( direction ) {
		var hide, show, next,
			visible = li.filter(':visible'),
			first = visible.first(),
			last = visible.last();

		if ( 'up' == direction ) {
			show = last.next().not('.adminbar-handle');
			hide = first;

			if ( topHandle.hasClass('scrollend') ) {
				topHandle.removeClass('scrollend');
			}

			if ( show.next().hasClass('adminbar-handle') ) {
				bottomHandle.addClass('scrollend');
			}

			if ( ! show.length ) {
				window.clearInterval( interval );
				return;
			}
		} else if ( 'down' == direction ) {
			show = first.prev().not('.adminbar-handle');
			hide = last;

			if ( bottomHandle.hasClass('scrollend') ) {
				bottomHandle.removeClass('scrollend');
			}

			if ( show.prev().hasClass('adminbar-handle') ) {
				topHandle.addClass('scrollend');
			}

			if ( ! show.length ) {
				window.clearInterval( interval );
				return;
			}
		} else {
			return;
		}

		if ( hide.length && show.length ) {
			// Maybe add some sliding animation?
			hide.hide()
			show.show()
		}
	}

	// hide the extra items
	li.slice(size).hide();

	topHandle = $('<li class="adminbar-handle">');
	bottomHandle = topHandle.clone().addClass('handle-bottom');
	ul.prepend( topHandle.addClass('handle-top scrollend') ).append( bottomHandle );

	topHandle.on( 'mouseenter', function() {
		interval = window.setInterval( function() { move('down'); }, speed );
	}).on( 'click', function() {
		 move('down');
	});

	bottomHandle.on( 'mouseenter', function() {
		interval = window.setInterval( function() { move('up'); }, speed );
	}).on( 'click', function() {
		 move('up');
	});

	topHandle.add( bottomHandle ).on( 'mouseleave click', function() {
		 window.clearInterval( interval );
	});
});
;
!function(a){var b="object"==typeof self&&self.self===self&&self||"object"==typeof global&&global.global===global&&global;if("function"==typeof define&&define.amd)define(["underscore","jquery","exports"],function(c,d,e){b.Backbone=a(b,e,c,d)});else if("undefined"!=typeof exports){var c,d=require("underscore");try{c=require("jquery")}catch(e){}a(b,exports,d,c)}else b.Backbone=a(b,{},b._,b.jQuery||b.Zepto||b.ender||b.$)}(function(a,b,c,d){var e=a.Backbone,f=Array.prototype.slice;b.VERSION="1.3.3",b.$=d,b.noConflict=function(){return a.Backbone=e,this},b.emulateHTTP=!1,b.emulateJSON=!1;var g=function(a,b,d){switch(a){case 1:return function(){return c[b](this[d])};case 2:return function(a){return c[b](this[d],a)};case 3:return function(a,e){return c[b](this[d],i(a,this),e)};case 4:return function(a,e,f){return c[b](this[d],i(a,this),e,f)};default:return function(){var a=f.call(arguments);return a.unshift(this[d]),c[b].apply(c,a)}}},h=function(a,b,d){c.each(b,function(b,e){c[e]&&(a.prototype[e]=g(b,e,d))})},i=function(a,b){return c.isFunction(a)?a:c.isObject(a)&&!b._isModel(a)?j(a):c.isString(a)?function(b){return b.get(a)}:a},j=function(a){var b=c.matches(a);return function(a){return b(a.attributes)}},k=b.Events={},l=/\s+/,m=function(a,b,d,e,f){var g,h=0;if(d&&"object"==typeof d){void 0!==e&&"context"in f&&void 0===f.context&&(f.context=e);for(g=c.keys(d);h<g.length;h++)b=m(a,b,g[h],d[g[h]],f)}else if(d&&l.test(d))for(g=d.split(l);h<g.length;h++)b=a(b,g[h],e,f);else b=a(b,d,e,f);return b};k.on=function(a,b,c){return n(this,a,b,c)};var n=function(a,b,c,d,e){if(a._events=m(o,a._events||{},b,c,{context:d,ctx:a,listening:e}),e){var f=a._listeners||(a._listeners={});f[e.id]=e}return a};k.listenTo=function(a,b,d){if(!a)return this;var e=a._listenId||(a._listenId=c.uniqueId("l")),f=this._listeningTo||(this._listeningTo={}),g=f[e];if(!g){var h=this._listenId||(this._listenId=c.uniqueId("l"));g=f[e]={obj:a,objId:e,id:h,listeningTo:f,count:0}}return n(a,b,d,this,g),this};var o=function(a,b,c,d){if(c){var e=a[b]||(a[b]=[]),f=d.context,g=d.ctx,h=d.listening;h&&h.count++,e.push({callback:c,context:f,ctx:f||g,listening:h})}return a};k.off=function(a,b,c){return this._events?(this._events=m(p,this._events,a,b,{context:c,listeners:this._listeners}),this):this},k.stopListening=function(a,b,d){var e=this._listeningTo;if(!e)return this;for(var f=a?[a._listenId]:c.keys(e),g=0;g<f.length;g++){var h=e[f[g]];if(!h)break;h.obj.off(b,d,this)}return this};var p=function(a,b,d,e){if(a){var f,g=0,h=e.context,i=e.listeners;if(b||d||h){for(var j=b?[b]:c.keys(a);g<j.length;g++){b=j[g];var k=a[b];if(!k)break;for(var l=[],m=0;m<k.length;m++){var n=k[m];d&&d!==n.callback&&d!==n.callback._callback||h&&h!==n.context?l.push(n):(f=n.listening,f&&0===--f.count&&(delete i[f.id],delete f.listeningTo[f.objId]))}l.length?a[b]=l:delete a[b]}return a}for(var o=c.keys(i);g<o.length;g++)f=i[o[g]],delete i[f.id],delete f.listeningTo[f.objId]}};k.once=function(a,b,d){var e=m(q,{},a,b,c.bind(this.off,this));return"string"==typeof a&&null==d&&(b=void 0),this.on(e,b,d)},k.listenToOnce=function(a,b,d){var e=m(q,{},b,d,c.bind(this.stopListening,this,a));return this.listenTo(a,e)};var q=function(a,b,d,e){if(d){var f=a[b]=c.once(function(){e(b,f),d.apply(this,arguments)});f._callback=d}return a};k.trigger=function(a){if(!this._events)return this;for(var b=Math.max(0,arguments.length-1),c=Array(b),d=0;d<b;d++)c[d]=arguments[d+1];return m(r,this._events,a,void 0,c),this};var r=function(a,b,c,d){if(a){var e=a[b],f=a.all;e&&f&&(f=f.slice()),e&&s(e,d),f&&s(f,[b].concat(d))}return a},s=function(a,b){var c,d=-1,e=a.length,f=b[0],g=b[1],h=b[2];switch(b.length){case 0:for(;++d<e;)(c=a[d]).callback.call(c.ctx);return;case 1:for(;++d<e;)(c=a[d]).callback.call(c.ctx,f);return;case 2:for(;++d<e;)(c=a[d]).callback.call(c.ctx,f,g);return;case 3:for(;++d<e;)(c=a[d]).callback.call(c.ctx,f,g,h);return;default:for(;++d<e;)(c=a[d]).callback.apply(c.ctx,b);return}};k.bind=k.on,k.unbind=k.off,c.extend(b,k);var t=b.Model=function(a,b){var d=a||{};b||(b={}),this.cid=c.uniqueId(this.cidPrefix),this.attributes={},b.collection&&(this.collection=b.collection),b.parse&&(d=this.parse(d,b)||{});var e=c.result(this,"defaults");d=c.defaults(c.extend({},e,d),e),this.set(d,b),this.changed={},this.initialize.apply(this,arguments)};c.extend(t.prototype,k,{changed:null,validationError:null,idAttribute:"id",cidPrefix:"c",initialize:function(){},toJSON:function(a){return c.clone(this.attributes)},sync:function(){return b.sync.apply(this,arguments)},get:function(a){return this.attributes[a]},escape:function(a){return c.escape(this.get(a))},has:function(a){return null!=this.get(a)},matches:function(a){return!!c.iteratee(a,this)(this.attributes)},set:function(a,b,d){if(null==a)return this;var e;if("object"==typeof a?(e=a,d=b):(e={})[a]=b,d||(d={}),!this._validate(e,d))return!1;var f=d.unset,g=d.silent,h=[],i=this._changing;this._changing=!0,i||(this._previousAttributes=c.clone(this.attributes),this.changed={});var j=this.attributes,k=this.changed,l=this._previousAttributes;for(var m in e)b=e[m],c.isEqual(j[m],b)||h.push(m),c.isEqual(l[m],b)?delete k[m]:k[m]=b,f?delete j[m]:j[m]=b;if(this.idAttribute in e&&(this.id=this.get(this.idAttribute)),!g){h.length&&(this._pending=d);for(var n=0;n<h.length;n++)this.trigger("change:"+h[n],this,j[h[n]],d)}if(i)return this;if(!g)for(;this._pending;)d=this._pending,this._pending=!1,this.trigger("change",this,d);return this._pending=!1,this._changing=!1,this},unset:function(a,b){return this.set(a,void 0,c.extend({},b,{unset:!0}))},clear:function(a){var b={};for(var d in this.attributes)b[d]=void 0;return this.set(b,c.extend({},a,{unset:!0}))},hasChanged:function(a){return null==a?!c.isEmpty(this.changed):c.has(this.changed,a)},changedAttributes:function(a){if(!a)return!!this.hasChanged()&&c.clone(this.changed);var b=this._changing?this._previousAttributes:this.attributes,d={};for(var e in a){var f=a[e];c.isEqual(b[e],f)||(d[e]=f)}return!!c.size(d)&&d},previous:function(a){return null!=a&&this._previousAttributes?this._previousAttributes[a]:null},previousAttributes:function(){return c.clone(this._previousAttributes)},fetch:function(a){a=c.extend({parse:!0},a);var b=this,d=a.success;return a.success=function(c){var e=a.parse?b.parse(c,a):c;return!!b.set(e,a)&&(d&&d.call(a.context,b,c,a),void b.trigger("sync",b,c,a))},P(this,a),this.sync("read",this,a)},save:function(a,b,d){var e;null==a||"object"==typeof a?(e=a,d=b):(e={})[a]=b,d=c.extend({validate:!0,parse:!0},d);var f=d.wait;if(e&&!f){if(!this.set(e,d))return!1}else if(!this._validate(e,d))return!1;var g=this,h=d.success,i=this.attributes;d.success=function(a){g.attributes=i;var b=d.parse?g.parse(a,d):a;return f&&(b=c.extend({},e,b)),!(b&&!g.set(b,d))&&(h&&h.call(d.context,g,a,d),void g.trigger("sync",g,a,d))},P(this,d),e&&f&&(this.attributes=c.extend({},i,e));var j=this.isNew()?"create":d.patch?"patch":"update";"patch"!==j||d.attrs||(d.attrs=e);var k=this.sync(j,this,d);return this.attributes=i,k},destroy:function(a){a=a?c.clone(a):{};var b=this,d=a.success,e=a.wait,f=function(){b.stopListening(),b.trigger("destroy",b,b.collection,a)};a.success=function(c){e&&f(),d&&d.call(a.context,b,c,a),b.isNew()||b.trigger("sync",b,c,a)};var g=!1;return this.isNew()?c.defer(a.success):(P(this,a),g=this.sync("delete",this,a)),e||f(),g},url:function(){var a=c.result(this,"urlRoot")||c.result(this.collection,"url")||O();if(this.isNew())return a;var b=this.get(this.idAttribute);return a.replace(/[^\/]$/,"$&/")+encodeURIComponent(b)},parse:function(a,b){return a},clone:function(){return new this.constructor(this.attributes)},isNew:function(){return!this.has(this.idAttribute)},isValid:function(a){return this._validate({},c.extend({},a,{validate:!0}))},_validate:function(a,b){if(!b.validate||!this.validate)return!0;a=c.extend({},this.attributes,a);var d=this.validationError=this.validate(a,b)||null;return!d||(this.trigger("invalid",this,d,c.extend(b,{validationError:d})),!1)}});var u={keys:1,values:1,pairs:1,invert:1,pick:0,omit:0,chain:1,isEmpty:1};h(t,u,"attributes");var v=b.Collection=function(a,b){b||(b={}),b.model&&(this.model=b.model),void 0!==b.comparator&&(this.comparator=b.comparator),this._reset(),this.initialize.apply(this,arguments),a&&this.reset(a,c.extend({silent:!0},b))},w={add:!0,remove:!0,merge:!0},x={add:!0,remove:!1},y=function(a,b,c){c=Math.min(Math.max(c,0),a.length);var d,e=Array(a.length-c),f=b.length;for(d=0;d<e.length;d++)e[d]=a[d+c];for(d=0;d<f;d++)a[d+c]=b[d];for(d=0;d<e.length;d++)a[d+f+c]=e[d]};c.extend(v.prototype,k,{model:t,initialize:function(){},toJSON:function(a){return this.map(function(b){return b.toJSON(a)})},sync:function(){return b.sync.apply(this,arguments)},add:function(a,b){return this.set(a,c.extend({merge:!1},b,x))},remove:function(a,b){b=c.extend({},b);var d=!c.isArray(a);a=d?[a]:a.slice();var e=this._removeModels(a,b);return!b.silent&&e.length&&(b.changes={added:[],merged:[],removed:e},this.trigger("update",this,b)),d?e[0]:e},set:function(a,b){if(null!=a){b=c.extend({},w,b),b.parse&&!this._isModel(a)&&(a=this.parse(a,b)||[]);var d=!c.isArray(a);a=d?[a]:a.slice();var e=b.at;null!=e&&(e=+e),e>this.length&&(e=this.length),e<0&&(e+=this.length+1);var f,g,h=[],i=[],j=[],k=[],l={},m=b.add,n=b.merge,o=b.remove,p=!1,q=this.comparator&&null==e&&b.sort!==!1,r=c.isString(this.comparator)?this.comparator:null;for(g=0;g<a.length;g++){f=a[g];var s=this.get(f);if(s){if(n&&f!==s){var t=this._isModel(f)?f.attributes:f;b.parse&&(t=s.parse(t,b)),s.set(t,b),j.push(s),q&&!p&&(p=s.hasChanged(r))}l[s.cid]||(l[s.cid]=!0,h.push(s)),a[g]=s}else m&&(f=a[g]=this._prepareModel(f,b),f&&(i.push(f),this._addReference(f,b),l[f.cid]=!0,h.push(f)))}if(o){for(g=0;g<this.length;g++)f=this.models[g],l[f.cid]||k.push(f);k.length&&this._removeModels(k,b)}var u=!1,v=!q&&m&&o;if(h.length&&v?(u=this.length!==h.length||c.some(this.models,function(a,b){return a!==h[b]}),this.models.length=0,y(this.models,h,0),this.length=this.models.length):i.length&&(q&&(p=!0),y(this.models,i,null==e?this.length:e),this.length=this.models.length),p&&this.sort({silent:!0}),!b.silent){for(g=0;g<i.length;g++)null!=e&&(b.index=e+g),f=i[g],f.trigger("add",f,this,b);(p||u)&&this.trigger("sort",this,b),(i.length||k.length||j.length)&&(b.changes={added:i,removed:k,merged:j},this.trigger("update",this,b))}return d?a[0]:a}},reset:function(a,b){b=b?c.clone(b):{};for(var d=0;d<this.models.length;d++)this._removeReference(this.models[d],b);return b.previousModels=this.models,this._reset(),a=this.add(a,c.extend({silent:!0},b)),b.silent||this.trigger("reset",this,b),a},push:function(a,b){return this.add(a,c.extend({at:this.length},b))},pop:function(a){var b=this.at(this.length-1);return this.remove(b,a)},unshift:function(a,b){return this.add(a,c.extend({at:0},b))},shift:function(a){var b=this.at(0);return this.remove(b,a)},slice:function(){return f.apply(this.models,arguments)},get:function(a){if(null!=a)return this._byId[a]||this._byId[this.modelId(a.attributes||a)]||a.cid&&this._byId[a.cid]},has:function(a){return null!=this.get(a)},at:function(a){return a<0&&(a+=this.length),this.models[a]},where:function(a,b){return this[b?"find":"filter"](a)},findWhere:function(a){return this.where(a,!0)},sort:function(a){var b=this.comparator;if(!b)throw new Error("Cannot sort a set without a comparator");a||(a={});var d=b.length;return c.isFunction(b)&&(b=c.bind(b,this)),1===d||c.isString(b)?this.models=this.sortBy(b):this.models.sort(b),a.silent||this.trigger("sort",this,a),this},pluck:function(a){return this.map(a+"")},fetch:function(a){a=c.extend({parse:!0},a);var b=a.success,d=this;return a.success=function(c){var e=a.reset?"reset":"set";d[e](c,a),b&&b.call(a.context,d,c,a),d.trigger("sync",d,c,a)},P(this,a),this.sync("read",this,a)},create:function(a,b){b=b?c.clone(b):{};var d=b.wait;if(a=this._prepareModel(a,b),!a)return!1;d||this.add(a,b);var e=this,f=b.success;return b.success=function(a,b,c){d&&e.add(a,c),f&&f.call(c.context,a,b,c)},a.save(null,b),a},parse:function(a,b){return a},clone:function(){return new this.constructor(this.models,{model:this.model,comparator:this.comparator})},modelId:function(a){return a[this.model.prototype.idAttribute||"id"]},_reset:function(){this.length=0,this.models=[],this._byId={}},_prepareModel:function(a,b){if(this._isModel(a))return a.collection||(a.collection=this),a;b=b?c.clone(b):{},b.collection=this;var d=new this.model(a,b);return d.validationError?(this.trigger("invalid",this,d.validationError,b),!1):d},_removeModels:function(a,b){for(var c=[],d=0;d<a.length;d++){var e=this.get(a[d]);if(e){var f=this.indexOf(e);this.models.splice(f,1),this.length--,delete this._byId[e.cid];var g=this.modelId(e.attributes);null!=g&&delete this._byId[g],b.silent||(b.index=f,e.trigger("remove",e,this,b)),c.push(e),this._removeReference(e,b)}}return c},_isModel:function(a){return a instanceof t},_addReference:function(a,b){this._byId[a.cid]=a;var c=this.modelId(a.attributes);null!=c&&(this._byId[c]=a),a.on("all",this._onModelEvent,this)},_removeReference:function(a,b){delete this._byId[a.cid];var c=this.modelId(a.attributes);null!=c&&delete this._byId[c],this===a.collection&&delete a.collection,a.off("all",this._onModelEvent,this)},_onModelEvent:function(a,b,c,d){if(b){if(("add"===a||"remove"===a)&&c!==this)return;if("destroy"===a&&this.remove(b,d),"change"===a){var e=this.modelId(b.previousAttributes()),f=this.modelId(b.attributes);e!==f&&(null!=e&&delete this._byId[e],null!=f&&(this._byId[f]=b))}}this.trigger.apply(this,arguments)}});var z={forEach:3,each:3,map:3,collect:3,reduce:0,foldl:0,inject:0,reduceRight:0,foldr:0,find:3,detect:3,filter:3,select:3,reject:3,every:3,all:3,some:3,any:3,include:3,includes:3,contains:3,invoke:0,max:3,min:3,toArray:1,size:1,first:3,head:3,take:3,initial:3,rest:3,tail:3,drop:3,last:3,without:0,difference:0,indexOf:3,shuffle:1,lastIndexOf:3,isEmpty:1,chain:1,sample:3,partition:3,groupBy:3,countBy:3,sortBy:3,indexBy:3,findIndex:3,findLastIndex:3};h(v,z,"models");var A=b.View=function(a){this.cid=c.uniqueId("view"),c.extend(this,c.pick(a,C)),this._ensureElement(),this.initialize.apply(this,arguments)},B=/^(\S+)\s*(.*)$/,C=["model","collection","el","id","attributes","className","tagName","events"];c.extend(A.prototype,k,{tagName:"div",$:function(a){return this.$el.find(a)},initialize:function(){},render:function(){return this},remove:function(){return this._removeElement(),this.stopListening(),this},_removeElement:function(){this.$el.remove()},setElement:function(a){return this.undelegateEvents(),this._setElement(a),this.delegateEvents(),this},_setElement:function(a){this.$el=a instanceof b.$?a:b.$(a),this.el=this.$el[0]},delegateEvents:function(a){if(a||(a=c.result(this,"events")),!a)return this;this.undelegateEvents();for(var b in a){var d=a[b];if(c.isFunction(d)||(d=this[d]),d){var e=b.match(B);this.delegate(e[1],e[2],c.bind(d,this))}}return this},delegate:function(a,b,c){return this.$el.on(a+".delegateEvents"+this.cid,b,c),this},undelegateEvents:function(){return this.$el&&this.$el.off(".delegateEvents"+this.cid),this},undelegate:function(a,b,c){return this.$el.off(a+".delegateEvents"+this.cid,b,c),this},_createElement:function(a){return document.createElement(a)},_ensureElement:function(){if(this.el)this.setElement(c.result(this,"el"));else{var a=c.extend({},c.result(this,"attributes"));this.id&&(a.id=c.result(this,"id")),this.className&&(a["class"]=c.result(this,"className")),this.setElement(this._createElement(c.result(this,"tagName"))),this._setAttributes(a)}},_setAttributes:function(a){this.$el.attr(a)}}),b.sync=function(a,d,e){var f=D[a];c.defaults(e||(e={}),{emulateHTTP:b.emulateHTTP,emulateJSON:b.emulateJSON});var g={type:f,dataType:"json"};if(e.url||(g.url=c.result(d,"url")||O()),null!=e.data||!d||"create"!==a&&"update"!==a&&"patch"!==a||(g.contentType="application/json",g.data=JSON.stringify(e.attrs||d.toJSON(e))),e.emulateJSON&&(g.contentType="application/x-www-form-urlencoded",g.data=g.data?{model:g.data}:{}),e.emulateHTTP&&("PUT"===f||"DELETE"===f||"PATCH"===f)){g.type="POST",e.emulateJSON&&(g.data._method=f);var h=e.beforeSend;e.beforeSend=function(a){if(a.setRequestHeader("X-HTTP-Method-Override",f),h)return h.apply(this,arguments)}}"GET"===g.type||e.emulateJSON||(g.processData=!1);var i=e.error;e.error=function(a,b,c){e.textStatus=b,e.errorThrown=c,i&&i.call(e.context,a,b,c)};var j=e.xhr=b.ajax(c.extend(g,e));return d.trigger("request",d,j,e),j};var D={create:"POST",update:"PUT",patch:"PATCH","delete":"DELETE",read:"GET"};b.ajax=function(){return b.$.ajax.apply(b.$,arguments)};var E=b.Router=function(a){a||(a={}),a.routes&&(this.routes=a.routes),this._bindRoutes(),this.initialize.apply(this,arguments)},F=/\((.*?)\)/g,G=/(\(\?)?:\w+/g,H=/\*\w+/g,I=/[\-{}\[\]+?.,\\\^$|#\s]/g;c.extend(E.prototype,k,{initialize:function(){},route:function(a,d,e){c.isRegExp(a)||(a=this._routeToRegExp(a)),c.isFunction(d)&&(e=d,d=""),e||(e=this[d]);var f=this;return b.history.route(a,function(c){var g=f._extractParameters(a,c);f.execute(e,g,d)!==!1&&(f.trigger.apply(f,["route:"+d].concat(g)),f.trigger("route",d,g),b.history.trigger("route",f,d,g))}),this},execute:function(a,b,c){a&&a.apply(this,b)},navigate:function(a,c){return b.history.navigate(a,c),this},_bindRoutes:function(){if(this.routes){this.routes=c.result(this,"routes");for(var a,b=c.keys(this.routes);null!=(a=b.pop());)this.route(a,this.routes[a])}},_routeToRegExp:function(a){return a=a.replace(I,"\\$&").replace(F,"(?:$1)?").replace(G,function(a,b){return b?a:"([^/?]+)"}).replace(H,"([^?]*?)"),new RegExp("^"+a+"(?:\\?([\\s\\S]*))?$")},_extractParameters:function(a,b){var d=a.exec(b).slice(1);return c.map(d,function(a,b){return b===d.length-1?a||null:a?decodeURIComponent(a):null})}});var J=b.History=function(){this.handlers=[],this.checkUrl=c.bind(this.checkUrl,this),"undefined"!=typeof window&&(this.location=window.location,this.history=window.history)},K=/^[#\/]|\s+$/g,L=/^\/+|\/+$/g,M=/#.*$/;J.started=!1,c.extend(J.prototype,k,{interval:50,atRoot:function(){var a=this.location.pathname.replace(/[^\/]$/,"$&/");return a===this.root&&!this.getSearch()},matchRoot:function(){var a=this.decodeFragment(this.location.pathname),b=a.slice(0,this.root.length-1)+"/";return b===this.root},decodeFragment:function(a){return decodeURI(a.replace(/%25/g,"%2525"))},getSearch:function(){var a=this.location.href.replace(/#.*/,"").match(/\?.+/);return a?a[0]:""},getHash:function(a){var b=(a||this).location.href.match(/#(.*)$/);return b?b[1]:""},getPath:function(){var a=this.decodeFragment(this.location.pathname+this.getSearch()).slice(this.root.length-1);return"/"===a.charAt(0)?a.slice(1):a},getFragment:function(a){return null==a&&(a=this._usePushState||!this._wantsHashChange?this.getPath():this.getHash()),a.replace(K,"")},start:function(a){if(J.started)throw new Error("Backbone.history has already been started");if(J.started=!0,this.options=c.extend({root:"/"},this.options,a),this.root=this.options.root,this._wantsHashChange=this.options.hashChange!==!1,this._hasHashChange="onhashchange"in window&&(void 0===document.documentMode||document.documentMode>7),this._useHashChange=this._wantsHashChange&&this._hasHashChange,this._wantsPushState=!!this.options.pushState,this._hasPushState=!(!this.history||!this.history.pushState),this._usePushState=this._wantsPushState&&this._hasPushState,this.fragment=this.getFragment(),this.root=("/"+this.root+"/").replace(L,"/"),this._wantsHashChange&&this._wantsPushState){if(!this._hasPushState&&!this.atRoot()){var b=this.root.slice(0,-1)||"/";return this.location.replace(b+"#"+this.getPath()),!0}this._hasPushState&&this.atRoot()&&this.navigate(this.getHash(),{replace:!0})}if(!this._hasHashChange&&this._wantsHashChange&&!this._usePushState){this.iframe=document.createElement("iframe"),this.iframe.src="javascript:0",this.iframe.style.display="none",this.iframe.tabIndex=-1;var d=document.body,e=d.insertBefore(this.iframe,d.firstChild).contentWindow;e.document.open(),e.document.close(),e.location.hash="#"+this.fragment}var f=window.addEventListener||function(a,b){return attachEvent("on"+a,b)};if(this._usePushState?f("popstate",this.checkUrl,!1):this._useHashChange&&!this.iframe?f("hashchange",this.checkUrl,!1):this._wantsHashChange&&(this._checkUrlInterval=setInterval(this.checkUrl,this.interval)),!this.options.silent)return this.loadUrl()},stop:function(){var a=window.removeEventListener||function(a,b){return detachEvent("on"+a,b)};this._usePushState?a("popstate",this.checkUrl,!1):this._useHashChange&&!this.iframe&&a("hashchange",this.checkUrl,!1),this.iframe&&(document.body.removeChild(this.iframe),this.iframe=null),this._checkUrlInterval&&clearInterval(this._checkUrlInterval),J.started=!1},route:function(a,b){this.handlers.unshift({route:a,callback:b})},checkUrl:function(a){var b=this.getFragment();return b===this.fragment&&this.iframe&&(b=this.getHash(this.iframe.contentWindow)),b!==this.fragment&&(this.iframe&&this.navigate(b),void this.loadUrl())},loadUrl:function(a){return!!this.matchRoot()&&(a=this.fragment=this.getFragment(a),c.some(this.handlers,function(b){if(b.route.test(a))return b.callback(a),!0}))},navigate:function(a,b){if(!J.started)return!1;b&&b!==!0||(b={trigger:!!b}),a=this.getFragment(a||"");var c=this.root;""!==a&&"?"!==a.charAt(0)||(c=c.slice(0,-1)||"/");var d=c+a;if(a=this.decodeFragment(a.replace(M,"")),this.fragment!==a){if(this.fragment=a,this._usePushState)this.history[b.replace?"replaceState":"pushState"]({},document.title,d);else{if(!this._wantsHashChange)return this.location.assign(d);if(this._updateHash(this.location,a,b.replace),this.iframe&&a!==this.getHash(this.iframe.contentWindow)){var e=this.iframe.contentWindow;b.replace||(e.document.open(),e.document.close()),this._updateHash(e.location,a,b.replace)}}return b.trigger?this.loadUrl(a):void 0}},_updateHash:function(a,b,c){if(c){var d=a.href.replace(/(javascript:|#).*$/,"");a.replace(d+"#"+b)}else a.hash="#"+b}}),b.history=new J;var N=function(a,b){var d,e=this;return d=a&&c.has(a,"constructor")?a.constructor:function(){return e.apply(this,arguments)},c.extend(d,e,b),d.prototype=c.create(e.prototype,a),d.prototype.constructor=d,d.__super__=e.prototype,d};t.extend=v.extend=E.extend=A.extend=J.extend=N;var O=function(){throw new Error('A "url" property or function must be specified')},P=function(a,b){var c=b.error;b.error=function(d){c&&c.call(b.context,a,d,b),a.trigger("error",a,d,b)}};return b});;
/*!
 * mustache.js - Logic-less {{mustache}} templates with JavaScript
 * http://github.com/janl/mustache.js
 */
var Mustache = (typeof module !== "undefined" && module.exports) || {};

(function (exports) {

  exports.name = "mustache.js";
  exports.version = "0.5.0-dev";
  exports.tags = ["{{", "}}"];
  exports.parse = parse;
  exports.compile = compile;
  exports.render = render;
  exports.clearCache = clearCache;

  // This is here for backwards compatibility with 0.4.x.
  exports.to_html = function (template, view, partials, send) {
    var result = render(template, view, partials);

    if (typeof send === "function") {
      send(result);
    } else {
      return result;
    }
  };

  var _toString = Object.prototype.toString;
  var _isArray = Array.isArray;
  var _forEach = Array.prototype.forEach;
  var _trim = String.prototype.trim;

  var isArray;
  if (_isArray) {
    isArray = _isArray;
  } else {
    isArray = function (obj) {
      return _toString.call(obj) === "[object Array]";
    };
  }

  var forEach;
  if (_forEach) {
    forEach = function (obj, callback, scope) {
      return _forEach.call(obj, callback, scope);
    };
  } else {
    forEach = function (obj, callback, scope) {
      for (var i = 0, len = obj.length; i < len; ++i) {
        callback.call(scope, obj[i], i, obj);
      }
    };
  }

  var spaceRe = /^\s*$/;

  function isWhitespace(string) {
    return spaceRe.test(string);
  }

  var trim;
  if (_trim) {
    trim = function (string) {
      return string == null ? "" : _trim.call(string);
    };
  } else {
    var trimLeft, trimRight;

    if (isWhitespace("\xA0")) {
      trimLeft = /^\s+/;
      trimRight = /\s+$/;
    } else {
      trimLeft = /^[\s\xA0]+/;
      trimRight = /[\s\xA0]+$/;
    }

    trim = function (string) {
      return string == null ? "" :
        String(string).replace(trimLeft, "").replace(trimRight, "");
    };
  }

  var escapeMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': '&quot;',
    "'": '&#39;'
  };

  function escapeHTML(string) {
    return String(string).replace(/&(?!\w+;)|[<>"']/g, function (s) {
      return escapeMap[s] || s;
    });
  }

  /**
   * Adds the `template`, `line`, and `file` properties to the given error
   * object and alters the message to provide more useful debugging information.
   */
  function debug(e, template, line, file) {
    file = file || "<template>";

    var lines = template.split("\n"),
        start = Math.max(line - 3, 0),
        end = Math.min(lines.length, line + 3),
        context = lines.slice(start, end);

    var c;
    for (var i = 0, len = context.length; i < len; ++i) {
      c = i + start + 1;
      context[i] = (c === line ? " >> " : "    ") + context[i];
    }

    e.template = template;
    e.line = line;
    e.file = file;
    e.message = [file + ":" + line, context.join("\n"), "", e.message].join("\n");

    return e;
  }

  /**
   * Looks up the value of the given `name` in the given context `stack`.
   */
  function lookup(name, stack, defaultValue) {
    if (name === ".") {
      return stack[stack.length - 1];
    }

    var names = name.split(".");
    var lastIndex = names.length - 1;
    var target = names[lastIndex];

    var value, context, i = stack.length, j, localStack;
    while (i) {
      localStack = stack.slice(0);
      context = stack[--i];

      j = 0;
      while (j < lastIndex) {
        context = context[names[j++]];

        if (context == null) {
          break;
        }

        localStack.push(context);
      }

      if (context && typeof context === "object" && target in context) {
        value = context[target];
        break;
      }
    }

    // If the value is a function, call it in the current context.
    if (typeof value === "function") {
      value = value.call(localStack[localStack.length - 1]);
    }

    if (value == null)  {
      return defaultValue;
    }

    return value;
  }

  function renderSection(name, stack, callback, inverted) {
    var buffer = "";
    var value =  lookup(name, stack);

    if (inverted) {
      // From the spec: inverted sections may render text once based on the
      // inverse value of the key. That is, they will be rendered if the key
      // doesn't exist, is false, or is an empty list.
      if (value == null || value === false || (isArray(value) && value.length === 0)) {
        buffer += callback();
      }
    } else if (isArray(value)) {
      forEach(value, function (value) {
        stack.push(value);
        buffer += callback();
        stack.pop();
      });
    } else if (typeof value === "object") {
      stack.push(value);
      buffer += callback();
      stack.pop();
    } else if (typeof value === "function") {
      var scope = stack[stack.length - 1];
      var scopedRender = function (template) {
        return render(template, scope);
      };
      buffer += value.call(scope, callback(), scopedRender) || "";
    } else if (value) {
      buffer += callback();
    }

    return buffer;
  }

  /**
   * Parses the given `template` and returns the source of a function that,
   * with the proper arguments, will render the template. Recognized options
   * include the following:
   *
   *   - file     The name of the file the template comes from (displayed in
   *              error messages)
   *   - tags     An array of open and close tags the `template` uses. Defaults
   *              to the value of Mustache.tags
   *   - debug    Set `true` to log the body of the generated function to the
   *              console
   *   - space    Set `true` to preserve whitespace from lines that otherwise
   *              contain only a {{tag}}. Defaults to `false`
   */
  function parse(template, options) {
    options = options || {};

    var tags = options.tags || exports.tags,
        openTag = tags[0],
        closeTag = tags[tags.length - 1];

    var code = [
      'var buffer = "";', // output buffer
      "\nvar line = 1;", // keep track of source line number
      "\ntry {",
      '\nbuffer += "'
    ];

    var spaces = [],      // indices of whitespace in code on the current line
        hasTag = false,   // is there a {{tag}} on the current line?
        nonSpace = false; // is there a non-space char on the current line?

    // Strips all space characters from the code array for the current line
    // if there was a {{tag}} on it and otherwise only spaces.
    var stripSpace = function () {
      if (hasTag && !nonSpace && !options.space) {
        while (spaces.length) {
          code.splice(spaces.pop(), 1);
        }
      } else {
        spaces = [];
      }

      hasTag = false;
      nonSpace = false;
    };

    var sectionStack = [], updateLine, nextOpenTag, nextCloseTag;

    var setTags = function (source) {
      tags = trim(source).split(/\s+/);
      nextOpenTag = tags[0];
      nextCloseTag = tags[tags.length - 1];
    };

    var includePartial = function (source) {
      code.push(
        '";',
        updateLine,
        '\nvar partial = partials["' + trim(source) + '"];',
        '\nif (partial) {',
        '\n  buffer += render(partial,stack[stack.length - 1],partials);',
        '\n}',
        '\nbuffer += "'
      );
    };

    var openSection = function (source, inverted) {
      var name = trim(source);

      if (name === "") {
        throw debug(new Error("Section name may not be empty"), template, line, options.file);
      }

      sectionStack.push({name: name, inverted: inverted});

      code.push(
        '";',
        updateLine,
        '\nvar name = "' + name + '";',
        '\nvar callback = (function () {',
        '\n  return function () {',
        '\n    var buffer = "";',
        '\nbuffer += "'
      );
    };

    var openInvertedSection = function (source) {
      openSection(source, true);
    };

    var closeSection = function (source) {
      var name = trim(source);
      var openName = sectionStack.length != 0 && sectionStack[sectionStack.length - 1].name;

      if (!openName || name != openName) {
        throw debug(new Error('Section named "' + name + '" was never opened'), template, line, options.file);
      }

      var section = sectionStack.pop();

      code.push(
        '";',
        '\n    return buffer;',
        '\n  };',
        '\n})();'
      );

      if (section.inverted) {
        code.push("\nbuffer += renderSection(name,stack,callback,true);");
      } else {
        code.push("\nbuffer += renderSection(name,stack,callback);");
      }

      code.push('\nbuffer += "');
    };

    var sendPlain = function (source) {
      code.push(
        '";',
        updateLine,
        '\nbuffer += lookup("' + trim(source) + '",stack,"");',
        '\nbuffer += "'
      );
    };

    var sendEscaped = function (source) {
      code.push(
        '";',
        updateLine,
        '\nbuffer += escapeHTML(lookup("' + trim(source) + '",stack,""));',
        '\nbuffer += "'
      );
    };

    var line = 1, c, callback;
    for (var i = 0, len = template.length; i < len; ++i) {
      if (template.slice(i, i + openTag.length) === openTag) {
        i += openTag.length;
        c = template.substr(i, 1);
        updateLine = '\nline = ' + line + ';';
        nextOpenTag = openTag;
        nextCloseTag = closeTag;
        hasTag = true;

        switch (c) {
        case "!": // comment
          i++;
          callback = null;
          break;
        case "=": // change open/close tags, e.g. {{=<% %>=}}
          i++;
          closeTag = "=" + closeTag;
          callback = setTags;
          break;
        case ">": // include partial
          i++;
          callback = includePartial;
          break;
        case "#": // start section
          i++;
          callback = openSection;
          break;
        case "^": // start inverted section
          i++;
          callback = openInvertedSection;
          break;
        case "/": // end section
          i++;
          callback = closeSection;
          break;
        case "{": // plain variable
          closeTag = "}" + closeTag;
          // fall through
        case "&": // plain variable
          i++;
          nonSpace = true;
          callback = sendPlain;
          break;
        default: // escaped variable
          nonSpace = true;
          callback = sendEscaped;
        }

        var end = template.indexOf(closeTag, i);

        if (end === -1) {
          throw debug(new Error('Tag "' + openTag + '" was not closed properly'), template, line, options.file);
        }

        var source = template.substring(i, end);

        if (callback) {
          callback(source);
        }

        // Maintain line count for \n in source.
        var n = 0;
        while (~(n = source.indexOf("\n", n))) {
          line++;
          n++;
        }

        i = end + closeTag.length - 1;
        openTag = nextOpenTag;
        closeTag = nextCloseTag;
      } else {
        c = template.substr(i, 1);

        switch (c) {
        case '"':
        case "\\":
          nonSpace = true;
          code.push("\\" + c);
          break;
        case "\r":
          // Ignore carriage returns.
          break;
        case "\n":
          spaces.push(code.length);
          code.push("\\n");
          stripSpace(); // Check for whitespace on the current line.
          line++;
          break;
        default:
          if (isWhitespace(c)) {
            spaces.push(code.length);
          } else {
            nonSpace = true;
          }

          code.push(c);
        }
      }
    }

    if (sectionStack.length != 0) {
      throw debug(new Error('Section "' + sectionStack[sectionStack.length - 1].name + '" was not closed properly'), template, line, options.file);
    }

    // Clean up any whitespace from a closing {{tag}} that was at the end
    // of the template without a trailing \n.
    stripSpace();

    code.push(
      '";',
      "\nreturn buffer;",
      "\n} catch (e) { throw {error: e, line: line}; }"
    );

    // Ignore `buffer += "";` statements.
    var body = code.join("").replace(/buffer \+= "";\n/g, "");

    if (options.debug) {
      if (typeof console != "undefined" && console.log) {
        console.log(body);
      } else if (typeof print === "function") {
        print(body);
      }
    }

    return body;
  }

  /**
   * Used by `compile` to generate a reusable function for the given `template`.
   */
  function _compile(template, options) {
    var args = "view,partials,stack,lookup,escapeHTML,renderSection,render";
    var body = parse(template, options);
    var fn = new Function(args, body);

    // This anonymous function wraps the generated function so we can do
    // argument coercion, setup some variables, and handle any errors
    // encountered while executing it.
    return function (view, partials) {
      partials = partials || {};

      var stack = [view]; // context stack

      try {
        return fn(view, partials, stack, lookup, escapeHTML, renderSection, render);
      } catch (e) {
        throw debug(e.error, template, e.line, options.file);
      }
    };
  }

  // Cache of pre-compiled templates.
  var _cache = {};

  /**
   * Clear the cache of compiled templates.
   */
  function clearCache() {
    _cache = {};
  }

  /**
   * Compiles the given `template` into a reusable function using the given
   * `options`. In addition to the options accepted by Mustache.parse,
   * recognized options include the following:
   *
   *   - cache    Set `false` to bypass any pre-compiled version of the given
   *              template. Otherwise, a given `template` string will be cached
   *              the first time it is parsed
   */
  function compile(template, options) {
    options = options || {};

    // Use a pre-compiled version from the cache if we have one.
    if (options.cache !== false) {
      if (!_cache[template]) {
        _cache[template] = _compile(template, options);
      }

      return _cache[template];
    }

    return _compile(template, options);
  }

  /**
   * High-level function that renders the given `template` using the given
   * `view` and `partials`. If you need to use any of the template options (see
   * `compile` above), you must compile in a separate step, and then call that
   * compiled function.
   */
  function render(template, view, partials) {
    return compile(template)(view, partials);
  }

})(Mustache);
;
/* Common front-end code for the Notifications system
 *	- wpNotesCommon wraps all the proxied REST calls
 *	- wpNoteModel & wpNoteList are Backbone.js Model, & Collection implementations
 */

var wpNotesCommon;
var wpNotesCommentModView;
var wpNoteList;
var wpNoteModel;

(function($){
	var cookies = document.cookie.split( /;\s*/ ), cookie = false;
	for ( i = 0; i < cookies.length; i++ ) {
		if ( cookies[i].match( /^wp_api=/ ) ) {
			cookies = cookies[i].split( '=' );
			cookie = cookies[1];
			break;
		}
	}

	wpNotesCommon = {
		jsonAPIbase: 'https://public-api.wordpress.com/rest/v1',
		hasUpgradedProxy: false,

		noteTypes: {
			comment: 'comment',
			follow: 'follow',
			like: [
				'like',
				'like_trap'
			],
			reblog: 'reblog',
			trophy: [
				'best_liked_day_feat',
				'like_milestone_achievement',
				'achieve_automattician_note',
				'achieve_user_anniversary',
				'best_followed_day_feat',
				'followed_milestone_achievement'
			],
			'alert': [
				'expired_domain_alert'
			]
		},

		noteType2Noticon: {
			'like': 'like',
			'follow': 'follow',
			'comment_like': 'like',
			'comment': 'comment',
			'comment_pingback': 'external',
			'reblog': 'reblog',
			'like_milestone_achievement': 'trophy',
			'achieve_followed_milestone_note': 'trophy',
			'achieve_user_anniversary': 'trophy',
			'best_liked_day_feat': 'milestone',
			'best_followed_day_feat': 'milestone',
			'automattician_achievement': 'trophy',
			'expired_domain_alert': 'alert',
			'automattcher': 'atsign'
		},
	
		createNoteContainer: function( note, id_prefix ) {
			var note_container = $('<div/>', {
				id : id_prefix + '-note-' + note.id,
				'class' : 'wpn-note wpn-' + note.type + ' ' + ( ( note.unread > 0 ) ? 'wpn-unread' : 'wpn-read' )
			}).data( {
				id: parseInt( note.id, 10 ),
				type: note.type
			});
			var note_body = $('<div/>', { "class":"wpn-note-body wpn-note-body-empty" } );
			var spinner = $( '<div/>', { style : 'position: absolute; left: 180px; top: 60px;' } );
			note_body.append( spinner );
			spinner.spin( 'medium' );
			note_container.append(
				this.createNoteSubject( note ),
				note_body
			);
	
			return note_container;
		},
	
		createNoteSubject: function( note ) {
			var subj = $('<div/>', { "class":"wpn-note-summary" } ).append(
				$('<span/>', {
					"class" : 'wpn-noticon noticon noticon' + note.noticon
				}),
				$('<span/>', {
					"class" : 'wpn-icon no-grav',
						html : $('<img/>', {
							src : note.subject.icon,
							width : '24px',
							height : '24px',
							style : 'display: inline-block; width: 24px; height: 24px; overflow-x: hidden; overflow-y: hidden;'
						})
				}),
				$('<span/>', {
					"class" : 'wpn-subject',
					html : note.subject.html
				})
			);
			return subj;
		},
	
	
		createNoteBody: function( note_model ) {
			var note_body = $('<div/>', { "class":"wpn-note-body" } );
			var note = note_model.toJSON();
			var class_prefix = 'wpn-' + note.body.template;
			switch( note.body.template ) {
				case 'single-line-list' :
				case 'multi-line-list' :
					note_body.append( 
						$( '<p/>' ).addClass( class_prefix + '-header' ).html( note.body.header )
					);

					for ( var i in note.body.items ) {
						var item = $('<div></div>', { 
							'class' : class_prefix + '-item ' + class_prefix + '-item-' + i + 
								( note.body.items[i].icon ? '' : ' ' + class_prefix + '-item-no-icon' )
						});
						if ( note.body.items[i].icon ) {
							item.append(
								$('<img/>', { 
									"class" : class_prefix + '-item-icon avatar avatar-' + note.body.items[i].icon_width,
									height: note.body.items[i].icon_height,
									width: note.body.items[i].icon_width,
									src: note.body.items[i].icon
							} ) );
						}
						if ( note.body.items[i].header ) {
							item.append(
								$('<div></div>', { 'class' : class_prefix + '-item-header' }
							).html( note.body.items[i].header ) );
						}
						if ( note.body.items[i].action ) {
							switch ( note.body.items[i].action.type ) {
								case 'follow' :
									var button = wpFollowButton.create( note.body.items[i].action );
									item.append( button );
									// Attach action stat tracking for follows
									button.click( function(e) {
										if ( $( this ).children('a').hasClass( 'wpcom-follow-rest' ) )
											wpNotesCommon.bumpStat( 'notes-click-action', 'unfollow' );
										else
											wpNotesCommon.bumpStat( 'notes-click-action', 'follow' );
										return true;
									} );
									break;
								default :
									console.error( "Unsupported " + note.type + " action: " + note.body.items[i].action.type );
									break;
							}
						}
						if ( note.body.items[i].html ) {
							item.append(
								$('<div></div>', { 'class' : class_prefix + '-item-body' }
							).html( note.body.items[i].html ) );
						}
						note_body.append( item );
					}
	
					if ( note.body.actions ) {
						var note_actions = new wpNotesCommentModView( { model: note_model } );
						note_actions.render();
						note_body.append( note_actions.el );
					}
	
					if ( note.body.footer ) {
						note_body.append( 
							$( '<p/>' ).addClass( class_prefix + '-footer' ).html( note.body.footer )
						);
					}
					break;
				case 'big-badge' :
					if ( note.body.header ) {
						note_body.append( 
							$( '<div/>' ).addClass( class_prefix + '-header' ).html( note.body.header )
						);
					}
	
					if ( note.body.badge ) {
						note_body.append( $('<div></div>', { 
							'class' : class_prefix + '-badge ' 
						}).append( note.body.badge ) );
					}
	
					if ( note.body.html !== '' ) {
						note_body.append( 
							$( '<div/>' ).addClass( class_prefix + '-footer' ).html( note.body.html )
						);
					}
	
					break;
				default :
					note_body.text( 'Unsupported note body template!' );
					break;
			}

			note_body.find( 'a[notes-data-click]' ).mousedown( function(e) {
				var type = $(this).attr( 'notes-data-click' );
				wpNotesCommon.bumpStat( 'notes-click-body', type );
				return true;
			} );
	
			return note_body;		
		},
	
		getNoteSubjects: function( query_params, success, fail ) {
			query_params.fields = 'id,type,unread,noticon,timestamp,subject';
			query_params.trap = true;
			return this.getNotes( query_params, success, fail );
		},

		getNotes: function( query_params, success, fail ) {
			return this.ajax({
				type:    'GET',
				path:    '/notifications/',
				data:    query_params,
				success: success,
				error:   fail
			});
		},

		getMentions: function( query_params, success ) {
			return this.ajax({
				type:    'GET',
				path:    '/users/suggest',
				data:    query_params,
				success: success
			});
		},
		
		markNotesSeen: function( timestamp ) {
			return this.ajax({
				type:    'POST',
				path:    '/notifications/seen',
				data:    { time: timestamp }
			});
		},
	
		markNotesRead: function( unread_cnts ) {
			var query_args = {};
			var t = this;

			for ( var id in unread_cnts ) {
				if ( unread_cnts[ id ] > 0 ) {
					query_args['counts[' + id + ']'] = unread_cnts[ id ];
				}
			}

			if ( 0 === query_args.length ) {
				return (new $.Deferred()).resolve( 'no unread notes' );
			}
			
			return this.ajax({
				type : 'POST',
				path : '/notifications/read',
				data : query_args,
				success : function( res ) { },
				error : function( res ) { }
			});
		},

		ajax: function( options ) {
			var t = this;
			var request = {
				path: options.path,
				method: options.type
			};

			if ( options.type.toLowerCase() == 'post' )
				request.body = options.data;
			else
				request.query = options.data;

			return $.Deferred( function( dfd ) {
				var makeProxyCall = function() {
					$.wpcom_proxy_request( request, function( response, statusCode ) { 
						if ( 200 == statusCode ) {
							if ( 'function' == typeof options.success ) {
								options.success( response );
							}
							return dfd.resolve( response );
						}
						if ( 'function' == typeof options.error ) {
							options.error( statusCode );
						}
						else {
							console.error( statusCode );
						}
						return dfd.reject( statusCode );
					});
				};

				if ( t.hasUpgradedProxy ) {
					return makeProxyCall();
				}
				return $.wpcom_proxy_request( { metaAPI: { accessAllUsersBlogs: true } } ).done( function() {
					t.hasUpgradedProxy = true;
					makeProxyCall();
				} );	
			});
		},
	
		bumpStat: function( group, names ) {
			if ( 'undefined' != typeof wpNotesIsJetpackClient && wpNotesIsJetpackClient ) {
				var jpStats = [ 'notes-menu-impressions', 'notes-menu-clicks' ];
				if ( _.contains( jpStats, group ) ) {
					names = names.replace( /(,|$)/g, '-jetpack$1' );
				}
			}
			new Image().src = document.location.protocol + '//pixel.wp.com/g.gif?v=wpcom-no-pv&x_' + group + '=' + names + '&baba=' + Math.random();
		},

		getKeycode: function( key_event ) {
			//determine if we can use this key event to trigger the menu
			key_event = key_event || window.event;
			if ( key_event.target )
				element = key_event.target;
			else if ( key_event.srcElement )
				element = key_event.srcElement;
			if( element.nodeType == 3 ) //text node, check the parent
				element = element.parentNode;
			
			if( key_event.ctrlKey === true || key_event.altKey === true || key_event.metaKey === true )
				return false;
		
			var keyCode = ( key_event.keyCode ) ? key_event.keyCode : key_event.which;

			if ( keyCode && ( element.tagName == 'INPUT' || element.tagName == 'TEXTAREA' || element.tagName == 'SELECT' ) )
				return false;

			if ( keyCode && element.contentEditable == "true" )
				return false;

			return keyCode;
		}
	};

	wpNoteModel = Backbone.Model.extend({
		defaults: {
			summary: "",
			unread: true
		},

		_reloadBlocked: false,

		initialize: function() {			
		},

		markRead: function() {
			var unread_cnt = this.get( 'unread' );
			if ( Boolean( parseInt( unread_cnt, 10 ) ) ) {
				var notes = {};
				notes[ this.id ] = unread_cnt;
				wpNotesCommon.markNotesRead( notes );
				wpNotesCommon.bumpStat( 'notes-read-type', this.get( 'type' ) );
			}
		},
		
		loadBody: function() {
			wpNotesCommon.createNoteBody( this );
		},

		reload: function() {
			var t = this;
			var fields = 'id,type,unread,noticon,subject,body,date,timestamp,status';
			if ( 'comment' == t.get( 'type' ) ) {
				fields += ',approval_status,has_replied';
			}
			if (!force && this.isReloadingBlocked()) {
				return $.Deferred().reject('reloading blocked');
			}
			return wpNotesCommon.getNotes( {
				fields: fields,
				trap: true,
				ids: [ t.get('id') ]
			}, function ( res ) {
				var notes = res.notes;
				if ( typeof notes[0] !== 'undefined' ) {
					t.set( notes[ 0 ] );
				}
			}, function() {
				//ignore failure
			} );
		},

		resize: function() {
			this.trigger( 'resize' );
		},

		/* Block the model from being reloaded for a specified number of seconds
		 * needed b/c in the case of Jetpack, it takes a while for the new status to sync back to wpcom
		 * & this prevents it flashing back and forth
		 */
		
		blockReloading: function(seconds) {
			var _this = this;
			this._reloadBlocked = true;
			clearTimeout(this.reloadBlockerTimeout);
			return this.reloadBlockerTimeout = setTimeout(function() {
				return _this._reloadBlocked = false;
			}, seconds * 1000);
		},

		isReloadingBlocked: function() {
			return this._reloadBlocked;
		}
	});

	wpNoteList = Backbone.Collection.extend({
		model:   wpNoteModel,
		lastMarkedSeenTimestamp : false,
		newNotes: false,
		maxNotes : false,
		loading: false,
		hasLoaded: false,
		allBodiesLoaded: false,

		//always sort by timpstamp
		comparator: function( note ) {
			return -note.get( 'timestamp' );
		},

		addNotes: function( notes ) {
			// Filter out any notes that have no subject
			notes = _.filter( notes, function(note) { return typeof( note.subject ) === "object"; } );
			var models = _.map( notes, function(o) { return new wpNoteModel(o); });
			this.add( models );
			this.sort(); //ensure we maintain sorted order
			if ( this.maxNotes ) {
				while( this.length > this.maxNotes ) {
					this.pop();
				}
			}
			this.trigger( 'loadNotes:change' );
		},

		getMostRecentTimestamp: function() {
			if ( !this.length ) {
				return false;
			}

			//ensure we maintain sorted order see the comparator function
			this.sort();
			return parseInt( this.at(0).get( 'timestamp' ), 10 );
		},

		// load notes from the server
		loadNotes: function( query_args ) {
			var t = this;

			t.loading = true;
			t.trigger( 'loadNotes:beginLoading' );
			
			var fields = query_args.fields;
			var number = parseInt( query_args.number, 10 );
			var before = parseInt( query_args.before, 10 );
			var since = parseInt( query_args.since, 10 );
			var timeout = parseInt( query_args.timeout, 10 ) || 7000;
			var type = 'undefined' == typeof query_args.type ? null : query_args.type;
			var unread = 'undefined' == typeof query_args.unread ? null : query_args.unread;

			query_args = {
				timeout: timeout
			};
			
			if ( ! fields ) {
				fields = 'id,type,unread,noticon,subject,body,date,timestamp,status';
			}
			
			if ( isNaN( number ) ) {
				number = 9;
			}
			
			if ( ! isNaN( before ) ) {
				query_args.before = before;
			}
			if ( ! isNaN( since ) ) {
				query_args.since = since;
			}

			if ( unread !== null ) {
				query_args.unread = unread;
			}

			if ( type !== null && type != "unread" && type != "latest" ) {
				query_args.type = type;
			}
			
			query_args.number = number;
			query_args.fields = fields;
			query_args.trap = true;

			return wpNotesCommon.getNotes( query_args ).done( function ( res ) {
				var qt;
				var notes = res.notes;
				var notes_changed = false;
				if ( !t.lastMarkedSeenTimestamp || ( res.last_seen_time > t.lastMarkedSeenTimestamp ) ) { 
					notes_changed = true; 
					t.lastMarkedSeenTimestamp = parseInt( res.last_seen_time, 10 );
				} 

				for( var idx in notes ) {
					var note_model = t.get( notes[idx].id );
					if ( note_model ) {
						// Remove notes that have no subject
						if ( typeof( notes[idx].subject ) != 'object' ) {
							t.remove( notes[idx].id );
							notes_changed = true;
							continue;
						}
						if ( type ) {
							qt = note_model.get( 'queried_types' ) || {};
							qt[ type ] = true;
							notes[idx].queried_types = qt;
						}
						note_model.set( notes[ idx ] );
					}
					else {
						// Skip notes that have no subject
						if ( typeof( notes[idx].subject ) != 'object' ) {
							continue;
						}
						if ( type ) {
							qt = {};
							qt[ type ] = true;
							notes[idx].queried_types = qt;
						}
						note_model = new wpNoteModel( notes[ idx ] );
						t.add( note_model );
					}
					if ( ! note_model.has('body') )
						t.allBodiesLoaded = false;
					notes_changed = true;
				}

				if ( t.maxNotes ) {
					while( t.length > t.maxNotes ) {
						t.pop();
					}
				}

				if ( notes_changed ) {
					t.sort(); //ensure we maintain sorted order
					t.trigger( 'loadNotes:change' );
				}
				t.loading = false;
				t.hasLoaded = true;
				t.trigger( 'loadNotes:endLoading' );
			}).fail( function( e ) {
				t.loading = false;
				t.trigger( 'loadNotes:failed' );
			});
		},

		loadNoteBodies: function( filter ) {
			var t = this;
			if ( t.allBodiesLoaded ) {
				return (new $.Deferred()).resolve();
			}

			// Only load the note bodies that pass the caller supplied filter.
			// If no filter is supplied, all notes in the collection are fetched.
			var ids = t.getNoteIds( filter );

			if ( 0 == ids.length ) {
				return (new $.Deferred()).reject();
			}

			var doneFunc = function( res ) {
				var notes = res.notes;
				for( var idx in notes ) {
					// Skip notes that have no subject
					if ( typeof( notes[idx].subject ) != 'object' ) {
						continue;
					}
					var note_model = t.get( notes[idx].id );
					if ( note_model ) {
						note_model.set( notes[idx] );
					} else {
						note_model = new wpNoteModel( notes[ idx ] );
						t.add( note_model );
					}
				}
			};

			var failFunc = function ( e ) {
				if ( typeof console != 'undefined' && typeof console.error == 'function' )
					console.error( 'body loading error!' );
			}

			//get each note body as a separate request so we can get them in parallel
			//to speed up loading when there are many new notes
			var deferreds = [];

			//split into 3 requests (3 most recent notes, and then any others into one request)
			var count = 3
			for ( var i=0; i<count; i++ ) {
				if ( typeof ids[i] == 'undefined' )
					break;

				var query_params = {};
				// loads subject & meta data also so all are consistent
				query_params.fields = 'id,type,unread,noticon,timestamp,subject,body,meta,status';
				query_params.trap = true;
				query_params['ids[' + i + ']'] = ids[i];

				deferreds.push( wpNotesCommon.getNotes( query_params )
					.done( doneFunc )
					.fail( failFunc )
				)	;
			}

			if ( ids.length > count ) {
				var query_params = {};
				// loads subject & meta data also so all are consistent
				query_params.fields = 'id,type,unread,noticon,timestamp,subject,body,meta,status';
				query_params.trap = true;

				for ( var i=count; i<ids.length; i++ )
					query_params['ids[' + i + ']'] = ids[i];

				deferreds.push( wpNotesCommon.getNotes( query_params )
					.done( doneFunc )
					.fail( failFunc )
				)	;
			}

			var all_xhr = $.when.apply(null, deferreds);
			all_xhr.done( function() {
				if ( typeof filter != 'function' ) {
					t.allBodiesLoaded = true;
				}
			} );

			return all_xhr;
		},

		markNotesSeen: function() {
			var t = this,
				mostRecentTs = t.getMostRecentTimestamp();

			if ( mostRecentTs > this.lastMarkedSeenTimestamp ) {
				wpNotesCommon.markNotesSeen( mostRecentTs ).done( function() {
					t.lastMarkedSeenTimestamp = false;
				});
			}
		},

		unreadCount: function() {
			return this.reduce( function( num, note ) { return num + ( note.get('unread') ? 1 : 0 ); }, 0 );
		},

		numberNewNotes: function() {
			var t = this;
			if ( ! t.lastMarkedSeenTimestamp )
				return 0;
			return t.getNewNotes().length;
		},

		// return notes in this collection which were generated after we last marked it as seen.
		getNewNotes: function() {
			var t = this;
			return t.filter( function( note ) { 
				return ( note.get('timestamp') > t.lastMarkedSeenTimestamp ); 
			} );
		},

		// get all unread notes in the collection
		getUnreadNotes: function() {
			return this.filter( function( note ){ return Boolean( parseInt( note.get( "unread" ), 10 ) ); } );
		},
		
		// get all notes in the collection of specified type
		getNotesOfType: function( typeName ) {
			var t = this;
			switch( typeName ){
				case 'unread':
					return t.getUnreadNotes();
				case 'latest':
					return t.filter( function( note ) {
						var qt = note.get( 'queried_types' );
						return 'undefined' != typeof qt && 'undefined' != typeof qt.latest && qt.latest;
					});
				default:
					return t.filter( function( note ) {
						var note_type = note.get( "type" );
						if ( "undefined" == typeof wpNotesCommon.noteTypes[ typeName ] ) {
							return false;
						}
						else if ( "string" == typeof wpNotesCommon.noteTypes[ typeName ] ) {
							return typeName == note_type;
						}
						var len = wpNotesCommon.noteTypes[ typeName ].length;
						for ( var i=0; i<len; i++ ){
							if ( wpNotesCommon.noteTypes[ typeName ][i] == note_type ) {
								return true;
							}
						}
						return false;
					} );
			}
		},

		getNoteIds: function(filter) {
			if ( typeof filter != 'function' )
				filter = function(){ return true; };
			return _.pluck( this.filter(filter), 'id' );
		}
	});

	/**
	 * BEWARE: HERE BE DRAGONS
	 *
	 * wpNotesCommentModView is a copy/pasta from NoteCommentModView in widgets.wp.com/notes/notes-widget.test.js
	 *
	 * DO NOT edit this code - instead, fix whatever you need to fix in the-pit-of-despair/notes-widget/NoteCommentModView.coffee,
	 * regenerate notes-widget.test.js, copy/pasta, and continue the cycle of abuse.
	 **/

	wpNotesCommentModView = Backbone.View.extend({
      mode: 'buttons',
      actionsByName: null,
      possibleActions: ['approve-comment', 'replyto-comment', 'like-comment', 'spam-comment', 'trash-comment', 'unapprove-comment', 'unlike-comment', 'unspam-comment', 'untrash-comment'],
      possibleStatuses: ['approved', 'spam', 'trash', 'unapproved'],
      events: {
        'click .wpn-replyto-comment-button-open a': 'openReply',
        'click .wpn-comment-reply-button-close': 'closeReply',
        'click .wpn-comment-reply-button-send': 'sendReply',
        'click .wpn-like-comment-button a': 'clickLikeComment',
        'click .wpn-unlike-comment-button a': 'clickLikeComment',
        'click .wpn-approve-comment-button a': 'clickModComment',
        'click .wpn-unapprove-comment-button a': 'clickModComment',
        'click .wpn-spam-comment-button a': 'clickModComment',
        'click .wpn-unspam-comment-button a': 'clickModComment',
        'click .wpn-trash-comment-button a': 'clickModComment',
        'click .wpn-untrash-comment-button a': 'clickModComment'
      },
      templateActions: '\
			{{#reply}}\
			<span class="{{reply.class}}">\
				<a href="#" title="{{reply.title}}" data-action-type="{{reply.actionType}}">{{reply.text}}</a>\
			</span>\
			{{/reply}}\
			{{#like}}\
			<span class="{{like.class}}">\
				<a href="#" title="{{like.title}}" data-action-type="{{like.actionType}}">{{like.text}}</a>\
			</span>\
			{{/like}}\
			<span class="wpn-more">\
				<a href="#">More</a>\
				<div class="wpn-more-container">\
				{{#spam}}\
				<span class="{{spam.class}}">\
					<a href="#" title="{{spam.title}}" data-action-type="{{spam.actionType}}">{{spam.text}}</a>\
				</span>\
				{{/spam}}\
				{{#trash}}\
				<span class="{{trash.class}}">\
					<a href="#" title="{{trash.title}}" data-action-type="{{trash.actionType}}">{{trash.text}}</a>\
				</span>\
				{{/trash}}\
				</div>\
			</span>\
			{{#approve}}\
			<span class="{{approve.class}}">\
				<a href="#" title="{{approve.title}}" data-action-type="{{approve.actionType}}">{{approve.text}}</a>\
			</span>\
			{{/approve}}\
			<span class="wpn-comment-mod-waiting"></span>',
      templateReply: '\
			<div class="wpn-note-comment-reply">\
				<h5>{{reply_header_text}}</h5>\
				<textarea class="wpn-note-comment-reply-text" rows="5" cols="45" name="wpn-note-comment-reply-text"></textarea>\
				<p class="wpn-comment-submit">\
					<span class="wpn-comment-submit-waiting" style="display: none;"></span>\
				<span class="wpn-comment-submit-error" style="display:none;">Error!</span>\
				<a href="#" class="wpn-comment-reply-button-send alignright">{{submit_button_text}}</a>\
				<a href="#" class="wpn-comment-reply-button-close alignleft">_</a>\
				</p>\
			</div>',
      initialize: function() {
        var _this = this;
        this.setElement($('<div class="wpn-note-comment-actions" />'));
        this.listenTo(this.model, 'change:status', function(model, status) {
          var approvalStatus, prevStatus;
          approvalStatus = status.approval_status;
          prevStatus = model.previous('status') || {};
          if (prevStatus.approval_status && prevStatus.approval_status === approvalStatus) {
            return;
          }
          if (approvalStatus.match(/^trash|spam$/)) {
            return _this.setUndoStatus(prevStatus.approval_status);
          }
        });
        this.listenTo(this.model, 'change', this.render);
        $(document).on('click', '.wpn-more > a', function(ev) {
          var $el;
          ev.preventDefault();
          ev.stopPropagation();
          if (ev.doneMoreToggle) {
            return;
          }
          ev.doneMoreToggle = true;
          $el = $(ev.currentTarget);
          $el.parent().find('.wpn-more-container').toggle();
          return false;
        });
        this;
        $(document).on('click', '.wpn-note-body', function(ev) {
          var $el, $note;
          $el = $(ev.target);
          if (($el.parents('.wpn-more').length)) {
            return;
          }
          $note = $el.closest('.wpn-note-body');
          if ($note.find('.wpn-more-container').is(':visible')) {
            $note.find('.wpn-more-container').toggle();
          }
        });
        this;
        $('.wpn-more-container:not(:has(*))').parents('.wpn-more').hide();
        $(document).on('keydown', function(keyEvent) {
          var keyCode, status, validActions;
          if (_this.$el.is(':hidden')) {
            return;
          }
          if (_this.mode !== 'buttons') {
            return;
          }
          keyCode = wpNotesCommon.getKeycode(keyEvent);
          if (!keyCode) {
            return;
          }
          validActions = _this.getValidActions();
          status = _this.model.get('status') || {};
          if (keyCode === 82) {
            if (_.contains(validActions, 'replyto-comment')) {
              _this.openReply(keyEvent);
            }
          }
          if (keyCode === 65) {
            if (_.contains(validActions, 'approve-comment')) {
              _this.modComment('approve-comment');
            } else if (_.contains(validActions, 'unapprove-comment')) {
              _this.modComment('unapprove-comment');
            }
          }
          if (keyCode === 76) {
            if (_.contains(validActions, 'like-comment')) {
              _this.likeComment('like-comment');
            } else if (_.contains(validActions, 'unlike-comment')) {
              _this.likeComment('unlike-comment');
            }
          }
          if (keyCode === 83) {
            if (_.contains(validActions, 'spam-comment')) {
              _this.modComment('spam-comment');
            } else if (_.contains(validActions, 'unspam-comment')) {
              _this.modComment('unspam-comment');
            }
          }
          if (keyCode === 84) {
            if (_.contains(validActions, 'trash-comment')) {
              _this.modComment('trash-comment');
            } else if (_.contains(validActions, 'untrash-comment')) {
              _this.modComment('untrash-comment');
            }
          }
          return false;
        });
        return this;
      },
      render: function() {
        var body;
        if (this.model._changing && 'reply' === this.mode) {
          return this;
        }
        this.$el.empty();
        body = this.model.get('body');
        if (!body.actions) {
          return this;
        }
        this.updateActionsMap();
        if (this.mode === 'buttons') {
          this.$el.html(this.createActionsHTML());
        } else {
          this.$el.html(this.createReplyBoxHTML());
          this.$('textarea').focus();
        }
        this.delegateEvents();
        return this;
      },
      setUndoStatus: function(status) {
        return this._undoStatus = status;
      },
      getUndoStatus: function() {
        var status;
        if (this._undoStatus) {
          return this._undoStatus;
        }
        status = this.model.get('status');
        if ((status != null) && status.undo_status === '1') {
          return 'approved';
        }
        return 'unapproved';
      },
      getValidActions: function() {
        var actions, status;
        status = this.model.get('status') || {};
        switch (status.approval_status) {
          case 'pending':
          case 'unapproved':
            return ['replyto-comment', 'approve-comment', 'spam-comment', 'trash-comment'];
          case 'approved':
            actions = ['replyto-comment', 'unapprove-comment', 'spam-comment', 'trash-comment'];
            if (status.i_liked) {
              actions.splice(1, 0, 'unlike-comment');
            } else {
              actions.splice(1, 0, 'like-comment');
            }
            return actions;
          case 'trash':
            return ['untrash-comment'];
          case 'spam':
            return ['unspam-comment'];
          default:
            return [];
        }
      },
      getResultantStatus: function(actionType) {
        switch (actionType) {
          case 'approve-comment':
            return 'approved';
          case 'unapprove-comment':
            return 'unapproved';
          case 'spam-comment':
            return 'spam';
          case 'trash-comment':
            return 'trash';
          case 'unspam-comment':
          case 'untrash-comment':
            return this.getUndoStatus();
          default:
            return void 0;
        }
      },
      getStatusParamFromActionType: function(actionType) {
        if (!actionType) {
          return void 0;
        }
        switch (actionType) {
          case 'approve-comment':
            return 'approved';
          case 'unapprove-comment':
            return 'unapproved';
          default:
            return actionType.split('-')[0];
        }
      },
      getComplementaryActionType: function(actionType) {
        switch (actionType) {
          case 'approve-comment':
            return 'unapprove-comment';
          case 'unapprove-comment':
            return 'approve-comment';
          case 'like-comment':
            return 'unlike-comment';
          case 'unlike-comment':
            return 'like-comment';
          case 'spam-comment':
            return 'unspam-comment';
          case 'trash-comment':
            return 'untrash-comment';
          case 'unspam-comment':
            return 'spam-comment';
          case 'untrash-comment':
            return 'trash-comment';
          default:
            return void 0;
        }
      },
      getTranslation: function(string) {
        if (typeof notes_i18n === 'undefined' || !notes_i18n.translate) {
          return string;
        }
        return notes_i18n.translate(string).fetch();
      },
      getTranslationsForActionType: function(actionType) {
        var gt;
        gt = this.getTranslation;
        if (!this._translationsByActionType) {
          this._translationsByActionType = {
            'approve-comment': {
              buttonText: gt('Approve'),
              titleText: gt('Approve this comment.')
            },
            'like-comment': {
              buttonText: gt('Like'),
              titleText: gt('Like this comment.')
            },
            'replyto-comment': {
              buttonText: gt('Reply'),
              titleText: gt('Reply to this comment.')
            },
            'spam-comment': {
              buttonText: gt('Spam'),
              titleText: gt('Mark this comment as spam.')
            },
            'trash-comment': {
              buttonText: gt('Trash'),
              titleText: gt('Move this comment to the trash.')
            },
            'unapprove-comment': {
              buttonText: gt('Unapprove'),
              titleText: gt('Unapprove this comment.')
            },
            'unlike-comment': {
              buttonText: gt('Liked'),
              titleText: gt('Unlike this comment.')
            },
            'unspam-comment': {
              buttonText: gt('Unspam'),
              titleText: gt('Unmark this comment as spam.')
            },
            'untrash-comment': {
              buttonText: gt('Untrash'),
              titleText: gt('Restore this comment from the trash.')
            }
          };
        }
        return this._translationsByActionType[actionType];
      },
      updateActionsMap: function() {
        var action, actionType, actions, body, _fn, _i, _j, _len, _len1, _ref, _results,
          _this = this;
        body = this.model.get('body');
        actions = body.actions || [];
        this.actionsByName = this.actionsByName || {};
        _fn = function(action) {
          if (!action.type || !action.params) {
            return;
          }
          return _this.actionsByName[action.type] = $.extend({}, action.params, {
            actionType: action.type
          });
        };
        for (_i = 0, _len = actions.length; _i < _len; _i++) {
          action = actions[_i];
          _fn(action);
        }
        _ref = this.possibleActions;
        _results = [];
        for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
          actionType = _ref[_j];
          _results.push((function(actionType) {
            var actionObj, complementObj, status, statusParam, submitText, translations;
            actionObj = _this.actionsByName[actionType];
            statusParam = _this.getStatusParamFromActionType(actionType);
            translations = _this.getTranslationsForActionType(actionType);
            if (!actionObj) {
              complementObj = _this.actionsByName[_this.getComplementaryActionType(actionType)];
              if (complementObj) {
                _this.actionsByName[actionType] = $.extend({}, complementObj, {
                  actionType: actionType,
                  ajax_arg: statusParam,
                  rest_body: {
                    status: statusParam
                  },
                  text: translations.buttonText,
                  title_text: translations.titleText
                });
              }
            }
            if (actionType === 'replyto-comment') {
              status = _this.model.get('status' || {});
              submitText = status.approval_status === 'approved' ? _this.getTranslation('Reply') : _this.getTranslation('Approve and Reply');
              return $.extend(_this.actionsByName['replyto-comment'], {
                button_text: translations.buttonText,
                submit_button_text: submitText,
                text: translations.buttonText,
                title_text: translations.titleText
              });
            }
          })(actionType));
        }
        return _results;
      },
      createActionsHTML: function() {
        var actionType, status, templateData, _fn, _i, _len, _ref,
          _this = this;
        status = this.model.get('status').approval_status;
        templateData = {};
        _ref = this.getValidActions();
        _fn = function(actionType) {
          var action, button_data;
          action = _this.actionsByName[actionType];
          if (!action) {
            return;
          }
          button_data = {
            "class": 'wpn-' + actionType + '-button',
            "actionType": actionType,
            "text": action.text || action.button_text
          };
          switch (actionType) {
            case 'replyto-comment':
              return templateData.reply = $.extend({}, button_data, {
                "class": 'wpn-replyto-comment-button-open',
                "title": (action.title_text || action.button_title_text) + ' [r]'
              });
            case 'like-comment':
            case 'unlike-comment':
              return templateData.like = $.extend({}, button_data, {
                "title": (action.title_text || action.button_title_text) + ' [l]'
              });
            case 'approve-comment':
            case 'unapprove-comment':
              if (_.contains(['spam', 'trash'], status)) {
                break;
              }
              return templateData.approve = $.extend({}, button_data, {
                "title": (action.title_text || action.button_title_text) + ' [a]'
              });
            case 'spam-comment':
            case 'unspam-comment':
              if (status === 'trash') {
                break;
              }
              return templateData.spam = $.extend({}, button_data, {
                "title": (action.title_text || action.button_title_text) + ' [s]'
              });
            case 'trash-comment':
            case 'untrash-comment':
              if (status === 'spam') {
                break;
              }
              return templateData.trash = $.extend({}, button_data, {
                "title": (action.title_text || action.button_title_text) + ' [t]'
              });
          }
        };
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          actionType = _ref[_i];
          _fn(actionType);
        }
        return Mustache.render(this.templateActions, templateData);
      },
      createReplyBoxHTML: function() {
        var action, blog_id, comment_id;
        action = this.actionsByName['replyto-comment'];
        if (!action) {
          return;
        }
        blog_id = action.site_id || 0;
        comment_id = this.model.id || 0;
        return Mustache.render(this.templateReply, {
          reply_header_text: action.reply_header_text,
          submit_button_text: action.submit_button_text
        });
      },
      closeReply: function(ev) {
        if (ev) {
          ev.preventDefault();
        }
        this.mode = 'buttons';
        this.model.currentReplyText = this.$el.children('.wpn-note-comment-reply').children('.wpn-note-comment-reply-text').val();
        this.render();
        return this.model.resize();
      },
      openReply: function(ev) {
        var action, gettingMentions, query_args,
          _this = this;
        if (ev) {
          ev.preventDefault();
        }
        this.mode = 'reply';
        this.render();
        this.$el.children('.wpn-note-comment-reply').children('.wpn-note-comment-reply-text').val(this.model.currentReplyText);
        $('.selected .wpn-note-body p.submitconfirm').remove();
        this.model.resize();
        if (!window.mentionDataCache) {
          window.mentionDataCache = [];
        }
        action = this.actionsByName['replyto-comment'];
        if (action.site_id != null) {
          if (window.mentionDataCache[action.site_id] != null) {
            return this.$el.children('.wpn-note-comment-reply').children('.wpn-note-comment-reply-text').mentions(window.mentionDataCache[action.site_id]);
          } else {
            window.mentionDataCache[action.site_id] = [];
            query_args = {
              site_id: action.site_id,
              client: 'notes-widget'
            };
            gettingMentions = wpNotesCommon.getMentions(query_args);
            return gettingMentions.done(function(res) {
              window.mentionDataCache[action.site_id] = res.suggestions;
              return _this.$el.children('.wpn-note-comment-reply').children('.wpn-note-comment-reply-text').mentions(window.mentionDataCache[action.site_id]);
            });
          }
        }
      },
      sendReply: function(ev) {
        var $submitWrap, action, blog_id, comment_id, comment_reply_el, content, doSend,
          _this = this;
        if (ev) {
          ev.preventDefault();
        }
        action = this.actionsByName['replyto-comment'];
        if (!action) {
          return $.Deferred().reject('Invalid replyto-comment action');
        }
        comment_reply_el = this.$el.children('.wpn-note-comment-reply');
        this.model.currentReplyText = comment_reply_el.children('.wpn-note-comment-reply-text').val();
        blog_id = action.site_id || 0;
        comment_id = action.comment_id || 0;
        content = this.model.currentReplyText || 0;
        if (!(blog_id && comment_id && content)) {
          return $.Deferred().reject('Invalid sendReply params');
        }
        $submitWrap = comment_reply_el.children('.wpn-comment-submit');
        $submitWrap.children('.wpn-comment-submit-error').hide();
        $submitWrap.children('.wpn-comment-reply-button-send').hide();
        $submitWrap.children('.wpn-comment-submit-waiting').gifspin('small').show();
        wpNotesCommon.bumpStat('notes-click-action', 'replyto-comment');
        doSend = function() {
          return wpNotesCommon.ajax({
            type: 'POST',
            path: '/sites/' + blog_id + '/comments/' + comment_id + '/replies/new',
            data: {
              content: content
            },
            success: function(r) {
              if (typeof r === 'string') {
                _this.errorReply(r);
                return false;
              }
              _this.closeReply();
              _this.model.currentReplyText = '';
              return _this.model.reload(true).done(function() {
                var tries;
                if (!_this.model.get('status').i_replied) {
                  tries = 0;
                  return _this.replyCommentInterval = setInterval(function() {
                    return _this.model.reload(true).done(function() {
                      if (_this.model.get('status').i_replied || tries++ >= 10) {
                        return clearInterval(_this.replyCommentInterval);
                      }
                    });
                  }, 3000);
                }
              });
            },
            error: function(r) {
              return _this.errorReply(r);
            }
          }).done(function() {
            var commentPermalink, submitConfirm;
            commentPermalink = $('.selected .wpn-comment-date a').attr('href');
            submitConfirm = '<p class="submitconfirm"><strong>';
            submitConfirm += notes_i18n.translate('Reply successful, <a %s>view thread</a>').fetch('target="_blank" href="' + commentPermalink + '"');
            submitConfirm += '</strong></p>';
            return $('.selected .wpn-note-body').append(submitConfirm);
          });
        };
        if (this.model.get('status').approval_status !== 'approved') {
          return this.modComment('approve-comment').done(doSend);
        } else {
          return doSend();
        }
      },
      errorReply: function(r) {
        var comment_reply_el, er, o;
        er = r;
        if (typeof r === 'object') {
          if (r.responseText) {
            o = $.parseJSON(r.responseText);
            er = o.error + ': ' + o.message;
          } else if (r.statusText) {
            er = r.statusText;
          } else {
            er = 'Unknown Error';
          }
        }
        comment_reply_el = this.$el.children('.wpn-note-comment-reply');
        comment_reply_el.children('.wpn-comment-submit').children('.wpn-comment-submit-waiting').hide();
        if (er) {
          return comment_reply_el.children('.wpn-comment-submit').children('.wpn-comment-submit-error').text(er).show();
        }
      },
      clickModComment: function(ev) {
        if (ev) {
          ev.preventDefault();
        } else {
          return $.Deferred.reject('invalid click event');
        }
        return this.modComment($(ev.currentTarget).data('action-type'));
      },
      modComment: function(actionType) {
        var moderating,
          _this = this;
        this.$('.wpn-comment-mod-waiting').show().gifspin('small');
        moderating = $.Deferred().always(function() {
          return _this.$('.wpn-comment-mod-waiting').empty().hide();
        }).fail(function(error, code) {
          if ((typeof console !== "undefined" && console !== null) && typeof console.error === 'function') {
            console.error('Comment moderation error');
            if (error) {
              console.error(error);
            }
          }
          if (!code || code !== 'too_soon') {
            return _this.model.reload();
          }
        });
        if (this.modPromise && typeof this.modPromise.state === 'function' && this.modPromise.state() === 'pending') {
          moderating.always(function() {
            return _this.$('.wpn-comment-mod-waiting').show().gifspin('small');
          });
          return moderating.reject('Moderation already in progress', 'too_soon');
        }
        this.modPromise = moderating.promise();
        if (!actionType || !actionType.length || !_.contains(this.getValidActions(), actionType)) {
          return moderating.reject('Invalid actionType');
        }
        $.Deferred(function() {
          var action, anticipatedNewStatus;
          wpNotesCommon.bumpStat('notes-click-action', actionType);
          action = _this.actionsByName[actionType];
          if (!action) {
            return moderating.reject('Undefined action params for type: ' + actionType);
          }
          anticipatedNewStatus = _this.getResultantStatus(actionType);
          if (anticipatedNewStatus) {
            _this.model.set('status', $.extend({}, _this.model.get('status'), {
              approval_status: anticipatedNewStatus
            }));
            _this.$('.wpn-comment-mod-waiting').show().gifspin('small');
          }
          return wpNotesCommon.ajax({
            type: 'POST',
            path: action.rest_path,
            data: action.rest_body
          }).done(function(r) {
            var rStatus;
            rStatus = (r != null ? r.status : void 0) ? r.status : 'undefined';
            if (_.contains(_this.possibleStatuses, rStatus)) {
              _this.model.set('status', $.extend({}, _this.model.get('status'), {
                approval_status: rStatus
              }));
              _this.model.blockReloading(15);
              return moderating.resolve();
            } else {
              return moderating.reject('Invalid status: "' + rStatus + '" received from moderation POST');
            }
          }).fail(function(error) {
            return moderating.reject(error);
          });
        });
        return this.modPromise;
      },
      clickLikeComment: function(ev) {
        var $button, actionType;
        ev.preventDefault();
        $button = $(ev.currentTarget);
        actionType = $button.data('action-type');
        return this.likeComment(actionType);
      },
      likeComment: function(actionType) {
        var action, i_liked, rest_path,
          _this = this;
        action = this.actionsByName[actionType];
        if ('like-comment' === actionType) {
          i_liked = true;
          rest_path = action.rest_path + 'new/';
        } else {
          i_liked = false;
          rest_path = action.rest_path + 'mine/delete/';
        }
        this.model.set('status', $.extend({}, this.model.get('status'), {
          i_liked: i_liked
        }));
        this.$('.wpn-comment-mod-waiting').show().gifspin('small');
        return wpNotesCommon.ajax({
          type: 'POST',
          path: rest_path
        }).done(function(r) {
          return _this.$('.wpn-comment-mod-waiting').empty().hide();
        });
      }
    });
})(jQuery);

(function() {
  (function(window, $) {
    /*
    	 * Show an animated gif spinner
    	 * Replaces the contents of the selected jQuery elements with the image
    */

    return $.fn.gifspin = function(size) {
      var $el, $spinner, len;
      $el = $(this);
      if (_.isFinite(size) && size > 0) {
        len = Math.min(~~size, 128);
      } else {
        switch (size) {
          case 'tiny':
            len = 8;
            break;
          case 'small':
            len = 16;
            break;
          case 'medium':
            len = 32;
            break;
          case 'large':
            len = 64;
            break;
          default:
            len = 128;
        }
      }
      $spinner = $('<img class="gifspinner" src="//s0.wp.com/wp-content/mu-plugins/notes/images/loading.gif" />');
      $spinner.css({
        height: len,
        width: len
      });
      $el.html($spinner);
      return $el;
    };
  })(typeof exports !== "undefined" && exports !== null ? exports : this, window.jQuery);

}).call(this);
;
if ( 'undefined' == typeof wpcom ) {
	wpcom = {};
}
if ( 'undefined' == typeof wpcom.events ) {
	wpcom.events = _.extend( {}, Backbone.Events );
}
(function($) {
	// Auto-generated: do not edit!
	var __autoCacheBusterNotesPanel = 'desktop/2.4.0-13279-g67a63e0';
	// End auto-generated area:

	var wpNotesArgs = window.wpNotesArgs || {},
		cacheBuster = wpNotesArgs.cacheBuster || __autoCacheBusterNotesPanel,
		iframeUrl = wpNotesArgs.iframeUrl || 'https://widgets.wp.com/notes/',
		iframeAppend = wpNotesArgs.iframeAppend || '',
		iframeScroll = wpNotesArgs.iframeScroll || "no",
		wideScreen = wpNotesArgs.wide || false,
		hasToggledPanel = false,
		iframePanelId, iframeFrameId;

	var wpntView = Backbone.View.extend({
		el: '#wp-admin-bar-notes',
		hasUnseen: null,
		initialLoad: true,
		count: null,
		iframe: null,
		iframeWindow: null,
		messageQ: [],
		iframeSpinnerShown: false,
		isJetpack: false,
		linkAccountsURL: false,
		currentMasterbarActive: false,

		initialize: function() {
			var t = this;

			// graceful fallback for IE <= 7
			var matches = navigator.appVersion.match( /MSIE (\d+)/ );
			if ( matches && parseInt( matches[1], 10 ) < 8 ) {
				var $panel = t.$( '#'+iframePanelId );
				var $menuItem = t.$( '.ab-empty-item' );
				if ( !$panel.length || !$menuItem.length ) {
					return;
				}
				var offset = t.$el.offset();

				t.$( '.ab-item' ).removeClass( 'ab-item' );
				t.$( '#wpnt-notes-unread-count' ).html( '?' );

				// @todo localize
				$panel.html( ' \
					<div class="wpnt-notes-panel-header"><p>Notifications are not supported in this browser!</p> </div> \
					<img src="http://i2.wp.com/wordpress.com/wp-content/mu-plugins/notes/images/jetpack-notes-2x.png" /> \
					<p class="wpnt-ie-note"> \
					Please <a href="http://browsehappy.com" target="_blank">upgrade your browser</a> to keep using notifications. \
					</p>'
				).addClass( 'browse-happy' );

				t.$el.on( 'mouseenter', function(e) {
					clearTimeout( t.fadeOutTimeout );
					if ( $panel.is( ':visible:animated' ) ) {
						$panel.stop().css( 'opacity', '' );
					}
					$menuItem.css({ 'background-color': '#eee' });
					$panel.show();
				});

				t.$el.on( 'mouseleave', function() {
					t.fadeOutTimeout = setTimeout( function() {
						clearTimeout( t.fadeOutTimeout );
						if ( $panel.is( ':animated' ) ) {
							return;
						}
						$panel.fadeOut( 250, function() {
							$menuItem.css({ 'background-color': 'transparent' });
						});
					}, 350 );
				});

				return;
			}

			// don't break notifications if jquery.spin isn't available
			if ( 'function' != typeof $.fn.spin ) {
				$.fn.spin = function(x){};
			}
			this.isRtl = $('#wpadminbar').hasClass('rtl');
			this.count = $('#wpnt-notes-unread-count');
			this.panel = $( '#'+iframePanelId );
			this.hasUnseen = this.count.hasClass( 'wpn-unread' );
			if ( 'undefined' != typeof wpNotesIsJetpackClient && wpNotesIsJetpackClient )
				t.isJetpack = true;
			if ( t.isJetpack && 'undefined' != typeof wpNotesLinkAccountsURL )
				t.linkAccountsURL = wpNotesLinkAccountsURL;

			this.$el.children('.ab-item').on( 'click touchstart', function(e){
				e.preventDefault();
				t.togglePanel();

				return false;
			} );

			this.preventDefault = function(e) {
				if (e) e.preventDefault();
				return false;
			};

			if ( iframeAppend == '2' ) {
				// Disable scrolling on main page when cursor in notifications
				this.panel.mouseenter( function() {
					document.body.addEventListener( 'mousewheel', t.preventDefault );
				});
				this.panel.mouseleave( function() {
					document.body.removeEventListener( 'mousewheel', t.preventDefault );
				});

				if ( typeof document.hidden !== 'undefined' ) {
					document.addEventListener( 'visibilitychange', function() {
						t.postMessage( { action: "toggleVisibility", hidden: document.hidden } );
					} );
				}
			}

			// Click outside the panel to close the panel.
			$(document).bind( "mousedown focus", function(e) {
				var $clicked;

				// Don't fire if the panel isn't showing
				if ( ! t.showingPanel )
					return true;

				$clicked = $(e.target);

				/**
				 * Don't fire if there's no real click target
				 * Prevents Firefox issue described here: http://datap2.wordpress.com/2013/08/15/running-in-to-some-strange/
				 */
				if ( $clicked.is( document ) )
					return true;

				// Don't fire on clicks in the panel.
				if ( $clicked.closest( '#wp-admin-bar-notes' ).length )
					return true;

				t.hidePanel();
				return false;
			});

			$(document).on( 'keydown.notes', function (e) {
				var keyCode = wpNotesCommon.getKeycode( e );
				if ( !keyCode )
					return;

				if ( ( keyCode == 27 ) ) //ESC close only
					t.hidePanel();
				if ( ( keyCode == 78 ) ) //n open/close
					t.togglePanel();

				//ignore other commands if the iframe hasn't been loaded yet
				if ( this.iframeWindow === null )
					return;

				/**
				 * @TODO these appear to be unnecessary as the iframe doesn't
				 *       listen for these actions and doesn't appear to need
				 *       to. it handles its own keyboard trapping
				 */
				if ( t.showingPanel && ( ( keyCode == 74 ) || ( keyCode == 40  ) ) ) { //j and down arrow
					t.postMessage( { action:"selectNextNote" } );
					return false; //prevent default
				}
				if ( t.showingPanel && ( ( keyCode == 75 ) || ( keyCode == 38  ) ) ) { //k and up arrow
					t.postMessage( { action:"selectPrevNote" } );
					return false; //prevent default
				}

				if ( t.showingPanel && ( ( keyCode == 82 ) || ( keyCode == 65  ) ||
					( keyCode == 83  ) || ( keyCode == 84  ) ) ) { //mod keys (r,a,s,t) to pass to iframe
					t.postMessage( { action:"keyEvent", keyCode: keyCode } );
					return false; //prevent default
				}
				/**
				 * End TODO section
				 */
			});

			wpcom.events.on( 'notes:togglePanel', function() {
					t.togglePanel();
				} );

			if ( t.isJetpack )
				t.loadIframe();
			else {
				setTimeout(function() {
					t.loadIframe();
				}, 3000);
			}

			if ( t.count.hasClass( 'wpn-unread' ) )
				wpNotesCommon.bumpStat( 'notes-menu-impressions', 'non-zero' );
			else
				wpNotesCommon.bumpStat( 'notes-menu-impressions', 'zero' );

			// listen for postMessage events from the iframe
			$(window).on( 'message', function( event ) {
				if ( !event.data && event.originalEvent.data ) {
					event = event.originalEvent;
				}
				if ( event.origin != 'https://widgets.wp.com' ) {
					return;
				}
				try {
					var data = ( 'string' == typeof event.data ) ? JSON.parse( event.data ) : event.data;

					if ( data.type != 'notesIframeMessage' ) {
						return;
					}
					t.handleEvent( data );
				} catch(e){}
			});
		},

		// Done this way, "this" refers to the wpntView object instead of the window.
		handleEvent: function( event ) {

			var inNewdash = ( 'undefined' !== typeof wpcomNewdash && 'undefined' !== typeof wpcomNewdash.router && 'undefined' !== wpcomNewdash.router.setRoute );

			if ( !event || !event.action ) {
				return;
			}
			switch ( event.action ) {
				case "togglePanel":
					this.togglePanel();
					break;
				case "render":
					this.render( event.num_new, event.latest_type );
					break;
				case "renderAllSeen":
					this.renderAllSeen();
					break;
				case "iFrameReady":
					this.iFrameReady(event);
					break;
				/**
				 * @TODO I don't think this action is fired anymore
				 */
				case "goToNotesPage":
					if ( inNewdash ) {
						wpcomNewdash.router.setRoute( '/notifications' );
					} else {
						window.location.href = '//wordpress.com/me/notifications/';
					}
					break;
				/**
				 * End TODO section
				 */
				case "widescreen":
					var iframe = $( '#'+iframeFrameId );
					if ( event.widescreen && ! iframe.hasClass( 'widescreen' ) ) {
						iframe.addClass( 'widescreen' );
					} else if ( ! event.widescreen && iframe.hasClass( 'widescreen' ) ) {
						iframe.removeClass( 'widescreen' );
					}
					break;
			}
		},

		render: function( num_new, latest_type ) {
			var t = this, flash = false;

			if ( ( false === this.hasUnseen ) && ( 0 === num_new ) )
				return;

			//assume the icon is correct on initial load, prevents fading in and out for no reason
			if ( this.initialLoad && this.hasUnseen && ( 0 !== num_new ) ) {
				this.initialLoad = false;
				return;
			}

			if ( ! this.hasUnseen && ( 0 !== num_new ) ) {
				wpNotesCommon.bumpStat( 'notes-menu-impressions', 'non-zero-async' );
			}

			var latest_icon_type = wpNotesCommon.noteType2Noticon[ latest_type ];
			if ( typeof latest_icon_type == 'undefined' )
				latest_icon_type = 'notification';

			var latest_img_el = $('<span/>', {
				'class' : 'noticon noticon-' + latest_icon_type + ''
			});

			var status_img_el = this.getStatusIcon( num_new );

			if ( 0 === num_new || this.showingPanel ) {
				this.hasUnseen = false;
				t.count.fadeOut( 200, function() {
					t.count.empty();
					t.count.removeClass('wpn-unread').addClass('wpn-read');
					t.count.html( status_img_el );
					t.count.fadeIn( 500 );
				} );

				if ( wpcom && wpcom.masterbar ) {
					wpcom.masterbar.hasUnreadNotifications( false );
				}
			} else {
				if ( this.hasUnseen ) {
					// Blink the indicator if it's already on
					t.count.fadeOut( 400, function() {
						t.count.empty();
						t.count.removeClass('wpn-unread' ).addClass('wpn-read');
						t.count.html( latest_img_el );
						t.count.fadeIn( 400 );
					} );
				}
				this.hasUnseen = true;
				t.count.fadeOut( 400, function() {
					t.count.empty();
					t.count.removeClass('wpn-read').addClass('wpn-unread');
					t.count.html( latest_img_el );
					t.count.fadeIn( 400, function() { });
				});

				if ( wpcom && wpcom.masterbar ) {
					wpcom.masterbar.hasUnreadNotifications( true );
				}
			}
		},

		renderAllSeen: function() {
			if ( !this.hasToggledPanel ) {
				return;
			}

			var img_el = this.getStatusIcon(0);
			this.count.removeClass('wpn-unread').addClass('wpn-read');
			this.count.empty();
			this.count.html( img_el );
			this.hasUnseen = false;

			if ( wpcom && wpcom.masterbar ) {
				wpcom.masterbar.hasUnreadNotifications( false );
			}
		},

		getStatusIcon: function( number ) {
			var new_icon = '';
			switch ( number ) {
				case 0:
					new_icon = 'noticon noticon-notification';
					break;
				case 1:
					new_icon = 'noticon noticon-notification';
					break;
				case 2:
					new_icon = 'noticon noticon-notification';
					break;
				default:
					new_icon = 'noticon noticon-notification';
			}

			return $('<span/>', {
				'class' : new_icon
			});
		},

		togglePanel: function() {
			if ( !this.hasToggledPanel ) {
				this.hasToggledPanel = true;
			}
			var t = this;
			this.loadIframe();

			// temp hack until 3.3 merge to highlight toolbar number
			//this.$el.removeClass('wpnt-stayopen');
			this.$el.toggleClass('wpnt-stayopen');
			this.$el.toggleClass('wpnt-show');
			this.showingPanel = this.$el.hasClass('wpnt-show');

			$( '.ab-active' ).removeClass( 'ab-active' );

			if ( this.showingPanel ) {
				var $unread = this.$( '.wpn-unread' );
				if ( $unread.length ) {
					$unread.removeClass( 'wpn-unread' ).addClass( 'wpn-read' );
				}
				this.reportIframeDelay();
				if ( this.hasUnseen )
					wpNotesCommon.bumpStat( 'notes-menu-clicks', 'non-zero' );
				else
					wpNotesCommon.bumpStat( 'notes-menu-clicks', 'zero' );

				this.hasUnseen = false;
			}

			// tell the iframe we are opening it
			this.postMessage( { action:"togglePanel", showing:this.showingPanel } );

			var focusNotesIframe = function( iframe ) {
				if ( null === iframe.contentWindow ) {
					iframe.addEventListener( 'load', function() {
						iframe.contentWindow.focus();
					} );
				} else {
					iframe.contentWindow.focus();
				}
			};

			if ( this.showingPanel ) {
				focusNotesIframe( this.iframe[0] );
			} else {
				window.focus();
			}

			this.setActive( this.showingPanel );
		},

		// Handle juggling the .active state of the masterbar
		setActive: function( active ) {
			if ( active ) {
				this.currentMasterbarActive = $( '.masterbar li.active' );
				this.currentMasterbarActive.removeClass( 'active' );
				this.$el.addClass( 'active' );
			} else {
				this.$el.removeClass( 'active' );
				this.currentMasterbarActive.addClass( 'active' );
				this.currentMasterbarActive = false;
			}
			this.$el.find( 'a' ).first().blur();
		},

		loadIframe: function() {
			var t = this,
				args = [],
				src,
				lang,
				queries,
				panelRtl;

			if ( t.iframe === null ) {
				// Removed spinner here because it shows up so briefly, and is replaced by the iframe spinner in a different spot
				// t.panel.addClass('loadingIframe').find('.wpnt-notes-panel-header').spin('large');
				t.panel.addClass('loadingIframe');

				if ( t.isJetpack ) {
					args.push( 'jetpack=true' );
					if ( t.linkAccountsURL ) {
						args.push( 'link_accounts_url=' + escape( t.linkAccountsURL ) );
					}
				}

				// Attempt to detect if browser is a touch device, similar code
				// in Calypso. The class adds CSS needed for mobile Safari to allow
				// scrolling of iframe.
				if (('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch) {
					t.panel.addClass( 'touch' );
				}

				panelRtl = $( '#'+iframePanelId ).attr( 'dir' ) == 'rtl';
				lang = $( '#'+iframePanelId ).attr( 'lang' ) || 'en';
				args.push( 'v=' + cacheBuster );
				args.push( 'locale=' + lang );
				queries = ( args.length ) ? '?' + args.join( '&' ) : '';
				src = iframeUrl;
				if ( iframeAppend == '2' && ( t.isRtl || panelRtl ) && ! /rtl.html$/.test(iframeUrl) ) {
					src = iframeUrl + 'rtl.html';
				}
				src = src + queries + '#' + document.location.toString();
				if ( $( '#'+iframePanelId ).attr( 'dir' ) == 'rtl' ) {
					src += '&rtl=1';
				}
				if ( !lang.match( /^en/ ) ) {
					src += ( '&lang=' + lang );
				}

				// Add the iframe (invisible until iFrameReady)
				t.iframe = $('<iframe style="display:none" id="' +iframeFrameId+ '" frameborder=0 ALLOWTRANSPARENCY="true" scrolling="' +iframeScroll+ '"></iframe>');
				t.iframe.attr( 'src', src );
				if ( wideScreen ) {
					t.panel.addClass( 'wide' );
					t.iframe.addClass( 'wide' );
				}

				t.panel.append(t.iframe);
			}
		},

		reportIframeDelay: function() {
			if ( !this.iframeWindow ) {
				if ( !this.iframeSpinnerShown )
					this.iframeSpinnerShown = (new Date()).getTime();
				return;
			}
			if ( this.iframeSpinnerShown !== null ) {
				var delay = 0;
				if ( this.iframeSpinnerShown )
					delay = (new Date()).getTime() - this.iframeSpinnerShown;
				if ( delay === 0 )
					wpNotesCommon.bumpStat( 'notes_iframe_perceived_delay', '0' );
				else if ( delay < 1000 )
					wpNotesCommon.bumpStat( 'notes_iframe_perceived_delay', '0-1' );
				else if ( delay < 2000 )
					wpNotesCommon.bumpStat( 'notes_iframe_perceived_delay', '1-2' );
				else if ( delay < 4000 )
					wpNotesCommon.bumpStat( 'notes_iframe_perceived_delay', '2-4' );
				else if ( delay < 8000 )
					wpNotesCommon.bumpStat( 'notes_iframe_perceived_delay', '4-8' );
				else
					wpNotesCommon.bumpStat( 'notes_iframe_perceived_delay', '8-N' );
				this.iframeSpinnerShown = null;
			}
		},

		iFrameReady: function(event) {
			var t = this;
			var url_parser = document.createElement( 'a' );
			url_parser.href = this.iframe.get(0).src;
			this.iframeOrigin = url_parser.protocol + '//' + url_parser.host;
			this.iframeWindow = this.iframe.get(0).contentWindow;

			if ( "num_new" in event )
				this.render( event.num_new, event.latest_type );
			this.panel.removeClass('loadingIframe').find('.wpnt-notes-panel-header').remove();
			this.iframe.show();
			if ( this.showingPanel )
				this.reportIframeDelay();

			// detect user activity and trigger a refresh event in the iframe
			$( window ).on( 'focus keydown mousemove scroll', function() {
				// Throttle postMessages since the overhead is pretty high & these events fire a lot
				var now = ( new Date() ).getTime();
				if ( !t.lastActivityRefresh || t.lastActivityRefresh < now - 5000 ) {
					t.lastActivityRefresh = now;
					t.postMessage( { action: "refreshNotes" } );
				}
			} );

			this.sendQueuedMessages();
		},

		hidePanel: function() {
			if ( this.showingPanel ) {
				this.togglePanel();
			}
		},

		postMessage: function( message ) {
			var t = this;
			try{
				var _msg = ( 'string' == typeof message ) ? JSON.parse( message ) : message;
				if ( !_.isObject( _msg ) ) {
					return;
				}

				_msg = _.extend( { type: 'notesIframeMessage' }, _msg );

				var targetOrigin = this.iframeOrigin;
				if ( this.iframeWindow && this.iframeWindow.postMessage ) {
					this.iframeWindow.postMessage( JSON.stringify( _msg ), targetOrigin );
				} else {
					this.messageQ.push( _msg );
				}
			}
			catch(e){}
		},

		sendQueuedMessages: function() {
			var t = this;
			_.forEach( this.messageQ, function( m ) {
				t.postMessage( m );
			} );
			this.messageQ = [];
		}

	});

	$(function(){
		if ( ( $( '#wpnt-notes-panel' ).length == 0 && $( '#wpnt-notes-panel2' ).length ) &&
			( 'undefined' != typeof wpNotesIsJetpackClientV2 && wpNotesIsJetpackClientV2 ) ) {
			iframeUrl = 'https://widgets.wp.com/notifications/';
			iframeAppend = '2';
			iframeScroll = 'yes';
			wideScreen = true;
		}

		iframePanelId = "wpnt-notes-panel" + iframeAppend;
		iframeFrameId = "wpnt-notes-iframe" + iframeAppend;

		new wpntView();
	});
})(jQuery);
;
jQuery( document.body ).on( 'click', '.insert-media', function(){
	new Image().src = document.location.protocol + '//pixel.wp.com/g.gif?v=wpcom-no-pv&x_media-explorer=open&r='+ Math.random();
});;
/***
 * Warning: This file is remotely enqueued in Jetpack's Masterbar module.
 * Changing it will also affect Jetpack sites.
 */
jQuery( document ).ready( function( $, wpcom ) {
	var masterbar,
		menupops = $( 'li#wp-admin-bar-blog.menupop, li#wp-admin-bar-newdash.menupop, li#wp-admin-bar-my-account.menupop' ),
		newmenu = $( '#wp-admin-bar-new-post-types' );

	// Unbind hoverIntent, we want clickable menus.
	menupops
		.unbind( 'mouseenter mouseleave' )
		.removeProp( 'hoverIntent_t' )
		.removeProp( 'hoverIntent_s' )
		.on( 'mouseover', function(e) {
			var li = $(e.target).closest( 'li.menupop' );
			menupops.not(li).removeClass( 'ab-hover' );
			li.toggleClass( 'ab-hover' );
		} )
		.on( 'click touchstart', function(e) {
			var $target = $( e.target );

			if ( masterbar.focusSubMenus( $target ) ) {
				return;
			}

			e.preventDefault();
			masterbar.toggleMenu( $target );
		} );

	masterbar = {
		focusSubMenus: function( $target ) {
			// Handle selection of menu items
			if ( ! $target.closest( 'ul' ).hasClass( 'ab-top-menu' ) ) {
				$target
					.closest( 'li' );

				return true;
			}

			return false;
		},

		toggleMenu: function( $target ) {
			var $li = $target.closest( 'li.menupop' ),
				$html = $( 'html' );

			$( 'body' ).off( 'click.ab-menu' );
			$( '#wpadminbar li.menupop' ).not($li).removeClass( 'ab-active wpnt-stayopen wpnt-show' );

			if ( $li.hasClass( 'ab-active' ) ) {
				$li.removeClass( 'ab-active' );
				$html.removeClass( 'ab-menu-open' );
			} else {
				$li.addClass( 'ab-active' );
				$html.addClass( 'ab-menu-open' );

				$( 'body' ).on( 'click.ab-menu', function( e ) {
					if ( ! $( e.target ).parents( '#wpadminbar' ).length ) {
						e.preventDefault();
						masterbar.toggleMenu( $li );
						$( 'body' ).off( 'click.ab-menu' );
					}
				} );
			}
		}
	};
} );;
/*globals JSON */
( function( $ ) {
	var eventName = 'wpcom_masterbar_click';

	var linksTracksEvents = {
		//top level items
		'wp-admin-bar-blog'                        : 'my_sites',
		'wp-admin-bar-newdash'                     : 'reader',
		'wp-admin-bar-ab-new-post'                 : 'write_button',
		'wp-admin-bar-my-account'                  : 'my_account',
		'wp-admin-bar-notes'                       : 'notifications',
		//my sites - top items
		'wp-admin-bar-switch-site'                 : 'my_sites_switch_site',
		'wp-admin-bar-blog-info'                   : 'my_sites_site_info',
		'wp-admin-bar-site-view'                   : 'my_sites_view_site',
		'wp-admin-bar-blog-stats'                  : 'my_sites_site_stats',
		'wp-admin-bar-plan'                        : 'my_sites_plan',
		'wp-admin-bar-plan-badge'                  : 'my_sites_plan_badge',
		//my sites - manage
		'wp-admin-bar-edit-page'                   : 'my_sites_manage_site_pages',
		'wp-admin-bar-new-page-badge'              : 'my_sites_manage_add_page',
		'wp-admin-bar-edit-post'                   : 'my_sites_manage_blog_posts',
		'wp-admin-bar-new-post-badge'              : 'my_sites_manage_add_post',
		'wp-admin-bar-edit-attachment'             : 'my_sites_manage_media',
		'wp-admin-bar-new-attachment-badge'        : 'my_sites_manage_add_media',
		'wp-admin-bar-comments'                    : 'my_sites_manage_comments',
		'wp-admin-bar-edit-jetpack-testimonial'    : 'my_sites_manage_testimonials',
		'wp-admin-bar-new-jetpack-testimonial'     : 'my_sites_manage_add_testimonial',
		'wp-admin-bar-edit-jetpack-portfolio'      : 'my_sites_manage_portfolio',
		'wp-admin-bar-new-jetpack-portfolio'       : 'my_sites_manage_add_portfolio',
		//my sites - personalize
		'wp-admin-bar-themes'                      : 'my_sites_personalize_themes',
		'wp-admin-bar-cmz'                         : 'my_sites_personalize_themes_customize',
		//my sites - configure
		'wp-admin-bar-sharing'                     : 'my_sites_configure_sharing',
		'wp-admin-bar-people'                      : 'my_sites_configure_people',
		'wp-admin-bar-people-add'                  : 'my_sites_configure_people_add_button',
		'wp-admin-bar-plugins'                     : 'my_sites_configure_plugins',
		'wp-admin-bar-domains'                     : 'my_sites_configure_domains',
		'wp-admin-bar-domains-add'                 : 'my_sites_configure_add_domain',
		'wp-admin-bar-blog-settings'               : 'my_sites_configure_settings',
		'wp-admin-bar-legacy-dashboard'            : 'my_sites_configure_wp_admin',
		//reader
		'wp-admin-bar-followed-sites'              : 'reader_followed_sites',
		'wp-admin-bar-reader-followed-sites-manage': 'reader_manage_followed_sites',
		'wp-admin-bar-discover-discover'           : 'reader_discover',
		'wp-admin-bar-discover-search'             : 'reader_search',
		'wp-admin-bar-my-activity-my-likes'        : 'reader_my_likes',
		//account
		'wp-admin-bar-user-info'                   : 'my_account_user_name',
		// account - profile
		'wp-admin-bar-my-profile'                  : 'my_account_profile_my_profile',
		'wp-admin-bar-account-settings'            : 'my_account_profile_account_settings',
		'wp-admin-bar-billing'                     : 'my_account_profile_manage_purchases',
		'wp-admin-bar-security'                    : 'my_account_profile_security',
		'wp-admin-bar-notifications'               : 'my_account_profile_notifications',
		//account - special
		'wp-admin-bar-get-apps'                    : 'my_account_special_get_apps',
		'wp-admin-bar-next-steps'                  : 'my_account_special_next_steps',
		'wp-admin-bar-help'                        : 'my_account_special_help',
	};

	var notesTracksEvents = {
		openSite: function( data ) {
			return {
				clicked: 'masterbar_notifications_panel_site',
				site_id: data.siteId
			};
		},
		openPost: function( data ) {
			return {
				clicked: 'masterbar_notifications_panel_post',
				site_id: data.siteId,
				post_id: data.postId
			};
		},
		openComment: function( data ) {
			return {
				clicked: 'masterbar_notifications_panel_comment',
				site_id: data.siteId,
				post_id: data.postId,
				comment_id: data.commentId
			};
		}
	};

	function recordTracksEvent( eventProps ) {
		eventProps = eventProps || {};
		window._tkq = window._tkq || [];
		window._tkq.push( [ 'recordEvent', eventName, eventProps ] );
	}

	function parseJson( s, defaultValue ) {
		try {
			return JSON.parse( s );
		} catch ( e ) {
			return defaultValue;
		}
	}

	$( document ).ready( function() {
		var trackableLinks = '.mb-trackable .ab-item:not(div),' +
			'#wp-admin-bar-notes .ab-item,' +
			'#wp-admin-bar-user-info .ab-item,' +
			'.mb-trackable .ab-secondary';

		$( trackableLinks ).on( 'click touchstart', function( e ) {
			var $target = $( e.target ),
				$parent = $target.closest( 'li' );

			if ( ! $parent ) {
				return;
			}

			var trackingId = $target.attr( 'ID' ) || $parent.attr( 'ID' );

			if ( ! linksTracksEvents.hasOwnProperty( trackingId ) ) {
				return;
			}

			var eventProps = { 'clicked': linksTracksEvents[ trackingId ] };

			recordTracksEvent( eventProps );
		} );
	} );

	// listen for postMessage events from the notifications iframe
	$( window ).on( 'message', function( e ) {
		var event = ! e.data && e.originalEvent.data ? e.originalEvent : e;
		if ( event.origin !== 'https://widgets.wp.com' ) {
			return;
		}

		var data = ( 'string' === typeof event.data ) ? parseJson( event.data, {} ) : event.data;
		if ( 'notesIframeMessage' !== data.type ) {
			return;
		}

		var eventData = notesTracksEvents[ data.action ];
		if ( ! eventData ) {
			return;
		}

		recordTracksEvent( eventData( data ) );
	} );

} )( jQuery );
;
( function( $ ) {
	var recordTracksEvent = function( eventName, properties ) {
		_tkq = window._tkq || [];
		_tkq.push( [ 'recordEvent', eventName, ( typeof properties === 'object' ) ? properties : {} ] );
	};

	$( document ).ready( function () {
		var helpTabShown = false, livechatClicked = false;
		$( '#contextual-help-link' ).click( function() {
			var showHide;

			if( $( '#contextual-help-link' ).hasClass( 'screen-meta-active' ) ) {
				showHide = 'hide';
			}
			else {
				showHide = 'show';

				if ( ! helpTabShown ) {
					recordTracksEvent( 'wpadmin_help_tab_view' );
					helpTabShown = true;
				}
			}

			$.post( ajaxurl, {
				action: 'admin_help_click',
				value:  showHide,
				nonce:  WpcomTrackAdminHelpL10n.nonce
			},
			function( response ) {
				// Nothing to see here.
			} );
		} );

		$( '#tab-link-wpcom-feedback > a' ).one( 'click', function( e ) {
			recordTracksEvent( 'wpadmin_get_help_section_view' );
		} );

		if (typeof olark !== 'undefined') {

			if ( olark && wpcom_olark && wpcom_olark.box && wpcom_olark.box.inline ) {
				olark( 'api.chat.onBeginConversation', function() {
					recordTracksEvent( 'wpadmin_help_tab_live_chat_begin' );
				} );

				olark( 'api.chat.onCommandFromOperator', function( e ) {
					if ( 'end' === e.command.name ) {
						recordTracksEvent( 'wpadmin_help_tab_live_chat_end' );
					}
				} );

				$( document ).on( 'click focus', '#habla_window_div textarea', function() {
					if ( livechatClicked ) {
						return;
					}	
					livechatClicked = true;
					recordTracksEvent( 'wpadmin_help_tab_live_chat_click' );
				} );
			}
		}
	} );
} )( jQuery );
;
!function(a){function b(a){var b=a.closest(".accordion-section"),c=b.find("[aria-expanded]").first(),d=b.closest(".accordion-container"),e=d.find(".open"),f=e.find("[aria-expanded]").first(),g=b.find(".accordion-section-content");b.hasClass("cannot-expand")||(d.addClass("opening"),b.hasClass("open")?(b.toggleClass("open"),g.toggle(!0).slideToggle(150)):(f.attr("aria-expanded","false"),e.removeClass("open"),e.find(".accordion-section-content").show().slideUp(150),g.toggle(!1).slideToggle(150),b.toggleClass("open")),setTimeout(function(){d.removeClass("opening")},150),c&&c.attr("aria-expanded",String("false"===c.attr("aria-expanded"))))}a(document).ready(function(){a(".accordion-container").on("click keydown",".accordion-section-title",function(c){"keydown"===c.type&&13!==c.which||(c.preventDefault(),b(a(this)))})})}(jQuery);;
