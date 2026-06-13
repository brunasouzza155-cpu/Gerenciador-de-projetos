"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { fmtLong, todayISO } from "@/lib/dates";
import { projectLeaves } from "@/lib/tree";
import { STATUS_META, STATUS_ORDER } from "@/lib/theme";
import { useAppStore } from "@/lib/store";
import type { ProjectStatus, Workspace } from "@/lib/types";
import { DayDemandsPanel, PrioritiesPanel, TodayPanel } from "@/components/DayColumn";
import { ProjectCard, ProjectForm } from "@/components/ProjectCard";
import { Planner } from "@/components/Planner";
import { FollowupsPanel } from "@/components/FollowupsPanel";
import { SummaryPanel, UpcomingPanel } from "@/components/SummaryColumn";
import { AuthGate, signOut } from "@/components/AuthGate";
import { isSupabaseConfigured } from "@/lib/supabase";

const subscribeNoop = () => () => {};

export default function Page() {
  // Com o Supabase configurado, o app fica atrás do login e salva no banco.
  // Sem ele, roda em modo demonstração com os dados de exemplo.
  if (isSupabaseConfigured) {
    return (
      <AuthGate>
        <Home mode="supabase" />
      </AuthGate>
    );
  }
  return <Home mode="mock" />;
}

