import type {
  Catalogo,
  Cliente,
  Estorno,
  GatewayAutenticacao,
  Oportunidade,
  PagamentoProdutor,
  Proposta,
  Repositorio,
  TipoCatalogo,
  Usuario,
  Vale,
} from '@portella/core';
import {
  ServicoAutenticacao,
  ServicoCarteira,
  ServicoCatalogos,
  ServicoLancamentosGestao,
  ServicoOportunidades,
  ServicoPropostas,
  ServicoUsuarios,
  validarCliente,
  validarEstorno,
  validarOportunidade,
  validarPagamento,
  validarVale,
} from '@portella/core';
import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';

/** Casos de uso comuns aos dois CRMs. Cada app estende com os seus (apólices, cotas…). */
export interface ServicosBase {
  autenticacao: ServicoAutenticacao;
  usuarios: ServicoUsuarios;
  clientes: ServicoCarteira<Cliente>;
  oportunidades: ServicoOportunidades;
  propostas: ServicoPropostas;
  estornos: ServicoLancamentosGestao<Estorno>;
  vales: ServicoLancamentosGestao<Vale>;
  pagamentos: ServicoLancamentosGestao<PagamentoProdutor>;
  catalogos: ServicoCatalogos;
}

export interface RepositoriosBase {
  auth: GatewayAutenticacao;
  usuarios: Repositorio<Usuario>;
  clientes: Repositorio<Cliente>;
  oportunidades: Repositorio<Oportunidade>;
  propostas: Repositorio<Proposta>;
  estornos: Repositorio<Estorno>;
  vales: Repositorio<Vale>;
  pagamentos: Repositorio<PagamentoProdutor>;
  catalogos: Repositorio<Catalogo>;
}

/** Coleções de cada app (para o IndexedDB e para a limpeza). */
export const COLECOES_BASE = [
  'clientes',
  'oportunidades',
  'propostas',
  'estornos',
  'vales',
  'pagamentos',
  'catalogos',
] as const;

export function montarServicosBase(
  r: RepositoriosBase,
  catalogosPadrao: Record<TipoCatalogo, string[]>,
): ServicosBase {
  const usuarios = new ServicoUsuarios(r.usuarios, r.auth);
  return {
    autenticacao: new ServicoAutenticacao(r.auth, r.usuarios),
    usuarios,
    clientes: new ServicoCarteira<Cliente>(r.clientes, validarCliente),
    oportunidades: new ServicoOportunidades(r.oportunidades, validarOportunidade, () => usuarios.listar()),
    propostas: new ServicoPropostas(r.propostas),
    estornos: new ServicoLancamentosGestao<Estorno>(r.estornos, validarEstorno),
    vales: new ServicoLancamentosGestao<Vale>(r.vales, validarVale),
    pagamentos: new ServicoLancamentosGestao<PagamentoProdutor>(r.pagamentos, validarPagamento),
    catalogos: new ServicoCatalogos(r.catalogos, catalogosPadrao),
  };
}

const Contexto = createContext<ServicosBase | null>(null);

export function ProvedorServicos<S extends ServicosBase>({
  servicos,
  children,
}: {
  servicos: S;
  children: ReactNode;
}) {
  return <Contexto.Provider value={servicos}>{children}</Contexto.Provider>;
}

/** Injeção de dependências: a apresentação só conhece os casos de uso, nunca a infraestrutura. */
export function useServicos<S extends ServicosBase = ServicosBase>(): S {
  const s = useContext(Contexto);
  if (!s) throw new Error('useServicos precisa estar dentro de <ProvedorServicos>.');
  return s as S;
}
