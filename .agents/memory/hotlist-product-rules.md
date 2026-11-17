---
name: Hotlist product priorities
description: User-defined meaning of the aggregated Hotlist and the pre-mobile quality priority.
---

Consult `docs/business-rules/` before changing Hotlist ranking, search or people/duplicate behaviour. These documents are the canonical agreed business rules.

**Why:** The user explicitly asked to keep the business rules in a folder for later reference. They preferred community-supported weighted ranking over ordering purely by average and approved gradual time decay as the required recency mechanism.

**How to apply:** Read the relevant rule, distinguish agreed policy from implemented/published behaviour, and update it when the owner changes direction. Do not fall back to the superseded average-only ranking decision.

Use `docs/business-rules/search.md` for the user-defined unified-search behaviour.

**Why:** The user wants the default My List search bar to search TMDB by title or actor and identify My List, Hotlist and Watched membership, rather than require a different search task in each tab.

**How to apply:** Treat discovery and existing-list lookup as one search experience. Do not assume that a working Add Title endpoint resolves the separate main-search problem.

Selecting Hot or Watch Soon must move the title to the top of My List, including from search.

**Why:** The user currently has to locate the title again in a long list and drag it upward after choosing a priority tag.

**How to apply:** Follow the saved-order requirements in the search business rules. Keep this personal ordering separate from community Hotlist ranking.

Use `docs/business-rules/series-and-new-seasons.md` for the series-lifecycle requirements.

**Why:** The user wants weekly metadata refresh, new-season announcements with a date when known, an action to track that season, and a message when it starts airing. If an announcement is missed, they want to search, find the series marked Watched, move it back to My List and manually enter the date in details.

**How to apply:** Preserve watched history, distinguish announcements from actual release, and do not treat a duplicate series warning or a season-count increase as a complete new-season experience. Never require an automatic announcement before allowing the manual returning-series workflow.

Do not promise unattended weekly season checks from an autoscaling web-service timer.

**Why:** The server can sleep; automatic discovery on opening Hotlist is not the same as a guaranteed scheduled background job. TMDB premiere dates also do not prove Australian streaming availability.

**How to apply:** Be explicit about in-app versus external notifications and scheduled-service requirements. Never infer completed individual seasons from a catalog season count.

Keep Hotlist ranking rationale in the business-rules folder, not on the user screen.

**Why:** The user explicitly objected to unrequested ranking explanations and rating-date notices on the Hotlist screen and asked to remove them.

**How to apply:** Do not add formula explanations, time-decay details or repeated technical caveats to this screen without being asked. Keep functional headings, ratings and counts.

Be proactive about getting the web app’s fundamentals right before building mobile.

**Why:** The user stopped bringing in beta users due to basic issues and explicitly asked to prioritize fundamentals before mobile.

**How to apply:** Verify the underlying product behavior, not just whether the screen refreshes or renders. Keep Expo deferred while current web fundamentals are being resolved.
