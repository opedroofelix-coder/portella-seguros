import { useSyncExternalStore } from 'react';
import { Icone } from './Icone';
import styles from './Tema.module.css';

/** Tema da interface. "auto" segue o modo claro/escuro do aparelho. */
export type Tema = 'claro' | 'escuro' | 'auto';
export const CHAVE_TEMA = 'portella-crm:tema';

const OPCOES: Array<{ tema: Tema; rotulo: string; icone: 'sol' | 'lua' | 'automatico' }> = [
  { tema: 'claro', rotulo: 'Claro', icone: 'sol' },
  { tema: 'escuro', rotulo: 'Escuro', icone: 'lua' },
  { tema: 'auto', rotulo: 'Automático', icone: 'automatico' },
];

export function lerTema(): Tema {
  try {
    const t = localStorage.getItem(CHAVE_TEMA);
    return t === 'escuro' || t === 'auto' ? t : 'claro';
  } catch {
    return 'claro';
  }
}

/** Sem data-tema, o CSS segue prefers-color-scheme ("Automático"). */
export function aplicarTema(tema: Tema) {
  const raiz = document.documentElement;
  if (tema === 'auto') delete raiz.dataset.tema;
  else raiz.dataset.tema = tema;
}

const ouvintes = new Set<() => void>();
let atual: Tema | null = null;

export function escolherTema(tema: Tema) {
  try {
    localStorage.setItem(CHAVE_TEMA, tema);
  } catch {
    // Sem armazenamento: vale só até recarregar.
  }
  atual = tema;
  aplicarTema(tema);
  ouvintes.forEach((o) => o());
}

export function useTema(): [Tema, (tema: Tema) => void] {
  const tema = useSyncExternalStore(
    (ouvir) => {
      ouvintes.add(ouvir);
      return () => ouvintes.delete(ouvir);
    },
    () => (atual ??= lerTema()),
    () => 'claro' as Tema,
  );
  return [tema, escolherTema];
}

/** Seletor Claro / Escuro / Automático. A variante "menu" fica no menu lateral marinho. */
export function SeletorTema({ variante = 'padrao' }: { variante?: 'padrao' | 'menu' }) {
  const [tema, escolher] = useTema();
  return (
    <div
      className={`${styles.seletor} ${variante === 'menu' ? styles.menu : ''}`}
      role="group"
      aria-label="Tema"
    >
      {OPCOES.map((o) => (
        <button
          key={o.tema}
          type="button"
          className={styles.opcao}
          aria-pressed={tema === o.tema}
          title={
            o.tema === 'auto' ? 'Automático: segue o modo do aparelho' : `Tema ${o.rotulo.toLowerCase()}`
          }
          onClick={() => escolher(o.tema)}
        >
          <Icone nome={o.icone} tamanho={16} />
          <span>{o.rotulo}</span>
        </button>
      ))}
    </div>
  );
}
