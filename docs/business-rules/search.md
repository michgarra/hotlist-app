# Unified title and actor search

## Agreed product direction

- My List is the default screen.
- The main search bar searches TMDB for movies and episodic television, not
  just the saved entries in the currently selected tab.
- Users can enter a title or an actor's name. Actor searches return relevant
  titles from that person's filmography.
- Search is one consistent task across My List, Hotlist and Watched; users
  should not have to choose the correct tab or open Add Title to discover a title.
- Results identify whether a title is on the signed-in user's My List, on
  Watched, and/or in the community Hotlist.
- Personal-list membership and community Hotlist membership are different
  things. A title can be Watched and also in the Hotlist; labels are not
  mutually exclusive.
- Search must respect the existing no-duplicate-title rule.
- Keep internal search/ranking explanations out of the user screen unless requested.

## Implementation requirements to preserve this behaviour

- Match catalog titles by media type and TMDB ID, not display title alone.
  Movie and TV identifiers can overlap.
- Do not label an entry "not saved" while account membership is still loading
  or failed to load.
- A provider error is not a valid empty result. Show a retryable error rather
  than silently saying the title was not found.
- Existing personal-list entries should open their saved record for viewing or
  editing rather than create another copy.
- A new catalog title should use the existing add-details flow.

## Details to settle during the search walkthrough

- How choosing among actors with the same or similar name should work.
- Catalog result pagination and the desired filmography breadth.
- Behaviour of saved-list filters, archived entries and an active query when
  switching tabs.
- Whether the Hotlist result label includes Early ratings or only the numbered
  community chart.

## Investigation checkpoint

The main Dashboard search currently filters saved records within its selected
tab. Add Title separately calls TMDB. These are two different search tasks,
which does not match the agreed direction above.

The development TMDB search endpoint returned Black Doves as a TV Show with
TMDB ID 225385 during investigation. This confirms that the development backend
can find it; it does not establish why the user could not find it in the
published Add Title screen. That path still needs reproduction.

No unified-search implementation has been applied as part of recording these rules.

### History check

The owner recalls TMDB search working from the default screen and raised the
possibility of a regression. Treat that report seriously; do not describe
TMDB title/actor search as wholly new functionality.

In the available Dashboard history, the earliest version already filters saved
records locally. The later actor/filmography search improvements inspected
changed the TMDB backend used by Add Title, not the Dashboard's main search.
No removal of a TMDB-backed main search was identified in that history check.
This does not establish that the owner's previously experienced workflow never
existed, or reproduce the published Add Title failure.
