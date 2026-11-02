export type HighlightSource = {
  handle?: string;      // the @name on the channel page, without the @
  wikipedia?: string;   // backup: Wikipedia page used to find the channel
  channelId?: string;   // optional: a channel ID you pasted in by hand
  authorHint: string;   // lowercase word the real channel name must contain
};

export const HIGHLIGHT_CHANNELS: Record<string, HighlightSource[]> = {
  "Premier League": [{ channelId: "UCG5qGWdu8nIRZqJ_GgDwQ-w", handle: "PremierLeague", wikipedia: "Premier League", authorHint: "premier league" }],
  "LaLiga": [{ handle: "LaLiga", wikipedia: "La Liga", authorHint: "laliga" }, { handle: "daznfootball", authorHint: "dazn" }, { handle: "skysportsfootball", authorHint: "sky sports" }],
  "Serie A": [{ handle: "SerieA", wikipedia: "Serie A", authorHint: "serie a" }],
  "Bundesliga": [{ handle: "bundesliga", wikipedia: "Bundesliga", authorHint: "bundesliga" }],
  "Ligue 1": [{ handle: "Ligue1", wikipedia: "Ligue 1", authorHint: "ligue 1" }],
  "UEFA Champions League": [{ handle: "UEFA", wikipedia: "UEFA", authorHint: "uefa" }],
  "UEFA Europa League": [{ handle: "UEFA", wikipedia: "UEFA", authorHint: "uefa" }],
  "UEFA Conference League": [{ handle: "UEFA", wikipedia: "UEFA", authorHint: "uefa" }],
  "FIFA": [{ handle: "FIFA", wikipedia: "FIFA", authorHint: "fifa" }, { handle: "daznfootball", authorHint: "dazn" }],
  "UEFA": [{ handle: "UEFA", wikipedia: "UEFA", authorHint: "uefa" }]
};
