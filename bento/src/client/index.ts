import icepick from "icepick";
import { pack, unpack } from "msgpackr";

export class Client<S> {
  #dispatch;
  #state: S;
  #ws!: WebSocket;

  act(action: string, payload: any) {
    this.#send({ type: "action", action, payload });
  }

  constructor(
    dispatch: (state: S) => void,
    options?: Partial<{ scopes: string[][] }>
  ) {
    this.#dispatch = dispatch;
    this.#state = icepick.freeze(undefined as S);
    this.#ws = this.#connect();
    this.#send({ type: "init", ...options });
  }

  #connect() {
    const ws = new WebSocket(`ws://${window.location.hostname}:4400/_ws`);
    ws.binaryType = "arraybuffer";
    ws.onmessage = (event) => {
      const data = unpack(event.data);
      console.info("ws ~ message", data);

      switch (data.type) {
        case "emit":
          return this.#handleEmit(data);
      }
    };
    ws.onclose = (event) => {
      console.error("ws ~ close", event.reason, "retrying in 1 second...");
      setTimeout(() => {
        this.#connect();
      }, 1000);
    };
    return ws;
  }

  #handleEmit(data: {
    type: "emit";
    patches: Array<{ path: string[]; value?: any }>;
  }) {
    data.patches.forEach((patch) => {
      if (patch.path.length === 0) {
        this.#state = icepick.freeze(patch.value);
      } else if (patch.value) {
        this.#state = icepick.setIn(this.#state, patch.path, patch.value);
      } else {
        this.#state = icepick.unsetIn(this.#state, patch.path);
      }
    });
    this.#dispatch(this.#state);
  }

  async #send(obj: any) {
    await new Promise<void>((resolve) => {
      if (this.#ws.readyState !== this.#ws.OPEN) {
        this.#ws.addEventListener("open", () => resolve());
      } else {
        resolve();
      }
    });
    this.#ws.send(pack(obj));
  }
}
