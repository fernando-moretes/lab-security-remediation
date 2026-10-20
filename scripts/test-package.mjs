import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const temp = mkdtempSync(join(tmpdir(), "remediation-package-"));
// npm exposes the invoking CLI path consistently on Windows, macOS and Linux.
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("Run through npm run test:package");
function npm(args, cwd) {
  const r = spawnSync(process.execPath, [npmCli, ...args], { cwd, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  return r.stdout;
}
try {
  const packed = JSON.parse(npm(["pack", "--json", "--pack-destination", temp], root))[0];
  const files = packed.files.map((f) => f.path);
  for (const required of ["bin/cli.mjs", "web/index.html", "web/app.js", "web/style.css", "lab.mjs", "server.mjs", "scenarios.mjs", "LICENSE.txt"]) assert.ok(files.includes(required), required);
  assert.ok(files.every((p) => !/^(test|scripts|\.github|node_modules)\//.test(p)), "No development-only files");
  npm(["install", "--ignore-scripts", "--no-audit", "--no-fund", "--package-lock=false", join(temp, packed.filename)], temp);
  const installed = join(temp, "node_modules", "security-remediation-review-lab");
  const manifest = JSON.parse(readFileSync(join(installed, "package.json"), "utf8"));
  assert.equal(manifest.version, "0.2.0");
  const r = spawnSync(process.execPath, [join(installed, "bin", "cli.mjs"), "test"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(JSON.parse(r.stdout).passed, 7);
  const linkedCli = JSON.parse(npm(["exec", "--offline", "--", "security-remediation-lab", "scenarios", "drift", "--json"], temp));
  assert.equal(linkedCli[0].outcome, "rejected");
  const { startServer } = await import(pathToFileURL(join(installed, "server.mjs")));
  const server = await startServer();
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}`);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Security remediation review lab/);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
  console.log(`PASS: packed ${packed.filename}, installed CLI and web UI, ${files.length} allowlisted files`);
} finally { rmSync(temp, { recursive: true, force: true }); }
