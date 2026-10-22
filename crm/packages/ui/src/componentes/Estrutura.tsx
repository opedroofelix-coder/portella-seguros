import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Botao } from './Botao';
import styles from './Estrutura.module.css';
import type { NomeIcone } from './Icone';
import { Icone } from './Icone';

export interface ItemMenu {
  para: string;
  rotulo: string;
  icone: NomeIcone;
}

export interface EstruturaProps {
  sistema: string;
  logo: string;
  menu: ItemMenu[];
  usuario: { nome: string; perfil: string };
  aoSair: () => void;
  children: ReactNode;
}

/** Layout do app: menu lateral fixo no desktop; no celular/tablet, barra no topo e menu deslizante. */
export function Estrutura({ sistema, logo, menu, usuario, aoSair, children }: EstruturaProps) {
  const [aberto, setAberto] = useState(false);
  const local = useLocation();

  useEffect(() => setAberto(false), [local.pathname]);
  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false);
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [aberto]);

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
        <Link to="/" aria-label={`Portella ${sistema}, início`}>
          <img src={logo} alt="" />
        </Link>
        <span className={styles.topoSistema}>{sistema}</span>
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
          {menu.map((item) => (
            <NavLink
              key={item.para}
              to={item.para}
              end={item.para === '/'}
              className={({ isActive }) => `${styles.link} ${isActive ? styles.linkAtivo : ''}`}
            >
              <Icone nome={item.icone} />
              {item.rotulo}
            </NavLink>
          ))}
        </nav>
        <div className={styles.perfil}>
          <div>
            <strong>{usuario.nome}</strong>
            <span>{usuario.perfil}</span>
          </div>
          <Botao variante="fantasma" soIcone icone="sair" onClick={aoSair}>
            Sair
          </Botao>
        </div>
      </aside>

      <div className={styles.principal}>
        <main className={styles.conteudo} id="conteudo">
          {children}
        </main>
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
  return (
    <div className={styles.cabecalhoPagina}>
      <div>
        <h1>{titulo}</h1>
        {descricao && <p>{descricao}</p>}
      </div>
      {acoes && <div className={styles.acoes}>{acoes}</div>}
    </div>
  );
}

export function BarraFiltros({ children }: { children: ReactNode }) {
  return (
    <div className={styles.filtros} role="search">
      {children}
    </div>
  );
}
