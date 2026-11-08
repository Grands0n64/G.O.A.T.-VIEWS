import Link from "next/link";

export const metadata = {
  title: "G.O.A.T. VIEWS — Follow Live Football",
  description: "Live scores, fixtures, match updates and more. Free on G.O.A.T. VIEWS.",
};

export default function PromoPage() {
  return (
    <main className="promo-shell">
      <Link
        href="/"
        aria-label="Open G.O.A.T. VIEWS"
        className="promo-link"
      >
        {/* Place the supplied poster at public/goat-views-promo.jpeg. */}
        <img
          src="/goat-views-promo.jpeg"
          alt="G.O.A.T. VIEWS — Follow live football, scores, fixtures and match updates. Completely free."
          className="promo-poster"
        />
      </Link>
      <style>{`
        * { box-sizing: border-box; }
        html, body { margin: 0; min-height: 100%; background: #020702; }
        .promo-shell { min-height: 100svh; display: flex; justify-content: center; align-items: flex-start; background: #020702; }
        .promo-link { display: block; width: min(100%, 900px); cursor: pointer; line-height: 0; }
        .promo-poster { display: block; width: 100%; height: auto; }
        @media (min-width: 901px) {
          .promo-shell { align-items: center; padding: 18px; }
          .promo-link { width: min(100%, 760px); box-shadow: 0 0 50px rgba(0,255,55,.2); }
        }
      `}</style>
    </main>
  );
}
