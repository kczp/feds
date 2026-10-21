import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SocialIcon } from "@/components/SocialIcon";
import { defaultProfile, putFile, saveProfile, useProfile, type MediaKey, type Profile } from "@/lib/profile";

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


function Dashboard() {
  const [p, setP] = useProfile();
  const [msg, setMsg] = useState("");
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP({ ...p, [k]: v });

  const save = () => {
    try { saveProfile(p); setMsg("Saved!"); }
    catch { setMsg("Too big to save — try a smaller file or paste a link instead."); }
    setTimeout(() => setMsg(""), 3000);
  };

  const Text = ({ k, label }: { k: "name" | "location" | "songTitle" | "discordId"; label: string }) => (
    <label className="block space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input className="field" defaultValue={p[k]} key={p[k] + k} onBlur={(e) => set(k, e.target.value)} />
    </label>
  );

  const Media = ({ k, label, accept, hint }: { k: MediaKey; label: string; accept: string; hint: string }) => (
    <div className="space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <label className="glass flex cursor-pointer items-center justify-between rounded-lg px-4 py-3 text-sm">
        <span className="text-muted-foreground">{hint}</span>
        <span>Choose file</span>
        <input type="file" accept={accept} hidden onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          await putFile(k, f);
          const url = URL.createObjectURL(f);
          setP((cur) => ({ ...cur, [k]: url, ...(k === "background" ? { bgIsVideo: f.type.startsWith("video") } : {}) }));
        }} />
      </label>
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
            <div className="flex-1"><Media k="avatar" label="Profile picture" accept="image/*" hint="PNG, JPG, GIF, WEBP" /></div>
          </div>
          <Text k="name" label="Name" />
                    <Text k="location" label="Location" />
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
          <button onClick={save} className="rounded-lg bg-primary px-5 py-2 font-medium text-primary-foreground">Save</button>
          <button onClick={() => setP(defaultProfile)} className="text-sm text-muted-foreground">Reset</button>
          <span className="text-sm">{msg}</span>
        </div>
      </div>
    </main>
  );
}
