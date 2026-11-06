import type { Metadata } from "next";
import InfoPage, { Section } from "../components/InfoPage";

export const metadata: Metadata = {
  title: "Privacy Policy – G.O.A.T. VIEWS",
  description: "The privacy policy for G.O.A.T. VIEWS."
};

export default function Privacy() {
  return (
    <InfoPage title="Privacy Policy" updated="November 6, 2026">
      <p>G.O.A.T. VIEWS respects your privacy. This policy explains how personal information is handled when you use our website and services.</p>
      <Section title="Information you provide">
        <p>When you create an account or contact us, you may provide information such as your email address and the details of your message. We use this information to provide our services, manage your account and respond to your enquiries.</p>
      </Section>
      <Section title="How we use information">
        <p>We use relevant information to operate and improve G.O.A.T. VIEWS, maintain account security, provide support and meet our legal obligations.</p>
      </Section>
      <Section title="Website preferences">
        <p>Our website may use cookies and similar technologies to support essential features, remember preferences and improve your experience. You can manage cookies through your browser settings.</p>
      </Section>
      <Section title="Your information and choices">
        <p>You may contact us to ask about the personal information associated with your account or to request that it be corrected or deleted, subject to applicable legal requirements.</p>
        <p>For privacy enquiries, email <a href="mailto:g.o.a.t.views.offical@gmail.com" style={{ color: "#b5f34a" }}>g.o.a.t.views.offical@gmail.com</a>.</p>
      </Section>
      <Section title="Keeping information secure">
        <p>We take reasonable steps to protect personal information and retain it only for as long as it is needed for legitimate service or legal purposes.</p>
      </Section>
      <Section title="Children's privacy">
        <p>G.O.A.T. VIEWS is not intended for children under 13. We do not knowingly collect personal information from children under 13.</p>
      </Section>
      <Section title="Updates to this policy">
        <p>We may update this policy from time to time. The latest version will be published on this page.</p>
      </Section>
    </InfoPage>
  );
}
