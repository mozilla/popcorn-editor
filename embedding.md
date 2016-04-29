# Embedding PopcornEditor

This incarnation of PopcornEditor uses a static build to reduce server-side
requirements, with loading/saving of projects and other state & customization
left up to the host site.

This is accomplished using an iframe/postMessage embedding protocol: the host
site loads the embedding API from `PopcornEditor.js` and instantiates an
iframe:

```
var popcorn = new PopcornEditor();

popcorn.listen(PopcornEditor.events.loaded, function () {
  // Event triggered when the editor is finished loading.
  // This is a good time to hide a spinner, or load initial project data.
});

popcorn.listen(PopcornEditor.events.save, function(data) {
  // The project 'Save' button was pushed in the editor, requesting
  // that the hosting site save it in some way.
  saveSomething(data);
});

popcorn.init('editor');
```

# Events

Events sent from PopcornEditor to the host page may be received by passing
the event name and a handler function to `listen()`.

A specific event handler may be similarly removed  with `unlisten()`.

```
  popcorn.listen(PopcornEditor.events.save, this._onsave);
  popcorn.unlisten(PopcornEditor.events.save, this._onsave);
```

TODO: define the `this` value for event callbacks.

## loaded

Event triggered when the editor is finished loading and ready for interaction.

This is a good time to remove a 'loading' spinner, or to inject project data
into the editor.

## save

The project view's "Save" button was pushed in the editor, requesting
that the hosting site save it in some way.

Project data is passed here as a JSON object.

This may be a silent process, or you can display your own UI such as
a dialog asking for name, tags, etc.

TODO: on completion, call a response method.

# Methods

## close

Removes the iframe from the document and releases all event handlers.

## createTemplate

Parameters:
* video [object] - include the following properties:
 * duration [number] - duration in seconds
 * title [string] - human-readable title
 * thumbnail [string] - URL to a thumbnail image
 * type [string] - plugin type: "AirMozilla", "YouTube", "Wikimedia", etc
 * url [string] - URL to video to load

Returns: [object] - full project JSON data

Fills out a project data JSON template with a single video element.

To actually load it into the editor, pass through to `loadInfo()`.

## init

Parameters:
* element [HTMLElement|string] - element or id to append the iframe into.
* url [string] - optional URL; defaults to 'PopcornEditor/editor.html'

Sets up the iframe and starts it loading.

## listen

Parameters:
* key [string]
* handler [function]

Attaches an event listener for the given event key.

## loadInfo

Sends project JSON data into the embedded editor, to be displayed and modified.
See also `createTemplate()` for a convenient way to fill out a project template.

Parameters:
* data [object] - project JSON data

TODO: document the project data format.
TODO: specify an event that gets triggered when project load is complete.

## unlisten

Parameters:
* key [string]
* handler [function]

Removes a particular event listener for the given event key.
