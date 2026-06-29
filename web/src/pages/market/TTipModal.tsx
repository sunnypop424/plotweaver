import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TipModal } from "@/components/TipModal";
import { useToast } from "@/components/Toast";

/** TIP 후원 모달 데모 — 다크 리더 배경 위에 TipModal 노출. (후원 모달 TIP.dc.html) */
export default function TTipModal() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const [balanceSeed, setBalanceSeed] = useState(6000);
  const [keyN, setKeyN] = useState(0);

  const demo = (balance: number) => { setBalanceSeed(balance); setKeyN((k) => k + 1); setOpen(true); };

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: "#15131d" }}>
      {/* faux reader behind */}
      <div className="mx-auto px-6 py-14" style={{ maxWidth: 680, opacity: 0.35, filter: "blur(1px)", pointerEvents: "none" }}>
        <div className="text-center text-[13px] font-bold tracking-[2px] text-[#a892ff]">CHAPTER 05</div>
        <div className="mt-2.5 text-center text-[26px] font-bold text-[#f2f0f7]">5화. 되돌아온 새벽</div>
        <p className="mt-8 text-lg leading-[2] text-[#cfc9da]">눈을 떴을 때, 카엘은 10년 전으로 돌아와 있었다. 처형대의 차가운 감촉 대신, 손끝에 닿는 것은 낡은 침상의 거친 천이었다. 창밖으로는 아직 무너지지 않은 가문의 첨탑이 새벽빛을 받아 희미하게 빛났다.</p>
        <p className="text-lg leading-[2] text-[#cfc9da]">그는 천천히 자신의 손을 내려다보았다. 굳은살도, 검을 쥐며 생긴 흉터도 없는—아직 아무것도 잃지 않은 자의 손이었다.</p>
      </div>

      {/* reopen button */}
      {!open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <button onClick={() => setOpen(true)} className="h-[54px] rounded border-none bg-brand px-[26px] text-base font-bold text-white" style={{ boxShadow: "0 8px 24px rgba(129,107,255,0.5)" }}>♥ 응원 모달 다시 열기</button>
        </div>
      )}

      <TipModal key={keyN} open={open} onClose={() => { setOpen(false); navigate(-1); }} workTitle="회귀한 검" initialBalance={balanceSeed} onToast={showToast} />

      {/* demo balance toggle */}
      <div className="fixed right-4 top-4 z-[90] flex gap-1 rounded-full border border-hairline bg-white p-1 shadow-[0_2px_12px_rgba(0,0,0,0.12)]">
        <button onClick={() => demo(12000)} className="rounded-full px-3 py-[7px] text-xs font-bold text-muted transition hover:bg-wash">잔액충분</button>
        <button onClick={() => demo(500)} className="rounded-full px-3 py-[7px] text-xs font-bold text-muted transition hover:bg-wash">잔액부족</button>
      </div>

    </div>
  );
}
