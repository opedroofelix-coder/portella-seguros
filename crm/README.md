# CRM Portella

Dois webapps React (seguros e consórcio) com login e perfis de usuário. A especificação está em [`../docs/CRM.md`](../docs/CRM.md).

```bash
npm install
npm run dev:seguros        # http://localhost:5173
npm run dev:consorcio      # http://localhost:5174
npm run catalogo           # vitrine dos componentes: http://localhost:5180
npm test                   # Vitest
npm run test:e2e           # Playwright: fluxos e responsividade
npm run typecheck && npm run lint
npm run build              # gera apps/*/dist
PLANILHA_SENHA='…' npm run importar --silent -- planilha.xlsx   # gera dados/*.seed.json (fora do Git)
```
