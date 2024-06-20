import type { Actions, ServerConfig } from "./types";
import {
  createApp,
  defineEventHandler,
  defineWebSocketHandler,
  fromNodeMiddleware,
  serveStatic,
  toWebHandler,
} from "h3";
import wsAdapter from "crossws/adapters/bun";
import { Server as BentoServer } from "./server";
import { join } from "path";

export type BentoBoxModel<S> = S | Actions<S>;

const DEV_MODE = false;

export const box = async <S extends Record<string, unknown>>(
  model: BentoBoxModel<S>,
  init?: (act: (action: string, payload: any) => void) => void
) => {
  const config: ServerConfig<S> = {
    state: {} as S,
    actions: {},
  };

  Object.entries(model).forEach(([key, value]) => {
    // TODO: deep search for an external lib
    if (typeof value === "function") {
      config.actions[key] = value as Actions<S>[keyof Actions<S>];
    } else {
      config.state[key as keyof S] = value as S[keyof S];
    }
  });

  const app = createApp();

  if (DEV_MODE) {
    // const createViteServer = (await import("vite")).createServer;
    // const vite = await createViteServer({
    //   server: { middlewareMode: true },
    //   build: { target: "chrome95" },
    // });
    // app.use(fromNodeMiddleware(vite.middlewares));
  } else {
    app.use(
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

  // websocket server
  const server = new BentoServer(config);
  if (init) init(server.act.bind(server));
  app.use("/_ws", defineWebSocketHandler(server.wss));

  // serve
  const { handleUpgrade, websocket } = wsAdapter(app.websocket);
  const handleHttp = toWebHandler(app);
  return Bun.serve({
    port: 4400,
    websocket,
    async fetch(req, server) {
      if (await handleUpgrade(req, server)) {
        return;
      }
      return handleHttp(req);
    },
  });
};
