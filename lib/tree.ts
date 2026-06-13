import type { Task } from "./types";

// Lógica da cascata de tarefas (árvore com níveis ilimitados via parentId).

export interface TaskNode {
  task: Task;
  children: TaskNode[];
}

/** Monta a árvore de tarefas de um projeto a partir da lista plana. */
export function buildTree(tasks: Task[], projectId: string): TaskNode[] {
  const byParent = new Map<string | null, Task[]>();
  for (const t of tasks) {
    if (t.projectId !== projectId) continue;
    const key = t.parentId;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(t);
  }
  const make = (parentId: string | null): TaskNode[] =>
    (byParent.get(parentId) ?? [])
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((task) => ({ task, children: make(task.id) }));
  return make(null);
}

/** Ids de todos os descendentes de uma tarefa (para marcar/excluir em cascata). */
export function descendantIds(tasks: Task[], rootId: string): string[] {
  const childrenOf = new Map<string, string[]>();
  for (const t of tasks) {
    if (t.parentId) {
      if (!childrenOf.has(t.parentId)) childrenOf.set(t.parentId, []);
      childrenOf.get(t.parentId)!.push(t.id);
    }
  }
  const out: string[] = [];
  const walk = (id: string) => {
    for (const c of childrenOf.get(id) ?? []) {
      out.push(c);
      walk(c);
    }
  };
  walk(rootId);
  return out;
}

/**
 * Estado visual do checkbox de um nó: "done", "partial" (parte das filhas
 * concluída) ou "open". Tarefas-folha usam o próprio `done`.
 */
export function nodeState(node: TaskNode): "done" | "partial" | "open" {
  if (node.children.length === 0) return node.task.done ? "done" : "open";
  // Usa apenas filhas diretas: marcar subtarefas não auto-completa a mãe.
  const doneCount = node.children.filter((c) => c.task.done).length;
  if (doneCount === 0) return "open";
  if (doneCount === node.children.length) return "done";
  return "partial";
}

/** Tarefas-folha (sem filhas) sob um nó, incluindo o próprio se for folha. */
export function collectLeaves(node: TaskNode): Task[] {
  if (node.children.length === 0) return [node.task];
  return node.children.flatMap(collectLeaves);
}

/** Progresso do projeto: folhas concluídas ÷ total de folhas (0 a 100). */
export function projectProgress(tasks: Task[], projectId: string): number {
  const tree = buildTree(tasks, projectId);
  const leaves = tree.flatMap(collectLeaves);
  if (leaves.length === 0) return 0;
  return Math.round((leaves.filter((l) => l.done).length / leaves.length) * 100);
}

/** Lista plana de todas as folhas de um projeto. */
export function projectLeaves(tasks: Task[], projectId: string): Task[] {
  return buildTree(tasks, projectId).flatMap(collectLeaves);
}
