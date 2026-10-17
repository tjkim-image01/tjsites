import { Link } from "react-router-dom";
import {
  Product,
  STATUS_LABELS,
  fmtPrice,
  isReserved,
  isSoldOut,
  thumb,
} from "../lib/products";
import { useCart } from "../lib/cart";
import { Stamp } from "./Chars";

export function ProductCard({
  p,
  i = 0,
  compact,
}: {
  p: Product;
  i?: number;
  compact?: boolean;
}) {
  const { add, has } = useCart();
  const rot = ((i % 3) - 1) * 1.6;
  const sold = isSoldOut(p);
  const reserved = isReserved(p);

  return (
    <div
      className={`pcard ${compact ? "compact" : ""} ${sold ? "is-sold" : ""}`}
      style={{ ["--rot" as string]: `${rot}deg` }}
    >
      <Link to={`/shop/${p.code}`} className="pcard-img">
        <img src={thumb(p)} alt={p.title} loading="lazy" />
        {sold ? (
          <Stamp
            text="판매완료"
            color="var(--ink)"
            className="pcard-stamp sold"
            rot={-8}
          />
        ) : reserved ? (
          <Stamp
            text="예약중"
            color="var(--blue)"
            className="pcard-stamp"
            rot={-8}
          />
        ) : (
          p.featured && (
            <Stamp text="영상에 나온 그 장" className="pcard-stamp" rot={-10} />
          )
        )}
      </Link>
      <div className="pcard-body">
        <Link to={`/shop/${p.code}`} className="pcard-title">
          {p.title}
        </Link>
        <div className="pcard-meta">
          {p.year}
          {p.maker ? ` · ${p.maker.split(",")[0]}` : ""}
          {!compact && (
            <span className={`stock-pill ${p.status}`}>
              {STATUS_LABELS[p.status]} · {p.qty}점
            </span>
          )}
        </div>
        <div className="pcard-row">
          <span className="price">{fmtPrice(p)}</span>
          {sold ? (
            <span className="btn-stamp sold" aria-disabled="true">
              품절
            </span>
          ) : (
            <button
              type="button"
              className={`btn-stamp ${has(p.code) ? "done" : ""}`}
              onClick={() => add(p.code)}
            >
              {has(p.code) ? "담았음" : "담기"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
