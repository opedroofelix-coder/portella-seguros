import { recadoFeitoPor, recadoPara } from '@portella/core';
import { Botao, Icone } from '@portella/ui';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useUsuario } from '../sessao/Sessao';
import { MeuChecklist, useChecklist } from './Checklist';
import styles from './Notas.module.css';
import { RecadosRecebidos, useRecados } from './Recados';

interface EstadoGaveta {
  aberta: boolean;
  alternar: (origem: HTMLElement) => void;
  pendentes: number;
}

const Contexto = createContext<EstadoGaveta | null>(null);

/** Quantos itens do checklist e recados ainda estão em aberto (o número do botão). */
function usePendentes() {
  const usuario = useUsuario();
  const { data: itens = [] } = useChecklist();
  const { data: recados = [] } = useRecados();
  return useMemo(
    () =>
      itens.filter((i) => !i.feito).length +
      recados.filter((r) => recadoPara(r, usuario.id) && !recadoFeitoPor(r, usuario.id)).length,
    [itens, recados, usuario.id],
  );
}

/**
 * Bloco de notas do produtor (proposta B, reunião de 30/10/2026): uma gaveta que abre por cima de
 * qualquer tela, com o checklist pessoal e os recados da administração.
 */
export function ProvedorGavetaNotas({ children }: { children: ReactNode }) {
  const [aberta, setAberta] = useState(false);
  const origem = useRef<HTMLElement | null>(null);
  const pendentes = usePendentes();
  const fechar = useCallback(() => {
    setAberta(false);
    origem.current?.focus();
  }, []);
  const valor = useMemo<EstadoGaveta>(
    () => ({
      aberta,
      pendentes,
      alternar: (el) => {
        origem.current = el;
        setAberta((a) => !a);
      },
    }),
    [aberta, pendentes],
  );
  return (
    <Contexto.Provider value={valor}>
      {children}
      {aberta && <GavetaNotas aoFechar={fechar} />}
    </Contexto.Provider>
  );
}

/** Botão "Notas" do topo, com o número de pendências. */
export function BotaoNotas({ lateral = false }: { lateral?: boolean }) {
  const gaveta = useContext(Contexto);
  if (!gaveta) return null;
  const { aberta, alternar, pendentes } = gaveta;
  return (
    <button
      type="button"
      className={`${styles.botaoNotas} ${lateral ? styles.botaoNotasLateral : ''}`}
      aria-expanded={aberta}
      aria-controls="gaveta-notas"
      aria-label={`Bloco de notas${pendentes ? `, ${pendentes} em aberto` : ''}`}
      onClick={(e) => alternar(e.currentTarget)}
    >
      <Icone nome="checklist" tamanho={18} />
      <span className={styles.botaoNotasTexto}>Notas</span>
      {pendentes > 0 && (
        <span className={styles.contador} aria-hidden="true">
          {pendentes}
        </span>
      )}
    </button>
  );
}

function GavetaNotas({ aoFechar }: { aoFechar: () => void }) {
  const painel = useRef<HTMLElement>(null);
  const local = useLocation();
  const caminho = useRef(local.pathname);

  // Abre com o foco no campo do checklist; Esc fecha. Trocar de tela pelo menu também fecha.
  useEffect(() => {
    painel.current?.querySelector<HTMLElement>('input')?.focus();
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('[role="dialog"][aria-modal="true"]')) aoFechar();
    };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [aoFechar]);
  useEffect(() => {
    if (local.pathname !== caminho.current) aoFechar();
  }, [local.pathname, aoFechar]);

  return (
    <aside
      id="gaveta-notas"
      ref={painel}
      className={styles.gaveta}
      role="dialog"
      aria-labelledby="titulo-gaveta"
    >
      <div className={styles.gavetaCabecalho}>
        <h2 id="titulo-gaveta">Bloco de notas</h2>
        <Botao variante="fantasma" soIcone icone="fechar" onClick={aoFechar}>
          Fechar bloco de notas
        </Botao>
      </div>
      <section className={styles.secao} aria-labelledby="titulo-checklist">
        <h3 id="titulo-checklist">Checklist</h3>
        <MeuChecklist progresso />
      </section>
      <section className={styles.secao} aria-labelledby="titulo-recados-recebidos">
        <h3 id="titulo-recados-recebidos">Recados da administração</h3>
        <RecadosRecebidos />
      </section>
      <p className={styles.nota}>Só você vê o seu checklist.</p>
    </aside>
  );
}
