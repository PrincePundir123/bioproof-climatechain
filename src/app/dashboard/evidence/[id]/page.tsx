import Link from "next/link";
import { EvidenceViewer } from "@/components/evidence-viewer";
export default async function Evidence({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="evidence-inspection">
      <Link href="/dashboard" className="text-link">
        ← Workspace
      </Link>
      <h1>Inspect source evidence</h1>
      <p>
        Compare the original document with the fields you confirm. Original
        evidence remains private.
      </p>
      <EvidenceViewer id={id} />
    </main>
  );
}
