import '@portella/ui/styles.css';
import './presentation/seguros.css';
import { BarraDemo, limparDemoSePedido, prepararDemo, recomecarDemo } from '@portella/app-base';
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

/** Na demonstração (build com VITE_DEMO=1): banco separado, dados fictícios e entrada direta. */
async function iniciar(): Promise<{ servicos: ServicosSeguros; extra?: ReactNode }> {
  if (!demo) return { servicos: await criarServicos() };
  const banco = `${NOME_BANCO}-demo`;
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
