/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

(function( Butter ) {

  var Editor = Butter.Editor;

  var __EditorHelper;

  Editor.register( "image", "load!{{baseDir}}plugins/image-editor.html",
                   function( rootElement, butter, compiledLayout ) {

    var _rootElement = rootElement,
        _urlInput = _rootElement.querySelector( "#image-url-input" ),
        _urlRegex,
        _this = this,
        _trackEvent,
        _popcornInstance,
        _inSetup,
        _cachedValues;

    function updateTrackEvent( te, props ) {
      _this.setErrorState();
      _this.updateTrackEventSafe( te, props );
    }

    function attachDropHandlers() {
      butter.listen( "droppable-unsupported", unSupported );
    }

    function unSupported() {
      _this.setErrorState( "Sorry, but your browser doesn't support this feature." );
    }

    function isEmptyInput( value ) {
      return value === "";
    }

    function isDataURI( url ) {
      return ( /^data:image/ ).test( url );
    }

    function singleImageHandler() {
      if ( !_inSetup ) {
        _trackEvent.update({
          src: _cachedValues.src.data
        });
      }

      if ( isDataURI( _trackEvent.popcornOptions.src ) ) {
        _urlInput.value = "data:image";
      }
    }

    // Mode specifies what values should be retrieved from the cached values
    function displayCachedValues( mode ) {
      var element;

      // Repopulate fields with old values to prevent confusion
      for ( var i in _cachedValues ) {
        if ( _cachedValues.hasOwnProperty( i ) ) {
          element = _rootElement.querySelector( "[data-manifest-key='" + i + "']" );

          if ( _cachedValues[ i ].type === mode ) {
            if ( isDataURI( _cachedValues[ i ].data ) ) {
              _urlInput.value = "data:image";
            } else {
              element.value = _cachedValues[ i ].data;
            }
          }
        }
      }
    }

    function setup( trackEvent ) {
      var container = _rootElement.querySelector( ".editor-options" ),
          startEndElement,
          manifestOpts = trackEvent.popcornTrackEvent._natives.manifest.options;

      _inSetup = true;
      _urlRegex = manifestOpts.linkSrc.validation;

      function callback( elementType, element, trackEvent, name ) {
        if ( elementType === "select" ) {
          _this.attachSelectChangeHandler( element, trackEvent, name );
        }
      }

      function attachHandlers() {
        _this.attachInputChangeHandler( _urlInput, trackEvent, "src", function( te, prop ) {
          var src = prop.src;

          if ( isEmptyInput( src ) ) {
            return;
          }

          // Chrome can't display really long dataURIs in their text inputs. This is to prevent accidentally
          // removing their image
          if ( src === "data:image" &&  isDataURI( te.popcornTrackEvent.src ) ) {
            src = te.popcornTrackEvent.src;
          }

          updateTrackEvent( te, {
            src: src,
            tags: "",
            photosetId: ""
          });
        });

        // Wrap specific input elements
        _this.wrapTextInputElement( _urlInput );

        attachDropHandlers();
      }

      startEndElement = _this.createStartEndInputs( trackEvent, updateTrackEvent );
      container.insertBefore( startEndElement, container.firstChild );

      _this.createPropertiesFromManifest({
        trackEvent: trackEvent,
        callback: callback,
        basicContainer: container,
        manifestKeys: []
      });

      attachHandlers();
      container.appendChild( _this.createSetAsDefaultsButton( trackEvent ) );
      _this.updatePropertiesFromManifest( trackEvent );
      _this.setTrackEventUpdateErrorCallback( _this.setErrorState );

      singleImageHandler();

      _this.scrollbar.update();
      _inSetup = false;
    }

    function toggleHandler( e ) {
      _this.scrollbar.update();
    }

    function clickPrevention() {
      return false;
    }

    function onTrackEventUpdated( e ) {
      _trackEvent = e.target;
      _this.updatePropertiesFromManifest( _trackEvent );
      _this.setErrorState( false );

      var links, i, ln,
          src = _trackEvent.popcornOptions.src;

      if ( _trackEvent.popcornTrackEvent._container ) {
        links = _trackEvent.popcornTrackEvent._container.querySelectorAll( "a" );

        if ( links ) {
          for ( i = 0, ln = links.length; i < ln; i++ ) {
            links[ i ].onclick = clickPrevention;
          }
        }
      }

      // Droppable images aren't getting their data URIs cached so just perform a double check here
      // on updating
      if ( src ) {
        _cachedValues.src.data = src;
      }

      singleImageHandler();
      _this.scrollbar.update();
    }

    Editor.TrackEventEditor.extend( _this, butter, rootElement, {
      open: function( parentElement, trackEvent ) {
        var popcornOptions = trackEvent.popcornOptions,
            manifestOpts = trackEvent.popcornTrackEvent._natives.manifest.options;

        if ( !_cachedValues ) {
          _cachedValues = {
            src: {
              data: popcornOptions.src || manifestOpts.src.default,
              type: "single"
            }
          };
        }

        _popcornInstance = trackEvent.track._media.popcorn.popcorn;

        _this.applyExtraHeadTags( compiledLayout );
        _trackEvent = trackEvent;

        _trackEvent.listen( "trackeventupdated", onTrackEventUpdated );

        setup( trackEvent );
      },
      close: function() {
        _this.removeExtraHeadTags();
        butter.unlisten( "droppable-unsupported", unSupported );
        _trackEvent.unlisten( "trackeventupdated", onTrackEventUpdated );
      }
    });
  }, false, function( trackEvent, popcornInstance, $ ) {

    var _popcornOptions = trackEvent.popcornTrackEvent,
        _container = _popcornOptions._container,
        _clone,
        _cloneContainer,
        _src = _popcornOptions.src,
        _target = _popcornOptions._target;

    // Work around since I can't just require it in for this editor.
    __EditorHelper = this;

    function createHelper( suffix ) {
      var el = document.createElement( "div" );
      el.classList.add( "ui-resizable-handle" );
      el.classList.add( "ui-resizable-" + suffix );
      return el;
    }

    this.selectable( trackEvent, _container );
    if ( _src ) {
      this.droppable( trackEvent, _container );

      var options = {
            tooltip: "Double click to crop image"
          };

      if ( _src.indexOf( trackEvent.manifest.options.src.FLICKR_SINGLE_CHECK ) > -1 ) {
        options.disableTooltip = true;
        options.editable = false;
      }

      trackEvent.draggable = this.draggable( trackEvent, _container, _target, options );
    } else {
      trackEvent.draggable = this.draggable( trackEvent, _container, _target, {
        disableTooltip: true,
        editable: false
      });
    }

    _container.appendChild( createHelper( "top" ) );
    _container.appendChild( createHelper( "bottom" ) );
    _container.appendChild( createHelper( "left" ) );
    _container.appendChild( createHelper( "right" ) );

    if ( !$( _container ).data( "resizable" ) ) {
      $( _container ).resizable({
        handles: "n,ne,e,se,s,sw,w,nw",
        containment: "parent",
        start: function() {
          var image = trackEvent.popcornTrackEvent.image;
          if ( image && _container.classList.contains( "track-event-editing" ) ) {
            image.style.top = image.offsetTop + "px";
            image.style.left = image.offsetLeft + "px";
            image.style.width = image.clientWidth + "px";
            image.style.height = image.clientHeight + "px";
            if ( _clone ) {
              _clone.style.width = _clone.clientWidth + "px";
              _clone.style.height = _clone.clientHeight + "px";
              _cloneContainer.style.width = _cloneContainer.clientWidth + "px";
              _cloneContainer.style.height = _cloneContainer.clientHeight + "px";
              _clone.style.top = _clone.offsetTop + "px";
              _clone.style.left = _clone.offsetLeft + "px";
              _cloneContainer.style.top = _cloneContainer.offsetTop + "px";
              _cloneContainer.style.left = _cloneContainer.offsetLeft + "px";
            }
          }
        },
        stop: function( event, ui ) {
          var image = trackEvent.popcornTrackEvent.image,
              width = _container.clientWidth,
              height = _container.clientHeight,
              left = ui.position.left,
              top = ui.position.top,
              imageHeight,
              imageWidth,
              imageTop,
              imageLeft;

          if ( left < 0 ) {
            width += left;
            left = 0;
          }
          if ( top < 0 ) {
            height += top;
            top = 0;
          }

          if ( width + left > _target.clientWidth ) {
            width = _target.clientWidth - left;
          }
          if ( height + top > _target.clientHeight ) {
            height = _target.clientHeight - top;
          }

          width = width / _target.clientWidth * 100;
          height = height / _target.clientHeight * 100;
          left = left / _target.clientWidth * 100;
          top = top / _target.clientHeight * 100;

          if ( image ) {

            imageWidth = image.offsetWidth / _container.clientWidth * 100;
            imageHeight = image.offsetHeight / _container.clientHeight * 100;
            imageTop = image.offsetTop / _container.clientHeight * 100;
            imageLeft = image.offsetLeft / _container.clientWidth * 100;

            _container.style.width = width + "%";
            _container.style.height = height + "%";
            _container.style.top = top + "%";
            _container.style.left = left + "%";

            image.style.width = imageWidth + "%";
            image.style.height = imageHeight + "%";
            image.style.top = imageTop + "%";
            image.style.left = imageLeft + "%";

            trackEvent.update({
              innerWidth: imageWidth,
              innerHeight: imageHeight,
              innerTop: imageTop,
              innerLeft: imageLeft,
              width: width,
              height: height,
              left: left,
              top: top
            });
          } else {

            trackEvent.update({
              width: width,
              height: height,
              left: left,
              top: top
            });
          }
        }
      });
    }

    // The image plugin doesn't use an update function.
    // If it did, we wouldn't be able to set this up again and again.
    // We would need to make sure nothing gets duplicated on an update.
    if ( trackEvent.popcornTrackEvent.image && trackEvent.popcornOptions.src ) {
      _cloneContainer = document.createElement( "div" );
      _cloneContainer.classList.add( "clone-container" );
      _clone = trackEvent.popcornTrackEvent.image.cloneNode();
      _clone.classList.add( "image-crop-clone" );
      _cloneContainer.appendChild( _clone );
      _container.appendChild( _cloneContainer );

      _clone.appendChild( createHelper( "top" ) );
      _clone.appendChild( createHelper( "bottom" ) );
      _clone.appendChild( createHelper( "left" ) );
      _clone.appendChild( createHelper( "right" ) );

      $( _clone ).draggable({
        drag: function( event, ui ) {
          trackEvent.popcornTrackEvent.image.style.top = ui.position.top + "px";
          trackEvent.popcornTrackEvent.image.style.left = ui.position.left + "px";
        },
        stop: function( event, ui ) {
          var top = ui.position.top / _container.clientHeight * 100,
              left = ui.position.left / _container.clientWidth * 100;

          trackEvent.update({
            innerTop: top,
            innerLeft: left
          });
          trackEvent.draggable.edit();
        }
      });

      $( _clone ).resizable({
        handles: "n, ne, e, se, s, sw, w, nw",
        resize: function( event, ui ) {
          trackEvent.popcornTrackEvent.image.style.height = _clone.clientHeight + "px";
          trackEvent.popcornTrackEvent.image.style.width = _clone.clientWidth + "px";
          _clone.style.height = _clone.clientHeight + "px";
          _clone.style.width = _clone.clientWidth + "px";
          trackEvent.popcornTrackEvent.image.style.top = ui.position.top + "px";
          trackEvent.popcornTrackEvent.image.style.left = ui.position.left + "px";
          _clone.style.top = ui.position.top + "px";
          _clone.style.left = ui.position.left + "px";
        },
        stop: function( event, ui ) {
          trackEvent.update({
            innerHeight: _clone.offsetHeight / _container.clientHeight * 100,
            innerWidth: _clone.offsetWidth / _container.clientWidth * 100,
            innerTop: ui.position.top / _container.clientHeight * 100,
            innerLeft: ui.position.left / _container.clientWidth * 100
          });
          trackEvent.draggable.edit();
        }
      });
    }
  });
}( window.Butter ));
