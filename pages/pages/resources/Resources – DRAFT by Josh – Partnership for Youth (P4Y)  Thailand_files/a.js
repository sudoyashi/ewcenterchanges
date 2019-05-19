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
/*
 * Thickbox 3.1 - One Box To Rule Them All.
 * By Cody Lindley (http://www.codylindley.com)
 * Copyright (c) 2007 cody lindley
 * Licensed under the MIT License: http://www.opensource.org/licenses/mit-license.php
*/

if ( typeof tb_pathToImage != 'string' ) {
	var tb_pathToImage = thickboxL10n.loadingAnimation;
}

/*!!!!!!!!!!!!!!!!! edit below this line at your own risk !!!!!!!!!!!!!!!!!!!!!!!*/

//on page load call tb_init
jQuery(document).ready(function(){
	tb_init('a.thickbox, area.thickbox, input.thickbox');//pass where to apply thickbox
	imgLoader = new Image();// preload image
	imgLoader.src = tb_pathToImage;
});

/*
 * Add thickbox to href & area elements that have a class of .thickbox.
 * Remove the loading indicator when content in an iframe has loaded.
 */
function tb_init(domChunk){
	jQuery( 'body' )
		.on( 'click', domChunk, tb_click )
		.on( 'thickbox:iframe:loaded', function() {
			jQuery( '#TB_window' ).removeClass( 'thickbox-loading' );
		});
}

function tb_click(){
	var t = this.title || this.name || null;
	var a = this.href || this.alt;
	var g = this.rel || false;
	tb_show(t,a,g);
	this.blur();
	return false;
}

function tb_show(caption, url, imageGroup) {//function called when the user clicks on a thickbox link

	var $closeBtn;

	try {
		if (typeof document.body.style.maxHeight === "undefined") {//if IE 6
			jQuery("body","html").css({height: "100%", width: "100%"});
			jQuery("html").css("overflow","hidden");
			if (document.getElementById("TB_HideSelect") === null) {//iframe to hide select elements in ie6
				jQuery("body").append("<iframe id='TB_HideSelect'>"+thickboxL10n.noiframes+"</iframe><div id='TB_overlay'></div><div id='TB_window' class='thickbox-loading'></div>");
				jQuery("#TB_overlay").click(tb_remove);
			}
		}else{//all others
			if(document.getElementById("TB_overlay") === null){
				jQuery("body").append("<div id='TB_overlay'></div><div id='TB_window' class='thickbox-loading'></div>");
				jQuery("#TB_overlay").click(tb_remove);
				jQuery( 'body' ).addClass( 'modal-open' );
			}
		}

		if(tb_detectMacXFF()){
			jQuery("#TB_overlay").addClass("TB_overlayMacFFBGHack");//use png overlay so hide flash
		}else{
			jQuery("#TB_overlay").addClass("TB_overlayBG");//use background and opacity
		}

		if(caption===null){caption="";}
		jQuery("body").append("<div id='TB_load'><img src='"+imgLoader.src+"' width='208' /></div>");//add loader to the page
		jQuery('#TB_load').show();//show loader

		var baseURL;
	   if(url.indexOf("?")!==-1){ //ff there is a query string involved
			baseURL = url.substr(0, url.indexOf("?"));
	   }else{
	   		baseURL = url;
	   }

	   var urlString = /\.jpg$|\.jpeg$|\.png$|\.gif$|\.bmp$/;
	   var urlType = baseURL.toLowerCase().match(urlString);

		if(urlType == '.jpg' || urlType == '.jpeg' || urlType == '.png' || urlType == '.gif' || urlType == '.bmp'){//code to show images

			TB_PrevCaption = "";
			TB_PrevURL = "";
			TB_PrevHTML = "";
			TB_NextCaption = "";
			TB_NextURL = "";
			TB_NextHTML = "";
			TB_imageCount = "";
			TB_FoundURL = false;
			if(imageGroup){
				TB_TempArray = jQuery("a[rel="+imageGroup+"]").get();
				for (TB_Counter = 0; ((TB_Counter < TB_TempArray.length) && (TB_NextHTML === "")); TB_Counter++) {
					var urlTypeTemp = TB_TempArray[TB_Counter].href.toLowerCase().match(urlString);
						if (!(TB_TempArray[TB_Counter].href == url)) {
							if (TB_FoundURL) {
								TB_NextCaption = TB_TempArray[TB_Counter].title;
								TB_NextURL = TB_TempArray[TB_Counter].href;
								TB_NextHTML = "<span id='TB_next'>&nbsp;&nbsp;<a href='#'>"+thickboxL10n.next+"</a></span>";
							} else {
								TB_PrevCaption = TB_TempArray[TB_Counter].title;
								TB_PrevURL = TB_TempArray[TB_Counter].href;
								TB_PrevHTML = "<span id='TB_prev'>&nbsp;&nbsp;<a href='#'>"+thickboxL10n.prev+"</a></span>";
							}
						} else {
							TB_FoundURL = true;
							TB_imageCount = thickboxL10n.image + ' ' + (TB_Counter + 1) + ' ' + thickboxL10n.of + ' ' + (TB_TempArray.length);
						}
				}
			}

			imgPreloader = new Image();
			imgPreloader.onload = function(){
			imgPreloader.onload = null;

			// Resizing large images - original by Christian Montoya edited by me.
			var pagesize = tb_getPageSize();
			var x = pagesize[0] - 150;
			var y = pagesize[1] - 150;
			var imageWidth = imgPreloader.width;
			var imageHeight = imgPreloader.height;
			if (imageWidth > x) {
				imageHeight = imageHeight * (x / imageWidth);
				imageWidth = x;
				if (imageHeight > y) {
					imageWidth = imageWidth * (y / imageHeight);
					imageHeight = y;
				}
			} else if (imageHeight > y) {
				imageWidth = imageWidth * (y / imageHeight);
				imageHeight = y;
				if (imageWidth > x) {
					imageHeight = imageHeight * (x / imageWidth);
					imageWidth = x;
				}
			}
			// End Resizing

			TB_WIDTH = imageWidth + 30;
			TB_HEIGHT = imageHeight + 60;
			jQuery("#TB_window").append("<a href='' id='TB_ImageOff'><span class='screen-reader-text'>"+thickboxL10n.close+"</span><img id='TB_Image' src='"+url+"' width='"+imageWidth+"' height='"+imageHeight+"' alt='"+caption+"'/></a>" + "<div id='TB_caption'>"+caption+"<div id='TB_secondLine'>" + TB_imageCount + TB_PrevHTML + TB_NextHTML + "</div></div><div id='TB_closeWindow'><button type='button' id='TB_closeWindowButton'><span class='screen-reader-text'>"+thickboxL10n.close+"</span><span class='tb-close-icon'></span></button></div>");

			jQuery("#TB_closeWindowButton").click(tb_remove);

			if (!(TB_PrevHTML === "")) {
				function goPrev(){
					if(jQuery(document).unbind("click",goPrev)){jQuery(document).unbind("click",goPrev);}
					jQuery("#TB_window").remove();
					jQuery("body").append("<div id='TB_window'></div>");
					tb_show(TB_PrevCaption, TB_PrevURL, imageGroup);
					return false;
				}
				jQuery("#TB_prev").click(goPrev);
			}

			if (!(TB_NextHTML === "")) {
				function goNext(){
					jQuery("#TB_window").remove();
					jQuery("body").append("<div id='TB_window'></div>");
					tb_show(TB_NextCaption, TB_NextURL, imageGroup);
					return false;
				}
				jQuery("#TB_next").click(goNext);

			}

			jQuery(document).bind('keydown.thickbox', function(e){
				if ( e.which == 27 ){ // close
					tb_remove();

				} else if ( e.which == 190 ){ // display previous image
					if(!(TB_NextHTML == "")){
						jQuery(document).unbind('thickbox');
						goNext();
					}
				} else if ( e.which == 188 ){ // display next image
					if(!(TB_PrevHTML == "")){
						jQuery(document).unbind('thickbox');
						goPrev();
					}
				}
				return false;
			});

			tb_position();
			jQuery("#TB_load").remove();
			jQuery("#TB_ImageOff").click(tb_remove);
			jQuery("#TB_window").css({'visibility':'visible'}); //for safari using css instead of show
			};

			imgPreloader.src = url;
		}else{//code to show html

			var queryString = url.replace(/^[^\?]+\??/,'');
			var params = tb_parseQuery( queryString );

			TB_WIDTH = (params['width']*1) + 30 || 630; //defaults to 630 if no parameters were added to URL
			TB_HEIGHT = (params['height']*1) + 40 || 440; //defaults to 440 if no parameters were added to URL
			ajaxContentW = TB_WIDTH - 30;
			ajaxContentH = TB_HEIGHT - 45;

			if(url.indexOf('TB_iframe') != -1){// either iframe or ajax window
					urlNoQuery = url.split('TB_');
					// if src is set, we request the same page then cancel request (which still results in a page view on the backend)
					if ( params['noIframeSrc'] ) {
						urlNoQuery = [ '' ];
					}
					jQuery("#TB_iframeContent").remove();
					if(params['modal'] != "true"){//iframe no modal
						jQuery("#TB_window").append("<div id='TB_title'><div id='TB_ajaxWindowTitle'>"+caption+"</div><div id='TB_closeAjaxWindow'><button type='button' id='TB_closeWindowButton'><span class='screen-reader-text'>"+thickboxL10n.close+"</span><span class='tb-close-icon'></span></button></div></div><iframe frameborder='0' hspace='0' allowtransparency='true' src='"+urlNoQuery[0]+"' id='TB_iframeContent' name='TB_iframeContent"+Math.round(Math.random()*1000)+"' onload='tb_showIframe()' style='width:"+(ajaxContentW + 29)+"px;height:"+(ajaxContentH + 17)+"px;' >"+thickboxL10n.noiframes+"</iframe>");
					}else{//iframe modal
					jQuery("#TB_overlay").unbind();
						jQuery("#TB_window").append("<iframe frameborder='0' hspace='0' allowtransparency='true' src='"+urlNoQuery[0]+"' id='TB_iframeContent' name='TB_iframeContent"+Math.round(Math.random()*1000)+"' onload='tb_showIframe()' style='width:"+(ajaxContentW + 29)+"px;height:"+(ajaxContentH + 17)+"px;'>"+thickboxL10n.noiframes+"</iframe>");
					}
			}else{// not an iframe, ajax
					if(jQuery("#TB_window").css("visibility") != "visible"){
						if(params['modal'] != "true"){//ajax no modal
						jQuery("#TB_window").append("<div id='TB_title'><div id='TB_ajaxWindowTitle'>"+caption+"</div><div id='TB_closeAjaxWindow'><button type='button' id='TB_closeWindowButton'><span class='screen-reader-text'>"+thickboxL10n.close+"</span><span class='tb-close-icon'></span></button></div></div><div id='TB_ajaxContent' style='width:"+ajaxContentW+"px;height:"+ajaxContentH+"px'></div>");
						}else{//ajax modal
						jQuery("#TB_overlay").unbind();
						jQuery("#TB_window").append("<div id='TB_ajaxContent' class='TB_modal' style='width:"+ajaxContentW+"px;height:"+ajaxContentH+"px;'></div>");
						}
					}else{//this means the window is already up, we are just loading new content via ajax
						jQuery("#TB_ajaxContent")[0].style.width = ajaxContentW +"px";
						jQuery("#TB_ajaxContent")[0].style.height = ajaxContentH +"px";
						jQuery("#TB_ajaxContent")[0].scrollTop = 0;
						jQuery("#TB_ajaxWindowTitle").html(caption);
					}
			}

			jQuery("#TB_closeWindowButton").click(tb_remove);

				if(url.indexOf('TB_inline') != -1){
					jQuery("#TB_ajaxContent").append(jQuery('#' + params['inlineId']).children());
					jQuery("#TB_window").bind('tb_unload', function () {
						jQuery('#' + params['inlineId']).append( jQuery("#TB_ajaxContent").children() ); // move elements back when you're finished
					});
					tb_position();
					jQuery("#TB_load").remove();
					jQuery("#TB_window").css({'visibility':'visible'});
				}else if(url.indexOf('TB_iframe') != -1){
					tb_position();
					jQuery("#TB_load").remove();
					jQuery("#TB_window").css({'visibility':'visible'});
				}else{
					var load_url = url;
					load_url += -1 === url.indexOf('?') ? '?' : '&';
					jQuery("#TB_ajaxContent").load(load_url += "random=" + (new Date().getTime()),function(){//to do a post change this load method
						tb_position();
						jQuery("#TB_load").remove();
						tb_init("#TB_ajaxContent a.thickbox");
						jQuery("#TB_window").css({'visibility':'visible'});
					});
				}

		}

		if(!params['modal']){
			jQuery(document).bind('keydown.thickbox', function(e){
				if ( e.which == 27 ){ // close
					tb_remove();
					return false;
				}
			});
		}

		$closeBtn = jQuery( '#TB_closeWindowButton' );
		/*
		 * If the native Close button icon is visible, move focus on the button
		 * (e.g. in the Network Admin Themes screen).
		 * In other admin screens is hidden and replaced by a different icon.
		 */
		if ( $closeBtn.find( '.tb-close-icon' ).is( ':visible' ) ) {
			$closeBtn.focus();
		}

	} catch(e) {
		//nothing here
	}
}

