import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { get } from "node:http";
import { selfTest } from "../lab.mjs";
import { scenarios, runScenario } from "../scenarios.mjs";
import { startServer } from "../server.mjs";

test("original seven security behavior tests remain passing", () => {
  assert.equal(selfTest().passed, 7);
});
test("demonstrations expose distinct expected state transitions", () => {
  const expected = {
    approved: ["simulated-change", 2, true, 1],
    unapproved: ["rejected", 1, false, 0],
    tampering: ["rejected", 1, false, 0],
    drift: ["rejected", 2, false, 0],
    duplicate: ["duplicate", 2, true, 1],
    rollback: ["reviewed-rollback", 3, false, 1],
    conflict: ["rejected", 2, true, 1],
  };
  for (const { id } of scenarios) {
    const r = runScenario(id);
    assert.deepEqual([r.outcome, r.after.version, r.after.blockPublicAccess, r.ledgerEntries], expected[id], id);
    assert.equal(r.cloudCalls, 0);
    assert.equal(r.telemetry, false);
  }
  assert.throws(() => runScenario("unknown"), /Unknown scenario/);
});
test("CLI rejects typos and supports machine-readable scenarios", () => {
  const cli = new URL("../bin/cli.mjs", import.meta.url);
  const run = (...args) => spawnSync(process.execPath, [fileURLToPath(cli), ...args], { encoding: "utf8" });
  assert.equal(run("deploy").status, 1);
  assert.equal(run("demo", "--force").status, 1);
  assert.equal(run("scenarios", "--lang", "xx").status, 1);
  const result = run("scenarios", "all", "--json");
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).length, 7);
  assert.match(run("scenarios", "drift", "--lang", "en").stdout, /State drift/);
});
test("local UI serves only fixed assets and read-only synthetic scenarios", async () => {
  const server = await startServer();
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const page = await fetch(base);
    assert.equal(page.status, 200);
    assert.match(page.headers.get("content-security-policy"), /frame-ancestors 'none'/);
    assert.match(await page.text(), /id="scenarios"/);
    assert.equal((await (await fetch(`${base}/scenarios.json`)).json()).length, 7);
    assert.equal((await fetch(`${base}/package.json`)).status, 404);
    assert.equal((await fetch(`${base}/%2e%2e/.npmrc`)).status, 404);
    assert.equal((await fetch(base, { method: "POST" })).status, 405);
    const hostileHostStatus = await new Promise((resolve, reject) => {
      get(base, { headers: { Host: "example.com" } }, (r) => { r.resume(); resolve(r.statusCode); }).on("error", reject);
    });
    assert.equal(hostileHostStatus, 403);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
