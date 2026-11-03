import {Suspense} from "react";
import ArticleReader from "../components/ArticleReader";
export const metadata={title:"Read Story | G.O.A.T. VIEWS"};
export default async function Page({searchParams}:{searchParams:Promise<{url?:string;title?:string;summary?:string;source?:string}>}){
 const params=await searchParams;
 return <Suspense fallback={<main className="reader-page"><div className="reader-state">Opening article…</div></main>}><ArticleReader url={params.url||""} title={params.title||"Sports report"} summary={params.summary||""} source={params.source||"Publisher"}/></Suspense>;
}