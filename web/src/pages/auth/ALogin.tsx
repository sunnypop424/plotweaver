import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthShell } from "@/components/AuthShell";

/** 로그인 — 이메일/소셜 + 아이디·비밀번호 찾기·회원가입 진입. */
export default function ALogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");

  const canLogin = email.trim() && pw.trim();
  const login = () => navigate("/library");

  return (
    <AuthShell subtitle="로그인하고 이어서 창작하세요" back={<button onClick={() => navigate("/")} className="mb-4 inline-flex items-center gap-1.5 rounded px-2 py-1.5 text-sm font-bold text-muted transition hover:text-brand">← 홈으로</button>}>
      <div className="rounded-xl border border-hairline bg-white px-7 py-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
            <div className="mb-[22px] text-center text-xl font-bold text-ink">로그인</div>

            <div className="flex flex-col gap-3">
              <div>
                <div className="mb-[7px] pw-field-label">이메일</div>
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="pw-input h-[50px] text-[15px]" />
              </div>
              <div>
                <div className="mb-[7px] pw-field-label">비밀번호</div>
                <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="비밀번호" className="pw-input h-[50px] text-[15px]" />
              </div>
            </div>

            <button onClick={login} disabled={!canLogin} className={"mt-5 h-[54px] w-full rounded border-none text-base font-bold transition " + (canLogin ? "bg-brand text-white hover:bg-brand-hover" : "cursor-default bg-hairline text-[#b4b4b4]")}>로그인</button>

            <div className="mt-4 text-center text-xs leading-[1.6] text-muted">계속 진행하면 <button onClick={() => navigate("/terms")} className="font-bold text-ink2 underline">이용약관</button> 및 <button onClick={() => navigate("/privacy")} className="font-bold text-ink2 underline">개인정보처리방침</button>에 동의하는 것으로 간주됩니다.</div>

            <div className="mt-3.5 flex items-center justify-center gap-2.5 text-[13px] font-bold text-muted">
              <button onClick={() => navigate("/find-id")} className="transition hover:text-brand">아이디 찾기</button>
              <span className="text-hairline">|</span>
              <button onClick={() => navigate("/find-password")} className="transition hover:text-brand">비밀번호 찾기</button>
              <span className="text-hairline">|</span>
              <button onClick={() => navigate("/signup")} className="text-brand">회원가입</button>
            </div>

            <div className="my-[22px] flex items-center gap-3">
              <div className="h-px flex-1 bg-hairline" />
              <span className="text-xs font-bold text-[#b4b4b4]">또는</span>
              <div className="h-px flex-1 bg-hairline" />
            </div>

            <div className="flex flex-col gap-2.5">
              <button onClick={login} className="flex h-[54px] w-full items-center justify-center gap-2.5 rounded border-none text-base font-bold" style={{ background: "#FEE500", color: "#191600" }}>카카오로 계속하기</button>
              <button onClick={login} className="flex h-[54px] w-full items-center justify-center gap-2.5 rounded border border-line2 bg-white text-base font-bold text-ink transition hover:bg-canvas"><span className="text-[17px] font-bold" style={{ color: "#4285F4" }}>G</span>구글로 계속하기</button>
              <button onClick={login} className="flex h-[54px] w-full items-center justify-center gap-2.5 rounded border-none text-base font-bold text-white" style={{ background: "#121212" }}>Apple로 계속하기</button>
            </div>
          </div>

    </AuthShell>
  );
}
