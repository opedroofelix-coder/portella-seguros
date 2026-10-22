import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import {
  Abas,
  Botao,
  Campo,
  ConfirmarAcao,
  Entrada,
  Estrutura,
  Modal,
  ProvedorAvisos,
  Quadro,
  Tabela,
  useAvisos,
} from './index';

describe('Botao', () => {
  it('dispara clique e bloqueia enquanto carrega', async () => {
    const clique = vi.fn();
    const { rerender } = render(<Botao onClick={clique}>Salvar</Botao>);
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(clique).toHaveBeenCalledTimes(1);
    rerender(
      <Botao onClick={clique} carregando>
        Salvar
      </Botao>,
    );
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
  });

  it('botão só com ícone tem nome acessível', () => {
    render(
      <Botao soIcone icone="fechar">
        Fechar
      </Botao>,
    );
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeInTheDocument();
  });
});

describe('Campo', () => {
  it('liga rótulo, dica e erro ao controle', () => {
    const { rerender } = render(
      <Campo rotulo="E-mail" dica="Use o e-mail da empresa" obrigatorio>
        <Entrada />
      </Campo>,
    );
    const entrada = screen.getByLabelText(/E-mail/);
    expect(entrada).toHaveAccessibleDescription('Use o e-mail da empresa');
    expect(entrada).toHaveAttribute('aria-required', 'true');
    rerender(
      <Campo rotulo="E-mail" erro="E-mail inválido.">
        <Entrada />
      </Campo>,
    );
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('E-mail inválido.');
  });
});

