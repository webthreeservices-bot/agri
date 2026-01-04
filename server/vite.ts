import { type Express } from "express";
import { type Server } from "http";
import path from "path";
import { createServer as createViteServer } from "vite";
import { log } from "./index";
import fs from "fs";

export async function setupVite(httpServer: Server, app: Express) {
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      hmr: { server: httpServer },
    },
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientIndexHtml = path.resolve(process.cwd(), "client", "index.html");
      let template = fs.readFileSync(clientIndexHtml, "utf-8");
      template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
