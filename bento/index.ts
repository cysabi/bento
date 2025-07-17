import { Server } from "./src/server";
import type { ServerConfig } from "./src/types";

const box = async <S extends Record<string, unknown>>(
  state: ServerConfig<S>
) => {
  const bento = new Server(state);

  // TODO : print something cool to the console

  return Bun.serve({
    port: 4400,
    routes: {
      "/": () => new Response(Bun.file("dist/index.html")),
      "/_ws": (req, server) => {
        const success = server.upgrade(req);
        if (!success) return new Response(null, { status: 426 });
      },
      "/*": (req) => new Response(Bun.file("dist" + new URL(req.url).pathname)),
    },
    websocket: bento.ws,
    development: process.env.NODE_ENV !== "production" && {
      hmr: true,
      console: true,
    },
  });

  //   // // set up vite dev server or vite static
  //   if (false) {
  //     // const createViteServer = (await import("vite")).createServer;
  //     // const vite = await createViteServer({ server: { middlewareMode: true } });
  //     // app.use(fromNodeMiddleware(vite.middlewares));
  //   } else {
  //     app.use(
  //       "/",
  //       defineEventHandler((event) =>
  //         serveStatic(event, {
  //           getContents: (id) => Bun.file(join("dist", id)),
  //           getMeta: async (id) => {
  //             const file = Bun.file(join("dist", id));
  //             if (await file.exists())
  //               return { size: file.size, mtime: file.lastModified };
  //           },
  //         })
  //       )
  //     );
  //   }
};

export type * from "./src/types";
export default { box };
