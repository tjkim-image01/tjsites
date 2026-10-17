// 장바구니 — localStorage. 서버 없음.
import { useEffect, useState } from "react";

const KEY = "ppira-cart-v1";
type Cart = Record<string, number>;
const read = (): Cart => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } };
const listeners = new Set<() => void>();
const write = (c: Cart) => { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* 저장소 막힘 */ } listeners.forEach((l) => l()); };

export function useCart() {
  const [cart, setCart] = useState<Cart>(read);
  useEffect(() => { const l = () => setCart(read()); listeners.add(l); return () => { listeners.delete(l); }; }, []);
  const add = (code: string, n = 1) => { const c = read(); c[code] = Math.max(1, (c[code] ?? 0) + n); write(c); };
  const set = (code: string, n: number) => { const c = read(); if (n <= 0) delete c[code]; else c[code] = n; write(c); };
  const remove = (code: string) => set(code, 0);
  const clear = () => write({});
  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  return { cart, add, set, remove, clear, count, has: (code: string) => code in cart };
}
