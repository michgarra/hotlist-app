# Aggregated Hotlist ranking

## Purpose — agreed

The Hotlist tab is the community chart, separate from each user's My List and
Watched tabs. It should represent what is trending now across Hotlist members,
using their own ratings, the strength of community participation and recency.

The owner considers a title rated 4.7 by twenty people more relevant to this
chart than a title rated 5 by only one person. Raw list-save counts are not
ratings and must not determine the chart's primary ranking.

## Displayed average — agreed

The displayed Hotlist rating is the arithmetic average:

**Sum of member rating points ÷ number of members who rated that title.**

- A member who has not rated the title is not included in the denominator.
- Missing ratings are not zero ratings.
- Member ratings must stay within the 0–5 scale; invalid values are rejected.
- Each member contributes at most one current rating to a title.
- Display the number of ratings beside the average, including when it is one.
- Updating a member's rating replaces their contribution; it does not add a
  second vote.

Example: ratings of 5 and 4 give an average of 4.5 from two ratings.

## Main-chart eligibility — agreed

- A title requires **at least two distinct member ratings** for the main ranking.
- Titles with one rating belong in a clearly labelled **Early ratings** section
  below the main chart, not among its numbered positions.
- Unrated titles do not qualify for the main chart or Early ratings.
- Low participation must be explained honestly, not hidden with fabricated
  ratings, artificial rotation or ratings from external sites.

## Ranking score — agreed direction

Use a **weighted community ranking** that considers the rating average,
the number of member ratings and recency. Rating count and recency must have
a meaningful influence, not merely break ties between equal averages.

The goal is to reduce the dominance of very small samples while recognising
high ratings supported by more people. This replaces the earlier decision to
order solely by arithmetic average with rating count only as a tie-breaker.

The displayed average and the ranking score have different meanings:

- **Average:** what members actually rated the title.
- **Weighted score:** a measure used to order the chart with allowance for how
  much evidence supports that average and how recent the activity is.

Do not label a weighted score as though it were the arithmetic average.
More ratings alone must not always beat substantially better ratings.

### Initial implementation formula

The owner approved gradual time decay. The following are the initial engineering
settings for the beta, and can be adjusted without changing anyone's actual rating:

- **Half-life:** 30 days.
- **Participation scale:** 5 ratings.
- **Eligibility:** at least 2 distinct all-time raters, not 2 within a hard window.

For a title with arithmetic average `R` and `v` distinct current raters:

```
participation weight = v / (v + 5)
rating freshness = 0.5 ^ (age in days / 30)
title freshness = sum of rating freshness values / v
trending score = R × participation weight × title freshness
```

This is a transparent participation-adjusted score, not a statistical confidence
interval or a Bayesian average using an assumed community baseline. It replaces
the earlier Bayesian-style candidate.

At equal recency, 4.7 from 20 people has a score of 3.76, while 4.8 from 2 has a
score of approximately 1.37. These are internal ordering scores, **not displayed
member averages**.

The score is computed at read time. It is not frozen when a title is added or
rated. If every title's activity ages equally and nobody rates anything new,
scores fall together and positions may stay the same; the app must not invent
movement just to make the chart appear active.

Ties are broken by participation-adjusted quality (`R × v / (v + 5)`), then rating
count, title alphabetically, and catalog ID. Use unrounded values for ordering.
Return up to 50 titles in each section independently. A large Early ratings
section must not displace eligible main-chart titles.

## Recency — required, using gradual decay

The owner explicitly confirmed that **recency is a key factor**. It is a
required part of ranking, not an optional future enhancement. High historical
ratings and participation alone must not permanently keep a title at the top.

Ratings plus participation measure community popularity and confidence, but
do not by themselves measure recent momentum.

Use the server-recorded time when a member first rates a title or actually
changes their rating. At 30 days that rating's freshness is 50%, at 60 days 25%,
and at 90 days 12.5%. There is no hard cutoff.

Saving an unchanged rating, editing notes, changing status, archiving, or merely
adding a title to a list must not refresh a rating's date. Clearing a rating
removes its vote and date. Clients cannot supply their own rating dates.
Future dates, if encountered, are clamped to age zero rather than given a bonus.

A title's original add date or release date is not a substitute for its rating
date. Do not treat historical ratings with unknown timestamps as newly submitted
ratings merely because recency tracking is being introduced.

Legacy ratings with unknown dates remain in the displayed average and all-time
rater count but contribute zero recency weight. Do not backfill their dates
with the deployment time, add date or watched date. If all rating dates for a
title are unknown, give no recency boost. With no dated ratings, use the
documented quality tie-breaker.

Keep ranking rationale, decay parameters and historical-date caveats in this
business-rules folder, not on the user-facing Hotlist screen. Do not add
explanatory paragraphs or repeated per-title rating-date notices without the
owner's request. Retain useful section headings, average ratings and counts.

The displayed arithmetic average remains separate from the recency-weighted
ranking score.

## Implementation and publishing

The implementation now includes participation weighting, gradual time decay,
server-owned rating dates, the two-rating minimum and a separate unnumbered
Early ratings section. Unrated titles are excluded.

Publishing is separate: the schema addition and application changes must be
published before the live app uses these rules. No saved ratings are rewritten.
Verify the running app rather than inferring publishing status from this document.
