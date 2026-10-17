import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { SoundButton } from "./SoundButton";
import { resumeBlockedVideo } from "../lib/sound";
import { useCart } from "../lib/cart";

export function Layout({ children }: { children: React.ReactNode }) {
  const { count } = useCart();
  const { pathname } = useLocation();
  const [hidden, setHidden] = useState(false);
  useEffect(() => { setHidden(false); }, [pathname]);
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
    document.addEventListener("click", resumeBlockedVideo);
    document.addEventListener("keydown", resumeBlockedVideo);
    return () => {
      document.removeEventListener("click", resumeBlockedVideo);
      document.removeEventListener("keydown", resumeBlockedVideo);
    };
  }, []);
  const hideChrome = hidden;
  return (
    <>
      <header className={`top ${hideChrome ? "chrome-hidden" : ""}`}>
        <Link to="/" className="logo">
          <span className="logo-chip">티제이 김 컬렉션</span>
          <span className="logo-title">삐라 상점</span>
        </Link>
        <a className="youtube-link" href="https://www.youtube.com/channel/UC-gAXUw8Au-q7WgW6ud_KbA"
          target="_blank" rel="noopener noreferrer" aria-label="티제이 김 컬렉션 유튜브 채널 (새 창)" title="유튜브 채널">
          <svg viewBox="0 0 32 24" width="32" height="24" aria-hidden="true" focusable="false">
            <path fill="#FF0033" d="M31.3 3.8A4 4 0 0 0 28.5 1C26 .3 16 .3 16 .3S6 .3 3.5 1A4 4 0 0 0 .7 3.8C0 6.2 0 12 0 12s0 5.8.7 8.2A4 4 0 0 0 3.5 23c2.5.7 12.5.7 12.5.7s10 0 12.5-.7a4 4 0 0 0 2.8-2.8c.7-2.4.7-8.2.7-8.2s0-5.8-.7-8.2Z" />
            <path fill="#FFF" d="m12.8 17.1 8.3-5.1-8.3-5.1Z" />
          </svg>
        </a>
        <nav id="site-menu" aria-label="주 메뉴" className="nav">
          <SoundButton />
          <NavLink to="/" end>홈</NavLink>
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
          <div><b>TJ Kim Collection</b> · 삐라 100장+ · 샘플 사이트 (실결제 없음, 구매는 문의로)</div>
          <div className="foot-src">출처: 뉴스타파(2020) · 한국일보(2020) · RFA(2009) · 티제이 김 컬렉션 실물. 영상 속 숫자는 추산 포함.</div>
        </div>
      </footer>
      <nav aria-label="모바일 빠른 메뉴" className={`mobile-bottom ${hideChrome ? "chrome-hidden" : ""}`}>
        <SoundButton />
        <NavLink to="/" end>홈</NavLink><NavLink to="/watch/S">영상</NavLink>
        <NavLink to="/shop">상품</NavLink><NavLink to="/cart">담은 것 <b>{count}</b></NavLink>
      </nav>
    </>
  );
}
