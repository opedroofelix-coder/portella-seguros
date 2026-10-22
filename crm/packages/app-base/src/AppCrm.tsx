import type { Acao } from '@portella/core';
import { ROTULO_PERFIL } from '@portella/core';
import { Estrutura, ProvedorAvisos } from '@portella/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { BrowserRouter, HashRouter, Outlet, Route, Routes, useNavigate } from 'react-router-dom';
import type { ConfigApp, ItemMenuApp } from './config';
import { ProvedorConfig, useConfig as useConfigInterno } from './config';
import { PaginaCliente, PaginaClientes } from './paginas/Clientes';
import { PaginaConfiguracoes } from './paginas/Configuracoes';
import { PaginaEstornosVales } from './paginas/EstornosVales';
import { PaginaEntrar } from './paginas/Entrar';
import { PaginaFunil } from './paginas/Funil';
import { PaginaImportar } from './paginas/Importar';
import { PaginaMinhaConta } from './paginas/MinhaConta';
import { PaginaProducao } from './paginas/Producao';
import { PaginaPropostas, ROTA_APROVACOES } from './paginas/Propostas';
import { PaginaRelatorios } from './paginas/Relatorios';
import { PaginaUsuarios } from './paginas/Usuarios';
import type { ServicosBase } from './servicos';
import { ProvedorServicos } from './servicos';
import { ExigePermissao, RotaProtegida } from './sessao/Rotas';
import { ProvedorSessao, useSessao, useUsuario } from './sessao/Sessao';
import { usePendentesAprovacao } from './hooks/dados';

export interface RotaApp {
  caminho: string;
  elemento: ReactNode;
  acao?: Acao;
}

/** Rotas comuns aos dois CRMs; o app acrescenta as suas (painel, apólices, cotas…). */
export const ROTA_FUNIL = '/oportunidades';

export const MENU_COMUM = {
  clientes: { para: '/clientes', rotulo: 'Clientes', icone: 'clientes', grupo: 'Principal' },
  propostas: { para: '/propostas', rotulo: 'Propostas', icone: 'documento', grupo: 'Principal' },
  aprovacoes: {
    para: ROTA_APROVACOES,
    rotulo: 'Aprovações',
    icone: 'aprovar',
    grupo: 'Principal',
    acao: 'financeiro:gerenciar',
  },
  producao: { para: '/producao', rotulo: 'Painel de produção', icone: 'tendencia', grupo: 'Relatórios' },
  relatorios: { para: '/relatorios', rotulo: 'Relatórios', icone: 'moeda', grupo: 'Relatórios' },
  estornosVales: {
    para: '/estornos-vales',
    rotulo: 'Estornos e vales',
    icone: 'estorno',
    grupo: 'Relatórios',
  },
  configuracoes: {
    para: '/configuracoes',
    rotulo: 'Configurações',
    icone: 'ajustes',
    grupo: 'Sistema',
    acao: 'financeiro:gerenciar',
  },
  usuarios: {
    para: '/usuarios',
    rotulo: 'Usuários',
    icone: 'usuarios',
    grupo: 'Sistema',
    acao: 'usuarios:gerenciar',
  },
  importar: {
    para: '/importar',
    rotulo: 'Importar',
    icone: 'importar',
    grupo: 'Sistema',
    acao: 'dados:importar',
  },
  conta: { para: '/conta', rotulo: 'Minha conta', icone: 'editar', grupo: 'Sistema' },
} satisfies Record<string, ItemMenuApp>;

export function AppCrm<S extends ServicosBase>({
  config,
  servicos,
  rotas,
  roteador = 'navegador',
  extra,
}: {
  config: ConfigApp;
  servicos: S;
  rotas: RotaApp[];
  /** 'hash' quando o app roda dentro de outra página (demonstração), sem controle das URLs. */
  roteador?: 'navegador' | 'hash';
  /** Conteúdo fixo dentro da sessão e do roteador (ex.: faixa da demonstração). */
  extra?: ReactNode;
}) {
  const Roteador = roteador === 'hash' ? HashRouter : BrowserRouter;
  const [clienteQuery] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: false, refetchOnWindowFocus: false } },
      }),
  );
  return (
    <QueryClientProvider client={clienteQuery}>
      <ProvedorConfig config={config}>
        <ProvedorServicos servicos={servicos}>
          <ProvedorAvisos>
            <Roteador future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <ProvedorSessao>
                <Routes>
                  <Route path="/entrar" element={<PaginaEntrar />} />
                  <Route
                    element={
                      <RotaProtegida>
                        <Layout />
                      </RotaProtegida>
                    }
                  >
                    {rotas.map((r) => (
                      <Route
                        key={r.caminho}
                        path={r.caminho}
                        element={
                          r.acao ? <ExigePermissao acao={r.acao}>{r.elemento}</ExigePermissao> : r.elemento
                        }
                      />
                    ))}
                    <Route path="/clientes" element={<PaginaClientes />} />
                    <Route path="/clientes/:id" element={<PaginaCliente />} />
                    <Route path={ROTA_FUNIL} element={<PaginaFunil />} />
                    <Route path="/producao" element={<PaginaProducao />} />
                    <Route path="/propostas" element={<PaginaPropostas />} />
                    <Route
                      path={ROTA_APROVACOES}
                      element={
                        <ExigePermissao acao="financeiro:gerenciar">
                          <PaginaPropostas somentePendentes />
                        </ExigePermissao>
                      }
                    />
                    <Route path="/relatorios" element={<PaginaRelatorios />} />
                    <Route path="/estornos-vales" element={<PaginaEstornosVales />} />
                    <Route
                      path="/configuracoes"
                      element={
                        <ExigePermissao acao="financeiro:gerenciar">
                          <PaginaConfiguracoes />
                        </ExigePermissao>
                      }
                    />
                    <Route
                      path="/usuarios"
                      element={
                        <ExigePermissao acao="usuarios:gerenciar">
                          <PaginaUsuarios />
                        </ExigePermissao>
                      }
                    />
                    <Route
                      path="/importar"
                      element={
                        <ExigePermissao acao="dados:importar">
                          <PaginaImportar />
                        </ExigePermissao>
                      }
                    />
                    <Route path="/conta" element={<PaginaMinhaConta />} />
                    <Route path="*" element={<p>Página não encontrada.</p>} />
                  </Route>
                </Routes>
                {extra}
              </ProvedorSessao>
            </Roteador>
          </ProvedorAvisos>
        </ProvedorServicos>
      </ProvedorConfig>
    </QueryClientProvider>
  );
}

function Layout() {
  const { sistema, logo, menu } = useConfigMenu();
  const usuario = useUsuario();
  const { sair } = useSessao();
  const navegar = useNavigate();
  return (
    <Estrutura
      sistema={sistema}
      logo={logo}
      menu={menu}
      usuario={{ nome: usuario.nome, perfil: ROTULO_PERFIL[usuario.perfil] }}
      aoSair={async () => {
        // Vai para o login antes de encerrar a sessão, para não guardar a página atual
        // como destino do próximo usuário.
        navegar('/entrar', { replace: true });
        await sair();
      }}
    >
      <Outlet />
    </Estrutura>
  );
}

function useConfigMenu() {
  const config = useConfigInterno();
  const { pode } = useSessao();
  const pendentes = usePendentesAprovacao();
  return {
    ...config,
    menu: config.menu
      .filter((i) => !i.acao || pode(i.acao))
      .map((i) => (i.para === ROTA_APROVACOES ? { ...i, contador: pendentes } : i)),
  };
}
