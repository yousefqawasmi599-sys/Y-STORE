"use client";
import { useRef, useState } from "react";
import { useStore } from "./Store";
import Field from "./Field";
import * as api from "@/lib/api";
import { friendlyErrorMessage } from "@/lib/api";

export default function ContactForm() {
  const { toast } = useStore();
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const submit = async (e) => {
    e.preventDefault();
    if (busyRef.current) return;
    const form = e.currentTarget, f = Object.fromEntries(new FormData(form)), E = {};
    if (!f.name?.trim() || f.name.trim().length > 100) E.name = "Enter a name up to 100 characters.";
    if (!/^\S+@\S+\.\S+$/.test(f.email || "") || f.email.length > 254) E.email = "Enter a valid email up to 254 characters.";
    if (!f.message?.trim() || f.message.trim().length < 5 || f.message.length > 3000) E.message = "Enter a message between 5 and 3000 characters.";
    setErr(E);
    const first = Object.keys(E)[0];
    if (first) return form.elements[first]?.focus();
    if (f.website) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await api.sendContact({ name: f.name, email: f.email, message: f.message, website: f.website });
      form.reset();
      toast("Message sent. We reply within one working day.");
    } catch (ex) {
      toast(friendlyErrorMessage(ex, "Could not send your message. Please try again."));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} noValidate>
      <Field label="Name" name="name" error={err.name} maxLength={100} />
      <Field label="Email" name="email" type="email" error={err.email} maxLength={254} />
      <Field label="Message" error={err.message}>
        <textarea name="message" rows={5} maxLength={3000} aria-invalid={!!err.message} />
      </Field>
      <div className="form-honeypot" aria-hidden="true"><label htmlFor="contact-website">Leave this field empty</label><input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" /></div>
      <button className="btn" disabled={busy}>{busy ? "Sending…" : "Send message"}</button>
    </form>
  );
}
