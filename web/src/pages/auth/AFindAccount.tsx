import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/Toast";
import { AuthShell } from "@/components/AuthShell";
import { supabase } from "@/lib/supabase";

/** 계정 찾기 — 아이디 찾기 / 비밀번호 재설정 (탭). */
export default function AFindAccount({ initial = "id" }: { initial?: "id" | "pw" }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [tab, setTab] = useState<"id" | "pw">(initial);

  return (
    <AuthShell subtitle="계정 찾기" back={<button onClick={() => navigate("/login")} className="mb-4 inline-flex items-center gap-1.5 rounded px-2 py-1.5 text-sm font-bold text-muted transition hover:text-brand">← 로그인</button>}>
          {/* tabs */}
          <div className="mb-4 flex gap-1 rounded-full border border-hairline bg-white p-1">
            <button onClick={() => setTab("id")} className={"h-10 flex-1 rounded-full text-sm font-bold transition " + (tab === "id" ? "bg-brand text-white" : "bg-transparent text-muted")}>아이디 찾기</button>
            <button onClick={() => setTab("pw")} className={"h-10 flex-1 rounded-full text-sm font-bold transition " + (tab === "pw" ? "bg-brand text-white" : "bg-transparent text-muted")}>비밀번호 찾기</button>
          </div>

          <div className="rounded-xl border border-hairline bg-white px-7 py-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
            {tab === "id" ? <FindId onToast={showToast} onDone={() => navigate("/login")} /> : <FindPw onToast={showToast} onDone={() => navigate("/login")} />}
          </div>
    </AuthShell>
  );
}

/* ── 아이디 찾기 ───────────────────────────────────────────────────────── */
function FindId({ onToast, onDone }: { onToast: (m: string) => void; onDone: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [found, setFound] = useState(false);
  const ok = name.trim() && phone.trim();
  if (found) {
    return (
      <div className="text-center" style={{ animation: "pw-fade .25s ease" }}>
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-wash text-2xl font-bold text-brand">✓</div>
        <div className="mb-1.5 text-lg font-bold text-ink">가입된 아이디를 찾았어요</div>
        <div className="mb-6 rounded-lg border border-hairline bg-canvas px-4 py-3.5 text-[15px] font-bold text-ink">su****@example.com</div>
        <button onClick={onDone} className="h-[52px] w-full rounded border-none bg-brand text-base font-bold text-white transition hover:bg-brand-hover">로그인하러 가기</button>
      </div>
    );
  }
  return (
    <div style={{ animation: "pw-fade .25s ease" }}>
      <div className="mb-1.5 text-xl font-bold text-ink">아이디 찾기</div>
      <div className="mb-[22px] text-sm leading-[1.5] text-muted">가입 시 등록한 정보로 아이디(이메일)를 찾아요.</div>
      <div className="flex flex-col gap-4">
        <Field label="이름"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" className="pw-input h-[50px] text-[15px]" /></Field>
        <Field label="휴대폰 번호"><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-0000-0000" className="pw-input h-[50px] text-[15px]" /></Field>
      </div>
      <button disabled={!ok} onClick={() => { setFound(true); onToast("인증이 확인됐어요"); }} className={"mt-6 h-[54px] w-full rounded border-none text-base font-bold transition " + (ok ? "bg-brand text-white hover:bg-brand-hover" : "cursor-default bg-hairline text-[#b4b4b4]")}>아이디 찾기</button>
    </div>
  );
}

/* ── 비밀번호 재설정 ───────────────────────────────────────────────────── */
function FindPw({ onToast, onDone }: { onToast: (m: string) => void; onDone: () => void }) {
  const [stage, setStage] = useState<"verify" | "sent">("verify");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const verifyOk = email.trim().includes("@");

  const sendReset = async () => {
    if (!verifyOk || sending) return;
    setSending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSending(false);
    if (error) {
      onToast("이메일 전송에 실패했어요: " + error.message);
    } else {
      setStage("sent");
    }
  };

  if (stage === "sent") {
    return (
      <div className="text-center" style={{ animation: "pw-fade .25s ease" }}>
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-wash text-2xl font-bold text-brand">✉</div>
        <div className="mb-1.5 text-lg font-bold text-ink">이메일을 확인해 주세요</div>
        <div className="mb-3 text-sm leading-[1.6] text-muted">비밀번호 재설정 링크를 <span className="font-bold text-ink">{email}</span>로 보냈어요. 링크를 클릭하면 새 비밀번호를 설정할 수 있어요.</div>
        <button onClick={onDone} className="h-[52px] w-full rounded border-none bg-brand text-base font-bold text-white transition hover:bg-brand-hover">로그인 화면으로</button>
      </div>
    );
  }

  return (
    <div style={{ animation: "pw-fade .25s ease" }}>
      <div className="mb-1.5 text-xl font-bold text-ink">비밀번호 찾기</div>
      <div className="mb-[22px] text-sm leading-[1.5] text-muted">가입한 이메일로 재설정 링크를 보내드려요.</div>
      <div className="flex flex-col gap-4">
        <Field label="이메일 (아이디)"><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="pw-input h-[50px] text-[15px]" /></Field>
      </div>
      <button disabled={!verifyOk || sending} onClick={sendReset} className={"mt-6 h-[54px] w-full rounded border-none text-base font-bold transition " + (verifyOk && !sending ? "bg-brand text-white hover:bg-brand-hover" : "cursor-default bg-hairline text-[#b4b4b4]")}>
        {sending ? "전송 중..." : "재설정 링크 받기"}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div><div className="mb-[7px] pw-field-label">{label}</div>{children}</div>);
}
