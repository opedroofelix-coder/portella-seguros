import type { RepositoriosBase, ServicosBase } from '@portella/app-base';
import { montarServicosBase } from '@portella/app-base';
import type { Repositorio } from '@portella/core';
import { ServicoCarteira } from '@portella/core';
import type { Cota } from '../domain/cota';
import { validarCota } from '../domain/cota';
import type { Lance } from '../domain/lance';
import { validarLance } from '../domain/lance';

export interface ServicosConsorcio extends ServicosBase {
  cotas: ServicoCarteira<Cota>;
  lances: ServicoCarteira<Lance>;
}

export function montarServicos(
  repos: RepositoriosBase & { cotas: Repositorio<Cota>; lances: Repositorio<Lance> },
): ServicosConsorcio {
  return {
    ...montarServicosBase(repos),
    cotas: new ServicoCarteira<Cota>(repos.cotas, validarCota),
    lances: new ServicoCarteira<Lance>(repos.lances, validarLance),
  };
}
