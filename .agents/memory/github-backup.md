---
name: GitHub backup safety
description: Preserve the older GitHub implementation when backing up the current Replit app.
---

Keep the older GitHub default branch intact; back up the Replit app on its separate backup branch unless the owner explicitly asks to consolidate the versions.

**Why:** At the first Replit backup, the selected repository contained an older Hotlist implementation with independent Git history. The owner asked for a backup, not replacement of that older version.

**How to apply:** Inspect current remotes and branch ancestry before pushing. Use a normal, non-forced push to the existing Replit backup branch. Do not merge unrelated histories or force-push the default branch as part of a routine session close.

Check the remote revision before retrying a push that reports a local tracking-reference error.

**Why:** Replit's Git protection can block updating a local remote-tracking reference after GitHub has already accepted the push.

**How to apply:** Compare the remote branch revision with the intended local revision. A nonzero command exit alone does not prove the remote push failed.
