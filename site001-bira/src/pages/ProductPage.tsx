import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { episodesOfItem } from "../data/episodes";
import {
  STATUS_LABELS,
  groupName,
  isReserved,
  isSoldOut,
  itemImageUrl,
  productByCode,
  useProducts,
} from "../lib/products";
import { useCart } from "../lib/cart";
import { ProductCard } from "../components/ProductCard";
import { Bubble, Char, Stamp } from "../components/Chars";

export default function ProductPage() {
  const { code = "" } = useParams();
  const products = useProducts(false);
  const p = productByCode(code, false);
  const nav = useNavigate();
  const { add, remove, has } = useCart();
  const [img, setImg] = useState(0);
  const [zoom, setZoom] = useState(false);

  useEffect(() => { setImg(0); setZoom(false); }, [code]);
  useEffect(() => {
    if (!zoom) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setZoom(false); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKey); };
  }, [zoom]);

  if (!p)
    return (
      <section className="wrap band">
        <h1 className="h2">그런 삐라는 없어요</h1>
        <Link to="/shop" className="btn ink">
          상품으로
        </Link>
      </section>
    );

  const sold = isSoldOut(p);
  const reserved = isReserved(p);
  const eps = episodesOfItem(p.code);
  const related = products
    .filter((x) => x.group === p.group && x.code !== p.code)
    .slice(0, 4);

  return (
    <section className="stage cream band product">
      <div className="wrap">
        <div className="crumbs">
          <Link to="/shop">상품</Link> ›{" "}
          <Link to={`/shop?g=${p.group}`}>{groupName(p.group)}</Link> › {p.code}
        </div>
        <div className="product-top">
          <div className="gallery">
            <button type="button" className="gallery-main" aria-label="상품 사진 크게 보기" onClick={() => setZoom(true)}>
              <img src={itemImageUrl(p.images[img] || p.images[0])} alt={p.title} />
              {sold ? (
                <Stamp text="판매완료" color="var(--ink)" className="pcard-stamp" rot={-10} />
              ) : reserved ? (
                <Stamp text="예약중" color="var(--blue)" className="pcard-stamp" rot={-10} />
              ) : (
                p.featured && (
                  <Stamp text="영상에 나온 그 장" className="pcard-stamp" rot={-10} />
                )
              )}
            </button>
            <div className="gallery-thumbs">
              {p.images.map((f, i) => (
                <button
                  type="button"
                  key={f}
                  className={i === img ? "on" : ""}
                  onClick={() => setImg(i)}
                >
                  <img
                    src={/^https?:\/\//i.test(f) ? f : `thumbs/${f}`}
                    alt={`${p.title} 썸네일 ${i + 1}`}
                  />
                </button>
              ))}
            </div>
            <div className="gallery-hint">
              {p.images.length}장 · 클릭하면 크게 보입니다
            </div>
          </div>
          <div className="product-info">
            <div className="product-chips-row">
              <span className="group-chip">{groupName(p.group)}</span>
              <span className={`stock-pill big ${p.status}`}>
                {STATUS_LABELS[p.status]} ({p.qty}점)
              </span>
            </div>
            <h1 className="product-title">{p.title}</h1>
            <div className="product-en">{p.title_en}</div>
            <dl className="spec">
              <dt>연도</dt>
              <dd>{p.year || "미상"}</dd>
              <dt>발행</dt>
              <dd>{p.maker || "미상"}</dd>
              <dt>크기</dt>
              <dd>{p.size || "—"}</dd>
              <dt>재고</dt>
              <dd>
                <b>{p.qty}점</b> ({STATUS_LABELS[p.status]})
              </dd>
              {p.condition && (
                <>
                  <dt>상태</dt>
                  <dd>{p.condition}</dd>
                </>
              )}
              <dt>번호</dt>
              <dd>{p.code}</dd>
            </dl>
            <div className="product-cta">
              {sold ? (
                <button type="button" className="btn big ink" disabled>
                  판매완료 (품절)
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className={`btn big red ${has(p.code) ? "done" : ""}`}
                    aria-pressed={has(p.code)}
                    onClick={() => has(p.code) ? remove(p.code) : add(p.code)}
                  >
                    {has(p.code) ? "빼기" : "담기"}
                  </button>
                  <button
                    type="button"
                    className="btn big yellow"
                    onClick={() => {
                      add(p.code);
                      nav("/inquiry");
                    }}
                  >
                    바로 구매 문의
                  </button>
                </>
              )}
            </div>
            {eps.length > 0 && (
              <div className="in-video">
                <b>이 삐라가 나오는 영상</b>
                {eps.map((e) => {
                  const cue = e.cues.find(([, c]) => c === p.code)?.[0] ?? 0;
                  return (
                    <Link
                      key={e.id}
                      to={`/watch/${e.id}?t=${cue}`}
                      className="btn ink small"
                    >
                      ▶ {e.no}편 {e.title}
                    </Link>
                  );
                })}
              </div>
            )}
            <div className="product-char">
              <Char who="태진" pose="POINT" h={200} />
              <Bubble who="태진" tail="left">
                뒷면도 보세요. 분석표가 붙은 건 그게 진짜예요.
              </Bubble>
            </div>
          </div>
        </div>
        <article className="md" dangerouslySetInnerHTML={{ __html: p.html }} />
        {related.length > 0 && (
          <>
            <h2 className="h3">같은 묶음</h2>
            <div className="grid">
              {related.map((x, i) => (
                <ProductCard key={x.code} p={x} i={i} />
              ))}
            </div>
          </>
        )}
      </div>
      {zoom && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label="상품 사진 확대" onClick={() => setZoom(false)}>
          <button type="button" autoFocus className="lightbox-close" aria-label="확대 사진 닫기" onClick={() => setZoom(false)}>✕</button>
          <img src={itemImageUrl(p.images[img] || p.images[0])} alt="" />
        </div>
      )}
    </section>
  );
}
