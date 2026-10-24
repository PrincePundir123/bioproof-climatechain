import { getPublicProof } from "@/lib/public-proof";
export async function GET(
  _r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const p = await getPublicProof((await params).id);
  return Response.json(p ?? { error: "Proof not found" }, {
    status: p ? 200 : 404,
    headers: { "Cache-Control": "no-store" },
  });
}
