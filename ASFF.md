# Offline ASFF review / Revisão ASFF offline

Version 0.3.0 adds a narrow teaching adapter for the **S3.8 bucket-level control**.
It accepts only the fictional identifiers in `fixtures/asff-s3-8.json`, which was
authored for this repository, not exported from AWS.

```sh
npx security-remediation-review-lab@0.3.0 asff
# From a source checkout:
node bin/cli.mjs asff fixtures/asff-s3-8.json
```

The CLI prints JSON with four explicit `before` and `proposedAfter` flags,
`changedFields`, `requiresHumanReview: true` and `executable: false`.
There is no AWS SDK, credential lookup, network call or resource mutation.

## PT: o que observar

O formato ASFF organiza os findings do Security Hub. Neste exercício, o controle
S3.8 é do bucket; S3.1 é de conta e fica fora do escopo. O adaptador usa o caminho
`Resources[0].Details.AwsS3Bucket.PublicAccessBlockConfiguration`.

| Campo | Valor inicial no exemplo | Valor proposto para revisão |
| --- | --- | --- |
| `BlockPublicAcls` | false | true |
| `IgnorePublicAcls` | true | true |
| `BlockPublicPolicy` | false | true |
| `RestrictPublicBuckets` | true | true |

Somente dois campos mudariam. A diferença explícita ajuda a revisar escopo.
Os quatro valores são preservados, sem reduzir a configuração ao booleano usado
pelo exercício inicial. Esse resultado não é aceito pelo `apply()` do núcleo.

Antes de planejar uma remediação real, seria necessário confirmar se o acesso
público é intencional, consultar o estado atual, avaliar impacto e obter aprovação
autenticada. Um snapshot de finding não comprova o estado atual nem autoriza
uma mudança.

## EN: contract and intentional limitations

- Exactly one synthetic `AwsS3Bucket` resource, an active failed S3.8 finding,
  the fixed fictional account `000000000000` and bundled resource identifier.
- All four fields must exist and be booleans. Missing fields are **unknown**,
  not silently converted to false.
- Unsupported fields and shapes are rejected. Many valid real ASFF findings
  are therefore outside this deliberately narrow fixture contract.
- Title and description are type-checked but never copied into the review
  candidate or interpreted as action instructions.
- No account-level/access-point evaluation or effective-public-access verdict.
- Timestamps are structurally validated, but freshness is not established.
- The synthetic account sentinel is not proof that arbitrary data is sanitized.
  Do not pass real findings, customer data or credentials.
- This is not a complete ASFF schema validator, redaction tool, AWS collector,
  authenticated approval mechanism or executable cloud remediation plan.

## Exercises / Exercícios

Make a local copy of the fixture and change one item at a time:

1. Remove `IgnorePublicAcls`: expect rejection for incomplete configuration.
2. Replace `false` with the string `"false"`: expect rejection, not coercion.
3. Change the control to S3.1: expect rejection for unsupported scope.
4. Add action instructions to `Description`: the review result stays identical.
5. Make all flags true while keeping `FAILED`: expect an inconsistency error.

Do not replace synthetic identifiers with real ones. `npm test` runs these
failure cases and verifies that the adapter does not modify its input.

## Primary sources checked 2026-10-20

- [ASFF overview](https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-findings-format.html)
- [S3 control definitions](https://docs.aws.amazon.com/securityhub/latest/userguide/s3-controls.html)
- [AwsS3BucketDetails field structure](https://docs.aws.amazon.com/securityhub/1.0/APIReference/API_AwsS3BucketDetails.html)

Next: design authenticated approval and durable execution as separate components.
Do not connect this review object directly to production write permissions.
