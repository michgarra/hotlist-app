# Hotlist business rules

This folder is the reference for agreed product behaviour. Keep it up to date
when the owner changes a rule, and consult it before changing related features.

## Rules

- [Hotlist ranking](hotlist-ranking.md): community ratings, participation,
  minimum rating count and the distinction between average and ranking score.
- [People and duplicate prevention](people-and-duplicates.md): titles,
  Friends, Watch With and confirmed nicknames.

## How to use these documents

- **Agreed** means a product decision has been made. It does not by itself mean
  that the behaviour is implemented or published.
- State unresolved decisions explicitly rather than inventing a business rule.
- When implementing a rule, check related screens and saved-data behaviour,
  not just whether the page loads or refreshes.
- Update the relevant rule when the owner changes it. Do not silently keep a
  superseded rule as the default.
- Publishing status is separate from product policy. Verify the running app
  before claiming a rule is live.

Related implementation guides:

- [People-name combining](../people-names.md)
- [Sign-in reliability and limitations](../sign-in-reliability.md)
- [Deferred Expo work](../expo-backlog.md)
