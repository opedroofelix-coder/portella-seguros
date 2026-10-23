import type { Acao, Cliente, Perfil, ProdutorInicial, Usuario } from '@portella/core';
import { ROTULO_PERFIL } from '@portella/core';
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
  /**
   * 'topo': no computador largo, menu numa cápsula no alto, com busca rápida (Ctrl K) e o botão
   * "Nova proposta". Sem ela, menu lateral como sempre.
   */
  navegacao?: 'topo';
  /** Marca da cápsula do menu no topo (ícone e nome para fundo claro e escuro). */
  marca?: { icone: string; nomeClaro: string; nomeEscuro: string };
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

/** Nome do perfil na tela: com a interface refinada, "Produtor" (o termo da Portella) no lugar de "Corretor". */
export function useRotuloPerfil() {
  const refinada = useRefinada();
  return (perfil: Perfil) => (refinada && perfil === 'corretor' ? 'Produtor' : ROTULO_PERFIL[perfil]);
}
