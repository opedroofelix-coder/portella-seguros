import type { DadosRegistro, ServicoCarteira, Usuario } from '@portella/core';
import { hojeISO, somarMeses } from '@portella/core';
import type { Apolice } from '../domain/apolice';

/** Dados sugeridos para a apólice nova: mesmo cliente, ramo e bem, vigência de 12 meses a partir do fim da atual. */
export function sugerirRenovacao(a: Apolice): DadosRegistro<Apolice> {
  const inicio = a.fimVigencia ?? hojeISO();
  return {
    clienteId: a.clienteId,
    seguradora: a.seguradora,
    ramo: a.ramo,
    item: a.item,
    inicioVigencia: inicio,
    fimVigencia: somarMeses(inicio, 12),
    comissaoPercentual: a.comissaoPercentual,
    formaPagamento: a.formaPagamento,
    renovacao: 'pendente',
    responsavelId: a.responsavelId,
  };
}

/** Registra a renovação: cria a apólice nova e marca a anterior como renovada. */
export async function renovarApolice(
  servico: ServicoCarteira<Apolice>,
  usuario: Usuario,
  anterior: Apolice,
  nova: DadosRegistro<Apolice>,
): Promise<Apolice> {
  const criada = await servico.salvar(usuario, { ...nova, renovacao: 'pendente' });
  await servico.salvar(usuario, { ...anterior, renovacao: 'renovada' });
  return criada;
}
