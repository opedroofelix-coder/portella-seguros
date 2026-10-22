import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Botao } from './Botao';
import styles from './Modal.module.css';

export interface ModalProps {
  aberto: boolean;
  titulo: string;
  aoFechar: () => void;
  children: ReactNode;
  rodape?: ReactNode;
  largura?: number;
}

const FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Janela modal: vira painel inferior no celular, centraliza no desktop. Esc fecha e o foco fica preso. */
export function Modal({ aberto, titulo, aoFechar, children, rodape, largura }: ModalProps) {
  const idTitulo = useId();
  const janela = useRef<HTMLDivElement>(null);
  const fechar = useRef(aoFechar);
  fechar.current = aoFechar;

  useEffect(() => {
    if (!aberto) return;
    const anterior = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const primeiro = janela.current?.querySelector<HTMLElement>('[data-autofoco], input, select, textarea');
    (primeiro ?? janela.current)?.focus();

    const teclado = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        fechar.current();
      }
      if (e.key === 'Tab' && janela.current) {
        const itens = [...janela.current.querySelectorAll<HTMLElement>(FOCAVEIS)];
        const [inicio, fim] = [itens[0], itens[itens.length - 1]];
        if (!inicio || !fim) return;
        if (e.shiftKey && document.activeElement === inicio) {
          e.preventDefault();
          fim.focus();
        } else if (!e.shiftKey && document.activeElement === fim) {
          e.preventDefault();
          inicio.focus();
        }
      }
    };
    document.addEventListener('keydown', teclado);
    return () => {
      document.removeEventListener('keydown', teclado);
      document.body.style.overflow = overflow;
      anterior?.focus?.();
    };
  }, [aberto]);

  if (!aberto) return null;
  return createPortal(
    <div className={styles.fundo} onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div
        ref={janela}
        className={styles.janela}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        style={largura ? ({ '--largura': `${largura}px` } as CSSProperties) : undefined}
      >
        <header className={styles.cabecalho}>
          <h2 id={idTitulo} className={styles.titulo}>{titulo}</h2>
          <Botao variante="fantasma" soIcone icone="fechar" onClick={aoFechar}>Fechar</Botao>
        </header>
        <div className={styles.corpo}>{children}</div>
        {rodape && <footer className={styles.rodape}>{rodape}</footer>}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmarAcao({
  aberto,
  titulo,
  mensagem,
  textoConfirmar = 'Confirmar',
  perigo,
  carregando,
  aoConfirmar,
  aoCancelar,
}: {
  aberto: boolean;
  titulo: string;
  mensagem: ReactNode;
  textoConfirmar?: string;
  perigo?: boolean;
  carregando?: boolean;
  aoConfirmar: () => void;
  aoCancelar: () => void;
}) {
  return (
    <Modal
      aberto={aberto}
      titulo={titulo}
      aoFechar={aoCancelar}
      largura={460}
      rodape={
        <>
          <Botao variante="secundario" onClick={aoCancelar}>Cancelar</Botao>
          <Botao variante={perigo ? 'perigo' : 'primario'} carregando={carregando} onClick={aoConfirmar} data-autofoco>
            {textoConfirmar}
          </Botao>
        </>
      }
    >
      <p style={{ margin: 0 }}>{mensagem}</p>
    </Modal>
  );
}
