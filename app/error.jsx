"use client";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }) {
  useEffect(() => { console.error(error); }, [error]);
  return <div className="wrap view"><div className="prose" role="alert">
    <h1 className="serif vh">Something went wrong</h1>
    <p>We could not load this page. Check your connection and try again.</p>
    <button className="btn" onClick={reset}>Try again</button>
  </div></div>;
}
