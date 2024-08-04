import {
  createApp,
  defineEventHandler,
  defineWebSocketHandler,
  serveStatic,
  toNodeListener,
  type App,
  type WebSocketOptions,
} from "h3";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join } from "path";
import { listen, listenAndWatch } from "listhen";
const box = async <S extends Record<string, unknown>>(): Promise<App> =>
  // config: ServerConfig<S>
  {
    // const chain = {
    //   [Symbol.for("config")]: config,
    //   init: (init: (setter: Setter<S>) => Promise<void> | void) => {
    //     config.init = init;
    //     return chain;
    //   },
    // };
    // return chain;
    const app = createApp();

    app.use(
      "/",
      defineEventHandler((event) =>
        serveStatic(event, {
          getContents: (id) =>
            readFile(join("dist", id)).then((file) => file.toString()),
          getMeta: async (id) => {
            const stats = await stat(join("dist", id)).catch(() => {});
            if (stats && stats.isFile())
              return { size: stats.size, mtime: stats.mtimeMs };
          },
        })
      )
    );
  };

export type * from "./types";
export default { box };
