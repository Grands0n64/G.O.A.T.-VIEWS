export type HighlightSource = {
  wikipedia: string;   // Wikipedia page used to find the channel
  authorHint: string;  // lowercase word the real channel name must contain
  channelId?: string;  // optional: paste the channel ID here if one is not found automatically
};

export const HIGHLIGHT_CHANNELS: Record<string, HighlightSource[]> = {
  "Premier League": [{ wikipedia: "Premier League", authorHint: "premier league" }],
  "LaLiga": [{ wikipedia: "La Liga", authorHint: "laliga" }],
  "Serie A": [{ wikipedia: "Serie A", authorHint: "serie a" }],
  "Bundesliga": [{ wikipedia: "Bundesliga", authorHint: "bundesliga" }],
  "Ligue 1": [{ wikipedia: "Ligue 1", authorHint: "ligue 1" }],
  "UEFA Champions League": [{ wikipedia: "UEFA", authorHint: "uefa" }],
  "UEFA Europa League": [{ wikipedia: "UEFA", authorHint: "uefa" }],
  "UEFA Conference League": [{ wikipedia: "UEFA", authorHint: "uefa" }]
};
