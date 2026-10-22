import { diasEntre, hojeISO } from '@portella/core';
import type { TomSelo } from '@portella/ui';
import { Selo } from '@portella/ui';
import type { Apolice, StatusRenovacao } from '../../domain/apolice';
import { ROTULO_RENOVACAO, ROTULO_SITUACAO, situacao } from '../../domain/apolice';

const TOM = { vigente: 'sucesso', a_vencer: 'alerta', vencida: 'perigo', cancelada: 'neutro' } as const;

export function SeloSituacao({ apolice }: { apolice: Apolice }) {
  const hoje = hojeISO();
  const s = situacao(apolice, hoje);
  if (s === 'a_vencer') {
    const dias = diasEntre(hoje, apolice.fimVigencia!);
    return (
      <Selo tom="alerta">{dias === 0 ? 'Vence hoje' : `Vence em ${dias} dia${dias > 1 ? 's' : ''}`}</Selo>
    );
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
