---
name: Mobile scope and sign-in priorities
description: Keep Expo planning separate from current web UX work.
---

Keep an Expo list separately; the user does not want mobile-build planning to distract from resolving the current web sharing and sign-in experience.

**Why:** The user said repeated Replit sign-in is a reason they do not bring in more beta users, and wants sharing right before moving to mobile.

**How to apply:** Keep mobile work deferred unless requested. Do not assume a native rebuild fixes backend session refresh failures or removes the chosen identity provider's consent screen.

Do not describe a ninety-day session cookie as a guarantee of ninety days without another login.

**Why:** The cookie lifetime and the identity provider's credential validity are independent; the previous promise overstated what Hotlist can control.

**How to apply:** Describe persistent sign-in as an intended normal-use experience, explain unavoidable revocation and browser-isolation limits, and distinguish verified renewal behavior from long-term retention.
