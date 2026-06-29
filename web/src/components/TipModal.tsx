import { useState } from "react";

/**
 * 후원(TIP) 모달 — 바텀시트 + 금액 선택/직접입력 + 메시지 + 잔액부족 + 성공 오버레이.
 * 컨트롤드: open/onClose. 잔액·금액·메시지·성공은 내부 관리.
 * (후원 모달 TIP.dc.html 기반. M2·M3 등에서 재사용)
 */
const fmt = (n: number) => n.toLocaleString("ko-KR");
const AMOUNTS = [
  { value: 1000, label: "1,000원", hot: false },
  { value: 3000, label: "3,000원", hot: true },
  { value: 5000, label: "5,000원", hot: false },
];

type Props = {
  open: boolean;
  onClose: () => void;
  workTitle: string;
  initialBalance?: number;
  onToast?: (msg: string) => void;
};

export function TipModal({ open, onClose, workTitle, initialBalance = 6000, onToast }: Props) {
  const [amount, setAmount] = useState(3000);
  const [customText, setCustomText] = useState("");
  const [message, setMessage] = useState("");
  const [balance, setBalance] = useState(initialBalance);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const usingCustom = customText !== "";
  const amt = amount || 0;
  const insufficient = amt > balance;
  const blocked = loading || !amt || insufficient;

  const onCustom = (v: string) => {
    const digits = v.replace(/[^0-9]/g, "");
    setCustomText(digits);
    setAmount(digits ? parseInt(digits, 10) : 0);
  };
  const charge = () => { setBalance((b) => b + 10000); onToast?.("잉크 10,000을 충전했어요"); };
  const submit = () => {
    if (blocked) return;
    setLoading(true);
    window.setTimeout(() => { setLoading(false); setBalance((b) => b - amt); setSuccess(true); onClose(); }, 1300);
  };

  return (
    <>
      {/* sheet */}
      {open && !success && (
        <div onClick={onClose} className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50" style={{ animation: "pw-fade .2s ease" }}>
          <div onClick={(e) => e.stopPropagation()} className="max-h-[92vh] w-full max-w-[460px] overflow-y-auto rounded-t-[18px] bg-white px-[22px] pb-[26px] pt-[18px]" style={{ animation: "pw-sheet .28s ease" }}>
            <div className="mx-auto mb-[18px] h-1 w-10 rounded-full bg-line2" />

            <div className="mb-1.5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[19px] font-bold leading-[1.3] text-ink">「{workTitle}」 응원하기</div>
                <div className="mt-[5px] text-[13px] leading-[1.5] text-muted">응원하면 작가에게 마음이 전해지고,<br />다음 회차 미리보기를 받을 수 있어요.</div>
              </div>
              <button onClick={onClose} className="flex-shrink-0 border-none bg-transparent px-1.5 py-0.5 text-[22px] leading-none text-[#b4b4b4]">×</button>
            </div>

            {/* amount radios */}
            <div className="mt-[18px] grid grid-cols-3 gap-2">
              {AMOUNTS.map((a) => {
                const on = !usingCustom && amount === a.value;
                return (
                  <button key={a.value} onClick={() => { setAmount(a.value); setCustomText(""); }} className={"flex h-[62px] flex-col items-center justify-center rounded-lg border-[1.5px] text-base font-bold transition " + (on ? "border-brand bg-brand text-white" : "border-line2 bg-white text-ink2")}>
                    {a.label}
                    {a.hot && <span className={"mt-[5px] rounded-full px-[7px] py-px text-[10px] font-bold " + (on ? "bg-white text-brand" : "bg-wash text-brand")}>인기</span>}
                  </button>
                );
              })}
            </div>

            {/* custom amount */}
            <div className="relative mt-2">
              <input
                value={customText}
                onChange={(e) => onCustom(e.target.value)}
                inputMode="numeric"
                placeholder="직접 입력"
                className={"h-[52px] w-full rounded-lg border-[1.5px] bg-white pl-3.5 pr-9 text-[15px] font-bold text-ink outline-none transition focus:border-brand focus:shadow-focus " + (usingCustom ? "border-brand" : "border-hairline")}
              />
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-muted">원</span>
            </div>

            {/* message */}
            <div className="mt-3.5">
              <input value={message} onChange={(e) => setMessage(e.target.value)} maxLength={40} placeholder="응원 메시지 (선택)" className="h-12 w-full rounded-lg border border-hairline px-3.5 text-sm text-ink outline-none transition focus:border-brand" />
            </div>

            {/* reward */}
            <div className="mt-3.5 flex items-center gap-[9px] rounded-lg bg-wash px-3.5 py-3">
              <span className="text-[15px]">🎁</span>
              <span className="text-[13px] font-bold leading-[1.4] text-[#7a6ab0]">응원하면 다음 회차 미리보기를 받아요.</span>
            </div>

            {/* balance */}
            <div className={"mt-4 flex items-center justify-between gap-2 rounded-lg px-3.5 py-3 transition " + (insufficient ? "bg-error-wash" : "bg-wash")}>
              <div className="flex items-center gap-2">
                <span className={"text-[13px] font-bold " + (insufficient ? "text-error" : "text-brand")}>보유 잉크 {fmt(balance)}</span>
                {insufficient && <span className="rounded-full bg-error px-2 py-0.5 text-[11px] font-bold text-white">부족</span>}
              </div>
              {insufficient ? (
                <button onClick={charge} className="rounded bg-error px-3 py-[7px] text-[13px] font-bold text-white">+ 충전</button>
              ) : (
                <button onClick={charge} className="border-none bg-transparent px-0.5 py-1 text-[13px] font-bold text-brand underline">+ 충전</button>
              )}
            </div>
            {insufficient && <div className="mt-2 text-center text-xs font-bold text-error">잉크가 {fmt(Math.max(0, amt - balance))} 부족해요. 충전 후 응원할 수 있어요.</div>}

            {/* CTA */}
            <button disabled={blocked} onClick={submit} className={"mt-[18px] h-14 w-full rounded border-none text-[17px] font-bold transition " + (blocked ? "cursor-default bg-hairline text-[#b4b4b4]" : "bg-brand text-white hover:bg-brand-hover")}>
              {loading ? (
                <><span className="mr-2.5 inline-block h-[17px] w-[17px] animate-spin rounded-full border-2 border-white/40 border-t-white align-[-3px]" />처리 중...</>
              ) : insufficient ? "잉크가 부족해요" : `${fmt(amt)}원 응원하기`}
            </button>
            <div className="mt-2.5 text-center text-[11px] text-[#b4b4b4]">카카오페이 간편결제로 안전하게 처리돼요.</div>
          </div>
        </div>
      )}

      {/* success overlay */}
      {success && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-5" style={{ animation: "pw-fade .2s ease" }}>
          <div className="w-full max-w-[340px] rounded-2xl bg-white px-7 py-[34px] text-center" style={{ animation: "pw-pop .25s ease" }}>
            <div className="mx-auto flex h-[62px] w-[62px] items-center justify-center rounded-full bg-wash text-3xl">💜</div>
            <div className="mt-4 text-[19px] font-bold text-ink">응원 완료!</div>
            <div className="mt-2 text-sm leading-[1.6] text-muted">{fmt(amt)}원 응원을 보냈어요. 작가에게 마음이 전해졌어요!</div>
            <button onClick={() => { setSuccess(false); onToast?.("다음 회차로 이동합니다"); }} className="mt-[22px] h-[50px] w-full rounded border-none bg-brand text-[15px] font-bold text-white">다음 회차 보기</button>
          </div>
        </div>
      )}
    </>
  );
}
