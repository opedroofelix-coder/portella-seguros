import { useColecao } from '@portella/app-base';
import type { Despesa, Fechamento, Movimento } from '../../../domain/financeiro';
import { useServicosSeguros } from '../../hooks';

export function useFinanceiro() {
  const { movimentos, despesas, fechamentos } = useServicosSeguros();
  return {
    movimentos: useColecao<Movimento>('movimentos', movimentos),
    despesas: useColecao<Despesa>('despesas', despesas),
    fechamentos: useColecao<Fechamento>('fechamentos', fechamentos),
  };
}

const NOME_MES = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
export const rotuloMes = (mes: string) => {
  const t = NOME_MES.format(new Date(`${mes}-15T00:00:00Z`));
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const CURTO = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' });
export const rotuloMesCurto = (mes: string) => CURTO.format(new Date(`${mes}-15T00:00:00Z`)).replace('.', '');

/** Meses (AAAA-MM) presentes nas datas, do mais recente para o mais antigo. */
export const mesesDe = (datas: Array<string | undefined>) =>
  [...new Set(datas.filter(Boolean).map((d) => d!.slice(0, 7)))].sort().reverse();
