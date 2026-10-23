import type { RepositoriosBase, ServicosBase } from '@portella/app-base';
import { CATALOGOS_PADRAO, montarServicosBase } from '@portella/app-base';
import type { Repositorio } from '@portella/core';
import { ServicoCarteira, ServicoFinanceiro } from '@portella/core';
import type { Apolice } from '../domain/apolice';
import { validarApolice } from '../domain/apolice';
import type { Despesa, Fechamento, Movimento } from '../domain/financeiro';
import { validarDespesa, validarFechamento, validarMovimento } from '../domain/financeiro';

export interface ServicosSeguros extends ServicosBase {
  apolices: ServicoCarteira<Apolice>;
  movimentos: ServicoFinanceiro<Movimento>;
  despesas: ServicoFinanceiro<Despesa>;
  fechamentos: ServicoFinanceiro<Fechamento>;
}

export interface RepositoriosSeguros extends RepositoriosBase {
  apolices: Repositorio<Apolice>;
  movimentos: Repositorio<Movimento>;
  despesas: Repositorio<Despesa>;
  fechamentos: Repositorio<Fechamento>;
}

/** Listas iniciais do Seguros: as da Portella, sem "Liberty", que hoje é a Yelum (já na lista). */
export const CATALOGOS_SEGUROS = {
  ...CATALOGOS_PADRAO,
  seguradoras: CATALOGOS_PADRAO.seguradoras.filter((s) => s !== 'Liberty'),
};

export function montarServicos(repos: RepositoriosSeguros): ServicosSeguros {
  return {
    ...montarServicosBase(repos, CATALOGOS_SEGUROS),
    apolices: new ServicoCarteira<Apolice>(repos.apolices, validarApolice),
    movimentos: new ServicoFinanceiro<Movimento>(repos.movimentos, validarMovimento),
    despesas: new ServicoFinanceiro<Despesa>(repos.despesas, validarDespesa),
    fechamentos: new ServicoFinanceiro<Fechamento>(repos.fechamentos, validarFechamento),
  };
}
