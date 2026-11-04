"use client";
import { useEffect } from "react";

export default function GlobalError({ error, reset }) {
  useEffect(() => { console.error(error); }, [error]);
  return <html lang="en"><body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#0b0c0e", color: "#ece8e1", fontFamily: "system-ui, sans-serif" }}>
    <main role="alert" style={{ maxWidth: 520, padding: 32 }}>
      <h1>Something went wrong</h1><p>The store could not load. Please try again.</p>
      <button onClick={reset}>Try again</button>
    </main>
  </body></html>;
}
