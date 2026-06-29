/** 라디오형 알약 토글 버튼. C1·C2·COutput 공용 (이전엔 C1에서 export → 크로스-화면 import). */
export function RadioPill({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={
        "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-bold transition " +
        (selected ? "border border-brand bg-wash text-brand" : "border border-line2 bg-white text-ink2")
      }
    >
      <span
        className="box-border h-4 w-4 rounded-full transition-all"
        style={{ border: selected ? "5px solid #816bff" : "2px solid #c4c4c4" }}
      />
      {children}
    </button>
  );
}
