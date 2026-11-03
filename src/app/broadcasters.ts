export type CountryCode = string;

const REGION_CODES = ["AD","AE","AF","AG","AI","AL","AM","AO","AQ","AR","AS","AT","AU","AW","AX","AZ","BA","BB","BD","BE","BF","BG","BH","BI","BJ","BL","BM","BN","BO","BQ","BR","BS","BT","BV","BW","BY","BZ","CA","CC","CD","CF","CG","CH","CI","CK","CL","CM","CN","CO","CR","CU","CV","CW","CX","CY","CZ","DE","DJ","DK","DM","DO","DZ","EC","EE","EG","EH","ER","ES","ET","FI","FJ","FK","FM","FO","FR","GA","GB","GD","GE","GF","GG","GH","GI","GL","GM","GN","GP","GQ","GR","GS","GT","GU","GW","GY","HK","HM","HN","HR","HT","HU","ID","IE","IL","IM","IN","IO","IQ","IR","IS","IT","JE","JM","JO","JP","KE","KG","KH","KI","KM","KN","KP","KR","KW","KY","KZ","LA","LB","LC","LI","LK","LR","LS","LT","LU","LV","LY","MA","MC","MD","ME","MF","MG","MH","MK","ML","MM","MN","MO","MP","MQ","MR","MS","MT","MU","MV","MW","MX","MY","MZ","NA","NC","NE","NF","NG","NI","NL","NO","NP","NR","NU","NZ","OM","PA","PE","PF","PG","PH","PK","PL","PM","PN","PR","PS","PT","PW","PY","QA","RE","RO","RS","RU","RW","SA","SB","SC","SD","SE","SG","SH","SI","SJ","SK","SL","SM","SN","SO","SR","SS","ST","SV","SX","SY","SZ","TC","TD","TF","TG","TH","TJ","TK","TL","TM","TN","TO","TR","TT","TV","TW","TZ","UA","UG","UM","US","UY","UZ","VA","VC","VE","VG","VI","VN","VU","WF","WS","YE","YT","ZA","ZM","ZW"];
const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
const flagFor = (code: string) => String.fromCodePoint(...[...code].map((char) => 127397 + char.charCodeAt(0)));

// Full country selector. Vercel's edge country header supplies the initial visitor location.
export const COUNTRIES: { code: CountryCode; name: string; flag: string }[] = REGION_CODES
  .map((code) => ({ code, name: regionNames.of(code) ?? code, flag: flagFor(code) }))
  .sort((a, b) => a.name.localeCompare(b.name));

export type Where = { name: string; url: string; note?: string; free?: boolean };

/* Add only affiliate URLs issued by the relevant broadcaster after approval. */
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
  apple: { name: "Apple TV", url: "https://tv.apple.com" },
  thmanyah: { name: "Thmanyah", url: "https://thmanyah.com" },
  fox: { name: "FOX Sports", url: "https://www.foxsports.com" },
  bbc: { name: "BBC Sport / iPlayer", url: "https://www.bbc.co.uk/sport" },
  itv: { name: "ITV / ITVX", url: "https://www.itv.com" },
  tsn: { name: "TSN", url: "https://www.tsn.ca" },
  newworld: { name: "New World TV", url: "https://newworldtv.com" },
  sbstv: { name: "SBS Australia", url: "https://www.sbs.com.au" },
  televisa: { name: "Televisa", url: "https://www.televisa.com" },
  telemundo: { name: "Telemundo", url: "https://www.telemundo.com" },
  fancode: { name: "FanCode", url: "https://www.fancode.com" },
  spotv: { name: "SPOTV", url: "https://www.spotv.net" },
  ten: { name: "Network 10", url: "https://10.com.au" }
} as const;

type Key = keyof typeof SERVICES;
const s = (key: Key, note?: string, free?: boolean): Where => ({ name: SERVICES[key].name, url: SERVICES[key].url, note, free });
type Table = Partial<Record<CountryCode, Where[]>>;

const apple: Table = {
  US: [s("apple", "Check the MLS schedule and local availability")],
  GB: [s("apple", "Check local MLS availability")],
  ES: [s("apple", "Check local MLS availability")],
  DE: [s("apple", "Check local MLS availability")],
  FR: [s("apple", "Check local MLS availability")],
  NG: [s("apple", "Check local MLS availability")]
};

