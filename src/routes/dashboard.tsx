import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { SocialIcon } from "@/components/SocialIcon";
import {
  clearLegacyProfile, defaultProfile, hasServerProfile, profileQuery, readLegacyProfile,
  type MediaKey, type Profile, type SetupItem, SETUP_CATEGORIES,
} from "@/lib/profile";
import { getAdminStatus, getSharedProfile, login, logout, saveSharedProfile, uploadMedia } from "@/lib/site.functions";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Edit My Bio" },
      { name: "description", content: "Change your name, picture, background, music and socials." },
      { property: "og:title", content: "Dashboard — Edit My Bio" },
      { property: "og:description", content: "Change your name, picture, background, music and socials." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: () => getAdminStatus(),
  component: DashboardGate,
});

function DashboardGate() {
  const { admin } = Route.useLoaderData();
  return admin ? <Dashboard /> : <Login />;
}

function Login() {
  const router = useRouter();
  const doLogin = useServerFn(login);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <form className="glass w-full max-w-sm space-y-4 rounded-2xl p-6" onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true); setErr("");
        const password = String(new FormData(e.currentTarget).get("password") ?? "");
        try {
          const r = await doLogin({ data: { password } });
          if (r.ok) await router.invalidate(); else setErr("Wrong password");
        } catch { setErr("Couldn't sign in right now"); }
        setBusy(false);
      }}>
        <h1 className="text-xl font-semibold">Dashboard login</h1>
        <input name="password" type="password" autoComplete="current-password" placeholder="Password" className="field w-full" autoFocus />
        {err && <p className="text-sm text-destructive">{err}</p>}
        <button disabled={busy} className="w-full rounded-lg bg-primary px-5 py-2 font-medium text-primary-foreground">{busy ? "…" : "Enter"}</button>
        <Link to="/" className="block text-center text-sm text-muted-foreground hover:text-foreground">← Back to page</Link>
      </form>
    </main>
  );
}

