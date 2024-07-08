import type { Patch } from "../types";

export class State<S> {
  #state: S;
  #streaming: boolean = false;
  #flushing: boolean = false;
  sink: Patch[] = [];

  snap() {
    if (this.#streaming === true) throw ErrorStreamOpen;

    return this.#state;
  }

  stream(cb: (state: S) => void) {
    if (this.#streaming === true) throw ErrorStreamOpen;

    try {
      this.#streaming = true;
      cb(this.#state);
    } finally {
      this.#streaming = false;
    }
  }

  flush(save = true) {
    if (this.#streaming === true) throw ErrorStreamOpen;

    try {
      this.#flushing = true;
      if (save) {
        this.sink.forEach((patch: Patch) => {
          if (patch.path.length === 0) {
            this.#state = this.#proxify(patch.value);
          } else {
            patch.path.reduce((slice: any, p, i) => {
              if (i !== patch.path.length - 1) {
                return slice[p];
              }
              if (patch.value === undefined) {
                delete slice[p];
              } else {
                slice[p] = patch.value;
              }
            }, this.#state);
          }
        });
      }
    } finally {
      this.#flushing = false;
      this.sink = [];
    }
  }

  constructor(state: S) {
    this.#state = this.#proxify(state);
  }

  #proxify(value: any, path: string[] = []): any {
    if (value?.[PROXY]) {
      return value;
    }

    if (Array.isArray(value)) {
      return new Proxy(value, {
        get: (target: any, prop: any) => {
          if (prop === PROXY) {
            return true;
          }
          target[prop] = this.#proxify(target[prop], [...path, prop]);

          if (ARRAY_MUTATORS.has(prop)) {
            return (...args: any[]) => {
              if (this.#flushing) return target[prop](...args);
              if (!this.#streaming) throw ErrorStreamClosed;

              const state = this.#proxifyGet(target, path).slice();
              this.sink.push({ path, value: state });
              return this.#proxify(state[prop](...args), path);
            };
          }

          return this.#proxifyGet(target[prop], [...path, prop]);
        },
        set: this.#proxifySet(path),
      });
    }

    if (isObject(value)) {
      return new Proxy(value, {
        get: (target: any, prop: any) => {
          if (prop === PROXY) {
            return true;
          }
          target[prop] = this.#proxify(target[prop], [...path, prop]);
          return this.#proxifyGet(target[prop], [...path, prop]);
        },
        set: this.#proxifySet(path),
        deleteProperty: this.#proxifySet(path),
      });
    }

    return value;
  }

  #proxifyGet(prepatched: any, path: string[]) {
    if (!this.#streaming) {
      return prepatched;
    }
    const patch = this.sink.findLast(
      (p) => path.join("\\") === p.path.join("\\")
    );
    if (patch) {
      return this.#proxify(patch.value, path);
    }
    return prepatched;
  }

  #proxifySet(path: string[]) {
    return (target: any, prop: string | symbol, newValue?: any) => {
      if (this.#flushing) {
        if (newValue !== undefined) {
          target[prop] = newValue;
        } else {
          delete target[prop];
        }
        return true;
      }
      if (!this.#streaming) throw ErrorStreamClosed;
      return !!this.sink.push({
        path: [...path, prop as string],
        value: newValue,
      });
    };
  }
}

const ErrorStreamOpen = Error(
  "Stream is currently open! Make sure you're calling this outside of a stream."
);
const ErrorStreamClosed = Error(
  "Stream is not open! Are you trying to mutate state outside of `.withStream()`?"
);
const PROXY = Symbol.for("proxy");
const ARRAY_MUTATORS = new Set([
  "push",
  "shift",
  "pop",
  "unshift",
  "splice",
  "reverse",
  "sort",
  "copyWithin",
]);
const isObject = (value: any) =>
  Object.prototype.toString.call(value) !== "[object Object]"
    ? false
    : value.constructor === undefined
    ? true
    : Object.prototype.toString.call(value.constructor.prototype) !==
      "[object Object]"
    ? false
    : value.constructor.prototype.hasOwnProperty("isPrototypeOf") === false
    ? false
    : true;
