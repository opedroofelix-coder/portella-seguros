import type { Acao, Cliente, ProdutorInicial, Usuario } from '@portella/core';
import type { ItemMenu } from '@portella/ui';
import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';

export interface ItemMenuApp extends ItemMenu {
  /** Só aparece para quem tem esta permissão. */
  acao?: Acao;
}

export interface PreviaImportacao {
  resumo: Array<[string, number]>;
  avisos: string[];
  confirmar: () => Promise<void>;
}

export interface Importacao {
  descricao: string;
  analisar: (dados: unknown, usuario: Usuario, equipe: Usuario[]) => Promise<PreviaImportacao>;
}

export interface ConfigApp {
  /** Nome curto do sistema ("Seguros", "Consórcio"). */
  sistema: string;
  logo: string;
  menu: ItemMenuApp[];
  /** Produtos oferecidos no funil de vendas. */
  produtos: string[];
  /** Como o funil é chamado no app ("Cotações", "Propostas"). */
  nomeFunil: string;
  /** Seções extras na ficha do cliente (ex.: apólices, cotas). */
  importacao?: Importacao;
  /** Produtores cadastrados no primeiro acesso, com senha 1234. */
  produtoresIniciais?: ProdutorInicial[];
  abasCliente?: Array<{ id: string; rotulo: string; render: (cliente: Cliente) => ReactNode }>;
  /**
   * 'refinada' liga a revisão de UX nas telas comuns: confirmações antes de excluir, campos de R$ e %
   * com máscara, pilha de modais, avisos de erro que não somem… Sem ela, as telas ficam como eram.
   */
  interface?: 'refinada';
}

const Contexto = createContext<ConfigApp | null>(null);

export function ProvedorConfig({ config, children }: { config: ConfigApp; children: ReactNode }) {
  return <Contexto.Provider value={config}>{children}</Contexto.Provider>;
}

export function useConfig(): ConfigApp {
  const c = useContext(Contexto);
  if (!c) throw new Error('useConfig precisa estar dentro de <ProvedorConfig>.');
  return c;
}

/** A revisão de UX está ligada neste app? */
export const useRefinada = () => useConfig().interface === 'refinada';
