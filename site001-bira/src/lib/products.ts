// 상품 = src/content/products/*.md (정적 기본값) + 실시간 재고/오버라이드 (Google 시트 · Apps Script + localStorage)
import { useEffect, useState } from "react";
import { marked } from "marked";

export type ProductStatus = "sale" | "reserved" | "sold";

export type Product = {
  code: string;
  title: string;
  title_en: string;
  year: string;
  maker: string;
  size: string;
  qty: number;
  price_usd: number | null;
  group: string;
  episodes: string[];
  featured: boolean;
  images: string[];
  condition: string;
  body_md: string;
  html: string;
  // 재고·관리 확장 필드
  status: ProductStatus;
  visible: boolean;
  location?: string;
  admin_memo?: string;
  updated_at?: string;
  is_custom?: boolean;
};

export type ProductOverride = Partial<{
  code: string;
  title: string;
  title_en: string;
  year: string;
  maker: string;
  size: string;
  qty: number;
  price_usd: number | null;
  group: string;
  episodes: string[];
  featured: boolean;
  images: string[];
  condition: string;
  body_md: string;
  status: ProductStatus;
  visible: boolean;
  location: string;
  admin_memo: string;
  updated_at: string;
  is_custom: boolean;
  deleted: boolean;
}>;

export const STATUS_LABELS: Record<ProductStatus, string> = {
  sale: "판매중",
  reserved: "예약중",
  sold: "판매완료",
};

export const GROUPS: [string, string][] = [
  ["featured", "영상에 나온 그 장"],
  ["safe", "안전보장증서"],
  ["home", "집 생각나게 하는 삐라"],
  ["enemy", "북한·중공군이 미군에게"],
  ["chinese", "중공군에게 보낸 중국어 삐라"],
  ["1945", "1945, 전쟁 전의 삐라"],
  ["ugly", "상대를 괴물로 그린 삐라"],
  ["art", "원화"],
  ["analysis", "분석표가 붙은 삐라"],
  ["poster", "선전 포스터"],
  ["etc", "그 밖의 삐라"],
];

export const groupName = (g: string) => GROUPS.find((x) => x[0] === g)?.[1] ?? g;

const raw = import.meta.glob("../content/products/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function parseFm(src: string) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { fm: {} as Record<string, unknown>, body: src };
  const fm: Record<string, unknown> = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    const v: string = line.slice(i + 1).trim();
    if (v.startsWith("["))
      fm[k] = v
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    else if (v === "true" || v === "false") fm[k] = v === "true";
    else if (v.startsWith('"')) {
      try {
        fm[k] = JSON.parse(v);
      } catch {
        fm[k] = v.slice(1, -1);
      }
    } else if (v !== "" && !isNaN(Number(v))) fm[k] = Number(v);
    else fm[k] = v;
  }
  return { fm, body: m[2] };
}

function sortProducts(list: Product[]): Product[] {
  return [...list].sort(
    (a, b) =>
      Number(b.featured) - Number(a.featured) ||
      a.year.localeCompare(b.year) ||
      a.code.localeCompare(b.code)
  );
}

/** 빌드 시점의 정적 마크다운 원본 목록 (86점) */
export const BASE_PRODUCTS: Product[] = sortProducts(
  Object.values(raw).map((src) => {
    const { fm, body } = parseFm(src);
    const price = fm.price_usd;
    const qty = Number(fm.qty ?? 1);
    const bodyTrimmed = body.trim();
    return {
      code: String(fm.code),
      title: String(fm.title),
      title_en: String(fm.title_en ?? ""),
      year: String(fm.year ?? ""),
      maker: String(fm.maker ?? ""),
      size: String(fm.size ?? ""),
      qty,
      price_usd: typeof price === "number" ? price : null,
      group: String(fm.group ?? "etc"),
      episodes: (fm.episodes as string[]) ?? [],
      featured: Boolean(fm.featured),
      images: (fm.images as string[]) ?? [],
      condition: String(fm.condition ?? ""),
      body_md: bodyTrimmed,
      html: marked.parse(bodyTrimmed) as string,
      status: qty <= 0 ? "sold" : "sale",
      visible: true,
    };
  })
);

// ---- 실시간 재고 오버라이드 병합 레이어 -------------------------------------

const OVERRIDE_KEY = "ppira-inventory-overrides-v1";
const listeners = new Set<() => void>();

