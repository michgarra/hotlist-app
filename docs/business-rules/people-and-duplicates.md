# People and duplicate prevention

## Agreed rules

- Do not create duplicate titles in the same user's list. Duplicate prevention
  is an existing product requirement, not an optional ranking feature.
- Prevent duplicate people in Friends and Watch With.
- Case differences, leading/trailing spaces and redundant internal spaces do
  not make a different person.
- Watch With represents individual people. A combined entry such as
  “Alex and Jamie” must not become a third person alongside Alex and Jamie.
- Remember previously used people and suggest them while typing.
- Nicknames or spelling variants may refer to the same person, but require
  confirmation before they are combined.
- Nickname equivalences are account-specific. Never apply one user's nickname
  mapping to everyone.
- Confirmed combining must preserve titles, ratings, notes, watched dates and
  the association between titles and people.
- Prevent duplicates when requests happen simultaneously, not only in the
  dropdown display.
- Present a review before applying a saved-data consolidation. A preview must
  not itself change saved records.

Do not put personal nickname mappings in these shared rules. Store confirmed
account-specific mappings through the app's people-management flow.

See [the implementation and verification guide](../people-names.md).
