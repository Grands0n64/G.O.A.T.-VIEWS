import { LEAGUES, type League } from "./leagues";

export const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function leagueFromSlug(slug: string): League | undefined {
  return LEAGUES.find((item) => slugify(item.league) === slug);
}

// the web address of a match page
export function matchPath(match: { id: string; league: string; home: string; away: string }) {
  return `/match/${slugify(match.league)}/${match.id}-${slugify(match.home)}-vs-${slugify(match.away)}`;
}
