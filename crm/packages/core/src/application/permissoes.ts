import { ErroPermissao } from '../domain/erros';
import type { Perfil } from '../domain/perfil';
import type { Usuario } from '../domain/usuario';

export type Acao =
  | 'usuarios:gerenciar'
  | 'dados:importar'
  | 'carteira:ver_todos'
  | 'relatorios:geral'
  | 'registro:criar'
  | 'registro:editar'
  | 'registro:remover'
  | 'registro:transferir';

/** Ações liberadas por perfil, sem olhar para o dono do registro. */
const REGRAS: Record<Perfil, ReadonlySet<Acao>> = {
  admin: new Set<Acao>([
    'usuarios:gerenciar',
    'dados:importar',
    'carteira:ver_todos',
    'relatorios:geral',
    'registro:criar',
    'registro:editar',
    'registro:remover',
    'registro:transferir',
  ]),
  gestor: new Set<Acao>([
    'carteira:ver_todos',
    'relatorios:geral',
    'registro:criar',
    'registro:editar',
    'registro:remover',
    'registro:transferir',
  ]),
  corretor: new Set<Acao>(['registro:criar']),
};

/** Ações que o corretor pode fazer apenas nos registros da própria carteira. */
const SO_PROPRIOS: ReadonlySet<Acao> = new Set<Acao>(['registro:editar']);

export function pode(
  usuario: Pick<Usuario, 'id' | 'perfil' | 'ativo'> | null | undefined,
  acao: Acao,
  recurso?: { responsavelId: string },
): boolean {
  if (!usuario?.ativo) return false;
  if (REGRAS[usuario.perfil].has(acao)) return true;
  return usuario.perfil === 'corretor' && SO_PROPRIOS.has(acao) && recurso?.responsavelId === usuario.id;
}

export function exigir(
  usuario: Pick<Usuario, 'id' | 'perfil' | 'ativo'> | null | undefined,
  acao: Acao,
  recurso?: { responsavelId: string },
): void {
  if (!pode(usuario, acao, recurso)) throw new ErroPermissao();
}

/** O registro aparece para o usuário? (admin e gestor veem tudo; corretor, só a própria carteira) */
export function enxerga(usuario: Pick<Usuario, 'id' | 'perfil' | 'ativo'>, recurso: { responsavelId: string }) {
  return pode(usuario, 'carteira:ver_todos') || (usuario.ativo && recurso.responsavelId === usuario.id);
}
