import type { CSSProperties } from 'react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './Lista.module.css';

/**
 * Painel de opções das listas da interface refinada (Selecao e Entrada com sugestões): o mesmo
 * visual em todas as telas e navegadores, no lugar da lista do sistema. O foco fica no campo
 * (aria-activedescendant); o painel só mostra as opções e recebe os cliques.
 */
export interface ItemLista {
  valor: string;
  rotulo: string;
  grupo?: string;
  desativado?: boolean;
}

/** Opções de um <select> (com os grupos de <optgroup>) ou de um <datalist>. */
export function lerOpcoes(fonte: HTMLSelectElement | HTMLDataListElement | null): ItemLista[] {
  if (!fonte) return [];
  return Array.from(fonte.querySelectorAll('option')).map((o) => ({
    valor: o.value,
    rotulo: o.label || o.textContent || o.value,
    grupo: o.parentElement instanceof HTMLOptGroupElement ? o.parentElement.label : undefined,
    desativado: o.disabled || (o.parentElement instanceof HTMLOptGroupElement && o.parentElement.disabled),
  }));
}

/** Próximo item que pode ser escolhido, a partir de `de`, andando `passo` (1 ou -1). */
export function proximoAtivo(itens: ItemLista[], de: number, passo: number): number {
  for (let i = de + passo; i >= 0 && i < itens.length; i += passo) if (!itens[i]!.desativado) return i;
  return de;
}

const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Busca pela inicial (ou pelas primeiras letras digitadas em sequência), como na lista do sistema. */
export function buscarPorInicio(itens: ItemLista[], texto: string, de: number): number {
  const alvo = normalizar(texto);
  for (let n = 1; n <= itens.length; n++) {
    const i = (de + n) % itens.length;
    const it = itens[i]!;
    if (!it.desativado && normalizar(it.rotulo).startsWith(alvo)) return i;
  }
  return de;
}

export const idOpcao = (idLista: string, i: number) => `${idLista}-op${i}`;

export function PainelLista({
  ancora,
  id,
  itens,
  ativo,
  selecionado,
  rotulo,
  aoEscolher,
  aoPassar,
  aoFechar,
}: {
  ancora: HTMLElement;
  id: string;
  itens: ItemLista[];
  ativo: number;
  selecionado?: string;
  rotulo?: string;
  aoEscolher: (i: number) => void;
  aoPassar: (i: number) => void;
  aoFechar: () => void;
}) {
  const painel = useRef<HTMLUListElement>(null);
  const [posicao, setPosicao] = useState<CSSProperties>({ visibility: 'hidden' });
  // Dentro de uma janela (modal), o painel fica nela: o foco e o leitor de tela continuam ali.
  const [destino] = useState(() => ancora.closest<HTMLElement>('[role="dialog"], [role="alertdialog"]'));

  useLayoutEffect(() => {
    const posicionar = () => {
      const r = ancora.getBoundingClientRect();
      const abaixo = window.innerHeight - r.bottom - 12;
      const acima = r.top - 12;
      const altura = Math.min(painel.current?.scrollHeight ?? 320, 320);
      const paraCima = abaixo < Math.min(altura, 200) && acima > abaixo;
      setPosicao({
        left: Math.max(8, Math.min(r.left, window.innerWidth - Math.max(r.width, 220) - 8)),
        width: Math.max(r.width, 220),
        maxHeight: Math.max(120, Math.min(320, paraCima ? acima : abaixo)),
        ...(paraCima ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }),
      });
    };
    posicionar();
    // capture: acompanha também a rolagem dentro da janela e das listas
    window.addEventListener('scroll', posicionar, true);
    window.addEventListener('resize', posicionar);
    return () => {
      window.removeEventListener('scroll', posicionar, true);
      window.removeEventListener('resize', posicionar);
    };
  }, [ancora, itens.length]);

  // Clique fora do campo e do painel fecha.
  useEffect(() => {
    const fora = (e: PointerEvent) => {
      const alvo = e.target as Node;
      if (!ancora.contains(alvo) && !painel.current?.contains(alvo)) aoFechar();
    };
    document.addEventListener('pointerdown', fora);
    return () => document.removeEventListener('pointerdown', fora);
  }, [ancora, aoFechar]);

  // O item ativo continua à vista ao andar com as setas.
  useEffect(() => {
    if (ativo < 0) return;
    document.getElementById(idOpcao(id, ativo))?.scrollIntoView?.({ block: 'nearest' });
  }, [ativo, id]);

  let grupoAnterior: string | undefined;
  return createPortal(
    <ul ref={painel} id={id} role="listbox" aria-label={rotulo} className={styles.painel} style={posicao}>
      {itens.map((it, i) => {
        const cabecalho = it.grupo && it.grupo !== grupoAnterior ? it.grupo : null;
        grupoAnterior = it.grupo;
        return [
          cabecalho && (
            <li key={`g${i}`} role="presentation" className={styles.grupo}>
              {cabecalho}
            </li>
          ),
          <li
            key={i}
            id={idOpcao(id, i)}
            role="option"
            aria-selected={it.valor === selecionado}
            aria-disabled={it.desativado || undefined}
            className={[styles.opcao, i === ativo && styles.ativa].filter(Boolean).join(' ')}
            // O foco não sai do campo ao clicar numa opção.
            onMouseDown={(e) => e.preventDefault()}
            onMouseMove={() => i !== ativo && !it.desativado && aoPassar(i)}
            onClick={() => !it.desativado && aoEscolher(i)}
          >
            <span className={styles.texto}>{it.rotulo || ' '}</span>
            {it.valor === selecionado && (
              <svg
                className={styles.marca}
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            )}
          </li>,
        ];
      })}
    </ul>,
    destino ?? document.body,
  );
}
