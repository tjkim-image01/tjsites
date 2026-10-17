// 공개 상점용 실시간 재고 조회 + 구매 문의 접수 모듈 (어드민 코드 미포함)
import {
  Product,
  ProductStatus,
  readOverrides,
  writeOverrides,
} from "./products";

const API_URL =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL ||
  "https://script.google.com/macros/s/AKfycbzM1qrRW6cMIpeB5CZN4iE-xXqN_rVzzVG2sCeEAWcHr_kJkxaQbxKqp23nLd7HZj76/exec";

let publicSyncInFlight: Promise<void> | null = null;

export function syncPublicStock(): Promise<void> {
  if (publicSyncInFlight) return publicSyncInFlight;
  publicSyncInFlight = (async () => {
    try {
      if (!API_URL) return;
      const res = await fetch(`${API_URL}?action=ppiraStock`, {
        redirect: "follow",
      });
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
            condition:
              item.condition !== undefined ? item.condition : prev.condition,
            images: item.images ?? prev.images,
            body_md: item.body_md || prev.body_md,
            updated_at: item.updated_at || prev.updated_at,
          };
        }
        writeOverrides(current);
      }
    } catch {
      /* 오프라인/초기 상태에서는 정적 기본값 사용 */
    } finally {
      publicSyncInFlight = null;
    }
  })();
  return publicSyncInFlight;
}

export async function submitCustomerInquiry(input: {
  name: string;
  contact: string;
  memo: string;
  items: { product: Product; count: number }[];
  totalUsd: string;
}): Promise<{ inquiryId: string; syncedToSheet: boolean }> {
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
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "ppiraInquiry",
        name: input.name,
        contact: input.contact,
        memo: input.memo,
        codes: codes.join(", "),
        summary,
        total_usd: input.totalUsd,
      }),
      redirect: "follow",
    });
    if (res.ok) {
      const data = await res.json();
      if (data && !data.error) {
        if (data.inquiryId) inquiryId = data.inquiryId;
        syncedToSheet = true;
      }
    }
  } catch {
    /* 메일 전송 병행 */
  }

  return { inquiryId, syncedToSheet };
}