describe('Modal', () => {
  it('abre com foco no primeiro campo, fecha com Esc e devolve o foco', async () => {
    function Exemplo() {
      const [aberto, setAberto] = useState(false);
      return (
        <>
          <Botao onClick={() => setAberto(true)}>Abrir</Botao>
          <Modal aberto={aberto} titulo="Novo cliente" aoFechar={() => setAberto(false)}>
            <Campo rotulo="Nome">
              <Entrada />
            </Campo>
          </Modal>
        </>
      );
    }
    render(<Exemplo />);
    const abrir = screen.getByRole('button', { name: 'Abrir' });
    await userEvent.click(abrir);
    const dialogo = screen.getByRole('dialog', { name: 'Novo cliente' });
    expect(within(dialogo).getByLabelText('Nome')).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(abrir).toHaveFocus();
  });

  it('confirmação chama os callbacks', async () => {
    const ok = vi.fn();
    const cancelar = vi.fn();
    render(
      <ConfirmarAcao
        aberto
        titulo="Remover?"
        mensagem="Tem certeza?"
        textoConfirmar="Remover"
        perigo
        aoConfirmar={ok}
        aoCancelar={cancelar}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Remover' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(ok).toHaveBeenCalled();
    expect(cancelar).toHaveBeenCalled();
  });
});

describe('Tabela', () => {
  const itens = Array.from({ length: 30 }, (_, i) => ({ id: String(i + 1), nome: `Cliente ${i + 1}` }));
  const colunas = [
    { chave: 'nome', titulo: 'Nome', principal: true, render: (x: { id: string; nome: string }) => x.nome },
  ];

  it('pagina, mostra rótulos para o modo cartão e responde a clique e teclado', async () => {
    const clique = vi.fn();
    render(
      <Tabela
        itens={itens}
        colunas={colunas}
        chave={(x) => x.id}
        rotulo="Clientes"
        aoClicar={clique}
        porPagina={10}
      />,
    );
    expect(screen.getAllByRole('row')).toHaveLength(11);
    expect(screen.getByText('Cliente 1').closest('td')).toHaveAttribute('data-rotulo', 'Nome');
    await userEvent.click(screen.getByRole('button', { name: 'Próxima' }));
    expect(screen.getByText('Cliente 11')).toBeInTheDocument();
    expect(screen.getByText('11–20 de 30')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Cliente 12'));
    screen.getByText('Cliente 13').closest('tr')?.focus();
    await userEvent.keyboard('{Enter}');
    expect(clique.mock.calls.map(([x]) => x.id)).toEqual(['12', '13']);
  });

  it('mostra estado vazio', () => {
    render(<Tabela itens={[]} colunas={colunas} chave={(x) => x.id} rotulo="Clientes" />);
    expect(screen.getByText('Nada por aqui ainda')).toBeInTheDocument();
  });
});

describe('Abas', () => {
  it('troca com clique e setas', async () => {
    function Exemplo() {
      const [ativa, setAtiva] = useState<'a' | 'b'>('a');
      return (
        <Abas
          rotulo="Seções"
          ativa={ativa}
          aoTrocar={setAtiva}
          abas={[
            { id: 'a', rotulo: 'Dados' },
            { id: 'b', rotulo: 'Apólices' },
          ]}
        />
      );
    }
    render(<Exemplo />);
    await userEvent.click(screen.getByRole('tab', { name: 'Apólices' }));
    expect(screen.getByRole('tab', { name: 'Apólices' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Dados' })).toHaveFocus();
  });
});

describe('Quadro', () => {
  it('renderiza colunas com contagem', () => {
    render(
      <Quadro
        rotulo="Funil"
        chave={(x: string) => x}
        renderItem={(x) => x}
        colunas={[
          { id: 'novo', titulo: 'Novo', itens: ['A', 'B'] },
          { id: 'ganho', titulo: 'Fechado', itens: [] },
        ]}
      />,
    );
    const novo = screen.getByRole('region', { name: 'Novo' });
    expect(within(novo).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Nenhum item.')).toBeInTheDocument();
  });
});

describe('Avisos', () => {
  it('mostra e dispensa avisos', async () => {
    function Disparo() {
      const { avisar } = useAvisos();
      return <Botao onClick={() => avisar('Cliente salvo.')}>Disparar</Botao>;
    }
    render(
      <ProvedorAvisos>
        <Disparo />
      </ProvedorAvisos>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Disparar' }));
    expect(screen.getByRole('status')).toHaveTextContent('Cliente salvo.');
    await userEvent.click(screen.getByRole('button', { name: 'Dispensar' }));
    expect(screen.queryByText('Cliente salvo.')).not.toBeInTheDocument();
  });
});

describe('Estrutura', () => {
  it('mostra o menu, marca a página ativa e abre o menu no celular', async () => {
    const sair = vi.fn();
    render(
      <MemoryRouter initialEntries={['/clientes']}>
        <Estrutura
          sistema="Seguros"
          logo="/logo.svg"
          usuario={{ nome: 'Ana', perfil: 'Administrador' }}
          aoSair={sair}
          menu={[
            { para: '/', rotulo: 'Painel', icone: 'painel' },
            { para: '/clientes', rotulo: 'Clientes', icone: 'clientes' },
          ]}
        >
          <p>conteúdo</p>
        </Estrutura>
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Clientes' })).toHaveAttribute('aria-current', 'page');
    const abrir = screen.getByRole('button', { name: 'Abrir menu' });
    await userEvent.click(abrir);
    expect(abrir).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Fechar menu' }));
    expect(abrir).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }));
    expect(sair).toHaveBeenCalled();
  });
});

describe('Barras', () => {
  it('mostra rótulo e valor de cada item com largura proporcional', async () => {
    const { Barras } = await import('./index');
    render(
      <Barras
        rotulo="Por seguradora"
        itens={[
          { rotulo: 'Porto Seguro', valor: 10 },
          { rotulo: 'HDI', valor: 5, valorTexto: 'cinco' },
        ]}
      />,
    );
    const lista = screen.getByRole('list', { name: 'Por seguradora' });
    expect(within(lista).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('cinco')).toBeInTheDocument();
    const barras = lista.querySelectorAll<HTMLElement>('[aria-hidden] > div');
    expect([...barras].map((b) => b.style.width)).toEqual(['100%', '50%']);
  });
});
