import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { fmtPrice, productByCode, useProducts } from "../lib/products";
import { submitCustomerInquiry } from "../lib/inventory";
import { useCart } from "../lib/cart";
import { Bubble, Char, Stamp } from "../components/Chars";

const TO = "tjkim.image01@gmail.com";

export default function InquiryPage() {
  useProducts(false);
  const { cart } = useCart();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [memo, setMemo] = useState("");
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedInfo, setSubmittedInfo] = useState<{
    inquiryId: string;
    syncedToSheet: boolean;
  } | null>(null);

  const rows = Object.entries(cart)
    .map(([code, n]) => ({ p: productByCode(code), n }))
    .filter((r) => r.p);
  const total = rows.reduce((a, r) => a + (r.p!.price_usd ?? 0) * r.n, 0);
  const unknown = rows.some((r) => r.p!.price_usd == null);
  const totalStr = `$${total.toLocaleString("en-US")}${unknown ? " + 문의" : ""}`;

  const body = [
    `[삐라 상점 구매 문의]`,
    `이름: ${name}`,
    `연락처: ${contact}`,
    ``,
    `문의 품목:`,
    ...rows.map((r) => `- ${r.p!.code} ${r.p!.title} × ${r.n} (${fmtPrice(r.p!)})`),
    ``,
    `메모: ${memo}`,
  ].join("\n");

  const href = `mailto:${TO}?subject=${encodeURIComponent(
    "삐라 상점 구매 문의"
  )}&body=${encodeURIComponent(body)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 무시 */
    }
  };

  const syncAriaInvalid = (input: HTMLInputElement | HTMLTextAreaElement) => {
    if (!input.checkValidity()) {
      input.setAttribute("aria-invalid", "true");
    } else {
      input.removeAttribute("aria-invalid");
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    form
      .querySelectorAll<HTMLInputElement>("input[required]")
      .forEach(syncAriaInvalid);
    if (!form.checkValidity()) return;

    setSubmitting(true);
    try {
      const res = await submitCustomerInquiry({
        name,
        contact,
        memo,
        items: rows.map((r) => ({ product: r.p!, count: r.n })),
        totalUsd: totalStr,
      });
      setSubmittedInfo(res);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="stage sky band">
      <div className="wrap narrow">
        <h1 className="h2">구매 문의</h1>
        <div className="inq">
          <form
            className="inq-form"
            onSubmit={handleSubmit}
            onBlur={(e) => {
              if (
                e.target instanceof HTMLInputElement &&
                e.target.hasAttribute("required")
              ) {
                syncAriaInvalid(e.target);
              }
            }}
            onInput={(e) => {
              if (
                e.target instanceof HTMLInputElement &&
                e.target.hasAttribute("required") &&
                e.target.checkValidity()
              ) {
                e.target.removeAttribute("aria-invalid");
              }
            }}
          >
            <div className="field">
              <label htmlFor="inq-name">이름 *</label>
              <input
                id="inq-name"
                name="name"
                required
                aria-errormessage="inq-name-err"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
              />
              <div id="inq-name-err" className="error-msg">
                <span aria-hidden="true">❌</span> 이름을 입력해 주세요.
              </div>
            </div>

            <div className="field">
              <label htmlFor="inq-contact">연락처 (이메일 또는 전화번호) *</label>
              <input
                id="inq-contact"
                name="contact"
                required
                aria-errormessage="inq-contact-err"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="010-0000-0000 또는 이메일"
              />
              <div id="inq-contact-err" className="error-msg">
                <span aria-hidden="true">❌</span> 연락 받으실 연락처를 입력해 주세요.
              </div>
            </div>

            <div className="field">
              <label htmlFor="inq-memo">메모</label>
              <textarea
                id="inq-memo"
                name="memo"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={4}
                placeholder="배송지, 궁금한 점"
              />
            </div>

            <div className="inq-items">
              <b>문의 품목 {rows.length}건 ({totalStr})</b>
              {rows.length === 0 ? (
                <div className="pcard-meta">
                  담은 것이 없어요. <Link to="/shop">상품</Link>에서 담아 오세요.
                </div>
              ) : (
                rows.map((r) => (
                  <div key={r.p!.code} className="inq-item">
                    <span>
                      <code>{r.p!.code}</code> {r.p!.title} × {r.n}
                    </span>
                    <span>{fmtPrice(r.p!)}</span>
                  </div>
                ))
              )}
            </div>

            {submittedInfo && (
              <div className="inq-success">
                <b>✓ 문의가 접수되었습니다! (접수번호: {submittedInfo.inquiryId})</b>
                <div>
                  {submittedInfo.syncedToSheet
                    ? "Google 시트(삐라상점_문의)에 자동 기록되었습니다. 담당자가 확인 후 연락드립니다."
                    : "관리자 문의함에 저장되었습니다. 빠른 확인을 위해 아래 메일 보내기 또는 내용 복사를 함께 이용해 주세요."}
                </div>
              </div>
            )}

            <div className="product-cta">
              <button
                type="submit"
                className="btn big red"
                disabled={submitting}
              >
                {submitting ? "접수 중…" : "문의 바로 접수하기"}
              </button>
              <a className="btn big ink" href={href}>
                메일 앱으로 보내기
              </a>
              <button type="button" className="btn big yellow" onClick={copy}>
                {copied ? "복사됨 ✓" : "내용 복사"}
              </button>
            </div>
            <p className="note">
              '문의 바로 접수하기'를 누르면 관리자 시트에 기록됩니다. 메일로 직접 보내시려면 {TO}로 보내 주세요.
            </p>
          </form>
          <div className="inq-side">
            <Stamp text="실결제 없음" rot={6} />
            <Char who="태진" pose="LAUGH" h={300} />
            <Bubble who="태진" tail="left">
              보내 주시면 상태·배송까지 제가 답할게요.
            </Bubble>
          </div>
        </div>
      </div>
    </section>
  );
}
