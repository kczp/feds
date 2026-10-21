import { Link2 } from "lucide-react";
import {
  SiInstagram, SiTiktok, SiDiscord, SiYoutube, SiX, SiSpotify, SiSoundcloud, SiTwitch,
  SiGithub, SiSnapchat, SiTelegram, SiReddit, SiFacebook, SiThreads, SiPinterest, SiSteam, SiApplemusic, SiKick, SiRoblox,
} from "react-icons/si";
import type { IconType } from "react-icons";

const map: [string, IconType][] = [
  ["instagram", SiInstagram], ["tiktok", SiTiktok], ["discord", SiDiscord], ["youtu", SiYoutube],
  ["twitter", SiX], ["x.com", SiX], ["spotify", SiSpotify], ["soundcloud", SiSoundcloud], ["twitch", SiTwitch],
  ["github", SiGithub], ["snapchat", SiSnapchat], ["t.me", SiTelegram], ["telegram", SiTelegram], ["reddit", SiReddit],
  ["facebook", SiFacebook], ["threads", SiThreads], ["pinterest", SiPinterest], ["steam", SiSteam],
  ["music.apple", SiApplemusic], ["kick.com", SiKick], ["roblox", SiRoblox],
];

export function SocialIcon({ url, className }: { url: string; className?: string }) {
  const u = url.toLowerCase();
  const Icon = map.find(([k]) => u.includes(k))?.[1];
  return Icon ? <Icon className={className} /> : <Link2 className={className} />;
}
