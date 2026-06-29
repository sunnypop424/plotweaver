import type { ReactNode } from "react";

/**
 * 하이브리드 입력 (02 §0): Select(추천값) ↔ "+ 직접입력"(자유 텍스트) 토글.
 * 라벨 우측에 토글 버튼. select 모드면 children(<option>)을 렌더, custom 모드면 text input.
 * C1 인물(외형/신체특징/성격), C2 관계 라벨에서 재사용.
 */
type Props = {
  label: string;
  custom: boolean;
  onToggleCustom: () => void;
  value: string;
  onChange: (value: string) => void;
  customPlaceholder?: string;
  height?: number;
  /** 필수 필드 표시(*) */
  required?: boolean;
  /** 에러(빨강 테두리) 상태 */
  error?: boolean;
  children: ReactNode; // <option> 들
};

export function HybridSelect({
  label,
  custom,
  onToggleCustom,
  value,
  onChange,
  customPlaceholder = "직접 입력",
  height = 46,
  required = false,
  error = false,
  children,
}: Props) {
  const errCls = error ? " pw-input--err" : "";
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className={required ? "text-sm font-bold text-ink" : "pw-field-label"}>
          {label}
          {required && <span className="ml-1 text-brand">*</span>}
        </span>
        <button onClick={onToggleCustom} className="pw-link text-xs">
          {custom ? "목록에서 선택" : "+ 직접입력"}
        </button>
      </div>

      {custom ? (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={customPlaceholder}
          className={"pw-input text-[15px]" + errCls}
          style={{ height }}
        />
      ) : (
        <div className="pw-select-wrap">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={"pw-select text-[15px]" + errCls}
            style={{ height }}
          >
            {children}
          </select>
          <span className="pw-select-caret">▼</span>
        </div>
      )}
    </div>
  );
}
