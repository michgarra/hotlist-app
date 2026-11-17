---
name: Sharing verification
description: Production-build and native-message boundaries for title sharing.
---

Verify public sharing pages against the compiled production server, not only the development preview.

**Why:** A shared page worked in development but failed after publishing because the server is bundled as CommonJS. The failure blocked both opening the title and fetching its message-preview metadata.

**How to apply:** Keep a production-bundle regression check alongside shared HTML changes. Check that the public route, built app script and poster are accessible without signing in. Do not treat an ordinary development screenshot as proof that a published share works.

Keep single-title sharing URL-only. Distinguish preview eligibility from a guaranteed native Messages rendering.

**Why:** The user's goal is one Spotify-style title/poster card, not separate URL and text messages. Messages controls preview rendering and can retain an earlier failed preview.

**How to apply:** Provide title-specific server-rendered metadata and request a fresh share after publishing. Do not promise that an old message will redraw or claim a real iPhone sharing test passed based on HTTP checks.
