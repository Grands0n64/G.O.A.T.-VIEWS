"use client";

import { useRouter } from "next/navigation";
import MatchCentre from "./MatchCentre";

type Props = {
  id: string; league: string; home: string; away: string;
  homeScore: number | null; awayScore: number | null; status: string; venue: string | null;
};

export default function MatchPageClient(props: Props) {
  const router = useRouter();
  return <MatchCentre
    {...props}
    onClose={() => {
      // go back if the visitor came from your own site, otherwise go to the home page
      if (typeof document !== "undefined" && document.referrer.startsWith(window.location.origin)) router.back();
      else router.push("/");
    }}
  />;
}
