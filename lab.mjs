/**
 * Security remediation review lab v0.4.0
 * Copyright (c) 2026 Fernando Azevedo. MIT; see LICENSE.txt.
 * LOCAL SIMULATION ONLY. No network, AWS SDK, credentials or cloud mutations.
 * Requires Node.js >= 22. Run: node lab.mjs --self-test
 */
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { realpathSync } from "node:fs";
import assert from "node:assert/strict";

const digest = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export const initialState = () => ({
  resource: "synthetic-bucket",
  version: 1,
  blockPublicAccess: false,
});
export const finding = Object.freeze({
  id: "synthetic-finding-001",
  resource: "synthetic-bucket",
  control: "BLOCK_PUBLIC_ACCESS",
});

export function propose(input, state) {
  if (input?.control !== "BLOCK_PUBLIC_ACCESS" || input.resource !== state.resource) {
    throw new Error("Unsupported finding or resource");
  }
  const change = {
    findingId: input.id,
    resource: state.resource,
    expectedVersion: state.version,
    before: state.blockPublicAccess,
    after: true,
  };
  return { change, digest: digest(change) };
}

function validate(proposal, state) {
  const c = proposal?.change;
  if (!c || Object.keys(c).sort().join(",") !== "after,before,expectedVersion,findingId,resource") {
    throw new Error("Invalid proposal schema");
  }
  if (typeof c.findingId !== "string" || c.findingId.length === 0 ||
      c.resource !== state.resource || !Number.isSafeInteger(c.expectedVersion) ||
      typeof c.before !== "boolean" || c.after !== true ||
      proposal.digest !== digest(c)) {
    throw new Error("Invalid proposal scope, action or digest");
  }
}

// This approval represents an explicit CLI review, NOT authenticated IAM identity.
export function approve(proposal, state, reviewer) {
  validate(proposal, state);
  if (typeof reviewer !== "string" || !reviewer.trim()) throw new Error("Reviewer required");
  return { digest: proposal.digest, reviewer: reviewer.trim(), decision: "approve" };
}

export function apply(proposal, approval, state, ledger) {
  validate(proposal, state);
  if (!approval || approval.decision !== "approve" ||
      approval.digest !== proposal.digest || !approval.reviewer?.trim()) {
    throw new Error("Approval must bind to the exact proposal");
  }
  // Same finding cannot silently authorize another operation.
  const prior = ledger.get(proposal.change.findingId);
  if (prior) {
    if (prior.digest !== proposal.digest) throw new Error("Conflicting replay");
    return { state, status: "duplicate", digest: proposal.digest };
  }
  if (state.version !== proposal.change.expectedVersion ||
      state.blockPublicAccess !== proposal.change.before) {
    throw new Error("Stale proposal: inspect current state and request a new review");
  }
  const next = { ...state, version: state.version + 1, blockPublicAccess: true };
  ledger.set(proposal.change.findingId, {
    digest: proposal.digest, before: { ...state }, after: { ...next },
  });
  return { state: next, status: "simulated-change", digest: proposal.digest };
}

export function rollback(proposal, current, ledger, explicitlyApproved) {
  const record = ledger.get(proposal.change.findingId);
  if (explicitlyApproved !== true || !record || record.digest !== proposal.digest ||
      JSON.stringify(current) !== JSON.stringify(record.after)) {
    throw new Error("Rollback needs review and unchanged post-apply state");
  }
  // Keep the ledger: replaying the old finding must not reapply after rollback.
  return { ...record.before, version: current.version + 1 };
}

export function selfTest() {
  const results = [];
  const test = (name, fn) => { fn(); results.push({ name, passed: true }); };
  test("unapproved proposal cannot change state", () => {
    const state = initialState(), ledger = new Map(), p = propose(finding, state);
    assert.throws(() => apply(p, null, state, ledger), /Approval/);
    assert.equal(state.blockPublicAccess, false);
    assert.equal(ledger.size, 0);
  });
  test("approved change is applied once; duplicate delivery is harmless", () => {
    const s = initialState(), ledger = new Map(), p = propose(finding, s);
    const a = approve(p, s, "local-reviewer");
    const first = apply(p, a, s, ledger);
    assert.equal(first.state.blockPublicAccess, true);
    const second = apply(p, a, first.state, ledger);
    assert.equal(second.status, "duplicate");
    assert.deepEqual(second.state, first.state);
    assert.equal(ledger.size, 1);
  });
  test("modified proposal cannot reuse approval", () => {
    const s = initialState(), p = propose(finding, s), a = approve(p, s, "reviewer");
    const changed = { ...p, change: { ...p.change, findingId: "another" } };
    changed.digest = digest(changed.change);
    assert.throws(() => apply(changed, a, s, new Map()), /Approval/);
  });
  test("resource drift forces a fresh review", () => {
    const s = initialState(), p = propose(finding, s), a = approve(p, s, "reviewer");
    assert.throws(() => apply(p, a, { ...s, version: 2 }, new Map()), /Stale/);
  });
  test("unknown tool instructions cannot widen the action", () => {
    const s = initialState(), p = propose(finding, s);
    p.change.grantAdministrator = true;
    p.digest = digest(p.change);
    assert.throws(() => approve(p, s, "reviewer"), /schema/);
    assert.throws(() => propose({ ...finding, resource: "other-bucket" }, s), /Unsupported/);
  });
  test("rollback needs review; old event does not reapply afterwards", () => {
    const s = initialState(), ledger = new Map(), p = propose(finding, s);
    const a = approve(p, s, "reviewer"), first = apply(p, a, s, ledger);
    assert.throws(() => rollback(p, first.state, ledger, false), /Rollback/);
    assert.throws(() => rollback(p, { ...first.state, version: 3 }, ledger, true), /Rollback/);
    const restored = rollback(p, first.state, ledger, true);
    assert.equal(restored.blockPublicAccess, false);
    assert.equal(apply(p, a, restored, ledger).status, "duplicate");
  });
  test("conflicting replay is rejected", () => {
    const s = initialState(), ledger = new Map(), p = propose(finding, s);
    const next = apply(p, approve(p, s, "reviewer"), s, ledger).state;
    const changed = propose(finding, next);
    assert.throws(() => apply(changed, approve(changed, next, "reviewer"), next, ledger), /Conflicting/);
  });
  return { labVersion: "0.4.0", mode: "local-simulation", tests: results, passed: results.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.includes("--self-test")) {
    console.log(JSON.stringify(selfTest(), null, 2));
  } else if (args.length === 0 || (args.length === 1 && args[0] === "--approve")) {
    const state = initialState(), proposal = propose(finding, state);
    const report = { labVersion: "0.4.0", mode: "local-simulation", proposal,
      cloudCalls: 0, cloudResourcesCreated: 0 };
    if (args[0] === "--approve") {
      report.result = apply(proposal, approve(proposal, state, "explicit-cli-review"), state, new Map());
    } else {
      report.next = "Inspect the proposal, then run node lab.mjs --approve to simulate review.";
    }
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.error("Usage: node lab.mjs [--self-test | --approve]");
    process.exitCode = 1;
  }
}
