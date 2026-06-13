"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type Screen = "login" | "signup" | "recovery" | "recovery-sent";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (checking) {
    return (
      <main className="min-h-screen bg-kraft flex items-center justify-center">
        <p className="text-[12px] font-serif-note text-muted">abrindo o caderno…</p>
      </main>
    );
  }

  if (!session) return <AuthPage />;
  return <>{children}</>;
}

// ── Medidor de força de senha ────────────────────────────────────────────────

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  let s = 0;
  if (pw.length >= 8)                  s++;
  if (pw.length >= 12)                 s++;
  if (/[A-Z]/.test(pw))                s++;
  if (/[0-9]/.test(pw))                s++;
  if (/[^A-Za-z0-9]/.test(pw))        s++;
  const levels = [
    { label: "",          color: "transparent" },
    { label: "Fraca",     color: "#C04040" },
    { label: "Razoável",  color: "#C08040" },
    { label: "Boa",       color: "#80A040" },
    { label: "Forte",     color: "#4D6B57" },
    { label: "Excelente", color: "#2E4A3A" },
  ];
  return { score: s, ...levels[s] };
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ── Tela de login ─────────────────────────────────────────────────────────────

function LoginScreen({ onSwitch }: { onSwitch: (s: Screen) => void }) {
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]     = useState<string | null>(null);
  const [busy, setBusy]       = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError("E-mail ou senha incorretos."); setBusy(false); }
  };

  return (
    <div className="auth-screen-enter">
      <p className="text-center text-[11px] font-serif-note text-muted mb-6">
        Entre para abrir seu planner
      </p>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <Field label="E-mail" type="email" value={email} onChange={setEmail} autoComplete="email" required />
        <Field label="Senha" type="password" value={password} onChange={setPassword} autoComplete="current-password" required />
        {error && <p className="text-[11px] text-alert font-medium">{error}</p>}
        <button
          type="submit"
          className="ink-btn ink-btn-solid py-2.5 mt-1 flex items-center justify-center gap-2"
          disabled={busy}
        >
          {busy && (
            <span className="inline-block w-3.5 h-3.5 border-2 border-paper/30 border-t-paper rounded-full animate-spin" />
          )}
          {busy ? "Entrando…" : "entrar"}
        </button>
      </form>
      <div className="mt-5 flex flex-col items-center gap-2">
        <button className="text-[10px] text-muted uppercase tracking-wider hover:text-ink transition-colors" onClick={() => onSwitch("recovery")}>
          esqueci minha senha
        </button>
        <div className="flex items-center gap-2 text-[10px] text-muted">
          <span>Não tem conta?</span>
          <button className="uppercase tracking-wider text-ink font-medium hover:underline" onClick={() => onSwitch("signup")}>
            criar conta
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tela de cadastro ──────────────────────────────────────────────────────────

function SignupScreen({ onSwitch }: { onSwitch: (s: Screen) => void }) {
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError]     = useState<string | null>(null);
  const [busy, setBusy]       = useState(false);
  // True when signUp succeeded but email confirmation is still required
  const [emailSent, setEmailSent] = useState(false);

  const strength = passwordStrength(password);
  const emailOk  = email === "" || isValidEmail(email);
  const matchOk  = confirm === "" || password === confirm;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    if (!isValidEmail(email)) { setError("E-mail inválido."); return; }
    if (strength.score < 2)   { setError("Escolha uma senha mais forte."); return; }
    if (password !== confirm)  { setError("As senhas não coincidem."); return; }
    setBusy(true);
    setError(null);
    // NOTE: Para eliminar o delay de envio de e-mail, habilite "Auto Confirm"
    // no painel do Supabase: Authentication → Settings → "Enable email confirmations" = OFF.
    // Com Auto Confirm ativo, signUp() retorna session imediatamente e o
    // onAuthStateChange no AuthGate redireciona o usuário para o app.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });
    if (error) {
      setError(error.message);
      setBusy(false);
    } else if (!data.session) {
      // Email confirmation required — show "check your email" screen
      setEmailSent(true);
      setBusy(false);
    }
    // If data.session exists, onAuthStateChange in AuthGate handles the redirect automatically
  };

  // ── Tela de "confirme seu e-mail" ────────────────────────────────────────────
  if (emailSent) {
    return (
      <div className="auth-screen-enter text-center">
        <div className="text-4xl mb-5">✉️</div>
        <p className="text-[13px] font-semibold uppercase tracking-wider mb-2">Conta criada!</p>
        <p className="text-[11px] font-serif-note text-muted leading-relaxed mb-2">
          Enviamos um link de confirmação para{" "}
          <span className="font-medium text-ink not-italic">{email}</span>.
        </p>
        <p className="text-[11px] font-serif-note text-muted leading-relaxed mb-5">
          Clique no link para ativar sua conta e entrar.
        </p>
        <p className="text-[10px] text-muted italic mb-6">
          Não recebeu? Verifique a pasta de spam.
        </p>
        <button
          className="text-[10px] text-muted uppercase tracking-wider hover:text-ink transition-colors"
          onClick={() => onSwitch("login")}
        >
          ← voltar ao login
        </button>
      </div>
    );
  }

  return (
    <div className="auth-screen-enter">
      <p className="text-center text-[11px] font-serif-note text-muted mb-6">
        Crie sua conta para começar
      </p>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <Field label="Nome completo" type="text" value={name} onChange={setName} autoComplete="name" required />
        <div>
          <Field
            label="E-mail"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            required
          />
          {!emailOk && (
            <p className="text-[10px] text-alert mt-0.5">E-mail inválido</p>
          )}
        </div>
        <div>
          <Field label="Senha" type="password" value={password} onChange={setPassword} autoComplete="new-password" required />
          {password && (
            <div className="mt-1.5">
              <div className="flex gap-0.5 mb-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="flex-1 h-[3px] transition-all duration-300"
                    style={{
                      background: i <= strength.score ? strength.color : "var(--hairline)",
                    }}
                  />
                ))}
              </div>
              {strength.label && (
                <p className="text-[9px] uppercase tracking-wider" style={{ color: strength.color }}>
                  {strength.label}
                </p>
              )}
            </div>
          )}
        </div>
        <div>
          <Field label="Confirmar senha" type="password" value={confirm} onChange={setConfirm} autoComplete="new-password" required />
          {!matchOk && (
            <p className="text-[10px] text-alert mt-0.5">Senhas não coincidem</p>
          )}
        </div>
        {error && <p className="text-[11px] text-alert font-medium">{error}</p>}
        <button
          type="submit"
          className="ink-btn ink-btn-solid py-2.5 mt-1 flex items-center justify-center gap-2"
          disabled={busy}
        >
          {busy && (
            <span className="inline-block w-3.5 h-3.5 border-2 border-paper/30 border-t-paper rounded-full animate-spin" />
          )}
          {busy ? "Criando sua conta…" : "criar conta"}
        </button>
      </form>
      <div className="mt-5 text-center">
        <button className="text-[10px] text-muted uppercase tracking-wider hover:text-ink transition-colors" onClick={() => onSwitch("login")}>
          ← voltar ao login
        </button>
      </div>
    </div>
  );
}

