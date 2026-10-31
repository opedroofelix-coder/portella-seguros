import type { Recado } from '@portella/core';
import { diasEntre, formatarData, hojeISO, PARA_TODOS, recadoFeitoPor, recadoPara } from '@portella/core';
import { AreaTexto, Botao, Campo, ConfirmarAcao, Entrada, Selecao, useAvisos } from '@portella/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { useId, useMemo, useState } from 'react';
import { mensagemErro } from '../erros';
import { useEquipe } from '../hooks/dados';
import { useServicos } from '../servicos';
import { useUsuario } from '../sessao/Sessao';
import styles from './Notas.module.css';

/** Recados que quem está logado pode ver (a administração vê todos). */
export function useRecados() {
  const { recados } = useServicos();
  const usuario = useUsuario();
  return useQuery({ queryKey: ['recados', usuario.id], queryFn: () => recados.listar(usuario) });
}

function useMarcarRecado() {
  const { recados } = useServicos();
  const usuario = useUsuario();
  const consultas = useQueryClient();
  const { avisar } = useAvisos();
  // A marca aparece na hora; se a gravação falhar, a lista volta ao que estava.
  return useMutation({
    mutationFn: ({ id, feito }: { id: string; feito: boolean }) => recados.marcarFeito(usuario, id, feito),
    onMutate: ({ id, feito }) =>
      consultas.setQueryData<Recado[]>(['recados', usuario.id], (lista) =>
        lista?.map((r) => {
          if (r.id !== id) return r;
          const { [usuario.id]: _antes, ...outros } = r.feitos ?? {};
          return { ...r, feitos: feito ? { ...outros, [usuario.id]: new Date().toISOString() } : outros };
        }),
      ),
    onSettled: () => consultas.invalidateQueries({ queryKey: ['recados'] }),
    onError: (e) => avisar(mensagemErro(e), 'erro'),
  });
}

function Prazo({ prazo, feito }: { prazo?: string; feito: boolean }) {
  if (!prazo) return null;
  const atrasado = !feito && diasEntre(hojeISO(), prazo) < 0;
  return (
    <span className={atrasado ? styles.atrasado : undefined}>
      {atrasado ? 'Atrasado · era até ' : 'Até '}
      {formatarData(prazo).slice(0, 5)}
    </span>
  );
}

