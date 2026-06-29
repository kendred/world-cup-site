# Playbook: update World Cup results & ref cards

Run these steps in order against the repo at `/Users/rileyoneill/Projects/world-cup-site`.

## 1. Identify pending matches

Read `data/bracket.js`. For each entry in `MATCHES`, it's "pending" if:
- its `id` is NOT already a key in `RESULTS`, AND
- both of its `slots` are resolvable — either a literal team name, or `{ from: matchId }` where `matchId` already has a winner in `RESULTS`.

Also read `data/refs.js` to see current `yellows`/`reds` per referee, so you know the baseline before adding any new cards.

If there are no pending matches, stop here and report "no new results."

## 2. Look up and cross-check results

For each pending match, search the web for the result:
- **Primary source**: FIFA.com official match report or match statistics page.
- **Confirming source**: ESPN match report or official match statistics.

Only treat a result as confirmed if both sources agree on:
- the winning team (a draw that went to penalties counts the penalty-shootout winner; a draw with no shootout — group stage only, shouldn't occur in this knockout bracket — should be skipped and flagged), and
- any yellow/red cards issued, attributed to the correct referee by name.

**Important:** When verifying cards:
- Do NOT rely on a single summary claiming "only X cards were shown." Verify with multiple independent sources.
- Search for official match statistics pages (ESPN stats, FotMob, official FIFA match center) that list all cards.
- Be skeptical of any source making definitive "only" or "exactly" claims—cross-check them.
- If a summary contradicts your other sources, do additional searches to resolve the discrepancy before accepting the data.

If the two sources disagree, or the match hasn't been played yet, skip that match — do not guess, do not write partial data.

## 3. Update the data files

For each newly-confirmed match:
- Add `RESULTS["<id>"] = "<Winning Team>";` to `data/bracket.js`, using the exact team name string as it appears in that match's `slots`.
- Add a `MATCH_STATS["<id>"]` entry in `data/bracket.js` with both teams keyed by their exact slot names, each having `goals`, `yellows`, and `reds`. Cards must be attributed to the team whose player was booked — verify per-team attribution (the booked player's team), not just the match total. This drives the per-team "most cards" bet shown on the bracket and points panel.
- For the referee who officiated, find their entry in `REFS` (`data/refs.js`) by `name` and increment `yellows`/`reds` by the cards issued in that match. If the referee isn't listed in `REFS` (e.g. an unlisted/undrafted official), skip the card update for that match — do not add a new row. (Even when the ref is unlisted, still record per-team cards in `MATCH_STATS`.)

Preserve existing formatting, comments, and untouched entries in both files exactly as they are. Don't reorder, reformat, or touch any other part of these files.

If `data/bracket.js` or `data/refs.js` changed, bump the cache-busting query param on the affected script tag(s) in `index.html` (e.g. `data/bracket.js?v=1` → `?v=2`). Browsers cache these files, so without bumping the version the site won't show updated results on a normal refresh.

## 4. Sanity-check before committing

- Every key added to `RESULTS` must be a real `id` from `MATCHES`.
- Every value added to `RESULTS` must match one of that match's two slots (resolved team names).
- No `yellows` or `reds` value should ever decrease from its prior value.
- Card counts: verify the number of yellows/reds matches what you found in at least two independent sources. If sources differ, do not commit until resolved.
- Per-team card counts in `MATCH_STATS` for a match must sum to the cards added to that match's referee in `REFS` (when the ref is a listed one). If they don't reconcile, the per-team attribution is wrong — resolve before committing.
- If any check fails, revert that specific change rather than committing it.

## 5. Commit and push

If `data/bracket.js` or `data/refs.js` changed:
```
git add data/bracket.js data/refs.js index.html
git commit -m "Update results: <comma-separated list of match ids updated>"
git push origin main
```

If nothing changed, do not commit anything.

## 6. Report

End with a short summary: which matches were newly confirmed and their winners, which referees got card updates, and whether anything was skipped due to source disagreement.
