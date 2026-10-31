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
  armazenamentoDoNavegador,
  AutenticacaoLocal,
  BancoLocal,
  COLECAO_CREDENCIAIS,
  COLECAO_USUARIOS,
} from '@portella/infra-local';
import type { ServicosConsorcio } from '../application/servicos';
import { montarServicos } from '../application/servicos';
import type { Cota } from '../domain/cota';
import type { Lance } from '../domain/lance';

export const NOME_BANCO = 'portella-crm-consorcio';

type FabricaRepositorio = <T extends { id: string }>(colecao: string) => Repositorio<T>;

export interface OpcoesBanco {
  /** Nome do banco no navegador (a demonstração usa um banco separado). */
  nome?: string;
  memoriaSeFalhar?: boolean;
}

/**
 * Raiz de composição: liga os casos de uso à infraestrutura escolhida.
 * Para usar um backend (Supabase, API própria…), troque apenas este arquivo.
 */
export async function criarServicos(opcoes: OpcoesBanco = {}): Promise<ServicosConsorcio> {
  const nome = opcoes.nome ?? NOME_BANCO;
  let repo: FabricaRepositorio;
  let auth: GatewayAutenticacao;
  try {
    const banco = await BancoLocal.abrir(nome, [...COLECOES_BASE, 'cotas', 'lances'], 4);
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
    propostas: repo<Proposta>('propostas'),
    estornos: repo<Estorno>('estornos'),
    vales: repo<Vale>('vales'),
    pagamentos: repo<PagamentoProdutor>('pagamentos'),
    catalogos: repo<Catalogo>('catalogos'),
    checklist: repo<ItemChecklist>('checklist'),
    recados: repo<Recado>('recados'),
    cotas: repo<Cota>('cotas'),
    lances: repo<Lance>('lances'),
  });
}