function Dashboard() {
  const router = useRouter();
  const qc = useQueryClient();
  const save$ = useServerFn(saveSharedProfile);
  const upload$ = useServerFn(uploadMedia);
  const logout$ = useServerFn(logout);
  const getRaw = useServerFn(getSharedProfile);
  const [p, setP] = useState<Profile | null>(null);
  const [msg, setMsg] = useState("");
  const [uploading, setUploading] = useState<MediaKey | null>(null);
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 4000); };

  const uploadBlob = async (k: MediaKey, f: Blob, name: string) => {
    const fd = new FormData();
    fd.append("kind", k);
    fd.append("file", f instanceof File ? f : new File([f], name, { type: f.type }));
    return upload$({ data: fd });
  };

  useEffect(() => {
    (async () => {
      const { data } = await getRaw();
      let profile: Profile = { ...defaultProfile, ...(data as Partial<Profile>) };
      // One-time migration of the old browser-saved profile.
      if (!hasServerProfile(data)) {
        const legacy = await readLegacyProfile();
        if (legacy) {
          try {
            profile = { ...profile, ...legacy.profile };
            for (const [k, b] of Object.entries(legacy.files) as [MediaKey, Blob][]) {
              const r = await uploadBlob(k, b, `${k}.${(b.type.split("/")[1] || "bin").replace("mpeg", "mp3")}`);
              profile = { ...profile, [k]: r.url, ...(k === "background" ? { bgIsVideo: r.isVideo } : {}) };
            }
            await save$({ data: profile });
            clearLegacyProfile();
            qc.invalidateQueries({ queryKey: profileQuery.queryKey });
            flash("Imported your old profile");
          } catch { flash("Couldn't import your old profile"); }
        }
      }
      setP(profile);
    })();
  }, []);

  if (!p) return <main className="min-h-screen bg-background" />;
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP({ ...p, [k]: v });

  const save = async () => {
    try {
      await save$({ data: p });
      await qc.invalidateQueries({ queryKey: profileQuery.queryKey });
      flash("Saved! Everyone sees it now.");
    } catch (e) { flash(e instanceof Error && e.message === "Unauthorized" ? "Session expired — log in again." : "Couldn't save."); }
  };

  const Text = ({ k, label }: { k: "name" | "location" | "songTitle" | "discordId" | "intro" | "username" | "bio" | "languages" | "uid" | "badges"; label: string }) => (
    <label className="block space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input className="field" defaultValue={p[k]} key={p[k] + k} onBlur={(e) => set(k, e.target.value)} />
    </label>
  );

  const Media = ({ k, label, accept, hint }: { k: MediaKey; label: string; accept: string; hint: string }) => (
    <div className="space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <label className="glass flex cursor-pointer items-center justify-between rounded-lg px-4 py-3 text-sm">
        <span className="text-muted-foreground">{uploading === k ? "Uploading…" : hint}</span>
        <span>Choose file</span>
        <input type="file" accept={accept} hidden disabled={!!uploading} onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setUploading(k);
          try {
            const r = await uploadBlob(k, f, f.name);
            setP((cur) => cur && ({ ...cur, [k]: r.url, ...(k === "background" ? { bgIsVideo: r.isVideo } : {}) }));
            flash("Uploaded — press Save to publish");
          } catch (err) { flash(err instanceof Error ? err.message : "Upload failed"); }
          setUploading(null);
        }} />
      </label>
    </div>
  );

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">View page →</Link>
            <button className="text-sm text-muted-foreground hover:text-foreground" onClick={async () => { await logout$(); await router.invalidate(); }}>Log out</button>
          </div>
        </div>

        <section className="glass space-y-4 rounded-2xl p-5">
          <h2 className="font-medium">Profile</h2>
          <div className="flex items-center gap-4">
            <img src={p.avatar} alt="" className="h-16 w-16 rounded-full object-cover" />
            <div className="flex-1"><Media k="avatar" label="Profile picture" accept="image/*" hint="PNG, JPG, GIF, WEBP" /></div>
          </div>
          <Text k="name" label="Name" />
          <Text k="username" label="Username (shown as @username)" />
          <Text k="intro" label="Intro text above the card (leave empty to hide)" />
          <Text k="bio" label="Bio" />
          <Text k="languages" label="Languages (separate with commas)" />
          <Text k="badges" label="Badges (separate with commas)" />
          <Text k="location" label="Location" />
          <Text k="uid" label="UID" />
        </section>

        <section className="glass space-y-4 rounded-2xl p-5">
          <h2 className="font-medium">Look</h2>
          <label className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Accent colour</span>
            <input type="color" value={p.accent} onChange={(e) => set("accent", e.target.value)} className="h-8 w-14 cursor-pointer rounded bg-transparent" />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-xs text-muted-foreground">Card see-through: {100 - p.cardOpacity}%</span>
            <input type="range" min={0} max={100} value={p.cardOpacity} onChange={(e) => set("cardOpacity", Number(e.target.value))} className="w-full" />
          </label>
        </section>

        <section className="glass space-y-3 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Gaming setup</h2>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={p.setupCompact} onChange={(e) => set("setupCompact", e.target.checked)} /> Compact
            </label>
          </div>
          {p.setup.map((g, i) => {
            const upd = (v: Partial<SetupItem>) => set("setup", p.setup.map((x, j) => j === i ? { ...x, ...v } : x));
            const move = (d: number) => { const a = [...p.setup]; const t = i + d; if (t < 0 || t >= a.length) return; [a[i], a[t]] = [a[t]!, a[i]!]; set("setup", a); };
            return (
              <div key={i} className="space-y-2 rounded-lg border border-foreground/10 p-3">
                <div className="flex gap-2">
                  <select className="field w-32" value={g.category} onChange={(e) => upd({ category: e.target.value })}>
                    {SETUP_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                  <input className="field flex-1" placeholder="Product name" value={g.name} onChange={(e) => upd({ name: e.target.value })} />
                </div>
                <div className="flex gap-2">
                  <input className="field flex-1" placeholder="Brand" value={g.brand} onChange={(e) => upd({ brand: e.target.value })} />
                  <input className="field flex-1" placeholder="Link (optional)" value={g.link} onChange={(e) => upd({ link: e.target.value })} />
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <button onClick={() => move(-1)} className="hover:text-foreground">↑</button>
                  <button onClick={() => move(1)} className="hover:text-foreground">↓</button>
                  <label className="flex items-center gap-1"><input type="checkbox" checked={!!g.hidden} onChange={(e) => upd({ hidden: e.target.checked })} /> Hide</label>
                  <button onClick={() => set("setup", p.setup.filter((_, j) => j !== i))} className="ml-auto hover:text-destructive">Delete</button>
                </div>
              </div>
            );
          })}
          <button className="text-sm text-muted-foreground hover:text-foreground" onClick={() => set("setup", [...p.setup, { category: "Mouse", name: "", brand: "", link: "" }])}>+ Add equipment</button>
        </section>

        <section className="glass space-y-3 rounded-2xl p-5">
          <h2 className="font-medium">Discord presence</h2>
          <ol className="list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
            <li>Join the free Lanyard server: <a className="underline" href="https://discord.gg/lanyard" target="_blank" rel="noreferrer">discord.gg/lanyard</a> (it reads your live status).</li>
            <li>In Discord, turn on Developer Mode, right-click your name → Copy User ID.</li>
            <li>Paste it below and save.</li>
          </ol>
          <Text k="discordId" label="Discord user ID" />
        </section>

        <section className="glass space-y-4 rounded-2xl p-5">
          <h2 className="font-medium">Background</h2>
          {p.bgIsVideo ? (
            <video src={p.background} autoPlay muted loop playsInline className="h-28 w-full rounded-lg object-cover" />
          ) : (
            <img src={p.background} alt="" className="h-28 w-full rounded-lg object-cover" />
          )}
          <Media k="background" label="Background" accept="image/*,video/mp4" hint="Image, GIF or MP4" />
        </section>

        <section className="glass space-y-4 rounded-2xl p-5">
          <h2 className="font-medium">Music</h2>
          <Text k="songTitle" label="Song title" />
          <img src={p.songCover} alt="" className="h-16 w-16 rounded-md object-cover" />
          <Media k="songCover" label="Cover art" accept="image/*" hint="PNG, JPG, GIF, WEBP" />
          <Media k="songUrl" label="Song" accept=".mp3,audio/mpeg" hint={p.songUrl ? "Song uploaded ✓" : "MP3 file"} />
        </section>

        <section className="glass space-y-3 rounded-2xl p-5">
          <h2 className="font-medium">Socials</h2>
          {p.socials.map((s, i) => (
            <div key={i} className="flex gap-2">
              <span className="glass flex w-10 items-center justify-center rounded-lg"><SocialIcon url={s.url} className="h-4 w-4" /></span>
              <input className="field flex-1" placeholder="https://instagram.com/you" value={s.url} onChange={(e) => set("socials", p.socials.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} />
              <button className="px-2 text-muted-foreground hover:text-destructive" onClick={() => set("socials", p.socials.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          <button className="text-sm text-muted-foreground hover:text-foreground" onClick={() => set("socials", [...p.socials, { label: "", url: "https://" }])}>+ Add link</button>
        </section>

        <div className="flex items-center gap-3">
          <button onClick={save} disabled={!!uploading} className="rounded-lg bg-primary px-5 py-2 font-medium text-primary-foreground">Save</button>
          <button onClick={() => setP(defaultProfile)} className="text-sm text-muted-foreground">Reset</button>
          <span className="text-sm">{msg}</span>
        </div>
      </div>
    </main>
  );
}
