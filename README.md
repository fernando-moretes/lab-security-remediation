# Security remediation review lab — v0.3.0

Fernando Azevedo · 20 October 2026 · MIT

[![Lab tests](https://github.com/fernando-moretes/lab-security-remediation/actions/workflows/test.yml/badge.svg)](https://github.com/fernando-moretes/lab-security-remediation/actions/workflows/test.yml)

**[Contribute / Contribuir](CONTRIBUTING.md) · [Roadmap](ROADMAP.md) ·
[Report a result / Relatar teste](https://github.com/fernando-moretes/lab-security-remediation/issues/new/choose) ·
[Security](SECURITY.md)**

Running a group session? Use the [40-minute facilitator guide](WORKSHOP.md).
Para uma sessão em grupo, use o [roteiro de 40 minutos](WORKSHOP.md).

## CLI e demonstração visual / CLI and visual demonstration

**New in 0.3.0:** [offline ASFF review](ASFF.md) with a synthetic S3.8 finding,
four explicit S3 flags and negative-input tests.
**Novo:** revisão offline de finding ASFF sintético, com quatro campos S3
preservados e proposta não executável.

```sh
npx security-remediation-review-lab@0.3.0 asff
```

Use the npm quick start below, or clone the repository to inspect and modify
the source before running it.

Use o início rápido via npm abaixo ou faça um clone para inspecionar e modificar
o código antes de executá-lo.

![Local demonstration in Portuguese](https://raw.githubusercontent.com/fernando-moretes/lab-security-remediation/main/docs/demo-preview.png)

```sh
# From a repository clone / A partir do clone
node bin/cli.mjs --help
node bin/cli.mjs test
node bin/cli.mjs scenarios all --lang pt
node bin/cli.mjs scenarios drift --lang en --json
node bin/cli.mjs web
```

`web` prints a local URL at `127.0.0.1` with an automatically chosen port.
Open it in your browser. Switch PT/EN, choose a scenario and reveal each step.
The presentation shows actual results from the simulation code. It does not
modify infrastructure. Ctrl+C stops the server; no files or telemetry are saved.

`web` mostra um endereço local em `127.0.0.1` com porta escolhida automaticamente.
Abra no navegador, alterne PT/EN, escolha um cenário e avance pelos passos.
Os resultados vêm do código da simulação. Ctrl+C encerra o servidor.
O servidor aceita apenas leitura dos arquivos fixos da demonstração.

Via npm:

```sh
npx security-remediation-review-lab@0.3.0 test
npx security-remediation-review-lab@0.3.0 scenarios all --lang pt
npx security-remediation-review-lab@0.3.0 web
```

The npm client may use the network to download the package. Once installed,
CLI scenarios work offline; the visual demonstration uses only a loopback HTTP
server. No runtime dependencies, AWS calls or model calls.

O npm pode usar rede para baixar o pacote. Depois da instalação, os cenários
funcionam offline; a interface usa apenas um servidor HTTP local.

### Scenario map / Mapa de cenários

| Command | Outcome | Lesson |
| --- | --- | --- |
| `scenarios approved` | simulated-change | Review binds to a bounded proposal |
| `scenarios unapproved` | rejected | A proposal is not authorization |
| `scenarios tampering` | rejected | Earlier approval cannot cover modified content |
| `scenarios drift` | rejected | Changed resource state requires fresh review |
| `scenarios duplicate` | duplicate | Same process-local ledger prevents repeat application |
| `scenarios rollback` | reviewed-rollback | Unsafe restoration needs explicit review too |
| `scenarios conflict` | rejected | Same finding cannot authorize a different operation |

### JavaScript API

After installation, import the deterministic core or scenario runner:

```js
import { initialState, finding, propose } from "security-remediation-review-lab";
import { runScenario } from "security-remediation-review-lab/scenarios";

console.log(propose(finding, initialState())); // proposal only
console.log(runScenario("drift")); // synthetic state, expected rejection and steps
```

See [API.md](API.md) for contracts and limitations,
[CHANGELOG.md](CHANGELOG.md) for version history and [RELEASING.md](RELEASING.md)
for the maintainer's publication checklist.

```sh
git clone https://github.com/fernando-moretes/lab-security-remediation.git
cd lab-security-remediation
npm test
```

No dependency installation required / Não precisa instalar dependências.
Forks, issues and pull requests are welcome in Portuguese or English.

```mermaid
flowchart LR
  F[Synthetic finding] --> P[Bounded proposal]
  P --> R[Explicit simulated review]
  R --> V[Validate digest and state]
  V --> C[In-memory change]
  C --> L[Process-local ledger]
```

## Português

Exercício local de revisão de remediações inspirado em findings de segurança
na AWS. Objetivo: distinguir uma proposta de mudança de uma mudança autorizada.
Esta versão não usa AWS, não chama modelos e não cria recursos. O finding e o
bucket são sintéticos; não é uma integração com o AWS Security Hub nem um
controle completo de S3.

### Execute em aproximadamente 15 minutos

Requisito: Node.js 22 ou superior, disponível em https://nodejs.org/.
Baixe `lab.mjs` e leia o código antes de executar. Nenhum pacote precisa ser
instalado, nenhuma credencial é solicitada.

```sh
node lab.mjs --self-test
node lab.mjs
# Leia before, after, resource e digest antes de aprovar:
node lab.mjs --approve
```

Resultado esperado: sete testes aprovados; a execução sem flag apenas propõe;
com `--approve`, `status` é `simulated-change` e `blockPublicAccess` passa a true.
O digest vincula a revisão ao conteúdo exato da proposta. Ele não autentica o
revisor: a aprovação é simulada pelo argumento explícito do CLI.

Fluxo: finding sintético → proposta limitada → revisão → verificação de versão
e digest → alteração em memória → registro de idempotência.

### Experimente as falhas

Leia `selfTest()`: ausência de aprovação, entrega duplicada, alteração depois da
aprovação, drift, campo extra pedindo administração, rollback sem revisão e
replay conflitante. Cada teste verifica um comportamento observável; não são
apenas instruções textuais para um agente.

Perguntas para discutir:
1. Por que um HTTP 200 de um modelo não autoriza uma mudança?
2. O que ocorre se um worker cair entre a mudança e a gravação do ledger?
3. Como revogar uma aprovação? Como autenticar quem aprovou?
4. Por que o rollback para um estado inseguro também exige revisão?

### Limitações

O ledger e o estado vivem no mesmo processo e desaparecem ao terminar.
Não há concorrência distribuída, persistência, autorização IAM, aprovação
assinada, TTL ou coleta ASFF na AWS. O adaptador offline é um exercício separado.
O teste de campo extra não comprova resistência
geral a prompt injection. A representação booleana não cobre os quatro campos
reais de S3 Block Public Access. O custo de AWS é zero nesta versão porque não
há chamadas de rede; isso não estima o custo de uma implementação real.

Próxima fase: coleta somente leitura, aprovação
autenticada, ledger durável com conditional writes, recuperação após falha,
medição de custo e limpeza verificável, em ambiente isolado.

### Compartilhe o resultado

Envie feedback pelo contato público no site https://fernando.moretes.com:
versão do Node, sistema operacional, testes aprovados/falhos, etapa onde
travou, tempo aproximado e uma melhoria sugerida. Não envie credenciais,
IDs de conta, findings reais ou dados de clientes. Nome/citação só serão
publicados com autorização separada. Executar o lab não envia telemetria.

Limpeza: o exercício não grava arquivos e não cria recursos. Exclua somente
os arquivos que você baixou ou os relatórios que você mesmo salvou.

## English

A local security-remediation review exercise inspired by AWS findings.
Learning goal: distinguish a proposed change from an authorized change.
This release uses a synthetic finding and an in-memory bucket; it makes no
AWS or model calls and creates no cloud resources.

Requires Node.js 22+. Download and inspect `lab.mjs`, then run:

```sh
node lab.mjs --self-test
node lab.mjs
# Review before, after, resource and digest:
node lab.mjs --approve
```

Expect seven passing tests. Without a flag, the CLI only proposes. With
`--approve`, the result is `simulated-change`, setting the in-memory
`blockPublicAccess` flag to true. The digest binds approval to proposal
contents; it does not authenticate the reviewer.

Tests cover missing approval, duplicate delivery, proposal tampering, state
drift, unsupported fields/resource scope, reviewed rollback and conflicting
replays. Read `selfTest()` and explain why each failure must stop the workflow.

This is not a Security Hub integration or production authorization system.
The ledger is process-local and ephemeral. There is no distributed atomicity,
IAM authorization, signed approval, expiry, live ASFF collection or crash recovery.
The offline ASFF adapter is a separate teaching exercise.
The boolean is not a complete S3 Block Public Access configuration. The
unknown-field test does not prove general prompt-injection resistance.

Discuss: what if a worker crashes after a side effect but before recording it?
How would an authenticated reviewer revoke approval? Why must rollback also
be reviewed? These are requirements for the future cloud implementation.

Feedback: Node version, OS, passing/failing tests, blocking step, approximate
time and one suggestion, through https://fernando.moretes.com. Do not share
credentials, customer data or real findings. Attribution requires separate
consent. No telemetry is sent. Cleanup only involves files you downloaded or
reports you explicitly saved; the lab itself writes no files.

## Sources / Fontes

- https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-findings-format.html
- https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues-at-least-once-delivery.html
- https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html
- https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ConditionExpressions.html
