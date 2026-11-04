"use client";
import { useRef, useState } from "react";
import { friendlyErrorMessage, subscribe } from "@/lib/api";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const submit = async (e) => {
    e.preventDefault();
    if (busyRef.current) return;
    if (website) return;
    if (!/^\S+@\S+\.\S+$/.test(email)) return setMsg("Enter a valid email address, like name@example.com.");
    busyRef.current = true;
    setBusy(true);
    try { await subscribe(email, website); setMsg("Thanks for subscribing."); setEmail(""); }
    catch (ex) { setMsg(friendlyErrorMessage(ex, "Could not subscribe right now. Please try again.")); }
    finally { busyRef.current = false; setBusy(false); }
  };
  return (
    <div className="news">
      <div className="wrap">
        <div>
          <strong style={{ fontWeight: 500 }}>Join our newsletter</strong><span className="ar-i" lang="ar">انضم إلى نشرتنا</span><br />
          <span style={{ color: "var(--muted)", fontSize: 13 }}>Be first to hear about new drops and exclusive offers.</span>
        </div>
        <form onSubmit={submit} noValidate>
          <input type="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email address" aria-label="Email address" />
          <div className="form-honeypot" aria-hidden="true"><label htmlFor="newsletter-website">Leave this field empty</label><input id="newsletter-website" name="website" type="text" value={website} onChange={(event) => setWebsite(event.target.value)} tabIndex={-1} autoComplete="off" /></div>
          <button className="btn" type="submit" disabled={busy}>{busy ? "Subscribing…" : "Subscribe"}</button>
        </form>
        <div className="msg" role="status">{msg}</div>
      </div>
    </div>
  );
}
