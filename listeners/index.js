import error from "./error.js";
import connect from "./connect.js";
import disconnect from "./disconnect.js";

export default [
  { room: "error", callback: error },
  { room: "connect", callback: connect },
  { room: "disconnect", callback: disconnect },
];
