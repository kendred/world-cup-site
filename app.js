// ---- lookups ----
const teamByName = Object.fromEntries(TEAMS.map((t) => [t.name, t]));
const matchById = Object.fromEntries(MATCHES.map((m) => [m.id, m]));

function resolveSlot(slot) {
  if (typeof slot === "string") return slot;
  const feedingMatch = matchById[slot.from];
  return RESULTS[feedingMatch.id] || null;
}

// For a given match, resolve both team slots to names (or null if TBD).
function resolvedTeams(match) {
  return match.slots.map(resolveSlot);
}

// For every team, compute: rounds it has won (in order), and whether/where it lost.
function computeTeamStatus(teamName) {
  const wonRounds = [];
  let eliminatedInRound = null;
  let alive = true;

  for (const round of ROUND_ORDER) {
    const match = MATCHES.find(
      (m) => m.round === round && resolvedTeams(m).includes(teamName)
    );
    if (!match) break; // team hasn't reached this round (yet, or ever)

    const winner = RESULTS[match.id];
    if (!winner) {
      alive = true; // currently sitting in this round, undecided
      break;
    }
    if (winner === teamName) {
      wonRounds.push(round);
    } else {
      eliminatedInRound = round;
      alive = false;
      break;
    }
  }

  const points = wonRounds.reduce((sum, r) => sum + ROUND_POINTS[r], 0);
  return { wonRounds, eliminatedInRound, alive, points };
}

// ---- card stats ----
// Per-team stats for a specific match (or null if not recorded yet).
function matchTeamStats(matchId, teamName) {
  return (MATCH_STATS[matchId] && MATCH_STATS[matchId][teamName]) || null;
}

// Total cards a team has accumulated across all played matches.
function teamCardTotals(teamName) {
  let yellows = 0, reds = 0;
  for (const matchId in MATCH_STATS) {
    const stats = MATCH_STATS[matchId][teamName];
    if (stats) {
      yellows += stats.yellows;
      reds += stats.reds;
    }
  }
  return { yellows, reds, points: yellows * 1 + reds * 3 };
}

// Mini-card HTML for the points table: a yellow cell and a red cell. With
// showZero, both always render (muted at 0); without it, only non-zero counts render.
function renderCards(yellows, reds, { showZero = false } = {}) {
  const cell = (kind, n) =>
    !showZero && n === 0
      ? ""
      : `<span class="card-cell${n === 0 ? " zero" : ""}">` +
        `<span class="mini-card ${kind}"></span>${n}</span>`;
  return cell("yellow", yellows) + cell("red", reds);
}

// Inline stats for a team's bracket slot, read as [count][icon]:
// goals (always, with a soccer-ball icon) then any yellow/red cards.
function renderSlotStats(stats) {
  const stat = (n, icon) =>
    `<span class="stat"><span class="num">${n}</span>${icon}</span>`;
  let html = stat(stats.goals, `<span class="ball">⚽</span>`);
  if (stats.yellows > 0) html += stat(stats.yellows, `<span class="mini-card yellow"></span>`);
  if (stats.reds > 0) html += stat(stats.reds, `<span class="mini-card red"></span>`);
  return html;
}

// ---- bracket rendering ----
function renderBracket() {
  const el = document.getElementById("bracket");
  el.innerHTML = "";

  for (const round of ROUND_ORDER) {
    const roundMatches = MATCHES.filter((m) => m.round === round);
    const col = document.createElement("div");
    col.className = "bracket-round";

    const title = document.createElement("div");
    title.className = "round-title";
    title.textContent = ROUND_LABELS[round];
    col.appendChild(title);

    const matchesWrap = document.createElement("div");
    matchesWrap.className = "round-matches";

    for (const match of roundMatches) {
      const box = document.createElement("div");
      box.className = "match-box";

      const teams = resolvedTeams(match);
      const winner = RESULTS[match.id];

      teams.forEach((teamName) => {
        const slotEl = document.createElement("div");

        if (!teamName) {
          slotEl.className = "slot tbd";
          slotEl.textContent = "TBD";
          box.appendChild(slotEl);
          return;
        }

        const team = teamByName[teamName];
        const isLoser = winner && winner !== teamName;
        const isWinner = winner && winner === teamName;

        slotEl.className = "slot" + (isLoser ? " eliminated" : "") + (isWinner ? " winner" : "");

        const nameEl = document.createElement("span");
        nameEl.className = "team-name";
        nameEl.textContent = `${team.flag} ${team.name}`;

        const drafterEl = document.createElement("span");
        drafterEl.className = "drafter";
        drafterEl.textContent = team.drafter;

        slotEl.appendChild(nameEl);

        const stats = matchTeamStats(match.id, teamName);
        if (stats) {
          const statsEl = document.createElement("span");
          statsEl.className = "slot-stats";
          statsEl.innerHTML = renderSlotStats(stats);
          slotEl.appendChild(statsEl);
        }

        slotEl.appendChild(drafterEl);
        box.appendChild(slotEl);
      });

      matchesWrap.appendChild(box);
    }

    col.appendChild(matchesWrap);
    el.appendChild(col);
  }
}

