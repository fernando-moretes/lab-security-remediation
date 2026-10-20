# Contributing / Como contribuir

Contributions in English or Portuguese are welcome. Maintainer: Fernando Azevedo.
Start by reading the [guide](README.md) and [roadmap](ROADMAP.md).

## First contribution

1. Fork the repository and clone your fork.
2. Create a focused branch: `git switch -c fix/describe-your-change`.
3. Run `npm test` with Node.js 22+. There are no dependencies to install.
4. Reproduce the issue, then make the smallest useful change. For a behavior
   change, add a test that fails before your fix and passes afterward.
5. Update both language sections when changing user instructions.
6. Run `npm test`, `npm start` and `npm run demo`.
7. Open a pull request explaining the problem, change and test evidence.

Em português: faça um fork, crie uma branch, execute os testes, implemente uma
mudança focada e abra um PR com o problema, a solução e a evidência de validação.
Melhorias de texto, acessibilidade das instruções e exemplos também são bem-vindas.

## Scope and review

Keep the default exercise offline, deterministic and free of credentials.
Cloud experiments must be separately opt-in and document permissions, costs,
failure recovery and cleanup. Discuss architectural changes in an issue first.
Do not include real findings, customer data, account identifiers or secrets.
Do not represent simulation tests as proof of production security.

Use descriptive conventional commit titles (`fix:`, `docs:`, `feat:`, `test:`).
Maintainers review behavior, clarity, scope and passing CI before merging.
No response-time guarantee: please avoid repeated pings.
Your contribution is provided under this repository's MIT license.

## Community

Be respectful, critique ideas rather than people, and disclose uncertainty.
Harassment, discrimination, spam and requests to trade votes are not welcome.
For a private concern, contact fernando@moretes.com. The maintainer may remove
abusive material and restrict participation to keep discussions constructive.
