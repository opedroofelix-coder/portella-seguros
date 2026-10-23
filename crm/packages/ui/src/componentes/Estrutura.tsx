import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Botao } from './Botao';
import type { ResultadoBusca } from './BuscaRapida';
import { BuscaRapida } from './BuscaRapida';
import styles from './Estrutura.module.css';
import type { NomeIcone } from './Icone';
import { Icone } from './Icone';
import { useInterface } from './Interface';
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
  /**
   * 'topo': no computador largo, o menu fica numa cápsula no alto da página, com o grupo principal à
   * vista e os outros em "Mais". No celular e em telas menores continua o menu lateral.
   */
  navegacao?: 'lateral' | 'topo';
  /** Marca da cápsula: ícone e nome nas versões para fundo claro e escuro. */
  marca?: { icone: string; nomeClaro: string; nomeEscuro: string };
  /** Ação fixa na cápsula (ex.: "Nova proposta"). */
  acaoTopo?: ReactNode;
  /** Liga a busca rápida (Ctrl K) com estes resultados. */
  buscar?: (texto: string) => ResultadoBusca[];
}

const DESKTOP = '(min-width: 1024px)';
const DESKTOP_TOPO = '(min-width: 1280px)';

/** No computador o cabeçalho da página vai para a barra superior; no celular fica no conteúdo. */
function useMidia(consultaCss: string) {
  const [casa, setCasa] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(consultaCss).matches,
  );
  useEffect(() => {
    if (!window.matchMedia) return;
    const consulta = window.matchMedia(consultaCss);
    const mudar = () => setCasa(consulta.matches);
    mudar();
    consulta.addEventListener('change', mudar);
    return () => consulta.removeEventListener('change', mudar);
  }, [consultaCss]);
  return casa;
}

const SlotTopo = createContext<HTMLElement | null>(null);

/** Com a interface refinada, só palavras que começam com letra ("Ana (demo)" vira "A", não "A("). */
const iniciais = (nome: string, refinada = true) =>
  nome
    .split(/\s+/)
    .filter((p) => (refinada ? /^\p{L}/u.test(p) : Boolean(p)))
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');

/** Layout do app: menu lateral marinho fixo no computador; no celular, barra no topo e menu deslizante. */
export function Estrutura(props: EstruturaProps) {
  const larga = useMidia(DESKTOP_TOPO);
  return props.navegacao === 'topo' && larga ? <EstruturaTopo {...props} /> : <EstruturaLateral {...props} />;
}

function agrupar(menu: ItemMenu[]) {
  const grupos: Array<{ nome?: string; itens: ItemMenu[] }> = [];
  for (const item of menu) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.nome === item.grupo) ultimo.itens.push(item);
    else grupos.push({ nome: item.grupo, itens: [item] });
  }
  return grupos;
}

/** Ctrl K (ou ⌘K) abre a busca rápida. */
function useBuscaRapida(ligada: boolean) {
  const [aberta, setAberta] = useState(false);
  useEffect(() => {
    if (!ligada) return;
    const atalho = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setAberta(true);
      }
    };
    document.addEventListener('keydown', atalho);
    return () => document.removeEventListener('keydown', atalho);
  }, [ligada]);
  return [aberta, setAberta] as const;
}

function ConteudoMenu({ item, refinada }: { item: ItemMenu; refinada: boolean }) {
  return (
    <>
      <Icone nome={item.icone} tamanho={18} />
      {item.rotulo}
      {item.contador ? (
        refinada ? (
          <>
            <span className={styles.contador} aria-hidden="true">
              {item.contador}
            </span>
            <span className="sr-only"> {item.contador} pendente(s)</span>
          </>
        ) : (
          <span className={styles.contador} aria-label={`${item.contador} pendente(s)`}>
            {item.contador}
          </span>
        )
      ) : null}
    </>
  );
}

