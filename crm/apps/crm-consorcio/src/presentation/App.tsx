import type { ReactNode } from 'react';
import type { ConfigApp, RotaApp } from '@portella/app-base';
import { AppCrm, MENU_COMUM, PRODUTORES_INICIAIS, ROTA_FUNIL } from '@portella/app-base';
import { criarImportacao } from '../application/importacao';
import type { ServicosConsorcio } from '../application/servicos';
import { TIPOS_BEM } from '../domain/cota';
import { CotasDoCliente } from './componentes/CotasDoCliente';
import { PaginaCotas } from './paginas/Cotas';
import { PaginaLances } from './paginas/Lances';
import { PaginaPainel } from './paginas/Painel';

const rotas: RotaApp[] = [
  { caminho: '/', elemento: <PaginaPainel /> },
  { caminho: '/cotas', elemento: <PaginaCotas /> },
  { caminho: '/lances', elemento: <PaginaLances /> },
];

export function App({
  servicos,
  roteador,
  extra,
}: {
  servicos: ServicosConsorcio;
  roteador?: 'navegador' | 'hash';
  extra?: ReactNode;
}) {
  const config: ConfigApp = {
    sistema: 'Consórcio',
    logo: `${import.meta.env.BASE_URL}logo.svg`,
    nomeFunil: 'Funil de vendas',
    produtos: TIPOS_BEM.map((t) => `Consórcio · ${t.nome}`),
    menu: [
      { para: '/', rotulo: 'Painel', icone: 'painel', grupo: 'Principal' },
      MENU_COMUM.clientes,
      { para: '/cotas', rotulo: 'Cotas', icone: 'documento', grupo: 'Principal' },
      { para: '/lances', rotulo: 'Lances', icone: 'tendencia', grupo: 'Principal' },
      { para: ROTA_FUNIL, rotulo: 'Funil de vendas', icone: 'funil', grupo: 'Principal' },
      MENU_COMUM.propostas,
      MENU_COMUM.aprovacoes,
      MENU_COMUM.producao,
      MENU_COMUM.relatorios,
      MENU_COMUM.estornosVales,
      MENU_COMUM.configuracoes,
      MENU_COMUM.usuarios,
      MENU_COMUM.importar,
      MENU_COMUM.conta,
    ],
    importacao: criarImportacao(servicos),
    produtoresIniciais: PRODUTORES_INICIAIS,
    abasCliente: [
      {
        id: 'cotas',
        rotulo: 'Cotas de consórcio',
        render: (cliente) => <CotasDoCliente cliente={cliente} />,
      },
    ],
  };
  return <AppCrm config={config} servicos={servicos} rotas={rotas} roteador={roteador} extra={extra} />;
}
