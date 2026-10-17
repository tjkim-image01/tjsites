/**
 * 삐라 상점 (tj001) 재고·문의·시트 연동 모듈
 *
 * 데이터 구조 (정적 GitHub Pages + Google 시트 + Apps Script 하이브리드):
 * 1. 기본 상품 설명·이미지는 정적 빌드(BASE_PRODUCTS)로 즉시 표시한다.
 * 2. 재고(qty), 판매상태(sale/reserved/sold), 판매가(price_usd), 노출여부(visible) 등 변동 데이터는
 *    Google 시트(Apps Script 웹 앱)에서 실시간으로 읽고 어드민(#/admin)에서 즉시 저장한다.
 * 3. 기존 배포된 admin001 v1 Apps Script와도 100% 하위 호환된다:
 *    - v2('ppiraStock', 'ppiraAdminData', 'ppiraSaveItem')가 배포되어 있으면 전용 탭('삐라상점_재고', '삐라상점_문의')과
 *      원본 'PRINT' 탭을 동시에 빠르게 읽고 쓴다.
 *    - 아직 v1만 배포된 상태여도 어드민 로그인 시 자동으로 'dataset' / 'updateCells' (PRINT 탭)로 폴백하여
 *      Google 시트에 즉시 읽고 저장한다.
 */

import {
  BASE_PRODUCTS,
  Product,
  ProductOverride,
  ProductStatus,
  getAllProducts,
  readOverrides,
  writeOverrides,
} from "./products";

const DEFAULT_API_URL =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL ||
  "https://script.google.com/macros/s/AKfycbzM1qrRW6cMIpeB5CZN4iE-xXqN_rVzzVG2sCeEAWcHr_kJkxaQbxKqp23nLd7HZj76/exec";

const API_URL_KEY = "ppira-api-url-v1";
const TOKEN_KEY = "admin001.token";
const USER_KEY = "admin001.user";
const SYNC_META_KEY = "ppira-sync-meta-v1";
const INQUIRIES_KEY = "ppira-inquiries-v1";

export type InquiryStatus = "접수" | "연락완료" | "거래완료" | "취소";

export interface InquiryRecord {
  inquiryId: string;
  createdAt: string;
  name: string;
  contact: string;
  codes: string[];
  summary: string;
  totalUsd: string;
  memo: string;
  status: InquiryStatus;
  adminNote: string;
  updatedAt?: string;
  syncedToSheet?: boolean;
}

export interface SyncMeta {
  lastSyncedAt: string | null;
  mode: "v2-dedicated" | "v1-print-fallback" | "local-only" | "unverified";
  sheetTitle?: string;
  error?: string | null;
}

const metaListeners = new Set<() => void>();

function notifyMeta() {
  metaListeners.forEach((fn) => fn());
}

export function subscribeSyncMeta(fn: () => void) {
  metaListeners.add(fn);
  return () => {
    metaListeners.delete(fn);
  };
}

export function getApiUrl(): string {
  try {
    return (localStorage.getItem(API_URL_KEY) || DEFAULT_API_URL).trim();
  } catch {
    return DEFAULT_API_URL;
  }
}

export function setApiUrl(url: string) {
  try {
    if (!url.trim()) localStorage.removeItem(API_URL_KEY);
    else localStorage.setItem(API_URL_KEY, url.trim());
  } catch {
    /* 무시 */
  }
  notifyMeta();
}

export function getAdminToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getAdminUser(): { name: string } | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function storeAdminSession(token: string, user: { name: string }) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    /* 무시 */
  }
  notifyMeta();
}

export function clearAdminSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    /* 무시 */
  }
  notifyMeta();
}

export function getSyncMeta(): SyncMeta {
  try {
    const raw = localStorage.getItem(SYNC_META_KEY);
    return raw
      ? JSON.parse(raw)
      : { lastSyncedAt: null, mode: "unverified", error: null };
  } catch {
    return { lastSyncedAt: null, mode: "unverified", error: null };
  }
}

