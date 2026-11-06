import type { Metadata } from "next";
import InfoPage, { Section } from "../components/InfoPage";
import { LAST_UPDATED, SITE_NAME } from "../siteConfig";

export const metadata: Metadata = {
  title: "Terms of Use – G.O.A.T. VIEWS",
  description: "The terms for using G.O.A.T. VIEWS."
};

export default function Terms() {
  return <InfoPage title="Terms of Use" updated={LAST_UPDATED}>
    <p>Welcome to {SITE_NAME}. By creating an account or using our services, you agree to these terms.</p>
    <Section title="Your account">
      <p>You are responsible for keeping your account details secure and for activity carried out through your account. Please provide accurate information and notify us if you believe your account has been accessed without permission.</p>
    </Section>
    <Section title="Using the platform">
      <p>Please use {SITE_NAME} lawfully and respectfully. You must not misuse the service, interfere with its operation, attempt unauthorised access or use the platform to harm others.</p>
    </Section>
    <Section title="Our services">
      <p>{SITE_NAME} brings sports information and features together to help fans follow the games, teams and competitions they care about. We may improve or update the platform as it develops.</p>
    </Section>
    <Section title="Ownership">
      <p>The {SITE_NAME} name, design and original materials are protected by applicable intellectual property laws. You may not copy or commercially use our original materials without permission.</p>
    </Section>
    <Section title="Access to the platform">
      <p>We aim to provide a reliable service and may carry out updates or maintenance when needed. We may restrict or suspend access where these terms are breached or where necessary to protect the platform and its users.</p>
    </Section>
    <Section title="Changes to these terms">
      <p>We may update these terms from time to time. The latest version will be published on this page.</p>
    </Section>
  </InfoPage>;
}