// Country rights vary by season and match. These entries are the existing project mappings;
// they must be verified against current rights before being represented as guaranteed coverage.
export const BROADCASTERS: Record<string, Table> = {
  "Premier League": {
    US: [s("peacock", "Check match listing; coverage varies"), s("usaNetwork", "Selected matches"), s("nbc", "Selected matches", true)],
    GB: [s("sky", "Most live matches"), s("tnt", "Selected matches")], ES: [s("dazn")], DE: [s("skyDe")], FR: [s("canalplus")], NG: [s("supersport", "Check DStv or GOtv match listing")]
  },
  "LaLiga": {
    US: [s("espn", "Check match listing")], GB: [s("premier", "Check match listing"), s("disney", "Check match listing")], ES: [s("dazn"), s("movistar")], DE: [s("dazn")], FR: [s("bein")], NG: [s("supersport", "Check DStv or GOtv"), s("sportytv", "Check match listing"), s("startimes")]
  },
  "Serie A": {
    US: [s("paramount", "Check match listing"), s("cbs", "Selected coverage")], GB: [s("dazn", "Check match listing"), s("tnt", "Selected matches")], ES: [s("dazn")], DE: [s("dazn")], FR: [s("dazn")], NG: [s("sportytv", "Check match listing")]
  },
  "Bundesliga": {
    US: [s("fandango", "Check match listing"), s("usaNetwork", "Selected matches")], GB: [s("sky", "Check match listing")], ES: [s("dazn")], DE: [s("skyDe"), s("dazn")], FR: [s("bein")]
  },
  "Ligue 1": {
    US: [s("bein", "Check match listing"), s("tubi", "Check free match availability")], GB: [s("ligue1plus")], ES: [s("dazn"), s("tv5", "Check match listing")], DE: [s("dazn")], FR: [s("ligue1plus", "Check match listing")]
  },
  "UEFA Champions League": {
    US: [s("paramount", "Check match listing"), s("cbs", "Selected matches")], GB: [s("tnt", "Check match listing"), s("prime", "Selected matches")], ES: [s("movistar")], DE: [s("dazn"), s("prime", "Selected match"), s("zdf", "Highlights only", true)], FR: [s("canalplus")], NG: [s("supersport", "Check DStv, GOtv or Showmax")]
  },
  "MLS": apple,
  "Saudi Pro League": {
    SA: [s("thmanyah", "Official MENA rights holder")],
    NG: [s("espn", "SPL lists ESPN for Sub-Saharan Africa"), s("sportytv", "SPL lists SportyTV for Nigeria"), s("startimes", "Check current match listing")],
    GH: [s("espn", "SPL lists ESPN for Sub-Saharan Africa"), s("sportytv", "SPL lists SportyTV for Ghana")],
    ZA: [s("espn", "SPL lists ESPN for Sub-Saharan Africa"), s("sportytv")],
    US: [s("fox", "SPL international broadcast partner")],
    MX: [s("fox", "SPL international broadcast partner")],
    ES: [s("movistar")], FR: [s("dazn")], DE: [s("dazn")], AT: [s("dazn")], CH: [s("dazn")],
    IN: [s("fancode", "SPL lists FanCode")],
    JP: [s("spotv", "SPL lists SPOTV")],
    AU: [s("ten", "SPL lists Network 10 / Paramount+"), s("paramount", "Check local schedule")],
    AE: [s("thmanyah", "Official MENA rights holder")], QA: [s("thmanyah", "Official MENA rights holder")],
    EG: [s("thmanyah", "Official MENA rights holder")], MA: [s("thmanyah", "Official MENA rights holder")]
  },
  "FIFA World Cup": {
    NG: [s("newworld", "FIFA media-rights partner"), s("startimes", "FIFA media-rights partner"), s("supersport", "FIFA media-rights partner")],
    US: [s("fox", "English coverage"), s("telemundo", "Spanish coverage")],
    GB: [s("bbc", "Check BBC match schedule"), s("itv", "Check ITV match schedule")],
    CA: [s("tsn", "Check match schedule")],
    MX: [s("televisa", "Check local match schedule")],
    AU: [s("sbstv", "Check SBS match schedule")],
    SA: [s("bein", "FIFA rights vary by tournament and local schedule")],
    AE: [s("bein", "FIFA rights vary by tournament and local schedule")],
    QA: [s("bein", "FIFA rights vary by tournament and local schedule")],
    EG: [s("bein", "FIFA rights vary by tournament and local schedule")],
    MA: [s("bein", "FIFA rights vary by tournament and local schedule")]
  },
  "FIFA Club World Cup": {
    US: [s("fox", "Check tournament schedule")],
    NG: [s("newworld", "Check FIFA tournament schedule"), s("startimes"), s("supersport")],
    GB: [s("bbc", "Check tournament schedule"), s("itv", "Check tournament schedule")]
  },
  "FIFA Women's World Cup": {
    NG: [s("newworld", "Check tournament schedule"), s("startimes"), s("supersport")],
    US: [s("fox", "Check tournament schedule")],
    GB: [s("bbc", "Check tournament schedule"), s("itv", "Check tournament schedule")],
    AU: [s("sbstv", "Check tournament schedule")]
  },
};
