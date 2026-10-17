import { useSyncExternalStore } from "react";

// Shared for every player; a fresh visit starts with sound enabled.
let muted = false;
const listeners = new Set<() => void>();
export function setSoundMuted(value: boolean) {
  if (value === muted) return;
  muted = value;
  document.querySelectorAll("video").forEach(v => { v.muted = value; });
  listeners.forEach(listener => listener());
}
export function useSound() {
  const value = useSyncExternalStore(listener => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, () => muted, () => false);
  return { muted: value, setMuted: setSoundMuted };
}
export function playWithSound(video: HTMLVideoElement) {
  video.muted = muted;
  video.play().then(() => { delete video.dataset.playBlocked; }).catch(error => {
    if (error instanceof DOMException && error.name === "NotAllowedError") video.dataset.playBlocked = "true";
  });
}
export function resumeBlockedVideo() {
  if (document.hidden) return;
  document.querySelectorAll<HTMLVideoElement>('video[data-play-blocked="true"]').forEach(video => {
    const box = video.getBoundingClientRect();
    const visible = Math.max(0, Math.min(box.bottom, window.innerHeight) - Math.max(box.top, 0));
    if (box.height > 0 && visible / box.height >= 0.65) playWithSound(video);
  });
}
