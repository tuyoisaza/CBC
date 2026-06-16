# OpenAI API Key Purpose Selector

> **Date:** 2026-06-15
> **Status:** Draft
> **Version:** v1.3.1

## Goal

Allow a single `openai_api_key` to serve both image generation (DALL-E 3) and copy generation (GPT), via a purpose selector in the admin settings page.

## Current State

- `openai_api_key` — hint says "Para DALL-E 3 — generación de imágenes"
- `anthropic_api_key` — hint says "Para Claude — generación de copy"
- Both live under the "Inteligencia Artificial" group in SettingsForm
- The key is stored in DB via `db.setting.upsert()` and read by `apps/api/` via `process.env.OPENAI_API_KEY`

## Change

### New DB Setting

`openai_key_purpose` — stores the purpose designation for the OpenAI API key.

| Value | Meaning |
|-------|---------|
| `"image"` | DALL-E 3 only (default, backward compatible) |
| `"both"` | DALL-E 3 + GPT for copy |

### Settings Page

In `apps/web/src/app/admin/(protected)/settings/page.tsx`:

- Add `openai_key_purpose` to the fetched keys list so it loads with the page
- The existing `openai_api_key` entry hint changes from static to dynamic based on purpose

### SettingsForm Component

In `apps/web/src/components/admin/SettingsForm.tsx`:

- The OpenAI API key row gains an inline "Usar para" select dropdown below the input
- Options: "Solo imágenes" (`"image"`) | "Imágenes y Copy" (`"both"`)
- The hint text updates reactively: "Solo imágenes" → shows current hint; "Imágenes y Copy" → "Para DALL-E 3 y GPT — generación de imágenes y copy"
- The purpose is saved independently as `openai_key_purpose` via the same POST `/api/admin/settings` endpoint (already generic)
- An info badge appears when purpose is "both": "Usando también para copy"

### API

No changes needed. The generic `POST /api/admin/settings` route already handles any key-value pair via upsert.

### Consumption

This feature only covers the **settings UI**. The actual routing of requests (which service generates copy) will be handled separately — this spec just enables storing and displaying the preference.

## Files

| File | Action |
|------|--------|
| `apps/web/src/app/admin/(protected)/settings/page.tsx` | Modify — add `openai_key_purpose` to API_KEY_SETTINGS and fetch list |
| `apps/web/src/components/admin/SettingsForm.tsx` | Modify — add purpose selector in OpenAI row |

## Backward Compatibility

- Existing installs without `openai_key_purpose` default to `"image"` behavior
- The selector only shows when the key has a value (to avoid confusing empty-state UX)
- Anthropic API key remains unchanged
