import type { Acao, Usuario } from '@portella/core';
import { pode } from '@portella/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useMemo } from 'react';
import { useServicos } from '../servicos';

interface EstadoSessao {
  usuario: Usuario | null;
  carregando: boolean;
  /** false enquanto não existir nenhum usuário (primeiro acesso). */
  configurado: boolean;
  entrar: (login: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
  atualizar: () => Promise<void>;
  pode: (acao: Acao, recurso?: { responsavelId: string }) => boolean;
}

const Contexto = createContext<EstadoSessao | null>(null);
export const CHAVE_SESSAO = ['sessao'] as const;

export function ProvedorSessao({ children }: { children: ReactNode }) {
  const { autenticacao, usuarios } = useServicos();
  const cliente = useQueryClient();
  const consulta = useQuery({
    queryKey: CHAVE_SESSAO,
    queryFn: async () => ({
      usuario: await autenticacao.usuarioAtual(),
      configurado: await usuarios.existeAlgum(),
    }),
    staleTime: Infinity,
  });

  const atualizar = useCallback(async () => {
    await cliente.refetchQueries({ queryKey: CHAVE_SESSAO });
  }, [cliente]);

  /** Ao trocar de usuário, descarta os dados em cache do anterior (menos a própria sessão). */
  const limparDados = useCallback(
    () => cliente.removeQueries({ predicate: (q) => q.queryKey[0] !== CHAVE_SESSAO[0] }),
    [cliente],
  );

  const entrar = useCallback(
    async (login: string, senha: string) => {
      await autenticacao.entrar(login, senha);
      limparDados();
      await atualizar();
    },
    [autenticacao, atualizar, limparDados],
  );

  const sair = useCallback(async () => {
    await autenticacao.sair();
    limparDados();
    await atualizar();
  }, [autenticacao, atualizar, limparDados]);

  const usuario = consulta.data?.usuario ?? null;
  const valor = useMemo<EstadoSessao>(
    () => ({
      usuario,
      carregando: consulta.isPending,
      configurado: consulta.data?.configurado ?? true,
      entrar,
      sair,
      atualizar,
      pode: (acao, recurso) => pode(usuario, acao, recurso),
    }),
    [usuario, consulta.isPending, consulta.data?.configurado, entrar, sair, atualizar],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSessao(): EstadoSessao {
  const s = useContext(Contexto);
  if (!s) throw new Error('useSessao precisa estar dentro de <ProvedorSessao>.');
  return s;
}

/** Usuário logado (só use dentro de rotas protegidas). */
export function useUsuario(): Usuario {
  const { usuario } = useSessao();
  if (!usuario) throw new Error('Nenhum usuário logado.');
  return usuario;
}
