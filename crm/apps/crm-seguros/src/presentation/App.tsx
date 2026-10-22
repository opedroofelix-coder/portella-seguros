import type { ConfigApp, RotaApp } from '@portella/app-base';
import { AppCrm, MENU_COMUM, ROTA_FUNIL } from '@portella/app-base';
import { criarImportacao } from '../application/importacao';
import type { ServicosSeguros } from '../application/servicos';
import { RAMOS } from '../domain/catalogo';
import { ApolicesDoCliente } from './componentes/ApolicesDoCliente';
import { PaginaApolices } from './paginas/Apolices';
import { PaginaPainel } from './paginas/Painel';
import { PaginaRenovacoes } from './paginas/Renovacoes';

const rotas: RotaApp[] = [
  { caminho: '/', elemento: <PaginaPainel /> },
  { caminho: '/apolices', elemento: <PaginaApolices /> },
  { caminho: '/renovacoes', elemento: <PaginaRenovacoes /> },
];

export function App({ servicos }: { servicos: ServicosSeguros }) {
  const config: ConfigApp = {
    sistema: 'Seguros',
    logo: '/logo.svg',
    nomeFunil: 'Cotações',
    produtos: RAMOS.map((r) => r.nome),
    menu: [
      { para: '/', rotulo: 'Painel', icone: 'painel' },
      MENU_COMUM.clientes,
      { para: '/apolices', rotulo: 'Apólices', icone: 'documento' },
      { para: '/renovacoes', rotulo: 'Renovações', icone: 'calendario' },
      { para: ROTA_FUNIL, rotulo: 'Cotações', icone: 'funil' },
      MENU_COMUM.usuarios,
      MENU_COMUM.importar,
      MENU_COMUM.conta,
    ],
    importacao: criarImportacao(servicos),
    abasCliente: [
      { id: 'apolices', rotulo: 'Apólices', render: (cliente) => <ApolicesDoCliente cliente={cliente} /> },
    ],
  };
  return <AppCrm config={config} servicos={servicos} rotas={rotas} />;
}
