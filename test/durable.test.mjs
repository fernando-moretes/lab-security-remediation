import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync, fork } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { initializeDurableLab, DurableLab, faultPoints } from "../durable.mjs";
import { initialState, propose, approve, finding } from "../lab.mjs";

const worker = fileURLToPath(new URL("./helpers/durable-worker.mjs", import.meta.url));
const cli = fileURLToPath(new URL("../bin/cli.mjs", import.meta.url));
function setup(t) {
  const directory = mkdtempSync(join(tmpdir(), "durable-lab-test-"));
  const path = join(directory, "lab.sqlite");
  initializeDurableLab(path);
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return path;
}
function request(state = initialState(), id = finding.id) {
  const proposal = propose({ ...finding, id }, state);
  return { proposal, approval: approve(proposal, state, "synthetic-reviewer") };
}
function withLab(path, fn) { const lab = new DurableLab(path); try { return fn(lab); } finally { lab.close(); } }
function child(path, req, crash = "") {
  return spawnSync(process.execPath, [worker, path, JSON.stringify(req), crash], {
    encoding: "utf8", timeout: 15000,
  });
}
async function concurrent(path, requests) {
  const children = requests.map((r) => fork(worker, [path, JSON.stringify(r)], { silent: true }));
  const diagnostics = new Map();
  const results = children.map((p) => new Promise((resolve, reject) => {
    let stdout = "", stderr = "";
    p.stdout.on("data", (s) => stdout += s);
    p.stderr.on("data", (s) => { stderr += s; diagnostics.set(p, stderr); });
    p.on("error", reject);
    p.on("exit", (code) => resolve({ code, stdout, stderr }));
  }));
  const timer = setTimeout(() => children.forEach((p) => p.kill()), 15000);
  try {
    await Promise.all(children.map((p) => new Promise((resolve, reject) => {
      p.once("message", resolve); p.once("error", reject);
      p.once("exit", () => reject(new Error(`Worker exited before ready: ${diagnostics.get(p) ?? "no stderr"}`)));
    })));
    children.forEach((p) => p.send("start"));
    return await Promise.all(results);
  } finally {
    clearTimeout(timer);
    children.forEach((p) => { if (p.exitCode === null) p.kill(); });
    await Promise.allSettled(results);
  }
}

