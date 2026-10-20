# Facilitator guide / Guia do facilitador

Audience: builders and architects familiar with basic JavaScript.
Duration: 40 minutes. All activities are offline and use synthetic data.
No AWS account, payment method, CLI configuration or package installation.

## Before the session / Antes da sessão

- Confirm Node.js 22+ with `node --version`.
- Clone this repository or download the release assets.
- Run `node lab.mjs --self-test`: expect seven passing tests.
- For the visual session in v0.2.0, run `node bin/cli.mjs web` and open the
  printed loopback URL. Choose PT/EN and reveal each scenario one step at a time.
- For a terminal session, run `node bin/cli.mjs scenarios all --lang en`
  (or `--lang pt`). Use `--json` to inspect machine-readable evidence.
- Keep an unchanged copy of `lab.mjs` for comparison and recovery.
- Explain that `--approve` simulates review; it is not identity authentication.
- Do not ask participants to share their screen with credentials or customer data.

## Agenda

| Minutes | Activity | Check for understanding |
| --- | --- | --- |
| 0–5 | Explain finding → proposal → review → change | Is a model's suggested action authorization? |
| 5–10 | Run `node lab.mjs` and inspect the JSON | Identify resource, before/after, version and digest |
| 10–15 | Run `node lab.mjs --approve` | Explain which state changes and where it lives |
| 15–25 | Read three failure tests: tampering, drift, duplicate | Explain why each result is accepted or rejected |
| 25–35 | Pair exercise: choose one failure below | Produce a prediction, observation and explanation |
| 35–40 | Discuss production gaps and collect optional feedback | Distinguish tested behavior from unimplemented controls |

## Pair exercises / Exercícios em dupla

Choose one. Use a separate scratch file next to `lab.mjs`, or edit only your
local copy. No change to the source repository is required.

1. **Drift:** propose a change, then change the resource version before applying.
   Prediction: the proposal becomes stale and must be reviewed again.
2. **Tampering:** change the finding ID after approval and recompute the digest.
   Prediction: the earlier approval cannot authorize the changed digest.
3. **Replay:** deliver the same approved proposal twice with the same ledger.
   Prediction: the second result is `duplicate` and does not advance the version.
4. **Rollback:** attempt rollback without explicit review.
   Prediction: it is rejected. A restoration to an insecure state needs review too.

The existing `selfTest()` contains executable examples of all four.
Ask participants to explain the result before revealing the relevant test.

Exemplo para testar drift / Drift example:

```js
// Save as exercise.mjs next to lab.mjs, then run: node exercise.mjs
import { initialState, finding, propose, approve, apply } from "./lab.mjs";

const state = initialState();
const proposal = propose(finding, state);
const approval = approve(proposal, state, "workshop-reviewer");
try {
  apply(proposal, approval, { ...state, version: 2 }, new Map());
  throw new Error("Expected drift rejection");
} catch (error) {
  if (!error.message.startsWith("Stale proposal:")) throw error;
  console.log("PASS: drift requires a fresh review");
}
```

## Debrief / Discussão

- A digest detects mismatched content; it does not prove who approved it.
- A process-local ledger is not a durable, distributed idempotency guarantee.
- A crash after a side effect but before recording it creates a recovery problem.
- Expiry, revocation, authenticated reviewers and cloud permissions are not
  implemented here.
- A simulated boolean is not the full S3 configuration.
- No result in this exercise proves resistance to arbitrary prompt injection.

Em português: peça que cada dupla diferencie o comportamento demonstrado dos
controles ainda ausentes. O objetivo é aprender a revisar decisões e limites,
não declarar que o exercício está pronto para produção.

## Feedback and cleanup / Feedback e limpeza

Use the lab feedback issue template voluntarily: version, OS, test results,
blocking step and one suggestion. Do not collect names or emails for attendance
unless separately agreed. Public attribution requires separate consent.
Record actual results only; no completion or adoption numbers are assumed.

Remove only the scratch files or downloaded lab directory you created.
The lab itself creates no files or cloud resources and sends no telemetry.
