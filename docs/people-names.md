# Friends and Watch With

## Matching rules

- Case, redundant spaces and Unicode-width differences do not create new people.
- Watch With separates comma-, “and”- and “&”-joined people into individual names.
- Nicknames are only equivalent after the account owner explicitly combines them.
- Nicknames belong to one account, not a global nickname dictionary.
- Names with different spellings are not guessed to be the same person.

## Combining old entries

After publishing, open **My Friends → Combine duplicate names**.

1. Enter the preferred name, for example **Alex**.
2. Enter other names for that same person, for example **Alexander**.
3. Choose **Review changes**. This does not modify saved data.
4. Check the names, affected-title count and sample Watch With changes.
5. Choose **Confirm combine names**.

Repeat separately for each person. Do not list two different people as aliases.
If no existing Friend matches, confirming creates a Friend to remember the preferred
name and aliases. Existing matching Friend entries are consolidated.

Confirmation updates the signed-in account’s Recommended By and Watch With text.
Combined Watch With names throughout that account are also separated and deduplicated.
It does not delete titles, ratings, notes, watched dates or watch history.
It does not modify another account’s names.

The complete change is transactional. Failure rolls back Friend consolidation and
title updates together. Repeating a successful combine is safe. The same account
lock protects normal Friend creation and title saves against competing name changes.

## Publishing

The additive `friends.aliases` column is applied to development. Normal publishing
applies the production schema change. No production data cleanup or startup DDL
is performed. Existing live names are combined only through the signed-in action.

## Focused checks

```sh
TEST_PEOPLE_DATABASE=1 node --import tsx --test shared/people.test.ts server/people.test.ts
npm run check
npm run build
```

The PostgreSQL tests create and remove an isolated test schema, not real account data.
They cover preview without writes, concurrent duplicate creation, persisted aliases,
account isolation, history preservation, idempotence and rollback on a forced failure.

A 402×874 browser pass with synthetic authenticated API fixtures verified preview
without applying, invalidation of the preview after editing inputs, explicit
confirmation, refreshed Friend names, and Watch With nickname suggestions without
duplicate chips. This was a UI-only check, not real-provider or real-database
end-to-end verification. The real database behaviour was checked separately above.