//helper functions below
function tb_showIframe(){
	jQuery("#TB_load").remove();
	jQuery("#TB_window").css({'visibility':'visible'}).trigger( 'thickbox:iframe:loaded' );
}

function tb_remove() {
 	jQuery("#TB_imageOff").unbind("click");
	jQuery("#TB_closeWindowButton").unbind("click");
	jQuery( '#TB_window' ).fadeOut( 'fast', function() {
		jQuery( '#TB_window, #TB_overlay, #TB_HideSelect' ).trigger( 'tb_unload' ).unbind().remove();
		jQuery( 'body' ).trigger( 'thickbox:removed' );
	});
	jQuery( 'body' ).removeClass( 'modal-open' );
	jQuery("#TB_load").remove();
	if (typeof document.body.style.maxHeight == "undefined") {//if IE 6
		jQuery("body","html").css({height: "auto", width: "auto"});
		jQuery("html").css("overflow","");
	}
	jQuery(document).unbind('.thickbox');
	return false;
}

function tb_position() {
var isIE6 = typeof document.body.style.maxHeight === "undefined";
jQuery("#TB_window").css({marginLeft: '-' + parseInt((TB_WIDTH / 2),10) + 'px', width: TB_WIDTH + 'px'});
	if ( ! isIE6 ) { // take away IE6
		jQuery("#TB_window").css({marginTop: '-' + parseInt((TB_HEIGHT / 2),10) + 'px'});
	}
}

function tb_parseQuery ( query ) {
   var Params = {};
   if ( ! query ) {return Params;}// return empty object
   var Pairs = query.split(/[;&]/);
   for ( var i = 0; i < Pairs.length; i++ ) {
      var KeyVal = Pairs[i].split('=');
      if ( ! KeyVal || KeyVal.length != 2 ) {continue;}
      var key = unescape( KeyVal[0] );
      var val = unescape( KeyVal[1] );
      val = val.replace(/\+/g, ' ');
      Params[key] = val;
   }
   return Params;
}

function tb_getPageSize(){
	var de = document.documentElement;
	var w = window.innerWidth || self.innerWidth || (de&&de.clientWidth) || document.body.clientWidth;
	var h = window.innerHeight || self.innerHeight || (de&&de.clientHeight) || document.body.clientHeight;
	arrayPageSize = [w,h];
	return arrayPageSize;
}

function tb_detectMacXFF() {
  var userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.indexOf('mac') != -1 && userAgent.indexOf('firefox')!=-1) {
    return true;
  }
}
;
/* global pm, wpcom_reblog */

var jetpackLikesWidgetQueue = [];
var jetpackLikesWidgetBatch = [];
var jetpackLikesMasterReady = false;

function JetpackLikespostMessage( message, target ) {
	if ( 'string' === typeof message ){
		try {
			message = JSON.parse( message );
		} catch(e) {
			return;
		}
	}

	pm( {
		target: target,
		type: 'likesMessage',
		data: message,
		origin: '*'
	} );
}

function JetpackLikesBatchHandler() {
	var requests = [];
	jQuery( 'div.jetpack-likes-widget-unloaded' ).each( function() {
		if ( jetpackLikesWidgetBatch.indexOf( this.id ) > -1 ) {
			return;
		}
		jetpackLikesWidgetBatch.push( this.id );
		var regex = /like-(post|comment)-wrapper-(\d+)-(\d+)-(\w+)/,
			match = regex.exec( this.id ),
			info;

		if ( ! match || match.length !== 5 ) {
			return;
		}

		info = {
			blog_id: match[2],
			width:   this.width
		};

		if ( 'post' === match[1] ) {
			info.post_id = match[3];
		} else if ( 'comment' === match[1] ) {
			info.comment_id = match[3];
		}

		info.obj_id = match[4];

		requests.push( info );
	});

	if ( requests.length > 0 ) {
		JetpackLikespostMessage( { event: 'initialBatch', requests: requests }, window.frames['likes-master'] );
	}
}

function JetpackLikesMessageListener( event, message ) {
	var allowedOrigin, $container, $list, offset, rowLength, height, scrollbarWidth;

	if ( 'undefined' === typeof event.event ) {
		return;
	}

	// We only allow messages from one origin
	allowedOrigin = window.location.protocol + '//widgets.wp.com';
	if ( allowedOrigin !== message.origin ) {
		return;
	}

	if ( 'masterReady' === event.event ) {
		jQuery( document ).ready( function() {
			jetpackLikesMasterReady = true;

			var stylesData = {
					event: 'injectStyles'
				},
				$sdTextColor = jQuery( '.sd-text-color' ),
				$sdLinkColor = jQuery( '.sd-link-color' );

			if ( jQuery( 'iframe.admin-bar-likes-widget' ).length > 0 ) {
				JetpackLikespostMessage( { event: 'adminBarEnabled' }, window.frames[ 'likes-master' ] );

				stylesData.adminBarStyles = {
					background: jQuery( '#wpadminbar .quicklinks li#wp-admin-bar-wpl-like > a' ).css( 'background' ),
					isRtl: ( 'rtl' === jQuery( '#wpadminbar' ).css( 'direction' ) )
				};
			}

			// enable reblogs if we're on a single post page
			if ( jQuery( 'body' ).hasClass( 'single' ) ) {
				JetpackLikespostMessage( { event: 'reblogsEnabled' }, window.frames[ 'likes-master' ] );
			}

			if ( ! window.addEventListener ) {
				jQuery( '#wp-admin-bar-admin-bar-likes-widget' ).hide();
			}

			stylesData.textStyles = {
				color:          $sdTextColor.css( 'color' ),
				fontFamily:     $sdTextColor.css( 'font-family' ),
				fontSize:       $sdTextColor.css( 'font-size' ),
				direction:      $sdTextColor.css( 'direction' ),
				fontWeight:     $sdTextColor.css( 'font-weight' ),
				fontStyle:      $sdTextColor.css( 'font-style' ),
				textDecoration: $sdTextColor.css('text-decoration')
			};

			stylesData.linkStyles = {
				color:          $sdLinkColor.css('color'),
				fontFamily:     $sdLinkColor.css('font-family'),
				fontSize:       $sdLinkColor.css('font-size'),
				textDecoration: $sdLinkColor.css('text-decoration'),
				fontWeight:     $sdLinkColor.css( 'font-weight' ),
				fontStyle:      $sdLinkColor.css( 'font-style' )
			};

			JetpackLikespostMessage( stylesData, window.frames[ 'likes-master' ] );

			JetpackLikesBatchHandler();

			jQuery( document ).on( 'inview', 'div.jetpack-likes-widget-unloaded', function() {
				jetpackLikesWidgetQueue.push( this.id );
			});
		});
	}

	if ( 'showLikeWidget' === event.event ) {
		jQuery( '#' + event.id + ' .post-likes-widget-placeholder'  ).fadeOut( 'fast', function() {
			jQuery( '#' + event.id + ' .post-likes-widget' ).fadeIn( 'fast', function() {
				JetpackLikespostMessage( { event: 'likeWidgetDisplayed', blog_id: event.blog_id, post_id: event.post_id, obj_id: event.obj_id }, window.frames['likes-master'] );
			});
		});
	}

	if ( 'clickReblogFlair' === event.event ) {
		wpcom_reblog.toggle_reblog_box_flair( event.obj_id );
	}

	if ( 'showOtherGravatars' === event.event ) {
		$container = jQuery( '#likes-other-gravatars' );
		$list = $container.find( 'ul' );

		$container.hide();
		$list.html( '' );

		$container.find( '.likes-text span' ).text( event.total );

		jQuery.each( event.likers, function( i, liker ) {
			var element = jQuery( '<li><a><img /></a></li>' );
			element.addClass( liker.css_class );

			element.find( 'a' ).
				attr({
					href: liker.profile_URL,
					rel: 'nofollow',
					target: '_parent'
				}).
				addClass( 'wpl-liker' );

			element.find( 'img' ).
				attr({
					src: liker.avatar_URL,
					alt: liker.name
				}).
				css({
					width: '30px',
					height: '30px',
					paddingRight: '3px'
				});

			$list.append( element );
		} );

		offset = jQuery( '[name=\'' + event.parent + '\']' ).offset();

		$container.css( 'left', offset.left + event.position.left - 10 + 'px' );
		$container.css( 'top', offset.top + event.position.top - 33 + 'px' );

		rowLength = Math.floor( event.width / 37 );
		height = ( Math.ceil( event.likers.length / rowLength ) * 37 ) + 13;
		if ( height > 204 ) {
			height = 204;
		}

		$container.css( 'height', height + 'px' );
		$container.css( 'width', rowLength * 37 - 7 + 'px' );

		$list.css( 'width', rowLength * 37 + 'px' );

		$container.fadeIn( 'slow' );

		scrollbarWidth = $list[0].offsetWidth - $list[0].clientWidth;
		if ( scrollbarWidth > 0 ) {
			$container.width( $container.width() + scrollbarWidth );
			$list.width( $list.width() + scrollbarWidth );
		}
	}
}

pm.bind( 'likesMessage', JetpackLikesMessageListener );

jQuery( document ).click( function( e ) {
	var $container = jQuery( '#likes-other-gravatars' );

	if ( $container.has( e.target ).length === 0 ) {
		$container.fadeOut( 'slow' );
	}
});

