import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Botao, ConfirmarAcao, Modal, ProvedorAvisos, ProvedorInterface, Tabela, useAvisos } from './index';

const refinada = ({ children }: { children: ReactNode }) => (
  <ProvedorInterface refinada>{children}</ProvedorInterface>
);

describe('Interface refinada: modais', () => {
  it('Esc fecha só a confirmação de cima, não o modal de baixo', async () => {
    const fecharModal = vi.fn();
    function Tela() {
      const [confirmar, setConfirmar] = useState(true);
      return (
        <Modal aberto titulo="Proposta" aoFechar={fecharModal}>
          <Entrada />
          <ConfirmarAcao
            aberto={confirmar}
            titulo="Excluir?"
            mensagem="Não dá para desfazer."
            perigo
            aoConfirmar={() => undefined}
            aoCancelar={() => setConfirmar(false)}
          />
        </Modal>
      );
    }
    render(<Tela />, { wrapper: refinada });
    expect(screen.getByRole('alertdialog', { name: 'Excluir?' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(fecharModal).not.toHaveBeenCalled();
  });

  it('confirmação destrutiva começa com o foco em Cancelar', () => {
    render(
      <ConfirmarAcao
        aberto
        titulo="Excluir apólice?"
        mensagem="Sai da carteira."
        perigo
        aoConfirmar={() => undefined}
        aoCancelar={() => undefined}
      />,
      { wrapper: refinada },
    );
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
    expect(screen.getByRole('alertdialog')).toHaveAccessibleDescription('Sai da carteira.');
  });

  it('com alterações, fechar pede para descartar', async () => {
    const fechar = vi.fn();
    render(
      <Modal aberto alterado titulo="Novo cliente" aoFechar={fechar}>
        <Entrada />
      </Modal>,
      { wrapper: refinada },
    );
    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(fechar).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Descartar' }));
    expect(fechar).toHaveBeenCalledTimes(1);
  });

  it('sem a interface refinada, fecha direto como antes', async () => {
    const fechar = vi.fn();
    render(
      <Modal aberto alterado titulo="Novo cliente" aoFechar={fechar}>
        <Entrada />
      </Modal>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(fechar).toHaveBeenCalledTimes(1);
  });
});

describe('Interface refinada: tabela', () => {
  const itens = [
    { id: 'a', nome: 'Beatriz', premio: 300 },
    { id: 'b', nome: 'Ana', premio: 100 },
  ];
  type Item = (typeof itens)[number];

  it('botão dentro da linha não abre a linha; coluna ordena; mostra totais', async () => {
    const abrir = vi.fn();
    const pagar = vi.fn();
    render(
      <Tabela<Item>
        rotulo="Itens"
        itens={itens}
        chave={(i) => i.id}
        aoClicar={abrir}
        totais={{ rotulo: 'Total', valores: { premio: '400' } }}
        colunas={[
          {
            chave: 'nome',
            titulo: 'Nome',
            render: (i) => i.nome,
            ordenar: (a, b) => a.nome.localeCompare(b.nome),
          },
          { chave: 'premio', titulo: 'Prêmio', render: (i) => i.premio },
          {
            chave: 'acao',
            titulo: 'Ações',
            render: (i) => <Botao onClick={() => pagar(i.id)}>{`Pagar ${i.nome}`}</Botao>,
          },
        ]}
      />,
      { wrapper: refinada },
    );
    await userEvent.click(screen.getByRole('button', { name: 'Pagar Ana' }));
    expect(pagar).toHaveBeenCalledWith('b');
    expect(abrir).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /Nome/ }));
    const linhas = screen.getAllByRole('row');
    expect(linhas[1]).toHaveTextContent('Ana');
    expect(screen.getByRole('columnheader', { name: /Nome/ })).toHaveAttribute('aria-sort', 'ascending');
    expect(linhas[linhas.length - 1]).toHaveTextContent('Total400');
  });
});

describe('Interface refinada: avisos', () => {
  it('erro fica até ser dispensado', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    function Tela() {
      const { avisar } = useAvisos();
      return <Botao onClick={() => avisar('Falhou.', 'erro')}>Testar</Botao>;
    }
    render(
      <ProvedorInterface refinada>
        <ProvedorAvisos duracao={100}>
          <Tela />
        </ProvedorAvisos>
      </ProvedorInterface>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Testar' }));
    vi.advanceTimersByTime(500);
    expect(screen.getByRole('alert')).toHaveTextContent('Falhou.');
    vi.useRealTimers();
  });
});

function Entrada() {
  return <input aria-label="Campo" />;
}
