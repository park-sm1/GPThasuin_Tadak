import { useState, type FormEvent } from "react";
import { Sparkles, ArrowLeft } from "lucide-react";
import * as authService from "../../services/authService";
import type { AuthUser } from "../../types/user";

interface AuthScreenProps {
  mode: "login" | "signup";
  onSwitchMode: (mode: "login" | "signup") => void;
  onClose: () => void;
  onSuccess: (user: AuthUser) => void;
}

export function AuthScreen({ mode, onSwitchMode, onClose, onSuccess }: AuthScreenProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim() || (mode === "signup" && (!name.trim() || !passwordConfirm.trim()))) {
      setError("모든 항목을 입력해주세요.");
      return;
    }
    if (mode === "signup" && password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않아요.");
      return;
    }
    const user = mode === "login" ? authService.login(email, password) : authService.signup(name, email, password);
    onSuccess(user);
  }

  return (
    <div className="max-w-sm mx-auto pt-16 px-4 space-y-6">
      <button onClick={onClose} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> 둘러보기로 돌아가기
      </button>
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center mx-auto">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-xl font-black text-foreground">{mode === "login" ? "로그인" : "회원가입"}</h1>
        <p className="text-sm text-muted-foreground">Tadak에서 부산 청년 정책과 공모전을 한눈에 확인하세요</p>
      </div>
      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-5 space-y-3">
        {mode === "signup" && (
          <input value={name} onChange={e => setName(e.target.value)} placeholder="이름"
            className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors" />
        )}
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="이메일"
          className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors" />
        <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="비밀번호"
          className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors" />
        {mode === "signup" && (
          <input value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} type="password" placeholder="비밀번호 확인"
            className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors" />
        )}
        {error && <p className="text-xs text-rose-500">{error}</p>}
        <button type="submit" className="w-full bg-primary text-primary-foreground text-sm font-bold py-3.5 rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all">
          {mode === "login" ? "로그인" : "회원가입"}
        </button>
      </form>
      <p className="text-center text-xs text-muted-foreground">
        {mode === "login" ? "아직 회원이 아니신가요? " : "이미 계정이 있으신가요? "}
        <button onClick={() => { setError(""); onSwitchMode(mode === "login" ? "signup" : "login"); }} className="text-primary font-semibold hover:underline">
          {mode === "login" ? "회원가입" : "로그인"}
        </button>
      </p>
      <p className="text-center text-[11px] text-muted-foreground">데모용 더미 로그인입니다. 실제 인증은 아직 연결되지 않았습니다.</p>
    </div>
  );
}
