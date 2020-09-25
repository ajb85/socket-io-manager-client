// callback is a special listener because it must be online for basic
// features to work.  Since it's just listening to run an attached callback
// it bypasses the security steps

function listener({ code, status }) {
  this.responseTracker.run(code, status);
}

export default function () {
  this.__FORCE_SUB__ONLY_CALL_THIS_IF_YOU_KNOW_WHAT_YOU_ARE_DOING(
    "callback",
    listener
  );
}
