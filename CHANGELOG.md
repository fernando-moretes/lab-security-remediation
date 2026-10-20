# Changelog

## 0.4.0 — 2026-10-20 (GitHub release)

- Opt-in persistent SQLite ledger and synthetic target adapter.
- Separate intent, target+receipt and ledger-confirmation transactions.
- Explicit recovery with `pending`, `applied`, `reconciled` and `uncertain` states.
- CLI initialization, planning, reviewed execution, inspection, recovery and drift.
- Five real subprocess crash points and cross-process concurrency tests.
- Fourteen durability tests; 22 test groups total, plus packed-install smoke tests.
- Dedicated PT/EN runbook, state diagram, fault matrix, retention and cleanup rules.
- Minimum Node.js 22.13; built-in SQLite may emit an experimental warning on Node 22.
- No cloud deployment, authenticated approval, durable rollback or npm publication
  implied by this GitHub release.

## 0.3.0 — 2026-10-20

- Offline synthetic ASFF S3.8 review through CLI and JavaScript API.
- Preserve all four bucket public-access flags and expose the exact proposed diff.
- Reject missing/string-valued flags, unsupported scope, malformed timestamps,
  unknown fields and inconsistent fixture states.
- Free-text descriptions never select actions or appear in the review output.
- Authored synthetic fixture, PT/EN exercises and official AWS references.
- No live AWS collection or cloud execution added.

## 0.2.0 — 2026-10-20

- Installable npm package with allowlisted files and executable CLI.
- Seven narrated scenarios, PT/EN terminal output and JSON reports.
- Local interactive browser demonstration, language switch and step-by-step view.
- Read-only loopback server with fixed assets and restrictive response headers.
- Package installation smoke test, CLI validation and HTTP boundary tests.
- API documentation and maintainer release procedure.
- Original seven core security behavior tests retained.
- AWS integration remains unimplemented; this is a local simulation.

## 0.1.0 — 2026-10-20

- Initial public MIT release, standalone local exercise and seven core tests.
- Bilingual guide, contribution policy, issue/PR templates and cross-platform CI.
