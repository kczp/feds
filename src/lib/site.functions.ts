import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { adminSession, isAdmin, passwordMatches, requireAdmin } from "./admin.server";

const profileSchema = z.object({
  name: z.string().max(100),
  status: z.string().max(200),
  discordId: z.string().max(40),
  location: z.string().max(100),
  avatar: z.string().max(1000),
  background: z.string().max(1000),
  bgIsVideo: z.boolean().optional(),
  songTitle: z.string().max(200),
  songCover: z.string().max(1000),
  songUrl: z.string().max(1000),
  socials: z.array(z.object({ label: z.string().max(100), url: z.string().max(1000) })).max(30),
});

export const getSharedProfile = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const sb = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data, error } = await sb.from("site_profile").select("data").eq("id", 1).maybeSingle();
  if (error) console.error(error);
  return { data: (data?.data ?? {}) as Record<string, string | boolean | { label: string; url: string }[]> };
});

export const getAdminStatus = createServerFn({ method: "GET" }).handler(async () => ({
  admin: await isAdmin(),
}));

export const login = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string }) => z.object({ password: z.string().max(500) }).parse(d))
  .handler(async ({ data }) => {
    const expected = process.env["ADMIN_PASSWORD"];
    if (!expected) throw new Error("ADMIN_PASSWORD is not set");
    if (!(await passwordMatches(data.password, expected))) return { ok: false as const };
    const s = await adminSession();
    await s.update({ admin: true });
    return { ok: true as const };
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const s = await adminSession();
  await s.clear();
  return { ok: true as const };
});

export const saveSharedProfile = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => profileSchema.parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("site_profile")
      .upsert({ id: 1, data, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

const ACCEPT: Record<string, (t: string) => boolean> = {
  avatar: (t) => t.startsWith("image/"),
  songCover: (t) => t.startsWith("image/"),
  background: (t) => t.startsWith("image/") || t === "video/mp4",
  songUrl: (t) => t === "audio/mpeg" || t === "audio/mp3",
};

export const uploadMedia = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    if (!(d instanceof FormData)) throw new Error("Expected form data");
    const kind = String(d.get("kind") ?? "");
    const file = d.get("file");
    if (!(file instanceof File)) throw new Error("No file");
    if (!ACCEPT[kind]) throw new Error("Bad kind");
    if (!ACCEPT[kind](file.type)) throw new Error("This file type isn't allowed here");
    if (file.size > 50 * 1024 * 1024) throw new Error("File is larger than 50 MB");
    return { kind, file };
  })
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ext = (data.file.name.split(".").pop() || "bin").replace(/[^a-z0-9]/gi, "").slice(0, 8);
    const path = `${data.kind}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabaseAdmin.storage
      .from("media")
      .upload(path, await data.file.arrayBuffer(), { contentType: data.file.type });
    if (error) throw new Error(error.message);
    return { url: `/api/public/media/${path}`, isVideo: data.file.type.startsWith("video") };
  });
