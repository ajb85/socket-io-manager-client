export default function () {
  console.log("Connected to socket manager");
  this.on = true;
  this._identify();

  if (Object.keys(this.subscriptions).length) {
    // When a socket disconnects then reconnects, the server
    // treats it as a brand new socket that it knows nothing about.
    // Thus, FE client resubscribes to everything once a connection
    // is reestablished.
    for (let room in this.subscriptions) {
      this._subscribe(room);
    }
  }
}
