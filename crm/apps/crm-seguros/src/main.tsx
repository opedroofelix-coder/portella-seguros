import '@portella/ui/styles.css';
import './presentation/seguros.css';
import { apagarBanco, BarraDemo, limparDemoSePedido, prepararDemo, recomecarDemo } from '@portella/app-base';
import type { ReactNode } from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { criarImportacao } from './application/importacao';
import type { ServicosSeguros } from './application/servicos';
import { arquivoDemoSeguros, PRODUTOS_DEMO, SEGURADORAS_DEMO } from './demo/dados';
import { criarServicos, NOME_BANCO } from './infrastructure/container';
import { App } from './presentation/App';

const raiz = createRoot(document.getElementById('raiz')!);
const demo = import.meta.env.VITE_DEMO === '1';
// Numa subpasta do site (/seguro/) as rotas ficam depois do "#": não depende de regras no servidor.
const subpasta = import.meta.env.BASE_URL !== '/';

/** Na demonstração (build com VITE_DEMO=1): banco separado, dados fictícios e entrada direta. */
async function iniciar(): Promise<{ servicos: ServicosSeguros; extra?: ReactNode }> {
  const banco = `${NOME_BANCO}-demo`;
  if (!demo) {
    // O site já publicou a demonstração em /seguro: apaga do navegador os clientes de teste dela.
    await apagarBanco(banco);
    return { servicos: await criarServicos() };
  }
  raiz.render(<p style={{ padding: 24 }}>Preparando a demonstração…</p>);
  await limparDemoSePedido(banco);
  const servicos = await criarServicos({ nome: banco, memoriaSeFalhar: true });
  const hoje = new Date();
  await prepararDemo(servicos, {
    importacao: criarImportacao(servicos),
    arquivo: arquivoDemoSeguros(hoje),
    hoje,
    produtos: PRODUTOS_DEMO.map((p) => p.nome),
    companhias: SEGURADORAS_DEMO,
  });
  return { servicos, extra: <BarraDemo aoRecomecar={() => recomecarDemo(banco)} /> };
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
        Não foi possível abrir o banco de dados deste navegador. Verifique se o modo privado está desativado.
      </p>,
    );
  });