function EstruturaLateral({
  sistema,
  logo,
  menu,
  usuario,
  aoSair,
  children,
  navegacao,
  marca,
  buscar,
}: EstruturaProps) {
  const [aberto, setAberto] = useState(false);
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const desktop = useMidia(DESKTOP);
  const local = useLocation();
  const navegar = useNavigate();
  const [buscaAberta, setBuscaAberta] = useBuscaRapida(!!buscar);
  const { refinada } = useInterface();
  const lateral = useRef<HTMLElement>(null);
  const botaoMenu = useRef<HTMLButtonElement>(null);

  useEffect(() => setAberto(false), [local.pathname]);
  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false);
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [aberto]);

  // Interface refinada no celular: o menu fechado sai da ordem do Tab; aberto, recebe o foco,
  // prende o Tab e, ao fechar, devolve o foco ao botão que o abriu.
  const menuInerte = refinada && !desktop && !aberto;
  useEffect(() => {
    if (!refinada || desktop || !aberto || !lateral.current) return;
    const menu = lateral.current;
    const botao = botaoMenu.current;
    menu.querySelector<HTMLElement>('a[href]')?.focus();
    const prender = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const itens = [...menu.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')];
      const [inicio, fim] = [itens[0], itens[itens.length - 1]];
      if (e.shiftKey && document.activeElement === inicio) {
        e.preventDefault();
        fim?.focus();
      } else if (!e.shiftKey && document.activeElement === fim) {
        e.preventDefault();
        inicio?.focus();
      }
    };
    document.addEventListener('keydown', prender);
    return () => {
      document.removeEventListener('keydown', prender);
      if (menu.contains(document.activeElement)) botao?.focus();
    };
  }, [refinada, desktop, aberto]);

  const grupos = agrupar(menu);

  return (
    <div className={navegacao === 'topo' ? `${styles.estrutura} ${styles.modoTopo}` : styles.estrutura}>
      {refinada && (
        <a className={styles.pular} href="#conteudo">
          Pular para o conteúdo
        </a>
      )}
      <header className={styles.topo}>
        <Botao
          ref={botaoMenu}
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
          {marca ? (
            <>
              <img src={marca.icone} alt="" />
              <img src={marca.nomeClaro} alt="" className={`${styles.topoNome} ${styles.soClaro}`} />
              <img src={marca.nomeEscuro} alt="" className={`${styles.topoNome} ${styles.soEscuro}`} />
            </>
          ) : (
            <img src={logo} alt="" />
          )}
          <span className={styles.topoSistema}>{sistema}</span>
        </Link>
        {buscar && (
          <Botao
            variante="fantasma"
            soIcone
            icone="busca"
            className={styles.topoBusca}
            onClick={() => setBuscaAberta(true)}
          >
            Buscar
          </Botao>
        )}
      </header>

      {aberto && <button className={styles.veu} aria-label="Fechar menu" onClick={() => setAberto(false)} />}

      <aside
        id="menu-lateral"
        className={`${styles.lateral} ${aberto ? styles.lateralAberta : ''}`}
        aria-label="Menu principal"
        ref={lateral}
        {...(menuInerte ? { inert: '' } : {})}
      >
        <Link to="/" className={styles.marca}>
          <img src={logo} alt="Portella Corretora de Seguros" />
          <span className={styles.sistema}>CRM {sistema}</span>
        </Link>
        <nav className={styles.nav} aria-label={refinada ? 'Seções' : undefined}>
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
                  <ConteudoMenu item={item} refinada={refinada} />
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className={styles.rodape}>
          <div className={styles.perfil}>
            <span className={styles.avatar} aria-hidden="true">
              {iniciais(usuario.nome, refinada)}
            </span>
            <div>
              <strong title={refinada ? usuario.nome : undefined}>{usuario.nome}</strong>
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
          <main className={styles.conteudo} id="conteudo" tabIndex={refinada ? -1 : undefined}>
            {children}
          </main>
        </SlotTopo.Provider>
      </div>
      {buscar && (
        <BuscaRapida
          aberta={buscaAberta}
          aoFechar={() => setBuscaAberta(false)}
          buscar={buscar}
          aoEscolher={(r) => navegar(r.para)}
        />
      )}
    </div>
  );
}

