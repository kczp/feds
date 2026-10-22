import { useEffect, useState } from "react";
import { queryOptions } from "@tanstack/react-query";
import bg from "@/assets/bg.jpg";
import pfp from "@/assets/pfp.jpg";
import { getSharedProfile } from "./site.functions";

export type Social = { label: string; url: string };
export type Profile = {
  name: string;
  status: string;
  discordId: string;
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
  discordId: "",
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

export const MEDIA = ["avatar", "background", "songCover", "songUrl"] as const;
export type MediaKey = (typeof MEDIA)[number];

// Shared profile from the server — the single source of truth.
export const profileQuery = queryOptions({
  queryKey: ["shared-profile"],
  queryFn: async () => {
    const { data } = await getSharedProfile();
    return { ...defaultProfile, ...(data as Partial<Profile>) } as Profile;
  },
});
export const hasServerProfile = (p: object) => Object.keys(p).length > 0;

// ---- One-time migration of the old browser-only profile ----
const KEY = "bio-profile";
function idb() {
  return new Promise<IDBDatabase>((res, rej) => {
    const r = indexedDB.open("bio-media", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("files");
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function getLegacyFile(k: string): Promise<Blob | undefined> {
  const d = await idb();
  return new Promise((res) => {
    const r = d.transaction("files").objectStore("files").get(k);
    r.onsuccess = () => res(r.result); r.onerror = () => res(undefined);
  });
}
export async function readLegacyProfile(): Promise<{ profile: Partial<Profile>; files: Partial<Record<MediaKey, Blob>> } | null> {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const profile = JSON.parse(raw) as Partial<Profile>;
    const files: Partial<Record<MediaKey, Blob>> = {};
    for (const k of MEDIA) {
      const v = profile[k];
      if (typeof v === "string" && v.startsWith("idb:")) {
        delete profile[k];
        const b = await getLegacyFile(k).catch(() => undefined);
        if (b) files[k] = b;
      } else if (typeof v === "string" && v.startsWith("blob:")) delete profile[k];
    }
    return { profile, files };
  } catch { return null; }
}
export function clearLegacyProfile() {
  localStorage.removeItem(KEY);
  try { indexedDB.deleteDatabase("bio-media"); } catch {}
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
