import type { Acao } from '@portella/core';
import { ROTULO_PERFIL } from '@portella/core';
import { Estrutura, ProvedorAvisos } from '@portella/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { BrowserRouter, Outlet, Route, Routes, useNavigate } from 'react-router-dom';
import type { ConfigApp, ItemMenuApp } from './config';
import { ProvedorConfig, useConfig as useConfigInterno } from './config';
import { PaginaCliente, PaginaClientes } from './paginas/Clientes';
import { PaginaComissoes } from './paginas/Comissoes';
import { PaginaEntrar } from './paginas/Entrar';
import { PaginaFunil } from './paginas/Funil';
import { PaginaImportar } from './paginas/Importar';
import { PaginaMinhaConta } from './paginas/MinhaConta';
import { PaginaUsuarios } from './paginas/Usuarios';
import type { ServicosBase } from './servicos';
import { ProvedorServicos } from './servicos';
import { ExigePermissao, RotaProtegida } from './sessao/Rotas';
import { ProvedorSessao, useSessao, useUsuario } from './sessao/Sessao';

export interface RotaApp {
  caminho: string;
  elemento: ReactNode;
  acao?: Acao;
}

/** Rotas comuns aos dois CRMs; o app acrescenta as suas (painel, apólices, cotas…). */
export const ROTA_FUNIL = '/oportunidades';

export const MENU_COMUM = {
  clientes: { para: '/clientes', rotulo: 'Clientes', icone: 'clientes' },
  comissoes: { para: '/comissoes', rotulo: 'Comissões', icone: 'moeda' },
  usuarios: { para: '/usuarios', rotulo: 'Usuários', icone: 'usuarios', acao: 'usuarios:gerenciar' },
  importar: { para: '/importar', rotulo: 'Importar', icone: 'importar', acao: 'dados:importar' },
  conta: { para: '/conta', rotulo: 'Minha conta', icone: 'editar' },
} satisfies Record<string, ItemMenuApp>;

export function AppCrm<S extends ServicosBase>({
  config,
  servicos,
  rotas,
}: {
  config: ConfigApp;
  servicos: S;
  rotas: RotaApp[];
}) {
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
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
                    <Route path="/comissoes" element={<PaginaComissoes />} />
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
              </ProvedorSessao>
            </BrowserRouter>
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
  return { ...config, menu: config.menu.filter((i) => !i.acao || pode(i.acao)) };
}
