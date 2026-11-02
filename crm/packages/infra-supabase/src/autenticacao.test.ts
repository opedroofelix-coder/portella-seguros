import type { Usuario } from '@portella/core';
import { ErroAutenticacao, ErroPermissao, ErroValidacao } from '@portella/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { AutenticacaoSupabase, emailDoLogin } from './autenticacao';

function clienteFalso(opcoes: {
  login?: { user: { id: string } | null; error: { message: string } | null };
  usuarioId?: string | null;
  sessao?: string | null;
  funcao?: { status: number; corpo: unknown } | null;
}) {
  const consulta = {
    select: () => consulta,
    eq: () => consulta,
    maybeSingle: async () => ({ data: opcoes.usuarioId ? { id: opcoes.usuarioId } : null, error: null }),
  };
  const invoke = vi.fn(async (_nome: string, _opcoes: unknown) =>
    opcoes.funcao
      ? {
          data: null,
          error: {
            context: new Response(JSON.stringify(opcoes.funcao.corpo), { status: opcoes.funcao.status }),
          },
        }
      : { data: { ok: true }, error: null },
  );
  const signInWithPassword = vi.fn(async () => ({
    data: { user: opcoes.login?.user ?? null },
    error: opcoes.login?.error ?? null,
  }));
  const updateUser = vi.fn(async () => ({ data: {}, error: null }));
  const cliente = {
    from: () => consulta,
    rpc: async () => ({ data: true, error: null }),
    functions: { invoke },
    auth: {
      signInWithPassword,
      updateUser,
      signOut: vi.fn(async () => ({ error: null })),
      getSession: async () => ({
        data: { session: opcoes.sessao ? { user: { id: opcoes.sessao } } : null },
      }),
    },
  } as unknown as SupabaseClient;
  return { cliente, invoke, signInWithPassword, updateUser };
}

const usuario: Usuario = {
  id: 'u2',
  nome: 'Mary',
  login: 'mary',
  perfil: 'corretor',
  ativo: true,
  criadoEm: '2026-11-02T10:00:00.000Z',
  trocarSenha: true,
};

describe('AutenticacaoSupabase', () => {
  it('login do CRM vira e-mail interno; e-mail continua o mesmo', () => {
    expect(emailDoLogin('gisele')).toBe('gisele@crm.portellacorretora.com.br');
    expect(emailDoLogin('ana@x.com')).toBe('ana@x.com');
  });

  it('confere a senha pelo Auth e devolve o id do cadastro', async () => {
    const f = clienteFalso({ login: { user: { id: 'auth-1' }, error: null }, usuarioId: 'u1' });
    await expect(new AutenticacaoSupabase(f.cliente).verificarCredenciais('gisele', 'x')).resolves.toBe('u1');
    expect(f.signInWithPassword).toHaveBeenCalledWith({
      email: 'gisele@crm.portellacorretora.com.br',
      password: 'x',
    });
  });

  it('senha errada ou login sem cadastro no CRM: ErroAutenticacao', async () => {
    const errada = clienteFalso({ login: { user: null, error: { message: 'Invalid login credentials' } } });
    await expect(new AutenticacaoSupabase(errada.cliente).verificarCredenciais('a', 'b')).rejects.toThrow(
      ErroAutenticacao,
    );
    const semCadastro = clienteFalso({ login: { user: { id: 'auth-9' }, error: null }, usuarioId: null });
    await expect(
      new AutenticacaoSupabase(semCadastro.cliente).verificarCredenciais('a', 'b'),
    ).rejects.toThrow(ErroAutenticacao);
  });

  it('a própria senha troca no Auth; a de outra pessoa passa pela função (senha padrão)', async () => {
    const f = clienteFalso({ sessao: 'auth-1', usuarioId: 'u1' });
    const auth = new AutenticacaoSupabase(f.cliente);
    await auth.definirSenha({ id: 'u1', login: 'gisele' }, 'nova-senha');
    expect(f.updateUser).toHaveBeenCalledWith({ password: 'nova-senha' });
    await auth.definirSenha({ id: 'u2', login: 'mary' }, 'qualquer');
    expect(f.invoke).toHaveBeenCalledWith('usuarios', { body: { acao: 'redefinir-senha', usuarioId: 'u2' } });
  });

  it('cadastro novo vai para a função, sem mandar senha quando é a padrão', async () => {
    const f = clienteFalso({});
    await new AutenticacaoSupabase(f.cliente).cadastrarUsuario(usuario, undefined, false);
    expect(f.invoke).toHaveBeenCalledWith('usuarios', {
      body: {
        acao: 'criar',
        usuario: { nome: 'Mary', criadoEm: usuario.criadoEm, id: 'u2', login: 'mary', perfil: 'corretor' },
      },
    });
  });

  it('primeiro acesso cria o administrador e já entra com ele', async () => {
    const f = clienteFalso({ login: { user: { id: 'auth-1' }, error: null }, usuarioId: 'u1' });
    await new AutenticacaoSupabase(f.cliente).cadastrarUsuario(
      { ...usuario, id: 'u1', login: 'deliziane', perfil: 'admin' },
      'senha-forte',
      true,
    );
    expect(f.invoke.mock.calls[0]?.[1]).toMatchObject({ body: { acao: 'configurar', senha: 'senha-forte' } });
    expect(f.signInWithPassword).toHaveBeenCalled();
  });

  it('respostas de erro da função viram erros do CRM', async () => {
    const repetido = clienteFalso({
      funcao: { status: 409, corpo: { erro: 'Já existe um usuário com este login.' } },
    });
    const e = await new AutenticacaoSupabase(repetido.cliente)
      .cadastrarUsuario(usuario, undefined, false)
      .catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ErroValidacao);
    expect((e as ErroValidacao).campos).toEqual({ login: 'Login já cadastrado.' });

    const negado = clienteFalso({
      funcao: { status: 403, corpo: { erro: 'Só o administrador pode fazer isso.' } },
    });
    await expect(
      new AutenticacaoSupabase(negado.cliente).cadastrarUsuario(usuario, undefined, false),
    ).rejects.toThrow(ErroPermissao);
  });
});
