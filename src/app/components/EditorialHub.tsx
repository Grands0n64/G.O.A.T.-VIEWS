"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, RefreshCw, Newspaper, ArrowLeftRight } from "lucide-react";

type Article = { title: string; url: string; publishedAt: string; source: string; summary: string };
type Feed = { items: Article[]; error?: string };

export default function EditorialHub() {
  const [tab, setTab] = useState<"news" | "transfers">("news");
  const [feed, setFeed] = useState<Feed>({ items: [] });
  const [loading, setLoading] = useState(true);

  async function load(kind = tab) {
    setLoading(true);
    try {
      const response = await fetch("/api/editorial?type=" + kind, { cache: "no-store" });
      const data = await response.json();
      setFeed({ items: Array.isArray(data.items) ? data.items : [], error: data.error });
    } catch {
      setFeed({ items: [], error: "Headlines could not be loaded. Please try again." });
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(tab); }, [tab]);

  return <section className="panel editorial-hub" id="stories">
    <div className="sectiontitle">
      <div><h2>Sports Desk</h2><p>Latest headlines and transfer updates from sports publishers.</p></div>
      <button className="round" onClick={() => void load()} aria-label="Refresh headlines"><RefreshCw size={16}/></button>
    </div>
    <div className="editorial-tabs" role="tablist" aria-label="Sports desk sections">
      <button role="tab" aria-selected={tab === "news"} className={tab === "news" ? "active" : ""} onClick={() => setTab("news")}><Newspaper size={15}/> Sports News</button>
      <button role="tab" aria-selected={tab === "transfers"} className={tab === "transfers" ? "active" : ""} onClick={() => setTab("transfers")}><ArrowLeftRight size={15}/> Transfer Market</button>
    </div>
    {tab === "transfers" && <p className="editorial-note">Transfer reports include rumours and confirmed-deal coverage from publishers. A report is not treated as an official confirmation unless the club or league confirms it.</p>}
    {loading ? <div className="empty">Loading {tab === "news" ? "sports news" : "transfer updates"}…</div>
      : feed.items.length ? <div className="editorial-list">{feed.items.map((item, index) => <article className="editorial-item" key={item.url || index}>
        <div><span className="editorial-source">{item.source}</span><h3>{item.title}</h3><time>{item.publishedAt ? new Date(item.publishedAt).toLocaleString() : "Recently published"}</time></div>
        <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label={"Read " + item.title}>Read story <ArrowUpRight size={15}/></a>
      </article>)}</div>
      : <div className="empty">{feed.error || "No headlines are available right now."}</div>}
    <p className="editorial-foot">Headlines are attributed to their publishers. Full articles open at the original publisher.</p>
  </section>;
}
