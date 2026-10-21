import { useEffect, useState } from "react";

type Activity = {
  type: number; name: string; details?: string; state?: string;
  application_id?: string; assets?: { large_image?: string };
};
type Lanyard = {
  discord_user: { id: string; username: string; global_name?: string; avatar?: string };
  discord_status: "online" | "idle" | "dnd" | "offline";
  activities: Activity[];
  listening_to_spotify: boolean;
  spotify?: { song: string; artist: string; album_art_url: string };
};

const statusColor: Record<string, string> = {
  online: "bg-status-online", idle: "bg-status-idle", dnd: "bg-status-dnd", offline: "bg-status-offline",
};

function assetUrl(a: Activity) {
  const img = a.assets?.large_image;
  if (!img) return undefined;
  if (img.startsWith("mp:external/")) return `https://media.discordapp.net/external/${img.slice(12)}`;
  if (img.startsWith("spotify:")) return `https://i.scdn.co/image/${img.slice(8)}`;
  return `https://cdn.discordapp.com/app-assets/${a.application_id}/${img}.png`;
}

export function DiscordPresence({ userId }: { userId: string }) {
  const [d, setD] = useState<Lanyard | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    const load = () =>
      fetch(`https://api.lanyard.rest/v1/users/${userId}`)
        .then((r) => r.json())
        .then((j) => { if (!alive) return; if (j.success) { setD(j.data); setErr(false); } else setErr(true); })
        .catch(() => alive && setErr(true));
    load();
    const t = setInterval(load, 15000);
    return () => { alive = false; clearInterval(t); };
  }, [userId]);

  if (!userId || err || !d) return null;
  const u = d.discord_user;
  const avatar = u.avatar
    ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.${u.avatar.startsWith("a_") ? "gif" : "png"}?size=128`
    : "https://cdn.discordapp.com/embed/avatars/0.png";
  const custom = d.activities.find((a) => a.type === 4);
  const act = d.activities.find((a) => a.type !== 4);

  let line = custom?.state ?? "";
  let sub = "";
  let art: string | undefined;
  if (d.listening_to_spotify && d.spotify) {
    line = `Listening to ${d.spotify.song}`; sub = `by ${d.spotify.artist}`; art = d.spotify.album_art_url;
  } else if (act) {
    line = `Playing ${act.name}`; sub = [act.details, act.state].filter(Boolean).join(" · "); art = assetUrl(act);
  }

  return (
    <div className="glass flex min-w-64 max-w-sm items-center gap-3 rounded-2xl px-3 py-2.5">
      <div className="relative shrink-0">
        <img src={avatar} alt="" className="h-14 w-14 rounded-full object-cover" />
        <span className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-background ${statusColor[d.discord_status]}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{u.global_name || u.username}</div>
        {line && <div className="truncate text-xs text-muted-foreground">{line}</div>}
        {sub && <div className="truncate text-xs text-muted-foreground">{sub}</div>}
      </div>
      {art && <img src={art} alt="" className="h-11 w-11 shrink-0 rounded-md object-cover" />}
    </div>
  );
}
