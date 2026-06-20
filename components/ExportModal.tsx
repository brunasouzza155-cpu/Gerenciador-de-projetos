"use client";

import { useState } from "react";
import type { AppStore } from "@/lib/store";
import type { PlannerConfig } from "@/lib/planner-config";
import { todayISO, mondayOf, addDays } from "@/lib/dates";
import { STATUS_META, HEALTH_META } from "@/lib/theme";

type ExportFormat = "pdf" | "xlsx" | "json";
type ExportScope = "all" | "current";
type PeriodFilter = "all" | "today" | "week" | "month" | "custom";

export interface ExportModalProps {
  store: AppStore;
  activePlannerId: string | null;
  planners: PlannerConfig[];
  defaultPlannerName: string;
  onClose: () => void;
}

// ── Date helpers ─────────────────────────────────────────────────────────────

function getDateRange(
  period: PeriodFilter,
  customStart: string,
  customEnd: string,
): { from: string; to: string } | null {
  if (period === "all") return null;
  const today = todayISO();
  if (period === "today") return { from: today, to: today };
  if (period === "week") {
    const mon = mondayOf(today);
    return { from: mon, to: addDays(mon, 6) };
  }
  if (period === "month") {
    return { from: today.slice(0, 7) + "-01", to: today };
  }
  // custom
  if (!customStart && !customEnd) return null;
  return { from: customStart || "2000-01-01", to: customEnd || "9999-12-31" };
}

