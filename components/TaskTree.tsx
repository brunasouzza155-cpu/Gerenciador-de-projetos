"use client";

import { useState } from "react";
import type { TaskNote } from "@/lib/types";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { fmtShort, todayISO } from "@/lib/dates";
import { nodeState, type TaskNode } from "@/lib/tree";
import type { AppStore } from "@/lib/store";
import type { TaskTag } from "@/lib/types";
import { AddInline, InkCheck, RowBtn } from "./ui";

// ── Tag styles ────────────────────────────────────────────────────────────────
const TAG_META: Record<
  NonNullable<TaskTag>,
  { label: string; bg: string; color: string }
> = {
  rapida:         { label: "RÁPIDA",      bg: "#EFE5D4", color: "#8C8578" },
  acompanhamento: { label: "ACOMP.",      bg: "#E8EEF4", color: "#51677F" },
  atividade:      { label: "ATIVIDADE",   bg: "#E8F4EC", color: "#4D6B57" },
  agenda:         { label: "AGENDA",      bg: "#F0E8F4", color: "#6B4D7F" },
  prioridade:     { label: "PRIORIDADE",  bg: "#FFF0E8", color: "#8C5D3F" },
};

// ── Public component ──────────────────────────────────────────────────────────

/**
 * Renders a list of task nodes.
 * At depth=0 (root tasks): drag-and-drop reordering via @dnd-kit.
 * At depth>0 (subtasks): rendered normally without DnD.
 */
export function TaskTree({
  nodes,
  store,
  depth = 0,
}: {
  nodes: TaskNode[];
  store: AppStore;
  depth?: number;
}) {
  if (depth === 0 && nodes.length > 1) {
    return <SortableTaskList nodes={nodes} store={store} />;
  }
  return (
    <div>
      {nodes.map((node) => (
        <TaskRow key={node.task.id} node={node} store={store} depth={depth} dragHandle={null} />
      ))}
    </div>
  );
}

// ── Sortable list (root level only) ──────────────────────────────────────────

function SortableTaskList({ nodes, store }: { nodes: TaskNode[]; store: AppStore }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const ids = nodes.map((n) => n.task.id);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = ids.indexOf(active.id as string);
    const newIdx = ids.indexOf(over.id as string);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(ids, oldIdx, newIdx);
    store.reorderTasks(nodes[0].task.projectId, nodes[0].task.parentId, reordered);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {nodes.map((node) => (
          <SortableTaskRow key={node.task.id} node={node} store={store} />
        ))}
      </SortableContext>
    </DndContext>
  );
}

function SortableTaskRow({ node, store }: { node: TaskNode; store: AppStore }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: node.task.id });

  const handle = (
    <span
      className="text-muted text-[13px] shrink-0 cursor-grab px-0.5 select-none touch-none"
      title="Arrastar para reordenar prioridade"
      {...attributes}
      {...listeners}
    >
      ⠿
    </span>
  );

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
        zIndex: isDragging ? 10 : undefined,
        position: "relative",
      }}
    >
      <TaskRow node={node} store={store} depth={0} dragHandle={handle} />
    </div>
  );
}

// ── Note popup (post-it) ─────────────────────────────────────────────────────

function NotePopup({
  taskId,
  note,
  store,
  onClose,
}: {
  taskId: string;
  note: TaskNote | undefined;
  store: AppStore;
  onClose: () => void;
}) {
  const [text, setText] = useState(note?.content ?? "");

  function handleSave() {
    const trimmed = text.trim();
    if (trimmed) {
      note ? store.updateTaskNote(note.id, trimmed) : store.addTaskNote(taskId, trimmed);
    } else if (note) {
      store.deleteTaskNote(note.id);
    }
    onClose();
  }

  return (
    <div className="p-2.5 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
      <p className="text-[9px] uppercase tracking-wider text-muted">Anotação</p>
      <textarea
        className="w-full text-[11px] p-1.5 resize-none border border-tan/60 bg-transparent outline-none leading-relaxed"
        rows={4}
        placeholder="Escreva uma anotação…"
        value={text}
        autoFocus
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSave();
          if (e.key === "Escape") onClose();
        }}
      />
      <div className="flex gap-1 justify-end">
        {note && (
          <button
            className="text-[10px] text-alert px-1.5 py-0.5 border border-alert/30 hover:bg-alert/10 transition-colors"
            onClick={() => { store.deleteTaskNote(note.id); onClose(); }}
          >
            excluir
          </button>
        )}
        <button
          className="text-[10px] text-muted px-1.5 py-0.5 border border-hairline hover:text-ink transition-colors"
          onClick={onClose}
        >
          cancelar
        </button>
        <button
          className="text-[10px] text-paper bg-ink px-2 py-0.5 hover:opacity-80 transition-opacity"
          onClick={handleSave}
        >
          salvar
        </button>
      </div>
    </div>
  );
}

// ── Task row ──────────────────────────────────────────────────────────────────