/** Computador largo com navegacao="topo": cápsula de vidro no alto, grupo principal à vista e "Mais". */
function EstruturaTopo({
  sistema,
  logo,
  menu,
  usuario,
  aoSair,
  children,
  marca,
  acaoTopo,
  buscar,
}: EstruturaProps) {
  const [maisAberto, setMaisAberto] = useState(false);
  const [buscaAberta, setBuscaAberta] = useBuscaRapida(!!buscar);
  const local = useLocation();
  const navegar = useNavigate();
  const { refinada } = useInterface();
  const mais = useRef<HTMLDivElement>(null);
  const botaoMais = useRef<HTMLButtonElement>(null);
  const [principal, ...outros] = agrupar(menu);
  const ativoEmMais = outros.some((g) =>
    g.itens.some((i) => i.para !== '/' && local.pathname.startsWith(i.para)),
  );

  useEffect(() => setMaisAberto(false), [local.pathname]);
  useEffect(() => {
    if (!maisAberto) return;
    const fechar = (e: KeyboardEvent | MouseEvent) => {
      if (e instanceof KeyboardEvent) {
        if (e.key !== 'Escape') return;
        setMaisAberto(false);
        botaoMais.current?.focus();
        return;
      }
      const alvo = e.target as Node;
      if (!mais.current?.contains(alvo) && !botaoMais.current?.contains(alvo)) setMaisAberto(false);
    };
    document.addEventListener('keydown', fechar);
    document.addEventListener('mousedown', fechar);
    return () => {
      document.removeEventListener('keydown', fechar);
      document.removeEventListener('mousedown', fechar);
    };
  }, [maisAberto]);

  const link = (item: ItemMenu, classe?: string, ativa?: string) => (
    <NavLink
      key={item.para}
      to={item.para}
      end={item.para === '/'}
      onClick={() => setMaisAberto(false)}
      className={({ isActive }) => `${classe} ${isActive ? ativa : ''}`}
    >
      <ConteudoMenu item={item} refinada={refinada} />
    </NavLink>
  );

  return (
    <div className={`${styles.estrutura} ${styles.estruturaTopo}`}>
      {refinada && (
        <a className={styles.pular} href="#conteudo">
          Pular para o conteúdo
        </a>
      )}
      <header className={styles.capsula}>
        <Link to="/" className={styles.capsulaMarca} aria-label={`Portella ${sistema}, início`}>
          {marca ? (
            <>
              <img src={marca.icone} alt="" className={styles.capsulaIcone} />
              <img src={marca.nomeClaro} alt="" className={`${styles.capsulaNome} ${styles.soClaro}`} />
              <img src={marca.nomeEscuro} alt="" className={`${styles.capsulaNome} ${styles.soEscuro}`} />
            </>
          ) : (
            <img src={logo} alt="" className={styles.capsulaNome} />
          )}
        </Link>
        <nav className={styles.capsulaNav} aria-label="Menu principal">
          {principal?.itens.map((item) => link(item, styles.capsulaLink, styles.capsulaLinkAtivo))}
          {outros.length > 0 && (
            <div className={styles.maisArea}>
              <button
                ref={botaoMais}
                type="button"
                className={`${styles.capsulaLink} ${ativoEmMais ? styles.capsulaLinkAtivo : ''}`}
                aria-expanded={maisAberto}
                aria-controls="menu-mais"
                onClick={() => setMaisAberto((a) => !a)}
              >
                Mais
                <Icone nome="seta" tamanho={16} className={styles.maisSeta} />
              </button>
              {maisAberto && (
                <div id="menu-mais" className={styles.mais} ref={mais}>
                  <div className={styles.maisGrupos}>
                    {outros.map((g, i) => (
                      <div key={`${g.nome ?? ''}-${i}`} className={styles.maisGrupo}>
                        {g.nome && <span className={styles.maisGrupoNome}>{g.nome}</span>}
                        {g.itens.map((item) => link(item, styles.maisLink, styles.maisLinkAtivo))}
                      </div>
                    ))}
                  </div>
                  <div className={styles.maisRodape}>
                    <div className={styles.maisPerfil}>
                      <span className={styles.avatar} aria-hidden="true">
                        {iniciais(usuario.nome)}
                      </span>
                      <span>
                        <strong title={usuario.nome}>{usuario.nome}</strong>
                        <small>{usuario.perfil}</small>
                      </span>
                    </div>
                    <SeletorTema />
                    <Botao variante="secundario" icone="sair" onClick={aoSair}>
                      Sair
                    </Botao>
                  </div>
                </div>
              )}
            </div>
          )}
        </nav>
        <span className={styles.capsulaEspaco} />
        {buscar && (
          <button
            type="button"
            className={styles.capsulaBusca}
            aria-label="Buscar (Ctrl K)"
            aria-keyshortcuts="Control+K"
            onClick={() => setBuscaAberta(true)}
          >
            <Icone nome="busca" tamanho={16} />
            <span className={styles.capsulaBuscaTexto}>Buscar</span>
            <kbd>Ctrl K</kbd>
          </button>
        )}
        {acaoTopo}
        <Link to="/conta" className={styles.capsulaAvatar} aria-label={`Minha conta (${usuario.nome})`}>
          {iniciais(usuario.nome)}
        </Link>
      </header>
      <main className={styles.conteudo} id="conteudo" tabIndex={refinada ? -1 : undefined}>
        {children}
      </main>
      {buscar && (
        <BuscaRapida
          aberta={buscaAberta}
          aoFechar={() => setBuscaAberta(false)}
          buscar={buscar}
          aoEscolher={(r) => navegar(r.para)}
        />
      )}
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
  const { refinada } = useInterface();
  const h1 = useRef<HTMLHeadingElement>(null);
  // Com a interface refinada, a aba do navegador mostra a tela atual ("Apólices · Portella").
  useEffect(() => {
    if (!refinada || !h1.current?.textContent) return;
    const anterior = document.title;
    const sistema = anterior.split(' · ').slice(-1)[0];
    document.title = `${h1.current.textContent} · ${sistema}`;
    return () => {
      document.title = anterior;
    };
  });
  const cabecalho = (
    <div className={styles.cabecalhoPagina}>
      <div className={styles.cabecalhoTexto}>
        <h1 ref={h1}>{titulo}</h1>
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
