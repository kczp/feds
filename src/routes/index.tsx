import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Eye, MapPin, Pause, Play, SkipBack, SkipForward, Settings } from "lucide-react";
import { useProfile, useViews } from "@/lib/profile";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "My Bio — Links & Socials" },
      { name: "description", content: "All my socials, music and vibes in one place." },
      { property: "og:title", content: "My Bio — Links & Socials" },
      { property: "og:description", content: "All my socials, music and vibes in one place." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const fmt = (s: number) =>
  isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "0:00";

function Index() {
  const [p] = useProfile();
  const views = useViews();
  const [entered, setEntered] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);

  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    const u = () => setT(a.currentTime);
    const d = () => setDur(a.duration);
    a.addEventListener("timeupdate", u);
    a.addEventListener("loadedmetadata", d);
    return () => {
      a.removeEventListener("timeupdate", u);
      a.removeEventListener("loadedmetadata", d);
    };
  }, [p.songUrl]);

  const toggle = () => {
    const a = audio.current;
    if (!a || !p.songUrl) return;
    if (a.paused) a.play().then(() => setPlaying(true)).catch(() => {});
    else { a.pause(); setPlaying(false); }
  };

  const enter = () => {
    setEntered(true);
    setTimeout(toggle, 50);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <img src={p.background} alt="" className="absolute inset-0 h-full w-full object-cover grayscale" />
      <div className="absolute inset-0 bg-background/40" />
      {p.songUrl && <audio ref={audio} src={p.songUrl} loop />}

      <Link to="/dashboard" aria-label="Dashboard" className="absolute right-4 top-4 z-20 rounded-full p-2 text-muted-foreground transition hover:text-foreground">
        <Settings className="h-5 w-5" />
      </Link>

      {!entered && (
        <button onClick={enter} className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 text-lg tracking-widest backdrop-blur-md">
          click to enter
        </button>
      )}

      <div className="relative flex min-h-screen flex-col items-center justify-center gap-5 px-4">
        <img src={p.avatar} alt={p.name} className="h-32 w-32 rounded-full object-cover shadow-2xl" />
        {p.location && (
          <div className="flex items-center gap-1 text-sm"><MapPin className="h-4 w-4 fill-foreground text-background" />{p.location}</div>
        )}
        <div className="glass flex items-center gap-3 rounded-2xl px-3 py-2 pr-8">
          <img src={p.avatar} alt="" className="h-16 w-16 rounded-full object-cover" />
          <div>
            <div className="text-lg font-semibold">{p.name}</div>
            <div className="text-xs text-muted-foreground">{p.status}</div>
          </div>
        </div>

        {p.socials.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {p.socials.map((s, i) => (
              <a key={i} href={s.url} target="_blank" rel="noreferrer" className="glass rounded-full px-4 py-1.5 text-sm transition hover:bg-foreground/15">
                {s.label}
              </a>
            ))}
          </div>
        )}

        <div className="w-full max-w-xl">
          <div className="mb-4 flex items-center gap-1 text-sm"><Eye className="h-4 w-4" />{views}</div>
          <div className="flex items-center gap-4">
            <img src={p.songCover} alt="" className="h-16 w-16 rounded-md object-cover" />
            <div className="flex-1">
              <div className="text-sm">{p.songTitle}</div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{fmt(t)}</span>
                <input type="range" min={0} max={dur || 0} step={0.1} value={t}
                  onChange={(e) => audio.current && (audio.current.currentTime = +e.target.value)}
                  className="h-0.5 flex-1 accent-foreground" />
                <span>{fmt(dur)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button aria-label="Restart" onClick={() => audio.current && (audio.current.currentTime = 0)}><SkipBack className="h-4 w-4 fill-foreground" /></button>
              <button aria-label="Play/pause" onClick={toggle}>
                {playing ? <Pause className="h-6 w-6 fill-foreground" /> : <Play className="h-6 w-6 fill-foreground" />}
              </button>
              <button aria-label="Skip" onClick={() => audio.current && (audio.current.currentTime = Math.min(dur, t + 10))}><SkipForward className="h-4 w-4 fill-foreground" /></button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
