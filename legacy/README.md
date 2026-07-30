# legacy/ — site estático pré-refatoração

Estes são os arquivos originais do projeto (HTML + CSS + JS puro), preservados como
**referência visual e funcional** durante o port para React / Next.js / TypeScript / Tailwind.
Não fazem parte do build do Next.js (`tsconfig.json` e `next.config.ts` excluem esta pasta).

| Arquivo | O que é |
|---|---|
| `index.html` | Landing page — bundle gerado; o source real está JSON-escapado dentro de `<script type="__bundler/template">` |
| `cadastro.html` | Cadastro/login em formato "dc" (`<x-dc>` + `class Component extends DCLogic`), renderizado por `support.js` |
| `support.js` | Runtime "dc" gerado (não editar) |
| `dash/index.html` | Dashboard SPA de arquivo único |
| `assets`, `dash/uploads` | Symlinks para `../public/...` — os arquivos reais foram movidos para `public/` |

## Como abrir para comparar lado a lado

A pasta precisa ser servida por HTTP (as páginas usam `localStorage` entre documentos e
carregam React/Tailwind de CDN):

```bash
python3 -m http.server 8000 --directory legacy
# http://localhost:8000/                  landing
# http://localhost:8000/cadastro.html     cadastro
# http://localhost:8000/dash/             dashboard
```

Os symlinks fazem os assets resolverem a partir de `public/`, então as páginas renderizam
normalmente. O `index.html` é autossuficiente (assets em base64) e funciona de qualquer forma.

Quando o port estiver validado, esta pasta pode ser removida — o histórico do git preserva tudo.
