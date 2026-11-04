import type { Metadata } from "next";
import InfoPage, { Section } from "../components/InfoPage";
import { CONTACT_EMAIL, SITE_NAME } from "../siteConfig";

export const metadata: Metadata = {
  title: "Contact – G.O.A.T. VIEWS",
  description: "Get in touch with G.O.A.T. VIEWS."
};

export default function Contact() {
  return <InfoPage title="Contact us">
    <p>Found a wrong score, a broken link, or want to work with {SITE_NAME}? Send us a message.</p>
    <Section title="Email">
      {CONTACT_EMAIL
        ? <p><a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "#b5f34a", fontWeight: 700 }}>{CONTACT_EMAIL}</a></p>
        : <p>Our contact email is being set up. Please check back soon.</p>}
    </Section>
    <Section title="Reporting a problem">
      <p>Please tell us which match or page it was and what looked wrong, and we will look into it.</p>
    </Section>
  </InfoPage>;
}
