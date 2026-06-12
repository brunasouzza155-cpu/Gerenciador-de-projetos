// Tipos de dados do Painel da Bruna.
// "Workspace" é a aba: trabalho ou pessoal. Todos os dados carregam esse campo
// para que as duas áreas fiquem totalmente separadas.

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

export interface Project {
  id: string;
  workspace: Workspace;
  code: string;
  name: string;
  status: ProjectStatus;
  health: Health;
  startDate: string | null; // datas sempre no formato "AAAA-MM-DD"
  dueDate: string | null;
  stoppedDate: string | null; // só faz sentido se pausado/cancelado
  gains: number | null; // ganhos estimados em R$
  fte: number | null; // esforço em FTE (pessoas em tempo integral)
  notes: string; // notas / riscos / decisões
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  parentId: string | null; // null = tarefa-raiz; senão aponta para a tarefa-mãe
  title: string;
  done: boolean;
  dueDate: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// Quick win / demanda do dia. projectId null = demanda solta do dia;
// projectId preenchido = quick win dentro do card do projeto.
export interface QuickWin {
  id: string;
  workspace: Workspace;
  projectId: string | null;
  title: string;
  done: boolean;
  date: string | null; // dia a que a demanda pertence (null para quick win de projeto)
}

export interface Priority {
  id: string;
  workspace: Workspace;
  title: string;
  done: boolean;
  date: string; // prioridades são salvas por dia
}

export interface Followup {
  id: string;
  workspace: Workspace;
  projectId: string | null;
  who: string; // pessoa ou área
  what: string; // o que está sendo aguardado
  sinceDate: string; // desde quando espera
  dueDate: string | null; // prazo combinado de retorno
  done: boolean;
}

export interface MonthlyGoal {
  id: string;
  workspace: Workspace;
  month: string; // primeiro dia do mês, "AAAA-MM-01"
  goal: string; // a meta em si
  how: string; // como alcançar
}
