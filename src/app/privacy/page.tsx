import type { Metadata } from "next";
import InfoPage, { Section } from "../components/InfoPage";
import { CONTACT_EMAIL, LAST_UPDATED, SITE_NAME } from "../siteConfig";

export const metadata: Metadata = {
  title: "Privacy Policy – G.O.A.T. VIEWS",
  description: "How G.O.A.T. VIEWS handles information, cookies and advertising."
};

export default function Privacy() {
  return <InfoPage title="Privacy Policy" updated={LAST_UPDATED}>
    <p>This policy explains what information {SITE_NAME} ("we", "us") handles when you use this website.</p>
    <Section title="Information we collect">
      <p>You do not need an account to use {SITE_NAME}, and we do not ask you for your name or email address to view scores. Like any website, our hosting provider records technical information such as your IP address, browser type and the pages you visit in its server logs.</p>
      <p>We use your approximate country, worked out from your IP address, to show the broadcasters that apply where you are. We do not store it.</p>
    </Section>
    <Section title="Cookies and advertising">
      <p>We may show ads provided by Google AdSense and other advertising partners. These partners may use cookies and similar technologies to show ads based on your visits to this and other websites. You can manage personalised advertising at https://adssettings.google.com and read how Google uses data from sites that use its services at https://policies.google.com/technologies/ads.</p>
      <p>If you visit from the European Economic Area, the United Kingdom or Switzerland, you will be asked for your consent before personalised ads are shown, and you can change your choice later.</p>
    </Section>
    <Section title="Third-party content and links">
      <p>Match pages can include videos embedded from YouTube. When you play a video, YouTube may set cookies and collect data under Google's privacy policy (https://policies.google.com/privacy). Player photos are loaded from Wikipedia and TheSportsDB.</p>
      <p>Our "Where to watch" buttons link to other websites, some through affiliate links. Those sites have their own privacy policies, and we are not responsible for them. If you click an affiliate link, the other site may place a cookie so that it knows you came from us.</p>
    </Section>
    <Section title="Your rights">
      <p>Depending on where you live, you may have the right to ask what information we hold about you, to have it corrected or deleted, and to object to how it is used. To make a request, contact us{CONTACT_EMAIL ? <> at <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "#b5f34a" }}>{CONTACT_EMAIL}</a></> : " through the Contact page"}.</p>
    </Section>
    <Section title="Children">
      <p>{SITE_NAME} is not directed at children under 13, and we do not knowingly collect information from them.</p>
    </Section>
    <Section title="Changes to this policy">
      <p>We may update this policy from time to time. The date at the top shows when it was last changed.</p>
    </Section>
  </InfoPage>;
}