test("explicit initialization refuses existing files; corrupt/foreign DBs are never reset", (t) => {
  const path = setup(t);
  assert.throws(() => initializeDurableLab(path), /EEXIST/);
  const foreign = path + ".foreign";
  writeFileSync(foreign, "not-a-database");
  assert.throws(() => new DurableLab(foreign));
  assert.equal(readFileSync(foreign, "utf8"), "not-a-database");
  const empty = path + ".empty";
  new DatabaseSync(empty).close();
  assert.throws(() => new DurableLab(empty), /Unknown database/);
});
test("receipt and ledger survive reopen; duplicates never advance target twice", (t) => {
  const path = setup(t), r = request();
  withLab(path, (lab) => assert.equal(lab.execute(r.proposal, r.approval).status, "applied"));
  withLab(path, (lab) => {
    assert.equal(lab.execute(r.proposal, r.approval).status, "applied");
    const snapshot = lab.inspect();
    assert.equal(snapshot.state.version, 2);
    assert.equal(snapshot.receipts.length, 1);
    assert.equal(snapshot.events.length, 2);
  });
});
for (const point of faultPoints) test(`real subprocess exit at ${point}: restart reconciles without a second effect`, (t) => {
  const path = setup(t), r = request();
  const crashed = child(path, r, point);
  assert.equal(crashed.status, 86, crashed.stderr);
  withLab(path, (lab) => {
    const recovery = lab.recover(finding.id);
    if (["after-intent", "target-before-commit"].includes(point)) {
      assert.equal(recovery.status, "pending");
      assert.equal(recovery.retryable, true);
      assert.equal(recovery.state.version, 1);
      assert.equal(recovery.receipt, null);
    } else {
      assert.equal(recovery.status, point === "after-ledger" ? "applied" : "reconciled");
      assert.equal(recovery.state.version, 2);
      assert.ok(recovery.receipt);
    }
  });
  // A different process resumes the exact reviewed request after reconciliation.
  const resumed = child(path, r);
  assert.equal(resumed.status, 0, resumed.stderr);
  withLab(path, (lab) => {
    assert.equal(lab.inspect().state.version, 2);
    assert.equal(lab.inspect().receipts.length, 1);
  });
});
test("uncertain result requires intervention; matching value without receipt is not success", (t) => {
  const path = setup(t), r = request();
  assert.equal(child(path, r, "after-intent").status, 86);
  withLab(path, (lab) => {
    lab.simulateDrift(true);
    assert.equal(lab.recover(finding.id).status, "uncertain");
    const version = lab.inspect().state.version;
    const retried = lab.execute(r.proposal, r.approval);
    assert.equal(retried.status, "uncertain");
    assert.equal(retried.retryable, false);
    assert.equal(lab.inspect().state.version, version);
    assert.equal(lab.inspect().receipts.length, 0);
  });
});
test("later drift does not erase the receipt or trigger an automatic rollback", (t) => {
  const path = setup(t), r = request();
  assert.equal(child(path, r, "after-target").status, 86);
  withLab(path, (lab) => {
    lab.simulateDrift(false);
    const result = lab.recover(finding.id);
    assert.equal(result.status, "reconciled");
    assert.equal(result.driftAfterReceipt, true);
    assert.equal(result.state.blockPublicAccess, false);
    lab.execute(r.proposal, r.approval);
    assert.equal(lab.inspect().state.version, 3);
  });
});
test("rejected approval or tampered digest leaves no intent or side effect", (t) => {
  const path = setup(t), r = request();
  withLab(path, (lab) => {
    assert.throws(() => lab.execute(r.proposal, null));
    assert.throws(() => lab.execute({ ...r.proposal, digest: "tampered" }, r.approval));
    assert.equal(lab.inspect().operations.length, 0);
    assert.equal(lab.inspect().state.version, 1);
  });
});
test("six simultaneous processes applying the same event produce one receipt and effect", async (t) => {
  const path = setup(t), r = request();
  const results = await concurrent(path, Array.from({ length: 6 }, () => r));
  for (const result of results) assert.equal(result.code, 0, result.stderr);
  withLab(path, (lab) => {
    assert.equal(lab.inspect().state.version, 2);
    assert.equal(lab.inspect().receipts.length, 1);
    assert.equal(lab.inspect().operations.length, 1);
  });
});
test("concurrent conflicting payloads cannot reuse an operation id", async (t) => {
  const path = setup(t);
  const results = await concurrent(path, [request(), request({ ...initialState(), version: 2 })]);
  assert.deepEqual(results.map((r) => r.code).sort(), [0, 1]);
  assert.match(results.find((r) => r.code === 1).stderr, /Conflicting replay/);
  withLab(path, (lab) => assert.ok(lab.inspect().state.version <= 2));
});
test("different operations competing for the same target version do not both change it", async (t) => {
  const path = setup(t);
  const results = await concurrent(path, [request(initialState(), "event-a"), request(initialState(), "event-b")]);
  for (const result of results) assert.equal(result.code, 0, result.stderr);
  assert.deepEqual(results.map((r) => JSON.parse(r.stdout).status).sort(), ["applied", "uncertain"]);
  withLab(path, (lab) => assert.equal(lab.inspect().state.version, 2));
});
test("documented CLI crash, inspect and recover workflow works across processes", (t) => {
  const path = setup(t), proposalPath = path + ".proposal.json";
  writeFileSync(proposalPath, JSON.stringify(request().proposal));
  const run = (...args) => spawnSync(process.execPath, [cli, "durable", ...args], { encoding: "utf8", timeout: 15000 });
  assert.equal(run("run", path, proposalPath).status, 1, "explicit --approve is required");
  assert.equal(run("run", path, proposalPath, "--approve", "--crash", "unknown").status, 1);
  assert.equal(run("run", path, proposalPath, "--approve", "--crash", "after-target").status, 86);
  const snapshot = JSON.parse(run("inspect", path).stdout);
  assert.equal(snapshot.operations[0].status, "pending");
  const recovered = run("recover", path, finding.id);
  assert.equal(recovered.status, 0, recovered.stderr);
  assert.equal(JSON.parse(recovered.stdout).status, "reconciled");
  assert.equal(JSON.parse(run("run", path, proposalPath, "--approve").stdout).state.version, 2);
});
