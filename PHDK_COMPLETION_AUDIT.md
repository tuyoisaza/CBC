Orders follow-up: remove redundant Ver leads link; horizontally scrollable, keyboard-focusable table retains access to Classification without changing query filters or records.

Validación v1.6.81: typecheck, ESLint de los archivos de código cambiados y git diff --check pasaron. Revisión de fuente: eliminación de campos de alta/extracción, selección inicial y scroll/enlace de Pedidos; sin cambios de dependencias, esquema o cotizador. No se ejecutó build completo ni UAT para este ajuste acotado.

# Contact-only leads — v1.6.81

Current request removes box type, quantity and occasion from lead creation. Shared NewLeadForm, admin POST validation and message-lead-draft extraction implement this for manual/message conversion paths. Notes, original message linking, admin authorization and duplicate protection remain. Quote rules/minimums and historical records are unchanged. Quoting is an unchecked optional next step. Source/diff review and static checks cover the change; no runtime UAT. Final main/PR proof is recorded locally after merge.

---

# Completion audit — v1.6.80

Source review covers all three requested explanations for all 12 options, preserved secret handling and configuration authorization, text status independent of icons/color, wrapping variable names and safe external links. Mercado Pago account lookup/card removed only from Sistema; Pagos unchanged. No added Stripe account section.

TypeScript, scoped ESLint (next/core-web-vitals), production build from apps/web without DATABASE_URL, and diff checks passed. Remote-main readback is recorded after merge in PHDK_DELIVERY_EVIDENCE.json. No browser/runtime acceptance or live credential checks performed; UAT NOT RUN.

---

Verificación v1.6.79: typecheck, ESLint de archivos modificados (sin errores ni advertencias), build de producción sin DATABASE_URL y git diff --check pasaron. No se ejecutó UAT ni se convirtieron mensajes reales.

# Navigation follow-up — v1.6.79

Current scope: visible Mensajes sidebar entry after Pedidos, using the existing /admin/service route, icon, title and accessible label. Source review confirms one inbox entry, available to both existing admin navigation variants; no authorization policy changes. Message conversion adds a protected prefilled review form, conservative deterministic extraction and an atomic lead/message link. Already linked messages return the existing lead; conditional linking rolls back concurrent duplicate creation. Original message text remains intact, no provider call or automatic message send is added. TypeScript, scoped ESLint and diff validation are the applicable static checks. Runtime UAT not run. Final remote proof is recorded after merge in PHDK_DELIVERY_EVIDENCE.json.

---

# Completion audit — v1.6.78

Reviewed the complete scoped source diff and newly added routes/components against PHDK_COMMITMENT_COVERAGE.md. The public quote path remains the default; only authenticated admin mode uses the existing-lead endpoint. All new writes check fresh admin access. Customer identity is server-derived for quotes, totals are recalculated using existing rules, HTML values are escaped, and email failure does not mark a quote as sent. Existing commercial states and historical prices are preserved.

Prisma generation, web typecheck, changed-file ESLint (zero errors, three existing wizard warnings), production build with DATABASE_URL removed, and whitespace diff validation passed. Initial font-download and intentionally empty-env build attempts failed; the final ordinary build passed without changing dependencies or weakening validation. No runtime tests, browser, live database, real email or provider settings were exercised.

At this pre-publication checkpoint, source is ready for the authorized branch/PR delivery. The post-merge PHDK_DELIVERY_EVIDENCE.json records the independently verified remote SHA/PR and the deterministic gate result; this checkpoint does not claim production deployment or UAT acceptance. No unrelated task was resumed.
