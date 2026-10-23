import type { KeyboardEvent } from 'react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './BuscaRapida.module.css';
import type { NomeIcone } from './Icone';
import { Icone } from './Icone';

export interface ResultadoBusca {
  id: string;
  titulo: string;
  detalhe?: string;
  /** Grupo do resultado ("Páginas", "Clientes"). */
  grupo: string;
  icone?: NomeIcone;
  para: string;
}

const MAXIMO = 8;

/** Sem acento e em minúsculas, para "apolice" achar "Apólices". */
export const normalizarBusca = (texto: string) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/**
 * Busca rápida (Ctrl K): campo com lista de resultados navegável pelo teclado.
 * ↑ e ↓ escolhem, Enter abre, Esc fecha e devolve o foco a quem abriu.
 */
export function BuscaRapida({
  aberta,
  aoFechar,
  buscar,
  aoEscolher,
}: {
  aberta: boolean;
  aoFechar: () => void;
  buscar: (texto: string) => ResultadoBusca[];
  aoEscolher: (resultado: ResultadoBusca) => void;
}) {
  const [texto, setTexto] = useState('');
  const [ativo, setAtivo] = useState(0);
  const campo = useRef<HTMLInputElement>(null);
  const idLista = useId();
  const resultados = useMemo(() => (aberta ? buscar(texto).slice(0, MAXIMO) : []), [aberta, buscar, texto]);

  useEffect(() => {
    if (!aberta) return;
    const anterior = document.activeElement as HTMLElement | null;
    setTexto('');
    setAtivo(0);
    campo.current?.focus();
    return () => anterior?.focus?.();
  }, [aberta]);
  useEffect(() => setAtivo(0), [texto]);

  if (!aberta) return null;

  const escolher = (r: ResultadoBusca | undefined) => {
    if (!r) return;
    aoFechar();
    aoEscolher(r);
  };
  const aoTeclar = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      aoFechar();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAtivo((i) => (resultados.length ? (i + 1) % resultados.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setAtivo((i) => (resultados.length ? (i - 1 + resultados.length) % resultados.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      escolher(resultados[ativo]);
    }
  };

  let grupoAnterior = '';
  return createPortal(
    <div className={styles.veu} onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className={styles.caixa} role="dialog" aria-modal="true" aria-label="Busca rápida">
        <div className={styles.campo}>
          <Icone nome="busca" tamanho={18} />
          <input
            ref={campo}
            role="combobox"
            aria-expanded={resultados.length > 0}
            aria-controls={idLista}
            aria-activedescendant={resultados[ativo] ? `${idLista}-${ativo}` : undefined}
            aria-autocomplete="list"
            aria-label="Buscar página ou cliente"
            placeholder="Buscar página ou cliente…"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={aoTeclar}
          />
          <kbd className={styles.tecla}>Esc</kbd>
        </div>
        {resultados.length ? (
          <ul className={styles.lista} id={idLista} role="listbox" aria-label="Resultados">
            {resultados.map((r, i) => {
              const titulo = r.grupo !== grupoAnterior ? r.grupo : null;
              grupoAnterior = r.grupo;
              return (
                <li key={r.id} role="presentation">
                  {titulo && (
                    <span className={styles.grupo} role="presentation">
                      {titulo}
                    </span>
                  )}
                  <div
                    id={`${idLista}-${i}`}
                    role="option"
                    aria-selected={i === ativo}
                    className={styles.opcao}
                    onMouseMove={() => setAtivo(i)}
                    onClick={() => escolher(r)}
                  >
                    <Icone nome={r.icone ?? 'seta'} tamanho={16} />
                    <span className={styles.texto}>
                      <strong>{r.titulo}</strong>
                      {r.detalhe && <small>{r.detalhe}</small>}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={styles.vazio} role="status">
            {texto.trim()
              ? `Nada encontrado para “${texto.trim()}”.`
              : 'Digite o nome de uma página ou cliente.'}
          </p>
        )}
        <p className={styles.dica}>
          <span>
            <kbd className={styles.tecla}>↑</kbd> <kbd className={styles.tecla}>↓</kbd> escolhem
          </span>
          <span>
            <kbd className={styles.tecla}>Enter</kbd> abre
          </span>
        </p>
      </div>
    </div>,
    document.body,
  );
}
