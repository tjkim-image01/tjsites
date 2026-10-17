import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { GROUPS, groupName, isSoldOut, useProducts } from "../lib/products";
import { ProductCard } from "../components/ProductCard";
import { Bubble, Char, Sfx } from "../components/Chars";

export default function ShopPage() {
  const products = useProducts(false);
  const [sp, setSp] = useSearchParams();
  const [q, setQ] = useState("");
  const [hideSold, setHideSold] = useState(false);
  const g = sp.get("g") || "all";

  const list = products.filter((p) => {
    if (g === "featured" && !p.featured) return false;
    if (g !== "all" && g !== "featured" && p.group !== g) return false;
    if (hideSold && isSoldOut(p)) return false;
    if (q.trim()) {
      const term = q.trim().toLowerCase();
      const hay = `${p.code} ${p.title} ${p.title_en} ${p.maker} ${p.year}`.toLowerCase();
      if (!hay.includes(term)) return false;
    }
    return true;
  });

  return (
    <section className="stage cream band shop">
      <div className="wrap">
        <div className="shop-head">
          <div>
            <h1 className="h2">
              <Sfx text={`${products.length}점`} size={30} rot={-6} /> 삐라 상점
            </h1>
            <p className="lead">
              한국전쟁 삐라 실물. 누르면 앞·뒤·분석표까지 보여 드립니다.
            </p>
          </div>
          <div className="shop-char">
            <Char who="옥자" pose="POINT" h={220} flip />
            <Bubble who="옥자" tail="left">
              뒷면이 더 재밌어, 꼭 눌러 봐.
            </Bubble>
          </div>
        </div>

        <search className="shop-search-bar">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="품목 코드(APAC…), 제목, 발행처, 연도 검색…"
            aria-label="상품 검색"
          />
          <label className="shop-filter-chk">
            <input
              type="checkbox"
              checked={hideSold}
              onChange={(e) => setHideSold(e.target.checked)}
            />
            판매완료 제외
          </label>
        </search>

        <div className="chips">
          <button
            type="button"
            className={`chip ${g === "all" ? "on" : ""}`}
            onClick={() => setSp({})}
          >
            전체 {products.length}
          </button>
          {GROUPS.map(([k, name]) => {
            const n =
              k === "featured"
                ? products.filter((p) => p.featured).length
                : products.filter((p) => p.group === k).length;
            return n ? (
              <button
                type="button"
                key={k}
                className={`chip ${g === k ? "on" : ""}`}
                onClick={() => setSp({ g: k })}
              >
                {name} {n}
              </button>
            ) : null;
          })}
        </div>
        {g !== "all" && <h2 className="h3 group-title">{groupName(g)}</h2>}
        <div className="grid">
          {list.map((p, i) => (
            <ProductCard key={p.code} p={p} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
