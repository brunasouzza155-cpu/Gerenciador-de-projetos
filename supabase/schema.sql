-- =============================================================
-- PAINEL DA BRUNA — banco de dados (Supabase / Postgres)
-- =============================================================
-- Este arquivo será usado na ETAPA 3 (ainda não precisa rodar).
-- Quando chegar a hora: no painel do Supabase, abra "SQL Editor",
-- cole TODO este conteúdo e clique em "Run".
-- =============================================================

-- Projetos
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  workspace text not null check (workspace in ('trabalho', 'pessoal')),
  code text not null default '',
  name text not null,
  status text not null default 'andamento'
    check (status in ('andamento','desenvolvimento','aguardando','pausado','cancelado','concluido')),
  health smallint not null default 0 check (health between 0 and 2),
  start_date date,
  due_date date,
  stopped_date date,
  gains numeric,
  fte numeric,
  notes text not null default '',
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tarefas (cascata: parent_id aponta para a tarefa-mãe)
create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  project_id uuid not null references projects (id) on delete cascade,
  parent_id uuid references tasks (id) on delete cascade,
  title text not null,
  done boolean not null default false,
  due_date date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Quick wins e demandas do dia (project_id null = demanda solta do dia)
create table quick_wins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  workspace text not null check (workspace in ('trabalho', 'pessoal')),
  project_id uuid references projects (id) on delete cascade,
  title text not null,
  done boolean not null default false,
  date date
);

-- Prioridades do dia (máx. 3 por dia/workspace — controlado pelo app)
create table priorities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  workspace text not null check (workspace in ('trabalho', 'pessoal')),
  title text not null,
  done boolean not null default false,
  date date not null
);

-- Acompanhamentos (follow-ups)
create table followups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  workspace text not null check (workspace in ('trabalho', 'pessoal')),
  project_id uuid references projects (id) on delete set null,
  who text not null,
  what text not null,
  since_date date not null default current_date,
  due_date date,
  done boolean not null default false
);

-- Meta do mês (uma por mês por workspace)
create table monthly_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  workspace text not null check (workspace in ('trabalho', 'pessoal')),
  month date not null,
  goal text not null default '',
  how text not null default '',
  unique (user_id, workspace, month)
);

-- updated_at automático em projects e tasks
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger projects_updated before update on projects
  for each row execute function set_updated_at();
create trigger tasks_updated before update on tasks
  for each row execute function set_updated_at();

-- =============================================================
-- Segurança: Row Level Security (cada linha só visível à dona)
-- =============================================================
alter table projects enable row level security;
alter table tasks enable row level security;
alter table quick_wins enable row level security;
alter table priorities enable row level security;
alter table followups enable row level security;
alter table monthly_goals enable row level security;

create policy "own projects" on projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own tasks" on tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own quick_wins" on quick_wins
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own priorities" on priorities
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own followups" on followups
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own monthly_goals" on monthly_goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
