import type { CSSProperties, ReactNode } from 'react';
import { createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Botao } from './Botao';
import { useInterface } from './Interface';
import styles from './Modal.module.css';

export interface ModalProps {
  aberto: boolean;
  titulo: string;
  aoFechar: () => void;
  children: ReactNode;
  rodape?: ReactNode;
  largura?: number;
  /** Com a interface refinada: há alterações não salvas, então fechar pede confirmação. */
  alterado?: boolean;
  /** Com a interface refinada: não fecha (ex.: enquanto salva). */
  bloqueado?: boolean;
  /** 'alertdialog' para confirmações; o texto em `idDescricao` descreve a janela. */
  papel?: 'dialog' | 'alertdialog';
  idDescricao?: string;
}

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const PRIMEIRO_CAMPO =
  '[data-autofoco], input:not([type=hidden]):not([disabled]):not([readonly]), select:not([disabled]), textarea:not([disabled])';

/**
 * Modais abertos. Só o de cima responde ao Esc e prende o foco. "De cima" é o mais aninhado
 * (uma confirmação dentro de um formulário), mesmo quando os dois abrem juntos.
 */
const pilha: Array<{ profundidade: number }> = [];
const Profundidade = createContext(0);

/** Janela modal: vira painel inferior no celular, centraliza no desktop. Esc fecha e o foco fica preso. */
export function Modal({
  aberto,
  titulo,
  aoFechar,
  children,
  rodape,
  largura,
  alterado,
  bloqueado,
  papel = 'dialog',
  idDescricao,
}: ModalProps) {
  const { refinada } = useInterface();
  const profundidade = useContext(Profundidade) + 1;
  const idTitulo = useId();
  const janela = useRef<HTMLDivElement>(null);
  const [descartar, setDescartar] = useState(false);
  // Pedido de fechamento pelo Esc, pelo X ou pelo fundo: respeita "bloqueado" e "alterado".
  const pedirFechamento = () => {
    if (!refinada) return aoFechar();
    if (bloqueado) return;
    if (alterado) setDescartar(true);
    else aoFechar();
  };
  const pedir = useRef(pedirFechamento);
  pedir.current = pedirFechamento;

  useEffect(() => {
    if (!aberto) return;
    const eu = { profundidade };
    pilha.push(eu);
    const noTopo = () =>
      !refinada ||
      pilha.every(
        (o, i) =>
          o === eu ||
          o.profundidade < profundidade ||
          (o.profundidade === profundidade && i < pilha.indexOf(eu)),
      );
    const anterior = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const primeiro = janela.current?.querySelector<HTMLElement>(
      refinada ? PRIMEIRO_CAMPO : '[data-autofoco], input, select, textarea',
    );
    if (noTopo()) (primeiro ?? janela.current)?.focus();

    const teclado = (e: KeyboardEvent) => {
      if (!noTopo()) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (refinada) e.stopImmediatePropagation();
        pedir.current();
      }
      if (e.key === 'Tab' && janela.current) {
        const itens = [...janela.current.querySelectorAll<HTMLElement>(FOCAVEIS)];
        const [inicio, fim] = [itens[0], itens[itens.length - 1]];
        if (!inicio || !fim) {
          if (refinada) e.preventDefault();
          return;
        }
        const ativo = document.activeElement;
        const fora = refinada && !janela.current.contains(ativo);
        if (e.shiftKey && (ativo === inicio || fora || (refinada && ativo === janela.current))) {
          e.preventDefault();
          fim.focus();
        } else if (!e.shiftKey && (ativo === fim || fora)) {
          e.preventDefault();
          inicio.focus();
        }
      }
    };
    // Foco que escapa (clique fora, leitor de tela) volta para a janela de cima.
    const foco = (e: FocusEvent) => {
      if (!refinada || !noTopo() || !janela.current) return;
      if (!janela.current.contains(e.target as Node)) janela.current.focus();
    };
    document.addEventListener('keydown', teclado);
    document.addEventListener('focusin', foco);
    return () => {
      document.removeEventListener('keydown', teclado);
      document.removeEventListener('focusin', foco);
      pilha.splice(pilha.indexOf(eu), 1);
      if (!pilha.length) document.body.style.overflow = overflow;
      anterior?.focus?.();
    };
  }, [aberto, refinada, profundidade]);

  if (!aberto) return null;
  return createPortal(
    <Profundidade.Provider value={profundidade}>
      <div
        className={styles.fundo}
        onMouseDown={(e) => {
          if (e.target !== e.currentTarget) return;
          // Com alterações, um clique fora não fecha nem pergunta: só o X, o Esc ou Cancelar.
          if (refinada && alterado) return;
          pedirFechamento();
        }}
      >
        <div
          ref={janela}
          className={styles.janela}
          role={refinada ? papel : 'dialog'}
          aria-modal="true"
          aria-labelledby={idTitulo}
          aria-describedby={refinada ? idDescricao : undefined}
          tabIndex={-1}
          style={largura ? ({ '--largura': `${largura}px` } as CSSProperties) : undefined}
        >
          <header className={styles.cabecalho}>
            <h2 id={idTitulo} className={styles.titulo}>
              {titulo}
            </h2>
            <Botao
              variante="fantasma"
              soIcone
              icone="fechar"
              onClick={pedirFechamento}
              disabled={refinada && bloqueado}
            >
              Fechar
            </Botao>
          </header>
          <div className={styles.corpo}>{children}</div>
          {rodape && <footer className={styles.rodape}>{rodape}</footer>}
        </div>
        {refinada && (
          <ConfirmarAcao
            aberto={descartar}
            titulo="Descartar as alterações?"
            mensagem="O que você digitou nesta janela ainda não foi salvo."
            textoConfirmar="Descartar"
            textoCancelar="Continuar editando"
            perigo
            aoCancelar={() => setDescartar(false)}
            aoConfirmar={() => {
              setDescartar(false);
              aoFechar();
            }}
          />
        )}
      </div>
    </Profundidade.Provider>,
    document.body,
  );
}

