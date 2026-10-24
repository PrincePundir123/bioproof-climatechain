import Link from "next/link";
import { PublicNavigation, PublicFooter } from "@/components/public-shell";
export default function NotFound() {
  return (
    <>
      <PublicNavigation />
      <main className="system-state card">
        <span className="eyebrow">RECORD NOT FOUND</span>
        <h1>This page isn’t available.</h1>
        <p>
          Check the address or return to the workspace to find the record you
          need.
        </p>
        <div className="row">
          <Link href="/dashboard" className="button">
            Open workspace
          </Link>
          <Link href="/" className="text-link">
            Return home →
          </Link>
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
