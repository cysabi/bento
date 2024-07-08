import { pack, unpack } from "msgpackr";
import {
  createApp,
  defineEventHandler,
  defineWebSocketHandler,
  serveStatic,
  toNodeListener,
  toWebHandler,
  type App,
} from "h3";
import wsAdapter from "crossws/adapters/node";
import { join } from "path";
import type {
  Message,
  Emit,
  Clients,
  ServerWebSocket,
  Setter,
  Actions,
  ServerConfig,
  Model,
} from "../types";
import { createServer } from "node:http";
import { State } from "./state";
import { Persist } from "./persist";

export class Server<S extends Record<string, unknown>> {
  #state: State<S>;
  #actions: Actions<S>;
  #persist: Persist<S>;
  #clients: Clients;
  app: App;

  constructor(config: ServerConfig<S>) {
    const model: Model<S> = {
      state: {} as S,
      actions: {},
    };

    Object.entries(config).forEach(([key, value]) => {
      // TODO: deep search for an external lib
      if (typeof value === "function") {
        model.actions[key] = value as Actions<S>[keyof Actions<S>];
      } else {
        model.state[key as keyof S] = value as S[keyof S];
      }
    });

    this.#state = new State<S>(model.state);
    this.#actions = model.actions;
    this.#persist = new Persist("bento.db");
    this.#clients = new Map();

    // replay patches
    this.#state.sink = this.#persist.patches();
    this.#state.flush();

    // collapse db
    this.#persist.clear();
    this.#persist.init(this.#state.snap());

    // create app
    this.app = createApp();
    this.app.use(
      "/_ws",
      defineWebSocketHandler({
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
      })
    );
  }

  serve(prod = true) {
    if (prod) {
      this.app.use(
        "/",
        defineEventHandler((event) =>
          serveStatic(event, {
            getContents: (id) => Bun.file(join("dist", id)),
            getMeta: async (id) => {
              const file = Bun.file(join("dist", id));
              if (await file.exists())
                return { size: file.size, mtime: file.lastModified };
            },
          })
        )
      );
    }

    const { handleUpgrade } = wsAdapter(this.app.websocket);
    const server = createServer(toNodeListener(this.app));
    server.on("upgrade", handleUpgrade);
    return server;

    // const handleHttp = toWebHandler(this.app);
    // return Bun.serve({
    //   port: process.env["PORT"] || 4400,
    //   websocket,
    //   async fetch(req, server) {
    //     if (await handleUpgrade(req, server)) {
    //       return;
    //     }
    //     return handleHttp(req);
    //   },
    // });
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
      this.#persist.append(this.#state.sink);
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
