import { createFileRoute } from "@tanstack/react-router";

// Serves uploaded profile media (read-only, public by design — it's shown on the public page).
export const Route = createFileRoute("/api/public/media/$")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const path = params._splat ?? "";
        if (!/^(avatar|songCover|background|songUrl)\/[a-f0-9-]+\.[a-z0-9]{1,8}$/i.test(path)) {
          return new Response("Not found", { status: 404 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from("media").download(path);
        if (error || !data) return new Response("Not found", { status: 404 });
        const buf = await data.arrayBuffer();
        const type = data.type || "application/octet-stream";
        const base = { "content-type": type, "accept-ranges": "bytes", "cache-control": "public, max-age=31536000, immutable" };
        const range = request.headers.get("range");
        const m = range && /bytes=(\d*)-(\d*)/.exec(range);
        if (m) {
          const size = buf.byteLength;
          const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
          const end = m[1] && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
          if (start >= size || start > end) return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
          return new Response(buf.slice(start, end + 1), {
            status: 206,
            headers: { ...base, "content-range": `bytes ${start}-${end}/${size}`, "content-length": String(end - start + 1) },
          });
        }
        return new Response(buf, { headers: { ...base, "content-length": String(buf.byteLength) } });
      },
    },
  },
});
