import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/Toast";

type Status = "received" | "reviewing" | "done" | "rejected";
const STATUS_MAP: Record<Status, { label: string; cls: string }> = {
  received: { label: "접수", cls: "bg-[#f2f2f2] text-ink2" },
  reviewing: { label: "검토중", cls: "bg-wash text-brand" },
  done: { label: "처리완료", cls: "bg-[#e8f5ee] text-[#2f8f5b]" },
  rejected: { label: "반려", cls: "bg-[#f2f2f2] text-muted" },
};

const REASONS = [
  { key: "plagiarism", label: "표절·저작권 침해" },
  { key: "illegal", label: "불법·유해 콘텐츠" },
  { key: "rating", label: "연령 등급 위반" },
  { key: "hate", label: "혐오·차별 표현" },
  { key: "spam", label: "스팸·광고" },
  { key: "etc", label: "기타" },
];

const REPORTS: { target: string; reason: string; date: string; status: Status; result?: string }[] = [
  { target: "「검은 그림자」 3화", reason: "표절·저작권 침해", date: "2026.06.26", status: "reviewing" },
  { target: "「금지된 이야기」", reason: "연령 등급 위반", date: "2026.06.20", status: "done", result: "신고가 인정되어 해당 작품에 19세 등급이 적용됐어요." },
  { target: "광고성 댓글 (user_4821)", reason: "스팸·광고", date: "2026.06.14", status: "rejected", result: "검토 결과 정책 위반에 해당하지 않아 반려됐어요." },
];

export default function RReport() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [detail, setDetail] = useState("");
  const [successOpen, setSuccessOpen] = useState(false);

  const openReport = () => { setModalOpen(true); setReason(null); setDetail(""); };
  const submitBlocked = !reason;
  const submit = () => { if (submitBlocked) return; setModalOpen(false); setSuccessOpen(true); };

  return (
    <div className="min-h-screen bg-canvas">
      {/* R2 header */}
      <div className="sticky top-0 z-20 flex h-[60px] items-center justify-between border-b border-hairline bg-white px-5">
        <button onClick={() => navigate(-1)} className="pw-btn-ghost h-[38px] px-3 text-sm">← 뒤로</button>
        <div className="text-base font-bold">내 신고 내역</div>
        <div className="w-[60px]" />
      </div>

      <div className="mx-auto px-5 pb-20 pt-7" style={{ maxWidth: 680 }}>
        <div className="mb-[18px] flex items-center justify-between gap-3">
          <div className="text-sm text-muted">총 {REPORTS.length}건의 신고</div>
          <button onClick={openReport} className="h-[42px] rounded border-none bg-brand px-4 text-sm font-bold text-white transition hover:bg-brand-hover">+ 신고하기</button>
        </div>

        <div className="flex flex-col gap-3">
          {REPORTS.map((r, i) => {
            const st = STATUS_MAP[r.status];
            return (
              <div key={i} className="rounded-xl border border-hairline bg-white p-[18px]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-bold text-ink">{r.target}</div>
                    <div className="mt-1 text-[13px] text-muted">사유: {r.reason} · {r.date}</div>
                  </div>
                  <span className={"flex-shrink-0 rounded-full px-3 py-[5px] text-xs font-bold " + st.cls}>{st.label}</span>
                </div>
                {r.result && (
                  <div className="mt-3 rounded-lg bg-canvas px-3.5 py-3 text-[13px] leading-[1.5] text-ink2">
                    <span className="font-bold text-ink">처리 결과 · </span>{r.result}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* R1 report modal */}
      {modalOpen && (
        <div onClick={() => setModalOpen(false)} className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50" style={{ animation: "pw-fade .2s ease" }}>
          <div onClick={(e) => e.stopPropagation()} className="max-h-[92vh] w-full max-w-[480px] overflow-y-auto rounded-t-[18px] bg-white px-[22px] pb-[26px] pt-[18px]" style={{ animation: "pw-sheet .28s ease" }}>
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line2" />
            <div className="mb-1 flex items-start justify-between gap-3">
              <div className="text-[19px] font-bold text-ink">신고하기</div>
              <button onClick={() => setModalOpen(false)} className="border-none bg-transparent px-1.5 py-0.5 text-[22px] leading-none text-[#b4b4b4]">×</button>
            </div>
            <div className="mb-[18px] text-[13px] text-muted">「회귀한 검, 황혼을 베다」 · 글 지훈</div>

            <div className="mb-2.5 text-sm font-bold">신고 사유</div>
            <div className="flex flex-col gap-2">
              {REASONS.map((o) => {
                const on = reason === o.key;
                return (
                  <button key={o.key} onClick={() => setReason(o.key)} className={"flex w-full items-center gap-3 rounded-lg border-[1.5px] px-3.5 py-[13px] text-left transition " + (on ? "border-brand bg-wash" : "border-hairline bg-white")}>
                    <span className="box-border h-5 w-5 flex-shrink-0 rounded-full transition-all" style={{ border: on ? "6px solid #816bff" : "2px solid #d4d4d4" }} />
                    <span className="text-sm font-bold text-ink">{o.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4">
              <div className="mb-2 text-sm font-bold">상세 내용</div>
              <textarea value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="신고 사유를 구체적으로 적어주세요. 회차·장면 등 근거가 있으면 처리가 빨라져요." className="min-h-[96px] w-full resize-y rounded-lg border border-hairline px-3.5 py-[13px] text-sm leading-[1.5] text-ink outline-none transition focus:border-brand focus:shadow-focus" />
            </div>

            <div className="mt-3 flex items-start gap-[9px] rounded-lg bg-canvas px-3.5 py-3">
              <span className="text-sm">📎</span>
              <span className="text-xs leading-[1.5] text-muted">캡처·링크 등 근거 자료는 접수 후 담당자 안내에 따라 추가 제출할 수 있어요.</span>
            </div>

            <div className="mt-2.5 flex items-start gap-[9px] rounded-lg border border-[#f5e0c0] bg-[#fff7ed] px-3.5 py-3">
              <span className="text-sm font-bold leading-tight text-[#c98a2b]">!</span>
              <span className="text-xs font-bold leading-[1.5] text-[#a06f24]">허위·악의적 신고는 이용 제한 등 불이익을 받을 수 있어요.</span>
            </div>

            <button disabled={submitBlocked} onClick={submit} className={"mt-[18px] h-[54px] w-full rounded border-none text-base font-bold transition " + (submitBlocked ? "cursor-default bg-hairline text-[#b4b4b4]" : "bg-brand text-white hover:bg-brand-hover")}>{submitBlocked ? "신고 사유를 선택해 주세요" : "신고 제출"}</button>
          </div>
        </div>
      )}

      {/* success */}
      {successOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-5" style={{ animation: "pw-fade .2s ease" }}>
          <div className="w-full max-w-[340px] rounded-2xl bg-white px-7 py-[34px] text-center" style={{ animation: "pw-pop .25s ease" }}>
            <div className="mx-auto flex h-[60px] w-[60px] items-center justify-center rounded-full bg-wash text-[28px] font-bold text-brand">✓</div>
            <div className="mt-4 text-[19px] font-bold text-ink">신고가 접수됐어요</div>
            <div className="mt-2 text-sm leading-[1.6] text-muted">검토 후 처리 결과를 알림으로 알려드려요. 신고해 주셔서 감사합니다.</div>
            <button onClick={() => { setSuccessOpen(false); showToast("신고 내역에 추가됐어요"); }} className="mt-[22px] h-[50px] w-full rounded border-none bg-brand text-[15px] font-bold text-white">확인</button>
          </div>
        </div>
      )}

    </div>
  );
}
