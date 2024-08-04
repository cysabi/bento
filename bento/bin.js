#!/usr/bin/env node

import { defineCommand, runMain } from "citty";
import { Server } from "./src/server";
import path from "path";
import { fileURLToPath } from "url";
import {
  createApp,
  defineEventHandler,
  defineWebSocketHandler,
  serveStatic,
  toNodeListener,
  fromNodeMiddleware,
} from "h3";
import wsAdapter from "crossws/adapters/node";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { listen, listenAndWatch } from "listhen";

const bentoBox = (
  await import(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "./bento.box")
  )
).default;

const main = defineCommand({
  subCommands: {
    dev: defineCommand({
      run: async () => {
        const bento = new Server(bentoBox);

        const viteCreateServer = (await import("vite")).createServer;
        const vite = await viteCreateServer({
          build: { target: "chrome95", sourcemap: true },
          server: { middlewareMode: true },
        });

        const app = createApp();
        app.use("/_ws", defineWebSocketHandler(bento.ws));
        app.use(fromNodeMiddleware(vite.middlewares));

        const { handleUpgrade } = wsAdapter(app.websocket);
        const server = createServer(toNodeListener(app));
        server.on("upgrade", handleUpgrade);

        return server;
      },
    }),
    preview: defineCommand({
      run: async () => {
        const bento = new Server(bentoBox);

        const viteBuild = (await import("vite")).build;
        await viteBuild({ build: { target: "chrome95", sourcemap: true } });

        const app = createApp();
        app.use("/_ws", defineWebSocketHandler(bento.ws));
        app.use(
          "/",
          defineEventHandler((event) =>
            serveStatic(event, {
              getContents: (id) =>
                readFile(path.join("dist", id)).then((file) => file.toString()),
              getMeta: async (id) => {
                const stats = await stat(path.join("dist", id)).catch(() => {});
                if (stats && stats.isFile())
                  return { size: stats.size, mtime: stats.mtimeMs };
              },
            })
          )
        );

        const { handleUpgrade } = wsAdapter(app.websocket);
        const server = createServer(toNodeListener(app));
        server.on("upgrade", handleUpgrade);

        return server;
      },
    }),
    compile: defineCommand({}),
  },
});

runMain(main);
