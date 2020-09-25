import io from "socket.io-client";
import axios from "axios";

import listeners from "./listeners/";
import store from "../store/";
import responseTracker from "./responseTracker.js";
import listenForCallbacks from "./callbacks.js";

// Feature flag
const socketsAreEnabled =
  process.env.REACT_APP_ENABLE_SOCKETS &&
  process.env.REACT_APP_ENABLE_SOCKETS.toLowerCase() !== "n" &&
  process.env.REACT_APP_ENABLE_SOCKETS.toLowerCase() !== "false";

class Socket {
  constructor(disabled) {
    if (!disabled) {
      this.io = io;
      // Record of this socket client's subscriptions, which is used in
      // the event of disconnect.  A subscription is anything this client
      // should be updated on.
      this.subscriptions = {};

      // Redux state
      this.store = store;

      // Track 'responses' for callbacks
      this.responseTracker = new responseTracker();

      this._poolRequests = ((cache, timeouts) => (type, requestData, cb) => {
        // Aggregates data from consecutive API calls into an array so a single
        // bulk call can be made
        if (!cache.data[type]) {
          // If first of type, save data in cache
          cache.data[type] = [];
          cache.callbacks[type] = cb;
        } else {
          // Not the first of type, clear the previously set timeout
          clearInterval(timeouts[type]);
        }
        cache.data[type].push(requestData);

        timeouts[type] = setTimeout(() => {
          if (cache.callbacks[type]) {
            // If statement not really needed, just a precaution
            cache.callbacks[type](cache.data[type]);
            delete cache.data[type];
            delete cache.callbacks[type];
            delete timeouts[type];
          }
        }, 25);
      })({ data: {}, callbacks: {} }, {});
    }
  }

  get online() {
    return this.initialized && this.on;
  }

  connect() {
    if (!this.initialized) {
      this.socket = this.io.connect(
        process.env.REACT_APP_DB_ENDPOINT || "http://localhost:5000",
        {
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: Infinity,
        }
      );

      this.on = true;
      this.initialized = true;

      listenForCallbacks.call(this);

      // Identify
      return this._identify()
        .then(() => {
          listeners.forEach(({ room, callback }) => {
            // Turn on every listener that every instance of the app
            // should have on
            this._listen(room, callback);
          });
        })
        .catch((err) => console.error("Identification error: ", err));
    }

    console.log("Sockets not connected.");
    return Promise.resolve(this);
  }

  listen(room) {
    this._listen(room, (code, context, data) => {
      if (code) {
        this._emit("callback", code);
      } else {
        // Shouldn't happen, but just in case
        data = context;
        context = code;
      }

      if (this._isException(context, data)) {
        this._handleException(context, data);
      } else {
        this.store.dispatch({ type: context, payload: data });
      }
    });
  }

  listenForChat(room) {
    this.listen("chat_" + room);
  }

  listenForCompanyUpdates(companyId) {
    this.listen("company_" + companyId);
  }

  _isException(context, data) {
    // Placeholder method for any listeners that don't conform to the standard
    return false;
  }

  _handleException(context, data) {
    // Placeholder method for any listeners that don't conform to the standard
    this.store.dispatch({ type: context, payload: data });
  }

  _emit(room, data) {
    this.socket.emit(room, data);
  }

  _listen(room, cb) {
    if (this.on && this.identified && !this.subscriptions[room]) {
      this.subscriptions[room] = true;
      this._subscribe(room);
      this.socket.on(room, cb.bind(this));
    }
  }

  _reportSubs(data) {
    const { joined, denied } = data || {};
    if (joined && denied) {
      let msg = "";
      if (joined.length) {
        msg += "Joined: ";
        msg += joined.map(({ room }) => room).join(", ");
      }

      if (denied.length) {
        if (msg.length) {
          msg += "\n";
        }
        msg += "Denied: ";
        msg += denied.map(({ room }) => room).join(", ");
      }
    }
  }

  _subscribe(room) {
    if (!this.on) {
      return console.log("Sockets not online");
    }

    if (!room) {
      return;
    }

    const callback = (rooms) => {
      if (!rooms) {
        return;
      }
      console.log("Subscribed to: ", rooms.join(", "));
      return axios
        .post("/api/chat/subscribe", { rooms })
        .then(({ data }) => {
          this._reportSubs(data);
          return data;
        })
        .catch((err) => {
          console.error("Error subscribing to sockets: ", err);
          return err;
        });
    };

    this._poolRequests("subscribe", room, callback);
  }

  _identify() {
    if (this.on) {
      if (!this.identified && !this.identifyPending) {
        const token = localStorage.getItem("token");
        if (token) {
          // Sockets are online
          // Socket is not identified & hasn't tried to
          // App has a token
          this.identifyPending = true;
          return new Promise((resolve, reject) => {
            // Generate a code to attach to a callback
            const code = this.responseTracker.record((status) => {
              // Tie this function to a code generated by the
              // responseTracker.  Backend emits code back, callback
              // executes
              this.identifyPending = false;
              if (status) {
                // If successfully identified, set
                // a identify to true
                console.log("Identified self to sockets.");
                this.identified = true;
                return resolve();
              }
              // Something went wrong, can't identify
              reject("Error occurred while identifying");
            });
            this._emit("identify", { code, token });
          });
        } else return Promise.reject("No token in storage.");
      } else return Promise.reject("Already identified.");
    } else return Promise.reject("Cannot identify while offline.");
  }

  __FORCE_SUB__ONLY_CALL_THIS_IF_YOU_KNOW_WHAT_YOU_ARE_DOING(room, cb) {
    this.subscriptions[room] = true;
    this._emit("subscribe", room);
    this.socket.on(room, cb.bind(this));
  }
}

class NoSockets {
  constructor() {
    console.log("Sockets are offline.");
    Object.getOwnPropertyNames(
      Object.getPrototypeOf(new Socket("disable"))
    ).forEach((key) => {
      if (key !== "constructor") {
        if (key === "connect") {
          this[key] = () => Promise.resolve(this);
        } else {
          this[key] = () => this;
        }
      }
    });
  }
}

export default socketsAreEnabled ? new Socket() : new NoSockets();
