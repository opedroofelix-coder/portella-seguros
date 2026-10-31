import { MeuChecklist, RecadosEquipe, useColecao, useEquipe, useServicos } from '@portella/app-base';
import type { Oportunidade, Proposta } from '@portella/core';
import { hojeISO } from '@portella/core';
import { Cartao } from '@portella/ui';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { pendenciasDoCrm } from '../../application/pendencias';
import { useApolices } from '../hooks';
import styles from './MuralEquipe.module.css';

/**
 * Mural da administração no alto do Painel: as pendências que o CRM encontra sozinho, os recados para a
 * equipe e o checklist pessoal (proposta C, reunião de 30/10/2026).
 */
export function MuralEquipe() {
  const { propostas, oportunidades } = useServicos();
  const { nomeDe } = useEquipe();
  const { data: apolices = [] } = useApolices();
  const { data: listaPropostas = [] } = useColecao<Proposta>('propostas', propostas);
  const { data: listaOportunidades = [] } = useColecao<Oportunidade>('oportunidades', oportunidades);
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

  return (
    <div className={styles.mural} aria-label="Mural da equipe">
      <Cartao titulo="Pendências do CRM" className={styles.coluna}>
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
      </Cartao>
      <Cartao titulo="Recados da equipe" className={styles.coluna}>
        <p className={styles.subtitulo}>O produtor vê no bloco de notas dele e marca quando fizer.</p>
        <RecadosEquipe />
      </Cartao>
      <Cartao titulo="Meu checklist" className={styles.coluna}>
        <p className={styles.subtitulo}>Só você vê.</p>
        <MeuChecklist />
      </Cartao>
    </div>
  );
}
