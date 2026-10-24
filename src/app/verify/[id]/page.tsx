import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getPublicProof } from "@/lib/public-proof";
export const dynamic = "force-dynamic";
export default async function Verify({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const proof = await getPublicProof(id);
  if (!proof) notFound();
  const { record: b, integrity } = proof;
  const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/verify/${encodeURIComponent(id)}`;
  const qr = await QRCode.toDataURL(url, {
    margin: 1,
    width: 140,
    color: { dark: "#183f32", light: "#ffffff" },
  });
  return (
    <>
      <nav>
        <Link className="brand" href="/">
          ◈ BioProof
        </Link>
        <Link href="/methodology">Verification boundaries</Link>
        <Link href="/demo">Explore demo</Link>
      </nav>
      <main style={{ maxWidth: 1000 }}>
        <span className="eyebrow">Independent public inspection</span>
        <h1>Follow the proof.</h1>
        <div className="row space" style={{ marginBottom: 25 }}>
          <h2>
            {b.id} · {b.residue}
          </h2>
          <span className="badge">
            {b.synthetic ? "SYNTHETIC DATA" : "PUBLIC REDACTED RECORD"}
          </span>
        </div>
        <div className="grid">
          <div className="card">
            <span className="eyebrow">Record integrity</span>
            <h2>
              {integrity.valid ? "Local chain matches" : "Integrity mismatch"}
            </h2>
            <p>
              Checked{" "}
              {new Date(proof.checkedAt).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
              })}{" "}
              IST
            </p>
            <div className="mono">{b.root}</div>
          </div>
          <div className="card">
            <span className="eyebrow">Blockchain · Sepolia</span>
            <h2>
              {b.anchor.status === "CONFIRMED"
                ? "Confirmed anchor"
                : "No confirmed anchor"}
            </h2>
            <p>
            {proof.chainCheck}. {b.anchor.status.replaceAll("_", " ")}. A local proof is not a
              blockchain transaction.
            </p>
            {b.anchor.transactionHash && (
              <a
                href={`https://sepolia.etherscan.io/tx/${b.anchor.transactionHash}`}
                target="_blank"
                rel="noreferrer"
              >
                Inspect transaction ↗
              </a>
            )}
          </div>
        </div>
        <div className="card" style={{ marginTop: 24 }}>
          <div className="row space">
            <div>
              <h2>Recorded custody</h2>
              <p>
                {b.region} · {b.declared.kg} kg declared ({b.declared.basis})
              </p>
              <p>
                {b.pickup?.kg ?? "Not recorded"} kg collected →{" "}
                {b.intake?.kg ?? "Not recorded"} kg received
              </p>
              <span className="badge">{b.status.replaceAll("_", " ")}</span>
              <p>{b.decision?.summary ?? "Independent review pending."}</p>
              {b.outstandingDispute && (
                <p className="warning">
                  An outstanding dispute is recorded. The earlier decision must
                  not be treated as unchallenged.
                </p>
              )}
            </div>
            <div>
              {/* QR contains only the public URL. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qr}
                alt={`QR code for ${b.id} public verification`}
                width={140}
                height={140}
              />
              <p style={{ fontSize: 11 }}>Scan to inspect this proof</p>
            </div>
          </div>
        </div>
        <h2>Public proof replay</h2>
        {b.events.map((e, i) => (
          <div className="card" key={e.hash} style={{ marginBottom: 12 }}>
            <div className="row space">
              <strong>
                {i + 1}. {e.type.replaceAll("_", " ")}
              </strong>
              <span className="badge">{e.role}</span>
            </div>
            <p>{e.timestamp}</p>
            <div className="mono">{e.hash}</div>
          </div>
        ))}
        <div className="warning">
          Public hashes summarize private events. Full recomputation requires
          the authorized private export. This portal reports the server-side
          integrity check and does not disclose private payloads.
        </div>
        <p>
          Blockchain proves record integrity, not physical truth. This is not a
          carbon-credit certificate. Precise locations, identity details, and
          original evidence remain private.
        </p>
        <Link href={"/api/verify/" + id}>Download public proof JSON →</Link>
      </main>
    </>
  );
}
