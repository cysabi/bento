#!/usr/bin/env node

import { defineCommand, runMain } from "citty";
import { fromNodeMiddleware } from "h3";
import { Server } from "./src/server";

const bentoBox = (await import(Bun.resolveSync("./bento.box", process.cwd())))
  .default;

const main = defineCommand({
  subCommands: {
    dev: defineCommand({
      run: async () => {
        const bento = new Server(bentoBox);

        const createViteServer = (await import("vite")).createServer;
        const vite = await createViteServer({
          server: { middlewareMode: true },
          build: { target: "chrome95" },
        });
        bento.app.use(fromNodeMiddleware(vite.middlewares));

        return bento.serve();
      },
    }),
    preview: defineCommand({
      run: async () => {
        const bento = new Server(bentoBox);

        return bento.serve(true);
      },
    }),
    build: defineCommand({
      run: async () => {
        const bento = new Server(bentoBox);

        const viteBuild = (await import("vite")).build;
        await viteBuild({ build: { target: "chrome95" } });

        return bento.serve(true);
      },
    }),
  },
});

runMain(main);
