import type { Metadata } from "next";
import InfoPage, { Section } from "../components/InfoPage";
import { SITE_NAME } from "../siteConfig";

export const metadata: Metadata = {
  title: "About G.O.A.T. VIEWS",
  description: "G.O.A.T. VIEWS gives you live football scores, lineups, player ratings, commentary, highlights and where to watch, for leagues around the world."
};

export default function About() {
  return <InfoPage title={`About ${SITE_NAME}`}>
    <p>{SITE_NAME} is a football and sports scores site. For each match you can see the live score, lineups on a pitch, player ratings, team statistics, live text commentary, team form, official highlights, and where to watch it in your country.</p>
    <Section title="Where our information comes from">
      <p>Scores, lineups, statistics and commentary come from publicly available sports data feeds. Player photos and details come from Wikipedia and TheSportsDB. Highlights are official videos from the leagues' own YouTube channels, played through YouTube's embedded player. Player ratings are calculated by {SITE_NAME} from match statistics and are not official ratings.</p>
      <p>Data can be delayed or occasionally wrong. If you spot a mistake, please tell us through the Contact page.</p>
    </Section>
    <Section title="Where to watch">
      <p>We do not stream matches. Our "Where to watch" boxes list the official broadcasters and send you to their own websites and apps. Some of these links may be affiliate links, which means we may earn a commission if you sign up, at no extra cost to you.</p>
    </Section>
    <Section title="Independence">
      <p>{SITE_NAME} is an independent site. It is not affiliated with, endorsed by, or connected to any league, club, federation or broadcaster. Team names and logos belong to their owners.</p>
    </Section>
  </InfoPage>;
}
