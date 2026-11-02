import { COLECOES_BASE } from '@portella/app-base';
import type {
  Catalogo,
  Cliente,
  Estorno,
  ItemChecklist,
  Recado,
  Oportunidade,
  PagamentoProdutor,
  Proposta,
  Usuario,
  Vale,
  GatewayAutenticacao,
  Repositorio,
} from '@portella/core';
import { AutenticacaoMemoria, RepositorioMemoria } from '@portella/core';
import type { Credencial } from '@portella/infra-local';
import {
  AutenticacaoSupabase,
  criarClienteSupabase,
  RepositorioSupabase,
  RepositorioUsuariosSupabase,
} from '@portella/infra-supabase';
import {
  armazenamentoDoNavegador,
  AutenticacaoLocal,
  BancoLocal,
  COLECAO_CREDENCIAIS,
  COLECAO_USUARIOS,
} from '@portella/infra-local';
import type { ServicosSeguros } from '../application/servicos';
import { montarServicos } from '../application/servicos';
import type { Apolice } from '../domain/apolice';
import type { Despesa, Fechamento, Movimento } from '../domain/financeiro';

export const NOME_BANCO = 'portella-crm-seguros';

type FabricaRepositorio = <T extends { id: string }>(colecao: string) => Repositorio<T>;

export interface OpcoesBanco {
  /** Nome do banco no navegador (a demonstração usa um banco separado). */
  nome?: string;
  memoriaSeFalhar?: boolean;
}

/** Projeto do Supabase (apps/crm-seguros/.env.production). Sem ele, os dados ficam no navegador. */
export function configuracaoSupabase(): { url: string; chave: string } | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const chave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  return url && chave ? { url, chave } : null;
}

/** Dados compartilhados pela equipe no Supabase; as regras de acesso ficam no banco (RLS). */
export function criarServicosSupabase(config: { url: string; chave: string }): ServicosSeguros {
  const cliente = criarClienteSupabase(config.url, config.chave, `${NOME_BANCO}:auth`);
  const repo = <T extends { id: string }>(tabela: string): Repositorio<T> =>
    new RepositorioSupabase<T>(cliente, tabela);
  return montarServicos({
    auth: new AutenticacaoSupabase(cliente),
    usuarios: new RepositorioUsuariosSupabase(cliente),
    clientes: repo<Cliente>('clientes'),
    oportunidades: repo<Oportunidade>('oportunidades'),
    apolices: repo<Apolice>('apolices'),
    propostas: repo<Proposta>('propostas'),
    estornos: repo<Estorno>('estornos'),
    vales: repo<Vale>('vales'),
    pagamentos: repo<PagamentoProdutor>('pagamentos'),
    catalogos: repo<Catalogo>('catalogos'),
    checklist: repo<ItemChecklist>('checklist'),
    recados: repo<Recado>('recados'),
    movimentos: repo<Movimento>('movimentos'),
    despesas: repo<Despesa>('despesas'),
    fechamentos: repo<Fechamento>('fechamentos'),
  });
}

/**
 * Raiz de composição: liga os casos de uso à infraestrutura escolhida.
 * Esta versão guarda os dados no navegador (IndexedDB): desenvolvimento, testes e demonstração.
 * A publicação usa criarServicosSupabase.
 */
export async function criarServicos(opcoes: OpcoesBanco = {}): Promise<ServicosSeguros> {
  const nome = opcoes.nome ?? NOME_BANCO;
  let repo: FabricaRepositorio;
  let auth: GatewayAutenticacao;
  try {
    const banco = await BancoLocal.abrir(
      nome,
      [...COLECOES_BASE, 'apolices', 'movimentos', 'despesas', 'fechamentos'],
      4,
    );
    repo = (colecao) => banco.repositorio(colecao);
    auth = new AutenticacaoLocal(
      repo<Credencial>(COLECAO_CREDENCIAIS),
      armazenamentoDoNavegador(),
      `${nome}:sessao`,
    );
  } catch (erro) {
    // Na demonstração, se o navegador não liberar o IndexedDB (ex.: dentro de outra página),
    // os dados ficam só na memória até a página ser recarregada.
    if (!opcoes.memoriaSeFalhar) throw erro;
    const memoria = new Map<string, Repositorio<{ id: string }>>();
    repo = <T extends { id: string }>(colecao: string) => {
      if (!memoria.has(colecao)) memoria.set(colecao, new RepositorioMemoria<{ id: string }>());
      return memoria.get(colecao) as unknown as Repositorio<T>;
    };
    auth = new AutenticacaoMemoria();
  }
  return montarServicos({
    auth,
    usuarios: repo<Usuario>(COLECAO_USUARIOS),
    clientes: repo<Cliente>('clientes'),
    oportunidades: repo<Oportunidade>('oportunidades'),
    apolices: repo<Apolice>('apolices'),
    propostas: repo<Proposta>('propostas'),
    estornos: repo<Estorno>('estornos'),
    vales: repo<Vale>('vales'),
    pagamentos: repo<PagamentoProdutor>('pagamentos'),
    catalogos: repo<Catalogo>('catalogos'),
    checklist: repo<ItemChecklist>('checklist'),
    recados: repo<Recado>('recados'),
    movimentos: repo<Movimento>('movimentos'),
    despesas: repo<Despesa>('despesas'),
    fechamentos: repo<Fechamento>('fechamentos'),
  });
}
