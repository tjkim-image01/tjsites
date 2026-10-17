import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { EPISODES, episodeById, fmtSec } from "../data/episodes";
import { productByCode, thumb, useProducts } from "../lib/products";
import { ProductCard } from "../components/ProductCard";
import { Bubble, Char, Sfx } from "../components/Chars";

export default function WatchPage() {
  useProducts(false);
  const { ep = "S" } = useParams();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const e = episodeById(ep) ?? EPISODES[0];
  const ref = useRef<HTMLVideoElement>(null);
  const [t, setT] = useState(0);
  const idx = EPISODES.findIndex((x) => x.id === e.id);
  const next = EPISODES[(idx + 1) % EPISODES.length];
  const items = e.items
    .map((c) => productByCode(c))
    .filter((p): p is NonNullable<typeof p> => !!p && p.visible !== false);
  const nowCue = [...e.cues].reverse().find(([s]) => t >= s)?.[1];
  const nowItem = nowCue ? productByCode(nowCue) : undefined;

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const at = Number(sp.get("t") || 0);
    const onLoaded = () => {
      if (at > 0) v.currentTime = at;
      v.play().catch(() => {});
    };
    v.addEventListener("loadedmetadata", onLoaded);
    v.load();
    return () => v.removeEventListener("loadedmetadata", onLoaded);
  }, [e.id, sp]);

  return (
    <section className={`watch stage ${e.vertical ? "pink" : "sky"}`}>
      <div className="watch-in">
        <aside className="watch-side left">
          <Bubble who="태진" tail="bottom">
            {e.hook}
          </Bubble>
          <Char who="태진" pose="POINT" h={360} />
        </aside>

        <div className={`player ${e.vertical ? "v" : "h"}`}>
          <div className="player-head">
            <span className="ep-chip">{e.no}편</span>
            <h1>{e.title}</h1>
          </div>
          <video
            ref={ref}
            src={`videos/${e.file}`}
            poster={`covers/${e.cover}.jpg`}
            controls
            playsInline
            onTimeUpdate={(ev) => setT(ev.currentTarget.currentTime)}
            onEnded={() => nav(`/watch/${next.id}`)}
          />
          {nowItem && (
            <Link to={`/shop/${nowItem.code}`} className="now-chip">
              <img src={thumb(nowItem)} alt="" />
              <span>
                지금 화면의 삐라 → <b>{nowItem.title}</b>
              </span>
            </Link>
          )}
          {e.chapters && (
            <div className="chapters">
              {e.chapters.map(([s, name]) => (
                <button
                  type="button"
                  key={s}
                  className={`chap ${t >= s ? "on" : ""}`}
                  onClick={() => {
                    if (ref.current) {
                      ref.current.currentTime = s;
                      ref.current.play();
                    }
                  }}
                >
                  {fmtSec(s)} {name}
                </button>
              ))}
            </div>
          )}
          <div className="player-next">
            <span>다음 편</span>
            <Link to={`/watch/${next.id}`} className="btn ink">
              {next.no}편 {next.title} →
            </Link>
          </div>
        </div>

        <aside className="watch-side right">
          <h2 className="h3">
            <Sfx
              text="이 영상에 나온 삐라"
              size={22}
              rot={-4}
              fill="var(--yellow)"
              color="var(--ink)"
            />
          </h2>
          <div className="side-list">
            {items.map((p, i) => (
              <ProductCard key={p.code} p={p} i={i} compact />
            ))}
          </div>
        </aside>
      </div>
      <div className="wrap ep-strip">
        {EPISODES.map((x) => (
          <Link
            key={x.id}
            to={`/watch/${x.id}`}
            className={`ep-mini ${x.id === e.id ? "on" : ""}`}
          >
            <img src={`covers/${x.cover}.jpg`} alt="" />
            <span>{x.no}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
