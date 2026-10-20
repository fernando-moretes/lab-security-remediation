# Roadmap / Plano de evolução

Status: 20 October 2026. Items below are proposals, not delivery promises.

| Stage | Deliverable | Acceptance evidence | Status |
| --- | --- | --- | --- |
| 0.1 | Offline proposal, review, drift, replay and rollback exercise | Seven self-tests; runnable without credentials | Available |
| 0.2 | Installable CLI, narrated scenarios and local PT/EN visual demo | Packed and public npm installation tested; six CI combinations passed | Published on npm and GitHub |
| Community review | PT/EN clarity and reproducibility | Voluntary participant reports with version/OS and concrete feedback | Open |
| 0.3 offline adapter | Authored synthetic ASFF fixture and explicit field validation | Four flags preserved; malformed inputs rejected; public npm install verified | Published on npm and GitHub |
| Live collector | Read-only AWS collection with explicit scope and sanitized output | Least-privilege review, no write calls, redaction tests | Planned |
| 0.4 local persistence | SQLite intent ledger, atomic synthetic target receipts and recovery | Five subprocess crash points, duplicates, concurrent conflicts, uncertain outcomes | Implemented; see DURABILITY.md |
| Remote durable execution | Service-specific idempotency and recovery | Document target receipt guarantees before cloud writes | Planned |
| Authenticated review | Reviewer identity, expiry and revocation | Negative authorization tests; no bypass through model output | Planned |
| Isolated AWS demo | Explicit opt-in deployment with bounded permissions | Observed cost, teardown evidence and no production targets | Planned |

Good first contributions: improve a confusing PT/EN instruction, add a minimal
reproduction for an edge case, or explain one failure scenario with an example.
Use the issue templates. A completed test is useful feedback; it is not a claim
that the contributor adopted the system in production.

Contribuições iniciais: clareza do guia, reprodução de falhas e exemplos didáticos.
Integração AWS continua planejada; esta versão não cria infraestrutura.