export function ConfirmarAcao({
  aberto,
  titulo,
  mensagem,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  perigo,
  carregando,
  aoConfirmar,
  aoCancelar,
  children,
}: {
  aberto: boolean;
  titulo: string;
  mensagem: ReactNode;
  textoConfirmar?: string;
  textoCancelar?: string;
  perigo?: boolean;
  carregando?: boolean;
  aoConfirmar: () => void;
  aoCancelar: () => void;
  /** Campos extras (motivo, valor…) abaixo da mensagem. */
  children?: ReactNode;
}) {
  const { refinada } = useInterface();
  const idMensagem = useId();
  // Em ações destrutivas o foco começa em "Cancelar": Enter por engano não apaga nada.
  const focoNoCancelar = refinada && perigo;
  return (
    <Modal
      aberto={aberto}
      titulo={titulo}
      aoFechar={aoCancelar}
      largura={460}
      papel="alertdialog"
      idDescricao={idMensagem}
      bloqueado={carregando}
      rodape={
        <>
          <Botao
            variante="secundario"
            onClick={aoCancelar}
            disabled={refinada && carregando}
            data-autofoco={focoNoCancelar || undefined}
          >
            {textoCancelar}
          </Botao>
          <Botao
            variante={perigo ? 'perigo' : 'primario'}
            carregando={carregando}
            onClick={aoConfirmar}
            data-autofoco={focoNoCancelar ? undefined : true}
          >
            {textoConfirmar}
          </Botao>
        </>
      }
    >
      <p id={idMensagem} style={{ margin: 0 }}>
        {mensagem}
      </p>
      {children && <div style={{ marginTop: 16 }}>{children}</div>}
    </Modal>
  );
}
