import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Botao } from './Botao';
import styles from './Estrutura.module.css';
import type { NomeIcone } from './Icone';
import { Icone } from './Icone';
import { SeletorTema } from './Tema';

export interface ItemMenu {
  para: string;
  rotulo: string;
  icone: NomeIcone;
  /** Número em destaque ao lado do item (ex.: pendências). */
  contador?: number;
  /** Grupo do menu ("Principal", "Relatórios", "Sistema"). Itens seguidos do mesmo grupo ficam juntos. */
  grupo?: string;
}

export interface EstruturaProps {
  sistema: string;
  logo: string;
  menu: ItemMenu[];
  usuario: { nome: string; perfil: string };
  aoSair: () => void;
  children: ReactNode;
}

const DESKTOP = '(min-width: 1024px)';

/** No computador o cabeçalho da página vai para a barra superior; no celular fica no conteúdo. */
function useDesktop() {
  const [desktop, setDesktop] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(DESKTOP).matches,
  );
  useEffect(() => {
    if (!window.matchMedia) return;
    const consulta = window.matchMedia(DESKTOP);
    const mudar = () => setDesktop(consulta.matches);
    mudar();
    consulta.addEventListener('change', mudar);
    return () => consulta.removeEventListener('change', mudar);
  }, []);
  return desktop;
}

const SlotTopo = createContext<HTMLElement | null>(null);

const iniciais = (nome: string) =>
  nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');

/** Layout do app: menu lateral marinho fixo no computador; no celular, barra no topo e menu deslizante. */
export function Estrutura({ sistema, logo, menu, usuario, aoSair, children }: EstruturaProps) {
  const [aberto, setAberto] = useState(false);
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const desktop = useDesktop();
  const local = useLocation();

  useEffect(() => setAberto(false), [local.pathname]);
  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false);
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [aberto]);

  const grupos: Array<{ nome?: string; itens: ItemMenu[] }> = [];
  for (const item of menu) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.nome === item.grupo) ultimo.itens.push(item);
    else grupos.push({ nome: item.grupo, itens: [item] });
  }

  return (
    <div className={styles.estrutura}>
      <header className={styles.topo}>
        <Botao
          variante="fantasma"
          soIcone
          icone="menu"
          aria-expanded={aberto}
          aria-controls="menu-lateral"
          onClick={() => setAberto(true)}
        >
          Abrir menu
        </Botao>
        <Link to="/" className={styles.topoMarca} aria-label={`Portella ${sistema}, início`}>
          <img src={logo} alt="" />
          <span className={styles.topoSistema}>{sistema}</span>
        </Link>
      </header>

      {aberto && <button className={styles.veu} aria-label="Fechar menu" onClick={() => setAberto(false)} />}

      <aside
        id="menu-lateral"
        className={`${styles.lateral} ${aberto ? styles.lateralAberta : ''}`}
        aria-label="Menu principal"
      >
        <Link to="/" className={styles.marca}>
          <img src={logo} alt="Portella Corretora de Seguros" />
          <span className={styles.sistema}>CRM {sistema}</span>
        </Link>
        <nav className={styles.nav}>
          {grupos.map((g, i) => (
            <div key={`${g.nome ?? ''}-${i}`} className={styles.grupo}>
              {g.nome && <span className={styles.grupoNome}>{g.nome}</span>}
              {g.itens.map((item) => (
                <NavLink
                  key={item.para}
                  to={item.para}
                  end={item.para === '/'}
                  onClick={() => setAberto(false)}
                  className={({ isActive }) => `${styles.link} ${isActive ? styles.linkAtivo : ''}`}
                >
                  <Icone nome={item.icone} tamanho={18} />
                  {item.rotulo}
                  {item.contador ? (
                    <span className={styles.contador} aria-label={`${item.contador} pendente(s)`}>
                      {item.contador}
                    </span>
                  ) : null}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className={styles.rodape}>
          <div className={styles.perfil}>
            <span className={styles.avatar} aria-hidden="true">
              {iniciais(usuario.nome)}
            </span>
            <div>
              <strong>{usuario.nome}</strong>
              <span>{usuario.perfil}</span>
            </div>
            <button type="button" className={styles.sair} onClick={aoSair}>
              <Icone nome="sair" tamanho={16} />
              Sair
            </button>
          </div>
          <SeletorTema variante="menu" />
        </div>
      </aside>

      <div className={styles.principal}>
        {desktop && <div className={styles.barraSuperior} ref={setSlot} />}
        <SlotTopo.Provider value={desktop ? slot : null}>
          <main className={styles.conteudo} id="conteudo">
            {children}
          </main>
        </SlotTopo.Provider>
      </div>
    </div>
  );
}

export function CabecalhoPagina({
  titulo,
  descricao,
  acoes,
}: {
  titulo: ReactNode;
  descricao?: ReactNode;
  acoes?: ReactNode;
}) {
  const slot = useContext(SlotTopo);
  const cabecalho = (
    <div className={styles.cabecalhoPagina}>
      <div className={styles.cabecalhoTexto}>
        <h1>{titulo}</h1>
        {descricao && <p>{descricao}</p>}
      </div>
      {acoes && <div className={styles.acoes}>{acoes}</div>}
    </div>
  );
  return slot ? createPortal(cabecalho, slot) : cabecalho;
}

export function BarraFiltros({ children }: { children: ReactNode }) {
  return (
    <div className={styles.filtros} role="search">
      {children}
    </div>
  );
}
