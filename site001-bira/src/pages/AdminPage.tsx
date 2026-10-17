import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { marked } from "marked";
import { EPISODES } from "../data/episodes";
import {
  GROUPS,
  Product,
  ProductOverride,
  ProductStatus,
  STATUS_LABELS,
  generateProductMarkdown,
  groupName,
  thumb,
  useProducts,
} from "../lib/products";
import {
  InquiryRecord,
  InquiryStatus,
  SyncMeta,
  bulkUpdateProducts,
  changeAdminPassword,
  checkApiHealth,
  clearAdminSession,
  exportInventoryJson,
  getAdminToken,
  getAdminUser,
  getApiUrl,
  getSyncMeta,
  importInventoryJson,
  loginAdmin,
  readInquiries,
  resetAllOverrides,
  resetProductOverride,
  saveProductChanges,
  setApiUrl,
  subscribeInquiries,
  subscribeSyncMeta,
  syncAdminFromSheet,
  syncAllProductsToSheet,
  updateInquiryRecord,
} from "../lib/inventory";

type AdminTab = "inventory" | "inquiries" | "settings";
type StatusFilter = "all" | "sale" | "reserved" | "sold" | "noprice" | "hidden";
type SortBy = "default" | "code" | "price_desc" | "price_asc" | "qty" | "updated";

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1ytZITjaZlP3h9T5qjJXwRaHtPw8Cz9MJWwNkw0t3mZo";

