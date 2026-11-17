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

### Formula still to be specified

A Bayesian-style weighted average is a suitable implementation candidate:

`weighted score = (v × R + m × C) ÷ (v + m)`

where `R` is the title's average, `v` is its distinct rater count, `C` is the
community baseline and `m` controls how cautiously small samples are treated.

This formula addresses rating confidence only; it is not a complete trending
formula because it does not include recency.

This formula is a **candidate, not an agreed parameter specification**.
Before implementing, define the baseline population, the value of `m`,
deterministic tie-breakers and the treatment of a very small or empty community.
The two-rating eligibility threshold is separate from `m`.

## Recency — required; exact method unresolved

The owner explicitly confirmed that **recency is a key factor**. It is a
required part of ranking, not an optional future enhancement. High historical
ratings and participation alone must not permanently keep a title at the top.

Ratings plus participation measure community popularity and confidence, but
do not by themselves measure recent momentum.

A rolling time window or time-decay rule has not been agreed. Do not silently
invent one or claim that new saves measure changes in rating rank.

When implementing recency, specify which event counts (rating submission or
edit, for example), how old ratings contribute, how elapsed time changes the
score, and how new ratings affect movement. Also define whether the two-rating
minimum applies to all-time raters or raters within a recent window.

A title's original add date or release date is not a substitute for its rating
date. Do not treat historical ratings with unknown timestamps as newly submitted
ratings merely because recency tracking is being introduced.

Gradual time decay is a recommended candidate for the small beta, rather than a
hard cutoff that can abruptly empty the chart. Its rate has not been agreed.
The displayed arithmetic average must remain separate from the recency-weighted
ranking score.

## Implementation checkpoint when these rules were recorded

The inspected code orders by the arithmetic average, with rating count only
breaking ties. It does not yet implement weighted ranking, recency, the
two-rating minimum, or a separate Early ratings section.

This is a checkpoint, not a permanent status claim. Inspect the current code
and published app when implementing or verifying these rules.
