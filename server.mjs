import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { scenarios, runScenario } from "./scenarios.mjs";

export async function startServer() {
  const assets = new Map([
    ["/", ["index.html", "text/html; charset=utf-8"]],
    ["/app.js", ["app.js", "text/javascript; charset=utf-8"]],
    ["/style.css", ["style.css", "text/css; charset=utf-8"]],
  ]);
  const server = createServer(async (req, res) => {
    res.setHeader("Content-Security-Policy", "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "no-store");
    // Serve only the local host and fixed demonstration assets, never the filesystem.
    if (req.headers.host !== `127.0.0.1:${server.address().port}`) {
      res.writeHead(403).end("Forbidden"); return;
    }
    if (req.method !== "GET") { res.writeHead(405, { Allow: "GET" }).end(); return; }
    if (req.url === "/scenarios.json") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(scenarios.map((s) => runScenario(s.id)))); return;
    }
    const asset = assets.get(req.url);
    if (!asset) { res.writeHead(404).end("Not found"); return; }
    try {
      const body = await readFile(new URL(`./web/${asset[0]}`, import.meta.url));
      res.writeHead(200, { "Content-Type": asset[1] }); res.end(body);
    } catch { res.writeHead(500).end("Unable to load demonstration"); }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return server;
}
