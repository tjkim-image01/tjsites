import { playWithSound, useSound } from "../lib/sound";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { EPISODES, episodeById, fmtSec } from "../data/episodes";
import { productByCode, thumb, useProducts } from "../lib/products";
import { ProductCard } from "../components/ProductCard";
import { Bubble, Char, Sfx } from "../components/Chars";

function DesktopWatchPage() {
  const { muted, setMuted } = useSound();
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
      playWithSound(v);
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
            muted={muted}
            onVolumeChange={ev => setMuted(ev.currentTarget.muted)}
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
                      playWithSound(ref.current);
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


function FeedEpisode({ episode, startAt = 0 }: { episode: (typeof EPISODES)[number]; startAt?: number }) {
  const video = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);
  const { muted, setMuted } = useSound();
  const items = episode.items.map(c => productByCode(c)).filter(p => p && p.visible !== false);
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const observer = new IntersectionObserver(([entry]) => {
      const visible = entry.isIntersecting && entry.intersectionRatio >= 0.65;
      setActive(visible);
      if (visible) playWithSound(v);
      else { delete v.dataset.playBlocked; v.pause(); }
    }, { threshold: 0.65 });
    observer.observe(v);
    return () => { observer.disconnect(); v.pause(); };
  }, []);
  useEffect(() => {
    const v = video.current;
    if (!v || !active) return;
    const onVisibility = () => { if (document.hidden) v.pause(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [active]);
  return (
    <article className="feed-episode" aria-label={`${episode.no}편 ${episode.title}`}>
      <div className="feed-heading"><span className="ep-chip">{episode.no}편</span><h1>{episode.title}</h1></div>
      <p className="feed-hook">{episode.hook}</p>
      <div className={`feed-player ${episode.vertical ? "v" : "h"}`}>
        <video ref={video} src={`videos/${episode.file}`} poster={`covers/${episode.cover}.jpg`}
          controls playsInline muted={muted} preload="none"
          onLoadedMetadata={() => { if (video.current && startAt > 0) video.current.currentTime = startAt; }}
          onVolumeChange={ev => setMuted(ev.currentTarget.muted)} />
      </div>
      {episode.chapters && <div className="chapters feed-chapters">{episode.chapters.map(([seconds, title]) =>
        <button type="button" className="chap" key={seconds} onClick={() => {
          if (video.current) { video.current.currentTime = seconds; playWithSound(video.current); }
        }}>{fmtSec(seconds)} {title}</button>)}</div>}
      <section className="feed-products" aria-label={`${episode.no}편에 나온 상품`}>
        <h2>이 영상에 나온 상품</h2>
        <div className="side-list">{items.map((p, i) => p && <ProductCard key={p.code} p={p} i={i} compact />)}</div>
      </section>
    </article>
  );
}

function MobileWatchPage() {
  useProducts(false);
  const { ep = "S" } = useParams();
  const [sp] = useSearchParams();
  const index = Math.max(0, EPISODES.findIndex(e => e.id === ep));
  const episodes = [...EPISODES.slice(index), ...EPISODES.slice(0, index)];
  return <section className="mobile-feed stage cream" key={ep}>
    <p className="feed-intro">아래로 넘기며 영상과 상품을 함께 보세요.</p>
    {episodes.map((e, i) => <FeedEpisode key={e.id} episode={e} startAt={i === 0 ? Number(sp.get("t")) || 0 : 0} />)}
  </section>;
}

export default function WatchPage() {
  const [mobile, setMobile] = useState(() => window.matchMedia("(max-width: 960px)").matches);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 960px)");
    const update = () => setMobile(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return mobile ? <MobileWatchPage /> : <DesktopWatchPage />;
}