function JetpackLikesWidgetQueueHandler() {
	var $wrapper, wrapperID, found;
	if ( ! jetpackLikesMasterReady ) {
		setTimeout( JetpackLikesWidgetQueueHandler, 500 );
		return;
	}

	if ( jetpackLikesWidgetQueue.length > 0 ) {
		// We may have a widget that needs creating now
		found = false;
		while( jetpackLikesWidgetQueue.length > 0 ) {
			// Grab the first member of the queue that isn't already loading.
			wrapperID = jetpackLikesWidgetQueue.splice( 0, 1 )[0];
			if ( jQuery( '#' + wrapperID ).hasClass( 'jetpack-likes-widget-unloaded' ) ) {
				found = true;
				break;
			}
		}
		if ( ! found ) {
			setTimeout( JetpackLikesWidgetQueueHandler, 500 );
			return;
		}
	} else if ( jQuery( 'div.jetpack-likes-widget-unloaded' ).length > 0 ) {
		// Grab any unloaded widgets for a batch request
		JetpackLikesBatchHandler();

		// Get the next unloaded widget
		wrapperID = jQuery( 'div.jetpack-likes-widget-unloaded' ).first()[0].id;
		if ( ! wrapperID ) {
			// Everything is currently loaded
			setTimeout( JetpackLikesWidgetQueueHandler, 500 );
			return;
		}
	}

	if ( 'undefined' === typeof wrapperID ) {
		setTimeout( JetpackLikesWidgetQueueHandler, 500 );
		return;
	}

	$wrapper = jQuery( '#' + wrapperID );
	$wrapper.find( 'iframe' ).remove();

	if ( $wrapper.hasClass( 'slim-likes-widget' ) ) {
		$wrapper.find( '.post-likes-widget-placeholder' ).after( '<iframe class="post-likes-widget jetpack-likes-widget" name="' + $wrapper.data( 'name' ) + '" height="22px" width="68px" frameBorder="0" scrolling="no" src="' + $wrapper.data( 'src' ) + '"></iframe>' );
	} else {
		$wrapper.find( '.post-likes-widget-placeholder' ).after( '<iframe class="post-likes-widget jetpack-likes-widget" name="' + $wrapper.data( 'name' ) + '" height="55px" width="100%" frameBorder="0" src="' + $wrapper.data( 'src' ) + '"></iframe>' );
	}

	$wrapper.removeClass( 'jetpack-likes-widget-unloaded' ).addClass( 'jetpack-likes-widget-loading' );

	$wrapper.find( 'iframe' ).load( function( e ) {
		var $iframe = jQuery( e.target );
		$wrapper.removeClass( 'jetpack-likes-widget-loading' ).addClass( 'jetpack-likes-widget-loaded' );

		JetpackLikespostMessage( { event: 'loadLikeWidget', name: $iframe.attr( 'name' ), width: $iframe.width(), domain: window.location.hostname }, window.frames[ 'likes-master' ] );

		if ( $wrapper.hasClass( 'slim-likes-widget' ) ) {
			$wrapper.find( 'iframe' ).Jetpack( 'resizeable' );
		}
	});
	setTimeout( JetpackLikesWidgetQueueHandler, 250 );
}
JetpackLikesWidgetQueueHandler();
;
"undefined"!=typeof jQuery?("undefined"==typeof jQuery.fn.hoverIntent&&!function(a){a.fn.hoverIntent=function(b,c,d){var e={interval:100,sensitivity:6,timeout:0};e="object"==typeof b?a.extend(e,b):a.isFunction(c)?a.extend(e,{over:b,out:c,selector:d}):a.extend(e,{over:b,out:b,selector:c});var f,g,h,i,j=function(a){f=a.pageX,g=a.pageY},k=function(b,c){return c.hoverIntent_t=clearTimeout(c.hoverIntent_t),Math.sqrt((h-f)*(h-f)+(i-g)*(i-g))<e.sensitivity?(a(c).off("mousemove.hoverIntent",j),c.hoverIntent_s=!0,e.over.apply(c,[b])):(h=f,i=g,void(c.hoverIntent_t=setTimeout(function(){k(b,c)},e.interval)))},l=function(a,b){return b.hoverIntent_t=clearTimeout(b.hoverIntent_t),b.hoverIntent_s=!1,e.out.apply(b,[a])},m=function(b){var c=a.extend({},b),d=this;d.hoverIntent_t&&(d.hoverIntent_t=clearTimeout(d.hoverIntent_t)),"mouseenter"===b.type?(h=c.pageX,i=c.pageY,a(d).on("mousemove.hoverIntent",j),d.hoverIntent_s||(d.hoverIntent_t=setTimeout(function(){k(c,d)},e.interval))):(a(d).off("mousemove.hoverIntent",j),d.hoverIntent_s&&(d.hoverIntent_t=setTimeout(function(){l(c,d)},e.timeout)))};return this.on({"mouseenter.hoverIntent":m,"mouseleave.hoverIntent":m},e.selector)}}(jQuery),jQuery(document).ready(function(a){var b,c,d,e=a("#wpadminbar"),f=!1;b=function(b,c){var d=a(c),e=d.attr("tabindex");e&&d.attr("tabindex","0").attr("tabindex",e)},c=function(b){e.find("li.menupop").on("click.wp-mobile-hover",function(c){var d=a(this);d.parent().is("#wp-admin-bar-root-default")&&!d.hasClass("hover")?(c.preventDefault(),e.find("li.menupop.hover").removeClass("hover"),d.addClass("hover")):d.hasClass("hover")?a(c.target).closest("div").hasClass("ab-sub-wrapper")||(c.stopPropagation(),c.preventDefault(),d.removeClass("hover")):(c.stopPropagation(),c.preventDefault(),d.addClass("hover")),b&&(a("li.menupop").off("click.wp-mobile-hover"),f=!1)})},d=function(){var b=/Mobile\/.+Safari/.test(navigator.userAgent)?"touchstart":"click";a(document.body).on(b+".wp-mobile-hover",function(b){a(b.target).closest("#wpadminbar").length||e.find("li.menupop.hover").removeClass("hover")})},e.removeClass("nojq").removeClass("nojs"),"ontouchstart"in window?(e.on("touchstart",function(){c(!0),f=!0}),d()):/IEMobile\/[1-9]/.test(navigator.userAgent)&&(c(),d()),e.find("li.menupop").hoverIntent({over:function(){f||a(this).addClass("hover")},out:function(){f||a(this).removeClass("hover")},timeout:180,sensitivity:7,interval:100}),window.location.hash&&window.scrollBy(0,-32),a("#wp-admin-bar-get-shortlink").click(function(b){b.preventDefault(),a(this).addClass("selected").children(".shortlink-input").blur(function(){a(this).parents("#wp-admin-bar-get-shortlink").removeClass("selected")}).focus().select()}),a("#wpadminbar li.menupop > .ab-item").bind("keydown.adminbar",function(c){if(13==c.which){var d=a(c.target),e=d.closest(".ab-sub-wrapper"),f=d.parent().hasClass("hover");c.stopPropagation(),c.preventDefault(),e.length||(e=a("#wpadminbar .quicklinks")),e.find(".menupop").removeClass("hover"),f||d.parent().toggleClass("hover"),d.siblings(".ab-sub-wrapper").find(".ab-item").each(b)}}).each(b),a("#wpadminbar .ab-item").bind("keydown.adminbar",function(c){if(27==c.which){var d=a(c.target);c.stopPropagation(),c.preventDefault(),d.closest(".hover").removeClass("hover").children(".ab-item").focus(),d.siblings(".ab-sub-wrapper").find(".ab-item").each(b)}}),e.click(function(b){"wpadminbar"!=b.target.id&&"wp-admin-bar-top-secondary"!=b.target.id||(e.find("li.menupop.hover").removeClass("hover"),a("html, body").animate({scrollTop:0},"fast"),b.preventDefault())}),a(".screen-reader-shortcut").keydown(function(b){var c,d;13==b.which&&(c=a(this).attr("href"),d=navigator.userAgent.toLowerCase(),d.indexOf("applewebkit")!=-1&&c&&"#"==c.charAt(0)&&setTimeout(function(){a(c).focus()},100))}),a("#adminbar-search").on({focus:function(){a("#adminbarsearch").addClass("adminbar-focused")},blur:function(){a("#adminbarsearch").removeClass("adminbar-focused")}}),"sessionStorage"in window&&a("#wp-admin-bar-logout a").click(function(){try{for(var a in sessionStorage)a.indexOf("wp-autosave-")!=-1&&sessionStorage.removeItem(a)}catch(b){}}),navigator.userAgent&&document.body.className.indexOf("no-font-face")===-1&&/Android (1.0|1.1|1.5|1.6|2.0|2.1)|Nokia|Opera Mini|w(eb)?OSBrowser|webOS|UCWEB|Windows Phone OS 7|XBLWP7|ZuneWP7|MSIE 7/.test(navigator.userAgent)&&(document.body.className+=" no-font-face")})):!function(a,b){var c,d=function(a,b,c){a&&"function"==typeof a.addEventListener?a.addEventListener(b,c,!1):a&&"function"==typeof a.attachEvent&&a.attachEvent("on"+b,function(){return c.call(a,window.event)})},e=new RegExp("\\bhover\\b","g"),f=[],g=new RegExp("\\bselected\\b","g"),h=function(a){for(var b=f.length;b--;)if(f[b]&&a==f[b][1])return f[b][0];return!1},i=function(b){for(var d,i,j,k,l,m,n=[],o=0;b&&b!=c&&b!=a;)"LI"==b.nodeName.toUpperCase()&&(n[n.length]=b,i=h(b),i&&clearTimeout(i),b.className=b.className?b.className.replace(e,"")+" hover":"hover",k=b),b=b.parentNode;if(k&&k.parentNode&&(l=k.parentNode,l&&"UL"==l.nodeName.toUpperCase()))for(d=l.childNodes.length;d--;)m=l.childNodes[d],m!=k&&(m.className=m.className?m.className.replace(g,""):"");for(d=f.length;d--;){for(j=!1,o=n.length;o--;)n[o]==f[d][1]&&(j=!0);j||(f[d][1].className=f[d][1].className?f[d][1].className.replace(e,""):"")}},j=function(b){for(;b&&b!=c&&b!=a;)"LI"==b.nodeName.toUpperCase()&&!function(a){var b=setTimeout(function(){a.className=a.className?a.className.replace(e,""):""},500);f[f.length]=[b,a]}(b),b=b.parentNode},k=function(b){for(var d,e,f,h=b.target||b.srcElement;;){if(!h||h==a||h==c)return;if(h.id&&"wp-admin-bar-get-shortlink"==h.id)break;h=h.parentNode}for(b.preventDefault&&b.preventDefault(),b.returnValue=!1,-1==h.className.indexOf("selected")&&(h.className+=" selected"),d=0,e=h.childNodes.length;d<e;d++)if(f=h.childNodes[d],f.className&&-1!=f.className.indexOf("shortlink-input")){f.focus(),f.select(),f.onblur=function(){h.className=h.className?h.className.replace(g,""):""};break}return!1},l=function(a){var b,c,d,e,f,g;if(!("wpadminbar"!=a.id&&"wp-admin-bar-top-secondary"!=a.id||(b=window.pageYOffset||document.documentElement.scrollTop||document.body.scrollTop||0,b<1)))for(g=b>800?130:100,c=Math.min(12,Math.round(b/g)),d=b>800?Math.round(b/30):Math.round(b/20),e=[],f=0;b;)b-=d,b<0&&(b=0),e.push(b),setTimeout(function(){window.scrollTo(0,e.shift())},f*c),f++};d(b,"load",function(){c=a.getElementById("wpadminbar"),a.body&&c&&(a.body.appendChild(c),c.className&&(c.className=c.className.replace(/nojs/,"")),d(c,"mouseover",function(a){i(a.target||a.srcElement)}),d(c,"mouseout",function(a){j(a.target||a.srcElement)}),d(c,"click",k),d(c,"click",function(a){l(a.target||a.srcElement)}),d(document.getElementById("wp-admin-bar-logout"),"click",function(){if("sessionStorage"in window)try{for(var a in sessionStorage)a.indexOf("wp-autosave-")!=-1&&sessionStorage.removeItem(a)}catch(b){}})),b.location.hash&&b.scrollBy(0,-32),navigator.userAgent&&document.body.className.indexOf("no-font-face")===-1&&/Android (1.0|1.1|1.5|1.6|2.0|2.1)|Nokia|Opera Mini|w(eb)?OSBrowser|webOS|UCWEB|Windows Phone OS 7|XBLWP7|ZuneWP7|MSIE 7/.test(navigator.userAgent)&&(document.body.className+=" no-font-face")})}(document,window);;
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
/* global screen_reader_text */
/**
 * navigation.js
 *
 * Handles the navigation menu.
 */
