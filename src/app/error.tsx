"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main>
      <h1>We couldn’t load this record.</h1>
      <p>
        Try again. If a service is unavailable, your original evidence remains
        unchanged.
      </p>
      <button className="button" onClick={reset}>
        Try again
      </button>{" "}
      <Link href="/">Return home</Link>
    </main>
  );
}