function Home({ mode }: { mode: "mock" | "supabase" }) {
  const store = useAppStore(mode);
  const [workspace, setWorkspace] = useState<Workspace>("trabalho");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  // Evita diferenças entre servidor e navegador nos cálculos de "hoje".
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);

  const today = todayISO();

  // Projetos do workspace atual (a separação total entre as duas áreas).
  const wsProjects = useMemo(
    () => store.projects.filter((p) => p.workspace === workspace),
    [store.projects, workspace]
  );

  // Busca por código/nome do projeto e por texto de tarefa.
  const visibleProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return wsProjects.filter((p) => {
      if (p.archived !== showArchived) return false;
      if (statusFilter && p.status !== statusFilter) return false;
      if (q) {
        const inProject =
          p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
        const inTasks = store.tasks.some(
          (t) => t.projectId === p.id && t.title.toLowerCase().includes(q)
        );
        if (!inProject && !inTasks) return false;
      }
      return true;
    });
  }, [wsProjects, showArchived, statusFilter, search, store.tasks]);

  // Contador de atrasadas do workspace (só projetos não arquivados).
  const overdueCount = useMemo(() => {
    let n = 0;
    for (const p of wsProjects.filter((p) => !p.archived)) {
      for (const t of projectLeaves(store.tasks, p.id)) {
        if (!t.done && t.dueDate && t.dueDate < today) n++;
      }
    }
    return n;
  }, [wsProjects, store.tasks, today]);

  const countByStatus = (s: ProjectStatus) =>
    wsProjects.filter((p) => p.status === s && p.archived === showArchived).length;

  if (!mounted || store.loading) {
    return (
      <main className="min-h-screen bg-kraft flex items-center justify-center">
        {store.loading && (
          <p className="text-[12px] font-serif-note text-muted">abrindo o caderno…</p>
        )}
      </main>
    );
  }

  if (store.loadError) {
    return (
      <main className="min-h-screen bg-kraft flex items-center justify-center px-4">
        <div className="bg-paper border border-hairline p-6 max-w-sm text-center">
          <p className="text-[12px] text-alert font-medium">
            Não consegui carregar seus dados.
          </p>
          <p className="text-[11px] font-serif-note text-muted mt-1">{store.loadError}</p>
          <button className="ink-btn mt-4" onClick={() => location.reload()}>
            tentar de novo
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-kraft py-4 px-2 sm:py-8 sm:px-6">
      {/* A "página" do caderno */}
      <div className="mx-auto max-w-[1400px] bg-paper border border-hairline shadow-[0_2px_24px_rgba(28,27,24,0.12)] px-3 py-5 sm:px-8 sm:py-8">
        {/* Cabeçalho */}
        <header className="text-center">
          <h1 className="text-lg sm:text-xl font-semibold uppercase tracking-[0.35em]">
            Painel da Bruna
          </h1>
          <p className="text-[12px] font-serif-note text-muted mt-1">{fmtLong(today)}</p>

          {/* Abas TRABALHO / PESSOAL */}
          <div className="mt-4 flex justify-center">
            {(["trabalho", "pessoal"] as Workspace[]).map((w) => (
              <button
                key={w}
                onClick={() => { setWorkspace(w); setStatusFilter(null); setShowArchived(false); }}
                className={`px-6 sm:px-10 py-2 text-[11px] uppercase tracking-[0.25em] border border-ink -ml-px first:ml-0 ${
                  workspace === w ? "bg-ink text-paper font-semibold" : "bg-paper hover:bg-tan-soft"
                }`}
              >
                {w}
              </button>
            ))}
          </div>

          {/* Linha de utilidades: atraso, busca, arquivados, novo projeto */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {overdueCount > 0 ? (
              <span className="text-[10px] uppercase tracking-wider text-paper bg-alert px-2 py-1 font-semibold">
                ⚠ {overdueCount} {overdueCount === 1 ? "tarefa atrasada" : "tarefas atrasadas"}
              </span>
            ) : (
              <span className="text-[10px] uppercase tracking-wider text-muted border border-hairline px-2 py-1">
                ✓ em dia
              </span>
            )}
            <input
              className="ink-input !w-[180px] sm:!w-[220px]"
              placeholder="buscar projeto ou tarefa…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              className={`ink-btn ${showArchived ? "ink-btn-solid" : ""}`}
              onClick={() => setShowArchived(!showArchived)}
              title="Mostrar projetos arquivados"
            >
              arquivados
            </button>
            <button className="ink-btn ink-btn-solid" onClick={() => setCreating(!creating)}>
              + novo projeto
            </button>
            {mode === "supabase" ? (
              <button className="ink-btn" onClick={signOut} title="Fechar o caderno">
                sair
              </button>
            ) : (
              <span
                className="text-[9px] uppercase tracking-wider text-muted border border-dashed border-hairline px-2 py-1"
                title="Sem banco de dados: nada é salvo de verdade ainda"
              >
                modo demonstração
              </span>
            )}
          </div>

          {/* Filtros por status com contagem */}
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            <button
              className={`text-[9px] uppercase tracking-wider px-2 py-1 border ${
                statusFilter === null ? "border-ink bg-ink text-paper" : "border-hairline text-muted hover:border-ink hover:text-ink"
              }`}
              onClick={() => setStatusFilter(null)}
            >
              todos · {wsProjects.filter((p) => p.archived === showArchived).length}
            </button>
            {STATUS_ORDER.map((s) => {
              const n = countByStatus(s);
              if (n === 0) return null;
              const active = statusFilter === s;
              return (
                <button
                  key={s}
                  className="text-[9px] uppercase tracking-wider px-2 py-1 border"
                  style={
                    active
                      ? { background: STATUS_META[s].color, borderColor: STATUS_META[s].color, color: "#FAF8F3" }
                      : { borderColor: "#D9D2C2", color: STATUS_META[s].color }
                  }
                  onClick={() => setStatusFilter(active ? null : s)}
                >
                  {STATUS_META[s].label} · {n}
                </button>
              );
            })}
          </div>
        </header>

        {/* Formulário de novo projeto */}
        {creating && (
          <div className="mt-5 max-w-xl mx-auto">
            <div className="section-bar">Novo projeto</div>
            <ProjectForm
              initial={{
                workspace,
                code: "",
                name: "",
                status: "andamento",
                health: 0,
                startDate: today,
                dueDate: null,
                stoppedDate: null,
                gains: null,
                fte: null,
                notes: "",
                archived: false,
              }}
              onSave={(data) => { store.addProject(data); setCreating(false); }}
              onCancel={() => setCreating(false)}
            />
          </div>
        )}

        {/* As três colunas (empilham no celular) */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_1.6fr_1fr] gap-4 items-start">
          {/* Coluna 1: o dia */}
          <div className="flex flex-col gap-4">
            <PrioritiesPanel store={store} workspace={workspace} />
            <TodayPanel store={store} workspace={workspace} projects={wsProjects.filter((p) => !p.archived)} />
            <DayDemandsPanel store={store} workspace={workspace} projects={wsProjects.filter((p) => !p.archived)} />
          </div>

          {/* Coluna 2: projetos */}
          <div className="flex flex-col gap-4">
            {visibleProjects.length === 0 && (
              <div className="bg-paper border border-hairline p-6 text-center">
                <p className="text-[12px] font-serif-note text-muted">
                  {showArchived
                    ? "Nenhum projeto arquivado aqui."
                    : "Nenhum projeto neste filtro. Crie um com “+ novo projeto”."}
                </p>
              </div>
            )}
            {visibleProjects.map((p) => (
              <ProjectCard key={p.id} project={p} store={store} />
            ))}
          </div>

          {/* Coluna 3: planner e painéis */}
          <div className="flex flex-col gap-4">
            <Planner store={store} projects={wsProjects.filter((p) => !p.archived)} />
            <UpcomingPanel store={store} projects={wsProjects.filter((p) => !p.archived)} />
            <FollowupsPanel store={store} workspace={workspace} projects={wsProjects.filter((p) => !p.archived)} />
            <SummaryPanel store={store} workspace={workspace} projects={wsProjects.filter((p) => !p.archived)} />
          </div>
        </div>

        <footer className="mt-8 pt-3 border-t border-hairline text-center">
          <p className="text-[10px] font-serif-note text-muted">
            “Um dia de cada vez — mas com o portfólio inteiro à vista.”
          </p>
        </footer>
      </div>
    </main>
  );
}
