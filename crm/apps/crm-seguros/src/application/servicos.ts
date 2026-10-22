import type { RepositoriosBase, ServicosBase } from '@portella/app-base';
import { montarServicosBase } from '@portella/app-base';
import type { Repositorio } from '@portella/core';
import { ServicoCarteira } from '@portella/core';
import type { Apolice } from '../domain/apolice';
import { validarApolice } from '../domain/apolice';

export interface ServicosSeguros extends ServicosBase {
  apolices: ServicoCarteira<Apolice>;
}

export function montarServicos(
  repos: RepositoriosBase & { apolices: Repositorio<Apolice> },
): ServicosSeguros {
  return {
    ...montarServicosBase(repos),
    apolices: new ServicoCarteira<Apolice>(repos.apolices, validarApolice),
  };
}
