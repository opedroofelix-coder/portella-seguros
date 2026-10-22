import type { KeyboardEvent, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Botao } from './Botao';
import { EstadoVazio } from './Cartao';
import styles from './Tabela.module.css';

export interface Coluna<T> {
  chave: string;
  titulo: string;
  render: (item: T) => ReactNode;
  /** Coluna destacada como título do cartão no celular. */
  principal?: boolean;
  ocultarNoMobile?: boolean;
  alinharDireita?: boolean;
}

export interface TabelaProps<T> {
  itens: T[];
  colunas: Coluna<T>[];
  chave: (item: T) => string;
  rotulo: string;
  aoClicar?: (item: T) => void;
  porPagina?: number;
  vazio?: ReactNode;
}

/** Tabela no desktop e lista de cartões no celular, com paginação simples. */
export function Tabela<T>({ itens, colunas, chave, rotulo, aoClicar, porPagina = 25, vazio }: TabelaProps<T>) {
  const [pagina, setPagina] = useState(0);
  const totalPaginas = Math.max(1, Math.ceil(itens.length / porPagina));

  useEffect(() => {
    if (pagina > totalPaginas - 1) setPagina(totalPaginas - 1);
  }, [pagina, totalPaginas]);

  if (!itens.length) return <>{vazio ?? <EstadoVazio titulo="Nada por aqui ainda" />}</>;

  const visiveis = itens.slice(pagina * porPagina, (pagina + 1) * porPagina);
  const teclado = (e: KeyboardEvent, item: T) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      aoClicar?.(item);
    }
  };

  return (
    <div className={styles.envoltorio}>
      <table className={styles.tabela} aria-label={rotulo}>
        <thead>
          <tr>
            {colunas.map((c) => (
              <th key={c.chave} scope="col" className={c.alinharDireita ? styles.direita : undefined}>{c.titulo}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visiveis.map((item) => (
            <tr
              key={chave(item)}
              className={aoClicar ? styles.clicavel : undefined}
              onClick={aoClicar ? () => aoClicar(item) : undefined}
              onKeyDown={aoClicar ? (e) => teclado(e, item) : undefined}
              tabIndex={aoClicar ? 0 : undefined}
            >
              {colunas.map((c) => (
                <td
                  key={c.chave}
                  data-rotulo={c.titulo}
                  className={[c.principal && styles.principal, c.ocultarNoMobile && styles.ocultarMobile, c.alinharDireita && styles.direita]
                    .filter(Boolean)
                    .join(' ') || undefined}
                >
                  {c.render(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {totalPaginas > 1 && (
        <nav className={styles.paginacao} aria-label="Paginação">
          <span>
            {pagina * porPagina + 1}–{Math.min(itens.length, (pagina + 1) * porPagina)} de {itens.length}
          </span>
          <div>
            <Botao variante="secundario" pequeno disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}>
              Anterior
            </Botao>
            <Botao variante="secundario" pequeno disabled={pagina >= totalPaginas - 1} onClick={() => setPagina((p) => p + 1)}>
              Próxima
            </Botao>
          </div>
        </nav>
      )}
    </div>
  );
}
