# Stack Security Review — CBC — 2026-10-23

Trigger: explicit PHDK upgrade/vendorization. Reviewed source: [`50a034f366d22ccb05783600bca8d8e0a3c01896`](https://github.com/tuyoisaza/CBC/tree/50a034f366d22ccb05783600bca8d8e0a3c01896). Canonical PHDK 2.65.0 source: `9fc6605c75b42e678bab41feb741dca71fcbabcc`.

| Outcome | Result |
|---|---|
| STANDARDS_SYNC | VERIFIED for the exact 78-file candidate verified against the published canonical source; remote publication is recorded separately. |
| STACK_REVIEW_COVERAGE | PARTIAL — source selectors and selected resolved Next/React/sharp packages; dated prior build evidence below. Full transitive, native, OS/image and infrastructure advisory coverage remains unverified. |
| STACK_SECURITY_STATUS | GAPS_FOUND — affected package versions and/or incomplete deployed-runtime evidence; no application security clearance. |

## Dated security baseline

Node's [21 October 2026 security release](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases) fixes the reviewed issues in 22.23.4, 24.22.1 and 26.12.1. Use the newest compatible patch in the project's supported major at remediation time and recheck official releases then. Node22/24 are Maintenance LTS on this review date; Node20 is EOL, and Node26's planned LTS transition is 28 October. [Official lifecycle schedule](https://github.com/nodejs/Release/blob/main/schedule.json).

The reviewed [Next.js Server Action DoS advisory](https://github.com/vercel/next.js/security/advisories/GHSA-p3m5-59mp-jv5r) fixes relevant ranges in 15.5.28 and 16.4.1. Applicability needs App Router plus a reachable Server Action. The separate [SVG optimization advisory](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw) has platform/feature prerequisites; its sharp>=0.35.5 workaround does not address the other Next advisories. Affected resolved version is evidence of a finding, not proof of exploitation.

## Source findings and bounded next work

- `.node-version` selects `22`; Nixpacks selects `nodejs_22`. The inspected build used **22.14.0**, below the reviewed **22.23.4** security floor. Plan a compatible Node22 patch with a rebuilt artifact and exact runtime/deployment evidence.
- Root `package.json` selects **pnpm11.0.9**, while `nixpacks.toml` selects **pnpm9**. Resolve the builder/package-manager mismatch with compatibility verification.
- `pnpm-lock.yaml` resolves **Next14.2.35**, React18.3.1. The Next release is in the reviewed affected range. No fixed14.x version is listed in those advisories; assess migration to a supported fixed major with application compatibility work before editing dependencies. Selected importer evidence does not constitute a full dependency audit.
- Database client declarations include Prisma5; server patch level, complete dependency advisory coverage and base-OS package inventory are unverified here.

Evidence paths: [`package.json`](https://github.com/tuyoisaza/CBC/blob/50a034f366d22ccb05783600bca8d8e0a3c01896/package.json), [`pnpm-lock.yaml`](https://github.com/tuyoisaza/CBC/blob/50a034f366d22ccb05783600bca8d8e0a3c01896/pnpm-lock.yaml).

## Prior build/deployment snapshot

Captured **2026-10-23T15:12:15Z** during the initial review. No direct `process.version` evidence was collected. Deployment status and build logs are dated observations, not fresh production verification after this standards change.

| Service | Deployment SHA | Build Node | Evidence |
|---|---|---|---|
| CBC | `50a034f366d22ccb05783600bca8d8e0a3c01896` | 22.14.0 | [Prior deployment](https://railway.com/project/6111b3fd-55ed-4541-bfcd-95f8625b6b0b/service/a0f45d59-9da8-497a-980c-a8fb0babbb38?environmentId=728943c2-92df-422d-9efc-968ee8c98e0b); 2026-10-16T17:24:21.554Z |

## Remaining verification

Reconcile source, lock resolution, rebuilt image and deployed SHA; check current advisories for direct/transitive/native packages, base image/OS and each database/cache/search service; verify relevant feature/platform exposure and compatibility. Runtime versions, rebuild success and live behavior stay UNVERIFIED. This standards change installs no application dependencies, updates no runtime or framework, runs no application tests/UAT and changes no provider settings. Findings remain open for separately scoped application remediation.
