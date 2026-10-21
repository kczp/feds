import { useEffect, useState } from "react";
import bg from "@/assets/bg.jpg";
import pfp from "@/assets/pfp.jpg";

export type Social = { label: string; url: string };
export type Profile = {
  name: string;
  status: string;
  location: string;
  avatar: string;
  background: string;
  bgIsVideo?: boolean;
  songTitle: string;
  songCover: string;
  songUrl: string;
  socials: Social[];
};

export const defaultProfile: Profile = {
  name: "wl.b",
  status: "chillin",
  location: "Mayfair",
  avatar: pfp,
  background: bg,
  songTitle: "No Auto",
  songCover: pfp,
  songUrl: "",
  socials: [
    { label: "Instagram", url: "https://instagram.com" },
    { label: "TikTok", url: "https://tiktok.com" },
    { label: "Discord", url: "https://discord.com" },
  ],
};

const KEY = "bio-profile";

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...defaultProfile, ...JSON.parse(raw) };
  } catch {}
  return defaultProfile;
}

export const MEDIA = ["avatar", "background", "songCover", "songUrl"] as const;
export type MediaKey = (typeof MEDIA)[number];

function db() {
  return new Promise<IDBDatabase>((res, rej) => {
    const r = indexedDB.open("bio-media", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("files");
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
export async function putFile(k: string, f: Blob) {
  const d = await db();
  await new Promise((res, rej) => {
    const t = d.transaction("files", "readwrite");
    t.objectStore("files").put(f, k);
    t.oncomplete = res; t.onerror = () => rej(t.error);
  });
}
async function getFile(k: string): Promise<Blob | undefined> {
  const d = await db();
  return new Promise((res) => {
    const r = d.transaction("files").objectStore("files").get(k);
    r.onsuccess = () => res(r.result); r.onerror = () => res(undefined);
  });
}

// Uploaded files live in IndexedDB; profile fields store "idb:<key>".
export function saveProfile(p: Profile) {
  const out = { ...p };
  for (const k of MEDIA) if (out[k].startsWith("blob:")) out[k] = "idb:" + k;
  localStorage.setItem(KEY, JSON.stringify(out));
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  useEffect(() => {
    (async () => {
      const p = loadProfile();
      for (const k of MEDIA) {
        if (p[k].startsWith("idb:")) {
          const b = await getFile(k);
          p[k] = b ? URL.createObjectURL(b) : defaultProfile[k];
        }
      }
      setProfile(p);
    })();
  }, []);
  return [profile, setProfile] as const;
}

export function useViews() {
  const [views, setViews] = useState(0);
  useEffect(() => {
    const n = Number(localStorage.getItem("bio-views") || "248") + 1;
    localStorage.setItem("bio-views", String(n));
    setViews(n);
  }, []);
  return views;
}