/** Recados para o produtor (dele e de toda a equipe), com o "Feito" de cada um. */
export function RecadosRecebidos() {
  const usuario = useUsuario();
  const { nomeDe } = useEquipe();
  const { data: recados = [], isPending } = useRecados();
  const marcar = useMarcarRecado();
  // Abertos primeiro; os feitos ficam só os 3 mais recentes, para a lista não crescer sem fim.
  const lista = useMemo(() => {
    const meus = recados.filter((r) => recadoPara(r, usuario.id));
    const abertos = meus.filter((r) => !recadoFeitoPor(r, usuario.id));
    const feitos = meus.filter((r) => recadoFeitoPor(r, usuario.id)).slice(0, 3);
    return [...abertos, ...feitos];
  }, [recados, usuario.id]);

  if (isPending) return null;
  if (!lista.length) return <p className={styles.vazio}>Nenhum recado da administração.</p>;
  return (
    <ul className={styles.recados}>
      {lista.map((r) => {
        const feito = recadoFeitoPor(r, usuario.id);
        return (
          <li
            key={r.id}
            className={`${styles.recado} ${r.para === PARA_TODOS ? styles.recadoTodos : ''} ${feito ? styles.recadoFeito : ''}`}
          >
            <p className={styles.recadoTexto}>{r.texto}</p>
            <div className={styles.recadoMeta}>
              <span>
                {nomeDe(r.responsavelId)}
                {r.para === PARA_TODOS ? ' → toda a equipe' : ''}
              </span>
              <Prazo prazo={r.prazo} feito={feito} />
              <label className={styles.marcar}>
                <input
                  type="checkbox"
                  checked={feito}
                  onChange={(e) => marcar.mutate({ id: r.id, feito: e.target.checked })}
                />
                Feito
              </label>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Situação do recado para a administração: quem já fez. */
function situacao(r: Recado, nomeDe: (id: string) => string, equipeAtiva: number) {
  const quem = Object.keys(r.feitos ?? {});
  if (r.para !== PARA_TODOS) return quem.includes(r.para) ? 'Feito' : 'Em aberto';
  if (!quem.length) return 'Ninguém marcou ainda';
  if (quem.length >= equipeAtiva) return 'Feito por todos';
  return `Feito por ${quem.map((id) => nomeDe(id).split(' ')[0]).join(', ')}`;
}

/** O recado já foi feito por quem recebeu (num recado para todos, por toda a equipe ativa)? */
const recadoConcluido = (r: Recado, equipeAtiva: number) =>
  r.para === PARA_TODOS ? Object.keys(r.feitos ?? {}).length >= equipeAtiva : recadoFeitoPor(r, r.para);

/** Para o resumo do mural: recados enviados e quantos ainda estão em aberto. */
export function useResumoRecados() {
  const usuario = useUsuario();
  const { equipe } = useEquipe();
  const { data: recados = [] } = useRecados();
  const equipeAtiva = equipe.filter((u) => u.ativo && u.id !== usuario.id).length;
  return {
    total: recados.length,
    emAberto: recados.filter((r) => !recadoConcluido(r, equipeAtiva)).length,
  };
}

/**
 * Recados da administração para a equipe: a lista com quem já fez (e apagar) e, ao clicar em
 * "Novo recado", o formulário para escrever para uma pessoa ou para todos, com prazo.
 */
export function RecadosEquipe() {
  const { recados: servico } = useServicos();
  const usuario = useUsuario();
  const consultas = useQueryClient();
  const { avisar } = useAvisos();
  const { equipe, nomeDe } = useEquipe();
  const { data: recados = [], isPending } = useRecados();
  const [texto, setTexto] = useState('');
  const [para, setPara] = useState(PARA_TODOS);
  const [prazo, setPrazo] = useState('');
  const [apagando, setApagando] = useState<Recado | null>(null);
  const [escrevendo, setEscrevendo] = useState(false);
  const idFormulario = useId();
  const ativos = useMemo(() => equipe.filter((u) => u.ativo && u.id !== usuario.id), [equipe, usuario.id]);
  const atualizar = () => consultas.invalidateQueries({ queryKey: ['recados'] });

  const enviar = useMutation({
    mutationFn: () => servico.enviar(usuario, { texto, para, prazo: prazo || undefined }),
    onSuccess: async () => {
      setTexto('');
      setPrazo('');
      setEscrevendo(false);
      await atualizar();
      avisar(
        para === PARA_TODOS ? 'Recado enviado para toda a equipe.' : `Recado enviado para ${nomeDe(para)}.`,
      );
    },
    onError: (e) => avisar(mensagemErro(e), 'erro'),
  });
  const remover = useMutation({
    mutationFn: (id: string) => servico.remover(usuario, id),
    onSuccess: async () => {
      setApagando(null);
      await atualizar();
      avisar('Recado apagado.');
    },
    onError: (e) => avisar(mensagemErro(e), 'erro'),
  });

  const aoEnviar = (e: FormEvent) => {
    e.preventDefault();
    if (texto.trim()) enviar.mutate();
  };
  // Em aberto primeiro (pelo prazo), depois os já feitos.
  const feitoTotal = (r: Recado) => recadoConcluido(r, ativos.length);
  const ordenados = [...recados].sort(
    (a, b) =>
      Number(feitoTotal(a)) - Number(feitoTotal(b)) ||
      (a.prazo ?? '9999').localeCompare(b.prazo ?? '9999') ||
      b.criadoEm.localeCompare(a.criadoEm),
  );

  return (
    <div className={styles.secao}>
      {!escrevendo && (
        <div>
          <Botao
            variante="secundario"
            pequeno
            icone="mais"
            aria-expanded={false}
            aria-controls={idFormulario}
            onClick={() => setEscrevendo(true)}
          >
            Novo recado
          </Botao>
        </div>
      )}
      {escrevendo && (
        <form id={idFormulario} className={styles.novoRecado} onSubmit={aoEnviar}>
          <Campo rotulo="Texto do recado">
            <AreaTexto
              autoFocus
              rows={2}
              maxLength={500}
              placeholder="Ex.: ligar para a cliente sobre a 2ª parcela"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
          </Campo>
          <Campo rotulo="Para">
            <Selecao value={para} onChange={(e) => setPara(e.target.value)}>
              <option value={PARA_TODOS}>Toda a equipe</option>
              {ativos.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Prazo (opcional)">
            <Entrada type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
          </Campo>
          <div className={styles.novoRecadoAcoes}>
            <Botao variante="fantasma" onClick={() => setEscrevendo(false)}>
              Cancelar
            </Botao>
            <Botao
              type="submit"
              variante="secundario"
              icone="mais"
              carregando={enviar.isPending}
              disabled={!texto.trim()}
            >
              Enviar recado
            </Botao>
          </div>
        </form>
      )}
      {!isPending && !recados.length && <p className={styles.vazio}>Nenhum recado enviado.</p>}
      {ordenados.length > 0 && (
        <ul className={styles.recados} aria-label="Recados enviados">
          {ordenados.map((r) => {
            const feito = feitoTotal(r);
            return (
              <li
                key={r.id}
                className={`${styles.recado} ${r.para === PARA_TODOS ? styles.recadoTodos : ''} ${feito ? styles.recadoFeito : ''}`}
              >
                <div className={styles.recadoTopo}>
                  <p className={styles.recadoTexto}>{r.texto}</p>
                  <Botao variante="fantasma" pequeno soIcone icone="lixeira" onClick={() => setApagando(r)}>
                    Apagar recado
                  </Botao>
                </div>
                <div className={styles.recadoMeta}>
                  <span>
                    {nomeDe(r.responsavelId).split(' ')[0]} →{' '}
                    {r.para === PARA_TODOS ? 'toda a equipe' : nomeDe(r.para)}
                  </span>
                  <Prazo prazo={r.prazo} feito={feito} />
                  <span>{situacao(r, nomeDe, ativos.length)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <ConfirmarAcao
        aberto={Boolean(apagando)}
        titulo="Apagar o recado?"
        mensagem="Ele some para todos que receberam."
        textoConfirmar="Apagar"
        perigo
        carregando={remover.isPending}
        aoCancelar={() => setApagando(null)}
        aoConfirmar={() => apagando && remover.mutate(apagando.id)}
      />
    </div>
  );
}
