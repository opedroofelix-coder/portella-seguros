import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Botao } from './Botao';
import { EstadoVazio } from './Cartao';
import { useInterface } from './Interface';
import styles from './Tabela.module.css';

export interface Coluna<T> {
  chave: string;
  titulo: string;
  render: (item: T) => ReactNode;
  /** Coluna destacada como título do cartão no celular. */
  principal?: boolean;
  ocultarNoMobile?: boolean;
  alinharDireita?: boolean;
  /** Torna a coluna ordenável (clique no título). */
  ordenar?: (a: T, b: T) => number;
}

export interface TabelaProps<T> {
  itens: T[];
  colunas: Coluna<T>[];
  chave: (item: T) => string;
  rotulo: string;
  aoClicar?: (item: T) => void;
  porPagina?: number;
  vazio?: ReactNode;
  /** Linha de totais no fim da tabela: um valor por coluna (chave da coluna → conteúdo). */
  totais?: { rotulo: string; valores: Record<string, ReactNode> };
  /** Ordenação inicial pela coluna ordenável com esta chave. */
  ordemInicial?: { chave: string; direcao: 'asc' | 'desc' };
}

const INTERATIVOS = 'a, button, input, select, textarea, label, [role="button"]';
const telaEstreita = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(max-width: 899px)').matches === true;

