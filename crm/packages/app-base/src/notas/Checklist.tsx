import type { ItemChecklist } from '@portella/core';
import { Botao, Entrada, useAvisos } from '@portella/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { useId, useState } from 'react';
import { mensagemErro } from '../erros';
import { useServicos } from '../servicos';
import { useUsuario } from '../sessao/Sessao';
import styles from './Notas.module.css';

/** Itens do checklist pessoal de quem está logado. */
export function useChecklist() {
  const { checklist } = useServicos();
  const usuario = useUsuario();
  return useQuery({ queryKey: ['checklist', usuario.id], queryFn: () => checklist.listar(usuario) });
}

/**
 * Checklist pessoal: digitar e Enter adiciona; marcar risca o item; "Limpar feitas" apaga os feitos.
 * Só quem criou vê os próprios itens.
 */
export function MeuChecklist({ progresso = false }: { progresso?: boolean }) {
  const { checklist } = useServicos();
  const usuario = useUsuario();
  const consultas = useQueryClient();
  const { avisar } = useAvisos();
  const { data: itens = [], isPending } = useChecklist();
  const [texto, setTexto] = useState('');
  const [verFeitas, setVerFeitas] = useState(false);
  const idCampo = useId();
  const atualizar = () => consultas.invalidateQueries({ queryKey: ['checklist'] });
  const aoErrar = (e: unknown) => avisar(mensagemErro(e), 'erro');

  const adicionar = useMutation({
    mutationFn: (t: string) => checklist.adicionar(usuario, t),
    onSuccess: async () => {
      setTexto('');
      await atualizar();
    },
    onError: aoErrar,
  });
  // A marca aparece na hora; se a gravação falhar, a lista volta ao que estava.
  const marcar = useMutation({
    mutationFn: ({ id, feito }: { id: string; feito: boolean }) => checklist.marcar(usuario, id, feito),
    onMutate: ({ id, feito }) =>
      consultas.setQueryData<ItemChecklist[]>(['checklist', usuario.id], (lista) =>
        lista?.map((i) => (i.id === id ? { ...i, feito } : i)),
      ),
    onSettled: atualizar,
    onError: aoErrar,
  });
  const remover = useMutation({
    mutationFn: (id: string) => checklist.remover(usuario, id),
    onSuccess: atualizar,
    onError: aoErrar,
  });
  const limpar = useMutation({
    mutationFn: () => checklist.limparFeitos(usuario),
    onSuccess: async (n) => {
      await atualizar();
      avisar(`${n} ${n === 1 ? 'item feito apagado' : 'itens feitos apagados'}.`);
    },
    onError: aoErrar,
  });

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (texto.trim()) adicionar.mutate(texto);
  };
  const abertos = itens.filter((i) => !i.feito);
  const feitos = itens.filter((i) => i.feito);

  const linha = (i: ItemChecklist) => (
    <li key={i.id} className={styles.item}>
      <label className={`${styles.marcar} ${i.feito ? styles.feito : ''}`}>
        <input
          type="checkbox"
          checked={Boolean(i.feito)}
          onChange={(e) => marcar.mutate({ id: i.id, feito: e.target.checked })}
        />
        {i.texto}
      </label>
      <Botao variante="fantasma" pequeno soIcone icone="lixeira" onClick={() => remover.mutate(i.id)}>
        {`Apagar "${i.texto}"`}
      </Botao>
    </li>
  );

  return (
    <div className={styles.secao}>
      <form className={styles.adicionar} onSubmit={enviar}>
        <label htmlFor={idCampo} className="sr-only">
          Novo item do checklist
        </label>
        <Entrada
          id={idCampo}
          placeholder="Adicionar item e Enter"
          autoComplete="off"
          maxLength={500}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <Botao type="submit" variante="secundario" soIcone icone="mais" carregando={adicionar.isPending}>
          Adicionar
        </Botao>
      </form>
      {progresso && itens.length > 0 && (
        <div className={styles.progresso}>
          <span>
            {feitos.length} de {itens.length} feita{itens.length === 1 ? '' : 's'}
          </span>
          <span className={styles.barra} aria-hidden="true">
            <span style={{ width: `${Math.round((feitos.length / itens.length) * 100)}%` }} />
          </span>
        </div>
      )}
      {!isPending && !itens.length && (
        <p className={styles.vazio}>Nada na lista. Anote o que precisa fazer.</p>
      )}
      {abertos.length > 0 && <ul className={styles.lista}>{abertos.map(linha)}</ul>}
      {feitos.length > 0 && (
        <>
          <div className={styles.rodapeLista}>
            <Botao
              variante="fantasma"
              pequeno
              onClick={() => setVerFeitas((v) => !v)}
              aria-expanded={verFeitas}
            >
              {verFeitas ? 'Esconder' : 'Ver'} {feitos.length} feita{feitos.length === 1 ? '' : 's'}
            </Botao>
            {verFeitas && (
              <Botao
                variante="fantasma"
                pequeno
                carregando={limpar.isPending}
                onClick={() => limpar.mutate()}
              >
                Limpar feitas
              </Botao>
            )}
          </div>
          {verFeitas && <ul className={styles.lista}>{feitos.map(linha)}</ul>}
        </>
      )}
    </div>
  );
}
