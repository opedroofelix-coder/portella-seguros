import { diasEntre, formatarData, hojeISO } from '@portella/core';
import type { TomSelo } from '@portella/ui';
import { Selo } from '@portella/ui';
import type { Apolice, Situacao, StatusRenovacao } from '../../domain/apolice';
import { ROTULO_RENOVACAO, ROTULO_SITUACAO, situacao } from '../../domain/apolice';

const TOM: Record<Situacao, TomSelo> = {
  a_iniciar: 'neutro',
  vigente: 'sucesso',
  a_vencer: 'alerta',
  vencida: 'perigo',
  renovada: 'dourado',
  cancelada: 'neutro',
};

export function SeloSituacao({ apolice }: { apolice: Apolice }) {
  const hoje = hojeISO();
  const s = situacao(apolice, hoje);
  if (s === 'a_vencer') {
    const dias = diasEntre(hoje, apolice.fimVigencia!);
    return (
      <Selo tom="alerta">{dias === 0 ? 'Vence hoje' : `Vence em ${dias} dia${dias > 1 ? 's' : ''}`}</Selo>
    );
  }
  if (s === 'a_iniciar') {
    return <Selo tom="neutro">Começa em {formatarData(apolice.inicioVigencia)}</Selo>;
  }
  return <Selo tom={TOM[s]}>{ROTULO_SITUACAO[s]}</Selo>;
}

const TOM_RENOVACAO: Record<StatusRenovacao, TomSelo> = {
  pendente: 'neutro',
  em_contato: 'info',
  renovada: 'dourado',
  nao_renovada: 'perigo',
};

export function SeloRenovacao({ status }: { status: StatusRenovacao }) {
  return <Selo tom={TOM_RENOVACAO[status]}>{ROTULO_RENOVACAO[status]}</Selo>;
}
