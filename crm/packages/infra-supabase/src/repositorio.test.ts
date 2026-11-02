import type { Usuario } from '@portella/core';
import { ErroPermissao } from '@portella/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { traduzirErro } from './erros';
import { dadosDoUsuario, paraUsuario, RepositorioSupabase, RepositorioUsuariosSupabase } from './repositorio';

type Resposta = { data: unknown; error: { code?: string; message?: string } | null };

/** Cliente simulado: registra as chamadas e responde na ordem da fila. */
function clienteFalso(respostas: Resposta[]) {
  const chamadas: Array<{ metodo: string; args: unknown[] }> = [];
  const consulta: Record<string, unknown> = {};
  for (const metodo of [
    'select',
    'order',
    'range',
    'eq',
    'update',
    'insert',
    'upsert',
    'delete',
    'maybeSingle',
  ]) {
    consulta[metodo] = (...args: unknown[]) => {
      chamadas.push({ metodo, args });
      return consulta;
    };
  }
  consulta.then = (ok: (r: Resposta) => unknown, falha: (e: unknown) => unknown) =>
    Promise.resolve(respostas.shift() ?? { data: null, error: null }).then(ok, falha);
  const cliente = {
    from: (tabela: string) => {
      chamadas.push({ metodo: 'from', args: [tabela] });
      return consulta;
    },
  } as unknown as SupabaseClient;
  return { cliente, chamadas };
}

describe('RepositorioSupabase', () => {
  it('lista de 1000 em 1000 até a última página', async () => {
    const pagina = (n: number, inicio: number) =>
      Array.from({ length: n }, (_, i) => ({ dados: { id: `c${inicio + i}` } }));
    const { cliente, chamadas } = clienteFalso([
      { data: pagina(1000, 0), error: null },
      { data: pagina(3, 1000), error: null },
    ]);
    const itens = await new RepositorioSupabase<{ id: string }>(cliente, 'clientes').listar();
    expect(itens).toHaveLength(1003);
    expect(chamadas.filter((c) => c.metodo === 'range').map((c) => c.args)).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });

  it('salvar atualiza quando existe e cria quando nada foi atualizado', async () => {
    const existe = clienteFalso([{ data: [{ id: 'a' }], error: null }]);
    await new RepositorioSupabase(existe.cliente, 'clientes').salvar({ id: 'a' });
    expect(existe.chamadas.some((c) => c.metodo === 'insert')).toBe(false);

    const novo = clienteFalso([
      { data: [], error: null },
      { data: null, error: null },
    ]);
    await new RepositorioSupabase(novo.cliente, 'clientes').salvar({ id: 'b' });
    expect(novo.chamadas.find((c) => c.metodo === 'insert')?.args[0]).toEqual({
      id: 'b',
      dados: { id: 'b' },
    });
  });

  it('erro da regra do banco vira ErroPermissao com a mensagem do gatilho', async () => {
    const { cliente } = clienteFalso([
      { data: null, error: { code: '42501', message: 'Só a administração aprova propostas.' } },
    ]);
    const salvar = new RepositorioSupabase(cliente, 'propostas').salvar({ id: 'p' });
    await expect(salvar).rejects.toThrow(ErroPermissao);
    await expect(salvar).rejects.toThrow('Só a administração aprova propostas.');
  });

  it('importação grava em lotes de 500', async () => {
    const { cliente, chamadas } = clienteFalso([]);
    const itens = Array.from({ length: 1200 }, (_, i) => ({ id: `x${i}` }));
    await new RepositorioSupabase(cliente, 'clientes').salvarVarios(itens);
    expect(chamadas.filter((c) => c.metodo === 'upsert').map((c) => (c.args[0] as unknown[]).length)).toEqual(
      [500, 500, 200],
    );
  });
});

describe('traduzirErro', () => {
  it('mensagem genérica da RLS vira o aviso padrão de permissão', () => {
    const e = traduzirErro({ code: '42501', message: 'new row violates row-level security policy' });
    expect(e).toBeInstanceOf(ErroPermissao);
    expect(e.message).toBe(new ErroPermissao().message);
  });
  it('registro de outra pessoa com o mesmo id não é sobrescrito', () => {
    expect(traduzirErro({ code: '23505', message: 'duplicate key' })).toBeInstanceOf(ErroPermissao);
  });
});

describe('usuários', () => {
  const usuario: Usuario = {
    id: 'u1',
    nome: 'Gisele',
    login: 'gisele',
    perfil: 'corretor',
    ativo: true,
    criadoEm: '2026-11-02T10:00:00.000Z',
    trocarSenha: true,
    percentualRepasse: 50,
    produtosAtendidos: ['Saúde'],
  };

  it('ida e volta entre o usuário do CRM e a linha do banco', () => {
    const linha = {
      id: 'u1',
      login: 'gisele',
      perfil: 'corretor' as const,
      ativo: true,
      trocar_senha: true,
      dados: dadosDoUsuario(usuario),
      criado_em: '2026-11-02T10:00:01Z',
    };
    expect(paraUsuario(linha)).toEqual(usuario);
  });

  it('ao trocar a própria senha, só a marca de senha provisória muda (o banco recusa outras mudanças)', async () => {
    const { cliente, chamadas } = clienteFalso([{ data: [{ id: 'u1' }], error: null }]);
    const { trocarSenha: _t, ...semMarca } = usuario;
    await new RepositorioUsuariosSupabase(cliente).salvar(semMarca);
    expect(chamadas.find((c) => c.metodo === 'update')?.args[0]).toEqual({
      perfil: 'corretor',
      ativo: true,
      trocar_senha: false,
      dados: dadosDoUsuario(usuario),
    });
  });

  it('sem linha atualizada (regra do banco), avisa falta de permissão', async () => {
    const { cliente } = clienteFalso([{ data: [], error: null }]);
    await expect(new RepositorioUsuariosSupabase(cliente).salvar(usuario)).rejects.toThrow(ErroPermissao);
  });
});
