# TV series and new seasons

## User problem

A member has watched and liked a series. They hear that another season is
coming and try Add Title, but are blocked by a generic “already in your list”
message. That message does not identify My List versus Watched and offers no
way to track the new season.

This is a series-lifecycle problem, not permission to create duplicate series
records or erase watched history.

## Requested outcomes

- Refresh tracked TV-series metadata automatically each week.
- Detect a newly announced season and notify the relevant member.
- Include its release date when the source provides one. If it does not,
  make clear that the date is to be confirmed; never invent a date.
- Let the member act on the announcement to put the upcoming season on My List.
- Notify the member when that season starts airing.
- Identify whether an existing title is in **My List** or **Watched**, rather
  than only saying “already in your list”.
- Automatic discovery is not a prerequisite: if the member hears about a new
  season elsewhere, they can search, find the series labelled **Watched**,
  and move the existing series back to **My List** to track its return.
- Keep manual date entry in details available for that returning series,
  including when automatic metadata has not captured the announcement or date.

## Proposed behaviour for design review

1. Keep the member's watched-season history when a later season is announced.
2. Present an announcement such as “Season 2 announced — date to be confirmed”
   or the known release date, with an action to track that season.
3. Adding a later season to My List must not claim that the entire series is
   unwatched or duplicate the series to work around the title constraint.
4. At release, offer an action to view or start watching the tracked season.
5. Search and title details should expose the existing saved record and the
   new-season action, rather than dead-end at the duplicate warning.
6. Movies retain their existing title-level behaviour.

### Manual fallback confirmed during the walkthrough

The member does not have to wait for an announcement alert or for Hotlist to
recognise a new season. Search → **Watched** result → move to **My List** →
optionally enter the date in details must remain a complete usable route.
Move the existing saved series; do not create a second title entry.
Moving it back must preserve prior watched history, ratings and notes rather
than imply that earlier viewing never happened. This is a requested workflow,
not confirmation that the current data model already preserves season history.

These describe the intended outcome; the exact screen layout, season-level
data model and controls are still to be designed.

## Reliability requirements to address during implementation

- Announcement and “now airing” are different events. An increased season
  count alone does not prove a season has started airing.
- Once a release date is known, schedule or check its release separately
  from weekly metadata discovery so the message is not needlessly a week late.
  Revalidate changed dates and postponements before announcing it as airing.
- Do not send the same announcement repeatedly on each metadata refresh.
- A changed release date is an update, not another new-season announcement.
- Unknown dates, renewed-but-unscheduled series, specials and unavailable
  metadata must not be reported as a confirmed premiere.
- Preserve watched history, ratings, notes and existing title associations.
- Refresh shared catalog metadata per series rather than redundantly fetching
  it once for every member who saved the same series.

## Decisions still open

- In-app inbox/banner versus push, email or other notification channels.
- Which saved series members follow by default and how to mute/unfollow them.
- Whether “now airing” is triggered by the source premiere date, Australian
  availability, or a selected streaming service.
- Whether tracking is required before release alerts, or whether all followed
  watched series receive them.
- Treatment of per-season ratings versus the current series rating.

## Investigation checkpoint

Implemented in development, pending republish:

- Watched TV-series details offer Move to My List, keeping the same saved
  title, notes, rating and review. The prior watched date, rating, review and
  recorded season count are retained in a watched-history snapshot. This
  preserves existing viewing records; it does not invent a per-season history
  for old entries that never recorded one.
- A separate editable Next season date leaves the original series premiere
  date unchanged. It is optional; tracking does not require TMDB to recognise
  an announcement first.
- In-app series announcements and airing alerts have stable per-title/season/
  event identities and durable, account-scoped dismissal. A date change does
  not create another announcement. An airing event is distinct from its
  announcement.
- Moving a watched series back to My List acknowledges its current alerts.
  Do not continue showing its announcement or an already-airing notice after
  that action. A premiere occurring after acknowledgement can still generate
  a new airing alert. Titles moved using the earlier version are acknowledged
  on their next alert check, preserving their original viewing history.
- Keep season alerts out of My List, the community Hotlist and all search
  results. Offer a collapsed **Season updates** control on Watched only;
  expand alerts only when the member requests them, with bounded scrolling.
  Starting a search or leaving Watched hides/unmounts that control so it is
  collapsed when returning. Unrelated alerts must never push a searched title
  down the screen.
- Shared TMDB season metadata is refreshed when seven days old. Known premiere
  dates trigger revalidation on or after the date, without waiting another
  week. Specials are excluded. A manually entered date alone is not evidence
  that the season has actually aired.
- Checks run when the app opens/refetches alerts, at service startup, and every
  six hours while the server is awake. Failed metadata fetches preserve the
  cached snapshot; an unverified release is not described as airing.

### Explicit delivery limits

- Alerts are inside Hotlist, not SMS, email or push notifications.
- The current autoscaling deployment can sleep. Timers inside that service
  do not guarantee a weekly run while nobody visits. An independently scheduled
  job or always-on service is still needed for guaranteed unattended checks;
  the app catches up when opened. No deployment target was changed.
- Dates describe TMDB's season premiere, evaluated on the Australia/Sydney
  calendar, not a promise of availability on an Australian streaming service.
- The existing saved season count is the conservative baseline for old watched
  entries. Missing historical metadata cannot prove exactly which seasons a
  member finished.
- A renewal with no season record in TMDB cannot be discovered by this source.
