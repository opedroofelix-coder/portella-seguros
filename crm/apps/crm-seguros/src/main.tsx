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
import {
  configuracaoSupabase,
  criarServicos,
  criarServicosSupabase,
  NOME_BANCO,
} from './infrastructure/container';
import { App } from './presentation/App';

const raiz = createRoot(document.getElementById('raiz')!);
const demo = import.meta.env.VITE_DEMO === '1';

/** Na demonstração (build com VITE_DEMO=1): banco separado, só a equipe (sem clientes de teste) e entrada direta. */
const supabase = demo ? null : configuracaoSupabase();
// Publicado numa subpasta (/seguro/ no site) sem regra de reescrita na Vercel: as rotas vão no hash.
const subpasta = import.meta.env.BASE_URL !== '/';

async function iniciar(): Promise<{ servicos: ServicosSeguros; extra?: ReactNode }> {
  if (supabase) {
    // /seguro era a demonstração: o banco dela sai do navegador de quem já tinha aberto.
    await Promise.all([apagarBanco(`${NOME_BANCO}-demo-equipe`), apagarBanco(`${NOME_BANCO}-demo`)]);
    return { servicos: criarServicosSupabase(supabase) };
  }
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
        <App servicos={servicos} roteador={demo || subpasta ? 'hash' : 'navegador'} extra={extra} />
      </StrictMode>,
    ),
  )
  .catch((erro) => {
    console.error(erro);
    raiz.render(
      <p style={{ padding: 24 }}>
        {supabase
          ? 'Não foi possível abrir o CRM. Verifique a conexão com a internet e recarregue a página.'
          : 'Não foi possível abrir o banco de dados deste navegador. Verifique se o modo privado está desativado.'}
      </p>,
    );
  });
