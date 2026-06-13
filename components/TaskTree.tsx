"use client";

import { useState } from "react";
import { fmtShort, todayISO } from "@/lib/dates";
import { nodeState, type TaskNode } from "@/lib/tree";
import type { AppStore } from "@/lib/store";
import type { TaskTag } from "@/lib/types";
import { AddInline, InkCheck, RowBtn } from "./ui";

export function TaskTree({
  nodes,
  store,
  depth = 0,
}: {
  nodes: TaskNode[];
  store: AppStore;
  depth?: number;
}) {
  return (
    <div>
      {nodes.map((node) => (
        <TaskRow key={node.task.id} node={node} store={store} depth={depth} />
      ))}
    </div>
  );
}

const TAG_META: Record<
  NonNullable<TaskTag>,
  { label: string; bg: string; color: string }
> = {
  rapida:          { label: "RÁPIDA",    bg: "#EFE5D4", color: "#8C8578" },
  acompanhamento:  { label: "ACOMP.",    bg: "#E8EEF4", color: "#51677F" },
  atividade:       { label: "ATIVIDADE", bg: "#E8F4EC", color: "#4D6B57" },
};

function TaskRow({
  node,
  store,
  depth,
}: {
  node: TaskNode;
  store: AppStore;
  depth: number;
}) {
  const { task } = node;
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);

  // campos do formulário de edição
  const [title, setTitle] = useState(task.title);
  const [due, setDue] = useState(task.dueDate ?? "");
  const [tag, setTag] = useState<TaskTag>(task.tag);
  const [tagDue, setTagDue] = useState(task.tagDueDate ?? "");

  const state = nodeState(node);
  const today = todayISO();
  const overdue = !task.done && task.dueDate !== null && task.dueDate < today;
  const tagMeta = task.tag ? TAG_META[task.tag] : null;

  return (
    <div>
      <div
        className="group-row flex items-center gap-1.5 py-[3px] hairline-b"
        style={{ paddingLeft: depth * 14 }}
      >
        {depth > 0 && (
          <span className="text-hairline text-[10px] shrink-0">└</span>
        )}
        <InkCheck
          state={state}
          onToggle={() => store.toggleTask(task.id, state !== "done")}
          title={state === "done" ? "Desmarcar" : "Concluir (marca as filhas)"}
        />

        {editing ? (
          /* ── Formulário de edição inline ── */
          <form
            className="flex flex-1 flex-wrap items-center gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!title.trim()) return;
              store.updateTask(task.id, {
                title: title.trim(),
                dueDate: due || null,
                tag,
                tagDueDate: tag === "acompanhamento" ? (tagDue || null) : null,
              });
              setEditing(false);
            }}
          >
            <input
              className="ink-input flex-1 min-w-[120px]"
              value={title}
              autoFocus
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              type="date"
              className="ink-input w-[120px]"
              title="Data da tarefa"
              value={due}
              onChange={(e) => setDue(e.target.value)}
            />
            {/* Seletor de tag */}
            <select
              className="ink-input w-[140px]"
              value={tag ?? ""}
              onChange={(e) => setTag((e.target.value as TaskTag) || null)}
            >
              <option value="">sem classificação</option>
              <option value="rapida">⚡ tarefa rápida</option>
              <option value="acompanhamento">👁 acompanhamento</option>
              <option value="atividade">📋 atividade</option>
            </select>
            {/* Data de cobrança só aparece se for acompanhamento */}
            {tag === "acompanhamento" && (
              <input
                type="date"
                className="ink-input w-[120px]"
                title="Cobrar em…"
                placeholder="cobrar em…"
                value={tagDue}
                onChange={(e) => setTagDue(e.target.value)}
              />
            )}
            <button className="ink-btn" type="submit">ok</button>
            <button
              className="ink-btn"
              type="button"
              onClick={() => {
                setTitle(task.title);
                setDue(task.dueDate ?? "");
                setTag(task.tag);
                setTagDue(task.tagDueDate ?? "");
                setEditing(false);
              }}
            >
              ×
            </button>
          </form>
        ) : (
          /* ── Linha normal ── */
          <>
            <span
              className={`flex-1 text-[12px] leading-tight min-w-0 ${
                state === "done"
                  ? "line-through text-muted"
                  : overdue
                    ? "text-alert font-medium"
                    : ""
              }`}
            >
              {task.title}
              {overdue && (
                <span className="ml-1 text-[9px] uppercase tracking-wider text-alert">
                  ⚠ atrasada
                </span>
              )}
            </span>

            {/* Badge de tag */}
            {tagMeta && (
              <span
                className="text-[8px] uppercase tracking-wider px-1 py-0.5 shrink-0 font-medium"
                style={{ background: tagMeta.bg, color: tagMeta.color }}
              >
                {tagMeta.label}
              </span>
            )}

            {task.dueDate && (
              <span
                className={`text-[10px] tabular-nums shrink-0 ${
                  overdue ? "text-alert" : "text-muted"
                }`}
              >
                {fmtShort(task.dueDate)}
              </span>
            )}
            {task.tag === "acompanhamento" && task.tagDueDate && (
              <span className="text-[9px] text-muted tabular-nums shrink-0">
                cobrar {fmtShort(task.tagDueDate)}
              </span>
            )}

            <span className="row-actions flex gap-1 shrink-0">
              <RowBtn
                label="+"
                title="Adicionar subtarefa"
                onClick={() => setAdding((v) => !v)}
              />
              <RowBtn
                label="✎"
                title="Editar título, data e classificação"
                onClick={() => setEditing(true)}
              />
              <RowBtn
                label="×"
                title="Excluir tarefa (e subtarefas)"
                danger
                onClick={() => {
                  if (
                    confirm(
                      `Excluir a tarefa "${task.title}" e todas as subtarefas?`
                    )
                  ) {
                    store.deleteTask(task.id);
                  }
                }}
              />
            </span>
          </>
        )}
      </div>

      {adding && (
        <div
          className="flex items-center gap-2 py-1"
          style={{ paddingLeft: (depth + 1) * 14 }}
        >
          <AddInline
            placeholder="nova subtarefa… (Enter para salvar)"
            onAdd={(v) => {
              store.addTask(task.projectId, task.id, v);
              setAdding(false);
            }}
          />
          <button className="ink-btn" onClick={() => setAdding(false)}>
            cancelar
          </button>
        </div>
      )}

      {node.children.length > 0 && (
        <TaskTree nodes={node.children} store={store} depth={depth + 1} />
      )}
    </div>
  );
}
