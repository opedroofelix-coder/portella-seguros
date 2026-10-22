import type { Acao, Cliente, Usuario } from '@portella/core';
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
  abasCliente?: Array<{ id: string; rotulo: string; render: (cliente: Cliente) => ReactNode }>;
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
