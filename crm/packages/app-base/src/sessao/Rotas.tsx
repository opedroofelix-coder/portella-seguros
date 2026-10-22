import type { Acao } from '@portella/core';
import { Carregando, EstadoVazio } from '@portella/ui';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { TrocaObrigatoria } from '../paginas/MinhaConta';
import { useSessao } from './Sessao';

export function RotaProtegida({ children }: { children: ReactNode }) {
  const { usuario, carregando } = useSessao();
  const local = useLocation();
  if (carregando) return <Carregando />;
  if (!usuario) return <Navigate to="/entrar" replace state={{ de: local.pathname }} />;
  if (usuario.trocarSenha) return <TrocaObrigatoria />;
  return <>{children}</>;
}

export function ExigePermissao({ acao, children }: { acao: Acao; children: ReactNode }) {
  const { pode } = useSessao();
  if (!pode(acao)) {
    return (
      <EstadoVazio titulo="Acesso restrito">Esta área é exclusiva para outro perfil de usuário.</EstadoVazio>
    );
  }
  return <>{children}</>;
}
