# CBC — Coffee Bunn Café
### Canonical Description
> This document is the source of truth for what CBC is, what it does, and where it's going.
> When in doubt about a decision — product, tech, marketing, design — check it against this.

---

## What CBC Is

Coffee Bunn Café is a **specialty coffee gift box brand** for the Mexican corporate market.

It is not a café. It is not a course platform. It is not a generic coffee shop.

It is a curated gifting experience — built around the expertise of one person, powered by a platform that runs itself.

---

## The Person Behind It

**Lorena Luna** leads CBC.

She is a barista, professional coffee taster, and expert across the entire coffee production chain — from farm to cup. Her job within CBC is threefold:

1. **Select the coffee** — she sources the best specialty micro-lot available at any given moment and chooses what goes in the boxes
2. **Deliver the experience** — she hosts live classes for corporate teams on orders of 15+ boxes
3. **Handle executive sales** — she personally sells the high-ticket, consultative gift boxes (Kyoto brew and above) for C-suite gifting

Everything else — marketing, content, order management, customer tracking, invoicing — is handled by the platform.

---

## The Product

### Standard Gift Boxes (click and buy / WhatsApp close)

Every box contains:
- **Specialty coffee micro-lot (250g)** — Lorena's current selection. Not a fixed SKU. The best available at the time of the order. Changes by season, farm, and supplier. This is a feature.
- **Curation Card** — written by Lorena. Describes this specific coffee: origin, finca, variety, process, tasting notes, and how to brew it with the accessory in the box.
- **Company branding** — the client's logo on the box, always included, no extra cost.

**Two variants, same price ($799 MXN):**
- **Box Prensa Francesa** — French press 350cc
- **Box Moka** — Mini moka italiana

**Volume incentive:** Orders of 15+ boxes include a QR card in every box. Lorena hosts one live session for the company's team — teaching them about the coffee they received and how to prepare it. One session per order.

**Minimum order:** 10 boxes.

### Executive Gift Boxes (consultative, Lorena sells directly)
Bespoke boxes for C-suite gifting. Premium brewing equipment (e.g., Kyoto cold drip). No fixed price. No catalog. Lorena sells these through direct conversation.

---

## The Customer

**Primary:** HR managers, marketing coordinators, and office managers at Mexican companies (20–500 employees) in CDMX.

**Industries with the most budget:** Tech, Finance, Legal, Real Estate, Consulting, Pharma.

**Occasions they buy for:** Fin de año (December), Día del Amor (February), Día del Trabajo (May), client appreciation, onboarding kits, project closings, team recognition.

**How they buy:** They see CBC on LinkedIn or Instagram, someone refers them, or they find the landing page. They request a quote via WhatsApp or the website form. The sale closes on WhatsApp. Average cycle: 1–5 days.

---

## The Platform

CBC runs on a web platform deployed on Railway. Two faces:

### Public Site — `coffeebunncafe.com`
What corporate buyers see. Landing page for gift boxes. Quote request form. Order tracking (no login — just an order code).

### Admin Platform — `admin.coffeebunncafe.com`
What Lorena and the team use to run the business. Four modules:

**Marketing Engine**
Autonomous. Posts to Instagram, Facebook, and LinkedIn on a fixed schedule — product posts, coffee story posts, LinkedIn thought leadership, seasonal campaigns. Lorena updates the current coffee details (via WhatsApp message or the app) and the engine handles all content generation and publishing. Claude writes the copy. DALL-E generates the images. No daily involvement from Lorena.

**Sales Engine**
Incoming leads from the quote form land here. Lorena builds a quote, converts it to an order, updates the status as production moves. The pipeline goes: Lead → Quoted → Confirmed → In Production → Shipped → Delivered. Customers get WhatsApp notifications at each stage.

**Customer Service**
Incoming WhatsApp messages land in an inbox. Claude drafts replies in Lorena's voice. Response templates handle the most common questions. The goal is fast, personal response with minimal manual effort.

**Order Tracking (public)**
Customers visit `/tracking/[orderCode]` and see their order status in real time. No login. Just the order code they received after purchase.

---

## What Success Looks Like

**In 90 days:**
- Platform live and fully operational
- Landing page generating quote requests
- Marketing engine posting autonomously — 3x/week IG/FB, 2x/month LinkedIn
- First 10 orders delivered
- First returning customer

**In 12 months:**
- 50+ corporate clients in CRM
- Consistent monthly revenue from recurring orders (same companies, different seasons)
- Marketing engine running without intervention
- Lorena's time 100% on coffee selection, production, and executive sales
- At least one referral program generating new leads passively

---

## What CBC Is Not

- Not a café or physical location (physical space is on indefinite pause)
- Not a coffee subscription or DTC e-commerce brand
- Not a general coffee education platform (courses are paused)
- Not a Colombian brand (Lorena is Colombian, CBC is Mexican)
- Not a generic gift company that happens to sell coffee

---

## North Star Sentence

> **CBC is the specialty coffee gift box that corporate Mexico sends when they want the gift to mean something — curated by an expert, powered by a platform that runs itself.**

---

## Key Links & References

| Item | Location |
|------|----------|
| Brand manual | https://brand.coffeebunncafe.com / `docs/specs/brand.md` |
| Product spec | `docs/specs/product-gift-boxes.md` |
| GTM strategy | `docs/strategy/gift-boxes-gtm.md` |
| Platform plan | `docs/strategy/platform-plan.md` |
| Landing page copy | `docs/sales/landing-page-copy.md` |
| Sales pitch templates | `docs/sales/pitch-corporativo.md` |
| Content engine | `content-engine/` |
| GitHub | https://github.com/tuyoisaza/CBC |
| Railway project | ID: 3f019384-571b-4603-a0ab-2a8169c712dc |
| Public site | https://www.coffeebunncafe.com |
| Admin platform | https://admin.coffeebunncafe.com (coming) |
| Contact | contact@coffeebunncafe.com · +52 55 72293512 |
