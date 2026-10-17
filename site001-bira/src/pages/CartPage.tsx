import { Link } from "react-router-dom";
import {
  STATUS_LABELS,
  fmtPrice,
  isSoldOut,
  productByCode,
  thumb,
  useProducts,
} from "../lib/products";
import { useCart } from "../lib/cart";
import { Bubble, Char } from "../components/Chars";

export default function CartPage() {
  useProducts(false);
  const { cart, set, remove, count } = useCart();
  const rows = Object.entries(cart)
    .map(([code, n]) => ({ p: productByCode(code), n }))
    .filter((r) => r.p);
  const total = rows.reduce((a, r) => a + (r.p!.price_usd ?? 0) * r.n, 0);
  const unknown = rows.some((r) => r.p!.price_usd == null);

  return (
    <section className="stage yellow band">
      <div className="wrap narrow">
        <h1 className="h2">
          담은 것 <span className="hl">{count}</span>
        </h1>
        {rows.length === 0 ? (
          <div className="empty">
            <Char who="옥자" pose="SURPRISE" h={240} flip />
            <Bubble who="옥자" tail="left">
              아직 하나도 안 담았네? <Link to="/watch/S">영상</Link>부터 봐.
            </Bubble>
          </div>
        ) : (
          <>
            <div className="cart-list">
              {rows.map(({ p, n }) => {
                const maxQty = Math.max(1, p!.qty);
                const sold = isSoldOut(p!);
                return (
                  <div key={p!.code} className="cart-row">
                    <Link to={`/shop/${p!.code}`}>
                      <img src={thumb(p!)} alt="" />
                    </Link>
                    <div className="cart-row-info">
                      <Link to={`/shop/${p!.code}`} className="pcard-title">
                        {p!.title}
                      </Link>
                      <div className="pcard-meta">
                        {p!.year} · {p!.code} ·{" "}
                        <span className={`stock-pill ${p!.status}`}>
                          {STATUS_LABELS[p!.status]} (재고 {p!.qty}점)
                        </span>
                      </div>
                    </div>
                    <div className="qty">
                      <button
                        type="button"
                        onClick={() => set(p!.code, n - 1)}
                        aria-label="수량 감소"
                      >
                        −
                      </button>
                      <b>{n}</b>
                      <button
                        type="button"
                        onClick={() => set(p!.code, Math.min(maxQty, n + 1))}
                        disabled={sold || n >= maxQty}
                        title={n >= maxQty ? `최대 재고는 ${maxQty}점입니다` : ""}
                        aria-label="수량 증가"
                      >
                        +
                      </button>
                    </div>
                    <div className="price">{fmtPrice(p!)}</div>
                    <button
                      type="button"
                      className="x"
                      onClick={() => remove(p!.code)}
                      aria-label="빼기"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="cart-total">
              <span>합계 (표시 가격 기준)</span>
              <b>
                ${total.toLocaleString("en-US")}
                {unknown ? " + 문의" : ""}
              </b>
            </div>
            <div className="center">
              <Link to="/inquiry" className="btn big red">
                구매 문의하기 →
              </Link>
            </div>
            <p className="note">
              실결제가 아닙니다. 문의를 보내면 담당자가 가격·상태·배송을 확인해 답합니다.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
