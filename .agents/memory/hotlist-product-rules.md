---
name: Hotlist product priorities
description: User-defined meaning of the aggregated Hotlist and the pre-mobile quality priority.
---

The aggregated Hotlist ranks by Hotlist users’ ratings, not by how many people saved a title.

**Why:** The user explicitly confirmed: “Yes user ratings - that is what makes it hot.”

**How to apply:** Treat user ratings as the primary ranking signal. Refresh fixes alone do not correct a ranking rule that ignores ratings.

Be proactive about getting the web app’s fundamentals right before building mobile.

**Why:** The user stopped bringing in beta users due to basic issues and explicitly asked to prioritize fundamentals before mobile.

**How to apply:** Verify the underlying product behavior, not just whether the screen refreshes or renders. Keep Expo deferred while current web fundamentals are being resolved.

Friends and Watch With must prevent duplicate people, just as titles must prevent duplicate entries.

**Why:** The user said a no-duplicates rule should be in place for both and reported repeated entries for their daughters.

**How to apply:** Check saved data as well as dropdowns and suggestions. Ignore case and redundant spaces when matching names; confirm nicknames or spelling variants before merging distinct names.