function inRange(
  date: string | null | undefined,
  range: { from: string; to: string } | null,
): boolean {
  if (!range) return true;
  if (!date) return false;
  return date >= range.from && date <= range.to;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ExportModal({
  store,
  activePlannerId,
  planners,
  defaultPlannerName,
  onClose,
}: ExportModalProps) {
  const [format, setFormat]         = useState<ExportFormat>("pdf");
  const [scope, setScope]           = useState<ExportScope>("all");
  const [period, setPeriod]         = useState<PeriodFilter>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd]   = useState("");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  // ── Derived values ─────────────────────────────────────────────────────────

  function getWorkspaceFilter(): "all" | "trabalho" | "pessoal" {
    if (scope === "all") return "all";
    if (activePlannerId === null) return "all";
    return planners.find((p) => p.id === activePlannerId)?.workspace ?? "all";
  }

  function getCurrentPlannerName(): string {
    if (scope === "all") return "Todos os Planners";
    if (activePlannerId === null) return defaultPlannerName;
    return planners.find((p) => p.id === activePlannerId)?.name ?? "Planner";
  }

  const activePlannerLabel =
    activePlannerId === null
      ? defaultPlannerName
      : (planners.find((p) => p.id === activePlannerId)?.name ?? "Planner atual");

  // ── Data filtering ─────────────────────────────────────────────────────────

  function getExportData() {
    const wsFilter = getWorkspaceFilter();
    const range = getDateRange(period, customStart, customEnd);

    const projects = store.projects.filter((p) => {
      if (wsFilter !== "all" && p.workspace !== wsFilter) return false;
      return true;
    });
    const projectIds = new Set(projects.map((p) => p.id));

    const tasks = store.tasks.filter((t) => {
      if (!projectIds.has(t.projectId)) return false;
      if (range) {
        if (!t.dueDate) return false;
        if (!inRange(t.dueDate, range)) return false;
      }
      return true;
    });

    const priorities = store.priorities.filter((p) => {
      if (wsFilter !== "all" && p.workspace !== wsFilter) return false;
      return inRange(p.date, range);
    });

    const followups = store.followups.filter((f) => {
      if (wsFilter !== "all" && f.workspace !== wsFilter) return false;
      if (range) {
        const refDate = f.dueDate ?? f.sinceDate;
        if (!inRange(refDate, range)) return false;
      }
      return true;
    });

    const goals = store.goals.filter((g) => {
      if (wsFilter !== "all" && g.workspace !== wsFilter) return false;
      return true;
    });

    const quickWins = store.quickWins.filter((q) => {
      if (wsFilter !== "all" && q.workspace !== wsFilter) return false;
      return inRange(q.date, range);
    });

    const taskNotes = store.taskNotes.filter((n) =>
      tasks.some((t) => t.id === n.taskId),
    );

    return { projects, tasks, priorities, followups, goals, quickWins, taskNotes };
  }

  // ── Helpers shared across export formats ───────────────────────────────────

  function getNote(taskId: string, notes: ReturnType<typeof getExportData>["taskNotes"]): string {
    return notes.find((n) => n.taskId === taskId)?.content ?? "";
  }

  function getProjectName(projectId: string): string {
    return store.projects.find((p) => p.id === projectId)?.name ?? "";
  }

  // ── JSON ──────────────────────────────────────────────────────────────────

  function exportJSON(data: ReturnType<typeof getExportData>, plannerName: string, filename: string) {
    const payload = {
      exportedAt: new Date().toISOString(),
      planner: plannerName,
      period,
      ...data,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Excel ─────────────────────────────────────────────────────────────────

  async function exportExcel(
    data: ReturnType<typeof getExportData>,
    _plannerName: string,
    filename: string,
  ) {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();

    if (data.projects.length > 0) {
      const rows = [
        ["Nome", "Tipo", "Workspace", "Status", "Saúde", "Início", "Prazo", "Observações"],
        ...data.projects.map((p) => [
          p.name,
          p.kind === "objetivo" ? "Objetivo" : "Projeto",
          p.workspace === "trabalho" ? "Profissional" : "Pessoal",
          STATUS_META[p.status]?.label ?? p.status,
          HEALTH_META[p.health]?.label ?? "-",
          p.startDate ?? "",
          p.dueDate ?? "",
          p.notes ?? "",
        ]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Projetos");
    }

    if (data.tasks.length > 0) {
      const rows = [
        ["Título", "Projeto", "Tipo", "Classificação", "Concluída", "Data", "Anotação"],
        ...data.tasks.map((t) => [
          t.title,
          getProjectName(t.projectId),
          t.parentId ? "Subtarefa" : "Tarefa",
          t.tag ?? "—",
          t.done ? "Sim" : "Não",
          t.dueDate ?? "",
          getNote(t.id, data.taskNotes),
        ]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Tarefas");
    }

    if (data.priorities.length > 0) {
      const rows = [
        ["Título", "Workspace", "Data", "Concluída"],
        ...data.priorities.map((p) => [
          p.title,
          p.workspace === "trabalho" ? "Profissional" : "Pessoal",
          p.date,
          p.done ? "Sim" : "Não",
        ]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Prioridades");
    }

    if (data.followups.length > 0) {
      const rows = [
        ["Quem", "O quê", "Desde", "Cobrar em", "Workspace", "Concluído"],
        ...data.followups.map((f) => [
          f.who,
          f.what,
          f.sinceDate,
          f.dueDate ?? "",
          f.workspace === "trabalho" ? "Profissional" : "Pessoal",
          f.done ? "Sim" : "Não",
        ]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Acompanhamentos");
    }

    if (data.quickWins.length > 0) {
      const rows = [
        ["Título", "Workspace", "Data", "Concluída"],
        ...data.quickWins.map((q) => [
          q.title,
          q.workspace === "trabalho" ? "Profissional" : "Pessoal",
          q.date ?? "",
          q.done ? "Sim" : "Não",
        ]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Tarefas Rápidas");
    }

    if (data.goals.length > 0) {
      const rows = [
        ["Mês", "Workspace", "Objetivo", "Como"],
        ...data.goals.map((g) => [
          g.month,
          g.workspace === "trabalho" ? "Profissional" : "Pessoal",
          g.goal,
          g.how,
        ]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Metas Mensais");
    }

    if (wb.SheetNames.length === 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Sem dados para o período selecionado"]]), "Info");
    }

    XLSX.writeFile(wb, `${filename}.xlsx`);
  }

  // ── PDF ───────────────────────────────────────────────────────────────────

  async function exportPDF(
    data: ReturnType<typeof getExportData>,
    plannerName: string,
    filename: string,
  ) {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW  = doc.internal.pageSize.getWidth();
    const margin = 14;
    let y = 20;

    const headStyle = { fillColor: [35, 33, 30] as [number, number, number], textColor: 255 as number, fontSize: 8, fontStyle: "bold" as const };
    const bodyStyle = { fontSize: 7.5, cellPadding: 2 };

    // Helper: get last table bottom y
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lastY = () => (doc as any).lastAutoTable?.finalY ?? y;

    // Helper: add section heading
    function section(title: string, count: number) {
      if (y > 255) { doc.addPage(); y = 20; }
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(35, 33, 30);
      doc.text(`${title}  (${count})`, margin, y);
      y += 4;
    }

    // ── Page header ─────────────────────────────────────────────────────────
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(35, 33, 30);
    doc.text("PLANNER — EXPORTAÇÃO DE DADOS", margin, y);

    y += 6;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Planner: ${plannerName}`, margin, y);
    doc.text(
      `Exportado em: ${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}`,
      pageW - margin,
      y,
      { align: "right" },
    );

    y += 4;
    doc.setDrawColor(200);
    doc.line(margin, y, pageW - margin, y);
    y += 8;
    doc.setTextColor(0);

    // ── Projetos ─────────────────────────────────────────────────────────────
    if (data.projects.length > 0) {
      section("PROJETOS", data.projects.length);
      autoTable(doc, {
        startY: y,
        head: [["Nome", "Tipo", "Workspace", "Status", "Saúde", "Início", "Prazo"]],
        body: data.projects.map((p) => [
          p.name,
          p.kind === "objetivo" ? "Objetivo" : "Projeto",
          p.workspace === "trabalho" ? "Profissional" : "Pessoal",
          STATUS_META[p.status]?.label ?? p.status,
          HEALTH_META[p.health]?.label ?? "-",
          p.startDate ?? "—",
          p.dueDate ?? "—",
        ]),
        headStyles: headStyle,
        styles: bodyStyle,
        margin: { left: margin, right: margin },
      });
      y = lastY() + 9;
    }

    // ── Tarefas ───────────────────────────────────────────────────────────────
    if (data.tasks.length > 0) {
      section("TAREFAS", data.tasks.length);
      autoTable(doc, {
        startY: y,
        head: [["Título", "Projeto", "Classificação", "Status", "Data", "Anotação"]],
        body: data.tasks.map((t) => [
          t.title,
          getProjectName(t.projectId),
          t.tag ?? "—",
          t.done ? "Concluída" : "Aberta",
          t.dueDate ?? "—",
          getNote(t.id, data.taskNotes) || "—",
        ]),
        headStyles: headStyle,
        styles: { ...bodyStyle, fontSize: 7 },
        columnStyles: { 0: { cellWidth: 48 }, 5: { cellWidth: 38 } },
        margin: { left: margin, right: margin },
      });
      y = lastY() + 9;
    }

    // ── Prioridades ──────────────────────────────────────────────────────────
    if (data.priorities.length > 0) {
      section("PRIORIDADES", data.priorities.length);
      autoTable(doc, {
        startY: y,
        head: [["Título", "Workspace", "Data", "Status"]],
        body: data.priorities.map((p) => [
          p.title,
          p.workspace === "trabalho" ? "Profissional" : "Pessoal",
          p.date,
          p.done ? "Concluída" : "Aberta",
        ]),
        headStyles: headStyle,
        styles: bodyStyle,
        margin: { left: margin, right: margin },
      });
      y = lastY() + 9;
    }

    // ── Acompanhamentos ───────────────────────────────────────────────────────
    if (data.followups.length > 0) {
      section("ACOMPANHAMENTOS", data.followups.length);
      autoTable(doc, {
        startY: y,
        head: [["Quem", "O quê", "Desde", "Cobrar em", "Status"]],
        body: data.followups.map((f) => [
          f.who,
          f.what,
          f.sinceDate,
          f.dueDate ?? "—",
          f.done ? "Resolvido" : "Aberto",
        ]),
        headStyles: headStyle,
        styles: bodyStyle,
        margin: { left: margin, right: margin },
      });
      y = lastY() + 9;
    }

    // ── Tarefas Rápidas ───────────────────────────────────────────────────────
    if (data.quickWins.length > 0) {
      section("TAREFAS RÁPIDAS", data.quickWins.length);
      autoTable(doc, {
        startY: y,
        head: [["Título", "Workspace", "Data", "Status"]],
        body: data.quickWins.map((q) => [
          q.title,
          q.workspace === "trabalho" ? "Profissional" : "Pessoal",
          q.date ?? "—",
          q.done ? "Concluída" : "Aberta",
        ]),
        headStyles: headStyle,
        styles: bodyStyle,
        margin: { left: margin, right: margin },
      });
      y = lastY() + 9;
    }

    // ── Metas Mensais ─────────────────────────────────────────────────────────
    if (data.goals.length > 0) {
      section("METAS MENSAIS", data.goals.length);
      autoTable(doc, {
        startY: y,
        head: [["Mês", "Workspace", "Objetivo", "Como alcançar"]],
        body: data.goals.map((g) => [
          g.month,
          g.workspace === "trabalho" ? "Profissional" : "Pessoal",
          g.goal,
          g.how,
        ]),
        headStyles: headStyle,
        styles: bodyStyle,
        margin: { left: margin, right: margin },
      });
    }

    // ── Footer on each page ───────────────────────────────────────────────────
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(160);
      doc.text(
        `Página ${i} de ${totalPages} — ${plannerName}`,
        pageW / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: "center" },
      );
    }

    doc.save(`${filename}.pdf`);
  }

  // ── Main handler ──────────────────────────────────────────────────────────

  async function handleExport() {
    setLoading(true);
    setError(null);
    try {
      const data = getExportData();
      const plannerName = getCurrentPlannerName();
      const filename = `planner-export-${todayISO()}`;

      if (format === "json") {
        exportJSON(data, plannerName, filename);
      } else if (format === "xlsx") {
        await exportExcel(data, plannerName, filename);
      } else {
        await exportPDF(data, plannerName, filename);
      }
      onClose();
    } catch (e) {
      console.error("Export error:", e);
      setError("Erro ao gerar o arquivo. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  // ── UI ────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-[1px]" onClick={onClose} />

      {/* Modal panel */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-paper border border-hairline shadow-[0_8px_40px_rgba(44,43,39,0.18)] w-full max-w-md flex flex-col max-h-[90vh]">

          {/* Header */}
          <div className="px-5 py-4 border-b border-hairline flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-[13px] font-semibold uppercase tracking-wider">⬇ Exportar Dados</h2>
              <p className="text-[10px] text-muted font-serif-note mt-0.5">Baixe seus dados em diferentes formatos</p>
            </div>
            <button onClick={onClose} className="text-[16px] text-muted hover:text-ink transition-colors">✕</button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

            {/* Formato */}
            <div>
              <p className="text-[9px] uppercase tracking-[0.22em] text-muted mb-2.5 font-semibold">Formato</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { key: "pdf"  as const, icon: "📄", label: "PDF",   desc: "Relatório elegante" },
                  { key: "xlsx" as const, icon: "📊", label: "Excel", desc: "Abas por categoria" },
                  { key: "json" as const, icon: "{ }", label: "JSON",  desc: "Backup completo"    },
                ]).map(({ key, icon, label, desc }) => (
                  <button
                    key={key}
                    onClick={() => setFormat(key)}
                    className={`flex flex-col items-center gap-1 py-3 border transition-all ${
                      format === key
                        ? "bg-ink text-paper border-ink"
                        : "border-hairline hover:border-ink/40 hover:bg-tan-soft/40"
                    }`}
                  >
                    <span className="text-[18px] leading-none">{icon}</span>
                    <span className="text-[10px] font-semibold mt-0.5">{label}</span>
                    <span className={`text-[8px] leading-tight ${format === key ? "text-paper/60" : "text-muted"}`}>{desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Escopo */}
            <div>
              <p className="text-[9px] uppercase tracking-[0.22em] text-muted mb-2.5 font-semibold">Escopo</p>
              <div className="flex border border-hairline">
                {([
                  { key: "all"     as const, label: "Todos os planners" },
                  { key: "current" as const, label: `Só: ${activePlannerLabel}` },
                ]).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setScope(key)}
                    className={`flex-1 text-[9px] uppercase tracking-wider px-2 py-1.5 transition-colors ${
                      scope === key ? "bg-ink text-paper" : "hover:bg-tan-soft"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Período */}
            <div>
              <p className="text-[9px] uppercase tracking-[0.22em] text-muted mb-2.5 font-semibold">
                Período <span className="normal-case tracking-normal font-normal">(aplica-se a tarefas, prioridades e acompanhamentos)</span>
              </p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {([
                  { key: "all"    as const, label: "Tudo"          },
                  { key: "today"  as const, label: "Hoje"          },
                  { key: "week"   as const, label: "Esta semana"   },
                  { key: "month"  as const, label: "Este mês"      },
                  { key: "custom" as const, label: "Personalizado" },
                ]).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setPeriod(key)}
                    className={`text-[9px] uppercase tracking-wider px-2.5 py-1 border transition-colors ${
                      period === key ? "bg-ink text-paper border-ink" : "border-hairline hover:border-ink/40"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {period === "custom" && (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-[8px] uppercase tracking-wider text-muted block mb-1">De</label>
                    <input
                      type="date"
                      className="ink-input w-full"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[8px] uppercase tracking-wider text-muted block mb-1">Até</label>
                    <input
                      type="date"
                      className="ink-input w-full"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Resumo do arquivo */}
            <div className="bg-tan-soft/50 border border-hairline px-3.5 py-2.5 space-y-0.5">
              <p className="text-[8px] uppercase tracking-wider text-muted">Arquivo a ser gerado</p>
              <p className="text-[12px] font-medium font-serif-note">
                planner-export-{todayISO()}.{format}
              </p>
              <p className="text-[10px] text-muted">
                {scope === "all" ? "Todos os planners" : activePlannerLabel}
                {period !== "all" && (
                  <> · Período: {
                    period === "today"  ? "hoje"        :
                    period === "week"   ? "esta semana" :
                    period === "month"  ? "este mês"    :
                    customStart || customEnd ? `${customStart} a ${customEnd}` : "personalizado"
                  }</>
                )}
              </p>
            </div>

            {error && (
              <p className="text-[10px] text-alert bg-alert/5 border border-alert/20 px-3 py-2">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-hairline flex justify-end gap-2 shrink-0">
            <button className="ink-btn" onClick={onClose}>Cancelar</button>
            <button
              className="ink-btn bg-ink text-paper disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleExport}
              disabled={loading}
            >
              {loading ? "Gerando…" : `⬇ Baixar .${format.toUpperCase()}`}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
