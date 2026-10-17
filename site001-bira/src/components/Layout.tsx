import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useCart } from "../lib/cart";

export function Layout({ children }: { children: React.ReactNode }) {
  const { count } = useCart();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  useEffect(() => { setOpen(false); setHidden(false); }, [pathname]);
  useEffect(() => {
    if (pathname !== "/") return;
    let previous = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - previous) < 8) return;
      setHidden(y > 80 && y > previous);
      previous = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  const hideChrome = hidden && !open;
  return (
    <>
      <header className={`top ${hideChrome ? "chrome-hidden" : ""}`}>
        <Link to="/" className="logo">
          <span className="logo-chip">티제이 김 컬렉션</span>
          <span className="logo-title">삐라 상점</span>
        </Link>
        <button type="button" className="menu-toggle" aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
          aria-expanded={open} aria-controls="site-menu" onClick={() => setOpen(!open)}>
          <span aria-hidden="true">{open ? "✕" : "☰"}</span>
        </button>
        <nav id="site-menu" aria-label="주 메뉴" className={`nav ${open ? "is-open" : ""}`}>
          <NavLink to="/" end onClick={() => setOpen(false)}>홈</NavLink>
          <NavLink to="/watch/S" onClick={() => setOpen(false)}>영상</NavLink>
          <NavLink to="/shop" onClick={() => setOpen(false)}>상품</NavLink>
          <NavLink to="/about" onClick={() => setOpen(false)}>소개</NavLink>
          <NavLink to="/cart" className="cart-link" onClick={() => setOpen(false)}>
            담은 것 <b className="cart-count">{count}</b>
          </NavLink>
        </nav>
      </header>
      {open && <button className="menu-backdrop" aria-label="메뉴 닫기" onClick={() => setOpen(false)} />}
      <main>{children}</main>
      <footer className="foot">
        <div className="foot-in">
          <div><b>TJ Kim Collection</b> · 삐라 100장+ · 샘플 사이트 (실결제 없음, 구매는 문의로)</div>
          <div className="foot-src">출처: 뉴스타파(2020) · 한국일보(2020) · RFA(2009) · 티제이 김 컬렉션 실물. 영상 속 숫자는 추산 포함.</div>
        </div>
      </footer>
      <nav aria-label="모바일 빠른 메뉴" className={`mobile-bottom ${hideChrome ? "chrome-hidden" : ""}`}>
        <NavLink to="/" end>홈</NavLink><NavLink to="/watch/S">영상</NavLink>
        <NavLink to="/shop">상품</NavLink><NavLink to="/cart">담은 것 <b>{count}</b></NavLink>
      </nav>
    </>
  );
}