function TaskRow({
  node,
  store,
  depth,
  dragHandle,
}: {
  node: TaskNode;
  store: AppStore;
  depth: number;
  dragHandle: React.ReactNode;
}) {
  const { task } = node;
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [notePinned, setNotePinned] = useState(false);

  const [title, setTitle]   = useState(task.title);
  const [due, setDue]       = useState(task.dueDate ?? "");
  const [tag, setTag]       = useState<TaskTag>(task.tag);
  const [tagDue, setTagDue] = useState(task.tagDueDate ?? "");

  const taskNote = store.taskNotes.find((n) => n.taskId === task.id);
  const state   = nodeState(node);
  const today   = todayISO();
  const overdue = !task.done && task.dueDate !== null && task.dueDate < today;
  const tagMeta = task.tag ? TAG_META[task.tag] : null;

  return (
    <div>
      <div
        className="relative group flex items-center gap-1.5 py-[3px] hairline-b"
        style={{ paddingLeft: depth * 14 }}
      >
        {/* ── Indicador de anotação: triângulo no canto superior direito ── */}
        {taskNote && (
          <div className="absolute top-0 right-0 z-20 group/noteind" style={{ width: 10 }}>
            <div
              className="w-[10px] h-[10px] cursor-pointer"
              style={{ background: "var(--ink)", clipPath: "polygon(0 0, 100% 0, 100% 100%)" }}
              onClick={(e) => { e.stopPropagation(); setNotePinned(true); }}
            />
            {!notePinned && (
              <div
                className="hidden group-hover/noteind:block absolute right-0 z-50 w-52 shadow-md border border-tan/50 p-2 text-[11px] cursor-default select-text"
                style={{ background: "var(--tan-soft)", top: 10 }}
                onClick={(e) => { e.stopPropagation(); setNotePinned(true); }}
              >
                <p className="text-ink/80 whitespace-pre-wrap break-words leading-relaxed">{taskNote.content}</p>
                <p className="text-[9px] text-muted/60 mt-1.5 italic">clique para editar</p>
              </div>
            )}
          </div>
        )}

        {/* ── Popup de edição (fixado ao clicar) ── */}
        {notePinned && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setNotePinned(false)} />
            <div
              className="absolute top-full right-0 z-50 w-56 shadow-lg border border-tan/60"
              style={{ background: "var(--tan-soft)" }}
            >
              <NotePopup taskId={task.id} note={taskNote} store={store} onClose={() => setNotePinned(false)} />
            </div>
          </>
        )}
        {depth > 0 && (
          <span className="text-hairline text-[10px] shrink-0">└</span>
        )}

        {/* Drag handle — only at depth 0 */}
        {dragHandle}

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
            <select
              className="ink-input w-[140px]"
              value={tag ?? ""}
              onChange={(e) => {
                const newTag = (e.target.value as TaskTag) || null;
                setTag(newTag);
                store.updateTask(task.id, {
                  title: task.title,
                  dueDate: task.dueDate,
                  tag: newTag,
                  tagDueDate: newTag === "acompanhamento" ? task.tagDueDate : null,
                });
              }}
            >
              <option value="">sem classificação</option>
              <option value="prioridade">⭐ prioridade</option>
              <option value="rapida">⚡ tarefa rápida</option>
              <option value="acompanhamento">👁 acompanhamento</option>
              <option value="atividade">📋 atividade</option>
              <option value="agenda">🗓 agenda</option>
            </select>
            {tag === "acompanhamento" && (
              <input
                type="date"
                className="ink-input w-[120px]"
                title="Cobrar em…"
                value={tagDue}
                onChange={(e) => {
                  setTagDue(e.target.value);
                  store.updateTask(task.id, {
                    title: task.title,
                    dueDate: task.dueDate,
                    tag: task.tag,
                    tagDueDate: e.target.value || null,
                  });
                }}
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

            {tagMeta && (
              <span
                className="text-[8px] uppercase tracking-wider px-1 py-0.5 shrink-0 font-medium"
                style={{ background: tagMeta.bg, color: tagMeta.color }}
              >
                {tagMeta.label}
              </span>
            )}

            {task.dueDate && (
              <span className={`text-[10px] tabular-nums shrink-0 ${overdue ? "text-alert" : "text-muted"}`}>
                {fmtShort(task.dueDate)}
              </span>
            )}
            {task.tag === "acompanhamento" && task.tagDueDate && (
              <span className="text-[9px] text-muted tabular-nums shrink-0">
                cobrar {fmtShort(task.tagDueDate)}
              </span>
            )}

            {node.children.length > 0 && (
              <button
                className="text-[9px] text-muted hover:text-ink shrink-0 tabular-nums"
                onClick={() => setExpanded((v) => !v)}
                title={expanded ? "Recolher subtarefas" : "Expandir subtarefas"}
              >
                {expanded ? "▾" : "▸"}{" "}
                {node.children.filter((c) => c.task.done).length}/{node.children.length}
              </button>
            )}

            <span className="row-actions flex gap-1 shrink-0 opacity-20 group-hover:opacity-100 transition-opacity">
              <RowBtn label="+" title="Adicionar subtarefa" onClick={() => { setAdding((v) => !v); setExpanded(true); }} />
              <RowBtn label="📝" title={taskNote ? "Editar anotação" : "Adicionar anotação"} onClick={() => setNotePinned(true)} />
              <RowBtn label="✏️" title="Editar título, data e classificação" onClick={() => setEditing(true)} />
              <RowBtn
                label="🗑"
                title="Excluir tarefa (e todas as subtarefas)"
                danger
                onClick={() => {
                  const childCount = node.children.length;
                  const msg = childCount > 0
                    ? `Excluir "${task.title}" e ${childCount} subtarefa(s) em cascata?`
                    : `Excluir a tarefa "${task.title}"?`;
                  if (confirm(msg)) store.deleteTask(task.id);
                }}
              />
            </span>
          </>
        )}
      </div>

      {adding && (
        <div className="flex items-center gap-2 py-1" style={{ paddingLeft: (depth + 1) * 14 }}>
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

      {expanded && node.children.length > 0 && (
        <TaskTree nodes={node.children} store={store} depth={depth + 1} />
      )}
    </div>
  );
}
