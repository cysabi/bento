import { Server } from "./src/server";
import type { ServerConfig } from "./src/types";

const bento = {
  box: async <S extends Record<string, unknown>>(
    state: ServerConfig<S>
  ): Promise<Bun.Server> => {
    const bento = new Server(state);

    const server = Bun.serve({
      port: 4400,
      routes: {
        "/_ws": (req, server) => {
          const success = server.upgrade(req);
          if (!success) return new Response(null, { status: 426 });
        },
        "/*": async (req) => {
          const asset = Bun.file("dist" + new URL(req.url).pathname);
          if (await asset.exists()) return new Response(asset);

          return new Response(Bun.file("dist/index.html"));
        },
      },
      websocket: bento.ws,
      development: process.env.NODE_ENV !== "production" && {
        hmr: true,
        console: true,
      },
    });
    console.log(server);
    return server;

    //   // // set up vite dev server or vite static
    //   if (false) {
    //     // const createViteServer = (await import("vite")).createServer;
    //     // const vite = await createViteServer({ server: { middlewareMode: true } });
    //     // app.use(fromNodeMiddleware(vite.middlewares));
    //   } else {
    //     app.use(
    //       "/",
    //       defineEventHandler((event) =>
    //         serveStatic(...)
    //       )
    //     );
    //   }
  },
};

export type * from "./src/types";
export default bento;