// ── Tela de recuperação de senha ──────────────────────────────────────────────

function RecoveryScreen({ onSwitch }: { onSwitch: (s: Screen) => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !isValidEmail(email)) { setError("E-mail inválido."); return; }
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
    });
    if (error) { setError(error.message); setBusy(false); }
    else onSwitch("recovery-sent");
  };

  return (
    <div className="auth-screen-enter">
      <p className="text-center text-[11px] font-serif-note text-muted mb-6">
        Enviaremos um link de recuperação para o seu e-mail
      </p>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <Field label="E-mail" type="email" value={email} onChange={setEmail} autoComplete="email" required />
        {error && <p className="text-[11px] text-alert font-medium">{error}</p>}
        <button type="submit" className="ink-btn ink-btn-solid py-2.5 mt-1" disabled={busy}>
          {busy ? "enviando…" : "enviar link de recuperação"}
        </button>
      </form>
      <div className="mt-5 text-center">
        <button className="text-[10px] text-muted uppercase tracking-wider hover:text-ink transition-colors" onClick={() => onSwitch("login")}>
          ← voltar ao login
        </button>
      </div>
    </div>
  );
}

function RecoverySentScreen({ onSwitch }: { onSwitch: (s: Screen) => void }) {
  return (
    <div className="auth-screen-enter text-center">
      <div className="text-3xl mb-4">✉️</div>
      <p className="text-[13px] font-medium mb-2">Link enviado!</p>
      <p className="text-[11px] font-serif-note text-muted mb-6">
        Verifique sua caixa de entrada e clique no link para redefinir sua senha.
      </p>
      <button
        className="text-[10px] text-muted uppercase tracking-wider hover:text-ink transition-colors"
        onClick={() => onSwitch("login")}
      >
        ← voltar ao login
      </button>
    </div>
  );
}

// ── Campo de formulário reutilizável ──────────────────────────────────────────

function Field({
  label, type, value, onChange, autoComplete, required,
}: {
  label: string; type: string; value: string;
  onChange: (v: string) => void; autoComplete?: string; required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[9px] uppercase tracking-[0.2em] text-muted">{label}</span>
      <input
        type={type}
        className="ink-input py-1.5"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
      />
    </label>
  );
}

// ── Página de autenticação (orquestra as 3 telas) ─────────────────────────────

function AuthPage() {
  const [screen, setScreen] = useState<Screen>("login");

  const titles: Record<Screen, string> = {
    login:          "Planner",
    signup:         "Planner",
    recovery:       "Recuperar senha",
    "recovery-sent":"Planner",
  };

  return (
    <main className="min-h-screen bg-kraft flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logotipo / título */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold uppercase tracking-[0.45em]">
            {titles[screen]}
          </h1>
          <div className="mt-2 mx-auto w-8 h-[1px] bg-hairline" />
        </div>

        {/* Card */}
        <div
          className="bg-paper border border-hairline shadow-[0_4px_32px_rgba(0,0,0,0.07)] px-8 py-8"
          key={screen}
        >
          {screen === "login"          && <LoginScreen    onSwitch={setScreen} />}
          {screen === "signup"         && <SignupScreen   onSwitch={setScreen} />}
          {screen === "recovery"       && <RecoveryScreen onSwitch={setScreen} />}
          {screen === "recovery-sent"  && <RecoverySentScreen onSwitch={setScreen} />}
        </div>

        <p className="mt-6 text-center text-[9px] text-muted uppercase tracking-wider">
          &copy; {new Date().getFullYear()} Planner
        </p>
      </div>
    </main>
  );
}

export function signOut() {
  supabase?.auth.signOut();
}