( function( $ ) {

	/* Define variables */
	var header_wrapper, navigation_wrapper, site_navigation, classic_primary, classic_secondary, menu_toggle, window_width, menu_toggle_width, site_branding, header_search;

	header_wrapper     = $( '.header-wrapper' );
	navigation_wrapper = $( '.navigation-wrapper' );
	site_navigation    = $( '#site-navigation' );
	classic_primary    = $( '.navigation-classic .primary-navigation' );
	classic_secondary  = $( '.navigation-classic .secondary-navigation' );
	menu_toggle        = $( '.menu-toggle' );
	site_branding      = $( '.site-branding' );
	header_search      = $( '.header-search' );

	/* Add dropdown toggle to Primary Navigation items */
	$( '.primary-navigation .menu-primary > ul > .page_item_has_children > a, .primary-navigation .menu-primary > ul > .menu-item-has-children > a' ).after( '<button class="dropdown-toggle" aria-expanded="false">' + screen_reader_text.expand + '</button>' );


	/* Depending on window width */
	function responsive_navigation() {

		var e = window, a = 'inner';

		if ( ! ( 'innerWidth' in window ) ) {
			a = 'client';
			e = document.documentElement || document.body;
		}

		window_width = e[ a+'Width' ];
		
		menu_toggle_width = menu_toggle.outerWidth();

		/* Reset menu_toggle DOM position */
		if ( $( 'body' ).hasClass( 'rtl' ) ) {
			menu_toggle.appendTo( site_navigation ).css( 'margin-right', '' );
		} else {
			menu_toggle.appendTo( site_navigation ).css( 'margin-left', '' );
		}

		if ( window_width < 1020 ) {
			classic_secondary.appendTo( navigation_wrapper );
			classic_primary.appendTo( navigation_wrapper );
		} else {
			classic_secondary.insertBefore( header_wrapper );
			classic_primary.insertAfter( header_wrapper );
		}

		if ( window_width < 1230 ) {
			navigation_wrapper.insertBefore( header_wrapper );
			if ( $( 'body' ).hasClass( 'rtl' ) ) {
				$( '.menu-secondary' ).css( 'padding-left', '' );
				menu_toggle.css( 'margin-right', '' );
			} else {
				$( '.menu-secondary' ).css( 'padding-right', '' );
				menu_toggle.css( 'margin-left', '' );
			}
		} else {
			navigation_wrapper.insertAfter( menu_toggle );
			if ( $( 'body' ).hasClass( 'rtl' ) ) {
				$( '.navigation-default .menu-secondary' ).css( 'padding-left', menu_toggle_width + 60 );
			} else {
				$( '.navigation-default .menu-secondary' ).css( 'padding-right', menu_toggle_width + 60 );
			}
			if ( menu_toggle.hasClass( 'open' ) ) {
				$( 'html, body' ).css( 'overflow-y', 'hidden' );
				menu_toggle.appendTo( navigation_wrapper );
				if ( $( 'body' ).hasClass( 'rtl' ) ) {
					menu_toggle.css( 'margin-right', 930 / 2 - menu_toggle_width );
				} else {
					menu_toggle.css( 'margin-left', 930 / 2 - menu_toggle_width );
				}
			} else {
				$( 'html, body' ).css( 'overflow-y', '' );
				if ( $( 'body' ).hasClass( 'rtl' ) ) {
					menu_toggle.css( 'margin-right', '' );
				} else {
					menu_toggle.css( 'margin-left', '' );
				}
			}
		}

		/* Add a max-width to .site-branding */
		var gap_icons = 0;
		if ( site_navigation.length ) {
			gap_icons += 16;
		}
		if ( header_search.length ) {
			gap_icons += 16;
		}
		if ( window_width < 768 ) {
			site_branding.removeAttr( 'style' );
		} else {
			site_branding.css( 'max-width', header_wrapper.outerWidth() - ( site_navigation.outerWidth() + header_search.outerWidth() + gap_icons ) );
		}

		$( '.menu-primary .dropdown-toggle' ).each( function() {
			$( this ).css( 'top', $( this ).prev( 'a' ).outerHeight() - $( this ).outerHeight() - 1 );
		} );
	}

	/* Click toggle */
	menu_toggle.click( function() {
		$( 'html, body' ).scrollTop( 0 );
		$( this ).toggleClass( 'open' );
		$( this ).attr( 'aria-expanded', $( this ).attr( 'aria-expanded' ) === 'false' ? 'true' : 'false' );
		navigation_wrapper.toggle();
		$( '.search-toggle' ).removeClass( 'open' );
		$( '.search-toggle' ).attr( 'aria-expanded', 'false' );
		$( '.search-wrapper' ).hide();
		responsive_navigation();
	} );

	/* Load */
	$( window ).load( responsive_navigation ).resize( responsive_navigation );

	var container = $( '.navigation-classic .primary-navigation' );

	// Fix child menus for touch devices.
	function fixMenuTouchTaps( container ) {
		var touchStartFn,
		    parentLink = container.find( '.menu-item-has-children > a, .page_item_has_children > a' );

		if ( 'ontouchstart' in window ) {
			touchStartFn = function( e ) {
				var menuItem = this.parentNode;

				if ( ! menuItem.classList.contains( 'focus' ) ) {
					e.preventDefault();
					for( var i = 0; i < menuItem.parentNode.children.length; ++i ) {
						if ( menuItem === menuItem.parentNode.children[i] ) {
							continue;
						}
						menuItem.parentNode.children[i].classList.remove( 'focus' );
					}
					menuItem.classList.add( 'focus' );
				} else {
					menuItem.classList.remove( 'focus' );
				}
			};

			for ( var i = 0; i < parentLink.length; ++i ) {
				parentLink[i].addEventListener( 'touchstart', touchStartFn, false )
			}
		}
	}

	fixMenuTouchTaps( container );

} )( jQuery );
;
( function() {
	var is_webkit = navigator.userAgent.toLowerCase().indexOf( 'webkit' ) > -1,
	    is_opera  = navigator.userAgent.toLowerCase().indexOf( 'opera' )  > -1,
	    is_ie     = navigator.userAgent.toLowerCase().indexOf( 'msie' )   > -1;

	if ( ( is_webkit || is_opera || is_ie ) && document.getElementById && window.addEventListener ) {
		window.addEventListener( 'hashchange', function() {
			var element = document.getElementById( location.hash.substring( 1 ) );

			if ( element ) {
				if ( ! /^(?:a|select|input|button|textarea)$/i.test( element.tagName ) ) {
					element.tabIndex = -1;
				}
				element.focus();
			}
		}, false );
	}
})();
;
/* global screen_reader_text */
( function( $ ) {

	/**
	 * A function to add classes to body depending on window width.
	 */
	function body_class() {

		window_width = $( window ).width();
		$( 'body' ).removeClass( 'small-screen medium-screen large-screen' );
		if ( window_width >= 1020 ) {
			$( 'body' ).addClass( 'small-screen medium-screen large-screen' );
		} else if ( window_width >= 768 ) {
			$( 'body' ).addClass( 'small-screen medium-screen' );
		} else if ( window_width >= 600 ) {
			$( 'body' ).addClass( 'small-screen' );
		}

	}

	$( window ).load( function() {

		body_class();

		/* Add dropdown toggle to Custom Menus Widget items */
		$( '.widget_nav_menu ul:not([id^="menu-social"]) .page_item_has_children > a, .widget_nav_menu ul:not([id^="menu-social"]) .menu-item-has-children > a' ).after( '<button class="dropdown-toggle" aria-expanded="false">' + screen_reader_text.expand + '</button>' );

		/* Toggle child menu items */
		$( '.dropdown-toggle' ).click( function( e ) {
			e.preventDefault();
			$( this ).toggleClass( 'toggle-on' );
			$( this ).prev( 'a' ).toggleClass( 'toggle-on' );
			$( this ).next( '.children, .sub-menu' ).toggleClass( 'toggle-on' );
			$( this ).attr( 'aria-expanded', $( this ).attr( 'aria-expanded' ) === 'false' ? 'true' : 'false' );
			$( this ).html( $( this ).html() === screen_reader_text.expand ? screen_reader_text.collapse : screen_reader_text.expand )
		} );

	} ).resize( body_class );

} )( jQuery );
;
(function(){function a(a){function b(b,c,d,e,f,g){for(;f>=0&&f<g;f+=a){var h=e?e[f]:f;d=c(d,b[h],h,b)}return d}return function(c,d,e,f){d=t(d,f,4);var g=!A(c)&&s.keys(c),h=(g||c).length,i=a>0?0:h-1;return arguments.length<3&&(e=c[g?g[i]:i],i+=a),b(c,d,e,g,i,h)}}function b(a){return function(b,c,d){c=u(c,d);for(var e=z(b),f=a>0?0:e-1;f>=0&&f<e;f+=a)if(c(b[f],f,b))return f;return-1}}function c(a,b,c){return function(d,e,f){var g=0,h=z(d);if("number"==typeof f)a>0?g=f>=0?f:Math.max(f+h,g):h=f>=0?Math.min(f+1,h):f+h+1;else if(c&&f&&h)return f=c(d,e),d[f]===e?f:-1;if(e!==e)return f=b(k.call(d,g,h),s.isNaN),f>=0?f+g:-1;for(f=a>0?g:h-1;f>=0&&f<h;f+=a)if(d[f]===e)return f;return-1}}function d(a,b){var c=F.length,d=a.constructor,e=s.isFunction(d)&&d.prototype||h,f="constructor";for(s.has(a,f)&&!s.contains(b,f)&&b.push(f);c--;)f=F[c],f in a&&a[f]!==e[f]&&!s.contains(b,f)&&b.push(f)}var e=this,f=e._,g=Array.prototype,h=Object.prototype,i=Function.prototype,j=g.push,k=g.slice,l=h.toString,m=h.hasOwnProperty,n=Array.isArray,o=Object.keys,p=i.bind,q=Object.create,r=function(){},s=function(a){return a instanceof s?a:this instanceof s?void(this._wrapped=a):new s(a)};"undefined"!=typeof exports?("undefined"!=typeof module&&module.exports&&(exports=module.exports=s),exports._=s):e._=s,s.VERSION="1.8.3";var t=function(a,b,c){if(void 0===b)return a;switch(null==c?3:c){case 1:return function(c){return a.call(b,c)};case 2:return function(c,d){return a.call(b,c,d)};case 3:return function(c,d,e){return a.call(b,c,d,e)};case 4:return function(c,d,e,f){return a.call(b,c,d,e,f)}}return function(){return a.apply(b,arguments)}},u=function(a,b,c){return null==a?s.identity:s.isFunction(a)?t(a,b,c):s.isObject(a)?s.matcher(a):s.property(a)};s.iteratee=function(a,b){return u(a,b,1/0)};var v=function(a,b){return function(c){var d=arguments.length;if(d<2||null==c)return c;for(var e=1;e<d;e++)for(var f=arguments[e],g=a(f),h=g.length,i=0;i<h;i++){var j=g[i];b&&void 0!==c[j]||(c[j]=f[j])}return c}},w=function(a){if(!s.isObject(a))return{};if(q)return q(a);r.prototype=a;var b=new r;return r.prototype=null,b},x=function(a){return function(b){return null==b?void 0:b[a]}},y=Math.pow(2,53)-1,z=x("length"),A=function(a){var b=z(a);return"number"==typeof b&&b>=0&&b<=y};s.each=s.forEach=function(a,b,c){b=t(b,c);var d,e;if(A(a))for(d=0,e=a.length;d<e;d++)b(a[d],d,a);else{var f=s.keys(a);for(d=0,e=f.length;d<e;d++)b(a[f[d]],f[d],a)}return a},s.map=s.collect=function(a,b,c){b=u(b,c);for(var d=!A(a)&&s.keys(a),e=(d||a).length,f=Array(e),g=0;g<e;g++){var h=d?d[g]:g;f[g]=b(a[h],h,a)}return f},s.reduce=s.foldl=s.inject=a(1),s.reduceRight=s.foldr=a(-1),s.find=s.detect=function(a,b,c){var d;if(d=A(a)?s.findIndex(a,b,c):s.findKey(a,b,c),void 0!==d&&d!==-1)return a[d]},s.filter=s.select=function(a,b,c){var d=[];return b=u(b,c),s.each(a,function(a,c,e){b(a,c,e)&&d.push(a)}),d},s.reject=function(a,b,c){return s.filter(a,s.negate(u(b)),c)},s.every=s.all=function(a,b,c){b=u(b,c);for(var d=!A(a)&&s.keys(a),e=(d||a).length,f=0;f<e;f++){var g=d?d[f]:f;if(!b(a[g],g,a))return!1}return!0},s.some=s.any=function(a,b,c){b=u(b,c);for(var d=!A(a)&&s.keys(a),e=(d||a).length,f=0;f<e;f++){var g=d?d[f]:f;if(b(a[g],g,a))return!0}return!1},s.contains=s.includes=s.include=function(a,b,c,d){return A(a)||(a=s.values(a)),("number"!=typeof c||d)&&(c=0),s.indexOf(a,b,c)>=0},s.invoke=function(a,b){var c=k.call(arguments,2),d=s.isFunction(b);return s.map(a,function(a){var e=d?b:a[b];return null==e?e:e.apply(a,c)})},s.pluck=function(a,b){return s.map(a,s.property(b))},s.where=function(a,b){return s.filter(a,s.matcher(b))},s.findWhere=function(a,b){return s.find(a,s.matcher(b))},s.max=function(a,b,c){var d,e,f=-(1/0),g=-(1/0);if(null==b&&null!=a){a=A(a)?a:s.values(a);for(var h=0,i=a.length;h<i;h++)d=a[h],d>f&&(f=d)}else b=u(b,c),s.each(a,function(a,c,d){e=b(a,c,d),(e>g||e===-(1/0)&&f===-(1/0))&&(f=a,g=e)});return f},s.min=function(a,b,c){var d,e,f=1/0,g=1/0;if(null==b&&null!=a){a=A(a)?a:s.values(a);for(var h=0,i=a.length;h<i;h++)d=a[h],d<f&&(f=d)}else b=u(b,c),s.each(a,function(a,c,d){e=b(a,c,d),(e<g||e===1/0&&f===1/0)&&(f=a,g=e)});return f},s.shuffle=function(a){for(var b,c=A(a)?a:s.values(a),d=c.length,e=Array(d),f=0;f<d;f++)b=s.random(0,f),b!==f&&(e[f]=e[b]),e[b]=c[f];return e},s.sample=function(a,b,c){return null==b||c?(A(a)||(a=s.values(a)),a[s.random(a.length-1)]):s.shuffle(a).slice(0,Math.max(0,b))},s.sortBy=function(a,b,c){return b=u(b,c),s.pluck(s.map(a,function(a,c,d){return{value:a,index:c,criteria:b(a,c,d)}}).sort(function(a,b){var c=a.criteria,d=b.criteria;if(c!==d){if(c>d||void 0===c)return 1;if(c<d||void 0===d)return-1}return a.index-b.index}),"value")};var B=function(a){return function(b,c,d){var e={};return c=u(c,d),s.each(b,function(d,f){var g=c(d,f,b);a(e,d,g)}),e}};s.groupBy=B(function(a,b,c){s.has(a,c)?a[c].push(b):a[c]=[b]}),s.indexBy=B(function(a,b,c){a[c]=b}),s.countBy=B(function(a,b,c){s.has(a,c)?a[c]++:a[c]=1}),s.toArray=function(a){return a?s.isArray(a)?k.call(a):A(a)?s.map(a,s.identity):s.values(a):[]},s.size=function(a){return null==a?0:A(a)?a.length:s.keys(a).length},s.partition=function(a,b,c){b=u(b,c);var d=[],e=[];return s.each(a,function(a,c,f){(b(a,c,f)?d:e).push(a)}),[d,e]},s.first=s.head=s.take=function(a,b,c){if(null!=a)return null==b||c?a[0]:s.initial(a,a.length-b)},s.initial=function(a,b,c){return k.call(a,0,Math.max(0,a.length-(null==b||c?1:b)))},s.last=function(a,b,c){if(null!=a)return null==b||c?a[a.length-1]:s.rest(a,Math.max(0,a.length-b))},s.rest=s.tail=s.drop=function(a,b,c){return k.call(a,null==b||c?1:b)},s.compact=function(a){return s.filter(a,s.identity)};var C=function(a,b,c,d){for(var e=[],f=0,g=d||0,h=z(a);g<h;g++){var i=a[g];if(A(i)&&(s.isArray(i)||s.isArguments(i))){b||(i=C(i,b,c));var j=0,k=i.length;for(e.length+=k;j<k;)e[f++]=i[j++]}else c||(e[f++]=i)}return e};s.flatten=function(a,b){return C(a,b,!1)},s.without=function(a){return s.difference(a,k.call(arguments,1))},s.uniq=s.unique=function(a,b,c,d){s.isBoolean(b)||(d=c,c=b,b=!1),null!=c&&(c=u(c,d));for(var e=[],f=[],g=0,h=z(a);g<h;g++){var i=a[g],j=c?c(i,g,a):i;b?(g&&f===j||e.push(i),f=j):c?s.contains(f,j)||(f.push(j),e.push(i)):s.contains(e,i)||e.push(i)}return e},s.union=function(){return s.uniq(C(arguments,!0,!0))},s.intersection=function(a){for(var b=[],c=arguments.length,d=0,e=z(a);d<e;d++){var f=a[d];if(!s.contains(b,f)){for(var g=1;g<c&&s.contains(arguments[g],f);g++);g===c&&b.push(f)}}return b},s.difference=function(a){var b=C(arguments,!0,!0,1);return s.filter(a,function(a){return!s.contains(b,a)})},s.zip=function(){return s.unzip(arguments)},s.unzip=function(a){for(var b=a&&s.max(a,z).length||0,c=Array(b),d=0;d<b;d++)c[d]=s.pluck(a,d);return c},s.object=function(a,b){for(var c={},d=0,e=z(a);d<e;d++)b?c[a[d]]=b[d]:c[a[d][0]]=a[d][1];return c},s.findIndex=b(1),s.findLastIndex=b(-1),s.sortedIndex=function(a,b,c,d){c=u(c,d,1);for(var e=c(b),f=0,g=z(a);f<g;){var h=Math.floor((f+g)/2);c(a[h])<e?f=h+1:g=h}return f},s.indexOf=c(1,s.findIndex,s.sortedIndex),s.lastIndexOf=c(-1,s.findLastIndex),s.range=function(a,b,c){null==b&&(b=a||0,a=0),c=c||1;for(var d=Math.max(Math.ceil((b-a)/c),0),e=Array(d),f=0;f<d;f++,a+=c)e[f]=a;return e};var D=function(a,b,c,d,e){if(!(d instanceof b))return a.apply(c,e);var f=w(a.prototype),g=a.apply(f,e);return s.isObject(g)?g:f};s.bind=function(a,b){if(p&&a.bind===p)return p.apply(a,k.call(arguments,1));if(!s.isFunction(a))throw new TypeError("Bind must be called on a function");var c=k.call(arguments,2),d=function(){return D(a,d,b,this,c.concat(k.call(arguments)))};return d},s.partial=function(a){var b=k.call(arguments,1),c=function(){for(var d=0,e=b.length,f=Array(e),g=0;g<e;g++)f[g]=b[g]===s?arguments[d++]:b[g];for(;d<arguments.length;)f.push(arguments[d++]);return D(a,c,this,this,f)};return c},s.bindAll=function(a){var b,c,d=arguments.length;if(d<=1)throw new Error("bindAll must be passed function names");for(b=1;b<d;b++)c=arguments[b],a[c]=s.bind(a[c],a);return a},s.memoize=function(a,b){var c=function(d){var e=c.cache,f=""+(b?b.apply(this,arguments):d);return s.has(e,f)||(e[f]=a.apply(this,arguments)),e[f]};return c.cache={},c},s.delay=function(a,b){var c=k.call(arguments,2);return setTimeout(function(){return a.apply(null,c)},b)},s.defer=s.partial(s.delay,s,1),s.throttle=function(a,b,c){var d,e,f,g=null,h=0;c||(c={});var i=function(){h=c.leading===!1?0:s.now(),g=null,f=a.apply(d,e),g||(d=e=null)};return function(){var j=s.now();h||c.leading!==!1||(h=j);var k=b-(j-h);return d=this,e=arguments,k<=0||k>b?(g&&(clearTimeout(g),g=null),h=j,f=a.apply(d,e),g||(d=e=null)):g||c.trailing===!1||(g=setTimeout(i,k)),f}},s.debounce=function(a,b,c){var d,e,f,g,h,i=function(){var j=s.now()-g;j<b&&j>=0?d=setTimeout(i,b-j):(d=null,c||(h=a.apply(f,e),d||(f=e=null)))};return function(){f=this,e=arguments,g=s.now();var j=c&&!d;return d||(d=setTimeout(i,b)),j&&(h=a.apply(f,e),f=e=null),h}},s.wrap=function(a,b){return s.partial(b,a)},s.negate=function(a){return function(){return!a.apply(this,arguments)}},s.compose=function(){var a=arguments,b=a.length-1;return function(){for(var c=b,d=a[b].apply(this,arguments);c--;)d=a[c].call(this,d);return d}},s.after=function(a,b){return function(){if(--a<1)return b.apply(this,arguments)}},s.before=function(a,b){var c;return function(){return--a>0&&(c=b.apply(this,arguments)),a<=1&&(b=null),c}},s.once=s.partial(s.before,2);var E=!{toString:null}.propertyIsEnumerable("toString"),F=["valueOf","isPrototypeOf","toString","propertyIsEnumerable","hasOwnProperty","toLocaleString"];s.keys=function(a){if(!s.isObject(a))return[];if(o)return o(a);var b=[];for(var c in a)s.has(a,c)&&b.push(c);return E&&d(a,b),b},s.allKeys=function(a){if(!s.isObject(a))return[];var b=[];for(var c in a)b.push(c);return E&&d(a,b),b},s.values=function(a){for(var b=s.keys(a),c=b.length,d=Array(c),e=0;e<c;e++)d[e]=a[b[e]];return d},s.mapObject=function(a,b,c){b=u(b,c);for(var d,e=s.keys(a),f=e.length,g={},h=0;h<f;h++)d=e[h],g[d]=b(a[d],d,a);return g},s.pairs=function(a){for(var b=s.keys(a),c=b.length,d=Array(c),e=0;e<c;e++)d[e]=[b[e],a[b[e]]];return d},s.invert=function(a){for(var b={},c=s.keys(a),d=0,e=c.length;d<e;d++)b[a[c[d]]]=c[d];return b},s.functions=s.methods=function(a){var b=[];for(var c in a)s.isFunction(a[c])&&b.push(c);return b.sort()},s.extend=v(s.allKeys),s.extendOwn=s.assign=v(s.keys),s.findKey=function(a,b,c){b=u(b,c);for(var d,e=s.keys(a),f=0,g=e.length;f<g;f++)if(d=e[f],b(a[d],d,a))return d},s.pick=function(a,b,c){var d,e,f={},g=a;if(null==g)return f;s.isFunction(b)?(e=s.allKeys(g),d=t(b,c)):(e=C(arguments,!1,!1,1),d=function(a,b,c){return b in c},g=Object(g));for(var h=0,i=e.length;h<i;h++){var j=e[h],k=g[j];d(k,j,g)&&(f[j]=k)}return f},s.omit=function(a,b,c){if(s.isFunction(b))b=s.negate(b);else{var d=s.map(C(arguments,!1,!1,1),String);b=function(a,b){return!s.contains(d,b)}}return s.pick(a,b,c)},s.defaults=v(s.allKeys,!0),s.create=function(a,b){var c=w(a);return b&&s.extendOwn(c,b),c},s.clone=function(a){return s.isObject(a)?s.isArray(a)?a.slice():s.extend({},a):a},s.tap=function(a,b){return b(a),a},s.isMatch=function(a,b){var c=s.keys(b),d=c.length;if(null==a)return!d;for(var e=Object(a),f=0;f<d;f++){var g=c[f];if(b[g]!==e[g]||!(g in e))return!1}return!0};var G=function(a,b,c,d){if(a===b)return 0!==a||1/a===1/b;if(null==a||null==b)return a===b;a instanceof s&&(a=a._wrapped),b instanceof s&&(b=b._wrapped);var e=l.call(a);if(e!==l.call(b))return!1;switch(e){case"[object RegExp]":case"[object String]":return""+a==""+b;case"[object Number]":return+a!==+a?+b!==+b:0===+a?1/+a===1/b:+a===+b;case"[object Date]":case"[object Boolean]":return+a===+b}var f="[object Array]"===e;if(!f){if("object"!=typeof a||"object"!=typeof b)return!1;var g=a.constructor,h=b.constructor;if(g!==h&&!(s.isFunction(g)&&g instanceof g&&s.isFunction(h)&&h instanceof h)&&"constructor"in a&&"constructor"in b)return!1}c=c||[],d=d||[];for(var i=c.length;i--;)if(c[i]===a)return d[i]===b;if(c.push(a),d.push(b),f){if(i=a.length,i!==b.length)return!1;for(;i--;)if(!G(a[i],b[i],c,d))return!1}else{var j,k=s.keys(a);if(i=k.length,s.keys(b).length!==i)return!1;for(;i--;)if(j=k[i],!s.has(b,j)||!G(a[j],b[j],c,d))return!1}return c.pop(),d.pop(),!0};s.isEqual=function(a,b){return G(a,b)},s.isEmpty=function(a){return null==a||(A(a)&&(s.isArray(a)||s.isString(a)||s.isArguments(a))?0===a.length:0===s.keys(a).length)},s.isElement=function(a){return!(!a||1!==a.nodeType)},s.isArray=n||function(a){return"[object Array]"===l.call(a)},s.isObject=function(a){var b=typeof a;return"function"===b||"object"===b&&!!a},s.each(["Arguments","Function","String","Number","Date","RegExp","Error"],function(a){s["is"+a]=function(b){return l.call(b)==="[object "+a+"]"}}),s.isArguments(arguments)||(s.isArguments=function(a){return s.has(a,"callee")}),"function"!=typeof/./&&"object"!=typeof Int8Array&&(s.isFunction=function(a){return"function"==typeof a||!1}),s.isFinite=function(a){return isFinite(a)&&!isNaN(parseFloat(a))},s.isNaN=function(a){return s.isNumber(a)&&a!==+a},s.isBoolean=function(a){return a===!0||a===!1||"[object Boolean]"===l.call(a)},s.isNull=function(a){return null===a},s.isUndefined=function(a){return void 0===a},s.has=function(a,b){return null!=a&&m.call(a,b)},s.noConflict=function(){return e._=f,this},s.identity=function(a){return a},s.constant=function(a){return function(){return a}},s.noop=function(){},s.property=x,s.propertyOf=function(a){return null==a?function(){}:function(b){return a[b]}},s.matcher=s.matches=function(a){return a=s.extendOwn({},a),function(b){return s.isMatch(b,a)}},s.times=function(a,b,c){var d=Array(Math.max(0,a));b=t(b,c,1);for(var e=0;e<a;e++)d[e]=b(e);return d},s.random=function(a,b){return null==b&&(b=a,a=0),a+Math.floor(Math.random()*(b-a+1))},s.now=Date.now||function(){return(new Date).getTime()};var H={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#x27;","`":"&#x60;"},I=s.invert(H),J=function(a){var b=function(b){return a[b]},c="(?:"+s.keys(a).join("|")+")",d=RegExp(c),e=RegExp(c,"g");return function(a){return a=null==a?"":""+a,d.test(a)?a.replace(e,b):a}};s.escape=J(H),s.unescape=J(I),s.result=function(a,b,c){var d=null==a?void 0:a[b];return void 0===d&&(d=c),s.isFunction(d)?d.call(a):d};var K=0;s.uniqueId=function(a){var b=++K+"";return a?a+b:b},s.templateSettings={evaluate:/<%([\s\S]+?)%>/g,interpolate:/<%=([\s\S]+?)%>/g,escape:/<%-([\s\S]+?)%>/g};var L=/(.)^/,M={"'":"'","\\":"\\","\r":"r","\n":"n","\u2028":"u2028","\u2029":"u2029"},N=/\\|'|\r|\n|\u2028|\u2029/g,O=function(a){return"\\"+M[a]};s.template=function(a,b,c){!b&&c&&(b=c),b=s.defaults({},b,s.templateSettings);var d=RegExp([(b.escape||L).source,(b.interpolate||L).source,(b.evaluate||L).source].join("|")+"|$","g"),e=0,f="__p+='";a.replace(d,function(b,c,d,g,h){return f+=a.slice(e,h).replace(N,O),e=h+b.length,c?f+="'+\n((__t=("+c+"))==null?'':_.escape(__t))+\n'":d?f+="'+\n((__t=("+d+"))==null?'':__t)+\n'":g&&(f+="';\n"+g+"\n__p+='"),b}),f+="';\n",b.variable||(f="with(obj||{}){\n"+f+"}\n"),f="var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};\n"+f+"return __p;\n";try{var g=new Function(b.variable||"obj","_",f)}catch(h){throw h.source=f,h}var i=function(a){return g.call(this,a,s)},j=b.variable||"obj";return i.source="function("+j+"){\n"+f+"}",i},s.chain=function(a){var b=s(a);return b._chain=!0,b};var P=function(a,b){return a._chain?s(b).chain():b};s.mixin=function(a){s.each(s.functions(a),function(b){var c=s[b]=a[b];s.prototype[b]=function(){var a=[this._wrapped];return j.apply(a,arguments),P(this,c.apply(s,a))}})},s.mixin(s),s.each(["pop","push","reverse","shift","sort","splice","unshift"],function(a){var b=g[a];s.prototype[a]=function(){var c=this._wrapped;return b.apply(c,arguments),"shift"!==a&&"splice"!==a||0!==c.length||delete c[0],P(this,c)}}),s.each(["concat","join","slice"],function(a){var b=g[a];s.prototype[a]=function(){return P(this,b.apply(this._wrapped,arguments))}}),s.prototype.value=function(){return this._wrapped},s.prototype.valueOf=s.prototype.toJSON=s.prototype.value,s.prototype.toString=function(){return""+this._wrapped},"function"==typeof define&&define.amd&&define("underscore",[],function(){return s})}).call(this);;
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
	var __autoCacheBusterNotesPanel = '@automattic/jetpack-blocks@13.1.0-1381-gbdb1572270';
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
jQuery(document).ready( function($){

	var tosform = {};
	tosform.loaded = false;

	tosform.setup  = function() {

		tosform.report_type ='';
		tosform.ajaxurl = wpcom_tos_report_form.ajaxurl;
		tosform.isLoggedoutUser = wpcom_tos_report_form.isLoggedoutUser;

		tosform.$step1 = $( '#report-step-1' );
		tosform.$types = tosform.$step1.find( 'input:radio' );
		tosform.$step2 = $( '#report-step-2' );
		tosform.$step2_details = $( '.step-2-details' );
		tosform.$next = $( '#step1-submit' );
		tosform.$submit = $( '#step2-submit' );
		tosform.$report_url = $('#report-url');
		tosform.$report_email = $('#report-email');
		tosform.$step3 = $( '#report-confirm' );
		tosform.$step3_error = $( '#report-error' );

		tosform.$step3.hide();
		tosform.$step3_error.hide();
		tosform.$step2.hide();
		tosform.$step1.show();
		tosform.$step2_details.hide();
		tosform.$types.attr( 'checked', false );
		tosform.$next.attr( 'disabled', true );
		tosform.$submit.attr( 'disabled', true );
	}

	tosform.setup();

	tosform.setup_step2 = function() {
		$( '#report-step-1' ).fadeOut( 'fast', function(){
			tosform.report_type = tosform.$types.filter( ':checked' ).val();
			tosform.$step2.fadeIn( 'fast' );
			// Show step 2 description depending on type of report
			tosform.$step2_details.hide();
			if( tosform.report_type == 'copyright' )
				$('#step2-submit').hide();
			$( '#step-2-' + tosform.report_type).show();
			$( '#TB_ajaxContent' ).css( 'height', 'auto' );

		});
	}

	// Enable continue button when an option is selected, if url has been entered and the email is available
	$(document).on( 'change.tos_report_form', '#report-step-1 input:radio', function(){
		tosform.report_type = tosform.$types.filter( ':checked' ).val();
		if ( $.trim( tosform.$report_url.val() ).length != 0 && tosform.report_type.length != 0 && $.trim( tosform.$report_email.val() ).length != 0 )
			tosform.$next.attr( 'disabled', false );
		else
			tosform.$next.attr( 'disabled', true );
	});

	// Enable continue button when a url has been entered, if an option has been selected and the email is available
	$(document).on( 'change.tos_report_form', '#report-url', function(){
		if ( $.trim( tosform.$report_url.val() ).length != 0 && tosform.report_type.length != 0 && $.trim( tosform.$report_email.val() ).length != 0 )
			tosform.$next.attr( 'disabled', false );
		else
			tosform.$next.attr( 'disabled', true );
	});

	// Enable continue button when an email has been entered, if an option is selected and url  has been entered
	$(document).on( 'change.tos_report_form', '#report-email', function(){
		if ( $.trim( tosform.$report_url.val() ).length != 0 && tosform.report_type.length != 0 && $.trim( tosform.$report_email.val() ).length != 0 )
			tosform.validateUrl( tosform.$report_url.val() );
		else
			tosform.$next.attr( 'disabled', true );
	});

	// Move to step 2
	$(document).on( 'click.tos_report_form', '#step1-submit', function(){
		if( tosform.isLoggedoutUser) {
			$('#step1-submit').val('validating..');
			$.ajax( {
				url: tosform.ajaxurl,
				type : 'POST',
				dataType: 'json',
				data : {
					action: 'tos_validate_report_fields',
					report_url: $.trim( tosform.$report_url.val() ),
					report_email: $.trim( tosform.$report_email.val() )
				},
				success: function( errorMessages ) {
					$( '#tos-email-error-message' ).empty();
					$( '#tos-url-error-message' ).empty();
					if( Object.keys(errorMessages.errors).length === 0 ) {
						tosform.setup_step2();
					} else {
						if( typeof errorMessages.errors.email_error_message != 'undefined' )
							$( '#tos-email-error-message' ).append( '<p>' + errorMessages.errors.email_error_message + '</p>' );
						if( typeof errorMessages.errors.url_error_message != 'undefined' )
							$( '#tos-url-error-message' ).append( '<p>' + errorMessages.errors.url_error_message + '</p>' );
						$( '#step1-submit' ).val( 'Submit' );
					}
				}
			});
		} else {
			tosform.setup_step2();
		}

	});

	// Enable form submission when reason textarea is field
	$(document).on( 'change.tos_report_form input.tos_report_form paste.tos_report_form', 'textarea.step-2-confirm', function(){
		if ( $.trim( $(this).val() ).length != 0 )
			tosform.$submit.attr( 'disabled', false );
		else
			tosform.$submit.attr( 'disabled', true );
	});

	// close window on cancel button click or overlay click
	$(document).on( 'click.tos_report_form', '#TB_ajaxContent .tosform-cancel, #TB_overlay', function(e) {
		//e.preventDefault();
		tb_remove();
	});

	// close window on 'esc' keypress
	$(document).keyup( function(e) {
		if ( e.keyCode == 27 ) {
			tb_remove();
		}
	});

	// Open form function
	var openForm = function(e){
		e.preventDefault();
		tb_show( wpcom_tos_report_form.report_this_content, '#TB_inline?width=auto&inlineId=report-form-window&modal=true', '' );

		$( '#TB_window, #TB_overlay, #TB_load, #TB_ajaxContent' ).addClass( 'tos-report-form' );

		var $tb_ajax_content = $( '#TB_ajaxContent.tos-report-form' );

		if ( ! tosform.loaded ) {
			$tb_ajax_content.spin( 'large' );
			$.ajax( {
				url: tosform.ajaxurl,
				data : {
					action: 'tos_form',
					post_id: wpcom_tos_report_form.post_ID,
					report_url: wpcom_tos_report_form.current_url
				},
				success: function( form ) {
					$( '#TB_ajaxContent' ).html( form ).css( 'height', 'auto' );
					tosform.setup();
					tosform.loaded = true;
				},
				xhrFields: {
					withCredentials: true
				}
			} );
		} else {
			$tb_ajax_content.find( '.spinner' ).remove();
			tosform.setup();
		}

		return false;
	};
	
	// open the form
	$(document).on( 'click.tos_report_form', '#wp-admin-bar-wpcom_report_url', openForm );
	$(document).on( 'click.tos_report_form', '.flb-report a', openForm );
	
	// submit the form
	$(document).on( 'submit.tos_report_form', '#report-form', function(e){
		e.preventDefault();

		// set the reason according to the form type
		$( '#report-form input[name=reason]' ).val( $( '#confirm-' + tosform.report_type ).val() );
		var formData = $( '#report-form' ).serialize();
		$.ajax( {
			url: tosform.ajaxurl,
			data : formData,
			type : 'POST',
			success: function(result) {
				if ( result.success == true ) {
					tosform.$step2.hide();
					tosform.$step3.show();
				}
				else {
					tosform.$step2.hide();
					tosform.$step3_error.show();
				}
			},
			xhrFields: {
				withCredentials: true
			}
		});
		
		$( '#TB_ajaxContent.tos-report-form' ).spin( 'large' );

		setTimeout(function(){
			tb_remove();
		}, 2000);

	})

});
;
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
var wpcom = window.wpcom || {};
wpcom.actionbar = {};
wpcom.actionbar.data = actionbardata;

// This might be better in another file, but is here for now
(function($){
	var fbd = wpcom.actionbar.data,
			d = document,
			docHeight = $( d ).height(),
			b = d.getElementsByTagName( 'body' )[0],
			lastScrollTop = 0,
			lastScrollDir, fb, fhtml, fbhtml, fbHtmlLi,
			followingbtn, followbtn, fbdf, action,
			slkhtml = '', foldhtml = '', reporthtml = '',
			customizeIcon, editIcon, statsIcon, themeHtml = '', signupHtml = '', loginHtml = '',
			viewReaderHtml = '', editSubsHtml = '', editFollowsHtml = '',
			toggleactionbar, $actionbar;

	// Don't show actionbar when iframed
	if ( window != window.top ) {
		return;
	}

	fhtml = '<ul>';

	// Customize Icon
	customizeIcon = '<svg class="gridicon gridicon__customize" height="20px" width="20px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g><path d="M2 6c0-1.505.78-3.08 2-4 0 .845.69 2 2 2 1.657 0 3 1.343 3 3 0 .386-.08.752-.212 1.09.74.594 1.476 1.19 2.19 1.81L8.9 11.98c-.62-.716-1.214-1.454-1.807-2.192C6.753 9.92 6.387 10 6 10c-2.21 0-4-1.79-4-4zm12.152 6.848l1.34-1.34c.607.304 1.283.492 2.008.492 2.485 0 4.5-2.015 4.5-4.5 0-.725-.188-1.4-.493-2.007L18 9l-2-2 3.507-3.507C18.9 3.188 18.225 3 17.5 3 15.015 3 13 5.015 13 7.5c0 .725.188 1.4.493 2.007L3 20l2 2 6.848-6.848c1.885 1.928 3.874 3.753 5.977 5.45l1.425 1.148 1.5-1.5-1.15-1.425c-1.695-2.103-3.52-4.092-5.448-5.977z" data-reactid=".2.1.1:0.1b.0"></path></g></svg>';

	if ( fbd.canCustomizeSite && fbd.isLoggedIn ) {
		fhtml += '<li class="actnbr-btn actnbr-customize"><a href="'+ fbd.customizeLink +'">' + customizeIcon + '<span>' + fbd.i18n.customize + '<span></a></li>';
	}

	// Edit Icon
	editIcon = '<svg class="gridicon gridicon__pencil" height="20px" width="20px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g><path d="M13 6l5 5-9.507 9.507c-.686-.686-.69-1.794-.012-2.485l-.002-.003c-.69.676-1.8.673-2.485-.013-.677-.677-.686-1.762-.036-2.455l-.008-.008c-.694.65-1.78.64-2.456-.036L13 6zm7.586-.414l-2.172-2.172c-.78-.78-2.047-.78-2.828 0L14 5l5 5 1.586-1.586c.78-.78.78-2.047 0-2.828zM3 18v3h3c0-1.657-1.343-3-3-3z"></path></g></svg>';

	if ( fbd.canEditPost ) {
		fhtml += '<li class="actnbr-btn actnbr-edit"><a href="'+ fbd.editLink +'">' + editIcon + '<span>' + fbd.i18n.edit + '</span></a></li>';
	}

	// Stats Icon
	statsIcon = '<svg class="gridicon gridicon__stats-alt" height="20px" width="20px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g><path d="M21,21H3v-2h18V21z M8,10H4v7h4V10z M14,3h-4v14h4V3z M20,6h-4v11h4V6z"/></path></g></svg>';

	if ( fbd.canEditPost ) {
		fhtml += '<li class="actnbr-btn actnbr-stats"><a href="'+ fbd.statsLink +'">' + statsIcon + '<span>' + fbd.i18n.stats + '</span></a></li>';
	}

	// Follow/Unfollow Icon
	followingbtn = '<svg class="gridicon gridicon__following" height="24px" width="24px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g><path d="M23 13.482L15.508 21 12 17.4l1.412-1.388 2.106 2.188 6.094-6.094L23 13.482zm-7.455 1.862L20 10.89V2H2v14c0 1.1.9 2 2 2h4.538l4.913-4.832 2.095 2.176zM8 13H4v-1h4v1zm3-2H4v-1h7v1zm0-2H4V8h7v1zm7-3H4V4h14v2z"/></g></svg>';
	followbtn = '<svg class="gridicon gridicon__follow" height="24px" width="24px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g><path d="M23 16v2h-3v3h-2v-3h-3v-2h3v-3h2v3h3zM20 2v9h-4v3h-3v4H4c-1.1 0-2-.9-2-2V2h18zM8 13v-1H4v1h4zm3-3H4v1h7v-1zm0-2H4v1h7V8zm7-4H4v2h14V4z"/></g></svg>';

	fbhtml = '<a class="actnbr-action actnbr-actn-follow" href="">' + followbtn + '<span>' + fbd.i18n.follow + '</span></a>';
	if ( fbd.isFollowing ) {
		fbhtml = '<a class="actnbr-action actnbr-actn-following" href="">' + followingbtn + '<span>' + fbd.i18n.following + '</span></a>';
	}

	// Show follow/unfollow icon on top level, when this is not your own site
	if ( fbd.canFollow && ! ( fbd.canEditPost || fbd.canCustomizeSite ) ) {
		fhtml += '<li class="actnbr-btn actnbr-hidden"> \
			    	' + fbhtml + ' \
			    	<div class="actnbr-popover tip tip-top-left actnbr-notice"> \
			    		<div class="tip-arrow"></div> \
			    		<div class="tip-inner actnbr-follow-bubble"></div> \
			    	</div> \
			    </li>';
	}

	if ( ! fbd.canCustomizeSite ) {
		// Report Link
		reporthtml = '<li class="flb-report"><a href="http://en.wordpress.com/abuse/">' + fbd.i18n.report + '</a></li>';
	}

	// Show shortlink on single posts
	if ( fbd.isSingular ) {
		slkhtml = '<li class="actnbr-shortlink"><a href="' + fbd.shortlink + '">' + fbd.i18n.shortlink + '</a></li>'
	}

	// Set up fold/unfold menu item
	foldhtml = '<li class="actnbr-fold"><a href="">' + fbd.i18n.foldBar + '</a></li>'
	if ( fbd.isFolded ) {
		foldhtml = '<li class="actnbr-fold"><a href="">' + fbd.i18n.unfoldBar + '</a></li>'
	}
	if ( ! fbd.isLoggedIn && ! fbd.canFollow ) {
		foldhtml = '';
	}

	if ( fbd.isLoggedIn ) {
		if ( '' != fbd.themeURL ) {
			themeHtml = '<li class="actnbr-theme"><a href="' + fbd.themeURL + '">' + fbd.i18n.themeInfo.replace( /{theme}/, fbd.themeName ) + '</a></li>';
		}
		if ( fbd.canFollow ) {
			if ( fbd.isSingular ) {
				viewReaderHtml = '<li class="actnbr-reader"><a href="https://wordpress.com/read/blogs/' + fbd.siteID + '/posts/' + fbd.postID +'">' + fbd.i18n.viewReadPost + '</a></li>';
			} else {
				viewReaderHtml = '<li class="actnbr-reader"><a href="https://wordpress.com/read/' + ( fbd.feedID ? 'feeds/' + fbd.feedID : 'blogs/' + fbd.siteID ) + '">' + fbd.i18n.viewReader + '</a></li>';
			}
		}
		editFollowsHtml = '<li class="actnbr-follows"><a href="https://wordpress.com/following/edit">' + fbd.i18n.editSubs + '</a></li>';
	} else {
		loginHtml += '<li class="actnbr-login"><a href="' + fbd.loginURL + '">' + fbd.i18n.login + '</a></li>';
		signupHtml = '<li class="actnbr-signup"><a href="' + fbd.signupURL + '">' + fbd.i18n.signup + '</a></li>';
		editSubsHtml = '<li class="actnbr-subs"><a href="https://subscribe.wordpress.com/">' + fbd.i18n.editSubs + '</a></li>';
	}

	// Hide follow/unfollow completely for static sites, and sites not allowing followers (VIP, private, etc).
	if ( ! fbd.canFollow ) {
		fbHtmlLi = '';
	} else {
		fbHtmlLi = '<li class="actnbr-folded-follow">' + fbhtml + '</li>';
	}

	// Ellipsis Menu
	fhtml += '<li class="actnbr-ellipsis actnbr-hidden"> \
			  <svg class="gridicon gridicon__ellipsis" height="24" width="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g><circle cx="5" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="12" cy="12" r="2"/></g></svg> \
			  <div class="actnbr-popover tip tip-top-left actnbr-more"> \
			  	<div class="tip-arrow"></div> \
			  	<div class="tip-inner"> \
				  <ul> \
				    <li class="actnbr-sitename"><a href="' + fbd.siteURL + '">' + fbd.icon + ' ' + actionBarEscapeHtml( fbd.siteName ) + '</a></li> \
				   	<li class="actnbr-folded-customize"><a href="'+ fbd.customizeLink +'">' + customizeIcon + '<span>' + fbd.i18n.customize + '<span></a></li> \
				    ' + fbHtmlLi + ' \
					' + signupHtml + ' \
				    ' + loginHtml + ' \
				    ' + themeHtml + ' \
				    ' + slkhtml + ' \
				    ' + reporthtml + ' \
				    ' + viewReaderHtml + ' \
				    ' + editFollowsHtml + ' \
				    ' + editSubsHtml + ' \
				    ' + foldhtml + ' \
			      </ul> \
			    </div> \
		      </div> \
		    </li> \
	      </ul>';

	fbdf = d.createElement( 'div' );
	fbdf.id = 'actionbar';
	fbdf.innerHTML = fhtml;
	b.appendChild( fbdf );

	$actionbar = $( '#actionbar' ).addClass( 'actnbr-' + fbd.themeSlug.replace( '/', '-' ) );

	// Add classes based on contents
	if ( fbd.canCustomizeSite ) {
		$actionbar.addClass( 'actnbr-has-customize' );
	}

	if ( fbd.canEditPost ) {
		$actionbar.addClass( 'actnbr-has-edit' );
	}

	if ( ! fbd.canCustomizeSite ) {
		$actionbar.addClass( 'actnbr-has-follow' );
	}

	if ( fbd.isFolded ) {
		$actionbar.addClass( 'actnbr-folded' );
	}

	// Show status message if available
	if ( fbd.statusMessage ) {
		showActionBarStatusMessage( fbd.statusMessage );
	}

	// *** Actions *****************

	// Follow Site
	$actionbar.on(  'click', '.actnbr-actn-follow', function(e) {
		e.preventDefault();

		if ( fbd.isLoggedIn ) {
			showActionBarStatusMessage( '<div class="actnbr-reader">' + fbd.i18n.followedText + '</div>' );
			bumpStat( 'followed' );
			var eventProps = {
				'follow_source': 'actionbar',
				'url': fbd.siteURL
			};
			recordTracksEvent( 'wpcom_actionbar_site_followed', eventProps );

			request( 'ab_subscribe_to_blog' );
		} else {
			showActionBarFollowForm();
		}
	} )

	// UnFollow Site
	.on(  'click', '.actnbr-actn-following', function(e) {
		e.preventDefault();
		$( '#actionbar .actnbr-actn-following' ).replaceWith( '<a class="actnbr-action actnbr-actn-follow" href="">' + followbtn + '<span>' + fbd.i18n.follow + '</span></a>' );

		bumpStat( 'unfollowed' );
		var eventProps = {
			'follow_source': 'actionbar',
			'url': fbd.siteURL
		};
		recordTracksEvent( 'wpcom_actionbar_site_unfollowed', eventProps );

		request( 'ab_unsubscribe_from_blog' );
	} )

	// Show shortlink prompt
	.on( 'click', '.actnbr-shortlink a', function(e) {
		e.preventDefault();
		window.prompt( "Shortlink: ", fbd.shortlink );
	} )

	// Toggle more menu
	.on( 'click', '.actnbr-ellipsis', function(e) {
		if ( $( e.target ).closest( 'a' ).hasClass( 'actnbr-action' ) ) {
			return false;
		}

		var popoverLi = $( '#actionbar .actnbr-ellipsis' );
		popoverLi.toggleClass( 'actnbr-hidden' );

		setTimeout( function() {
			if ( ! popoverLi.hasClass( 'actnbr-hidden' ) ) {
				bumpStat( 'show_more_menu' );

				$( document ).on( 'click.actnbr-body-click', function() {
					popoverLi.addClass( 'actnbr-hidden' );

					$( document ).off( 'click.actnbr-body-click' );
				} );
			}
		}, 10 );
	})

	// Fold/Unfold
	.on( 'click', '.actnbr-fold', function(e) {
		e.preventDefault();

		if ( $( '#actionbar' ).hasClass( 'actnbr-folded' ) ) {
			$( '.actnbr-fold a' ).html( fbd.i18n.foldBar );
			$( '#actionbar' ).removeClass( 'actnbr-folded' );

			$.post( fbd.xhrURL, { 'action': 'unfold_actionbar' } );
		} else {
			$( '.actnbr-fold a' ).html( fbd.i18n.unfoldBar );
			$( '#actionbar' ).addClass( 'actnbr-folded' );

			$.post( fbd.xhrURL, { 'action': 'fold_actionbar' } );
		}
	})

	// Record stats for clicks
	.on( 'click', '.actnbr-sitename a', createStatsBumperEventHandler( 'clicked_site_title' ) )
	.on( 'click', '.actnbr-customize a', createStatsBumperEventHandler( 'customized' ) )
	.on( 'click', '.actnbr-folded-customize a', createStatsBumperEventHandler( 'customized' ) )
	.on( 'click', '.actnbr-theme a', createStatsBumperEventHandler( 'explored_theme' ) )
	.on( 'click', '.actnbr-edit a', createStatsBumperEventHandler( 'edited' ) )
	.on( 'click', '.actnbr-stats a', createStatsBumperEventHandler( 'clicked_stats' ) )
	.on( 'click', '.flb-report a', createStatsBumperEventHandler( 'reported_content' ) )
	.on( 'click', '.actnbr-follows a', createStatsBumperEventHandler( 'managed_following' ) )
	.on( 'click', '.actnbr-shortlink a', function() {
		bumpStat( 'copied_shortlink' );
	} )
	.on( 'click', '.actnbr-reader a', createStatsBumperEventHandler( 'view_reader' ) )
	.on( 'submit', '.actnbr-follow-bubble form', createStatsBumperEventHandler( 'submit_follow_form', function() {
		$( '#actionbar .actnbr-follow-bubble form button' ).attr( 'disabled', true );
	} ) )
	.on( 'click', '.actnbr-login-nudge a', createStatsBumperEventHandler( 'clicked_login_nudge' ) )
	.on( 'click', '.actnbr-signup a', createStatsBumperEventHandler( 'clicked_signup_link' ) )
	.on( 'click', '.actnbr-login a', createStatsBumperEventHandler( 'clicked_login_link' ) )
	.on( 'click', '.actnbr-subs a', createStatsBumperEventHandler( 'clicked_manage_subs_link' ) );

	// Make Follow/Unfollow requests
	var request = function( action ) {
		$.post( fbd.xhrURL, {
			'action': action,
			'_wpnonce': fbd.nonce,
			'source': 'actionbar',
			'blog_id': fbd.siteID
		});
	};

	// Show/Hide actionbar on scroll
	fb = $('#actionbar');
	toggleactionbar = function() {
		var st = $(window).scrollTop(),
			topOffset = 0;

		if ( $(window).scrollTop() < 0 ) {
			return;
		}

		// Still
		if ( lastScrollTop == 0 || ( ( st == lastScrollTop ) && lastScrollDir == 'up' ) ) {
			fb.removeClass( 'actnbr-hidden' );

		// Moving
		} else {
			 // Scrolling Up
		    if ( st < lastScrollTop ){
				fb.removeClass( 'actnbr-hidden' );
				lastScrollDir = 'up';

			// Scrolling Down
			} else {
				// check if there are any popovers open, and only hide action bar if not
				if ( $( '#actionbar > ul > li:not(.actnbr-hidden) > .actnbr-popover' ).length === 0 ) {
					fb.addClass( 'actnbr-hidden' );
					lastScrollDir = 'down';

					// Hide any menus
					$( '#actionbar li' ).addClass( 'actnbr-hidden' );
				}
			}
		}

		lastScrollTop = st;
	};
	setInterval( toggleactionbar, 100 );

	var bumpStat = function( stat ) {
		return $.post( fbd.xhrURL, {
			'action': 'actionbar_stats',
			'stat': stat
		} );
	};

	var recordTracksEvent =	function( eventName, eventProps ) {
		eventProps = eventProps || {};
		window._tkq = window._tkq || [];
		window._tkq.push( [ 'recordEvent', eventName, eventProps ] );
	};

	/**
	 * A factory method for creating an event handler function that will bump a specific stat and ONLY THEN re-dispatch
	 * the event. This will ensure that the bumped stat is indeed recorded before navigating the page away, as otherwise
	 * some browsers may very well decide to cancel the stat request in that case.
	 *
	 * @param {String} stat the name of the stat to bump
	 * @param {Function} additionalEffect an additional function that should be called after the stat is bumped
	 */
	function createStatsBumperEventHandler( stat, additionalEffect ) {
		var completedEvents = {};

		return function eventHandler( event ) {
			if ( completedEvents[ event.timeStamp ] ) {
				delete completedEvents[ event.timeStamp ];

				// hack-around to submit forms, dispatching "submit" event is not enough for them
				if ( event.type === 'submit' ) {
					event.target.submit();
				}

				if ( typeof additionalEffect === 'function' ) {
					return additionalEffect( event );
				}

				return true;
			}

			event.preventDefault();
			event.stopPropagation();

			function dispatchOriginalEvent() {
				var newEvent;

				// Retrieves the native event object created by the browser from the jQuery event object
				var originalEvent = event.originalEvent;

				/**
				 * Handles Internet Explorer that doesn't support Event nor CustomEvent constructors
				 *
				 * @see https://developer.mozilla.org/en-US/docs/Web/API/Event/Event
				 * @see https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent
				 * @see https://stackoverflow.com/questions/26596123/internet-explorer-9-10-11-event-constructor-doesnt-work/
				 */
				if ( typeof window.CustomEvent !== 'function' ) {
					newEvent = document.createEvent( 'CustomEvent' );
					newEvent.initCustomEvent(
						originalEvent.type,
						originalEvent.bubbles,
						originalEvent.cancelable,
						originalEvent.detail
					);
				} else {
					newEvent = new originalEvent.constructor( originalEvent.type, originalEvent );
				}

				completedEvents[ newEvent.timeStamp ] = true;

				originalEvent.target.dispatchEvent( newEvent );
			}

			bumpStat( stat ).then( dispatchOriginalEvent, dispatchOriginalEvent );
		}
	}

	function actionBarEscapeHtml(string) {
		return String(string).replace(/[&<>"'\/]/g, function (s) {
			var entityMap = {
				"&": "&amp;",
				"<": "&lt;",
				">": "&gt;",
				'"': '&quot;',
				"'": '&#39;',
				"/": '&#x2F;'
			};
			return entityMap[s];
		});
	}

	function showActionBarStatusMessage( message ) {
		$( '#actionbar .actnbr-actn-follow' ).replaceWith( '<a class="actnbr-action actnbr-actn-following" href="">' + followingbtn + '<span>' + fbd.i18n.following + '</span></a>' );
		$( '#actionbar .actnbr-follow-bubble' ).html( ' \
			<ul> \
				<li class="actnbr-sitename"><a href="' + fbd.siteURL + '">' + fbd.icon + ' ' + actionBarEscapeHtml( fbd.siteName ) + '</a></li> \
				<li class="actnbr-message">' + message + '</li> \
			</ul> \
		');

		var btn = $( '#actionbar .actnbr-btn' );
		btn.removeClass( 'actnbr-hidden' );

		setTimeout( function() {
			if ( ! btn.hasClass( 'actnbr-hidden' ) ) {
				$( '#actionbar .actnbr-email-field' ).focus();
				$( document ).on( 'click.actnbr-body-click', function(e) {
					if ( $( e.target ).closest( '.actnbr-popover' )[0] ) {
						return;
					}
					btn.addClass( 'actnbr-hidden' );
					$( document ).off( 'click.actnbr-body-click' );
				} );
			}
		}, 10 );
	}

	function showActionBarFollowForm() {
		var btn = $( '#actionbar .actnbr-btn' );
		btn.toggleClass( 'actnbr-hidden' );

		var form = $('<form>');

		if ( fbd.i18n.followers ) {
			form.append( $( '<div class="actnbr-follow-count">' ).html( fbd.i18n.followers ) );
		}

		form.append($('<div>').append($('<input>').attr({"type": "email", "name": "email", "placeholder": fbd.i18n.enterEmail, "class": "actnbr-email-field"})));
		form.append($('<input type="hidden" name="action" value="subscribe"/>'));
		form.append($('<input type="hidden" name="blog_id">').attr('value', fbd.siteID));
		form.append($('<input type="hidden" name="source">').attr('value', fbd.referer));
		form.append($('<input type="hidden" name="sub-type" value="actionbar-follow"/>'));
		form.append($(fbd.subscribeNonce));
		form.append($('<div class="actnbr-button-wrap">').append($('<button type="submit">').attr('value', fbd.i18n.subscribe).html(fbd.i18n.subscribe)));
		form.attr('method', 'post');
		form.attr('action', 'https://subscribe.wordpress.com');
		form.attr('accept-charset', 'utf-8');

		var html = $('<ul/>');
		html.append($('<li class="actnbr-sitename">').append($('<a>').attr('href', fbd.siteURL).append($(fbd.icon)).append(' ' + actionBarEscapeHtml( fbd.siteName ))))
		html.append($('<li>').append(form));
		html.append($('<li class="actnbr-login-nudge">').append($('<div>').html(fbd.i18n.alreadyUser)));

		$( '#actionbar .actnbr-follow-bubble' ).empty().append(html);

		setTimeout( function() {
			if ( ! btn.hasClass( 'actnbr-hidden' ) ) {
				bumpStat( 'show_follow_form' );

				$( '#actionbar .actnbr-email-field' ).focus();

				$( document ).on( 'click.actnbr-body-click', function( event ) {
					if ( $( event.target ).closest( '.actnbr-popover' )[ 0 ] ) {
						return;
					}

					btn.addClass( 'actnbr-hidden' );

					$( document ).off( 'click.actnbr-body-click' );
				} );
			}
		}, 10 );
	}
})(jQuery);
;
// WARNING: This file is distributed verbatim in Jetpack. There should be nothing WordPress.com specific in this file. @hide-in-jetpack
!function(t){function a(){t(".jetpack-video-wrapper").find("embed, iframe, object").each(function(){var a,e,i,r,h,d,o;a=t(this),d=0,"center"===a.parents(".jetpack-video-wrapper").prev("p").css("text-align")&&(d="0 auto"),a.attr("data-ratio")||a.attr("data-ratio",this.height/this.width).attr("data-width",this.width).attr("data-height",this.height).css({display:"block",margin:d}),e=a.attr("data-width"),i=a.attr("data-height"),r=a.attr("data-ratio"),h=a.parent(),o=h.width(),"Infinity"===r&&(e="100%"),a.removeAttr("height").removeAttr("width"),e>o?a.width(o).height(o*r):a.width(e).height(i)})}var e;t(document).ready(function(){t(window).on("load.jetpack",a).on("resize.jetpack",function(){clearTimeout(e),e=setTimeout(a,500)}).on("post-load.jetpack",a).resize()})}(jQuery);;
