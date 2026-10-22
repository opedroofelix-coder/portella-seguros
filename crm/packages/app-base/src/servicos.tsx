import type {
  Cliente,
  GatewayAutenticacao,
  Oportunidade,
  Repositorio,
  Usuario,
} from '@portella/core';
import {
  ServicoAutenticacao,
  ServicoCarteira,
  ServicoUsuarios,
  validarCliente,
  validarOportunidade,
} from '@portella/core';
import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';

/** Casos de uso comuns aos dois CRMs. Cada app estende com os seus (apólices, cotas…). */
export interface ServicosBase {
  autenticacao: ServicoAutenticacao;
  usuarios: ServicoUsuarios;
  clientes: ServicoCarteira<Cliente>;
  oportunidades: ServicoCarteira<Oportunidade>;
}

export interface RepositoriosBase {
  auth: GatewayAutenticacao;
  usuarios: Repositorio<Usuario>;
  clientes: Repositorio<Cliente>;
  oportunidades: Repositorio<Oportunidade>;
}

export function montarServicosBase(r: RepositoriosBase): ServicosBase {
  return {
    autenticacao: new ServicoAutenticacao(r.auth, r.usuarios),
    usuarios: new ServicoUsuarios(r.usuarios, r.auth),
    clientes: new ServicoCarteira<Cliente>(r.clientes, validarCliente),
    oportunidades: new ServicoCarteira<Oportunidade>(r.oportunidades, validarOportunidade),
  };
}

const Contexto = createContext<ServicosBase | null>(null);

export function ProvedorServicos<S extends ServicosBase>({ servicos, children }: { servicos: S; children: ReactNode }) {
  return <Contexto.Provider value={servicos}>{children}</Contexto.Provider>;
}

/** Injeção de dependências: a apresentação só conhece os casos de uso, nunca a infraestrutura. */
export function useServicos<S extends ServicosBase = ServicosBase>(): S {
  const s = useContext(Contexto);
  if (!s) throw new Error('useServicos precisa estar dentro de <ProvedorServicos>.');
  return s as S;
}
