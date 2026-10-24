import Link from "next/link";
import { EvidenceViewer } from "@/components/evidence-viewer";
export default async function Evidence({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main>
      <Link href="/dashboard">← Workspace</Link>
      <h1 style={{ fontSize: 38 }}>Inspect source evidence</h1>
      <EvidenceViewer id={id} />
    </main>
  );
}
