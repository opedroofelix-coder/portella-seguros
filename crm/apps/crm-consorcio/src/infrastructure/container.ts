import type { Cliente, LancamentoComissao, Oportunidade, Usuario } from '@portella/core';
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

const NOME_BANCO = 'portella-crm-consorcio';

/**
 * Raiz de composição: liga os casos de uso à infraestrutura escolhida.
 * Para usar um backend (Supabase, API própria…), troque apenas este arquivo.
 */
export async function criarServicos(): Promise<ServicosConsorcio> {
  const banco = await BancoLocal.abrir(
    NOME_BANCO,
    ['clientes', 'oportunidades', 'cotas', 'lances', 'comissoes'],
    2,
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
    comissoes: banco.repositorio<LancamentoComissao>('comissoes'),
    cotas: banco.repositorio<Cota>('cotas'),
    lances: banco.repositorio<Lance>('lances'),
  });
}
