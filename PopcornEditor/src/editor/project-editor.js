/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

define([ "editor/editor", "editor/base-editor",
          "l10n!../../{{lang}}/layouts/project-editor.html",
          "util/social-media", "ui/widget/textbox",
          "ui/widget/tooltip", "core/logger", "dialog/dialog", "analytics"],
  function( Editor, BaseEditor, LAYOUT_SRC, SocialMedia, TextboxWrapper, ToolTip, Logger, Dialog, analytics ) {

  Editor.register( "project-editor", LAYOUT_SRC, function( rootElement, butter ) {

    var _rootElement = rootElement,
        _socialMedia = new SocialMedia(),
        _backgroundInput = _rootElement.querySelector( ".butter-project-background-colour" ),
        _colorContainer = _rootElement.querySelector( ".color-container" ),
        _viewSourceBtn = _rootElement.querySelector( ".butter-view-source-btn" ),
        _settingsTabBtn = _rootElement.querySelector( ".settings-tab-btn" ),
        _saveButton = _rootElement.querySelector( ".butter-save-btn" ),
        _settingsContainer = _rootElement.querySelector( ".settings-container" ),
        _projectTabs = _rootElement.querySelectorAll( ".project-tab" ),
        _this = this,
        _numProjectTabs = _projectTabs.length,
        _project,
        _projectTab,
        _editorHelper = butter.editor.editorHelper,
        _idx;


    _backgroundInput.value = butter.project.background ? butter.project.background : "#FFFFFF";

    function activateProjectTab( target ) {
      var currentDataName = target.getAttribute( "data-tab-name" ),
          dataName;

      for ( var i = 0; i < _numProjectTabs; i++ ) {
        dataName = _projectTabs[ i ].getAttribute( "data-tab-name" );

        if ( dataName === currentDataName ) {
          _rootElement.querySelector( "." + dataName + "-container" ).classList.remove( "display-off" );
          target.classList.add( "butter-active" );
        } else {
          _rootElement.querySelector( "." + dataName + "-container" ).classList.add( "display-off" );
          _projectTabs[ i ].classList.remove( "butter-active" );
        }

      }

      _this.scrollbar.update();
    }

    function onProjectTabClick( e ) {
      if ( !_project.isSaved ) {
        return;
      }
      activateProjectTab( e.target );
    }

    for ( _idx = 0; _idx < _numProjectTabs; _idx++ ) {
      _projectTab = _projectTabs[ _idx ];
      _projectTab.addEventListener( "click", onProjectTabClick );
    }

    butter.listen( "droppable-unsupported", function unSupported() {
      _this.setErrorState( "Sorry, but your browser doesn't support this feature." );
    });

    butter.listen( "droppable-upload-failed", function failedUpload( e ) {
      _this.setErrorState( e.data );
    });

    function shareProject() {
      if ( _project.publishUrl ) {
        // Ensure Share buttons have loaded
      }
    }

    function afterSave() {
      toggleSaving( true );
      toggleSaveButton( false );
    }


    function failAndResetSave( msg ){
      // aplogies, this forces a call to the "invalidate()" project
      // which will flip the butter.project.isSaved back to false
      butter.project['public'] = false;
      butter.project['public'] = true;

      // reset the button state so user can try pressing "Save" again later
      toggleSaving( true );
      toggleSaveButton( true );

      // dialog to the user
      showErrorDialog( msg );
      return false;
    }


    // Saves the project to a new archive.org item.
    // Requires archive.org account and to be logged in (will confirm that).
    // Once item is created, the item will have the popcorn player interface right at the top!
    function archiveProject() {
      var url = 'https://archive.org/services/maker.php?create_popcorn=1';

      var project = JSON.parse( JSON.stringify( _project ) );
      project.name        = $('.butter-project-title'      ).val();
      project.description = $('.butter-project-description').val();
      project.media       = project.data.media;
      project.targets     = project.data.targets;
      delete project.data;
      // remove clutter:
      delete project['public'];
      delete project.isSaved;
      delete project.isPublished;

      var postdata = JSON.stringify ( project );
      var logger = new Logger ( 'saver' );
      logger.log( postdata );
      if (typeof console != 'undefined'  &&  typeof console.log != 'undefined')
        console.log( postdata );

      // xxxp we dont require an IA login to save a project now -- though it *helps* because
      // a user can associate all their projects with *their* account -- and would allow
      // for project/item editing/replacement in the future (which they can't do if "anonymous"!)
      /*
      if ( document.cookie.indexOf('logged-in-user=') == -1 ){
        return failAndResetSave( '<img style="float:right; padding:10px; width:79px; height:79px;" src="https://archive.org/images/glogo.png"/> To save your project, you will need to be logged in with a valid archive.org account<br/><br/>You can <a target="_blank" href="https://archive.org/account/login.php?referer=/index.php">login or register now</a>.' );
      }
      */

      if ( project.name==='' ){
        return failAndResetSave( "Please enter a project title (and ideally a description, too) before saving" );
      }

      postdata = {json : postdata};

      $.post(url, postdata, function(htm){//xxxp handle 4xx 5xx type http fails
        // look for success indicator
        var mat = htm.match(/>(https:\/\/archive.org\/details\/[^<]+)/);
        if (mat){
          showErrorDialog( '<h1>Project saved!</h1><br/>You can see this new item at:<br/> <a target="_blank" href="'+mat[1]+'">'+mat[1]+'</a> ' );
        }
        else {
          failAndResetSave( "Project failed to save to archive.org" );
        }
      });
    }


    function submitSave() {
      toggleSaving( false );
      _saveButton.textContent = "Saving";

      // Check box decides save or publish, for now, save then publish in afterSave...
      butter.project.save(function( e ) {
        if ( e.status === "okay" ) {
          afterSave();

          if ( butter.config.value( 'archiveProject' ) ){
            archiveProject();
          }

          return;
        } else {
          toggleSaveButton( true );
          butter.project.useBackup();
          showErrorDialog( "There was a problem saving your project" );
        }
      });
    }

    function saveProject() {
      if ( butter.project.isSaved ) {
        return;
      } else {
        submitSave();
      }
    }

    function toggleSaveButton( on ) {
      if ( butter.project.isSaved ) {
        _saveButton.textContent = "Saved";
      } else {
        _saveButton.textContent = "Save";
      }
      if ( on ) {
        _saveButton.classList.remove( "butter-disabled" );
      } else {
        _saveButton.classList.add( "butter-disabled" );
      }

      butter.project.isSaved = !butter.project.isSaved;
    }

    function toggleSaving( on ) {
      if ( on ) {
        _saveButton.classList.remove( "butter-button-waiting" );
        _saveButton.addEventListener( "click", saveProject );
      } else {
        _saveButton.classList.add( "butter-button-waiting" );
        _saveButton.removeEventListener( "click", saveProject, false );
      }
    }

    function showErrorDialog( message ) {
      var dialog = Dialog.spawn( "error-message", {
        data: message,
        events: {
          cancel: function() {
            dialog.close();
          }
        }
      });
      dialog.open();
    }

    function onProjectSaved() {
      _viewSourceBtn.href = "view-source:" + _project.iframeUrl;
      _viewSourceBtn.classList.remove( "butter-disabled" );

      shareProject();
    }

    function onLogin() {
      if ( butter.project.isSaved ) {
        onProjectSaved();
      }
    }

    function onLogout() {
      onProjectChanged();
    }

    function onProjectChanged() {
      _viewSourceBtn.classList.add( "butter-disabled" );
      activateProjectTab( _settingsTabBtn );
    }

    butter.listen( "projectsaved", onProjectSaved );
    butter.listen( "autologinsucceeded", onLogin );
    butter.listen( "authenticated", onLogin );
    butter.listen( "projectchanged", onProjectChanged );
    _saveButton.addEventListener( "click", saveProject );
    butter.listen( "logout", onLogout );

    _project = butter.project;

    _viewSourceBtn.onclick = function() {
      return _project.isSaved;
    };

    Editor.BaseEditor.extend( this, butter, rootElement, {
      open: function() {

        if ( !_project.isSaved ) {
          _viewSourceBtn.classList.add( "butter-disabled" );
        }
        _viewSourceBtn.href = "view-source:" + _project.iframeUrl;

        shareProject();

        _this.scrollbar.update();

      },
      close: function() {
      }
    });

    this.attachColorChangeHandler( _colorContainer, null, "background", function( te, options, message ) {
      if ( message ) {
        _this.setErrorState( message );
        return;
      } else {
        _project.background = options.background;
      }
    });
  }, true );
});
