# API contracts / Contratos

ES modules, Node.js 22+. No external runtime dependencies.
All resources/findings passed to this teaching API must be synthetic.

| Export | Input | Output / behavior |
| --- | --- | --- |
| `initialState()` | none | New synthetic state, version 1, public access blocking false |
| `finding` | constant | Frozen synthetic finding for `BLOCK_PUBLIC_ACCESS` |
| `propose(finding, state)` | supported control and matching resource | `{ change, digest }`; no mutation |
| `approve(proposal, state, reviewer)` | structurally valid proposal, nonempty reviewer label | Simulated approval bound to digest; reviewer label is not authenticated |
| `apply(proposal, approval, state, ledger)` | `Map` owned by caller | New state and status; mutates ledger on first application |
| `rollback(proposal, state, ledger, explicitlyApproved)` | matching recorded post-apply state and `true` | Restored flags with incremented version; keeps ledger record |
| `selfTest()` | none | Seven test results; throws on failed assertion |
| `scenarios` from `/scenarios` | array | Available IDs with PT/EN title and lesson |
| `runScenario(id)` from `/scenarios` | known ID | Independent synthetic before/after, steps, expected outcome, optional rejection |

`apply` throws on absent or mismatched approval, proposal schema/digest/scope
errors, conflicting replay or stale resource version/state.
The returned new state must be retained by the caller. Duplicate delivery
returns the caller's current state; the ledger is not a source of live truth.

`rollback` returns state; it does not mutate a cloud resource. The caller must
retain the returned state. Rollback preserves the ledger so the original finding
cannot silently be applied again within that ledger.

These functions are instructional, not a hardened API boundary for arbitrary
untrusted JSON. No distributed atomicity, cryptographic reviewer identity,
durable state, expiry, revocation, crash recovery or complete ASFF validation.
Errors are descriptive strings, not stable machine error codes.

Em português: as funções demonstram contratos limitados de revisão. A aprovação
é simulada e o ledger é um `Map` do processo; não use como autorização de produção.
O chamador deve guardar o estado retornado. Cada cenário começa do zero.
