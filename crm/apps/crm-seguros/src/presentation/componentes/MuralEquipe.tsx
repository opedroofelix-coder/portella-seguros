import {
  MeuChecklist,
  RecadosEquipe,
  useChecklist,
  useColecao,
  useEquipe,
  useResumoRecados,
  useServicos,
} from '@portella/app-base';
import type { Oportunidade, Proposta } from '@portella/core';
import { hojeISO } from '@portella/core';
import { Cartao, Icone } from '@portella/ui';
import type { ReactNode } from 'react';
import { useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { pendenciasDoCrm } from '../../application/pendencias';
import { useApolices } from '../hooks';
import styles from './MuralEquipe.module.css';

const CHAVE = 'portella-crm:mural:';

/** Lembra no navegador quais quadros a pessoa deixou abertos (começam fechados). */
function useAberto(id: string): [boolean, () => void] {
  const [aberto, setAberto] = useState(() => {
    try {
      return localStorage.getItem(CHAVE + id) === '1';
    } catch {
      return false;
    }
  });
  const alternar = () =>
    setAberto((a) => {
      try {
        localStorage.setItem(CHAVE + id, a ? '0' : '1');
      } catch {
        // Sem armazenamento (modo privado): só não lembra na próxima vez.
      }
      return !a;
    });
  return [aberto, alternar];
}

/** Quadro do mural: fechado mostra o título e o resumo; um clique abre o conteúdo para baixo. */
function Quadro({
  id,
  titulo,
  resumo,
  destaque,
  children,
}: {
  id: string;
  titulo: string;
  resumo: string;
  destaque?: number;
  children: ReactNode;
}) {
  const [aberto, alternar] = useAberto(id);
  const idConteudo = useId();
  return (
    <Cartao className={`${styles.quadro} ${aberto ? styles.quadroAberto : ''}`}>
      <h2 className={styles.quadroTitulo}>
        <button type="button" aria-expanded={aberto} aria-controls={idConteudo} onClick={alternar}>
          <span className={styles.quadroNome}>
            {titulo}
            <small>{resumo}</small>
          </span>
          {destaque ? <span className={styles.selo}>{destaque}</span> : null}
          <Icone nome="seta" tamanho={18} className={styles.seta} />
        </button>
      </h2>
      <div id={idConteudo} className={styles.quadroConteudo} hidden={!aberto}>
        {children}
      </div>
    </Cartao>
  );
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/**
 * Mural da administração no alto do Painel: as pendências que o CRM encontra sozinho, os recados para a
 * equipe e o checklist pessoal (proposta C, reunião de 30/10/2026). Os quadros começam fechados.
 */
export function MuralEquipe() {
  const { propostas, oportunidades } = useServicos();
  const { nomeDe } = useEquipe();
  const { data: apolices = [] } = useApolices();
  const { data: listaPropostas = [] } = useColecao<Proposta>('propostas', propostas);
  const { data: listaOportunidades = [] } = useColecao<Oportunidade>('oportunidades', oportunidades);
  const { data: itens = [] } = useChecklist();
  const recados = useResumoRecados();
  const hoje = hojeISO();
  const pendencias = useMemo(
    () =>
      pendenciasDoCrm(
        { apolices, propostas: listaPropostas, oportunidades: listaOportunidades },
        hoje,
        nomeDe,
      ),
    // nomeDe muda a cada render; os nomes vêm da mesma equipe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apolices, listaPropostas, listaOportunidades, hoje],
  );
  const abertos = itens.filter((i) => !i.feito).length;

  return (
    <div className={styles.mural} role="region" aria-label="Mural da equipe">
      <Quadro
        id="pendencias"
        titulo="Pendências do CRM"
        resumo={pendencias.length ? plural(pendencias.length, 'pendência', 'pendências') : 'Nada pendente'}
        destaque={pendencias.length}
      >
        <p className={styles.subtitulo}>Aparecem sozinhas e somem quando resolvidas.</p>
        {pendencias.length ? (
          <ul className={styles.pendencias}>
            {pendencias.map((p) => (
              <li key={p.id}>
                <Link to={p.para} className={styles.pendencia}>
                  <span className={`${styles.numero} ${styles[p.tom]}`}>{p.quantidade}</span>
                  <span className={styles.texto}>
                    {p.titulo}
                    <small>{p.detalhe}</small>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.vazio}>Nada pendente agora.</p>
        )}
      </Quadro>
      <Quadro
        id="recados"
        titulo="Recados da equipe"
        resumo={
          recados.total
            ? `${plural(recados.emAberto, 'em aberto', 'em aberto')} · ${plural(recados.total, 'enviado', 'enviados')}`
            : 'Nenhum recado enviado'
        }
        destaque={recados.emAberto}
      >
        <p className={styles.subtitulo}>O produtor vê no bloco de notas dele e marca quando fizer.</p>
        <RecadosEquipe />
      </Quadro>
      <Quadro
        id="checklist"
        titulo="Meu checklist"
        resumo={
          abertos ? `${plural(abertos, 'item', 'itens')} em aberto · só você vê` : 'Tudo feito · só você vê'
        }
        destaque={abertos}
      >
        <MeuChecklist />
      </Quadro>
    </div>
  );
}
