import type { DadosRegistro, Registro, ServicoCarteira, Usuario } from '@portella/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useUsuario } from '../sessao/Sessao';
import { useServicos } from '../servicos';

/** Lista os registros visíveis para o usuário logado. */
export function useColecao<T extends Registro>(chave: string, servico: ServicoCarteira<T>) {
  const usuario = useUsuario();
  return useQuery({ queryKey: [chave, usuario.id], queryFn: () => servico.listar(usuario) });
}

export function useSalvar<T extends Registro>(chave: string, servico: ServicoCarteira<T>) {
  const usuario = useUsuario();
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (dados: DadosRegistro<T>) => servico.salvar(usuario, dados),
    onSuccess: () => cliente.invalidateQueries({ queryKey: [chave] }),
  });
}

export function useRemover<T extends Registro>(chave: string, servico: ServicoCarteira<T>) {
  const usuario = useUsuario();
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => servico.remover(usuario, id),
    onSuccess: () => cliente.invalidateQueries({ queryKey: [chave] }),
  });
}

/** Equipe (todos os usuários), com um mapa id → nome para exibir responsáveis. */
export function useEquipe() {
  const { usuarios } = useServicos();
  const consulta = useQuery({ queryKey: ['usuarios'], queryFn: () => usuarios.listar() });
  const nomes = useMemo(
    () => new Map((consulta.data ?? []).map((u: Usuario) => [u.id, u.nome])),
    [consulta.data],
  );
  return { ...consulta, equipe: consulta.data ?? [], nomeDe: (id: string) => nomes.get(id) ?? '—' };
}

/** Mapa id → registro, útil para mostrar o nome do cliente em listas de apólices/cotas. */
export function useIndice<T extends { id: string }>(itens: T[] | undefined) {
  return useMemo(() => new Map((itens ?? []).map((i) => [i.id, i])), [itens]);
}
