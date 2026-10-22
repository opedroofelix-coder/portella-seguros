import type { Cliente, Oportunidade, Usuario } from '@portella/core';
import type { Credencial } from '@portella/infra-local';
import { armazenamentoDoNavegador, AutenticacaoLocal, BancoLocal, COLECAO_CREDENCIAIS, COLECAO_USUARIOS } from '@portella/infra-local';
import type { ServicosSeguros } from '../application/servicos';
import { montarServicos } from '../application/servicos';
import type { Apolice } from '../domain/apolice';

const NOME_BANCO = 'portella-crm-seguros';

/**
 * Raiz de composição: liga os casos de uso à infraestrutura escolhida.
 * Para usar um backend (Supabase, API própria…), troque apenas este arquivo.
 */
export async function criarServicos(): Promise<ServicosSeguros> {
  const banco = await BancoLocal.abrir(NOME_BANCO, ['clientes', 'oportunidades', 'apolices']);
  return montarServicos({
    auth: new AutenticacaoLocal(banco.repositorio<Credencial>(COLECAO_CREDENCIAIS), armazenamentoDoNavegador(), `${NOME_BANCO}:sessao`),
    usuarios: banco.repositorio<Usuario>(COLECAO_USUARIOS),
    clientes: banco.repositorio<Cliente>('clientes'),
    oportunidades: banco.repositorio<Oportunidade>('oportunidades'),
    apolices: banco.repositorio<Apolice>('apolices'),
  });
}
