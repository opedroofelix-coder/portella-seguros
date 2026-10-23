import type { Acao } from '@portella/core';
import { CabecalhoPagina, Carregando, classesBotao, EstadoVazio } from '@portella/ui';
import type { ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useRefinada } from '../config';
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
  const refinada = useRefinada();
  if (!pode(acao) && refinada) {
    return (
      <>
        <CabecalhoPagina titulo="Acesso restrito" />
        <EstadoVazio
          titulo="Esta tela é da administração"
          acao={
            <Link className={classesBotao({ variante: 'secundario' })} to="/">
              Voltar ao painel
            </Link>
          }
        >
          Se precisar destes dados, peça à administradora da corretora.
        </EstadoVazio>
      </>
    );
  }
  if (!pode(acao)) {
    return (
      <EstadoVazio titulo="Acesso restrito">Esta área é exclusiva para outro perfil de usuário.</EstadoVazio>
    );
  }
  return <>{children}</>;
}
