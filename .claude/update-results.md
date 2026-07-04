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

**Permission-safe command style:** the pre-approved Bash rules are prefix matches on the literal command text. Issue one `curl -s 'https://site.api.espn.com/...'` per Bash call (optionally piped into `python3 -c`), with the URL in single quotes. Never wrap curl in a `for` loop or other shell construct — the command then starts with `for`, not `curl`, and will trigger a permission prompt.

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

### 2c. Cross-check

**FIFA.com and www.cbssports.com do not carry this tournament's data** — repeated checks (multiple matches, multiple runs) found `www.fifa.com` returns blank content (it's a JS-rendered SPA that WebFetch can't execute) and `www.cbssports.com` 404s for these event IDs. Don't spend a turn on either; they're kept in the allowlist only as a courtesy, not as an expected source.

**Winner, score, referee — WebFetch(domain:www.espn.com)**: fetch the match page (`https://www.espn.com/soccer/match/_/gameId/EVENTID/...`) and ask for the final score, winner, and referee name. This has reliably returned real prose confirming the JSON API. Use it as the second source for these three facts.

**Cards — cross-check within the ESPN API itself**, since no external source or WebFetch'd ESPN prose page (match, report, stats, or commentary) has ever rendered card details — they only exist in the two JSON endpoints. Compare:
- `competitions[0].details[]` from the **scoreboard** call (2a) — filter entries where `yellowCard` or `redCard` is `true`, attributed by `team.id`.
- `keyEvents[]` from the **summary** call (2b) — filter entries where `type.text` contains `Card`, attributed by `team.displayName`.

These are two separate API responses; treat agreement between them as the cross-check for card counts and per-team attribution.

### Confirmation rule

Only treat a result as confirmed if:
- the winning team is confirmed by both the ESPN API (`winner == true`) and the ESPN match-page WebFetch (a match decided on penalties counts the penalty-shootout winner, which `winner == true` already reflects), and
- the yellow/red cards, attributed per team, agree between the scoreboard `details[]` list and the summary `keyEvents[]` list.

Be skeptical of any single source making definitive "only X cards" claims. If the two card lists disagree, the match hasn't completed, or the ESPN match-page WebFetch contradicts the API on the winner, skip that match — do not guess, do not write partial data. If a card cross-check merely comes back empty (no data either way, e.g. from a WebFetch'd prose page), that isn't authoritative in either direction — don't treat it as a disagreement, but don't treat it as confirmation either; use the two-endpoint API comparison above instead.

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
