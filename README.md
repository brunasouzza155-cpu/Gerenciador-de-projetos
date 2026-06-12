# Painel da Bruna

Web app de gerenciamento de projetos pessoais, em uma única tela, com duas
áreas separadas (**Trabalho** e **Pessoal**) e visual de planner impresso.

## Em que etapa estamos

- ✅ **Etapa 1–2:** interface completa com dados de exemplo (mock), para validar o visual
- ⬜ Etapa 3: conectar o Supabase (banco de dados de verdade)
- ⬜ Etapa 4: login com e-mail e senha
- ⬜ Etapa 5: publicar na Vercel

> Por enquanto **nada é salvo de verdade**: ao recarregar a página, tudo volta
> aos dados de exemplo. Isso é proposital — primeiro validamos o visual.

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
