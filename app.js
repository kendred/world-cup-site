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
        slotEl.appendChild(drafterEl);
        box.appendChild(slotEl);
      });

      col.appendChild(box);
    }

    el.appendChild(col);
  }
}

// ---- points panel rendering ----
function renderPointsPanel() {
  const el = document.getElementById("points-panel");
  el.innerHTML = "";

  for (const drafter of DRAFTERS) {
    const teams = TEAMS.filter((t) => t.drafter === drafter);
    const card = document.createElement("div");
    card.className = "drafter-card";

    let drafterTotal = 0;

    const rows = teams
      .map((team) => {
        const status = computeTeamStatus(team.name);
        drafterTotal += status.points;

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
            <span>${status.points} pt${status.points === 1 ? "" : "s"}</span>
          </div>`;
      })
      .join("");

    card.innerHTML = `
      <h3><span>${drafter}</span><span class="total">${drafterTotal} pts</span></h3>
      ${rows}
    `;

    el.appendChild(card);
  }
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
          <tr><th>Ref</th><th>Y</th><th>R</th><th>Pts</th></tr>
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
renderRefs();
