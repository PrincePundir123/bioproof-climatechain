"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, Menu, Sprout, X } from "lucide-react";

export function Brand() {
  return (
    <Link href="/" className="brand">
      <Sprout aria-hidden="true" size={27} />
      <span className="brand-word">
        BioProof<span className="brand-tagline">FROM FIELD TO CONFIDENCE</span>
      </span>
    </Link>
  );
}
export function PublicNavigation() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  return (
    <nav
      className="public-nav"
      aria-label="Main navigation"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setOpen(false);
          document.getElementById("public-menu-button")?.focus();
        }
      }}
    >
      <Brand />
      <button
        id="public-menu-button"
        className="menu-toggle secondary button"
        aria-expanded={open}
        aria-controls="public-links"
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
        <span>Menu</span>
      </button>
      <div
        id="public-links"
        className={`public-links ${open ? "is-open" : ""}`}
      >
        {[
          ["/", "Home"],
          ["/about", "Our purpose"],
          ["/methodology", "Our methodology"],
        ].map(([href, name]) => (
          <Link
            key={href}
            href={href}
            aria-current={path === href ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            {name}
          </Link>
        ))}
        <Link href="/login" onClick={() => setOpen(false)}>
          Sign in
        </Link>
        <Link href="/demo" className="button" onClick={() => setOpen(false)}>
          Open workspace <ArrowUpRight size={16} />
        </Link>
      </div>
    </nav>
  );
}
export function PublicFooter() {
  return (
    <footer className="public-footer">
      <div>
        <Brand />
        <p>
          Agricultural residue. Connected evidence.
          <br />
          Independent decisions.
        </p>
      </div>
      <div>
        <span className="eyebrow">Explore BioProof</span>
        <Link href="/demo">Synthetic demo</Link>
        <Link href="/login">Sign in to workspace</Link>
        <Link href="/methodology">Verification boundaries</Link>
      </div>
      <div>
        <span className="eyebrow">Project</span>
        <Link href="/about">Our purpose</Link>
        <Link href="/about#photo-credits">Photography credits</Link>
        <p>IEEE ClimateChain · Sustainable Supply Chains</p>
      </div>
      <small className="footer-note">
        Illustrative agricultural photography. Images do not document user
        batches or imply endorsement. Evidence integrity does not establish
        physical truth.
      </small>
    </footer>
  );
}
