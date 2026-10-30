import type {
  Cliente,
  DadosRegistro,
  Estorno,
  PagamentoProdutor,
  Proposta,
  Registro,
  ServicoCarteira,
  TipoCatalogo,
  Usuario,
  Vale,
} from '@portella/core';
import { pode } from '@portella/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useUsuario } from '../sessao/Sessao';
import { useServicos } from '../servicos';

/** Lista os registros visíveis para o usuário logado. */
export function useColecao<T extends Registro>(
  chave: string,
  servico: ServicoCarteira<T>,
  opcoes: { enabled?: boolean } = {},
) {
  const usuario = useUsuario();
  return useQuery({ queryKey: [chave, usuario.id], queryFn: () => servico.listar(usuario), ...opcoes });
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

/** Lista editável de produtos ou seguradoras. */
export function useCatalogo(tipo: TipoCatalogo) {
  const { catalogos } = useServicos();
  const consulta = useQuery({ queryKey: ['catalogos', tipo], queryFn: () => catalogos.obter(tipo) });
  return consulta.data ?? [];
}

/**
 * Tudo o que os relatórios de comissão precisam, já filtrado pelo que o usuário pode ver. O cliente
 * aparece com o nome completo do cadastro quando a proposta está ligada a ele (a proposta pode ter
 * sido lançada só com o primeiro nome).
 */
export function useDadosComissao() {
  const s = useServicos();
  const propostas = useColecao<Proposta>('propostas', s.propostas);
  const estornos = useColecao<Estorno>('estornos', s.estornos);
  const vales = useColecao<Vale>('vales', s.vales);
  const pagamentos = useColecao<PagamentoProdutor>('pagamentos', s.pagamentos);
  const clientes = useColecao<Cliente>('clientes', s.clientes);
  const comNomeCompleto = useMemo(() => {
    const nomes = new Map((clientes.data ?? []).map((c) => [c.id, c.nome]));
    return (propostas.data ?? []).map((p) => {
      const nome = p.clienteId ? nomes.get(p.clienteId) : undefined;
      return nome && nome !== p.clienteNome ? { ...p, clienteNome: nome } : p;
    });
  }, [propostas.data, clientes.data]);
  return {
    carregando: propostas.isPending || estornos.isPending || vales.isPending || pagamentos.isPending,
    dados: {
      propostas: comNomeCompleto,
      estornos: estornos.data ?? [],
      vales: vales.data ?? [],
      pagamentos: pagamentos.data ?? [],
    },
  };
}

/** Propostas aguardando aprovação (só faz sentido para a administração). */
export function usePendentesAprovacao(): number {
  const { propostas } = useServicos();
  const usuario = useUsuario();
  const consulta = useQuery({
    queryKey: ['propostas', usuario.id],
    queryFn: () => propostas.listar(usuario),
    enabled: pode(usuario, 'financeiro:gerenciar'),
  });
  return (consulta.data ?? []).filter((p) => p.status === 'pendente').length;
}
