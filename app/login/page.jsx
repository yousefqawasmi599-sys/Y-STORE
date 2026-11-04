"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/components/Store";
import Field from "@/components/Field";
import { friendlyErrorMessage, login as loginUser, register, resendSignupOtp, verifySignupOtp, sendLoginOtp, verifyEmailOtp } from "@/lib/api";
import { hasSupabaseConfig } from "@/lib/supabase/config";

export default function LoginPage() {
  const { login, user, ready, toast } = useStore();
  const router = useRouter();
  const [mode, setMode] = useState("login");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(null);
  const [otp, setOtp] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);
  const [err, setErr] = useState({});
  const fresh = useRef(false); // true right after submitting, so we do not override the redirect below
  const submitting = useRef(false);

  useEffect(() => { if (ready && user && !fresh.current) router.replace("/account"); }, [ready, user, router]);
  useEffect(() => {
    if (resendSeconds <= 0) return undefined;
    const timer = setTimeout(() => setResendSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendSeconds]);

  const continueAfterAuth = (account, destination = "/account") => {
    fresh.current = true;
    login({ name: account.name || account.email.split("@")[0], email: account.email });
    toast(destination === "/admin" ? "Welcome back." : "Signed in successfully.");
    router.push(destination);
  };

  const destinationAfterAuth = () => {
    const next = new URLSearchParams(location.search).get("next");
    return next && next.startsWith("/") && !next.startsWith("//") && !/[\\\r\n]/.test(next) ? next : "/account";
  };

  const submit = async (e) => {
    e.preventDefault();
    if (submitting.current) return;
    const form = e.currentTarget, f = Object.fromEntries(new FormData(form)), E = {};
    if (mode === "register" && !f.name?.trim()) E.name = "Enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(f.email || "")) E.email = "Enter a valid email, like name@example.com.";
    if (mode === "register" && (f.password || "").length < 12) E.password = "Use at least 12 characters.";
    if (mode === "login" && !f.password) E.password = "Enter your password.";
    if (mode === "register" && f.confirm !== f.password) E.confirm = "The passwords do not match.";
    setErr(E);
    const first = Object.keys(E)[0];
    if (first) return form.elements[first]?.focus();

    submitting.current = true;
    setBusy(true);
    try {
      const email = f.email.trim();
      const u = mode === "otp" ? await sendLoginOtp(email) : mode === "login" ? await loginUser({ email, password: f.password })
        : await register({ name: f.name.trim(), email, password: f.password });
      if (u.pendingVerification) {
        setPendingVerification({ email: u.email || email, name: u.name || f.name?.trim(), type: u.verificationType || "signup" });
        setOtp("");
        setResendSeconds(60);
        submitting.current = false;
        setBusy(false);
        setErr({});
        return;
      }
      const account = { name: u.name || email.split("@")[0], email: u.email || email };
      const next = destinationAfterAuth();
      continueAfterAuth(account, next);
    } catch (ex) {
      submitting.current = false;
      setBusy(false);
      return setErr({ form: friendlyErrorMessage(ex, "Could not sign in. Please try again.") });
    }
  };

  const verifyCode = async (event) => {
    event.preventDefault();
    if (submitting.current) return;
    if (!/^\d{6}$/.test(otp)) {
      setErr({ otp: "Enter the 6-digit code from your email." });
      return;
    }
    submitting.current = true;
    setBusy(true);
    setErr({});
    try {
      const verify = pendingVerification.type === "email" ? verifyEmailOtp : verifySignupOtp;
      const account = await verify({ email: pendingVerification.email, token: otp });
      if (!account.session) {
        setPendingVerification(null);
        setMode("login");
        setErr({ form: "Email verified. Log in to continue." });
        return;
      }
      continueAfterAuth(account, destinationAfterAuth());
    } catch (error) {
      setErr({ otp: friendlyErrorMessage(error, "Could not verify that code. Try again.") });
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  const resendCode = async () => {
    if (!pendingVerification || resending || resendSeconds > 0) return;
    setResending(true);
    setErr({});
    try {
      if (pendingVerification.type === "email") await sendLoginOtp(pendingVerification.email);
      else await resendSignupOtp(pendingVerification.email);
      setResendSeconds(60);
      setErr({ form: "A new verification email has been sent." });
    } catch (error) {
      setErr({ form: friendlyErrorMessage(error, "Could not send a new code. Try again later.") });
    } finally {
      setResending(false);
    }
  };

  const switchMode = (m) => { setMode(m); setErr({}); setPendingVerification(null); setOtp(""); };

  return (
    <div className="auth">
      <div className="auth-art"><blockquote>Your style. Your signature.</blockquote></div>
      <div className="auth-form">
        <div className="auth-card">
          {!pendingVerification ? (
            <>
              <div className="tabs" role="tablist">
                <button role="tab" aria-selected={mode === "login"} onClick={() => switchMode("login")}>Log in</button>
                <button role="tab" aria-selected={mode === "register"} onClick={() => switchMode("register")}>Create account</button>
                {hasSupabaseConfig && <button role="tab" aria-selected={mode === "otp"} onClick={() => switchMode("otp")}>Email code</button>}
              </div>
              <h1 className="serif" style={{ fontSize: 40, margin: "0 0 6px", lineHeight: 1 }}>{mode === "otp" ? "Sign in with a code" : mode === "login" ? "Welcome back" : "Join Y"}</h1>
              <p style={{ color: "var(--muted)", margin: "0 0 24px" }}>
                {mode === "otp" ? "Enter the email of your existing account to receive a one-time sign-in code." : mode === "login" ? "Log in to see your wishlist and speed up checkout." : "Create an account to save your favourites and track orders."}
              </p>
              <form onSubmit={submit} noValidate key={mode}>
                {err.form && <p className="err" role="alert" style={{ marginBottom: 14, fontSize: 13 }}>{err.form}</p>}
                {mode === "register" && <Field label="Full name" name="name" autoComplete="name" error={err.name} />}
                <Field label="Email" name="email" type="email" autoComplete="email" error={err.email} />
                {mode !== "otp" && <Field label="Password" error={err.password}>
                  <span className="pw">
                    <input name="password" type={show ? "text" : "password"} aria-invalid={!!err.password}
                      autoComplete={mode === "login" ? "current-password" : "new-password"} />
                    <button type="button" onClick={() => setShow(!show)} aria-pressed={show}>{show ? "Hide" : "Show"}</button>
                  </span>
                </Field>}
                {mode === "register" && <Field label="Confirm password" name="confirm" type={show ? "text" : "password"} autoComplete="new-password" error={err.confirm} />}
                {mode === "login" && <p style={{ margin: "-4px 0 18px", fontSize: 13 }}><Link href="/forgot-password" style={{ color: "var(--muted)", textDecoration: "underline" }}>Forgot your password?</Link></p>}
                <button className="btn" style={{ width: "100%" }} disabled={busy}>{busy ? "Please wait" : mode === "otp" ? "Send sign-in code" : mode === "login" ? "Log in" : "Create account"}</button>
              </form>
            </>
          ) : (
            <>
              <h1 className="serif" style={{ fontSize: 40, margin: "0 0 6px", lineHeight: 1 }}>Check your email</h1>
              <p style={{ color: "var(--muted)", margin: "0 0 24px" }}>
                Check <strong>{pendingVerification.email}</strong> for your verification email. Enter its 6-digit code if provided, or open the confirmation link in the email.
              </p>
              <form onSubmit={verifyCode} noValidate>
                {err.form && <p className={err.form.includes("sent") ? "otp-success" : "err"} role={err.form.includes("sent") ? "status" : "alert"}>{err.form}</p>}
                <label className="fld">
                  Verification code
                  <input
                    className="otp-input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    name="otp"
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    aria-invalid={!!err.otp}
                    aria-describedby={err.otp ? "otp-error" : undefined}
                    autoFocus
                  />
                  {err.otp && <small className="err" id="otp-error">{err.otp}</small>}
                </label>
                <button className="btn" style={{ width: "100%" }} disabled={busy || otp.length !== 6}>
                  {busy ? "Verifying code" : "Verify email"}
                </button>
              </form>
              <div className="otp-actions">
                <button type="button" onClick={resendCode} disabled={resending || resendSeconds > 0}>
                  {resending ? "Sending email..." : resendSeconds > 0 ? `Resend email in ${resendSeconds}s` : "Resend email"}
                </button>
                <button type="button" onClick={() => switchMode("login")}>Back to log in</button>
              </div>
            </>
          )}
          {!hasSupabaseConfig && !process.env.NEXT_PUBLIC_API_URL && <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 18 }}>Demo mode: no account is created on a server yet.</p>}
        </div>
      </div>
    </div>
  );
}
