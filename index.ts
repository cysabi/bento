import { createApp, toWebHandler, fromNodeMiddleware } from "h3";

const app = createApp();

const createViteServer = (await import("vite")).createServer;

const vite = await createViteServer({
  server: { middlewareMode: true },
  build: { target: "chrome95" },
});

app.use(fromNodeMiddleware(vite.middlewares));

Bun.serve({ fetch: toWebHandler(app) });