export default function AdminPage() {
  const products = useProducts(true);
  const [sp, setSp] = useSearchParams();
  const [tab, setTab] = useState<AdminTab>("inventory");

  // 인증 및 동기화 상태
  const [user, setUser] = useState<{ name: string } | null>(getAdminUser);
  const [localMode, setLocalMode] = useState(false);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [loginErr, setLoginErr] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const [syncMeta, setSyncMetaState] = useState<SyncMeta>(getSyncMeta);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [rowStatus, setRowStatus] = useState<Record<string, string>>({});

  // 검색·필터·정렬
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortBy>("default");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // 상세 편집 모달 (<dialog>)
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [isNewItem, setIsNewItem] = useState(false);

  // 문의 목록
  const [inquiries, setInquiries] = useState<InquiryRecord[]>(readInquiries);

  // 설정 탭 상태
  const [apiUrlInput, setApiUrlInput] = useState(getApiUrl);
  const [healthStatus, setHealthStatus] = useState<string | null>(null);
  const [newPass, setNewPass] = useState("");
  const [passMsg, setPassMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubMeta = subscribeSyncMeta(() => {
      setSyncMetaState(getSyncMeta());
      setUser(getAdminUser());
    });
    const unsubInq = subscribeInquiries(() => setInquiries(readInquiries()));
    return () => {
      unsubMeta();
      unsubInq();
    };
  }, []);

  // 로그인되어 있으면 첫 진입 시 시트 동기화
  useEffect(() => {
    if (getAdminToken()) {
      handlePullFromSheet(true);
    }
  }, []);

  // URL ?edit=CODE 파라미터로 진입 시 바로 모달 열기
  useEffect(() => {
    const editCode = sp.get("edit");
    if (editCode && (user || localMode)) {
      const target = products.find((p) => p.code === editCode);
      if (target) {
        openEditModal(target, false);
        sp.delete("edit");
        setSp(sp, { replace: true });
      }
    }
  }, [sp, user, localMode, products]);

  const markRowSaving = (code: string, text: string, autoClear = true) => {
    setRowStatus((prev) => ({ ...prev, [code]: text }));
    if (autoClear) {
      setTimeout(() => {
        setRowStatus((prev) => {
          const copy = { ...prev };
          delete copy[code];
          return copy;
        });
      }, 2200);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginErr(null);
    setLoggingIn(true);
    try {
      const u = await loginAdmin(username, password);
      setUser(u);
      setPassword("");
      await handlePullFromSheet();
    } catch (err) {
      setLoginErr(err instanceof Error ? err.message : String(err));
    } finally {
      setLoggingIn(false);
    }
  };

  const handlePullFromSheet = async (silent = false) => {
    if (!getAdminToken()) return;
    setSyncBusy(true);
    if (!silent) setSyncMsg("Google 시트에서 데이터를 불러오는 중…");
    try {
      const res = await syncAdminFromSheet((msg) => {
        if (!silent) setSyncMsg(msg);
      });
      setSyncMsg(
        `시트 동기화 완료 (${res.count}점 · ${
          res.mode === "v2-dedicated" ? "전용 재고탭" : "PRINT 탭 호환모드"
        })`
      );
    } catch (err) {
      if (!silent) {
        setSyncMsg(
          `시트 불러오기 실패: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    } finally {
      setSyncBusy(false);
    }
  };

  const handlePushAllToSheet = async () => {
    if (!getAdminToken()) {
      setSyncMsg("시트에 저장하려면 먼저 어드민 로그인을 해주세요.");
      return;
    }
    setSyncBusy(true);
    setSyncMsg("전체 재고 데이터를 Google 시트에 저장하는 중…");
    try {
      const res = await syncAllProductsToSheet();
      setSyncMsg(`Google 시트 일괄 저장 완료 (${res.count}점 반영됨 ✓)`);
    } catch (err) {
      setSyncMsg(`시트 저장 오류: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSyncBusy(false);
    }
  };

  const handleQuickChange = async (code: string, patch: ProductOverride) => {
    markRowSaving(code, "저장 중…", false);
    const res = await saveProductChanges(code, patch);
    if (res.synced) {
      markRowSaving(code, "시트 저장됨 ✓");
    } else if (res.error) {
      markRowSaving(code, "로컬 저장됨 (시트 오류)");
    } else {
      markRowSaving(code, "로컬 저장됨 ✓");
    }
  };

  // KPI 집계
  const stats = useMemo(() => {
    const total = products.length;
    const onSale = products.filter((p) => p.status === "sale" && p.qty > 0).length;
    const reserved = products.filter((p) => p.status === "reserved").length;
    const sold = products.filter((p) => p.status === "sold" || p.qty <= 0).length;
    const hidden = products.filter((p) => !p.visible).length;
    const noPrice = products.filter((p) => p.price_usd == null).length;
    const totalValueUsd = products
      .filter((p) => p.status !== "sold" && p.qty > 0 && p.price_usd != null)
      .reduce((acc, p) => acc + (p.price_usd || 0) * p.qty, 0);
    const openInquiries = inquiries.filter((i) => i.status === "접수").length;
    return {
      total,
      onSale,
      reserved,
      sold,
      hidden,
      noPrice,
      totalValueUsd,
      openInquiries,
    };
  }, [products, inquiries]);

  // 필터 및 정렬된 상품 목록
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = products.filter((p) => {
      if (statusFilter === "sale" && (p.status !== "sale" || p.qty <= 0))
        return false;
      if (statusFilter === "reserved" && p.status !== "reserved") return false;
      if (statusFilter === "sold" && p.status !== "sold" && p.qty > 0)
        return false;
      if (statusFilter === "noprice" && p.price_usd !== null) return false;
      if (statusFilter === "hidden" && p.visible) return false;

      if (groupFilter === "featured" && !p.featured) return false;
      if (
        groupFilter !== "all" &&
        groupFilter !== "featured" &&
        p.group !== groupFilter
      )
        return false;

      if (term) {
        const hay = [
          p.code,
          p.title,
          p.title_en,
          p.maker,
          p.year,
          p.condition,
          p.location || "",
          p.admin_memo || "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });

    if (sortBy === "code") {
      list.sort((a, b) => a.code.localeCompare(b.code));
    } else if (sortBy === "price_desc") {
      list.sort((a, b) => (b.price_usd ?? -1) - (a.price_usd ?? -1));
    } else if (sortBy === "price_asc") {
      list.sort((a, b) => (a.price_usd ?? 999999) - (b.price_usd ?? 999999));
    } else if (sortBy === "qty") {
      list.sort((a, b) => b.qty - a.qty);
    } else if (sortBy === "updated") {
      list.sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));
    }
    return list;
  }, [products, q, statusFilter, groupFilter, sortBy]);

  // 상세 편집 모달 열기/닫기
  const openEditModal = (p: Product, isNew: boolean) => {
    setEditing({ ...p });
    setIsNewItem(isNew);
    const dlg = dialogRef.current;
    if (dlg && !dlg.open) {
      dlg.showModal();
    }
  };

  const openNewProductModal = () => {
    const today = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    const suggestedCode = `APKC${today}001`;
    openEditModal(
      {
        code: suggestedCode,
        title: "",
        title_en: "",
        year: "1950",
        maker: "",
        size: "",
        qty: 1,
        price_usd: 100,
        group: "etc",
        episodes: [],
        featured: false,
        images: ["APKC210526397C_1.jpg"],
        condition: "양호",
        body_md: "## 무슨 삐라인가\n\n상품 설명을 입력해 주세요.\n\n## 구매\n\n고가 1점물이라 실결제 없이 **구매 문의**로 진행합니다.",
        html: "",
        status: "sale",
        visible: true,
        location: "",
        admin_memo: "",
        is_custom: true,
      },
      true
    );
  };

  const closeEditModal = () => {
    dialogRef.current?.close();
    setEditing(null);
  };

  const handleSaveModal = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing || !editing.code.trim()) return;
    const code = editing.code.trim();
    markRowSaving(code, "저장 중…", false);
    const res = await saveProductChanges(code, {
      code,
      title: editing.title,
      title_en: editing.title_en,
      year: editing.year,
      maker: editing.maker,
      size: editing.size,
      qty: editing.qty,
      price_usd: editing.price_usd,
      group: editing.group,
      episodes: editing.episodes,
      featured: editing.featured,
      images: editing.images,
      condition: editing.condition,
      body_md: editing.body_md,
      status: editing.status,
      visible: editing.visible,
      location: editing.location,
      admin_memo: editing.admin_memo,
      is_custom: editing.is_custom,
    });
    markRowSaving(
      code,
      res.synced ? "시트 저장됨 ✓" : "로컬 저장됨 ✓"
    );
    closeEditModal();
  };

  const handleDownloadMd = (p: Product) => {
    const md = generateProductMarkdown(p);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${p.code}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = () => {
    const json = exportInventoryJson();
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ppira-inventory-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const res = importInventoryJson(text);
      setSyncMsg(`JSON 파일에서 ${res.count}건의 재고 설정을 불러왔습니다.`);
    } catch (err) {
      setSyncMsg(`JSON 가져오기 실패: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      e.target.value = "";
    }
  };

  // 체크박스 전체 선택/해제
  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((p) => p.code)));
    }
  };

  const toggleSelectOne = (code: string) => {
    const next = new Set(selected);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    setSelected(next);
  };

  // 로그인 전 화면
  if (!user && !localMode) {
    return (
      <section className="stage cream band admin-wrap">
        <div className="wrap narrow">
          <div className="admin-login-box">
            <span className="logo-chip">티제이 김 컬렉션 · 삐라 상점</span>
            <h1 className="h2">재고·문의 관리 어드민</h1>
            <p className="lead">
              Google 시트(<code>tjkim-items</code>) 및 Apps Script 웹 앱과 연동하여 86점 삐라의 재고 수량·판매상태·가격·문의를 실시간으로 관리합니다.
            </p>
            <form className="admin-login-form" onSubmit={handleLogin}>
              <div className="field">
                <label htmlFor="admin-id">관리자 아이디 *</label>
                <input
                  id="admin-id"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
              </div>
              <div className="field">
                <label htmlFor="admin-pw">비밀번호 *</label>
                <input
                  id="admin-pw"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="초기 비밀번호: admin"
                  autoComplete="current-password"
                />
              </div>
              {loginErr && (
                <div className="admin-alert error">
                  <span aria-hidden="true">❌</span> {loginErr}
                </div>
              )}
              <div className="product-cta">
                <button type="submit" className="btn big red" disabled={loggingIn}>
                  {loggingIn ? "연결 중…" : "Google 시트 연동 로그인"}
                </button>
                <button
                  type="button"
                  className="btn big yellow"
                  onClick={() => setLocalMode(true)}
                >
                  로컬 미리보기 모드로 열기
                </button>
              </div>
              <p className="small">
                * 기존 <code>admin001</code>과 동일한 계정(기본값 <code>admin</code> / <code>admin</code>)을 사용합니다.
              </p>
            </form>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="stage cream band admin-wrap">
      <div className="wrap admin-container">
        {/* 상단 헤더 & 동기화 바 */}
        <div className="admin-top-bar">
          <div>
            <div className="admin-status-line">
              <span
                className={`sync-dot ${
                  user ? "online" : "local"
                }`}
              />
              <b>
                {user
                  ? `Google 시트 연결됨 (${user.name})`
                  : "로컬 브라우저 저장 모드 (시트 미로그인)"}
              </b>
              {syncMeta.lastSyncedAt && (
                <span className="small">
                  · 마지막 동기화: {syncMeta.lastSyncedAt.slice(0, 16).replace("T", " ")}
                </span>
              )}
            </div>
            <h1 className="h2" style={{ marginTop: 6, marginBottom: 0 }}>
              삐라 상점 재고 관리대
            </h1>
          </div>

          <div className="admin-top-actions">
            <button
              type="button"
              className="btn small yellow"
              onClick={() => handlePullFromSheet(false)}
              disabled={syncBusy || !user}
            >
              ↻ 시트에서 새로고침
            </button>
            <button
              type="button"
              className="btn small red"
              onClick={handlePushAllToSheet}
              disabled={syncBusy || !user}
            >
              ↑ 시트에 전체 재고 저장
            </button>
            <button
              type="button"
              className="btn small ink"
              onClick={openNewProductModal}
            >
              + 새 상품 등록
            </button>
            <a
              href="https://tjkim-image01.github.io/tjsites/site001-bira/"
              target="_blank"
              rel="noreferrer"
              className="btn small"
            >
              공개 상점 열기 ↗
            </a>
            <a
              href={SHEET_URL}
              target="_blank"
              rel="noreferrer"
              className="btn small"
            >
              시트 열기 ↗
            </a>
            {user ? (
              <button
                type="button"
                className="btn small"
                onClick={() => {
                  clearAdminSession();
                  setUser(null);
                }}
              >
                로그아웃
              </button>
            ) : (
              <button
                type="button"
                className="btn small"
                onClick={() => setLocalMode(false)}
              >
                시트 로그인
              </button>
            )}
          </div>
        </div>

        {syncMsg && (
          <div className="admin-sync-banner">
            <span>{syncMsg}</span>
            <button type="button" onClick={() => setSyncMsg(null)}>
              ✕
            </button>
          </div>
        )}

        {/* KPI 요약 카드 */}
        <div className="admin-kpi-grid">
          <button
            type="button"
            className={`admin-kpi ${statusFilter === "all" ? "active" : ""}`}
            onClick={() => {
              setTab("inventory");
              setStatusFilter("all");
            }}
          >
            <span>전체 품목</span>
            <b>{stats.total}점</b>
          </button>
          <button
            type="button"
            className={`admin-kpi sale ${statusFilter === "sale" ? "active" : ""}`}
            onClick={() => {
              setTab("inventory");
              setStatusFilter("sale");
            }}
          >
            <span>판매중</span>
            <b>{stats.onSale}점</b>
          </button>
          <button
            type="button"
            className={`admin-kpi reserved ${
              statusFilter === "reserved" ? "active" : ""
            }`}
            onClick={() => {
              setTab("inventory");
              setStatusFilter("reserved");
            }}
          >
            <span>예약중</span>
            <b>{stats.reserved}점</b>
          </button>
          <button
            type="button"
            className={`admin-kpi sold ${statusFilter === "sold" ? "active" : ""}`}
            onClick={() => {
              setTab("inventory");
              setStatusFilter("sold");
            }}
          >
            <span>판매완료(품절)</span>
            <b>{stats.sold}점</b>
          </button>
          <button
            type="button"
            className={`admin-kpi ${statusFilter === "noprice" ? "active" : ""}`}
            onClick={() => {
              setTab("inventory");
              setStatusFilter("noprice");
            }}
          >
            <span>가격 '문의'</span>
            <b>{stats.noPrice}점</b>
          </button>
          <button
            type="button"
            className={`admin-kpi ${statusFilter === "hidden" ? "active" : ""}`}
            onClick={() => {
              setTab("inventory");
              setStatusFilter("hidden");
            }}
          >
            <span>숨김(비노출)</span>
            <b>{stats.hidden}점</b>
          </button>
          <div className="admin-kpi val">
            <span>판매중 재고 합계</span>
            <b>${stats.totalValueUsd.toLocaleString("en-US")}</b>
          </div>
          <button
            type="button"
            className={`admin-kpi inq ${tab === "inquiries" ? "active" : ""}`}
            onClick={() => setTab("inquiries")}
          >
            <span>구매 문의 (미처리)</span>
            <b>
              {inquiries.length}건 ({stats.openInquiries})
            </b>
          </button>
        </div>

        {/* 어드민 메인 탭 전환 */}
        <div className="admin-tabs">
          <button
            type="button"
            className={`admin-tab ${tab === "inventory" ? "on" : ""}`}
            onClick={() => setTab("inventory")}
          >
            1. 재고·상품 관리 ({products.length})
          </button>
          <button
            type="button"
            className={`admin-tab ${tab === "inquiries" ? "on" : ""}`}
            onClick={() => setTab("inquiries")}
          >
            2. 구매 문의 내역 ({inquiries.length})
          </button>
          <button
            type="button"
            className={`admin-tab ${tab === "settings" ? "on" : ""}`}
            onClick={() => setTab("settings")}
          >
            3. Google 시트·GitHub Pages 퍼블리쉬 설정
          </button>
        </div>

        {/* 탭 1: 재고·상품 관리 */}
        {tab === "inventory" && (
          <div className="admin-panel">
            <search className="admin-filter-bar">
              <input
                type="search"
                className="admin-search-input"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="품목 코드(APAC…), 한글/영문 제목, 발행처, 보관위치, 메모 검색…"
                aria-label="재고 품목 검색"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                aria-label="판매상태 필터"
              >
                <option value="all">상태: 전체 ({products.length})</option>
                <option value="sale">판매중 ({stats.onSale})</option>
                <option value="reserved">예약중 ({stats.reserved})</option>
                <option value="sold">판매완료·품절 ({stats.sold})</option>
                <option value="noprice">가격 미정/문의 ({stats.noPrice})</option>
                <option value="hidden">비노출/숨김 ({stats.hidden})</option>
              </select>
              <select
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                aria-label="주제 분류 필터"
              >
                <option value="all">분류: 전체</option>
                {GROUPS.map(([k, name]) => (
                  <option key={k} value={k}>
                    {name}
                  </option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                aria-label="정렬 기준"
              >
                <option value="default">정렬: 영상추천·연도순</option>
                <option value="code">품목 코드순</option>
                <option value="price_desc">가격 높은순</option>
                <option value="price_asc">가격 낮은순</option>
                <option value="qty">재고 수량순</option>
                <option value="updated">최근 수정순</option>
              </select>
              <button
                type="button"
                className="btn small"
                onClick={handleDownloadJson}
              >
                JSON 백업 ↓
              </button>
            </search>

            {/* 다중 선택 시 일괄 변경 바 */}
            {selected.size > 0 && (
              <div className="admin-bulk-bar">
                <b>{selected.size}개 품목 선택됨</b>
                <div className="admin-bulk-btns">
                  <button
                    type="button"
                    className="btn small"
                    onClick={() =>
                      bulkUpdateProducts(Array.from(selected), {
                        status: "sale",
                        qty: 1,
                      })
                    }
                  >
                    일괄 '판매중'
                  </button>
                  <button
                    type="button"
                    className="btn small yellow"
                    onClick={() =>
                      bulkUpdateProducts(Array.from(selected), {
                        status: "reserved",
                      })
                    }
                  >
                    일괄 '예약중'
                  </button>
                  <button
                    type="button"
                    className="btn small red"
                    onClick={() =>
                      bulkUpdateProducts(Array.from(selected), {
                        status: "sold",
                        qty: 0,
                      })
                    }
                  >
                    일괄 '판매완료(품절)'
                  </button>
                  <button
                    type="button"
                    className="btn small"
                    onClick={() =>
                      bulkUpdateProducts(Array.from(selected), {
                        visible: true,
                      })
                    }
                  >
                    일괄 노출 켜기
                  </button>
                  <button
                    type="button"
                    className="btn small"
                    onClick={() =>
                      bulkUpdateProducts(Array.from(selected), {
                        visible: false,
                      })
                    }
                  >
                    일괄 숨김
                  </button>
                  <button
                    type="button"
                    className="btn small ink"
                    onClick={() => setSelected(new Set())}
                  >
                    선택 해제
                  </button>
                </div>
              </div>
            )}

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={
                          filtered.length > 0 && selected.size === filtered.length
                        }
                        onChange={toggleSelectAll}
                        aria-label="전체 선택"
                      />
                    </th>
                    <th>사진</th>
                    <th>코드 / 연도</th>
                    <th>상품명 / 발행처</th>
                    <th>주제 분류</th>
                    <th>판매 상태</th>
                    <th>재고 수량</th>
                    <th>판매가(USD)</th>
                    <th>노출 / 추천</th>
                    <th>보관위치 / 메모</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr
                      key={p.code}
                      className={`${p.status === "sold" || p.qty <= 0 ? "row-sold" : ""} ${
                        !p.visible ? "row-hidden" : ""
                      }`}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.has(p.code)}
                          onChange={() => toggleSelectOne(p.code)}
                          aria-label={`${p.code} 선택`}
                        />
                      </td>
                      <td>
                        <Link to={`/shop/${p.code}`} target="_blank">
                          <img
                            src={thumb(p)}
                            alt={p.title}
                            className="admin-thumb"
                            loading="lazy"
                          />
                        </Link>
                      </td>
                      <td className="mono-cell">
                        <Link
                          to={`/shop/${p.code}`}
                          className="admin-code-link"
                          target="_blank"
                        >
                          {p.code}
                        </Link>
                        <div className="small">{p.year || "연도미상"}</div>
                        {rowStatus[p.code] && (
                          <div className="row-save-badge">{rowStatus[p.code]}</div>
                        )}
                      </td>
                      <td>
                        <input
                          type="text"
                          className="admin-inline-title"
                          defaultValue={p.title}
                          key={`${p.code}-title-${p.title}`}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v && v !== p.title) {
                              handleQuickChange(p.code, { title: v });
                            }
                          }}
                          aria-label={`${p.code} 한글 제목`}
                        />
                        <div className="small">{p.maker || p.title_en}</div>
                      </td>
                      <td>
                        <select
                          className="admin-inline-select"
                          value={p.group}
                          onChange={(e) =>
                            handleQuickChange(p.code, { group: e.target.value })
                          }
                          aria-label={`${p.code} 분류`}
                        >
                          {GROUPS.filter((g) => g[0] !== "featured").map(
                            ([k, name]) => (
                              <option key={k} value={k}>
                                {name}
                              </option>
                            )
                          )}
                        </select>
                      </td>
                      <td>
                        <div className="status-seg">
                          {(["sale", "reserved", "sold"] as ProductStatus[]).map(
                            (st) => (
                              <button
                                type="button"
                                key={st}
                                className={`seg-btn ${st} ${
                                  p.status === st ? "on" : ""
                                }`}
                                onClick={() =>
                                  handleQuickChange(p.code, {
                                    status: st,
                                    qty:
                                      st === "sold"
                                        ? 0
                                        : st === "sale" && p.qty <= 0
                                        ? 1
                                        : p.qty,
                                  })
                                }
                              >
                                {STATUS_LABELS[st]}
                              </button>
                            )
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="admin-qty-ctrl">
                          <button
                            type="button"
                            onClick={() =>
                              handleQuickChange(p.code, {
                                qty: Math.max(0, p.qty - 1),
                              })
                            }
                            aria-label="재고 감소"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min={0}
                            key={`${p.code}-qty-${p.qty}`}
                            defaultValue={p.qty}
                            onBlur={(e) => {
                              const n = Math.max(
                                0,
                                parseInt(e.target.value || "0", 10)
                              );
                              if (n !== p.qty) {
                                handleQuickChange(p.code, { qty: n });
                              }
                            }}
                            aria-label={`${p.code} 수량`}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleQuickChange(p.code, { qty: p.qty + 1 })
                            }
                            aria-label="재고 증가"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td>
                        <div className="admin-price-ctrl">
                          <span>$</span>
                          <input
                            type="number"
                            min={0}
                            step="10"
                            placeholder="문의"
                            key={`${p.code}-price-${p.price_usd ?? "null"}`}
                            defaultValue={p.price_usd ?? ""}
                            onBlur={(e) => {
                              const rawVal = e.target.value.trim();
                              const nextPrice =
                                rawVal === "" ? null : Number(rawVal);
                              if (nextPrice !== p.price_usd) {
                                handleQuickChange(p.code, {
                                  price_usd: nextPrice,
                                });
                              }
                            }}
                            aria-label={`${p.code} 판매가 USD`}
                          />
                        </div>
                      </td>
                      <td>
                        <div className="admin-toggles">
                          <button
                            type="button"
                            className={`mini-toggle ${p.visible ? "on" : "off"}`}
                            onClick={() =>
                              handleQuickChange(p.code, { visible: !p.visible })
                            }
                          >
                            {p.visible ? "노출중" : "숨김"}
                          </button>
                          <button
                            type="button"
                            className={`mini-toggle feat ${
                              p.featured ? "on" : ""
                            }`}
                            onClick={() =>
                              handleQuickChange(p.code, {
                                featured: !p.featured,
                              })
                            }
                          >
                            {p.featured ? "★영상추천" : "일반"}
                          </button>
                        </div>
                      </td>
                      <td>
                        <input
                          type="text"
                          className="admin-inline-loc"
                          placeholder="보관위치 (예: 화일-3)"
                          key={`${p.code}-loc-${p.location ?? ""}`}
                          defaultValue={p.location || ""}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v !== (p.location || "")) {
                              handleQuickChange(p.code, { location: v });
                            }
                          }}
                          aria-label={`${p.code} 보관위치`}
                        />
                        {p.admin_memo && (
                          <div className="small memo-preview" title={p.admin_memo}>
                            메모: {p.admin_memo}
                          </div>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn small yellow"
                          onClick={() => openEditModal(p, false)}
                        >
                          상세 편집
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 탭 2: 구매 문의 관리 */}
        {tab === "inquiries" && (
          <div className="admin-panel">
            <div className="admin-inq-head">
              <h2 className="h3" style={{ margin: 0 }}>
                구매 문의 접수 내역 ({inquiries.length}건)
              </h2>
              <p className="small">
                고객이 <code>/inquiry</code>에서 접수한 내역입니다. 품목을 원클릭으로 '예약중' 또는 '판매완료(품절)' 처리할 수 있습니다.
              </p>
            </div>

            {inquiries.length === 0 ? (
              <div className="admin-empty-box">
                아직 접수된 구매 문의가 없습니다. 고객이 구매 문의 페이지에서 '문의 바로 접수하기'를 누르면 여기에 표시되고 Google 시트 <code>삐라상점_문의</code> 탭에 기록됩니다.
              </div>
            ) : (
              <div className="admin-inq-list">
                {inquiries.map((inq) => (
                  <div key={inq.inquiryId} className="admin-inq-card">
                    <div className="admin-inq-top">
                      <div>
                        <span className={`inq-badge ${inq.status}`}>
                          {inq.status}
                        </span>
                        <b style={{ marginLeft: 8 }}>{inq.name}</b> ({inq.contact})
                        <span className="small" style={{ marginLeft: 10 }}>
                          {inq.createdAt} · {inq.inquiryId}
                        </span>
                      </div>
                      <div className="admin-inq-actions">
                        {(
                          ["접수", "연락완료", "거래완료", "취소"] as InquiryStatus[]
                        ).map((st) => (
                          <button
                            type="button"
                            key={st}
                            className={`seg-btn ${inq.status === st ? "on" : ""}`}
                            onClick={() =>
                              updateInquiryRecord(inq.inquiryId, { status: st })
                            }
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="admin-inq-body">
                      <div>
                        <b>문의 품목:</b> {inq.summary || inq.codes.join(", ")} (
                        <b>{inq.totalUsd}</b>)
                      </div>
                      {inq.memo && (
                        <div>
                          <b>고객 메모:</b> {inq.memo}
                        </div>
                      )}
                      {inq.codes.length > 0 && (
                        <div className="admin-inq-stock-btns">
                          <span>품목 재고 연동:</span>
                          <button
                            type="button"
                            className="btn small yellow"
                            onClick={() =>
                              bulkUpdateProducts(inq.codes, {
                                status: "reserved",
                              })
                            }
                          >
                            문의 품목 '예약중'으로 변경
                          </button>
                          <button
                            type="button"
                            className="btn small red"
                            onClick={() => {
                              bulkUpdateProducts(inq.codes, {
                                status: "sold",
                                qty: 0,
                              });
                              updateInquiryRecord(inq.inquiryId, {
                                status: "거래완료",
                              });
                            }}
                          >
                            거래완료 & 품목 '판매완료(품절)' 처리
                          </button>
                        </div>
                      )}
                      <div className="admin-inq-note">
                        <input
                          type="text"
                          placeholder="관리자 비고 입력 (예: 10/18 통화 완료, 입금 대기)…"
                          defaultValue={inq.adminNote}
                          onBlur={(e) => {
                            if (e.target.value !== inq.adminNote) {
                              updateInquiryRecord(inq.inquiryId, {
                                adminNote: e.target.value,
                              });
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 탭 3: 데이터·퍼블리쉬 설정 */}
        {tab === "settings" && (
          <div className="admin-panel admin-settings-grid">
            <div className="admin-card">
              <h2 className="h3" style={{ marginTop: 0 }}>
                1. GitHub Pages 퍼블리쉬 시 데이터 처리 구조
              </h2>
              <p>
                GitHub Pages는 <b>정적 웹 호스팅</b>이므로 서버나 DB가 직접 돌아가지 않습니다. 따라서 데이터는 <b>정적 마크다운 + Google 시트(Apps Script 웹 앱) 하이브리드</b>로 처리합니다:
              </p>
              <ol className="admin-guide-list">
                <li>
                  <b>기본 상품 소개·이미지·영상 (정적 빌드)</b>: 86점의 <code>src/content/products/*.md</code>와 이미지는 빌드 시점에 포함되어 페이지가 0초 만에 즉시 열립니다.
                </li>
                <li>
                  <b>실시간 재고·가격·품절·문의 (Google 시트 + Apps Script)</b>: 어드민(<code>#/admin</code>)에서 수량·판매상태·가격을 고치면 <b>Google 시트(<code>tjkim-items</code>)</b>에 즉시 저장됩니다.
                </li>
                <li>
                  <b>기존 <code>admin001</code>과 100% 호환</b>: 이미 배포된 Apps Script 웹 앱 주소가 기본 내장되어 있어 별도 서버 비용 없이 바로 시트의 <code>PRINT</code> 탭과 동기화되며, <code>apps-script/Code.js</code> 새 버전을 배포하면 전용 <code>삐라상점_재고</code> 탭과 <code>삐라상점_문의</code> 탭까지 자동으로 생성됩니다.
                </li>
              </ol>
            </div>

            <div className="admin-card">
              <h2 className="h3" style={{ marginTop: 0 }}>
                2. Google Apps Script 웹 앱 API 설정
              </h2>
              <div className="field">
                <label htmlFor="cfg-api-url">Apps Script 웹 앱 URL (/exec)</label>
                <input
                  id="cfg-api-url"
                  type="url"
                  value={apiUrlInput}
                  onChange={(e) => setApiUrlInput(e.target.value)}
                />
              </div>
              <div className="product-cta">
                <button
                  type="button"
                  className="btn small red"
                  onClick={async () => {
                    setApiUrl(apiUrlInput);
                    setHealthStatus("연결 확인 중…");
                    const h = await checkApiHealth(apiUrlInput);
                    setHealthStatus(
                      h.ok
                        ? `✓ 연결 성공 (${h.version || "v1-compatible"} · ${h.time})`
                        : "❌ 연결 실패 — URL과 배포 권한(모든 사용자)을 확인하세요."
                    );
                  }}
                >
                  URL 저장 및 연결 테스트
                </button>
                <a
                  href={SHEET_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="btn small yellow"
                >
                  Google 시트 열기 ↗
                </a>
              </div>
              {healthStatus && <p className="small"><b>{healthStatus}</b></p>}

              <hr style={{ margin: "20px 0", borderColor: "var(--ink)" }} />

              <h3 className="h3" style={{ fontSize: 22 }}>
                관리자 비밀번호 변경
              </h3>
              <div className="admin-pass-row">
                <input
                  type="password"
                  placeholder="새 비밀번호 (4자 이상)"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                />
                <button
                  type="button"
                  className="btn small ink"
                  onClick={async () => {
                    try {
                      await changeAdminPassword(newPass);
                      setNewPass("");
                      setPassMsg("✓ 비밀번호가 변경되었습니다.");
                    } catch (err) {
                      setPassMsg(
                        `오류: ${err instanceof Error ? err.message : String(err)}`
                      );
                    }
                  }}
                >
                  비밀번호 변경
                </button>
              </div>
              {passMsg && <p className="small">{passMsg}</p>}
            </div>

            <div className="admin-card">
              <h2 className="h3" style={{ marginTop: 0 }}>
                3. 백업 · 복원 · 초기화
              </h2>
              <p className="small">
                재고 및 수정 내역을 JSON 파일로 내려받아 보관하거나 복원할 수 있습니다.
              </p>
              <div className="product-cta">
                <button
                  type="button"
                  className="btn small yellow"
                  onClick={handleDownloadJson}
                >
                  재고 JSON 내보내기 (백업)
                </button>
                <button
                  type="button"
                  className="btn small"
                  onClick={() => fileInputRef.current?.click()}
                >
                  재고 JSON 불러오기 (복원)
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  style={{ display: "none" }}
                  onChange={handleImportJsonFile}
                />
                <button
                  type="button"
                  className="btn small"
                  onClick={() => {
                    if (
                      window.confirm(
                        "브라우저에 저장된 로컬 수정본을 초기 상태(원본 MD 기준)로 되돌릴까요?"
                      )
                    ) {
                      resetAllOverrides();
                      setSyncMsg("로컬 오버라이드가 초기화되었습니다.");
                    }
                  }}
                >
                  로컬 캐시 초기화
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 상품 상세 편집 / 신규 등록 모달 (<dialog>) */}
      <dialog ref={dialogRef} className="admin-dialog" closedby="any">
        {editing && (
          <form className="admin-modal-form" onSubmit={handleSaveModal}>
            <div className="admin-modal-head">
              <h2>
                {isNewItem
                  ? "새 상품 등록"
                  : `상품 상세·재고 편집 (${editing.code})`}
              </h2>
              <button
                type="button"
                className="btn small"
                onClick={closeEditModal}
              >
                ✕ 닫기
              </button>
            </div>

            <div className="admin-modal-grid">
              <div className="field">
                <label>품목 코드 (Item No.) *</label>
                <input
                  required
                  readOnly={!isNewItem}
                  value={editing.code}
                  onChange={(e) =>
                    setEditing({ ...editing, code: e.target.value.toUpperCase() })
                  }
                />
              </div>
              <div className="field">
                <label>판매 상태</label>
                <select
                  value={editing.status}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      status: e.target.value as ProductStatus,
                    })
                  }
                >
                  <option value="sale">판매중 (sale)</option>
                  <option value="reserved">예약중 (reserved)</option>
                  <option value="sold">판매완료·품절 (sold)</option>
                </select>
              </div>
              <div className="field">
                <label>재고 수량 (점)</label>
                <input
                  type="number"
                  min={0}
                  value={editing.qty}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      qty: Math.max(0, parseInt(e.target.value || "0", 10)),
                    })
                  }
                />
              </div>
              <div className="field">
                <label>판매가 (USD, 비우면 '문의')</label>
                <input
                  type="number"
                  min={0}
                  step="10"
                  placeholder="문의"
                  value={editing.price_usd ?? ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      price_usd:
                        e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </div>

              <div className="field span-2">
                <label>한글 상품명 *</label>
                <input
                  required
                  value={editing.title}
                  onChange={(e) =>
                    setEditing({ ...editing, title: e.target.value })
                  }
                />
              </div>
              <div className="field span-2">
                <label>영문/원문 제목 (TITLE)</label>
                <input
                  value={editing.title_en}
                  onChange={(e) =>
                    setEditing({ ...editing, title_en: e.target.value })
                  }
                />
              </div>

              <div className="field">
                <label>주제 분류 (group)</label>
                <select
                  value={editing.group}
                  onChange={(e) =>
                    setEditing({ ...editing, group: e.target.value })
                  }
                >
                  {GROUPS.filter((g) => g[0] !== "featured").map(([k, name]) => (
                    <option key={k} value={k}>
                      {name} ({k})
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>연도 (Year)</label>
                <input
                  value={editing.year}
                  onChange={(e) =>
                    setEditing({ ...editing, year: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label>발행처 (Maker)</label>
                <input
                  value={editing.maker}
                  onChange={(e) =>
                    setEditing({ ...editing, maker: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label>크기 (Size)</label>
                <input
                  value={editing.size}
                  onChange={(e) =>
                    setEditing({ ...editing, size: e.target.value })
                  }
                />
              </div>

              <div className="field span-2">
                <label>보존 상태 (Condition)</label>
                <input
                  value={editing.condition}
                  onChange={(e) =>
                    setEditing({ ...editing, condition: e.target.value })
                  }
                  placeholder="예: 접힘 자국, 전반적으로 양호"
                />
              </div>
              <div className="field">
                <label>보관 위치 (어드민 비공개)</label>
                <input
                  value={editing.location || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, location: e.target.value })
                  }
                  placeholder="예: 한국전쟁화일-3"
                />
              </div>
              <div className="field">
                <label>노출 & 추천 설정</label>
                <div className="admin-chk-row">
                  <label>
                    <input
                      type="checkbox"
                      checked={editing.visible}
                      onChange={(e) =>
                        setEditing({ ...editing, visible: e.target.checked })
                      }
                    />{" "}
                    상점 노출
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={editing.featured}
                      onChange={(e) =>
                        setEditing({ ...editing, featured: e.target.checked })
                      }
                    />{" "}
                    영상에 나온 그 장(추천)
                  </label>
                </div>
              </div>

              <div className="field span-4">
                <label>관리자 비공개 메모 (원가·입수처·참고사항 등 — 고객 화면 비노출)</label>
                <input
                  value={editing.admin_memo || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, admin_memo: e.target.value })
                  }
                  placeholder="어드민 전용 메모"
                />
              </div>

              <div className="field span-4">
                <label>등장 영상 에피소드 선택</label>
                <div className="admin-ep-chips">
                  {EPISODES.map((ep) => {
                    const hasEp = editing.episodes.includes(ep.id);
                    return (
                      <button
                        type="button"
                        key={ep.id}
                        className={`mini-toggle ${hasEp ? "on" : ""}`}
                        onClick={() => {
                          const next = hasEp
                            ? editing.episodes.filter((x) => x !== ep.id)
                            : [...editing.episodes, ep.id];
                          setEditing({ ...editing, episodes: next });
                        }}
                      >
                        {ep.no}편 ({ep.id})
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="field span-4">
                <label>이미지 파일명 또는 URL (쉼표 구분)</label>
                <input
                  value={editing.images.join(", ")}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      images: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </div>

              <div className="field span-2">
                <label>상세 본문 (Markdown)</label>
                <textarea
                  rows={10}
                  value={editing.body_md}
                  onChange={(e) =>
                    setEditing({ ...editing, body_md: e.target.value })
                  }
                />
              </div>
              <div className="field span-2">
                <label>본문 미리보기</label>
                <div
                  className="admin-md-preview md"
                  dangerouslySetInnerHTML={{
                    __html: marked.parse(editing.body_md || "") as string,
                  }}
                />
              </div>
            </div>

            <div className="admin-modal-foot">
              <div className="product-cta" style={{ margin: 0 }}>
                <button type="submit" className="btn red">
                  저장하기 (시트 + 브라우저)
                </button>
                <button
                  type="button"
                  className="btn yellow"
                  onClick={() => handleDownloadMd(editing)}
                >
                  {editing.code}.md 파일 다운로드
                </button>
                {!isNewItem && (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      resetProductOverride(editing.code);
                      closeEditModal();
                    }}
                  >
                    원본 MD 값으로 초기화
                  </button>
                )}
              </div>
              <button
                type="button"
                className="btn ink"
                onClick={closeEditModal}
              >
                취소
              </button>
            </div>
          </form>
        )}
      </dialog>
    </section>
  );
}

