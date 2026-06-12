import { addDays, addMonths, monthStart, todayISO } from "./dates";
import type {
  Followup,
  MonthlyGoal,
  Priority,
  Project,
  QuickWin,
  Task,
} from "./types";

// Dados de exemplo para validar o visual antes de ligar o banco de dados.
// As datas são relativas a hoje, então os painéis sempre mostram conteúdo.

const T = todayISO();
const now = new Date().toISOString();

const stamp = { createdAt: now, updatedAt: now };

export const mockProjects: Project[] = [
  {
    id: "p1",
    workspace: "trabalho",
    code: "PRJ-001",
    name: "Migração do CRM",
    status: "andamento",
    health: 0,
    startDate: addMonths(T, -2),
    dueDate: addMonths(T, 1),
    stoppedDate: null,
    gains: 120000,
    fte: 1.5,
    notes: "Risco: dependemos da área de TI para o ambiente de homologação. Decisão 02/06: faseamento em duas ondas.",
    archived: false,
    ...stamp,
  },
  {
    id: "p2",
    workspace: "trabalho",
    code: "PRJ-002",
    name: "Automação de relatórios",
    status: "desenvolvimento",
    health: 1,
    startDate: addMonths(T, -1),
    dueDate: addDays(T, 10),
    stoppedDate: null,
    gains: 45000,
    fte: 0.5,
    notes: "Aguardando acesso ao data lake.",
    archived: false,
    ...stamp,
  },
  {
    id: "p3",
    workspace: "trabalho",
    code: "PRJ-003",
    name: "Nova política de fornecedores",
    status: "aguardando",
    health: 1,
    startDate: addMonths(T, -3),
    dueDate: addMonths(T, 2),
    stoppedDate: null,
    gains: 80000,
    fte: 0.3,
    notes: "Minuta enviada ao jurídico em 28/05.",
    archived: false,
    ...stamp,
  },
  {
    id: "p4",
    workspace: "trabalho",
    code: "PRJ-004",
    name: "Treinamento do time",
    status: "pausado",
    health: 2,
    startDate: addMonths(T, -4),
    dueDate: addMonths(T, 3),
    stoppedDate: addDays(T, -12),
    gains: null,
    fte: 0.2,
    notes: "Pausado até a definição do orçamento do semestre.",
    archived: false,
    ...stamp,
  },
  {
    id: "p5",
    workspace: "trabalho",
    code: "PRJ-000",
    name: "Onboarding de estagiários",
    status: "concluido",
    health: 0,
    startDate: addMonths(T, -6),
    dueDate: addMonths(T, -1),
    stoppedDate: null,
    gains: 12000,
    fte: 0.1,
    notes: "",
    archived: true,
    ...stamp,
  },
  {
    id: "p6",
    workspace: "pessoal",
    code: "CASA-01",
    name: "Reforma do apartamento",
    status: "andamento",
    health: 1,
    startDate: addMonths(T, -1),
    dueDate: addMonths(T, 2),
    stoppedDate: null,
    gains: null,
    fte: null,
    notes: "Orçamento fechado com o pedreiro; falta escolher o piso.",
    archived: false,
    ...stamp,
  },
  {
    id: "p7",
    workspace: "pessoal",
    code: "EST-01",
    name: "Curso de inglês",
    status: "andamento",
    health: 0,
    startDate: addMonths(T, -2),
    dueDate: addMonths(T, 6),
    stoppedDate: null,
    gains: null,
    fte: null,
    notes: "Meta: terminar o módulo B2 até dezembro.",
    archived: false,
    ...stamp,
  },
];

let order = 0;
const task = (
  id: string,
  projectId: string,
  parentId: string | null,
  title: string,
  done: boolean,
  dueDate: string | null
): Task => ({
  id,
  projectId,
  parentId,
  title,
  done,
  dueDate,
  sortOrder: order++,
  ...stamp,
});

