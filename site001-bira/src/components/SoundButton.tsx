import { resumeBlockedVideo, useSound } from "../lib/sound";

export function SoundButton() {
  const { muted, setMuted } = useSound();
  return <button type="button" className={`sound-toggle ${muted ? "is-muted" : ""}`}
    aria-label={muted ? "소리 켜기" : "소리 끄기"} aria-pressed={muted}
    title={muted ? "소리 켜기" : "소리 끄기"} onClick={() => {
      setMuted(!muted);
      resumeBlockedVideo();
    }}>
    <svg viewBox="0 0 40 36" width="34" height="32" aria-hidden="true" focusable="false">
      <path d="M5 13h8L24 4v28L13 23H5z" fill="currentColor" stroke="#1c1c1c" strokeWidth="3" strokeLinejoin="round" />
      {!muted && <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
        <path d="M29 11q7 7 0 14" /><path d="M34 6q11 12 0 24" />
      </g>}
      {muted && <><path d="M6 32 34 4" stroke="#1c1c1c" strokeWidth="7" strokeLinecap="round" /><path d="M6 32 34 4" stroke="#E63B2E" strokeWidth="4" strokeLinecap="round" /></>}
    </svg>
  </button>;
}
