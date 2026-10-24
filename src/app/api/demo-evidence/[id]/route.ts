import { syntheticEvidence } from "@/lib/demo-evidence";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const match = /^(BP-00[1-3])-(pickup|intake)$/.exec(id);
  if (!match) return new Response("Not found", { status: 404 });
  return new Response(
    syntheticEvidence(match[1], match[2] as "pickup" | "intake"),
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `inline; filename="${id}.txt"`,
      },
    },
  );
}
