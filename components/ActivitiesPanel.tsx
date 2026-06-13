"use client";

import type { AppStore } from "@/lib/store";
import type { Project, Task, Workspace } from "@/lib/types";
import { STATUS_META } from "@/lib/theme";
import { InkCheck, SectionBar } from "./ui";

export function ActivitiesPanel({
  store,
  workspace,
  projects,
}: {
  store: AppStore;
  workspace: Workspace;
  projects: Project[];
}) {
  const projectIds = new Set(projects.map((p) => p.id));

  const items: { task: Task; project: Project }[] = store.tasks
    .filter((t) => !t.done && t.tag === "atividade" && projectIds.has(t.projectId))
    .map((t) => ({
      task: t,
      project: projects.find((p) => p.id === t.projectId)!,
    }))
    .filter((x) => x.project !== undefined)
    .sort((a, b) =>
      (a.task.dueDate ?? "9999") < (b.task.dueDate ?? "9999") ? -1 : 1
    );

  return (
    <section className="bg-paper border border-hairline">
      <SectionBar
        title="Atividades"
        right={
          <span className="text-paper text-[10px] tracking-[0.15em]">
            {items.length}
          </span>
        }
      />
      <div className="px-3 py-2">
        {items.length === 0 && (
          <p className="text-[11px] font-serif-note text-muted py-1">
            Nenhuma atividade em andamento.
          </p>
        )}

        {items.map(({ task, project }) => {
          const statusMeta = STATUS_META[project.status];
          return (
            <div key={task.id} className="group-row py-1.5 hairline-b">
              <div className="flex items-start gap-2">
                <InkCheck
                  state="open"
                  onToggle={() => store.toggleTask(task.id, true)}
                  title="Marcar como concluída"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-[12px] leading-snug">{task.title}</span>
                  <span className="block text-[9px] uppercase tracking-wider text-muted mt-0.5">
                    {project.code}
                    {" · "}
                    <span style={{ color: statusMeta.color }}>{statusMeta.label}</span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
