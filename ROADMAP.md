# Roadmap / Plano de evolução

Status: 20 October 2026. Items below are proposals, not delivery promises.

| Stage | Deliverable | Acceptance evidence | Status |
| --- | --- | --- | --- |
| 0.1 | Offline proposal, review, drift, replay and rollback exercise | Seven self-tests; runnable without credentials | Available |
| 0.2 | Installable CLI, narrated scenarios and local PT/EN visual demo | Packed installation smoke test, CLI and HTTP boundary tests | Implemented; release checks required |
| Community review | PT/EN clarity and reproducibility | Voluntary participant reports with version/OS and concrete feedback | Open |
| Read-only adapter | Sanitized ASFF fixture and explicit field validation | Synthetic fixtures; unsupported resources rejected; no write calls | Planned |
| Durable execution | Conditional ledger and interrupted-operation recovery | Duplicate, concurrent delivery and crash-window tests | Planned |
| Authenticated review | Reviewer identity, expiry and revocation | Negative authorization tests; no bypass through model output | Planned |
| Isolated AWS demo | Explicit opt-in deployment with bounded permissions | Observed cost, teardown evidence and no production targets | Planned |

Good first contributions: improve a confusing PT/EN instruction, add a minimal
reproduction for an edge case, or explain one failure scenario with an example.
Use the issue templates. A completed test is useful feedback; it is not a claim
that the contributor adopted the system in production.

Contribuições iniciais: clareza do guia, reprodução de falhas e exemplos didáticos.
Integração AWS continua planejada; esta versão não cria infraestrutura.
