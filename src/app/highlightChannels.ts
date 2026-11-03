export type HighlightSource = {
  handle?: string;      // the @name on the channel page, without the @
  wikipedia?: string;   // backup: Wikipedia page used to find the channel
  channelId?: string;   // a channel ID you are sure about
  query?: string;       // backup: search for the channel by name
  authorHint: string;   // lowercase words the real channel name must contain
};

const UEFA: HighlightSource[] = [{ handle: "UEFA", wikipedia: "UEFA", authorHint: "uefa" }];
const FIFA: HighlightSource[] = [{ handle: "FIFA", wikipedia: "FIFA", authorHint: "fifa" }];

export const HIGHLIGHT_CHANNELS: Record<string, HighlightSource[]> = {
  "Premier League": [{ channelId: "UCG5qGWdu8nIRZqJ_GgDwQ-w", handle: "PremierLeague", wikipedia: "Premier League", authorHint: "premier league" }],
  "LaLiga": [
    { handle: "LaLiga", wikipedia: "La Liga", authorHint: "laliga" },
    { query: "LALIGA TV", authorHint: "laliga tv" }
  ],
  "Serie A": [{ handle: "SerieA", wikipedia: "Serie A", authorHint: "serie a" }],
  "Bundesliga": [{ handle: "bundesliga", wikipedia: "Bundesliga", authorHint: "bundesliga" }],
  "Ligue 1": [{ handle: "Ligue1", wikipedia: "Ligue 1", authorHint: "ligue 1" }],

  // UEFA
  "UEFA Champions League": [...UEFA, { query: "UEFA Champions League", authorHint: "champions league" }],
  "UEFA Europa League": [...UEFA, { query: "UEFA Europa League", authorHint: "europa league" }],
  "UEFA Conference League": UEFA,
  "UEFA Super Cup": UEFA,
  "UEFA European Championship": UEFA,
  "Euro Qualifying": UEFA,
  "UEFA Nations League": UEFA,
  "Women's Euro": UEFA,
  "UEFA Women's Champions League": UEFA,
  "World Cup Qualifying (UEFA)": [...UEFA, ...FIFA],

  // FIFA
  "FIFA World Cup": FIFA,
  "Women's World Cup": FIFA,
  "FIFA Club World Cup": FIFA,
  "International Friendlies": FIFA,
  "World Cup Qualifying (CONMEBOL)": FIFA,
  "World Cup Qualifying (CONCACAF)": FIFA,
  "World Cup Qualifying (AFC)": FIFA,
  "World Cup Qualifying (CAF)": FIFA
};
