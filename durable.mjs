/**
 * Local SQLite teaching implementation. No AWS operations or authenticated identity.
 * Ledger and synthetic target commit separately to expose the crash window.
 */
import { DatabaseSync } from "node:sqlite";
import { closeSync, openSync, statSync } from "node:fs";
import { approve, initialState } from "./lab.mjs";

const APPLICATION_ID = 1380797506;
export const faultPoints = Object.freeze([
  "after-intent", "target-before-commit", "after-target", "ledger-before-commit", "after-ledger",
]);
const SCHEMA = `
  PRAGMA application_id = ${APPLICATION_ID};
  PRAGMA user_version = 1;
  CREATE TABLE target (
    singleton INTEGER PRIMARY KEY CHECK(singleton=1),
    version INTEGER NOT NULL CHECK(version>=1),
    blocked INTEGER NOT NULL CHECK(blocked IN (0,1))
  ) STRICT;
  INSERT INTO target VALUES (1,1,0);
  CREATE TABLE operations (
    id TEXT PRIMARY KEY,
    digest TEXT NOT NULL,
    proposal TEXT NOT NULL,
    reviewer TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('pending','applied','reconciled','uncertain'))
  ) STRICT;
  CREATE TABLE receipts (
    id TEXT PRIMARY KEY REFERENCES operations(id),
    digest TEXT NOT NULL,
    version INTEGER NOT NULL,
    blocked INTEGER NOT NULL CHECK(blocked IN (0,1))
  ) STRICT;
  CREATE TABLE events (
    sequence INTEGER PRIMARY KEY,
    operation_id TEXT NOT NULL REFERENCES operations(id),
    status TEXT NOT NULL,
    reason TEXT NOT NULL
  ) STRICT;
`;

function configure(db) {
  db.exec("PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;");
  db.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;");
}
function transaction(db, fn) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const value = fn();
    db.exec("COMMIT");
    return value;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

/** Explicit initialization never overwrites an existing path. Parent must exist. */
export function initializeDurableLab(path) {
  closeSync(openSync(path, "wx", 0o600));
  const db = new DatabaseSync(path);
  try {
    configure(db);
    transaction(db, () => db.exec(SCHEMA));
  } finally { db.close(); }
  return { path, schemaVersion: 1, mode: "local-sqlite-simulation" };
}

