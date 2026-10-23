import { describe, expect, it } from 'vitest';
import type { Usuario } from '../domain/usuario';
import { enxerga, pode } from './permissoes';

const u = (perfil: Usuario['perfil'], ativo = true) => ({ id: perfil, perfil, ativo });

describe('permissões por perfil', () => {
  it('administrador pode tudo', () => {
    expect(pode(u('admin'), 'usuarios:gerenciar')).toBe(true);
    expect(pode(u('admin'), 'dados:importar')).toBe(true);
  });

  it('gestor vê e edita toda a carteira, mas não gerencia usuários nem importa', () => {
    expect(pode(u('gestor'), 'carteira:ver_todos')).toBe(true);
    expect(pode(u('gestor'), 'registro:editar', { responsavelId: 'outro' })).toBe(true);
    expect(pode(u('gestor'), 'usuarios:gerenciar')).toBe(false);
    expect(pode(u('gestor'), 'dados:importar')).toBe(false);
  });

  it('corretor só edita a própria carteira e não remove nem transfere', () => {
    const c = u('corretor');
    expect(pode(c, 'registro:criar')).toBe(true);
    expect(pode(c, 'registro:editar', { responsavelId: 'corretor' })).toBe(true);
    expect(pode(c, 'registro:editar', { responsavelId: 'outro' })).toBe(false);
    expect(pode(c, 'registro:remover', { responsavelId: 'corretor' })).toBe(false);
    expect(pode(c, 'registro:transferir')).toBe(false);
    expect(enxerga(c, { responsavelId: 'outro' })).toBe(false);
    expect(enxerga(c, { responsavelId: 'corretor' })).toBe(true);
  });

  it('usuário inativo ou ausente não pode nada', () => {
    expect(pode(u('admin', false), 'registro:criar')).toBe(false);
    expect(pode(null, 'registro:criar')).toBe(false);
  });
});
