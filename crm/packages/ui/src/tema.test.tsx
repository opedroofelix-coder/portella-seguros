import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { CHAVE_TEMA, Estrutura, escolherTema, Indicador, lerTema, SeletorTema } from './index';

afterEach(() => {
  act(() => escolherTema('claro'));
  localStorage.clear();
});

describe('SeletorTema', () => {
  it('começa no claro, aplica data-tema no <html> e lembra a escolha', async () => {
    localStorage.clear();
    expect(lerTema()).toBe('claro');
    render(<SeletorTema />);
    const grupo = screen.getByRole('group', { name: 'Tema' });
    expect(within(grupo).getByRole('button', { name: /Claro/ })).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(within(grupo).getByRole('button', { name: /Escuro/ }));
    expect(document.documentElement.dataset.tema).toBe('escuro');
    expect(localStorage.getItem(CHAVE_TEMA)).toBe('escuro');
    expect(within(grupo).getByRole('button', { name: /Escuro/ })).toHaveAttribute('aria-pressed', 'true');
    expect(within(grupo).getByRole('button', { name: /Claro/ })).toHaveAttribute('aria-pressed', 'false');
  });

  it('Automático remove o data-tema para seguir o aparelho', async () => {
    render(<SeletorTema />);
    await userEvent.click(screen.getByRole('button', { name: /Automático/ }));
    expect(document.documentElement.dataset.tema).toBeUndefined();
    expect(localStorage.getItem(CHAVE_TEMA)).toBe('auto');
  });

  it('dois seletores na tela ficam sincronizados', async () => {
    render(
      <>
        <SeletorTema />
        <SeletorTema variante="menu" />
      </>,
    );
    const [a, b] = screen.getAllByRole('group', { name: 'Tema' });
    await userEvent.click(within(a!).getByRole('button', { name: /Escuro/ }));
    expect(within(b!).getByRole('button', { name: /Escuro/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('valor inválido guardado volta para o claro', () => {
    localStorage.setItem(CHAVE_TEMA, 'roxo');
    expect(lerTema()).toBe('claro');
  });
});

describe('Indicador', () => {
  it('mostra rótulo, valor, detalhe e aplica o tom', () => {
    const { container } = render(
      <Indicador rotulo="Estornos" valor="R$ 10,00" detalhe="no mês" tom="perigo" icone="estorno" />,
    );
    expect(screen.getByText('Estornos')).toBeInTheDocument();
    expect(screen.getByText('R$ 10,00').tagName).toBe('STRONG');
    expect(screen.getByText('no mês')).toBeInTheDocument();
    expect(container.firstElementChild!.className).toMatch(/perigo/);
    expect(container.querySelector('[aria-hidden="true"] svg')).not.toBeNull();
  });

  it('sem tom usa o primário', () => {
    const { container } = render(<Indicador rotulo="Apólices" valor={3} />);
    expect(container.firstElementChild!.className).toMatch(/primaria/);
  });
});

describe('Estrutura (grupos e tema)', () => {
  it('agrupa os itens do menu e mostra o seletor de tema no rodapé', () => {
    render(
      <MemoryRouter>
        <Estrutura
          sistema="Seguros"
          logo="/logo.svg"
          usuario={{ nome: 'Ana Souza', perfil: 'Administrador' }}
          aoSair={() => {}}
          menu={[
            { para: '/', rotulo: 'Painel', icone: 'painel', grupo: 'Principal' },
            { para: '/aprovacoes', rotulo: 'Aprovações', icone: 'aprovar', grupo: 'Principal', contador: 2 },
            { para: '/relatorios', rotulo: 'Relatórios', icone: 'moeda', grupo: 'Relatórios' },
          ]}
        >
          <p>conteúdo</p>
        </Estrutura>
      </MemoryRouter>,
    );
    const menu = screen.getByRole('complementary', { name: 'Menu principal' });
    expect(within(menu).getByText('Principal')).toBeInTheDocument();
    expect(within(menu).getAllByText('Relatórios')).toHaveLength(2); // grupo e item
    expect(within(menu).getByLabelText('2 pendente(s)')).toHaveTextContent('2');
    expect(within(menu).getByText('AS')).toBeInTheDocument();
    expect(within(menu).getByRole('group', { name: 'Tema' })).toBeInTheDocument();
  });
});
