"use client";
import {useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {createClient} from "@/lib/supabase/client";

export default function LoginPage(){
 const router=useRouter();
 const [mode,setMode]=useState<"signin"|"signup">("signin");
 const [email,setEmail]=useState("");
 const [password,setPassword]=useState("");
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);
 async function submit(e:React.FormEvent){
  e.preventDefault();setMessage("");setBusy(true);
  try{
   const supabase=createClient();
   if(mode==="signup"){
    const {data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin+"/auth/callback?next=/" }});
    if(error)throw error;
    if(data.session){router.replace("/");router.refresh();return;}
    setMessage("Account created. Check your email to confirm your account, then sign in.");
   }else{
    const {error}=await supabase.auth.signInWithPassword({email,password});
    if(error)throw error;
    const next=new URLSearchParams(window.location.search).get("next");
    router.replace(next&&next.startsWith("/")&&!next.startsWith("//")?next:"/");
    router.refresh();
   }
  }catch(err){setMessage(err instanceof Error?err.message:"Unable to complete account request.");}
  finally{setBusy(false);}
 }
 return <main className="auth-page"><Link className="auth-logo" href="/">G.O.A.T. <b>VIEWS</b></Link><section className="auth-card"><span className="auth-kicker">YOUR SPORTS WORLD</span><h1>{mode==="signup"?"Create your account":"Welcome back"}</h1><p>Sign in to access G.O.A.T. VIEWS and your sports centre.</p><div className="auth-tabs"><button type="button" className={mode==="signup"?"chosen":""} onClick={()=>{setMode("signup");setMessage("");}}>Sign up</button><button type="button" className={mode==="signin"?"chosen":""} onClick={()=>{setMode("signin");setMessage("");}}>Sign in</button></div><form onSubmit={submit}><label>Email address<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label><label>Password<input type="password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters"/></label><button className="auth-submit" disabled={busy}>{busy?"Please wait…":mode==="signup"?"Create account":"Sign in"}</button></form>{message&&<p className="auth-message" role="status">{message}</p>}<Link className="auth-back" href="/">G.O.A.T. VIEWS</Link></section></main>;
}