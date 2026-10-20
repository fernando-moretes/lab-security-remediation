import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { initialState, finding, propose, approve, apply, rollback } from "./lab.mjs";

const definitions = [
  ["approved", "Mudança revisada", "Reviewed change",
    "Uma aprovação explícita autoriza apenas esta proposta simulada.",
    "Explicit approval authorizes only this simulated proposal."],
  ["unapproved", "Sem aprovação", "Missing approval",
    "Uma proposta válida não basta para mudar o estado.",
    "A valid proposal alone cannot change state."],
  ["tampering", "Proposta adulterada", "Tampered proposal",
    "Recalcular o digest não torna a aprovação anterior válida.",
    "Recomputing the digest does not make the previous approval valid."],
  ["drift", "Estado divergente", "State drift",
    "Uma mudança de versão exige nova inspeção e revisão.",
    "A version change requires fresh inspection and review."],
  ["duplicate", "Entrega duplicada", "Duplicate delivery",
    "O ledger em memória reconhece a mesma proposta já aplicada.",
    "The in-memory ledger recognizes the same already-applied proposal."],
  ["rollback", "Rollback revisado", "Reviewed rollback",
    "Restaurar um estado inseguro também exige revisão explícita.",
    "Restoring an insecure state also requires explicit review."],
  ["conflict", "Replay conflitante", "Conflicting replay",
    "O mesmo finding não autoriza silenciosamente outra operação.",
    "The same finding cannot silently authorize another operation."],
];
export const scenarios = definitions.map(([id, pt, en, whyPt, whyEn]) =>
  Object.freeze({ id, title: { pt, en }, lesson: { pt: whyPt, en: whyEn } }));

export function runScenario(id) {
  const metadata = scenarios.find((item) => item.id === id);
  if (!metadata) throw new Error(`Unknown scenario: ${id}`);
  const before = initialState(), ledger = new Map();
  const proposal = propose(finding, before);
  const approval = approve(proposal, before, "simulated-reviewer");
  let after = before, outcome, rejection;
  const steps = [{ action: "propose", value: proposal }];
  const reject = (fn, pattern) => {
    assert.throws(fn, (error) => {
      assert.match(error.message, pattern);
      rejection = error.message;
      return true;
    });
    outcome = "rejected";
    steps.push({ action: "reject", value: rejection });
  };
  const applyOnce = () => {
    const result = apply(proposal, approval, before, ledger);
    after = result.state;
    steps.push({ action: "apply", value: result });
    return result;
  };
  if (id === "unapproved") reject(() => apply(proposal, null, before, ledger), /Approval/);
  else if (id === "tampering") {
    const modified = { ...proposal, change: { ...proposal.change, findingId: "synthetic-finding-002" } };
    modified.digest = createHash("sha256").update(JSON.stringify(modified.change)).digest("hex");
    steps.push({ action: "tamper", value: modified });
    reject(() => apply(modified, approval, before, ledger), /Approval/);
  } else if (id === "drift") {
    after = { ...before, version: 2 };
    steps.push({ action: "external-drift", value: after });
    reject(() => apply(proposal, approval, after, ledger), /Stale/);
  } else {
    steps.push({ action: "simulated-approval", value: approval });
    outcome = applyOnce().status;
    if (id === "duplicate") {
      const duplicate = apply(proposal, approval, after, ledger);
      assert.equal(duplicate.status, "duplicate");
      outcome = duplicate.status;
      steps.push({ action: "replay", value: duplicate });
    } else if (id === "rollback") {
      reject(() => rollback(proposal, after, ledger, false), /Rollback/);
      after = rollback(proposal, after, ledger, true);
      outcome = "reviewed-rollback";
      steps.push({ action: "reviewed-rollback", value: after });
    } else if (id === "conflict") {
      const conflicting = propose(finding, after);
      steps.push({ action: "conflicting-proposal", value: conflicting });
      reject(() => apply(conflicting, approve(conflicting, after, "simulated-reviewer"), after, ledger), /Conflicting/);
    }
  }
  return { ...metadata, mode: "local-simulation", before, after, outcome,
    ...(rejection ? { rejection } : {}), steps, ledgerEntries: ledger.size,
    cloudCalls: 0, telemetry: false };
}
