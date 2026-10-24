"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function Login() {
  const router = useRouter();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <main style={{ maxWidth: 500, paddingTop: 80 }}>
      <Link href="/" className="eyebrow">
        ◈ BioProof
      </Link>
      <h1 style={{ fontSize: 42 }}>Welcome to your evidence workspace.</h1>
      <div className="card">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const f = new FormData(e.currentTarget);
            try {
              const r = await fetch("/api/auth", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(Object.fromEntries(f)),
              });
              const d = await r.json();
              if (!r.ok) throw new Error(d.error);
              router.push("/dashboard");
            } catch (e) {
              setError(String(e));
              setBusy(false);
            }
          }}
        >
          <label>
            Email
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="current-password"
            />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="button" disabled={busy} style={{ marginTop: 20 }}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p>
          Accounts are provisioned by the project administrator. Operational
          roles cannot be self-selected.
        </p>
        <Link href="/demo">
          Explore the synthetic demo without an account →
        </Link>
      </div>
    </main>
  );
}