// ---- points panel rendering ----
function renderPointsPanel() {
  const el = document.getElementById("points-panel");
  el.innerHTML = "";

  const drafterSummaries = DRAFTERS.map((drafter) => {
    const teams = TEAMS.filter((t) => t.drafter === drafter);

    let drafterTotal = 0;
    let drafterCardPoints = 0;

    const rows = teams
      .map((team) => {
        const status = computeTeamStatus(team.name);
        drafterTotal += status.points;

        const cards = teamCardTotals(team.name);
        drafterCardPoints += cards.points;

        const nameClass = "name" + (status.eliminatedInRound ? " eliminated" : "");
        const statusText = status.eliminatedInRound
          ? `Lost in ${ROUND_LABELS[status.eliminatedInRound]}`
          : status.alive
          ? "Alive"
          : "";

        return `
          <div class="team-row">
            <span class="${nameClass}">${team.flag} ${team.name}</span>
            <span class="status">${statusText}</span>
            <span class="pts">${status.points} pt${status.points === 1 ? "" : "s"}</span>
            ${renderCards(cards.yellows, cards.reds, { showZero: true })}
          </div>`;
      })
      .join("");

    return { drafter, drafterTotal, drafterCardPoints, rows };
  });

  drafterSummaries.sort(
    (a, b) => b.drafterTotal - a.drafterTotal || b.drafterCardPoints - a.drafterCardPoints
  );

  for (const { drafter, drafterTotal, drafterCardPoints, rows } of drafterSummaries) {
    const card = document.createElement("div");
    card.className = "drafter-card";

    card.innerHTML = `
      <h3><span>${drafter}</span><span class="total">${drafterTotal} pts &middot; ${drafterCardPoints} card pts</span></h3>
      ${rows}
    `;

    el.appendChild(card);
  }
}

// ---- refs tab: drafter leaderboard ----
// Sum each drafter's refs into one row, sorted by points (then reds, then name).
function renderRefLeaderboard() {
  const el = document.getElementById("ref-leaderboard");
  if (!el) return;

  const totals = DRAFTERS.map((drafter) => {
    let yellows = 0, reds = 0;
    for (const ref of REFS) {
      if (ref.drafter === drafter) {
        yellows += ref.yellows;
        reds += ref.reds;
      }
    }
    return { drafter, yellows, reds, points: yellows * 1 + reds * 3 };
  }).sort(
    (a, b) =>
      b.points - a.points || b.reds - a.reds || a.drafter.localeCompare(b.drafter)
  );

  const rows = totals
    .map(
      (t, i) => `
        <tr>
          <td class="rank">${i + 1}</td>
          <td>${t.drafter}</td>
          <td>${t.yellows}</td>
          <td>${t.reds}</td>
          <td class="pts">${t.points}</td>
        </tr>`
    )
    .join("");

  el.innerHTML = `
    <h3>Standings</h3>
    <table class="leaderboard-table">
      <thead>
        <tr><th>#</th><th>Drafter</th><th><span class="mini-card yellow"></span></th><th><span class="mini-card red"></span></th><th>Pts</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

// ---- refs tab rendering ----
function renderRefs() {
  const el = document.getElementById("refs-layout");
  el.innerHTML = "";

  for (const drafter of DRAFTERS) {
    const refs = REFS.filter((r) => r.drafter === drafter);
    const list = document.createElement("div");
    list.className = "ref-list";

    let totalY = 0, totalR = 0, totalP = 0;

    const rows = refs
      .map((ref) => {
        const points = ref.yellows * 1 + ref.reds * 3;
        totalY += ref.yellows;
        totalR += ref.reds;
        totalP += points;
        return `
          <tr>
            <td>${ref.name}<div class="ref-country">${ref.country}</div></td>
            <td>${ref.yellows}</td>
            <td>${ref.reds}</td>
            <td>${points}</td>
          </tr>`;
      })
      .join("");

    list.innerHTML = `
      <h3>${drafter}</h3>
      <table class="ref-table">
        <thead>
          <tr><th>Ref</th><th><span class="mini-card yellow"></span></th><th><span class="mini-card red"></span></th><th>Pts</th></tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr><td>Total</td><td>${totalY}</td><td>${totalR}</td><td>${totalP}</td></tr>
        </tfoot>
      </table>
    `;

    el.appendChild(list);
  }
}

// ---- tab switching ----
function setupTabs() {
  const buttons = document.querySelectorAll(".tab-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
    });
  });
}

setupTabs();
renderBracket();
renderPointsPanel();
renderRefLeaderboard();
renderRefs();
