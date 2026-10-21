import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Eye, MapPin, Pause, Play, Settings, Volume2, VolumeX } from "lucide-react";
import { useProfile, useViews } from "@/lib/profile";
import { SocialIcon } from "@/components/SocialIcon";
import { DiscordPresence } from "@/components/DiscordPresence";

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
  isFinite(s) && s > 0 ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "0:00";

function Player({ audio, title, cover, playing, onToggle }: {
  audio: React.RefObject<HTMLAudioElement | null>; title: string; cover: string; playing: boolean; onToggle: () => void;
}) {
  const bar = useRef<HTMLDivElement>(null);
  const cur = useRef<HTMLSpanElement>(null);
  const [dur, setDur] = useState(0);
  const [muted, setMuted] = useState(false);

  // Progress is painted with rAF directly on the DOM so React never re-renders during playback.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const a = audio.current;
      if (a && bar.current && cur.current) {
        const d = a.duration || 0;
        if (d && d !== dur) setDur(d);
        bar.current.style.width = d ? `${(a.currentTime / d) * 100}%` : "0%";
        cur.current.textContent = fmt(a.currentTime);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [audio, dur]);

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audio.current;
    if (!a || !a.duration) return;
    const r = e.currentTarget.getBoundingClientRect();
    a.currentTime = ((e.clientX - r.left) / r.width) * a.duration;
  };

  return (
    <div className="glass flex w-full max-w-md items-center gap-3 rounded-2xl p-2.5">
      <img src={cover} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{title}</div>
        <div className="mt-1.5 flex items-center gap-2 text-[11px] tabular-nums text-muted-foreground">
          <span ref={cur}>0:00</span>
          <div onClick={seek} className="relative h-1 flex-1 cursor-pointer rounded-full bg-foreground/20">
            <div ref={bar} className="absolute inset-y-0 left-0 rounded-full bg-foreground" />
          </div>
          <span>{fmt(dur)}</span>
        </div>
      </div>
      <button aria-label="Mute" className="text-muted-foreground hover:text-foreground"
        onClick={() => { if (audio.current) { audio.current.muted = !muted; setMuted(!muted); } }}>
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
      <button aria-label="Play/pause" onClick={onToggle}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition hover:scale-105">
        {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
      </button>
    </div>
  );
}

function Index() {
  const [p] = useProfile();
  const views = useViews();
  const [entered, setEntered] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  const play = () => {
    const a = audio.current;
    if (!a || !p.songUrl) return;
    a.volume = 0.6;
    a.play().then(() => setPlaying(true)).catch(() => {});
  };
  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) play(); else { a.pause(); setPlaying(false); }
  };

  const links = p.socials.filter((s) => s.url && s.url !== "https://");

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {p.bgIsVideo ? (
        <video src={p.background} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <img src={p.background} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      <div className="absolute inset-0 bg-background/40" />
      <audio ref={audio} src={p.songUrl || undefined} loop preload="auto" />

      <Link to="/dashboard" aria-label="Dashboard" className="absolute right-4 top-4 z-20 rounded-full p-2 text-muted-foreground transition hover:text-foreground">
        <Settings className="h-5 w-5" />
      </Link>

      {!entered && (
        <button onClick={() => { setEntered(true); play(); }}
          className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 text-lg tracking-widest backdrop-blur-md">
          click to enter
        </button>
      )}

      <div className="relative flex min-h-screen flex-col items-center justify-center gap-4 px-4 pb-28">
        <img src={p.avatar} alt={p.name} className="h-32 w-32 rounded-full object-cover shadow-2xl" />
        <h1 className="text-3xl font-semibold tracking-tight">{p.name}</h1>
        {p.location && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-4 w-4" />{p.location}</div>
        )}
        <DiscordPresence userId={p.discordId} />
        {links.length > 0 && (
          <div className="flex flex-wrap justify-center gap-4 pt-1">
            {links.map((s, i) => (
              <a key={i} href={s.url} target="_blank" rel="noreferrer" aria-label={s.url}
                className="text-foreground/80 transition hover:scale-110 hover:text-foreground">
                <SocialIcon url={s.url} className="h-6 w-6" />
              </a>
            ))}
          </div>
        )}
        <div className="flex items-center gap-1 text-xs text-muted-foreground"><Eye className="h-3.5 w-3.5" />{views}</div>
      </div>

      {p.songUrl && (
        <div className="absolute inset-x-0 bottom-6 flex justify-center px-4">
          <Player audio={audio} title={p.songTitle} cover={p.songCover} playing={playing} onToggle={toggle} />
        </div>
      )}
    </main>
  );
}
