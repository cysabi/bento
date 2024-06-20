import type {
  Message,
  Emit,
  Clients,
  ServerWebSocket,
  Setter,
  Handler,
  Actions,
  ServerConfig,
} from "../types";
import { pack, unpack } from "msgpackr";
import { State } from "./state";
// import { Persist } from "./persist";

export class Server<S extends Record<string, unknown>> {
  #state: State<S>;
  #actions: Actions<S>;
  // #persist: Persist<S>;
  #clients: Clients;
  wss: Handler;

  constructor(config: ServerConfig<S>) {
    this.#state = new State<S>(config.state);
    this.#actions = config.actions;
    // this.#persist = new Persist("bento.db");
    this.#clients = new Map();

    // replay patches
    // this.#state.sink = this.#persist.patches();
    this.#state.flush();

    // collapse db
    // this.#persist.clear();
    // this.#persist.init(this.#state.snap());

    this.wss = {
      message: (ws, msg) => {
        const data: Message = unpack(msg.rawData);

        console.info(`ws ~ message ~ ${JSON.stringify(data)}`);

        switch (data.type) {
          case "init":
            return this.#handleInit(data.scopes, ws);
          case "action":
            return this.#handleAction(data.action, data.payload);
        }
      },
      open: (ws) => {
        console.info("ws ~ open");
      },
      close: (ws) => {
        console.info("ws ~ close");
        this.#clients.delete(ws);
      },
    };
  }

  act(action: string, payload: any) {
    return this.#handleAction(action, payload);
  }

  #handleInit(scopes: string[][], ws: ServerWebSocket) {
    this.#clients.set(ws, scopes || [[]]);
    this.#emit({ ws });
  }

  #handleAction(action: string, payload: any) {
    const mutate = this.#actions?.[action];
    if (!mutate) return; // TODO: handle this?
    mutate(this.#handleActionStream.bind(this), payload);
  }
  #handleActionStream(setter: Setter<S>) {
    try {
      this.#state.stream(setter);
      for (const ws of this.#clients.keys()) {
        this.#emit({ ws, patches: this.#state.sink });
      }
      // this.#persist.append(this.#state.sink);
      this.#state.flush();
    } finally {
      // TODO: error handling?
      this.#state.flush(false);
    }
  }

  #emit({ ws, patches }: Emit) {
    const scopes = this.#clients.get(ws);
    return ws.send(
      pack({
        type: "emit",
        patches: patches
          ? patches.filter((patch) => {
              return scopes?.some((scope) => {
                return scope.every((c, i) => {
                  if (patch.path?.[i] === undefined) {
                    return true;
                  }
                  return c === patch.path[i];
                });
              });
            })
          : scopes?.map((c) => ({
              path: c,
              value: c.reduce((slice: any, p) => {
                return slice?.[p];
              }, this.#state.snap()),
            })),
      })
    );
  }
}
