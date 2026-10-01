# aperIA — front-end

Interface do aperIA, uma plataforma de *Application Security Posture
Management*. Consome a API em [`python-api`](https://github.com/aperIA-org/python-api),
que roda o pipeline de análise.

São três superfícies num mesmo projeto: a **landing** de apresentação do
produto, o fluxo de **cadastro e login**, e o **dashboard** — onde o usuário
conecta o GitHub, acompanha os scans e lê os relatórios.

---

## Stack

Next.js 15 (App Router) · React 19 · TypeScript strict · Tailwind CSS v4
(configuração em CSS, sem `tailwind.config.js`) · fontes via `next/font`

---

## Arquitetura

### Dois sistemas visuais

Não é um tema com variações — são duas linguagens distintas que convivem:

| | Onde | Comportamento |
|---|---|---|
| **paper** | landing e auth | sempre claro; tokens com valores fixos |
| **dash** | dashboard | **escuro por padrão**, com o claro como override em `[data-theme="light"]` |

Como o dashboard nasce escuro, o projeto registra uma variante `light:` no
Tailwind — e não a `dark:` convencional. Os componentes do dash não declaram
variante nenhuma: a troca do atributo no `<html>` faz o trabalho.

### Autenticação por BFF

As telas não falam com a API Python diretamente. Elas chamam
`/api/auth/*` — route handlers do próprio Next — que então chamam o back-end
pelo servidor. Duas razões, ambas estruturais:

1. **A API não registra CORS.** Uma chamada do navegador seria bloqueada.
2. **O login devolve os tokens no corpo da resposta.** O BFF os converte em
   cookies `httpOnly`, fora do alcance de qualquer JavaScript — o que
   `localStorage` não ofereceria.

O access token vive 15 minutos e o refresh, 7 dias. Um middleware em
`src/middleware.ts` troca o par **antes** da página renderizar, quando o token
está expirado ou perto disso. Server Components não podem escrever cookies no
Next; middleware pode, e roda antes — por isso a renovação é invisível.

### Organização

```
src/app/            rotas (App Router): landing, auth, /dash/*, /api/auth/*
src/components/     landing/, auth/, dash/
src/lib/api/        server-only — fala com a API Python
src/lib/dash/       tipos, formatadores, filtros, rotas entre telas
src/middleware.ts   renovação silenciosa da sessão
```

A separação em `src/lib/api/` importa: esses módulos são `server-only` e
carregam o token do cookie. Importá-los de um componente cliente é erro de
build, não bug em produção.

---

## Rodar local

```bash
npm install
npm run dev          # http://localhost:3000

npm run typecheck
npm run lint
npm run build
```

`APERIA_API_URL` aponta para a API (ver `.env.example`). **Sem ela o app roda
em modo demonstração**, com um conjunto de dados sintético — útil para navegar
a interface sem subir o back-end. As telas que mostram dado real exibem um selo
quando estão em demonstração, para a origem do dado nunca ficar ambígua.

---

## Licença

[GNU General Public License v3.0](LICENSE) ou posterior.

Copyleft: trabalhos derivados precisam ser distribuídos sob a mesma licença,
com o código-fonte disponível.
