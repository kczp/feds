import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { defaultProfile, saveProfile, useProfile, type Profile } from "@/lib/profile";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Edit My Bio" },
      { name: "description", content: "Change your name, picture, background, music and socials." },
      { property: "og:title", content: "Dashboard — Edit My Bio" },
      { property: "og:description", content: "Change your name, picture, background, music and socials." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

const readFile = (f: File) =>
  new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(f); });

function Dashboard() {
  const [p, setP] = useProfile();
  const [msg, setMsg] = useState("");
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP({ ...p, [k]: v });

  const save = () => {
    try { saveProfile(p); setMsg("Saved!"); }
    catch { setMsg("Too big to save — try a smaller file or paste a link instead."); }
    setTimeout(() => setMsg(""), 3000);
  };

  const Text = ({ k, label }: { k: "name" | "status" | "location" | "songTitle"; label: string }) => (
    <label className="block space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input className="field" defaultValue={p[k]} key={p[k] + k} onBlur={(e) => set(k, e.target.value)} />
    </label>
  );

  const Media = ({ k, label, accept }: { k: "avatar" | "background" | "songCover" | "songUrl"; label: string; accept: string }) => (
    <div className="space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex gap-2">
        <input className="field flex-1" placeholder="Paste a link…" defaultValue={p[k].startsWith("data:") ? "(uploaded file)" : p[k]} key={k + p[k].length}
          onBlur={(e) => e.target.value !== "(uploaded file)" && set(k, e.target.value)} />
        <label className="glass cursor-pointer rounded-lg px-3 py-2 text-sm">
          Upload
          <input type="file" accept={accept} hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) set(k, await readFile(f)); }} />
        </label>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">View page →</Link>
        </div>

        <section className="glass space-y-4 rounded-2xl p-5">
          <h2 className="font-medium">Profile</h2>
          <div className="flex items-center gap-4">
            <img src={p.avatar} alt="" className="h-16 w-16 rounded-full object-cover" />
            <div className="flex-1"><Media k="avatar" label="Profile picture" accept="image/*" /></div>
          </div>
          <Text k="name" label="Name" />
          <Text k="status" label="Status" />
          <Text k="location" label="Location" />
        </section>

        <section className="glass space-y-4 rounded-2xl p-5">
          <h2 className="font-medium">Background</h2>
          <img src={p.background} alt="" className="h-28 w-full rounded-lg object-cover" />
          <Media k="background" label="Background image" accept="image/*" />
        </section>

        <section className="glass space-y-4 rounded-2xl p-5">
          <h2 className="font-medium">Music</h2>
          <Text k="songTitle" label="Song title" />
          <Media k="songCover" label="Cover art" accept="image/*" />
          <Media k="songUrl" label="Song file (mp3)" accept="audio/*" />
        </section>

        <section className="glass space-y-3 rounded-2xl p-5">
          <h2 className="font-medium">Socials</h2>
          {p.socials.map((s, i) => (
            <div key={i} className="flex gap-2">
              <input className="field w-32" value={s.label} onChange={(e) => set("socials", p.socials.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} />
              <input className="field flex-1" value={s.url} onChange={(e) => set("socials", p.socials.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} />
              <button className="px-2 text-muted-foreground hover:text-destructive" onClick={() => set("socials", p.socials.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          <button className="text-sm text-muted-foreground hover:text-foreground" onClick={() => set("socials", [...p.socials, { label: "New", url: "https://" }])}>+ Add link</button>
        </section>

        <div className="flex items-center gap-3">
          <button onClick={save} className="rounded-lg bg-primary px-5 py-2 font-medium text-primary-foreground">Save</button>
          <button onClick={() => setP(defaultProfile)} className="text-sm text-muted-foreground">Reset</button>
          <span className="text-sm">{msg}</span>
        </div>
      </div>
    </main>
  );
}
