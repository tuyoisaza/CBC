# Agent Instructions

## Version bump rule

After completing every requested change, increment the patch version, commit with the new version number, tag the commit, and push to `main`. This is the user's standing authorization; do not leave completed changes uncommitted unless the user asks. Continue from the latest released tag (current series: `v1.6.x`).

- If the commit is a new feature: `v1.6.x feat: ...`
- If the commit is a bug fix: `v1.6.x fix: ...`
- Update the root `package.json` version, `STATUS.md`, and `CHANGELOG.md` to match the release.
- Tag before pushing with `git tag v1.6.x` and `git push origin main --tags`.
- The website reads the root `package.json` version at build time (see `apps/web/next.config.mjs`); keep it synchronized with the release tag.

## General

- Work in the current session. Don't ask — just use subagents.
- Don't ask about subagent approach preference — always use subagents.
