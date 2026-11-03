"use client";
import {useEffect,useState} from "react";
import {ArrowLeft,ArrowUpRight,Clock3,ExternalLink,BookOpen} from "lucide-react";
type Article={title:string;description:string;image:string;author:string;publishedAt:string;caption:string;site:string;url:string};
export default function ArticleReader({url}:{url:string}){
 const [article,setArticle]=useState<Article|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;fetch("/api/editorial/article?url="+encodeURIComponent(url)).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"Unable to load this story.");return d;}).then(d=>{if(active)setArticle(d);}).catch(e=>{if(active)setError(e instanceof Error?e.message:"Unable to load story.");}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[url]);
 return <main className="reader-page">
  <header className="reader-top"><a href="/sports-news" className="reader-brand">G.O.A.T. <b>VIEWS</b></a><a href="/sports-news" className="reader-back"><ArrowLeft size={16}/> Back to news</a></header>
  {loading?<div className="reader-state">Opening article…</div>:error?<div className="reader-state"><p>{error}</p><a href="/sports-news">Return to Sports News</a></div>:article&&<article className="reader-article">
   <div className="reader-kicker">G.O.A.T. VIEWS <span>·</span> {article.site}</div>
   <h1>{article.title}</h1>
   {article.image&&<figure className="reader-figure"><img src={article.image} alt={article.caption||article.title}/>{article.caption&&<figcaption>{article.caption}</figcaption>}</figure>}
   {article.description&&<p className="reader-standfirst">{article.description}</p>}
   <div className="reader-byline">{article.author&&<strong>{article.author}</strong>}<span>{article.site}</span>{article.publishedAt&&<time><Clock3 size={14}/>{new Date(article.publishedAt).toLocaleDateString(undefined,{day:"numeric",month:"long",year:"numeric"})}</time>}</div>
   <section className="reader-body"><h2>Story overview</h2><p>{article.description||"This report was published by "+article.site+"."}</p><p>G.O.A.T. VIEWS brings this story into your reading space with its publisher, headline and article details. The original reporting remains the property of its publisher.</p></section>
   <a className="reader-original" href={article.url} target="_blank" rel="noopener noreferrer">Continue to the full report at {article.site} <ExternalLink size={16}/></a>
  </article>}
 </main>;
}