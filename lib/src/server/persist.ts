import { open } from "lmdb";

import type { Patch } from "../types";

const STRUCTS_KEY = Symbol.for("STRUCTS_KEY");

export class Persist<S> {
  #db: ReturnType<typeof open<Patch[]>>;

  constructor(fp: string) {
    this.#db = open<Patch[]>(fp, { sharedStructuresKey: STRUCTS_KEY });
  }

  init(value: S) {
    return this.#db.putSync(0, [{ path: [], value }]);
  }

  clear() {
    this.#db.transactionSync(() => {
      const structs = this.#db.get(STRUCTS_KEY) || [];
      this.#db.clearSync();
      this.#db.putSync(STRUCTS_KEY, structs);
    });
  }

  append(patches: Patch[]) {
    return this.#db.putSync(this.index() + 1, patches);
  }

  patches() {
    return this.#db.getRange({ start: 0 }).flatMap(({ value }) => value)
      .asArray;
  }

  index() {
    const index = this.#db.getKeys({ reverse: true, limit: 1 }).asArray[0];
    if (typeof index !== "number") {
      return -1;
    }
    return index;
  }
}