function setSyncMeta(patch: Partial<SyncMeta>) {
  const next = { ...getSyncMeta(), ...patch };
  try {
    localStorage.setItem(SYNC_META_KEY, JSON.stringify(next));
  } catch {
    /* 무시 */
  }
  notifyMeta();
}

// ---- Apps Script 호출 공통 --------------------------------------------------

async function callApi<T>(
  action: string,
  params: Record<string, unknown> = {},
  requireAuth = false
): Promise<T> {
  const url = getApiUrl();
  if (!url) throw new Error("API 주소가 설정되지 않았습니다.");
  const body: Record<string, unknown> = { action, ...params };
  if (requireAuth) {
    const token = getAdminToken();
    if (!token) throw new Error("어드민 로그인이 필요합니다.");
    body.token = token;
  }
  const res = await fetch(url, {
    method: "POST",
    body: JSON.stringify(body),
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`서버 응답 오류 (${res.status})`);
  const data = (await res.json()) as { error?: string } & T;
  if (data.error) {
    if (/로그인/.test(data.error)) {
      clearAdminSession();
    }
    throw new Error(data.error);
  }
  return data;
}

export async function checkApiHealth(customUrl?: string): Promise<{
  ok: boolean;
  version?: string;
  time?: string;
}> {
  try {
    const target = (customUrl ?? getApiUrl()).trim();
    const res = await fetch(`${target}?action=health`, { redirect: "follow" });
    const data = await res.json();
    return { ok: Boolean(data.ok), version: data.version, time: data.time };
  } catch {
    return { ok: false };
  }
}

export async function loginAdmin(
  username: string,
  password: string
): Promise<{ name: string }> {
  const data = await callApi<{ token: string; user: { name: string } }>(
    "login",
    { username, password },
    false
  );
  storeAdminSession(data.token, data.user);
  return data.user;
}

export async function changeAdminPassword(newPassword: string): Promise<void> {
  await callApi("changePassword", { newPassword }, true);
}

// ---- MEMO-4 JSON 보조 파서 (v1 Apps Script 호환용) --------------------------

const MEMO4_PREFIX = "[PPIRA:";

function packMemo4(ov: ProductOverride): string {
  const payload: Record<string, unknown> = {};
  if (ov.status) payload.s = ov.status;
  if (ov.visible === false) payload.v = 0;
  if (ov.title) payload.t = ov.title;
  if (ov.group) payload.g = ov.group;
  if (ov.featured !== undefined) payload.f = ov.featured ? 1 : 0;
  if (ov.admin_memo) payload.m = ov.admin_memo;
  return `${MEMO4_PREFIX}${JSON.stringify(payload)}]`;
}

function unpackMemo4(raw: string): Partial<ProductOverride> {
  if (!raw || !raw.startsWith(MEMO4_PREFIX)) return {};
  try {
    const jsonStr = raw.slice(MEMO4_PREFIX.length, raw.endsWith("]") ? -1 : undefined);
    const p = JSON.parse(jsonStr);
    const out: Partial<ProductOverride> = {};
    if (p.s === "sale" || p.s === "reserved" || p.s === "sold") out.status = p.s;
    if (p.v === 0) out.visible = false;
    if (typeof p.t === "string" && p.t) out.title = p.t;
    if (typeof p.g === "string" && p.g) out.group = p.g;
    if (p.f === 1 || p.f === 0) out.featured = Boolean(p.f);
    if (typeof p.m === "string") out.admin_memo = p.m;
    return out;
  } catch {
    return {};
  }
}

function parsePriceNumber(val: unknown): number | null | undefined {
  if (val === undefined) return undefined;
  if (val === null || val === "") return null;
  if (typeof val === "number") return isNaN(val) ? null : val;
  const cleaned = String(val).replace(/[^0-9.-]/g, "");
  if (!cleaned) return null;
  const num = Number(cleaned);
  return isNaN(num) ? null : num;
}

// ---- 방문자용 공개 재고 동기화 ----------------------------------------------

let publicSyncInFlight: Promise<void> | null = null;

export function syncPublicStock(): Promise<void> {
  if (publicSyncInFlight) return publicSyncInFlight;
  publicSyncInFlight = (async () => {
    try {
      const url = getApiUrl();
      if (!url) return;
      const res = await fetch(`${url}?action=ppiraStock`, { redirect: "follow" });
      if (!res.ok) return;
      const data = await res.json();
      if (data && Array.isArray(data.items) && data.items.length > 0) {
        const current = readOverrides();
        for (const item of data.items) {
          if (!item.code) continue;
          const prev = current[item.code] || {};
          current[item.code] = {
            ...prev,
            code: item.code,
            title: item.title || prev.title,
            title_en: item.title_en || prev.title_en,
            status: (item.status as ProductStatus) || prev.status || "sale",
            qty: typeof item.qty === "number" ? item.qty : (prev.qty ?? 1),
            price_usd:
              item.price_usd !== undefined ? item.price_usd : prev.price_usd,
            visible: item.visible !== undefined ? Boolean(item.visible) : true,
            group: item.group || prev.group,
            featured:
              item.featured !== undefined ? Boolean(item.featured) : prev.featured,
            episodes: item.episodes ?? prev.episodes,
            year: item.year || prev.year,
            maker: item.maker || prev.maker,
            size: item.size || prev.size,
            condition: item.condition !== undefined ? item.condition : prev.condition,
            images: item.images ?? prev.images,
            body_md: item.body_md || prev.body_md,
            updated_at: item.updated_at || prev.updated_at,
          };
        }
        writeOverrides(current);
        setSyncMeta({
          lastSyncedAt: new Date().toISOString(),
          mode: "v2-dedicated",
          error: null,
        });
      }
    } catch {
      /* 공개 조회 실패 시 정적 기본값 + 로컬 캐시로 조용히 동작 */
    } finally {
      publicSyncInFlight = null;
    }
  })();
  return publicSyncInFlight;
}

// ---- 어드민 전체 시트 동기화 (v2 전용 API + v1 PRINT 탭 자동 폴백) ----------

export async function syncAdminFromSheet(
  onProgress?: (msg: string) => void
): Promise<{ count: number; mode: SyncMeta["mode"] }> {
  onProgress?.("Google 시트에서 재고 데이터를 불러오는 중…");
  const baseCodes = new Set(BASE_PRODUCTS.map((p) => p.code));

  try {
    // 1차 시도: v2 전용 액션 (ppiraAdminData)
    const data = await callApi<{
      ok: boolean;
      hasDedicatedTab: boolean;
      items: Array<Record<string, unknown>>;
      printSummary: Record<
        string,
        {
          qty: number | null;
          price_usd: number | null;
          condition: string;
          location: string;
          shopPublished: string;
          year: string;
          maker: string;
          size: string;
          memo4: string;
          updated_at: string;
        }
      >;
      inquiries: Array<Record<string, string>>;
      syncedAt: string;
    }>("ppiraAdminData", {}, true);

    const nextOverrides = { ...readOverrides() };

    // PRINT 탭 원본 정보 먼저 반영 (Location, 판매가, 수량 등)
    if (data.printSummary) {
      for (const code of baseCodes) {
        const ps = data.printSummary[code];
        if (!ps) continue;
        const prev = nextOverrides[code] || {};
        const memoExtra = unpackMemo4(ps.memo4 || "");
        nextOverrides[code] = {
          ...prev,
          ...memoExtra,
          code,
          qty: ps.qty !== null ? ps.qty : (prev.qty ?? 1),
          price_usd: ps.price_usd !== null ? ps.price_usd : prev.price_usd,
          condition: ps.condition || prev.condition,
          location: ps.location || prev.location,
          year: ps.year || prev.year,
          maker: ps.maker || prev.maker,
          size: ps.size || prev.size,
          updated_at: ps.updated_at || prev.updated_at,
        };
      }
    }

    // 삐라상점_재고 전용 탭 데이터 덮어쓰기
    if (Array.isArray(data.items)) {
      for (const it of data.items) {
        const code = String(it.code || "").trim();
        if (!code) continue;
        const prev = nextOverrides[code] || {};
        nextOverrides[code] = {
          ...prev,
          code,
          title: (it.title as string) || prev.title,
          title_en: (it.title_en as string) || prev.title_en,
          status: ((it.status as ProductStatus) || prev.status || "sale"),
          qty: typeof it.qty === "number" ? it.qty : (prev.qty ?? 1),
          price_usd:
            it.price_usd !== undefined
              ? (it.price_usd as number | null)
              : prev.price_usd,
          visible: it.visible !== undefined ? Boolean(it.visible) : true,
          group: (it.group as string) || prev.group,
          featured:
            it.featured !== undefined ? Boolean(it.featured) : prev.featured,
          episodes: (it.episodes as string[]) ?? prev.episodes,
          year: (it.year as string) || prev.year,
          maker: (it.maker as string) || prev.maker,
          size: (it.size as string) || prev.size,
          condition: (it.condition as string) ?? prev.condition,
          location: (it.location as string) ?? prev.location,
          admin_memo: (it.admin_memo as string) ?? prev.admin_memo,
          images: (it.images as string[]) ?? prev.images,
          body_md: (it.body_md as string) || prev.body_md,
          updated_at: (it.updated_at as string) || prev.updated_at,
          is_custom: !baseCodes.has(code),
        };
      }
    }

    writeOverrides(nextOverrides);

    // 문의 목록 병합
    if (Array.isArray(data.inquiries) && data.inquiries.length > 0) {
      const sheetInqs: InquiryRecord[] = data.inquiries
        .filter((r) => r["문의번호"])
        .map((r) => ({
          inquiryId: r["문의번호"],
          createdAt: r["접수일시"] || "",
          name: r["이름"] || "",
          contact: r["연락처"] || "",
          codes: (r["품목코드"] || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          summary: r["품목요약"] || "",
          totalUsd: r["합계(USD)"] || "",
          memo: r["고객메모"] || "",
          status: (r["처리상태"] as InquiryStatus) || "접수",
          adminNote: r["관리자비고"] || "",
          updatedAt: r["수정일시"] || "",
          syncedToSheet: true,
        }));
      mergeInquiriesFromSheet(sheetInqs);
    }

    setSyncMeta({
      lastSyncedAt: data.syncedAt || new Date().toISOString(),
      mode: "v2-dedicated",
      error: null,
    });
    return { count: getAllProducts(true).length, mode: "v2-dedicated" };
  } catch (err) {
    const msg = String(err instanceof Error ? err.message : err);
    // 만약 서버가 아직 v1 Apps Script('알 수 없는 action: ppiraAdminData')라면 자동으로 v1 dataset 호출로 폴백!
    if (/알 수 없는 action/.test(msg)) {
      onProgress?.("기존 시트(PRINT 탭)에서 삐라 86점 정보를 읽어오는 중… (약 5~10초)");
      const raw = await callApi<{
        spreadsheetId: string;
        title: string;
        modifiedTime: string;
        tabs: Record<string, string[][]>;
      }>("dataset", {}, true);

      const printRows = raw.tabs?.PRINT || [];
      if (printRows.length >= 2) {
        const headers = printRows[0];
        const idx: Record<string, number> = {};
        headers.forEach((h, i) => {
          if (h) idx[h] = i;
        });
        const nextOverrides = { ...readOverrides() };

        for (let r = 1; r < printRows.length; r++) {
          const row = printRows[r];
          const code = (row[idx["Item No."]] || "").trim();
          if (!code || !baseCodes.has(code)) continue;
          const prev = nextOverrides[code] || {};
          const qtyParsed = parsePriceNumber(row[idx["QTY"]]);
          const priceParsed = parsePriceNumber(row[idx["판매가 (US$)"]]);
          const cond = row[idx["Condition"]] || "";
          const loc = row[idx["Location"]] || "";
          const memo1 = row[idx["MEMO-1"]] || "";
          const memo4 = row[idx["MEMO-4"]] || "";
          const updatedAt = row[idx["수정일시"]] || "";
          const shopFlag = (row[idx["Shop게시"]] || "").trim().toUpperCase();
          const memoExtra = unpackMemo4(memo4);

          const qty = qtyParsed !== null && qtyParsed !== undefined ? qtyParsed : (prev.qty ?? 1);
          nextOverrides[code] = {
            ...prev,
            ...memoExtra,
            code,
            qty,
            price_usd: priceParsed !== undefined ? priceParsed : prev.price_usd,
            condition: cond || prev.condition,
            location: loc || prev.location,
            admin_memo: memoExtra.admin_memo ?? (memo1 || prev.admin_memo),
            status:
              memoExtra.status ??
              (qty <= 0 ? "sold" : prev.status ?? "sale"),
            visible:
              memoExtra.visible !== undefined
                ? memoExtra.visible
                : shopFlag === "N"
                ? false
                : (prev.visible ?? true),
            updated_at: updatedAt || prev.updated_at,
          };
        }
        writeOverrides(nextOverrides);
      }

      setSyncMeta({
        lastSyncedAt: new Date().toISOString(),
        mode: "v1-print-fallback",
        sheetTitle: raw.title,
        error: null,
      });
      return { count: getAllProducts(true).length, mode: "v1-print-fallback" };
    }

    setSyncMeta({ error: msg });
    throw err;
  }
}

// ---- 개별 상품 저장 (로컬 즉시 반영 + Google 시트 자동 저장) ----------------

export async function saveProductChanges(
  code: string,
  changes: ProductOverride,
  options: { syncSheet?: boolean } = { syncSheet: true }
): Promise<{ synced: boolean; mode: SyncMeta["mode"]; error?: string }> {
  const now = new Date().toISOString().slice(0, 16).replace("T", " ");
  const current = readOverrides();
  const prev = current[code] || {};
  const mergedOverride: ProductOverride = {
    ...prev,
    ...changes,
    code,
    updated_at: now,
  };

  // 수량을 0으로 내리면 자동으로 판매완료(sold)로 전환 (명시적 status 변경이 없을 때)
  if (
    changes.qty !== undefined &&
    Number(changes.qty) <= 0 &&
    changes.status === undefined
  ) {
    mergedOverride.status = "sold";
  } else if (
    changes.qty !== undefined &&
    Number(changes.qty) > 0 &&
    prev.status === "sold" &&
    changes.status === undefined
  ) {
    mergedOverride.status = "sale";
  }
  // 판매완료로 바꾸면 수량 0과 함께 맞출지 선택 가능하지만 기본은 상태 우선
  current[code] = mergedOverride;
  writeOverrides(current);

  if (options.syncSheet === false || !getAdminToken()) {
    return { synced: false, mode: "local-only" };
  }

  const fullProduct = getAllProducts(true).find((p) => p.code === code);
  if (!fullProduct) return { synced: false, mode: "local-only" };

  try {
    // 1차 시도: v2 전용 ppiraSaveItem
    await callApi("ppiraSaveItem", { item: fullProduct }, true);
    setSyncMeta({
      lastSyncedAt: new Date().toISOString(),
      mode: "v2-dedicated",
      error: null,
    });
    return { synced: true, mode: "v2-dedicated" };
  } catch (err) {
    const msg = String(err instanceof Error ? err.message : err);
    // v1 폴백: 기존 updateCells(tab='PRINT')로 저장
    if (/알 수 없는 action/.test(msg)) {
      try {
        const sheetChanges: Record<string, string | number> = {
          QTY: fullProduct.qty,
          "판매가 (US$)":
            fullProduct.price_usd !== null ? fullProduct.price_usd : "",
          Condition: fullProduct.condition || "",
          Year: fullProduct.year || "",
          Size: fullProduct.size || "",
          "Maker (CN)": fullProduct.maker || "",
          Shop게시:
            fullProduct.visible && fullProduct.status !== "sold" ? "Y" : "N",
          "MEMO-4": packMemo4(mergedOverride),
        };
        if (fullProduct.location !== undefined) {
          sheetChanges["Location"] = fullProduct.location;
        }
        if (fullProduct.admin_memo !== undefined) {
          sheetChanges["MEMO-1"] = fullProduct.admin_memo;
        }
        await callApi(
          "updateCells",
          { tab: "PRINT", code, changes: sheetChanges },
          true
        );
        setSyncMeta({
          lastSyncedAt: new Date().toISOString(),
          mode: "v1-print-fallback",
          error: null,
        });
        return { synced: true, mode: "v1-print-fallback" };
      } catch (fallbackErr) {
        const fMsg = String(
          fallbackErr instanceof Error ? fallbackErr.message : fallbackErr
        );
        setSyncMeta({ error: fMsg });
        return { synced: false, mode: "local-only", error: fMsg };
      }
    }
    setSyncMeta({ error: msg });
    return { synced: false, mode: "local-only", error: msg };
  }
}

/** 여러 상품 일괄 변경 */
export async function bulkUpdateProducts(
  codes: string[],
  patch: ProductOverride
): Promise<void> {
  const now = new Date().toISOString().slice(0, 16).replace("T", " ");
  const current = readOverrides();
  for (const code of codes) {
    current[code] = {
      ...(current[code] || {}),
      ...patch,
      code,
      updated_at: now,
    };
  }
  writeOverrides(current);

  if (getAdminToken()) {
    try {
      await syncAllProductsToSheet();
    } catch {
      /* 개별 폴백 생략 */
    }
  }
}

/** 86점+ 전체 상품을 Google 시트에 일괄 동기화 */
export async function syncAllProductsToSheet(): Promise<{
  count: number;
  mode: SyncMeta["mode"];
}> {
  const all = getAllProducts(true);
  try {
    const res = await callApi<{ ok: boolean; count: number; syncedAt: string }>(
      "ppiraBulkSync",
      { items: all },
      true
    );
    setSyncMeta({
      lastSyncedAt: res.syncedAt || new Date().toISOString(),
      mode: "v2-dedicated",
      error: null,
    });
    return { count: res.count, mode: "v2-dedicated" };
  } catch (err) {
    const msg = String(err instanceof Error ? err.message : err);
    if (/알 수 없는 action/.test(msg)) {
      // v1 모드일 때는 로컬 오버라이드가 있는 품목들을 PRINT 탭에 순차 반영
      const ovs = readOverrides();
      const changedCodes = Object.keys(ovs);
      let updatedCount = 0;
      for (const code of changedCodes) {
        const p = all.find((x) => x.code === code);
        if (!p) continue;
        try {
          await callApi(
            "updateCells",
            {
              tab: "PRINT",
              code,
              changes: {
                QTY: p.qty,
                "판매가 (US$)": p.price_usd !== null ? p.price_usd : "",
                Condition: p.condition || "",
                Shop게시: p.visible && p.status !== "sold" ? "Y" : "N",
                Location: p.location || "",
                "MEMO-1": p.admin_memo || "",
                "MEMO-4": packMemo4(ovs[code]),
              },
            },
            true
          );
          updatedCount++;
        } catch {
          /* 행이 없는 신규 품목 등은 건너뜀 */
        }
      }
      setSyncMeta({
        lastSyncedAt: new Date().toISOString(),
        mode: "v1-print-fallback",
        error: null,
      });
      return { count: updatedCount || all.length, mode: "v1-print-fallback" };
    }
    throw err;
  }
}

/** 특정 상품의 오버라이드를 초기값(정적 MD 원본)으로 되돌리기 */
export function resetProductOverride(code: string) {
  const current = readOverrides();
  delete current[code];
  writeOverrides(current);
}

/** 모든 로컬 오버라이드 초기화 */
export function resetAllOverrides() {
  writeOverrides({});
}

// ---- 구매 문의 저장·관리 ----------------------------------------------------

const inqListeners = new Set<() => void>();

export function readInquiries(): InquiryRecord[] {
  try {
    return JSON.parse(localStorage.getItem(INQUIRIES_KEY) || "[]");
  } catch {
    return [];
  }
}

export function writeInquiries(list: InquiryRecord[]) {
  try {
    localStorage.setItem(INQUIRIES_KEY, JSON.stringify(list));
  } catch {
    /* 무시 */
  }
  inqListeners.forEach((fn) => fn());
}

export function subscribeInquiries(fn: () => void) {
  inqListeners.add(fn);
  return () => {
    inqListeners.delete(fn);
  };
}

function mergeInquiriesFromSheet(sheetInqs: InquiryRecord[]) {
  const local = readInquiries();
  const byId = new Map<string, InquiryRecord>();
  for (const item of local) byId.set(item.inquiryId, item);
  for (const item of sheetInqs) byId.set(item.inquiryId, item);
  const merged = Array.from(byId.values()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
  writeInquiries(merged);
}

export async function submitCustomerInquiry(input: {
  name: string;
  contact: string;
  memo: string;
  items: { product: Product; count: number }[];
  totalUsd: string;
}): Promise<{ inquiryId: string; syncedToSheet: boolean }> {
  const now = new Date().toISOString().slice(0, 16).replace("T", " ");
  const fallbackId =
    "INQ-" +
    new Date()
      .toISOString()
      .replace(/[-:T]/g, "")
      .slice(2, 14);
  const codes = input.items.map((r) => r.product.code);
  const summary = input.items
    .map((r) => `${r.product.code} ${r.product.title} × ${r.count}`)
    .join(" / ");

  let inquiryId = fallbackId;
  let syncedToSheet = false;

  try {
    const res = await callApi<{
      ok: boolean;
      inquiryId: string;
      createdAt: string;
    }>(
      "ppiraInquiry",
      {
        name: input.name,
        contact: input.contact,
        memo: input.memo,
        codes: codes.join(", "),
        summary,
        total_usd: input.totalUsd,
      },
      false
    );
    if (res.inquiryId) inquiryId = res.inquiryId;
    syncedToSheet = true;
  } catch {
    /* v1 스크립트이거나 오프라인이면 로컬에 우선 저장 */
  }

  const record: InquiryRecord = {
    inquiryId,
    createdAt: now,
    name: input.name,
    contact: input.contact,
    codes,
    summary,
    totalUsd: input.totalUsd,
    memo: input.memo,
    status: "접수",
    adminNote: "",
    updatedAt: now,
    syncedToSheet,
  };

  const current = readInquiries();
  writeInquiries([record, ...current]);
  return { inquiryId, syncedToSheet };
}

export async function updateInquiryRecord(
  inquiryId: string,
  patch: { status?: InquiryStatus; adminNote?: string }
): Promise<void> {
  const now = new Date().toISOString().slice(0, 16).replace("T", " ");
  const list = readInquiries().map((inq) =>
    inq.inquiryId === inquiryId
      ? {
          ...inq,
          status: patch.status ?? inq.status,
          adminNote: patch.adminNote ?? inq.adminNote,
          updatedAt: now,
        }
      : inq
  );
  writeInquiries(list);

  if (getAdminToken()) {
    try {
      await callApi(
        "ppiraUpdateInquiry",
        {
          inquiryId,
          status: patch.status,
          adminNote: patch.adminNote,
        },
        true
      );
    } catch {
      /* v1 모드일 경우 로컬 저장 유지 */
    }
  }
}

// ---- JSON 내보내기 / 가져오기 -----------------------------------------------

export function exportInventoryJson(): string {
  const payload = {
    exportedAt: new Date().toISOString(),
    totalProducts: getAllProducts(true).length,
    overrides: readOverrides(),
    inquiries: readInquiries(),
    products: getAllProducts(true),
  };
  return JSON.stringify(payload, null, 2);
}

export function importInventoryJson(jsonText: string): { count: number } {
  const data = JSON.parse(jsonText);
  if (data && typeof data.overrides === "object") {
    writeOverrides(data.overrides);
    if (Array.isArray(data.inquiries)) {
      writeInquiries(data.inquiries);
    }
    return { count: Object.keys(data.overrides).length };
  }
  throw new Error("올바른 재고 JSON 파일 형식이 아닙니다.");
}

