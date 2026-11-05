export type CountryCode = "US" | "GB" | "ES" | "DE" | "FR" | "NG";

export const COUNTRIES: { code: CountryCode; name: string; flag: string }[] = [
  { code: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "US", name: "USA", flag: "🇺🇸" },
  { code: "GB", name: "UK", flag: "🇬🇧" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" }
];

export type Where = { name: string; url: string; note?: string; free?: boolean };

/* Your affiliate links. When a service gives you one, paste it here, for example:
   "DAZN": "https://your-affiliate-link-from-dazn",
   The buttons will then use your link instead of the plain site. */
export const AFFILIATE: Record<string, string> = {};

const SERVICES = {
  peacock: { name: "Peacock", url: "https://www.peacocktv.com" },
  usaNetwork: { name: "USA Network", url: "https://www.usanetwork.com" },
  nbc: { name: "NBC", url: "https://www.nbcsports.com" },
  sky: { name: "Sky Sports", url: "https://www.sky.com" },
  skyDe: { name: "Sky Deutschland", url: "https://www.sky.de" },
  tnt: { name: "TNT Sports", url: "https://www.tntsports.co.uk" },
  paramount: { name: "Paramount+", url: "https://www.paramountplus.com" },
  cbs: { name: "CBS Sports", url: "https://www.cbssports.com" },
  prime: { name: "Prime Video", url: "https://www.primevideo.com" },
  espn: { name: "ESPN", url: "https://www.espn.com" },
  dazn: { name: "DAZN", url: "https://www.dazn.com" },
  movistar: { name: "Movistar+", url: "https://www.movistarplus.es" },
  canalplus: { name: "Canal+", url: "https://www.canalplus.com" },
  bein: { name: "beIN SPORTS", url: "https://www.beinsports.com" },
  ligue1plus: { name: "Ligue 1+", url: "https://www.ligue1.com" },
  supersport: { name: "SuperSport", url: "https://supersport.com" },
  sportytv: { name: "SportyTV", url: "https://sportytv.com" },
  startimes: { name: "StarTimes", url: "https://www.startimes.com" },
  premier: { name: "Premier Sports", url: "https://www.premiersports.com" },
  disney: { name: "Disney+", url: "https://www.disneyplus.com" },
  fandango: { name: "Fandango", url: "https://www.fandango.com" },
  tubi: { name: "Tubi", url: "https://tubitv.com" },
  tv5: { name: "TV5MONDEplus", url: "https://www.tv5mondeplus.com" },
  zdf: { name: "ZDF", url: "https://www.zdf.de" },
  apple: { name: "Apple TV", url: "https://tv.apple.com" }
} as const;

type Key = keyof typeof SERVICES;
const s = (key: Key, note?: string, free?: boolean): Where => ({ name: SERVICES[key].name, url: SERVICES[key].url, note, free });

type Table = Partial<Record<CountryCode, Where[]>>;

const apple: Table = {
  US: [s("apple", "All matches")], GB: [s("apple", "All matches")], ES: [s("apple", "All matches")],
  DE: [s("apple", "All matches")], FR: [s("apple", "All matches")], NG: [s("apple", "All matches")]
};

// keys must match the league names in leagues.ts. Rights change every season: check them each August.
export const BROADCASTERS: Record<string, Table> = {
  "Saudi Pro League": {
    NG: [
      s("espn", "Check the current ESPN Africa match schedule"),
      s("sportytv", "Check the SportyTV match listing"),
      s("startimes", "Check the StarTimes live sports schedule")
    ],
    US: [s("espn", "Check current ESPN listings")],
    GB: [s("dazn", "Check current DAZN listings")],
    ES: [s("dazn", "Check current DAZN listings")],
    DE: [s("dazn", "Check current DAZN listings")],
    FR: [s("dazn", "Check current DAZN listings")]
  },
  "Premier League": {
    US: [s("peacock", "Every match, with NBC and USA Network"), s("usaNetwork", "Selected matches"), s("nbc", "Selected matches, free over the air", true)],
    GB: [s("sky", "Most live matches"), s("tnt", "Selected matches, shown on HBO Max")],
    ES: [s("dazn")],
    DE: [s("skyDe")],
    FR: [s("canalplus")],
    NG: [s("supersport", "DStv: SuperSport Premier League (usually ch 223) or Football Plus (ch 222) · GOtv: SuperSport Football")]
  },
  "LaLiga": {
    US: [s("espn", "Every match on ESPN Select, selected matches on ESPN and ABC")],
    GB: [s("premier", "Most matches"), s("disney", "One Saturday-night match a week")],
    ES: [s("dazn"), s("movistar")],
    DE: [s("dazn")],
    FR: [s("bein")],
    NG: [s("supersport", "Live on SuperSport channels via DStv or GOtv"), s("sportytv", "One match per round, free", true), s("startimes")]
  },
  "Serie A": {
    US: [s("paramount", "Every match"), s("cbs", "Selected matches on the free Golazo Network", true)],
    GB: [s("dazn", "Most matches"), s("tnt", "Selected matches")],
    ES: [s("dazn")],
    DE: [s("dazn")],
    FR: [s("dazn")],
    NG: [s("sportytv", "One match per week, free", true)]
  },
  "Bundesliga": {
    US: [s("fandango", "Most matches, free with ads", true), s("usaNetwork", "Marquee matches")],
    GB: [s("sky", "Selected matches")],
    ES: [s("dazn")],
    DE: [s("skyDe"), s("dazn")],
    FR: [s("bein")]
  },
  "Ligue 1": {
    US: [s("bein", "Several matches every round"), s("tubi", "Selected matches, free", true)],
    GB: [s("ligue1plus")],
    ES: [s("dazn"), s("tv5", "One match per round, free", true)],
    DE: [s("dazn")],
    FR: [s("ligue1plus", "Every match, also sold through DAZN")],
    NG: [s("supersport", "Up to three matches a week, live on SuperSport")]
  },
  "UEFA Champions League": {
    NG: [s("supersport", "DStv: SuperSport Football Plus (usually ch 222) · GOtv: SuperSport Football (usually ch 61) · Streaming: DStv Stream or Showmax")],
    US: [s("paramount", "Every match"), s("cbs", "Selected matches")],
    GB: [s("tnt", "Selected matches, shown on HBO Max"), s("prime", "Selected matches")],
    ES: [s("movistar")],
    DE: [s("dazn"), s("prime", "One match per matchday"), s("zdf", "Highlights only", true)],
    FR: [s("canalplus")]
  },
  "UEFA Europa League": {
    NG: [s("supersport", "Live on SuperSport channels via DStv or GOtv")]
  },
  "UEFA Conference League": {
    NG: [s("supersport", "Live on SuperSport channels via DStv or GOtv")]
  },
  "UEFA Nations League": {
    NG: [s("supersport", "Most important matches, live on SuperSport")]
  },
  "MLS": apple
};