/** Tabela no desktop e lista de cartões no celular (ou quando não cabe), com paginação simples. */
export function Tabela<T>({
  itens,
  colunas,
  chave,
  rotulo,
  aoClicar,
  porPagina = 25,
  vazio,
  totais,
  ordemInicial,
}: TabelaProps<T>) {
  const { refinada } = useInterface();
  const [pagina, setPagina] = useState(0);
  const [ordem, setOrdem] = useState(ordemInicial ?? null);
  const totalPaginas = Math.max(1, Math.ceil(itens.length / porPagina));

  useEffect(() => {
    if (pagina > totalPaginas - 1) setPagina(totalPaginas - 1);
  }, [pagina, totalPaginas]);
  // Com a interface refinada, uma lista nova (filtro, busca) volta para a primeira página.
  useEffect(() => {
    if (refinada) setPagina(0);
  }, [itens, refinada]);

  // Tabela no computador; cartões no celular e também quando as colunas não cabem na largura
  // disponível (notebook com menu lateral, quadro estreito): nada fica cortado nem escondido à direita.
  const envoltorio = useRef<HTMLDivElement>(null);
  const [cartoes, setCartoes] = useState(telaEstreita);
  const precisa = useRef(0);
  const [versao, medir] = useState(0);
  const temItens = itens.length > 0;
  // Lista nova (filtro, busca): as colunas podem caber de novo, então tenta a tabela outra vez.
  useLayoutEffect(() => {
    if (!telaEstreita()) precisa.current = 0;
  }, [itens]);
  useLayoutEffect(() => {
    const el = envoltorio.current;
    if (!el) return;
    if (telaEstreita()) {
      if (!cartoes) setCartoes(true);
    } else if (!cartoes) {
      if (el.scrollWidth > el.clientWidth + 1) {
        precisa.current = el.scrollWidth;
        setCartoes(true);
      }
    } else if (el.clientWidth >= precisa.current) {
      setCartoes(false);
    }
  }, [cartoes, versao, itens, pagina]);
  // Mudou a largura da tela, do quadro ou das colunas (fonte carregada, outra página): mede de novo.
  useEffect(() => {
    const el = envoltorio.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observador = new ResizeObserver(() => medir((n) => n + 1));
    observador.observe(el);
    if (el.firstElementChild) observador.observe(el.firstElementChild);
    return () => observador.disconnect();
  }, [temItens]);

  const ordenados = useMemo(() => {
    if (!ordem) return itens;
    const coluna = colunas.find((c) => c.chave === ordem.chave);
    if (!coluna?.ordenar) return itens;
    const sinal = ordem.direcao === 'asc' ? 1 : -1;
    return [...itens].sort((a, b) => sinal * coluna.ordenar!(a, b));
  }, [itens, colunas, ordem]);

  if (!itens.length) return <>{vazio ?? <EstadoVazio titulo="Nada por aqui ainda" />}</>;

  const visiveis = ordenados.slice(pagina * porPagina, (pagina + 1) * porPagina);
  // Clique ou tecla num botão/link dentro da linha é do botão, não abre a linha.
  const deDentro = (e: KeyboardEvent | MouseEvent) =>
    refinada && e.target !== e.currentTarget && (e.target as HTMLElement).closest(INTERATIVOS) != null;
  const teclado = (e: KeyboardEvent, item: T) => {
    if (deDentro(e)) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      aoClicar?.(item);
    }
  };

  return (
    <div
      ref={envoltorio}
      className={`${styles.envoltorio} ${cartoes ? styles.cartoes : ''}`}
      data-cartoes={cartoes || undefined}
    >
      <table className={styles.tabela} aria-label={rotulo}>
        <thead>
          <tr>
            {colunas.map((c) => {
              const ativa = ordem?.chave === c.chave;
              return (
                <th
                  key={c.chave}
                  scope="col"
                  className={c.alinharDireita ? styles.direita : undefined}
                  aria-sort={
                    c.ordenar
                      ? ativa
                        ? ordem.direcao === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                      : undefined
                  }
                >
                  {c.ordenar ? (
                    <button
                      type="button"
                      className={styles.ordenar}
                      onClick={() => {
                        setOrdem({
                          chave: c.chave,
                          direcao: ativa && ordem.direcao === 'asc' ? 'desc' : 'asc',
                        });
                        setPagina(0);
                      }}
                    >
                      {c.titulo}
                      <span aria-hidden="true">{ativa ? (ordem.direcao === 'asc' ? ' ↑' : ' ↓') : ''}</span>
                    </button>
                  ) : (
                    c.titulo
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {visiveis.map((item) => (
            <tr
              key={chave(item)}
              className={aoClicar ? styles.clicavel : undefined}
              onClick={aoClicar ? (e) => !deDentro(e) && aoClicar(item) : undefined}
              onKeyDown={aoClicar ? (e) => teclado(e, item) : undefined}
              tabIndex={aoClicar ? 0 : undefined}
            >
              {colunas.map((c) => (
                <td
                  key={c.chave}
                  data-rotulo={c.titulo}
                  className={
                    [
                      c.principal && styles.principal,
                      c.ocultarNoMobile && styles.ocultarMobile,
                      c.alinharDireita && styles.direita,
                    ]
                      .filter(Boolean)
                      .join(' ') || undefined
                  }
                >
                  {c.render(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {totais && (
          <tfoot>
            <tr className={styles.totais}>
              {colunas.map((c, i) => (
                <td
                  key={c.chave}
                  data-rotulo={c.titulo}
                  className={
                    [
                      c.alinharDireita && styles.direita,
                      i > 0 && !(c.chave in totais.valores) && styles.semTotal,
                    ]
                      .filter(Boolean)
                      .join(' ') || undefined
                  }
                >
                  {i === 0 ? <strong>{totais.rotulo}</strong> : totais.valores[c.chave]}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
      {totalPaginas > 1 && (
        <nav className={styles.paginacao} aria-label="Paginação">
          <span>
            {pagina * porPagina + 1}–{Math.min(itens.length, (pagina + 1) * porPagina)} de {itens.length}
          </span>
          <div>
            <Botao
              variante="secundario"
              pequeno
              disabled={pagina === 0}
              onClick={() => setPagina((p) => p - 1)}
            >
              Anterior
            </Botao>
            <Botao
              variante="secundario"
              pequeno
              disabled={pagina >= totalPaginas - 1}
              onClick={() => setPagina((p) => p + 1)}
            >
              Próxima
            </Botao>
          </div>
        </nav>
      )}
    </div>
  );
}
