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

The existing app has a manual new-season check that compares season counts.
That is not equivalent to weekly background metadata refresh, announcement
tracking, scheduled release notifications or season-level watch history.

This document captures the walkthrough. No series or notification behaviour
has been changed yet.
