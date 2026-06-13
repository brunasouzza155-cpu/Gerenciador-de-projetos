# Painel da Bruna

Web app de gerenciamento de projetos pessoais, em uma única tela, com duas
áreas separadas (**Trabalho** e **Pessoal**) e visual de planner impresso.

## Em que etapa estamos

- ✅ **Etapa 1–2:** interface completa com dados de exemplo (mock) — visual validado
- ✅ **Etapa 3:** código do Supabase pronto (banco de dados de verdade)
- ✅ **Etapa 4:** login com e-mail e senha
- ⬜ Etapa 5: publicar na Vercel

> O app tem dois modos automáticos:
> **modo demonstração** (sem `.env.local`): dados de exemplo, nada é salvo;
> **modo banco de dados** (com `.env.local` preenchido): pede login e salva
> tudo automaticamente no Supabase.

## Como ligar o banco de dados (Supabase)

1. Crie uma conta gratuita em https://supabase.com e um projeto novo
   (escolha a região *South America (São Paulo)*).
2. No painel do projeto, abra **SQL Editor**, cole o conteúdo de
   `supabase/schema.sql` e clique em **Run** — isso cria as tabelas e as
   regras de segurança.
3. Em **Authentication → Users → Add user**, crie seu usuário com seu
   e-mail e uma senha (marque *Auto confirm user*).
4. Em **Settings (engrenagem) → Data API**, copie a **Project URL** e a chave
   **anon public**.
5. Na pasta do projeto, copie `.env.local.example` para `.env.local` e cole
   os dois valores.
6. Rode `npm run dev` de novo — agora o app pede login e salva de verdade.

## Como rodar no seu computador

Você só precisa fazer isso uma vez por máquina:

1. Instale o **Node.js** (versão 18 ou mais nova): https://nodejs.org
   — Node.js é o programa que executa o código do app no seu computador.
2. Baixe este projeto (ou clone do GitHub) e abra um **terminal** na pasta dele.
   — Terminal é a janela de comandos: no Windows, procure "PowerShell";
   no Mac, "Terminal".
3. Rode, uma única vez, o comando que baixa as dependências do projeto:

   ```
   npm install
   ```

4. Para ligar o app, rode:

   ```
   npm run dev
   ```

5. Abra o navegador em **http://localhost:3000** — o painel aparece aí.
   Para desligar, volte ao terminal e aperte `Ctrl + C`.

## Estrutura do projeto (para curiosidade)

- `app/` — as páginas (Next.js App Router)
- `components/` — os blocos visuais (cards de projeto, planner, painéis…)
- `lib/` — tipos de dados, dados de exemplo e a camada que depois vira Supabase
- `supabase/schema.sql` — o SQL do banco, pronto para a etapa 3
