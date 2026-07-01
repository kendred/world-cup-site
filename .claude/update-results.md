# Playbook: update World Cup results & ref cards

Run these steps in order against the repo at `/Users/rileyoneill/Projects/world-cup-site`.

## 1. Identify pending matches

Read `data/bracket.js`. For each entry in `MATCHES`, it's "pending" if:
- its `id` is NOT already a key in `RESULTS`, AND
- both of its `slots` are resolvable — either a literal team name, or `{ from: matchId }` where `matchId` already has a winner in `RESULTS`.

Also read `data/refs.js` to see current `yellows`/`reds` per referee, so you know the baseline before adding any new cards.

If there are no pending matches, stop here and report "no new results."

## 2. Look up and cross-check results

**Only use these confined sources.** They are all pre-approved in `.claude/settings.local.json`, so no run should ever trigger a permission prompt or touch an arbitrary domain discovered via web search. Do NOT open-endedly search the web for results — construct the URLs below directly.

### 2a. Completion, score & winner — ESPN JSON API (primary, machine-readable)

The ESPN API returns structured JSON — parse it with `python3`, never through `WebFetch` (which summarizes and can hallucinate). For each date that has pending matches:

```
curl -s 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=YYYYMMDD'
```

For each event, read `competitions[0].status.type`:
- Treat the match as playable only if `completed == true` (status name `STATUS_FULL_TIME`). If not completed, skip it — do not guess.

Determine the result from `competitions[0].competitors[]`:
- The advancing team is the one with `winner == true`. This is set correctly regardless of how the match was decided (regulation, extra time, or penalties), so use it as the authoritative winner.
- `score` is the regulation/ET score; `shootoutScore` (when non-null) is the penalty tally. Record both to sanity-check.
- Note each event's `id` — you need it for the match detail call below.

### 2b. Cards & referee — ESPN match summary API

For each completed event id:

```
curl -s 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=EVENTID'
```

Parse with `python3`:
- Cards are in `keyEvents[]` where `type.text` contains `Card` (Yellow/Red). Each card event's `team.displayName` gives the **per-team attribution** needed for `MATCH_STATS`. (Player name in `athletesInvolved` is sometimes empty — that's fine; team attribution is what matters.)
- The officiating referee is in `gameInfo.officials[]` with `position.displayName == "Referee"` — use `displayName` to match against `REFS`.
- **Known ESPN name aliases** (ESPN display name → REFS name): "Adham Mohammad" → "Adham Makhadmeh" (Jordan).

### 2c. Cross-check — FIFA.com (second canonical source)

Confirm the ESPN API winner and card counts against the official FIFA match report/stats page via `WebFetch(domain:www.fifa.com)`. If the FIFA page isn't reachable, fall back to the ESPN match report at `WebFetch(domain:www.espn.com)` as the second source. (`www.cbssports.com` scoreboard is available as a completion-check fallback if the API is down.)

### Confirmation rule

Only treat a result as confirmed if the ESPN API and the second source agree on:
- the winning team (a match decided on penalties counts the penalty-shootout winner, which `winner == true` already reflects), and
- the yellow/red cards issued, attributed per team and to the correct referee by name.

Be skeptical of any single source making definitive "only X cards" claims — reconcile the API `keyEvents` card list against the cross-check source. If the two sources disagree, or the match hasn't completed, skip that match — do not guess, do not write partial data.

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
