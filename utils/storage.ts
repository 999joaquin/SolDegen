"use client";

export type CachedProfile = { username: string; email: string; };

const keyFor = (address: string) => `profile:${address}`;

export function saveProfile(address: string, profile: CachedProfile) {
  if (!address) return;
  try {
    localStorage.setItem(keyFor(address), JSON.stringify(profile));
  } catch {}
}

export function loadProfile(address: string): CachedProfile | null {
  if (!address) return null;
  try {
    const raw = localStorage.getItem(keyFor(address));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedProfile;
    if (!parsed?.username || !parsed?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearProfile(address: string) {
  if (!address) return;
  try {
    localStorage.removeItem(keyFor(address));
  } catch {}
}