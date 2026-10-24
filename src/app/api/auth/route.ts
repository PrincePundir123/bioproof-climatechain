import { z } from "zod";
import { authClient, configured, checkOrigin, failure } from "@/lib/server";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    if (!configured()) throw new Error("Supabase is not configured");
    const data = z
      .object({ email: z.email(), password: z.string().min(8).max(200) })
      .parse(await request.json());
    const { error } = await (await authClient()).auth.signInWithPassword(data);
    if (error) throw new Error("Invalid credentials");
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(request: Request) {
  try {
    checkOrigin(request);
    await (await authClient()).auth.signOut();
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
