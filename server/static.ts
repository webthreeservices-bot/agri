import express, { type Express } from "express";
import path from "path";
import fs from "fs";
import { log } from "./index";

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist", "public");
  
  if (!fs.existsSync(distPath)) {
    log(`Warning: dist/public directory not found at ${distPath}`, "static");
  }

  app.use(express.static(distPath));

  app.get("*", (req, res) => {
    // For API routes, if they reach here, they are truly not found
    if (req.path.startsWith("/api")) {
      return res.status(404).json({ message: "API route not found" });
    }

    const indexPath = path.resolve(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      log(`Error: index.html not found at ${indexPath}`, "static");
      res.status(404).send("Application files not found. Please check build logs.");
    }
  });
}
