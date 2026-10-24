"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Brand } from "@/components/public-shell";
import { FieldPhoto } from "@/components/field-photo";
export default function Login() {
  const router = useRouter();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <main className="login-page">
      <div className="login-photo">
        <FieldPhoto name="field" />
        <div className="login-photo-copy">
          <span className="eyebrow">FROM FIELD TO CONFIDENCE</span>
          <h2>Every handover matters.</h2>
          <p>Keep the source, the measurement, and the decision connected.</p>
          <Link href="/about#photo-credits">
            Illustrative agricultural photography ↗
          </Link>
        </div>
      </div>
      <div className="login-content">
        <Brand />
        <h1>Welcome to your evidence workspace.</h1>
        <p>Sign in to continue your part of the journey.</p>
        <div className="card">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
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
                autoComplete="current-password"
              />
            </label>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button
              className="button"
              disabled={busy}
              style={{ marginTop: 20 }}
            >
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
      </div>
    </main>
  );
}
