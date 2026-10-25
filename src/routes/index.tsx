import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Eye, MapPin, Pause, Play, Settings, Volume2, VolumeX } from "lucide-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { profileQuery, useViews } from "@/lib/profile";
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
  loader: ({ context }) => context.queryClient.ensureQueryData(profileQuery),
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
  const { data: p } = useSuspenseQuery(profileQuery);
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
  const langs = p.languages.split(",").map((x) => x.trim()).filter(Boolean);
  const badges = p.badges.split(",").map((x) => x.trim()).filter(Boolean);
  const gear = p.setup.filter((g) => !g.hidden && g.name);
  const cardStyle = { backgroundColor: `color-mix(in oklab, var(--card) ${p.cardOpacity}%, transparent)`, borderColor: `color-mix(in oklab, ${p.accent} 25%, transparent)` };
  const pages = gear.length ? ["Profile", "Gaming Setup"] : ["Profile"];
  const [page, setPage] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const go = (i: number) => scroller.current?.children[i]?.scrollIntoView({ behavior: "smooth" });

  return (
    <main className="relative h-screen overflow-hidden bg-background text-foreground">
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
          className="absolute inset-0 z-30 flex items-center justify-center bg-background/70 text-lg tracking-widest backdrop-blur-md">
          click to enter
        </button>
      )}

      {pages.length > 1 && (
        <nav className="absolute right-4 top-1/2 z-20 flex -translate-y-1/2 flex-col items-end gap-3">
          {pages.map((n, i) => (
            <button key={n} onClick={() => go(i)} aria-label={n} className="group flex items-center gap-2 text-xs text-muted-foreground">
              <span className="opacity-0 transition group-hover:opacity-100">{String(i + 1).padStart(2, "0")} {n}</span>
              <span className="block h-2 rounded-full transition-all" style={{ width: page === i ? 20 : 8, backgroundColor: page === i ? p.accent : "var(--muted-foreground)" }} />
            </button>
          ))}
        </nav>
      )}

      <div ref={scroller} onScroll={(e) => setPage(Math.round(e.currentTarget.scrollTop / e.currentTarget.clientHeight))}
        className="relative h-full snap-y snap-mandatory overflow-y-auto">
        <section className="flex min-h-screen snap-start flex-col items-center justify-center gap-4 px-4 pb-28">
          {p.intro && <p className="text-sm tracking-[0.3em] text-muted-foreground">{p.intro}</p>}
          <div className="w-full max-w-md space-y-4 rounded-3xl border p-6 backdrop-blur-xl" style={cardStyle}>
            <div className="flex items-center gap-4">
              <img src={p.avatar} alt={p.name} className="h-20 w-20 rounded-full object-cover ring-2" style={{ ["--tw-ring-color" as string]: p.accent }} />
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-semibold tracking-tight">{p.name}</h1>
                {p.username && <div className="text-sm text-muted-foreground">@{p.username}</div>}
                {badges.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {badges.map((b) => <span key={b} className="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider" style={{ borderColor: p.accent, color: p.accent }}>{b}</span>)}
                  </div>
                )}
              </div>
            </div>
            {p.bio && <p className="text-sm text-foreground/90">{p.bio}</p>}
            {langs.length > 0 && (
              <div className="flex flex-wrap gap-1.5">{langs.map((l) => <span key={l} className="rounded-md bg-foreground/10 px-2 py-0.5 text-xs">{l}</span>)}</div>
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
            <div className="flex items-center justify-between border-t border-foreground/10 pt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{views}</span>
              {p.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{p.location}</span>}
              {p.uid && <span>UID {p.uid}</span>}
            </div>
          </div>
          {pages.length > 1 && (
            <button onClick={() => go(1)} className="animate-bounce pt-2 text-muted-foreground" aria-label="Scroll down"><ChevronDown className="h-5 w-5" /></button>
          )}
        </section>

        {gear.length > 0 && (
          <section className="flex min-h-screen snap-start flex-col items-center justify-center gap-6 px-4 pb-28">
            <h2 className="text-2xl font-semibold tracking-tight">Gaming Setup</h2>
            <div className={`grid w-full max-w-2xl gap-3 ${p.setupCompact ? "grid-cols-2 sm:grid-cols-3" : "sm:grid-cols-2"}`}>
              {gear.map((g, i) => {
                const body = (
                  <div className="h-full rounded-2xl border p-4 backdrop-blur-xl transition hover:-translate-y-0.5" style={cardStyle}>
                    <div className="text-[10px] uppercase tracking-widest" style={{ color: p.accent }}>{g.category}</div>
                    <div className="mt-1 font-medium">{g.name}</div>
                    {!p.setupCompact && g.brand && <div className="text-xs text-muted-foreground">{g.brand}</div>}
                  </div>
                );
                return g.link ? <a key={i} href={g.link} target="_blank" rel="noreferrer">{body}</a> : <div key={i}>{body}</div>;
              })}
            </div>
          </section>
        )}
      </div>

      {p.songUrl && (
        <div className="pointer-events-none absolute inset-x-0 bottom-6 z-20 flex justify-center px-4">
          <div className="pointer-events-auto w-full max-w-md">
            <Player audio={audio} title={p.songTitle} cover={p.songCover} playing={playing} onToggle={toggle} />
          </div>
        </div>
      )}
    </main>
  );
}
