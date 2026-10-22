// Vitrine dos componentes, usada para conferir a responsividade (npm run catalogo e e2e/ui.spec.ts).
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '../src/styles/global.css';
import {
  Abas,
  AreaTexto,
  BarraFiltros,
  Botao,
  CabecalhoPagina,
  Campo,
  Cartao,
  Entrada,
  Estrutura,
  Indicador,
  Modal,
  ProvedorAvisos,
  Quadro,
  Selecao,
  Selo,
  Tabela,
  useAvisos,
} from '../src';

const clientes = Array.from({ length: 8 }, (_, i) => ({
  id: String(i),
  nome: ['Maria Aparecida dos Santos', 'João Pereira', 'Transportes Osasco Ltda.', 'Ana Lima'][i % 4] ?? '',
  telefone: '(11) 93592-5216',
  seguradora: ['Porto Seguro', 'Tokio Marine', 'Bradesco Seguros', 'Allianz'][i % 4] ?? '',
  vigencia: '22/10/2027',
  premio: 'R$ 3.456,78',
}));

function Pagina() {
  const [modal, setModal] = useState(false);
  const [aba, setAba] = useState<'dados' | 'apolices'>('dados');
  const { avisar } = useAvisos();
  return (
    <Estrutura
      sistema="Seguros"
      logo="/logo.svg"
      usuario={{ nome: 'Administradora Portella', perfil: 'Administrador' }}
      aoSair={() => avisar('Saiu.')}
      menu={[
        { para: '/', rotulo: 'Painel', icone: 'painel' },
        { para: '/clientes', rotulo: 'Clientes', icone: 'clientes' },
        { para: '/apolices', rotulo: 'Apólices', icone: 'documento' },
        { para: '/renovacoes', rotulo: 'Renovações', icone: 'calendario' },
        { para: '/cotacoes', rotulo: 'Cotações', icone: 'funil' },
        { para: '/usuarios', rotulo: 'Usuários', icone: 'usuarios' },
      ]}
    >
      <CabecalhoPagina
        titulo={
          <>
            Catálogo de <em>componentes</em>
          </>
        }
        descricao="Todos os componentes do CRM numa página."
        acoes={
          <>
            <Botao variante="secundario" icone="importar">
              Importar
            </Botao>
            <Botao icone="mais" onClick={() => setModal(true)}>
              Novo cliente
            </Botao>
          </>
        }
      />
      <div className="grade">
        <div className="grade-4">
          <Indicador rotulo="Apólices vigentes" valor="1.248" detalhe="+12 este mês" />
          <Indicador rotulo="Renovações em 30 dias" valor="37" />
          <Indicador rotulo="Prêmio da carteira" valor="R$ 2.345.678,90" />
          <Indicador rotulo="Comissão prevista" valor="R$ 351.851,83" />
        </div>
        <Cartao titulo="Selos e botões">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            <Selo tom="sucesso">Vigente</Selo>
            <Selo tom="alerta">Vence em 12 dias</Selo>
            <Selo tom="perigo">Vencida</Selo>
            <Selo tom="info">Em contato</Selo>
            <Selo tom="dourado">Renovada</Selo>
            <Selo>Cancelada</Selo>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Botao>Primário</Botao>
            <Botao variante="secundario">Secundário</Botao>
            <Botao variante="fantasma">Fantasma</Botao>
            <Botao variante="perigo">Remover</Botao>
            <Botao carregando>Salvando</Botao>
          </div>
        </Cartao>
        <Cartao titulo="Filtros e formulário">
          <BarraFiltros>
            <Campo rotulo="Buscar">
              <Entrada type="search" placeholder="Nome, CPF ou telefone" />
            </Campo>
            <Campo rotulo="Seguradora">
              <Selecao>
                <option>Todas</option>
              </Selecao>
            </Campo>
            <Campo rotulo="Situação">
              <Selecao>
                <option>Todas</option>
              </Selecao>
            </Campo>
          </BarraFiltros>
          <div className="grade-2">
            <Campo rotulo="Nome" obrigatorio>
              <Entrada defaultValue="Maria Aparecida" />
            </Campo>
            <Campo rotulo="CPF" erro="CPF inválido.">
              <Entrada defaultValue="123.456.789-00" />
            </Campo>
            <Campo rotulo="Observações" dica="Visível para toda a equipe" className="span-todo">
              <AreaTexto />
            </Campo>
          </div>
        </Cartao>
        <Cartao>
          <Abas
            rotulo="Ficha"
            ativa={aba}
            aoTrocar={setAba}
            abas={[
              { id: 'dados', rotulo: 'Dados' },
              { id: 'apolices', rotulo: 'Apólices' },
            ]}
          />
          <Tabela
            rotulo="Clientes"
            itens={clientes}
            chave={(c) => c.id}
            aoClicar={() => avisar('Abrir cliente')}
            colunas={[
              { chave: 'nome', titulo: 'Cliente', principal: true, render: (c) => c.nome },
              { chave: 'tel', titulo: 'Telefone', render: (c) => c.telefone },
              { chave: 'seg', titulo: 'Seguradora', render: (c) => c.seguradora },
              { chave: 'vig', titulo: 'Fim da vigência', render: (c) => c.vigencia, ocultarNoMobile: true },
              { chave: 'premio', titulo: 'Prêmio', render: (c) => c.premio, alinharDireita: true },
            ]}
          />
        </Cartao>
        <Quadro
          rotulo="Funil"
          chave={(x: string) => x}
          renderItem={(x) => <Cartao>{x}</Cartao>}
          colunas={[
            { id: 'novo', titulo: 'Novo', itens: ['Seguro auto — Carlos'] },
            { id: 'contato', titulo: 'Em contato', itens: ['Vida — Fernanda', 'Residencial — Paulo'] },
            { id: 'proposta', titulo: 'Proposta enviada', itens: [] },
            { id: 'ganho', titulo: 'Fechado', itens: ['Empresarial — Padaria'] },
            { id: 'perdido', titulo: 'Perdido', itens: [] },
          ]}
        />
      </div>
      <Modal
        aberto={modal}
        titulo="Novo cliente"
        aoFechar={() => setModal(false)}
        rodape={
          <>
            <Botao variante="secundario" onClick={() => setModal(false)}>
              Cancelar
            </Botao>
            <Botao>Salvar</Botao>
          </>
        }
      >
        <div className="grade-2">
          <Campo rotulo="Nome" obrigatorio>
            <Entrada />
          </Campo>
          <Campo rotulo="Telefone">
            <Entrada />
          </Campo>
        </div>
      </Modal>
    </Estrutura>
  );
}

createRoot(document.getElementById('raiz')!).render(
  <StrictMode>
    <MemoryRouter>
      <ProvedorAvisos>
        <Pagina />
      </ProvedorAvisos>
    </MemoryRouter>
  </StrictMode>,
);