export const mockTasks: Task[] = [
  // PRJ-001 — cascata com 3 níveis
  task("t1", "p1", null, "Levantar requisitos", true, addDays(T, -20)),
  task("t2", "p1", "t1", "Entrevistar áreas usuárias", true, addDays(T, -25)),
  task("t3", "p1", "t1", "Documentar processos atuais", true, addDays(T, -21)),
  task("t4", "p1", null, "Configurar novo CRM", false, addDays(T, 5)),
  task("t5", "p1", "t4", "Criar campos personalizados", true, addDays(T, -2)),
  task("t6", "p1", "t4", "Importar base de clientes", false, T),
  task("t7", "p1", "t6", "Limpar duplicados na planilha", false, addDays(T, -1)),
  task("t8", "p1", "t6", "Rodar importação de teste", false, addDays(T, 2)),
  task("t9", "p1", null, "Treinar usuários", false, addDays(T, 15)),
  // PRJ-002
  task("t10", "p2", null, "Mapear relatórios manuais", true, addDays(T, -10)),
  task("t11", "p2", null, "Construir painel automático", false, addDays(T, 3)),
  task("t12", "p2", "t11", "Conectar fonte de dados", false, T),
  task("t13", "p2", "t11", "Validar números com o financeiro", false, addDays(T, 6)),
  // PRJ-003
  task("t14", "p3", null, "Redigir minuta da política", true, addDays(T, -15)),
  task("t15", "p3", null, "Aprovação do jurídico", false, addDays(T, -3)),
  task("t16", "p3", null, "Publicar e comunicar", false, addDays(T, 30)),
  // PRJ-004
  task("t17", "p4", null, "Definir trilha de conteúdo", true, addDays(T, -30)),
  task("t18", "p4", null, "Contratar instrutor", false, null),
  // pessoal — CASA-01
  task("t19", "p6", null, "Escolher piso da sala", false, addDays(T, 1)),
  task("t20", "p6", null, "Comprar tinta", false, T),
  task("t21", "p6", null, "Demolição da parede da cozinha", true, addDays(T, -7)),
  // pessoal — EST-01
  task("t22", "p7", null, "Terminar unidade 4", false, addDays(T, 4)),
  task("t23", "p7", null, "Agendar prova de nivelamento", false, addDays(T, -2)),
];

export const mockPriorities: Priority[] = [
  { id: "pr1", workspace: "trabalho", title: "Fechar plano de importação do CRM", done: false, date: T },
  { id: "pr2", workspace: "trabalho", title: "Cobrar jurídico sobre a política", done: true, date: T },
  { id: "pr3", workspace: "pessoal", title: "Decidir piso da sala", done: false, date: T },
];

export const mockQuickWins: QuickWin[] = [
  { id: "q1", workspace: "trabalho", projectId: null, title: "Responder e-mail da diretoria", done: false, date: T },
  { id: "q2", workspace: "trabalho", projectId: null, title: "Agendar 1:1 com a equipe", done: true, date: T },
  { id: "q3", workspace: "trabalho", projectId: "p1", title: "Pedir acesso de admin no CRM", done: false, date: null },
  { id: "q4", workspace: "trabalho", projectId: "p2", title: "Listar relatórios duplicados", done: true, date: null },
  { id: "q5", workspace: "pessoal", projectId: null, title: "Marcar dentista", done: false, date: T },
];

export const mockFollowups: Followup[] = [
  {
    id: "f1",
    workspace: "trabalho",
    projectId: "p3",
    who: "Jurídico",
    what: "Parecer sobre a minuta da política",
    sinceDate: addDays(T, -9),
    dueDate: addDays(T, -2),
    done: false,
  },
  {
    id: "f2",
    workspace: "trabalho",
    projectId: "p1",
    who: "TI / Infra",
    what: "Liberação do ambiente de homologação",
    sinceDate: addDays(T, -4),
    dueDate: addDays(T, 3),
    done: false,
  },
  {
    id: "f3",
    workspace: "pessoal",
    projectId: "p6",
    who: "Marceneiro",
    what: "Orçamento dos armários",
    sinceDate: addDays(T, -6),
    dueDate: addDays(T, -1),
    done: false,
  },
];

export const mockGoals: MonthlyGoal[] = [
  {
    id: "g1",
    workspace: "trabalho",
    month: monthStart(T),
    goal: "Concluir a fase 1 da migração do CRM",
    how: "Garantir a importação da base até o dia 20 e treinar 2 usuários-chave.",
  },
  {
    id: "g2",
    workspace: "pessoal",
    month: monthStart(T),
    goal: "Destravar a reforma",
    how: "Fechar piso e armários até o fim do mês.",
  },
];
