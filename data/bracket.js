// Points awarded to a team's drafter for *winning* a match in that round.
const ROUND_POINTS = { R32: 1, R16: 2, QF: 3, SF: 4, F: 5 };

const ROUND_LABELS = {
  R32: "Round of 32",
  R16: "Round of 16",
  QF: "Quarterfinal",
  SF: "Semifinal",
  F: "Final",
};

const ROUND_ORDER = ["R32", "R16", "QF", "SF", "F"];

// Each match has two slots. A slot is either a literal team name (R32 only)
// or { from: matchId } meaning "winner of that earlier match".
const MATCHES = [
  // Round of 32
  { id: "R32-01", round: "R32", slots: ["South Africa", "Canada"] },
  { id: "R32-02", round: "R32", slots: ["Brazil", "Japan"] },
  { id: "R32-03", round: "R32", slots: ["Germany", "Paraguay"] },
  { id: "R32-04", round: "R32", slots: ["Netherlands", "Morocco"] },
  { id: "R32-05", round: "R32", slots: ["Ivory Coast", "Norway"] },
  { id: "R32-06", round: "R32", slots: ["France", "Sweden"] },
  { id: "R32-07", round: "R32", slots: ["Mexico", "Ecuador"] },
  { id: "R32-08", round: "R32", slots: ["England", "DR Congo"] },
  { id: "R32-09", round: "R32", slots: ["Belgium", "Senegal"] },
  { id: "R32-10", round: "R32", slots: ["United States", "Bosnia and Herzegovina"] },
  { id: "R32-11", round: "R32", slots: ["Spain", "Austria"] },
  { id: "R32-12", round: "R32", slots: ["Portugal", "Croatia"] },
  { id: "R32-13", round: "R32", slots: ["Switzerland", "Algeria"] },
  { id: "R32-14", round: "R32", slots: ["Australia", "Egypt"] },
  { id: "R32-15", round: "R32", slots: ["Argentina", "Cape Verde"] },
  { id: "R32-16", round: "R32", slots: ["Colombia", "Ghana"] },

  // Round of 16
  { id: "R16-01", round: "R16", slots: [{ from: "R32-01" }, { from: "R32-04" }] },
  { id: "R16-02", round: "R16", slots: [{ from: "R32-03" }, { from: "R32-06" }] },
  { id: "R16-03", round: "R16", slots: [{ from: "R32-02" }, { from: "R32-05" }] },
  { id: "R16-04", round: "R16", slots: [{ from: "R32-07" }, { from: "R32-08" }] },
  { id: "R16-05", round: "R16", slots: [{ from: "R32-12" }, { from: "R32-11" }] },
  { id: "R16-06", round: "R16", slots: [{ from: "R32-10" }, { from: "R32-09" }] },
  { id: "R16-07", round: "R16", slots: [{ from: "R32-15" }, { from: "R32-14" }] },
  { id: "R16-08", round: "R16", slots: [{ from: "R32-13" }, { from: "R32-16" }] },

  // Quarterfinals
  { id: "QF-01", round: "QF", slots: [{ from: "R16-01" }, { from: "R16-02" }] },
  { id: "QF-02", round: "QF", slots: [{ from: "R16-05" }, { from: "R16-06" }] },
  { id: "QF-03", round: "QF", slots: [{ from: "R16-03" }, { from: "R16-04" }] },
  { id: "QF-04", round: "QF", slots: [{ from: "R16-07" }, { from: "R16-08" }] },

  // Semifinals
  { id: "SF-01", round: "SF", slots: [{ from: "QF-01" }, { from: "QF-02" }] },
  { id: "SF-02", round: "SF", slots: [{ from: "QF-03" }, { from: "QF-04" }] },

  // Final
  { id: "F-01", round: "F", slots: [{ from: "SF-01" }, { from: "SF-02" }] },
];

// Hand-edit this as results come in: matchId -> winning team name.
// e.g. RESULTS["R32-01"] = "South Africa";
const RESULTS = {
  "R32-01": "Canada",
  "R32-02": "Brazil",
  "R32-03": "Paraguay",
  "R32-04": "Morocco",
  "R32-05": "Norway",
  "R32-06": "France",
  "R32-07": "Mexico",
  "R32-08": "England",
  "R32-09": "Belgium",
  "R32-10": "United States",
  "R32-11": "Spain",
  "R32-12": "Portugal",
  "R32-13": "Switzerland",
  "R32-14": "Egypt",
  "R32-15": "Argentina",
  "R32-16": "Colombia",

  "R16-01": "Morocco",
  "R16-02": "France",
  "R16-03": "Norway",
  "R16-04": "England",
  "R16-05": "Spain",
  "R16-06": "Belgium",
};

