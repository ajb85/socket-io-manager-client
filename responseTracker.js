export default class ResponseTracker {
  constructor() {
    this.storage = {};
  }

  get code() {
    let newCode = "";

    while (newCode.length < 8) {
      newCode += this.char;
    }

    return this.storage[newCode] ? this.code : newCode;
  }

  get random() {
    const max = characters.length - 1;
    return Math.floor(Math.random() * (max - 1));
  }

  get char() {
    return characters[this.random];
  }

  record(callback) {
    const code = this.code;
    this.storage[code] = callback;
    return code;
  }

  run(code, ...args) {
    if (this.storage[code]) {
      const callback = this.storage[code];
      delete this.storage[code];
      return callback(...args);
    }
  }
}

// prettier-ignore
const characters = [
  '',  '!', '"', '#', '$', '%', '&', "'", '(', ')', '*', '+', ',', '-', '.', '/', '0', '1', '2', '3', '4', '5',
  '6', '7', '8', '9', ':', ';', '<', '=', '>', '?', '@', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K',
  'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '[', ']', '^', '_', 'a', 'b', 'c',
  'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y',
  'z', '{', '|', '}', ''
]