export class DurableLab {
  #db;
  constructor(path) {
    if (!statSync(path).isFile()) throw new Error("Expected an initialized regular database file");
    const db = new DatabaseSync(path);
    try {
      // Opening WAL sidecars can contend too, before the first application write.
      // Install the connection-local busy handler before ANY schema read.
      db.exec("PRAGMA busy_timeout=5000;");
      // Verify ownership markers before enabling WAL or changing any schema.
      if (db.prepare("PRAGMA application_id").get().application_id !== APPLICATION_ID ||
          db.prepare("PRAGMA user_version").get().user_version !== 1) {
        throw new Error("Unknown database or unsupported schema; initialize a new dedicated lab");
      }
      if (db.prepare("PRAGMA quick_check").get().quick_check !== "ok") throw new Error("Database integrity check failed");
      configure(db);
      this.#db = db;
    } catch (error) { db.close(); throw error; }
  }
  close() { this.#db.close(); }
  #target() {
    const row = this.#db.prepare("SELECT version, blocked FROM target WHERE singleton=1").get();
    if (!row) throw new Error("Missing target state");
    return { resource: "synthetic-bucket", version: row.version, blockPublicAccess: Boolean(row.blocked) };
  }
  #operation(id) { return this.#db.prepare("SELECT * FROM operations WHERE id=?").get(id); }
  #receipt(id) { return this.#db.prepare("SELECT * FROM receipts WHERE id=?").get(id); }
  #event(id, status, reason) {
    this.#db.prepare("INSERT INTO events(operation_id,status,reason) VALUES (?,?,?)").run(id, status, reason);
  }
  #status(id, status, reason) {
    if (this.#operation(id).status === status) return;
    this.#db.prepare("UPDATE operations SET status=? WHERE id=?").run(status, id);
    this.#event(id, status, reason);
  }
  #result(operation, retryable = false) {
    const state = this.#target(), receipt = this.#receipt(operation.id);
    return {
      operationId: operation.id, status: operation.status, state, retryable,
      receipt: receipt ? { digest: receipt.digest, version: receipt.version, blockPublicAccess: Boolean(receipt.blocked) } : null,
      driftAfterReceipt: receipt ? state.version !== receipt.version || state.blockPublicAccess !== Boolean(receipt.blocked) : false,
      cloudCalls: 0,
    };
  }
  inspect() {
    // A single read transaction provides a consistent view without changing state.
    this.#db.exec("BEGIN");
    try {
      const result = {
        mode: "local-sqlite-simulation", state: this.#target(),
        operations: this.#db.prepare("SELECT id,digest,status FROM operations ORDER BY id").all(),
        receipts: this.#db.prepare("SELECT id,digest,version,blocked FROM receipts ORDER BY id").all(),
        events: this.#db.prepare("SELECT * FROM events ORDER BY sequence").all(),
      };
      this.#db.exec("COMMIT"); return result;
    } catch (error) { this.#db.exec("ROLLBACK"); throw error; }
  }
  execute(proposal, approval, { fault = () => {} } = {}) {
    // Validate before recording intent. This is still a simulated reviewer label.
    approve(proposal, initialState(), approval?.reviewer);
    const c = proposal.change;
    if (typeof c.findingId !== "string" || !c.findingId.trim() || c.findingId.length > 128 ||
        c.expectedVersion < 1 || c.expectedVersion >= Number.MAX_SAFE_INTEGER ||
        approval?.decision !== "approve" || approval.digest !== proposal.digest ||
        approval.reviewer.length > 128) throw new Error("Invalid bounded proposal or approval");
    const id = c.findingId;
    transaction(this.#db, () => {
      const prior = this.#operation(id);
      if (prior) {
        if (prior.digest !== proposal.digest) throw new Error("Conflicting replay");
        return;
      }
      this.#db.prepare("INSERT INTO operations VALUES (?,?,?,?, 'pending')").run(
        id, proposal.digest, JSON.stringify(proposal), approval.reviewer.trim());
      this.#event(id, "pending", "reviewed-intent-committed");
    });
    fault("after-intent");
    transaction(this.#db, () => {
      const operation = this.#operation(id);
      if (operation.status !== "pending" || this.#receipt(id)) return;
      // Target mutation and its receipt are atomic in THIS synthetic adapter.
      const changed = this.#db.prepare(
        "UPDATE target SET version=version+1,blocked=1 WHERE singleton=1 AND version=? AND blocked=?"
      ).run(c.expectedVersion, Number(c.before));
      if (changed.changes !== 1) {
        this.#status(id, "uncertain", "target-precondition-mismatch");
        return;
      }
      fault("target-before-commit");
      this.#db.prepare("INSERT INTO receipts VALUES (?,?,?,1)").run(id, proposal.digest, c.expectedVersion + 1);
    });
    fault("after-target");
    const result = transaction(this.#db, () => {
      const operation = this.#operation(id), receipt = this.#receipt(id);
      if (operation.status === "pending" && receipt?.digest === operation.digest) {
        this.#status(id, "applied", "target-receipt-confirmed");
      }
      fault("ledger-before-commit");
      return this.#result(this.#operation(id));
    });
    fault("after-ledger");
    return result;
  }
  recover(id) {
    return transaction(this.#db, () => {
      const operation = this.#operation(id);
      if (!operation) throw new Error("Unknown operation");
      const receipt = this.#receipt(id), proposal = JSON.parse(operation.proposal);
      if (receipt && receipt.digest === operation.digest) {
        if (["pending", "uncertain"].includes(operation.status)) {
          this.#status(id, "reconciled", "recovered-from-target-receipt");
        }
        return this.#result(this.#operation(id));
      }
      // Never infer success only from a matching boolean or retry uncertain work.
      const state = this.#target(), c = proposal.change;
      const retryable = operation.status === "pending" && !receipt &&
        state.version === c.expectedVersion && state.blockPublicAccess === c.before;
      if (!retryable) this.#status(id, "uncertain", "missing-receipt-or-target-drift");
      return this.#result(this.#operation(id), retryable);
    });
  }
  /** Explicit teaching aid: simulate an external change; never erase receipts. */
  simulateDrift(blocked) {
    if (typeof blocked !== "boolean") throw new Error("Drift value must be boolean");
    return transaction(this.#db, () => {
      this.#db.prepare("UPDATE target SET version=version+1,blocked=? WHERE singleton=1").run(Number(blocked));
      return this.#target();
    });
  }
}
