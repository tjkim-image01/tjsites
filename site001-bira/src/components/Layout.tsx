import { Link, NavLink } from "react-router-dom";
import { useCart } from "../lib/cart";

export function Layout({ children }: { children: React.ReactNode }) {
  const { count } = useCart();
  return (
    <>
      <header className="top">
        <Link to="/" className="logo">
          <span className="logo-chip">티제이 김 컬렉션</span>
          <span className="logo-title">삐라 상점</span>
        </Link>
        <nav className="nav">
          <NavLink to="/">홈</NavLink>
          <NavLink to="/watch/S">영상</NavLink>
          <NavLink to="/shop">상품</NavLink>
          <NavLink to="/about">소개</NavLink>
          <NavLink to="/cart" className="cart-link">
            담은 것 <b className="cart-count">{count}</b>
          </NavLink>
        </nav>
      </header>
      <main>{children}</main>
      <footer className="foot">
        <div className="foot-in">
          <div>
            <b>TJ Kim Collection</b> · 삐라 100장+ · 샘플 사이트 (실결제 없음, 구매는 문의로)
          </div>
          <div className="foot-src">
            출처: 뉴스타파(2020) · 한국일보(2020) · RFA(2009) · 티제이 김 컬렉션 실물. 영상 속 숫자는 추산 포함.
          </div>
        </div>
      </footer>
    </>
  );
}
