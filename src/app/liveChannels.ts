import type { CountryCode } from "./broadcasters";

export type LiveChannel = {
  name: string;
  channelId: string;      // starts with UC, copied from the channel's "Share channel" menu
  leagues: string[];      // league names exactly as in leagues.ts
  countries?: CountryCode[]; // leave out if the stream works worldwide
  note?: string;
};

// Only add OFFICIAL channels (the league, club or federation that owns the matches).
// Example, with the ID replaced by the real one you copied:
//   { name: "Women's Super League", channelId: "UCxxxxxxxxxxxxxxxxxxxxxx", leagues: ["Women's Super League"], countries: ["GB"], note: "Free live matches in the UK and Ireland" },
export const LIVE_CHANNELS: LiveChannel[] = [];
