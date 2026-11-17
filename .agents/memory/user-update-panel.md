---
name: User Update Panel Convention
description: Business rule — produce a What's New panel after any session that impacts the user experience
---

## Rule
At the end of any session where changes affect the user experience, produce or update `client/public/hotlist-updates.html` with a compact Apple-style "What's New" panel.

## Template
Stored at `client/public/whats-new-template.html`. Key design tokens:
- Page background: `#1c1c1e`
- Card background: `#2c2c2e`
- Accent / button colour: `#ff6a00` (orange)
- Font: Inter (Google Fonts)
- Card max-width: 360px, border-radius: 26px
- Header: app icon (64px, black bg, 15px radius) → "WHAT'S NEW" eyebrow (11px, uppercase, orange) → title (22px bold) → subtitle (13px, muted)
- Feature rows: 38px emoji icon badge + name (14px semibold white) + desc (12px muted), separated by 0.5px hairlines
- Footer: full-width orange button ("Continue"), border-radius 12px
- Must fit entirely in one phone screenshot — no scrolling

## What qualifies for inclusion
New features, changed gestures/interactions, filter or navigation changes, login/session behaviour changes, performance improvements visible to the user.

## What does NOT qualify
Backend-only fixes, schema migrations, dependency bumps with no visible effect, admin/internal tooling.

## Delivery
- Update `client/public/hotlist-updates.html` (overwrite with latest session's changes)
- Tell the user the panel is ready
- Remind them the URL is `/hotlist-updates.html` on their published app (e.g. `yourapp.replit.app/hotlist-updates.html`)

**Why:** User explicitly requested this as a standing business rule on 2026-08-05.

## Preserve update content
Do not remove existing feature rows when making a separate panel change, such as removing the decorative Continue button. Keep prior updates unless the user explicitly asks to prune or replace them.

**Why:** The user objected when update rows were removed while only asking for the Continue button to be removed.

**How to apply:** Treat panel content and panel controls as separate concerns. Preserve the rows, then adjust spacing or copy if needed to fit the screenshot.
