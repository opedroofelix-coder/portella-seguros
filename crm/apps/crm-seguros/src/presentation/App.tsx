import type { ReactNode } from 'react';
import type { ConfigApp, RotaApp } from '@portella/app-base';
import { AppCrm, MENU_COMUM, PRODUTORES_INICIAIS, ROTA_FUNIL } from '@portella/app-base';
import { criarImportacao } from '../application/importacao';
import type { ServicosSeguros } from '../application/servicos';
import { RAMOS } from '../domain/catalogo';
import { ApolicesDoCliente } from './componentes/ApolicesDoCliente';
import { CadastrarApolice } from './componentes/CadastrarApolice';
import { PaginaApolices } from './paginas/Apolices';
import { PaginaFinanceiro } from './paginas/Financeiro';
import { PaginaPainel } from './paginas/Painel';
import { PaginaRenovacoes } from './paginas/Renovacoes';

const rotas: RotaApp[] = [
  { caminho: '/', elemento: <PaginaPainel /> },
  { caminho: '/apolices', elemento: <PaginaApolices /> },
  { caminho: '/renovacoes', elemento: <PaginaRenovacoes /> },
  { caminho: '/financeiro', elemento: <PaginaFinanceiro />, acao: 'financeiro:gerenciar' },
];

export function App({
  servicos,
  roteador,
  extra,
}: {
  servicos: ServicosSeguros;
  roteador?: 'navegador' | 'hash';
  extra?: ReactNode;
}) {
  const config: ConfigApp = {
    sistema: 'Seguros',
    interface: 'refinada',
    navegacao: 'topo',
    logo: `${import.meta.env.BASE_URL}logo.svg`,
    marca: {
      icone: `${import.meta.env.BASE_URL}marca-icone.svg`,
      nomeClaro: `${import.meta.env.BASE_URL}marca-nome-marinho.svg`,
      nomeEscuro: `${import.meta.env.BASE_URL}marca-nome-marfim.svg`,
    },
    nomeFunil: 'Cotações',
    produtos: RAMOS.map((r) => r.nome),
    menu: [
      { para: '/', rotulo: 'Painel', icone: 'painel', grupo: 'Principal' },
      MENU_COMUM.clientes,
      { para: '/apolices', rotulo: 'Apólices', icone: 'documento', grupo: 'Principal' },
      { para: '/renovacoes', rotulo: 'Renovações', icone: 'calendario', grupo: 'Principal' },
      { para: ROTA_FUNIL, rotulo: 'Cotações', icone: 'funil', grupo: 'Principal' },
      MENU_COMUM.propostas,
      MENU_COMUM.aprovacoes,
      MENU_COMUM.producao,
      MENU_COMUM.relatorios,
      MENU_COMUM.estornosVales,
      {
        para: '/financeiro',
        rotulo: 'Financeiro',
        icone: 'carteira',
        grupo: 'Relatórios',
        acao: 'financeiro:gerenciar',
      },
      MENU_COMUM.configuracoes,
      MENU_COMUM.usuarios,
      MENU_COMUM.importar,
      MENU_COMUM.conta,
    ],
    propostaPagamento: true,
    notas: true,
    acoesProposta: (proposta) => <CadastrarApolice proposta={proposta} />,
    catalogosExtras: [
      {
        tipo: 'origensLead',
        titulo: 'Origens dos leads',
        descricao:
          'Nas cotações e no cadastro do cliente: por onde o contato chegou (Instagram, Google, indicação…). "Indicação" pede o nome de quem indicou.',
      },
      {
        tipo: 'origensRecebimento',
        titulo: 'Origens de recebimento',
        descricao:
          'No Financeiro, as entradas são escolhidas entre as seguradoras e estas origens: inclua aqui quem mais paga comissão à corretora, como o cliente que paga direto no plano de saúde.',
      },
    ],
    importacao: criarImportacao(servicos),
    produtoresIniciais: PRODUTORES_INICIAIS,
    abasCliente: [
      { id: 'apolices', rotulo: 'Apólices', render: (cliente) => <ApolicesDoCliente cliente={cliente} /> },
    ],
  };
  return <AppCrm config={config} servicos={servicos} rotas={rotas} roteador={roteador} extra={extra} />;
}
