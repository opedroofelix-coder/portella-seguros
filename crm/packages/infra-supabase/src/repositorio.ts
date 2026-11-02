import type { Repositorio, Usuario } from '@portella/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { traduzirErro } from './erros';

/** O PostgREST devolve no máximo 1000 linhas por pedido. */
const PAGINA = 1000;
const LOTE = 500;

/**
 * Coleção do CRM numa tabela do Supabase: o registro inteiro fica em `dados` (jsonb). Quem pode ler
 * ou gravar cada linha é decidido no banco (RLS); aqui só chega o que o usuário logado pode ver.
 */
export class RepositorioSupabase<T extends { id: string }> implements Repositorio<T> {
  constructor(
    private readonly cliente: SupabaseClient,
    private readonly tabela: string,
  ) {}

  async listar(): Promise<T[]> {
    const todos: T[] = [];
    for (let inicio = 0; ; inicio += PAGINA) {
      const { data, error } = await this.cliente
        .from(this.tabela)
        .select('dados')
        .order('id')
        .range(inicio, inicio + PAGINA - 1);
      if (error) throw traduzirErro(error);
      for (const linha of data ?? []) todos.push(linha.dados as T);
      if (!data || data.length < PAGINA) return todos;
    }
  }

  async obter(id: string): Promise<T | null> {
    const { data, error } = await this.cliente.from(this.tabela).select('dados').eq('id', id).maybeSingle();
    if (error) throw traduzirErro(error);
    return (data?.dados as T | undefined) ?? null;
  }

  /** Atualiza se já existe (e se a regra deixar); senão cria. */
  async salvar(item: T): Promise<void> {
    const { data, error } = await this.cliente
      .from(this.tabela)
      .update({ dados: item })
      .eq('id', item.id)
      .select('id');
    if (error) throw traduzirErro(error);
    if (data && data.length > 0) return;
    const { error: erroCriar } = await this.cliente.from(this.tabela).insert({ id: item.id, dados: item });
    if (erroCriar) throw traduzirErro(erroCriar);
  }

  /** Gravação em lote (importação da planilha, feita pela administração). */
  async salvarVarios(itens: T[]): Promise<void> {
    for (let i = 0; i < itens.length; i += LOTE) {
      const lote = itens.slice(i, i + LOTE).map((item) => ({ id: item.id, dados: item }));
      const { error } = await this.cliente.from(this.tabela).upsert(lote, { onConflict: 'id' });
      if (error) throw traduzirErro(error);
    }
  }

  async remover(id: string): Promise<void> {
    const { error } = await this.cliente.from(this.tabela).delete().eq('id', id);
    if (error) throw traduzirErro(error);
  }
}

interface LinhaUsuario {
  id: string;
  login: string;
  perfil: Usuario['perfil'];
  ativo: boolean;
  trocar_senha: boolean;
  dados: { nome?: string; criadoEm?: string; percentualRepasse?: number; produtosAtendidos?: string[] };
  criado_em: string;
}

const COLUNAS_USUARIO = 'id, login, perfil, ativo, trocar_senha, dados, criado_em';

export function paraUsuario(l: LinhaUsuario): Usuario {
  const { nome, criadoEm, percentualRepasse, produtosAtendidos } = l.dados ?? {};
  return {
    id: l.id,
    nome: nome ?? l.login,
    login: l.login,
    perfil: l.perfil,
    ativo: l.ativo,
    criadoEm: criadoEm ?? l.criado_em,
    ...(l.trocar_senha ? { trocarSenha: true } : {}),
    ...(percentualRepasse != null ? { percentualRepasse } : {}),
    ...(produtosAtendidos ? { produtosAtendidos } : {}),
  };
}

export function dadosDoUsuario(u: Usuario): LinhaUsuario['dados'] {
  return {
    nome: u.nome,
    criadoEm: u.criadoEm,
    ...(u.percentualRepasse != null ? { percentualRepasse: u.percentualRepasse } : {}),
    ...(u.produtosAtendidos ? { produtosAtendidos: u.produtosAtendidos } : {}),
  };
}

/**
 * Usuários ficam em colunas próprias (perfil, ativo, senha provisória), usadas pelas regras do banco.
 * Login e cadastro novo só pela função `usuarios` (ver AutenticacaoSupabase.cadastrarUsuario).
 */
export class RepositorioUsuariosSupabase implements Repositorio<Usuario> {
  constructor(private readonly cliente: SupabaseClient) {}

  async listar(): Promise<Usuario[]> {
    const { data, error } = await this.cliente.from('usuarios').select(COLUNAS_USUARIO).order('id');
    if (error) throw traduzirErro(error);
    return (data as LinhaUsuario[]).map(paraUsuario);
  }

  async obter(id: string): Promise<Usuario | null> {
    const { data, error } = await this.cliente
      .from('usuarios')
      .select(COLUNAS_USUARIO)
      .eq('id', id)
      .maybeSingle();
    if (error) throw traduzirErro(error);
    return data ? paraUsuario(data as LinhaUsuario) : null;
  }

  async salvar(u: Usuario): Promise<void> {
    const { data, error } = await this.cliente
      .from('usuarios')
      .update({
        perfil: u.perfil,
        ativo: u.ativo,
        trocar_senha: Boolean(u.trocarSenha),
        dados: dadosDoUsuario(u),
      })
      .eq('id', u.id)
      .select('id');
    if (error) throw traduzirErro(error);
    if (!data?.length) throw traduzirErro({ code: '42501' });
  }

  async salvarVarios(itens: Usuario[]): Promise<void> {
    for (const u of itens) await this.salvar(u);
  }

  async remover(): Promise<void> {
    throw traduzirErro({ code: '42501', message: 'Usuários não são excluídos: desative o cadastro.' });
  }
}
