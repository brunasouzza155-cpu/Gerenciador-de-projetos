"use client";

import { useState } from "react";
import { fmtShort, todayISO } from "@/lib/dates";
import { nodeState, type TaskNode } from "@/lib/tree";
import type { AppStore } from "@/lib/store";
import { AddInline, InkCheck, RowBtn } from "./ui";

// Cascata de tarefas com níveis ilimitados.
// No hover de cada linha: [+] subtarefa, [✎] editar, [×] excluir.

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
  const [title, setTitle] = useState(task.title);
  const [due, setDue] = useState(task.dueDate ?? "");

  const state = nodeState(node);
  const overdue =
    !task.done && task.dueDate !== null && task.dueDate < todayISO();

  return (
    <div>
      <div
        className="group-row flex items-center gap-2 py-[3px] hairline-b"
        style={{ paddingLeft: depth * 16 }}
      >
        {depth > 0 && <span className="text-hairline text-[10px]">└</span>}
        <InkCheck
          state={state}
          onToggle={() => store.toggleTask(task.id, state !== "done")}
          title={state === "done" ? "Desmarcar" : "Concluir (marca as filhas)"}
        />
        {editing ? (
          <form
            className="flex flex-1 items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (title.trim()) {
                store.updateTask(task.id, {
                  title: title.trim(),
                  dueDate: due || null,
                });
                setEditing(false);
              }
            }}
          >
            <input
              className="ink-input flex-1"
              value={title}
              autoFocus
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              type="date"
              className="ink-input w-[120px]"
              value={due}
              onChange={(e) => setDue(e.target.value)}
            />
            <button className="ink-btn" type="submit">ok</button>
          </form>
        ) : (
          <>
            <span
              className={`flex-1 text-[12px] leading-tight ${
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
            {task.dueDate && (
              <span
                className={`text-[10px] tabular-nums ${overdue ? "text-alert" : "text-muted"}`}
              >
                {fmtShort(task.dueDate)}
              </span>
            )}
            <span className="row-actions flex gap-1">
              <RowBtn label="+" title="Adicionar subtarefa" onClick={() => setAdding(true)} />
              <RowBtn label="✎" title="Editar título e data" onClick={() => setEditing(true)} />
              <RowBtn
                label="×"
                title="Excluir tarefa (e subtarefas)"
                danger
                onClick={() => {
                  if (confirm(`Excluir a tarefa "${task.title}" e todas as subtarefas?`)) {
                    store.deleteTask(task.id);
                  }
                }}
              />
            </span>
          </>
        )}
      </div>

      {adding && (
        <div className="flex items-center gap-2 py-1" style={{ paddingLeft: (depth + 1) * 16 }}>
          <AddInline
            placeholder="nova subtarefa… (Enter para salvar)"
            onAdd={(v) => {
              store.addTask(task.projectId, task.id, v);
              setAdding(false);
            }}
          />
          <button className="ink-btn" onClick={() => setAdding(false)}>cancelar</button>
        </div>
      )}

      {node.children.length > 0 && (
        <TaskTree nodes={node.children} store={store} depth={depth + 1} />
      )}
    </div>
  );
}
