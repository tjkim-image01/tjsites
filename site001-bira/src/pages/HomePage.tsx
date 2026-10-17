import { Link } from "react-router-dom";
import { EPISODES, fmtSec } from "../data/episodes";
import { GROUPS, groupName, thumb, useProducts } from "../lib/products";
import { Bubble, Char, LeafRain, Sfx, Stamp } from "../components/Chars";
import { ProductCard } from "../components/ProductCard";

export default function HomePage() {
  const products = useProducts(false);
  const featured = products.filter((p) => p.featured);
  const rainSrcs = featured.map((p) => p.images[0]).filter(Boolean);
  const long = EPISODES.find((e) => e.id === "long")!;
  return (
    <>
      <section className="hero stage sky">
        <LeafRain srcs={rainSrcs} n={16} />
        <div className="hero-in">
          <div className="hero-char left">
            <Char who="태진" pose="POINT" h={420} hoverPose="LAUGH" />
          </div>
          <div className="hero-mid">
            <Stamp text="티제이 김 컬렉션 · 삐라 100장+" color="var(--ink)" rot={-3} />
            <h1 className="hero-title">
              삐라 주워서
              <br />
              공책 받아 봤어?
            </h1>
            <Bubble who="옥자" tail="bottom">
              영상 보다가, 마음에 들면 <b>담아 가세요</b>. 요즘은 주워도 공책 안 줘요.
            </Bubble>
            <div className="hero-cta">
              <Link to="/watch/S" className="btn big red">
                ▶ 영상 보기
              </Link>
              <Link to="/shop" className="btn big yellow">
                삐라 구경
              </Link>
            </div>
          </div>
          <div className="hero-char right">
            <Char who="옥자" pose="SURPRISE" h={430} flip hoverPose="LAUGH" />
          </div>
        </div>
        <div className="hero-video">
          <video
            src={`videos/${long.file}`}
            poster={`covers/${long.cover}.jpg`}
            autoPlay
            muted
            loop
            playsInline
            controls
          />
          <Link to="/watch/long" className="hero-video-label">
            롱폼 4분 — 소리 켜고 보기 →
          </Link>
        </div>
      </section>

      <section className="stage yellow band">
        <div className="wrap">
          <h2 className="h2">
            <Sfx text={`${EPISODES.length}편`} size={34} rot={-6} /> 에피소드
          </h2>
          <div className="ep-row">
            {EPISODES.map((e) => (
              <Link
                key={e.id}
                to={`/watch/${e.id}`}
                className={`ep-card ${e.vertical ? "v" : "h"}`}
              >
                <img src={`covers/${e.cover}.jpg`} alt={e.title} loading="lazy" />
                <div className="ep-no">{e.no}</div>
                <div className="ep-txt">
                  <b>{e.title}</b>
                  <span>
                    {e.hook} · {fmtSec(e.seconds)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="stage cream band">
        <div className="wrap">
          <h2 className="h2">
            영상에 나온 <span className="hl">그 장</span>
          </h2>
          <p className="lead">
            태진이 화면에서 들고 있던 바로 그 삐라. 담으면 구매 문의로 이어집니다.
          </p>
          <div className="grid">
            {featured.slice(0, 12).map((p, i) => (
              <ProductCard key={p.code} p={p} i={i} />
            ))}
          </div>
          <div className="center">
            <Link to="/shop" className="btn big ink">
              전부 보기 ({products.length}점)
            </Link>
          </div>
        </div>
      </section>

      <section className="stage mint band">
        <div className="wrap">
          <h2 className="h2">주제별로</h2>
          <div className="group-row">
            {GROUPS.filter((g) => g[0] !== "featured").map(([g], i) => {
              const ps = products.filter((p) => p.group === g);
              if (!ps.length) return null;
              return (
                <Link
                  key={g}
                  to={`/shop?g=${g}`}
                  className="group-card"
                  style={{ ["--rot" as string]: `${((i % 3) - 1) * 2}deg` }}
                >
                  <img src={thumb(ps[0])} alt="" loading="lazy" />
                  <b>{groupName(g)}</b>
                  <span>{ps.length}점</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="stage ink band dark">
        <div className="wrap howto">
          <Char who="옥자" pose="POINT" h={300} flip />
          <div>
            <h2 className="h2 light">구매는 이렇게</h2>
            <ol className="steps">
              <li>
                <b>1</b> 영상 보다가 마음에 드는 삐라를 <b>담기</b>
              </li>
              <li>
                <b>2</b> 담은 것에서 <b>구매 문의하기</b> — 시트 접수 또는 메일로 보냅니다
              </li>
              <li>
                <b>3</b> 담당자가 가격·상태·배송을 안내합니다 (실결제 없음)
              </li>
            </ol>
          </div>
          <Char who="태진" pose="LAUGH" h={300} />
        </div>
      </section>
    </>
  );
}
