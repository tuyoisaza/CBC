# OpenAI API Key Purpose Selector — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Usar para" selector to the OpenAI API key row in admin settings to designate whether the key is used for images only, copy only, or both.

**Architecture:** The generic `POST /api/admin/settings` already handles any key-value pair. We add `openai_key_purpose` as a companion setting alongside `openai_api_key`. The settings page loads both keys. The SettingsForm gets a select dropdown in the OpenAI row that saves the purpose independently.

**Tech Stack:** Next.js 14 App Router, Prisma/PostgreSQL, Tailwind CSS

---

## File Map

| File | Action |
|------|--------|
| `apps/web/src/app/admin/(protected)/settings/page.tsx` | Modify — add `openai_key_purpose` to API_KEY_SETTINGS and fetch it |
| `apps/web/src/components/admin/SettingsForm.tsx` | Modify — add inline purpose selector + reactive hint in OpenAI API key row |

---

### Task 1: Settings Page — add openai_key_purpose to load list

**Files:**
- Modify: `apps/web/src/app/admin/(protected)/settings/page.tsx`

- [ ] **Add openai_key_purpose to the API_KEY_SETTINGS and fetch keys**

In `page.tsx`:
- Add to the `API_KEY_SETTINGS` array: `{ key: 'openai_key_purpose', label: '', hint: '', prefix: '' }` — it won't render as a regular key row (SettingsForm handles it specially)
- Add `'openai_key_purpose'` to the `where.key.in` array in `getSettings()`
- Pass `settings['openai_key_purpose'] || 'image'` (default) as a new prop to SettingsForm

- [ ] **Commit**

```bash
git add apps/web/src/app/admin/\(protected\)/settings/page.tsx && git commit -m "v1.3.1 feat: add openai_key_purpose to settings page fetch"
```

---

### Task 2: SettingsForm — add purpose selector in OpenAI row

**Files:**
- Modify: `apps/web/src/components/admin/SettingsForm.tsx`

- [ ] **Add purposeSelector prop and state**

Props interface: add `purpose: string` and `onPurposeChange: (val: string) => void` (or simpler: pass the current value and save it directly via fetch like other keys).

Approach: Keep it simple — `openaiKeyPurpose` prop (string), initialized from page. On change, call `POST /api/admin/settings` directly with key `openai_key_purpose`.

- [ ] **Find the openai_api_key in the group rendering and add the purpose selector**

Within the `groupKeys.map()` loop, when `setting.key === 'openai_api_key'`:
- **Conditional visibility:** Only show the purpose selector when `val.length > 0` (key has a value)
- **Hint text:** When purpose is `"image"` → keep existing hint text. When `"both"` → change to "Para DALL-E 3 y GPT — generación de imágenes y copy"
- **Info badge:** When purpose is `"both"`, show an inline badge `<span className="...">Usando también para copy</span>` next to the "Configurado" indicator
- Below the input row, add a "Usar para" select with options:
  - `"image"` → "Solo imágenes"
  - `"both"` → "Imágenes y Copy"

Auto-save on change: add `onChange` on the select that calls `fetch('/api/admin/settings', { method: 'POST', body: JSON.stringify({ key: 'openai_key_purpose', value }) })`.

- [ ] **Update settings page to pass purpose prop**

Update `page.tsx` to pass the `openai_key_purpose` value (default `'image'`) to `SettingsForm`.

- [ ] **Commit**

```bash
git add apps/web/src/components/admin/SettingsForm.tsx apps/web/src/app/admin/\(protected\)/settings/page.tsx && git commit -m "v1.3.1 feat: add purpose selector to OpenAI API key in settings"
```
