import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  actor: vi.fn(),
  db: vi.fn(),
  saveBatch: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/lib/server")>()),
  configured: () => true,
  authClient: async () => ({ auth: { signInWithPassword: mocks.signIn } }),
  actor: mocks.actor,
  db: mocks.db,
  saveBatch: mocks.saveBatch,
}));
import { POST as login } from "../src/app/api/auth/route";
import { POST as create } from "../src/app/api/workspace/route";

function request(
  path: string,
  body: unknown,
  origin = "http://127.0.0.1:3101",
) {
  return new Request("http://localhost:3101" + path, {
    method: "POST",
    headers: {
      host: "127.0.0.1:3101",
      origin,
      "content-type": "application/json",
      "idempotency-key": "00000000-0000-4000-8000-000000000001",
    },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.actor.mockResolvedValue({ id: "farmer", role: "FARMER" });
});
afterEach(() => vi.unstubAllEnvs());

describe("sign-in HTTP regression tests", () => {
  it.each([
    ["invalid_credentials", 401, "Incorrect email or password."],
    ["email_not_confirmed", 403, "Confirm your email"],
    ["user_banned", 403, "suspended"],
    ["over_request_rate_limit", 429, "Too many"],
    ["unexpected_failure", 503, "temporarily unavailable"],
  ])(
    "returns a safe and useful HTTP response for %s",
    async (code, status, message) => {
      mocks.signIn.mockResolvedValue({
        error: { code, message: "PRIVATE provider diagnostics", status: 400 },
      });
      const response = await login(
        request("/api/auth", { email: "user@example.com", password: "secret" }),
      );
      const body = await response.json();
      expect(response.status).toBe(status);
      expect(body.error).toContain(message);
      expect(JSON.stringify(body)).not.toContain("PRIVATE");
    },
  );

  it("accepts an existing short password and the actual browser host", async () => {
    mocks.signIn.mockResolvedValue({ error: null });
    const response = await login(
      request("/api/auth", { email: "user@example.com", password: "123456" }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(mocks.signIn).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "123456",
    });
  });

  it("rejects cross-origin login before calling Supabase", async () => {
    const response = await login(
      request(
        "/api/auth",
        { email: "user@example.com", password: "123456" },
        "https://attacker.example",
      ),
    );
    expect(response.status).toBe(403);
    expect(mocks.signIn).not.toHaveBeenCalled();
  });

  it.each(["", "invalid-email"])(
    "rejects invalid email %s without signing in",
    async (email) => {
      const response = await login(
        request("/api/auth", { email, password: "123456" }),
      );
      expect(response.ok).toBe(false);
      expect(mocks.signIn).not.toHaveBeenCalled();
    },
  );
});

describe("batch creation HTTP regression tests", () => {
  it("rejects removal exceeding total before any database write", async () => {
    const response = await create(
      request("/api/workspace", {
        plotId: "plot",
        region: "Punjab",
        residue: "Rice straw",
        declared: { kg: 100, basis: "dry" },
        totalResidue: 50,
      }),
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("cannot exceed");
    expect(mocks.db).not.toHaveBeenCalled();
    expect(mocks.saveBatch).not.toHaveBeenCalled();
  });

  it.each(["", null, "0"])(
    "persists unknown versus measured zero moisture correctly: %s",
    async (moisture) => {
      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: "plot" } }),
      };
      mocks.db.mockReturnValue({ from: () => query });
      const response = await create(
        request("/api/workspace", {
          plotId: "plot",
          region: "Punjab",
          residue: "Rice straw",
          declared: { kg: 100, basis: "wet", moisture },
          totalResidue: 100,
        }),
      );
      expect(response.status).toBe(201);
      const body = await response.json();
      if (moisture === "0") expect(body.declared.moisture).toBe(0);
      else expect(body.declared).not.toHaveProperty("moisture");
      expect(mocks.saveBatch).toHaveBeenCalledOnce();
      expect(mocks.saveBatch.mock.calls[0][0].declared.moisture).toBe(
        moisture === "0" ? 0 : undefined,
      );
    },
  );
});
