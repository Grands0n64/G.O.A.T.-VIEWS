export type LiveChannel = {
  name: string;
  leagues: string[];     // league names exactly as in leagues.ts
  handle?: string;       // the @name on the channel page, without the @
  channelId?: string;    // a channel ID you are sure about
  query?: string;        // used to search for the channel when no handle is known
  hints: string[];       // lowercase words the real channel name must contain (not needed with channelId)
  note?: string;
};

// Only OFFICIAL channels: the league or its official broadcaster. Never re-stream channels.
export const LIVE_CHANNELS: LiveChannel[] = [
  { name: "Barclays WSL", leagues: ["Women's Super League"], query: "Barclays Women's Super League", hints: ["wsl", "super league"] },
  { name: "DAZN Women's Football", leagues: ["UEFA Women's Champions League", "Liga F"], channelId: "UCxgii5f9u4YgXCeubCozbEA", hints: [] },
  { name: "Canal GOAT", leagues: ["Copa Libertadores", "Copa Sudamericana"], query: "Canal GOAT", hints: ["canal goat", "canalgoat"] },
  { name: "CazéTV", leagues: ["Brazil Serie A"], handle: "CazeTV", hints: ["caz"] }
];
