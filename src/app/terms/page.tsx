import type { Metadata } from "next";
import InfoPage, { Section } from "../components/InfoPage";
import { LAST_UPDATED, SITE_NAME } from "../siteConfig";

export const metadata: Metadata = {
  title: "Terms of Use – G.O.A.T. VIEWS",
  description: "The terms for using G.O.A.T. VIEWS."
};

export default function Terms() {
  return <InfoPage title="Terms of Use" updated={LAST_UPDATED}>
    <p>By using {SITE_NAME} you agree to these terms.</p>
    <Section title="Information only">
      <p>Scores, lineups, statistics, ratings, commentary and broadcaster details are provided for general information. They can be delayed, incomplete or wrong. Please do not rely on them for betting, financial or any other important decision. Always check the official source.</p>
    </Section>
    <Section title="Third-party content and links">
      <p>We link to and embed content from other websites, including YouTube and broadcasters. We do not control that content and are not responsible for it. Streaming services mentioned on this site are separate companies with their own terms and prices.</p>
    </Section>
    <Section title="Affiliate links">
      <p>Some links on this site are affiliate links. If you sign up through them we may earn a commission at no extra cost to you.</p>
    </Section>
    <Section title="Trademarks">
      <p>Names, logos and trademarks of leagues, clubs, federations and broadcasters belong to their owners. {SITE_NAME} is independent and is not affiliated with or endorsed by them.</p>
    </Section>
    <Section title="No warranty and limit of liability">
      <p>The site is provided "as is" without promises that it will always be available or error free. To the extent the law allows, we are not liable for any loss that comes from using the site.</p>
    </Section>
    <Section title="Changes">
      <p>We may change these terms or the site at any time. Continuing to use the site means you accept the updated terms.</p>
    </Section>
  </InfoPage>;
}
