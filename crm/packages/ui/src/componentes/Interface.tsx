import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';

/**
 * Comportamentos novos dos componentes (pilha de modais, alterações não salvas, cliques dentro de
 * linhas, menu do celular inerte…). Desligado por padrão: cada app liga quando quiser.
 */
export interface OpcoesInterface {
  refinada: boolean;
}

const Contexto = createContext<OpcoesInterface>({ refinada: false });

export function ProvedorInterface({ refinada, children }: OpcoesInterface & { children: ReactNode }) {
  return <Contexto.Provider value={{ refinada }}>{children}</Contexto.Provider>;
}

export const useInterface = () => useContext(Contexto);
