# Navigation follow-up — v1.6.79

Current scope: visible Mensajes sidebar entry after Pedidos, using the existing /admin/service route, icon, title and accessible label. Source review confirms one inbox entry, available to both existing admin navigation variants; no authorization policy changes. Message conversion adds a protected prefilled review form, conservative deterministic extraction and an atomic lead/message link. Already linked messages return the existing lead; conditional linking rolls back concurrent duplicate creation. Original message text remains intact, no provider call or automatic message send is added. TypeScript, scoped ESLint and diff validation are the applicable static checks. Runtime UAT not run. Final remote proof is recorded after merge in PHDK_DELIVERY_EVIDENCE.json.

---

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
