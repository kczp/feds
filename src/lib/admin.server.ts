import { useSession } from "@tanstack/react-start/server";

type AdminSession = { admin?: boolean };

function config() {
  const password = process.env["SESSION_SECRET"];
  if (!password || password.length < 32) throw new Error("SESSION_SECRET is not set");
  return {
    password,
    name: "bio-admin",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    // SameSite=None + Partitioned so the cookie survives inside the editor's
    // preview iframe (third-party context); CSRF middleware guards server fns.
    cookie: { httpOnly: true, secure: true, sameSite: "none" as const, partitioned: true, path: "/" },
  };
}

export const adminSession = () => useSession<AdminSession>(config());

export async function isAdmin() {
  const s = await adminSession();
  const { getRequest } = await import("@tanstack/react-start/server");
  console.log("[DBG] cookie names:", (getRequest()?.headers.get("cookie") ?? "").split(";").map((c) => c.split("=")[0]), "data:", JSON.stringify(s.data));
  return s.data.admin === true;
}

export async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Unauthorized");
}

async function digest(s: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
}

// Constant-time compare over equal-length hashes.
export async function passwordMatches(input: string, expected: string) {
  const [a, b] = await Promise.all([digest(input), digest(expected)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}
