"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

// Porteiro do app: se o Supabase está configurado, só deixa entrar
// depois do login com e-mail e senha (a usuária é criada no painel
// do Supabase — não há cadastro aberto ao público).

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

  if (!session) return <LoginPage />;

  return <>{children}</>;
}

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <main className="min-h-screen bg-kraft flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-paper border border-hairline shadow-[0_2px_24px_rgba(28,27,24,0.12)] p-8">
        <h1 className="text-center text-base font-semibold uppercase tracking-[0.35em]">
          Painel da Bruna
        </h1>
        <p className="text-center text-[11px] font-serif-note text-muted mt-1 mb-6">
          caderno particular — entre para abrir
        </p>
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!supabase) return;
            setBusy(true);
            setError(null);
            const { error } = await supabase.auth.signInWithPassword({
              email,
              password,
            });
            if (error) {
              setError("E-mail ou senha incorretos.");
              setBusy(false);
            }
            // Se deu certo, o AuthGate percebe a sessão e abre o painel.
          }}
        >
          <label className="flex flex-col gap-1">
            <span className="text-[9px] uppercase tracking-[0.2em] text-muted">E-mail</span>
            <input
              type="email"
              className="ink-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[9px] uppercase tracking-[0.2em] text-muted">Senha</span>
            <input
              type="password"
              className="ink-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error && (
            <p className="text-[11px] text-alert font-medium">{error}</p>
          )}
          <button type="submit" className="ink-btn ink-btn-solid py-2" disabled={busy}>
            {busy ? "entrando…" : "entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}

export function signOut() {
  supabase?.auth.signOut();
}
