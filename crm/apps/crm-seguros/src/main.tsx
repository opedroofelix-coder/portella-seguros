import '@portella/ui/styles.css';
import './presentation/seguros.css';
import {
  apagarBanco,
  BarraDemo,
  limparDemoSePedido,
  prepararEquipeDemo,
  recomecarDemo,
} from '@portella/app-base';
import type { ReactNode } from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { ServicosSeguros } from './application/servicos';
import { criarServicos, NOME_BANCO } from './infrastructure/container';
import { App } from './presentation/App';

const raiz = createRoot(document.getElementById('raiz')!);
const demo = import.meta.env.VITE_DEMO === '1';

/** Na demonstração (build com VITE_DEMO=1): banco separado, só a equipe (sem clientes de teste) e entrada direta. */
async function iniciar(): Promise<{ servicos: ServicosSeguros; extra?: ReactNode }> {
  if (!demo) return { servicos: await criarServicos() };
  const banco = `${NOME_BANCO}-demo-equipe`;
  raiz.render(<p style={{ padding: 24 }}>Preparando a demonstração…</p>);
  // O banco da demonstração antiga tinha clientes de teste: sai do navegador de quem já abriu.
  await apagarBanco(`${NOME_BANCO}-demo`);
  await limparDemoSePedido(banco);
  const servicos = await criarServicos({ nome: banco, memoriaSeFalhar: true });
  await prepararEquipeDemo(servicos);
  return { servicos, extra: <BarraDemo ficticios={false} aoRecomecar={() => recomecarDemo(banco)} /> };
}

iniciar()
  .then(({ servicos, extra }) =>
    raiz.render(
      <StrictMode>
        <App servicos={servicos} roteador={demo ? 'hash' : 'navegador'} extra={extra} />
      </StrictMode>,
    ),
  )
  .catch((erro) => {
    console.error(erro);
    raiz.render(
      <p style={{ padding: 24 }}>
        Não foi possível abrir o banco de dados deste navegador. Verifique se o modo privado está desativado.
      </p>,
    );
  });
