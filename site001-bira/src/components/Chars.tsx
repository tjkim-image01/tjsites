// 캐릭터(태진·옥자 이모) + 말풍선 + 효과음 글자 + 도장
import { useEffect, useState } from "react";

export type Pose = "BASE" | "SURPRISE" | "LAUGH" | "POINT";
export const WHO = { 태진: { key: "TAEJIN", color: "var(--blue)" }, 옥자: { key: "OKJA", color: "var(--red)" } } as const;

export function Char({ who, pose = "BASE", h = 320, flip, className = "", hoverPose = "LAUGH" }: { who: keyof typeof WHO; pose?: Pose; h?: number; flip?: boolean; className?: string; hoverPose?: Pose }) {
  const [p, setP] = useState<Pose>(pose);
  useEffect(() => setP(pose), [pose]);
  return (
    <img src={`chars/CHAR_${WHO[who].key}_${p}.png`} alt={who === "태진" ? "태진" : "옥자 이모"} height={h} className={`char ${className}`}
      style={{ height: h, transform: flip ? "scaleX(-1)" : undefined }} onMouseEnter={() => setP(hoverPose)} onMouseLeave={() => setP(pose)} draggable={false} />
  );
}

export function Bubble({ who, children, tail = "left", className = "" }: { who: keyof typeof WHO; children: React.ReactNode; tail?: "left" | "right" | "bottom"; className?: string }) {
  return (
    <div className={`bubble tail-${tail} ${className}`}>
      <span className="bubble-name" style={{ background: WHO[who].color }}>{who === "태진" ? "태진" : "옥자 이모"}</span>
      <div className="bubble-text">{children}</div>
    </div>
  );
}

/** 터지는 별 효과음 글자 */
export function Sfx({ text, fill = "var(--red)", color = "var(--yellow)", rot = -8, size = 40, className = "" }: { text: string; fill?: string; color?: string; rot?: number; size?: number; className?: string }) {
  return (
    <span className={`sfx ${className}`} style={{ ["--sfx-fill" as string]: fill, ["--sfx-color" as string]: color, transform: `rotate(${rot}deg)`, fontSize: size }}>
      <span className="sfx-star" aria-hidden />
      <span className="sfx-text">{text}</span>
    </span>
  );
}

export function Stamp({ text, color = "var(--red)", rot = -8, className = "" }: { text: string; color?: string; rot?: number; className?: string }) {
  return <span className={`stamp ${className}`} style={{ ["--stamp" as string]: color, transform: `rotate(${rot}deg)` }}>{text}</span>;
}

/** 배경에 떨어지는 삐라 (결정적 난수) */
export function LeafRain({ srcs, n = 14 }: { srcs: string[]; n?: number }) {
  const rnd = (i: number, k: number) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
  return (
    <div className="leafrain" aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <img key={i} src={`thumbs/${srcs[i % srcs.length]}`} alt="" style={{ left: `${rnd(i, 1) * 100}%`, width: 50 + rnd(i, 2) * 50, animationDelay: `${-rnd(i, 3) * 16}s`, animationDuration: `${14 + rnd(i, 4) * 10}s`, ["--r" as string]: `${rnd(i, 5) * 360}deg` }} />
      ))}
    </div>
  );
}
