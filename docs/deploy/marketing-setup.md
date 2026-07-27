# Marketing Engine — Setup Runbook

> One-stop guide to turn ON autonomous marketing (Instagram, Facebook, LinkedIn).
> The code is already built — this is pure configuration. Do the parts in order.
>
> **Everything you must create / provide is collected in the checklist at the bottom.**

---

## How it works (30-second mental model)

```
Admin (Lorena)                Web platform (@cbc/web)              Engine (@cbc/api)
─────────────                 ──────────────────────              ─────────────────
/admin/marketing/connections  OAuth flow → stores tokens in DB    cron → reads tokens
  click "Conectar"      ───▶   Setting.social.{meta,linkedin}  ◀── via /api/admin/social/credentials
                                                                     → generates copy (Claude/OpenAI)
                                                                     → generates image (DALL·E)
                                                                     → publishes to IG/FB/LinkedIn
                                                                     → writes Post row back to DB
```

Two independent things must both be true to publish:
1. **Accounts connected** — done from the admin (web only; works even if the engine is down).
2. **Engine online** — the separate `@cbc/api` service must be running and able to reach the web.

---

## Part A — LinkedIn app (start here; simplest)

1. Go to **https://www.linkedin.com/developers/apps** → **Create app**.
   - App name: `CBC Marketing` · associate with the Coffee Bunn Café LinkedIn Page.
2. **Products** tab → request/add:
   - **Sign In with LinkedIn using OpenID Connect**
   - **Share on LinkedIn**
3. **Auth** tab:
   - Copy **Client ID** and **Client Secret**.
   - Under **Authorized redirect URLs**, add exactly:
     ```
     https://coffeebunncafe.com/api/auth/social/linkedin/callback
     ```
   - Confirm the scopes available include: `openid`, `profile`, `w_member_social`.
4. Set on the **web** service in Railway:
   ```
   LINKEDIN_CLIENT_ID=...
   LINKEDIN_CLIENT_SECRET=...
   ```

Once those two vars exist, the **"Conectar LinkedIn"** button lights up in the admin.

---

## Part B — Meta app (Instagram + Facebook)

> Publishing permissions need **App Review** for public use, but Lorena can connect
> **immediately** while the app is in *Development* mode if her account has a role on it.

1. Go to **https://developers.facebook.com/apps** → **Create app** → type **Business**.
2. Add the **Facebook Login** product.
3. **App settings → Basic**: copy **App ID** and **App Secret**.
4. **Facebook Login → Settings → Valid OAuth Redirect URIs**, add exactly:
   ```
   https://coffeebunncafe.com/api/auth/social/meta/callback
   ```
5. **App Roles → Roles**: add Lorena's Facebook account as **Administrator** or **Tester**
   (this is what lets her connect NOW, before App Review).
6. Make sure the **Instagram Business account** is linked to the **Facebook Page**
   (Instagram app → Settings → linked Facebook Page). The engine posts to IG through the Page.
7. The app requests these permissions (already coded — you'll submit them for review later):
   `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`,
   `instagram_basic`, `instagram_content_publish`, `business_management`
8. Set on the **web** service in Railway:
   ```
   META_APP_ID=...
   META_APP_SECRET=...
   ```

Once those two vars exist, the **"Conectar Instagram/Facebook"** button lights up.

---

## Part C — Bring the engine ONLINE (the current blocker)

`/health` currently reports `engine: offline` — the web can't reach the engine. Fix:

1. In Railway, confirm a service exists for the engine, deployed from this repo with
   **Root Directory = `apps/api`** (it builds via its own `Dockerfile`).
2. Set these env vars on the **engine** service:
   ```
   PLATFORM_URL=https://coffeebunncafe.com          # where the engine reads/writes platform data
   ENGINE_SECRET_TOKEN=<same value as the web service>   # MUST match exactly
   ANTHROPIC_API_KEY=...
   OPENAI_API_KEY=...
   PORT=3001
   ```
3. On the **web** service, `CBC_ENGINE_URL` must point at the engine. Two options:
   - **Internal (preferred):** `https://<engine-service-name>.railway.internal`
     — the service name must match. If the engine service isn't literally named
     `cbc-engine`, update `CBC_ENGINE_URL` to the real name, and make sure both
     services are in the same Railway project with **private networking** on.
   - **Public:** give the engine a public domain and set `CBC_ENGINE_URL` to it.
4. Redeploy. Then verify: `curl https://coffeebunncafe.com/health` → `engine.status` should be `ok`.

> ⚠️ Run the engine as a **single replica**. In-process cron on N replicas fires every job N times.

---

## Part D — Connect & test end-to-end

1. Log in to `https://coffeebunncafe.com/login` (admin).
2. Go to **Marketing → Conexiones**. Both networks should now show **Conectar** buttons.
3. Click **Conectar LinkedIn** → authorize → returns "connected". Repeat for **Meta**.
4. Go to **Marketing → Generador**, create a draft post, review it.
5. Approve / publish and confirm it appears on the network, and a row lands in **Marketing → Historial**.

---

## ✅ Checklist — everything YOU must create / provide

Tick each off; once all are set, marketing runs autonomously.

### LinkedIn (developer console)
- [ ] `LINKEDIN_CLIENT_ID`
- [ ] `LINKEDIN_CLIENT_SECRET`
- [ ] Redirect URL registered: `https://coffeebunncafe.com/api/auth/social/linkedin/callback`
- [ ] Products added: *Sign In with OpenID Connect* + *Share on LinkedIn*

### Meta / Facebook (developer console)
- [ ] `META_APP_ID`
- [ ] `META_APP_SECRET`
- [ ] Redirect URI registered: `https://coffeebunncafe.com/api/auth/social/meta/callback`
- [ ] Lorena added as Admin/Tester on the app
- [ ] Instagram Business account linked to the Facebook Page

### Railway — WEB service (`@cbc/web`)
- [ ] `META_APP_ID`, `META_APP_SECRET`
- [ ] `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`
- [ ] `NEXT_PUBLIC_APP_URL=https://coffeebunncafe.com` (already set)
- [ ] `CBC_ENGINE_URL` pointing at the real engine service
- [ ] `ENGINE_SECRET_TOKEN` (already set — note the value to reuse below)

### Railway — ENGINE service (`@cbc/api`)
- [ ] Service exists, Root Directory = `apps/api`, deployed (green)
- [ ] `PLATFORM_URL=https://coffeebunncafe.com`
- [ ] `ENGINE_SECRET_TOKEN` = **same value as the web service**
- [ ] `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`
- [ ] `PORT=3001`

### Verify
- [ ] `curl https://coffeebunncafe.com/health` → `engine.status: "ok"`
- [ ] Both networks show "Conectar" in the admin, and connect successfully
- [ ] A generated post publishes and appears in Historial

---

*Env var reference: root `.env.example` (web) and `apps/api/.env.example` (engine).*
