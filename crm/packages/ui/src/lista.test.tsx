import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Botao, Campo, Entrada, Modal, ProvedorInterface, Selecao } from './index';

const refinada = ({ children }: { children: ReactNode }) => (
  <ProvedorInterface refinada>{children}</ProvedorInterface>
);

function ListaProdutor({ aoMudar }: { aoMudar: (v: string) => void }) {
  const ref = useRef<HTMLSelectElement>(null);
  const [, renderizar] = useState(0);
  return (
    <>
      <Campo rotulo="Produtor">
        <Selecao ref={ref} defaultValue="" onChange={(e) => aoMudar(e.target.value)}>
          <option value="">Todos</option>
          <optgroup label="Equipe">
            <option value="g">Gisele Costa</option>
            <option value="m">Marielly</option>
          </optgroup>
          <option value="x" disabled>
            Inativo
          </option>
        </Selecao>
      </Campo>
      <Botao
        onClick={() => {
          // como o setValue/reset do formulário: muda o valor e a tela renderiza de novo
          if (ref.current) ref.current.value = 'm';
          renderizar((n) => n + 1);
        }}
      >
        Definir por código
      </Botao>
    </>
  );
}

describe('Interface refinada: listas', () => {
  it('a lista abre no painel do app, com os grupos, e escolher muda o valor do <select>', async () => {
    const aoMudar = vi.fn();
    render(<ListaProdutor aoMudar={aoMudar} />, { wrapper: refinada });
    const lista = screen.getByRole('combobox', { name: 'Produtor' });
    expect(lista).toHaveTextContent('Todos');
    await userEvent.click(lista);
    expect(screen.getByRole('listbox')).toHaveTextContent('Equipe');
    expect(screen.getByRole('option', { name: 'Inativo' })).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(screen.getByRole('option', { name: 'Gisele Costa' }));
    expect(aoMudar).toHaveBeenCalledWith('g');
    expect(lista).toHaveTextContent('Gisele Costa');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(lista).toHaveFocus();
  });

  it('teclado: seta abre e anda (pulando a desativada), Enter escolhe, Esc fecha, inicial busca', async () => {
    const aoMudar = vi.fn();
    render(<ListaProdutor aoMudar={aoMudar} />, { wrapper: refinada });
    const lista = screen.getByRole('combobox', { name: 'Produtor' });
    lista.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{Enter}');
    expect(aoMudar).toHaveBeenLastCalledWith('m');
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    await userEvent.keyboard('{ArrowDown}g{Enter}');
    expect(aoMudar).toHaveBeenLastCalledWith('g');
  });

  it('valor mudado por código (reset, setValue) aparece no botão', async () => {
    render(<ListaProdutor aoMudar={() => undefined} />, { wrapper: refinada });
    await userEvent.click(screen.getByRole('button', { name: 'Definir por código' }));
    expect(screen.getByRole('combobox', { name: 'Produtor' })).toHaveTextContent('Marielly');
  });

  it('sem a interface refinada continua o <select> do navegador', () => {
    render(<ListaProdutor aoMudar={() => undefined} />);
    expect(screen.getByRole('combobox', { name: 'Produtor' }).tagName).toBe('SELECT');
  });

  it('sugestões (<datalist>) abrem no painel, filtradas pelo texto, e escolher preenche o campo', async () => {
    function Tela() {
      const [valor, setValor] = useState('');
      return (
        <>
          <Campo rotulo="Seguradora">
            <Entrada list="seg" value={valor} onChange={(e) => setValor(e.target.value)} />
          </Campo>
          <datalist id="seg">
            <option value="Porto Seguro" />
            <option value="Allianz" />
            <option value="Azul" />
          </datalist>
          <output>{valor}</output>
        </>
      );
    }
    render(<Tela />, { wrapper: refinada });
    const campo = screen.getByRole('combobox', { name: 'Seguradora' });
    expect(campo).not.toHaveAttribute('list');
    await userEvent.type(campo, 'a');
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Allianz', 'Azul']);
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(campo).toHaveValue('Azul');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('Esc com a lista aberta dentro da janela fecha só a lista', async () => {
    const fechar = vi.fn();
    render(
      <Modal aberto titulo="Nova proposta" aoFechar={fechar}>
        <Campo rotulo="Seguradora">
          <Selecao defaultValue="">
            <option value="">Escolha…</option>
            <option value="p">Porto Seguro</option>
          </Selecao>
        </Campo>
      </Modal>,
      { wrapper: refinada },
    );
    await userEvent.click(screen.getByRole('combobox', { name: 'Seguradora' }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(fechar).not.toHaveBeenCalled();
    await userEvent.keyboard('{Escape}');
    expect(fechar).toHaveBeenCalled();
  });
});
