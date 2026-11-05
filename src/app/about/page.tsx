import type { Metadata } from "next";
import InfoPage from "../components/InfoPage";
import { SITE_NAME } from "../siteConfig";

export const metadata: Metadata = {
  title: "About G.O.A.T. VIEWS",
  description: "Discover G.O.A.T. VIEWS, your destination for sports scores, fixtures and match coverage."
};

export default function About() {
  return (
    <InfoPage title={`About ${SITE_NAME}`}>
      <p>{SITE_NAME} brings the world of sports together in one place. Follow the matches, teams and competitions you care about, keep up with the action, and stay connected to every moment of the game.</p>
      <p>Our goal is simple: make following sports easier, clearer and more engaging for fans everywhere.</p>
    </InfoPage>
  );
}
