import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
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

/** Tabela no desktop e lista de cartões no celular, com paginação simples. */
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

  // Quando as colunas não cabem, a borda do lado que ainda tem conteúdo esmaece: mostra que dá para rolar.
  const envoltorio = useRef<HTMLDivElement>(null);
  const [rola, setRola] = useState({ esquerda: false, direita: false });
  const temItens = itens.length > 0;
  useEffect(() => {
    const el = envoltorio.current;
    if (!el) return;
    const medir = () => {
      const esquerda = el.scrollLeft > 4;
      const direita = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
      setRola((r) => (r.esquerda === esquerda && r.direita === direita ? r : { esquerda, direita }));
    };
    medir();
    el.addEventListener('scroll', medir, { passive: true });
    const observador = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(medir);
    observador?.observe(el);
    if (el.firstElementChild) observador?.observe(el.firstElementChild);
    return () => {
      el.removeEventListener('scroll', medir);
      observador?.disconnect();
    };
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
      className={styles.envoltorio}
      data-rola-esquerda={rola.esquerda || undefined}
      data-rola-direita={rola.direita || undefined}
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
                      i > 0 && !(c.chave in totais.valores) && styles.ocultarMobile,
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
