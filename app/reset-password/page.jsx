"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Field from "@/components/Field";
import * as api from "@/lib/api";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if ((values.password || "").length < 12) return setError("Use at least 12 characters.");
    if (values.password !== values.confirm) return setError("The passwords do not match.");
    setError("");
    setBusy(true);
    try {
      await api.updatePassword(values.password);
      setDone(true);
      setTimeout(() => router.replace("/login"), 1200);
    } catch (exception) {
      setError(exception.message);
    } finally {
      setBusy(false);
    }
  };

  return <div className="auth"><div className="auth-art"><blockquote>Your style. Your signature.</blockquote></div><div className="auth-form"><div className="auth-card">
    <p className="kicker">ACCOUNT RECOVERY</p><h1 className="serif" style={{ fontSize: 40, margin: "0 0 8px", lineHeight: 1 }}>Choose a new password</h1>
    {!done ? <form onSubmit={submit} noValidate>
      <Field label="New password" error={error}><input name="password" type="password" autoComplete="new-password" /></Field>
      <Field label="Confirm password"><input name="confirm" type="password" autoComplete="new-password" /></Field>
      <button className="btn" style={{ width: "100%" }} disabled={busy}>{busy ? "Saving password" : "Save new password"}</button>
    </form> : <p role="status">Password updated. Taking you to log in...</p>}
    {error && <p className="err" role="alert">{error}</p>}
    <p style={{ marginTop: 20, fontSize: 13 }}><Link href="/login" style={{ textDecoration: "underline" }}>Back to log in</Link></p>
  </div></div></div>;
}
