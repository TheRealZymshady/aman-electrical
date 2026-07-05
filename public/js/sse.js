'use strict';

function createSseClient(url, handlers) {
  let attempt = 0;
  let es = null;
  let stopped = false;
  let reconnectTimer = null;

  function clearReconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function scheduleReconnect() {
    clearReconnect();
    if (stopped) return;
    const delay = Math.min(30000, 1000 * Math.pow(2, attempt));
    attempt += 1;
    reconnectTimer = setTimeout(connect, delay);
  }

  function connect() {
    if (stopped) return;
    es = new EventSource(url, { withCredentials: true });

    es.onopen = function () {
      attempt = 0;
      if (handlers.onOpen) handlers.onOpen();
    };

    es.onerror = function () {
      if (handlers.onClose) handlers.onClose();
      if (es) {
        es.close();
        es = null;
      }
      scheduleReconnect();
    };

    if (handlers.events) {
      Object.keys(handlers.events).forEach(function (eventName) {
        es.addEventListener(eventName, function (event) {
          var data = {};
          try {
            data = JSON.parse(event.data);
          } catch (_err) {
            return;
          }
          handlers.events[eventName](data);
        });
      });
    }
  }

  connect();

  return {
    close: function () {
      stopped = true;
      clearReconnect();
      if (es) {
        es.close();
        es = null;
      }
    },
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createSseClient };
}
