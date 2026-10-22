import { COLECOES_BASE } from '@portella/app-base';
import type {
  Catalogo,
  Cliente,
  Estorno,
  Oportunidade,
  PagamentoProdutor,
  Proposta,
  Usuario,
  Vale,
} from '@portella/core';
import type { Credencial } from '@portella/infra-local';
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

const NOME_BANCO = 'portella-crm-seguros';

/**
 * Raiz de composição: liga os casos de uso à infraestrutura escolhida.
 * Para usar um backend (Supabase, API própria…), troque apenas este arquivo.
 */
export async function criarServicos(): Promise<ServicosSeguros> {
  const banco = await BancoLocal.abrir(
    NOME_BANCO,
    [...COLECOES_BASE, 'apolices', 'movimentos', 'despesas', 'fechamentos'],
    3,
  );
  return montarServicos({
    auth: new AutenticacaoLocal(
      banco.repositorio<Credencial>(COLECAO_CREDENCIAIS),
      armazenamentoDoNavegador(),
      `${NOME_BANCO}:sessao`,
    ),
    usuarios: banco.repositorio<Usuario>(COLECAO_USUARIOS),
    clientes: banco.repositorio<Cliente>('clientes'),
    oportunidades: banco.repositorio<Oportunidade>('oportunidades'),
    apolices: banco.repositorio<Apolice>('apolices'),
    propostas: banco.repositorio<Proposta>('propostas'),
    estornos: banco.repositorio<Estorno>('estornos'),
    vales: banco.repositorio<Vale>('vales'),
    pagamentos: banco.repositorio<PagamentoProdutor>('pagamentos'),
    catalogos: banco.repositorio<Catalogo>('catalogos'),
    movimentos: banco.repositorio<Movimento>('movimentos'),
    despesas: banco.repositorio<Despesa>('despesas'),
    fechamentos: banco.repositorio<Fechamento>('fechamentos'),
  });
}
