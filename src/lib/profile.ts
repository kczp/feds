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

export function saveProfile(p: Profile) {
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  useEffect(() => setProfile(loadProfile()), []);
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
