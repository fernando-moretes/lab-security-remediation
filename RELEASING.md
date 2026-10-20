# Maintainer release checklist

1. Update package/core version and CHANGELOG together. Do not overwrite tags.
2. Run `npm test` and `npm run test:package`.
3. Inspect `npm pack --dry-run --json`. Only allowlisted runtime files and public
   documentation may be included. Never publish `.npmrc`, credentials or data.
4. Review the PR and require successful Linux/macOS/Windows Node 22/24 CI.
5. Merge the reviewed change; publish from that exact clean commit.
6. Authenticate with `npm login` in the maintainer's own account. Complete
   browser/2FA prompts directly; never send codes or tokens in issues or chat.
7. Run `npm publish --access public`. Do not claim publication until
   `npm view security-remediation-review-lab@VERSION version` succeeds.
8. Install the published version in a temporary directory and exercise the CLI
   and web demo. Only then announce the published version.
9. Create a matching GitHub release with the packed `.tgz`, license and notes.
10. Update site links/version intentionally; the older site download remains
    a versioned snapshot until refreshed.

For future CI publishing, configure npm trusted publishing explicitly for this
repository/workflow. Do not add long-lived registry tokens to this repository.
Initial npm authentication and package ownership are required independently
of GitHub repository ownership.
