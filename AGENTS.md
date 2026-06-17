# Agent Instructions

## Version bump rule

Every time you push to `main`, you MUST increment the version tag. Current pattern is `v1.3.x`.

- If the commit is a new feature: `v1.3.x feat: ...`
- If the commit is a bug fix: `v1.3.x fix: ...`
- Tag is set via `git tag v1.3.x && git push origin main --tags`
- The version on the website is auto-detected from the latest git tag at build time (see `next.config.mjs`), so tagging before push is sufficient — no manual env var updates needed.

## General

- Work in the current session. Don't ask — just use subagents.
- Don't ask about subagent approach preference — always use subagents.
