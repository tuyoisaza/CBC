# Coverage — v1.6.78

| Current request | Implementation evidence | Permitted verification |
|---|---|---|
| Dashboard counts and destinations agree | admin-filters.ts shared by dashboard/leads/orders/service; archived leads and excluded orders filtered; explicit filtered links | Source review, TypeScript, ESLint, production build |
| Find leads and orders | AdminNav and dashboard quick actions; reciprocal links | Source/route review and build |
| Visible Service message vs unread count | Global totals, shared nondeleted inbound filter, unread view, pagination and per-message status; successful read/send handling | Source review and build; actual message state not inspected |
| New lead 404 | Static new/page.tsx takes precedence over [id]; validated authenticated POST, atomic customer connect/create and lead creation | Build route manifest and typecheck |
| Create a quote for the same lead | Protected [id]/quotes/new plus shared wizard; server recalculation and atomic quote/status write derive customerId from lead | Source/security review and typecheck |
| Email saved quote | Explicit recipient/button, escaped saved snapshot, provider result, sentAt/audit, missing configuration/invalid/expired quote errors | Source/security review; no real email sent |

Runtime acceptance: UAT NOT RUN. Production counts and inbox delivery are not claimed verified. No schema, credential, hosting setting, payment or background-job changes.
