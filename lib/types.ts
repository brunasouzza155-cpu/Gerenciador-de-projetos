// Tipos de dados do Painel da Bruna.
// "Workspace" é a aba: trabalho ou pessoal.

export type Workspace = "trabalho" | "pessoal";

export type ProjectStatus =
  | "andamento"
  | "desenvolvimento"
  | "aguardando"
  | "pausado"
  | "cancelado"
  | "concluido";

// Farol de saúde: 0 = 🟢 ok, 1 = 🟡 atenção, 2 = 🔴 crítico
export type Health = 0 | 1 | 2;

// Tag de uma tarefa:
// "rapida"          → aparece na seção "Tarefas Rápidas" do dia correspondente
// "acompanhamento"  → aparece no painel "Acompanhamentos" com a data tagDueDate
// "atividade"       → aparece no bloco "Atividades" da página principal
// "agenda"          → compromisso de agenda / evento
export type TaskTag = "rapida" | "acompanhamento" | "atividade" | "agenda" | null;

export interface Project {
  id: string;
  workspace: Workspace;
  code: string;
  name: string;
  status: ProjectStatus;
  health: Health;
  startDate: string | null;
  dueDate: string | null;
  stoppedDate: string | null;
  gains: number | null;
  fte: number | null;
  notes: string;
  archived: boolean;
  kind?: "projeto" | "objetivo";
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  parentId: string | null;
  title: string;
  done: boolean;
  dueDate: string | null;
  // Classificação da tarefa (opcional). Define onde ela também aparece.
  tag: TaskTag;
  // Para tag="acompanhamento": data em que cobrar; para "rapida": ignorado.
  tagDueDate: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuickWin {
  id: string;
  workspace: Workspace;
  projectId: string | null;
  title: string;
  done: boolean;
  date: string | null;
}

export interface Priority {
  id: string;
  workspace: Workspace;
  title: string;
  done: boolean;
  date: string;
}

export interface Followup {
  id: string;
  workspace: Workspace;
  projectId: string | null;
  who: string;
  what: string;
  sinceDate: string;
  dueDate: string | null;
  // Data para revisitar/validar o acompanhamento; quando chega, aparece no painel "Hoje".
  validationDate: string | null;
  done: boolean;
}

export interface MonthlyGoal {
  id: string;
  workspace: Workspace;
  month: string;
  goal: string;
  how: string;
}