export function readOverrides(): Record<string, ProductOverride> {
  try {
    return JSON.parse(localStorage.getItem(OVERRIDE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function writeOverrides(next: Record<string, ProductOverride>) {
  try {
    localStorage.setItem(OVERRIDE_KEY, JSON.stringify(next));
  } catch {
    /* 저장소 제한 무시 */
  }
  rebuildLiveProducts();
  listeners.forEach((l) => l());
}

function applyOverride(base: Product, ov?: ProductOverride): Product {
  if (!ov) return base;
  const body_md = ov.body_md !== undefined && ov.body_md !== "" ? ov.body_md : base.body_md;
  const html =
    ov.body_md !== undefined && ov.body_md !== "" && ov.body_md !== base.body_md
      ? (marked.parse(ov.body_md) as string)
      : base.html;
  const qty = ov.qty !== undefined && ov.qty !== null ? Number(ov.qty) : base.qty;
  const status: ProductStatus =
    ov.status ?? (qty <= 0 ? "sold" : base.status);
  return {
    ...base,
    title: ov.title !== undefined && ov.title !== "" ? ov.title : base.title,
    title_en: ov.title_en !== undefined && ov.title_en !== "" ? ov.title_en : base.title_en,
    year: ov.year !== undefined ? ov.year : base.year,
    maker: ov.maker !== undefined ? ov.maker : base.maker,
    size: ov.size !== undefined ? ov.size : base.size,
    qty,
    price_usd: ov.price_usd !== undefined ? ov.price_usd : base.price_usd,
    group: ov.group !== undefined && ov.group !== "" ? ov.group : base.group,
    episodes: ov.episodes !== undefined ? ov.episodes : base.episodes,
    featured: ov.featured !== undefined ? ov.featured : base.featured,
    images: ov.images !== undefined && ov.images.length > 0 ? ov.images : base.images,
    condition: ov.condition !== undefined ? ov.condition : base.condition,
    body_md,
    html,
    status,
    visible: ov.visible !== undefined ? ov.visible : base.visible,
    location: ov.location ?? base.location,
    admin_memo: ov.admin_memo ?? base.admin_memo,
    updated_at: ov.updated_at ?? base.updated_at,
    is_custom: ov.is_custom ?? base.is_custom,
  };
}

let allMergedProducts: Product[] = [];
export let PRODUCTS: Product[] = [];

function rebuildLiveProducts() {
  const ovMap = readOverrides();
  const baseCodes = new Set(BASE_PRODUCTS.map((p) => p.code));
  const merged: Product[] = [];

  for (const base of BASE_PRODUCTS) {
    const ov = ovMap[base.code];
    if (ov?.deleted) continue;
    merged.push(applyOverride(base, ov));
  }

  // 어드민에서 새로 등록한 커스텀 상품 병합
  for (const [code, ov] of Object.entries(ovMap)) {
    if (baseCodes.has(code) || ov.deleted) continue;
    const body_md = ov.body_md || `## 무슨 삐라인가\n\n${ov.title || code}`;
    const qty = ov.qty !== undefined ? Number(ov.qty) : 1;
    merged.push({
      code,
      title: ov.title || code,
      title_en: ov.title_en || "",
      year: ov.year || "",
      maker: ov.maker || "",
      size: ov.size || "",
      qty,
      price_usd: ov.price_usd !== undefined ? ov.price_usd : null,
      group: ov.group || "etc",
      episodes: ov.episodes || [],
      featured: Boolean(ov.featured),
      images: ov.images && ov.images.length > 0 ? ov.images : ["APKC210526397C_1.jpg"],
      condition: ov.condition || "",
      body_md,
      html: marked.parse(body_md) as string,
      status: ov.status || (qty <= 0 ? "sold" : "sale"),
      visible: ov.visible !== undefined ? ov.visible : true,
      location: ov.location,
      admin_memo: ov.admin_memo,
      updated_at: ov.updated_at,
      is_custom: true,
    });
  }

  allMergedProducts = sortProducts(merged);
  PRODUCTS = allMergedProducts.filter((p) => p.visible !== false);
}

rebuildLiveProducts();

export function getAllProducts(includeHidden = false): Product[] {
  return includeHidden ? allMergedProducts : PRODUCTS;
}

export function subscribeProducts(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** 실시간 재고 변경을 자동 반영하는 React 훅 */
export function useProducts(includeHidden = false): Product[] {
  const [, setTick] = useState(0);
  useEffect(() => subscribeProducts(() => setTick((t) => t + 1)), []);
  return includeHidden ? allMergedProducts : PRODUCTS;
}

export const productByCode = (code: string, includeHidden = false) =>
  (includeHidden ? allMergedProducts : PRODUCTS).find((p) => p.code === code) ??
  allMergedProducts.find((p) => p.code === code);

export const thumb = (p: Product) => {
  const first = p.images[0] || "";
  if (/^https?:\/\//i.test(first)) return first;
  return `thumbs/${first}`;
};

export const itemImageUrl = (f: string) => {
  if (/^https?:\/\//i.test(f)) return f;
  return `items/${f}`;
};

export const fmtPrice = (p: Product) => {
  if (p.status === "sold" || p.qty <= 0) {
    return p.price_usd == null ? "판매완료" : `$${p.price_usd.toLocaleString("en-US")} (판매완료)`;
  }
  return p.price_usd == null ? "문의" : `$${p.price_usd.toLocaleString("en-US")}`;
};

export const isSoldOut = (p: Product) => p.status === "sold" || p.qty <= 0;
export const isReserved = (p: Product) => p.status === "reserved" && !isSoldOut(p);

/** 상품 정보를 마크다운(.md) 파일 원문으로 변환 */
export function generateProductMarkdown(p: Product): string {
  const v = (x: unknown) => {
    if (Array.isArray(x)) return "[" + x.join(", ") + "]";
    if (typeof x === "boolean") return x ? "true" : "false";
    if (x === null || x === undefined || x === "") return "";
    return typeof x === "string" ? JSON.stringify(x) : String(x);
  };
  const fmLines = [
    `code: ${v(p.code)}`,
    `title: ${v(p.title)}`,
    `title_en: ${v(p.title_en)}`,
    `year: ${v(p.year)}`,
    `maker: ${v(p.maker)}`,
    `size: ${v(p.size)}`,
    `qty: ${v(p.qty)}`,
    `price_usd: ${p.price_usd == null ? "" : p.price_usd}`,
    `group: ${v(p.group)}`,
    `episodes: ${v(p.episodes)}`,
    `featured: ${v(p.featured)}`,
    `images: ${v(p.images)}`,
    `condition: ${v(p.condition)}`,
  ];
  return `---\n${fmLines.join("\n")}\n---\n\n${p.body_md.trim()}\n`;
}