// Per-match, per-team stats. goals = full-time score; yellows/reds = cards
// that THIS team's players received in the match. Hand-edit as results come in.
// Keep in sync with REFS: a match's two teams' card counts here must equal the
// cards added to that match's referee in data/refs.js.
const MATCH_STATS = {
  "R32-01": {
    "South Africa": { goals: 0, yellows: 0, reds: 0 },
    "Canada":       { goals: 1, yellows: 2, reds: 0 },
  },
  "R32-02": {
    "Brazil": { goals: 2, yellows: 2, reds: 0 },
    "Japan":  { goals: 1, yellows: 3, reds: 0 },
  },
  "R32-03": {
    "Germany":  { goals: 1, yellows: 2, reds: 0 },
    "Paraguay": { goals: 1, yellows: 2, reds: 0 },
  },
  "R32-04": {
    "Netherlands": { goals: 1, yellows: 0, reds: 0 },
    "Morocco":      { goals: 1, yellows: 1, reds: 0 },
  },
  "R32-05": {
    "Ivory Coast": { goals: 1, yellows: 0, reds: 0 },
    "Norway":      { goals: 2, yellows: 1, reds: 0 },
  },
  "R32-06": {
    "France": { goals: 3, yellows: 0, reds: 0 },
    "Sweden": { goals: 0, yellows: 0, reds: 0 },
  },
  "R32-07": {
    "Mexico":  { goals: 2, yellows: 0, reds: 0 },
    "Ecuador": { goals: 0, yellows: 3, reds: 1 },
  },
  "R32-08": {
    "England":  { goals: 2, yellows: 1, reds: 0 },
    "DR Congo": { goals: 1, yellows: 1, reds: 0 },
  },
  "R32-09": {
    "Belgium": { goals: 3, yellows: 1, reds: 0 },
    "Senegal": { goals: 2, yellows: 1, reds: 0 },
  },
  "R32-10": {
    "United States":          { goals: 2, yellows: 0, reds: 1 },
    "Bosnia and Herzegovina": { goals: 0, yellows: 1, reds: 0 },
  },
  "R32-11": {
    "Spain":   { goals: 3, yellows: 0, reds: 0 },
    "Austria": { goals: 0, yellows: 1, reds: 0 },
  },
  "R32-12": {
    "Portugal": { goals: 2, yellows: 1, reds: 0 },
    "Croatia":  { goals: 1, yellows: 2, reds: 0 },
  },
  "R32-13": {
    "Switzerland": { goals: 2, yellows: 0, reds: 0 },
    "Algeria":     { goals: 0, yellows: 2, reds: 0 },
  },
  "R32-14": {
    "Australia": { goals: 1, yellows: 0, reds: 0 },
    "Egypt":     { goals: 1, yellows: 2, reds: 0 },
  },
  "R32-15": {
    "Argentina":  { goals: 3, yellows: 1, reds: 0 },
    "Cape Verde": { goals: 2, yellows: 1, reds: 0 },
  },
  "R32-16": {
    "Colombia": { goals: 1, yellows: 2, reds: 0 },
    "Ghana":    { goals: 0, yellows: 3, reds: 0 },
  },

  "R16-01": {
    "Morocco": { goals: 3, yellows: 4, reds: 0 },
    "Canada":  { goals: 0, yellows: 4, reds: 0 },
  },
  "R16-02": {
    "Paraguay": { goals: 0, yellows: 0, reds: 0 },
    "France":   { goals: 1, yellows: 3, reds: 0 },
  },
  "R16-03": {
    "Brazil": { goals: 1, yellows: 1, reds: 0 },
    "Norway": { goals: 2, yellows: 0, reds: 0 },
  },
  "R16-04": {
    "Mexico":  { goals: 2, yellows: 2, reds: 0 },
    "England": { goals: 3, yellows: 4, reds: 1 },
  },
  "R16-05": {
    "Portugal": { goals: 0, yellows: 2, reds: 0 },
    "Spain":    { goals: 1, yellows: 1, reds: 0 },
  },
  "R16-06": {
    "United States": { goals: 1, yellows: 2, reds: 0 },
    "Belgium":        { goals: 4, yellows: 0, reds: 0 },
  },
};
