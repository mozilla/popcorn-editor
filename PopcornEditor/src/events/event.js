/**
 * Integration/embedding interface for the editor.
 *
 * Host -> PopcornEditor direction:
 * - load: reinitialize the editor with the given project data
 *
 * PopcornEditor -> Host direction:
 * - save: push the provided JSON project data to a save interface
 *
 * @todo provide for callbacks/responses
 * @todo decouple this from postMessage so iframe is not required
 * @todo check incoming messages to make sure they're not for different code
 */
define([],
function() {
  var listeners = {};

  window.addEventListener('message', function (e) {
    if (e.origin !== window.location.origin)
      return;

    for (key in listeners) {
      if (e.data.type === key) {
        listeners[key].forEach(function (handler) {
          handler(e.data.data);
        });
      }
    }
  });

  return {
    /**
     * Send the provided project data to the host for saving.
     *
     * @param {object} data - project JSON data to send to the host for saving
     * @todo provide a callback when saving is complete or failed
     */
    save: function (data) {
      message = {
        data: data,
        type: 'save'
      };
      // posts message to outside of the iframe
      parent.postMessage(message, window.location.origin);
    },

    /**
     * Add a listener for the given event name coming in from the host.
     * @param {string} eventName - name of event, such as 'load'
     * @param {function} handler - function to call when event received
     */
    listen: function (eventName, handler) {
      if (listeners[eventName] === undefined) {
        listeners[eventName] = [handler];
      } else {
        listeners[eventName].push(handler);
      }
    }
  };
});
