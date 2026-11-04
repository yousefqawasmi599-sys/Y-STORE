"use client";
import Link from "next/link";
import { useState } from "react";
import Field from "@/components/Field";
import * as api from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email address.");
    setBusy(true);
    try {
      await api.sendPasswordReset(email.trim());
      setMessage("If an account exists for that email, a reset link is on its way.");
    } catch (exception) {
      setError(exception.message);
    } finally {
      setBusy(false);
    }
  };

  return <div className="auth"><div className="auth-art"><blockquote>Your style. Your signature.</blockquote></div><div className="auth-form"><div className="auth-card">
    <p className="kicker">ACCOUNT RECOVERY</p><h1 className="serif" style={{ fontSize: 40, margin: "0 0 8px", lineHeight: 1 }}>Reset your password</h1>
    <p style={{ color: "var(--muted)", margin: "0 0 24px" }}>We will send a secure reset link to your email.</p>
    <form onSubmit={submit} noValidate><Field label="Email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} error={error} />
      {message && <p role="status" style={{ color: "var(--accent)", fontSize: 13 }}>{message}</p>}
      <button className="btn" style={{ width: "100%" }} disabled={busy}>{busy ? "Sending link" : "Send reset link"}</button>
    </form><p style={{ marginTop: 20, fontSize: 13 }}><Link href="/login" style={{ textDecoration: "underline" }}>Back to log in</Link></p>
  </div></div></div>;
}