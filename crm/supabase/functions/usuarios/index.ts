// Função "usuarios" do CRM de Seguros: cria logins e redefine senhas com a chave de serviço,
// que só existe aqui no servidor. O navegador nunca recebe essa chave.
//
// Ações (POST com JSON):
//   { acao: 'configurar', usuario, senha }      → 1º acesso: cria o administrador; só funciona sem nenhum usuário.
//   { acao: 'criar', usuario, senha? }          → administrador cadastra alguém (sem senha: senha padrão).
//   { acao: 'redefinir-senha', usuarioId }      → administrador volta a senha de alguém para a padrão.
// Usuário com a senha padrão fica com trocar_senha = true e não vê nenhum dado até trocar.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

// Igual a SENHA_PADRAO em crm/packages/core/src/domain/usuario.ts.
const SENHA_PADRAO = 'portella1';
const SENHA_MINIMA = 6;
const DOMINIO_LOGIN = 'crm.portellacorretora.com.br';
const LOGIN = /^[a-z0-9._@-]{3,60}$/;
const PERFIS = ['admin', 'gestor', 'corretor'];

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const resposta = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const erro = (mensagem: string, status = 400) => resposta({ erro: mensagem }, status);

/** Login do CRM → e-mail do Auth (interno; nenhum e-mail é enviado). */
export const emailDoLogin = (login: string) => (login.includes('@') ? login : `${login}@${DOMINIO_LOGIN}`);

interface UsuarioEnviado {
  id?: unknown;
  nome?: unknown;
  login?: unknown;
  perfil?: unknown;
  criadoEm?: unknown;
  percentualRepasse?: unknown;
  produtosAtendidos?: unknown;
}

function lerUsuario(u: UsuarioEnviado | undefined) {
  if (!u || typeof u !== 'object') throw new Error('Dados do usuário ausentes.');
  const id = typeof u.id === 'string' ? u.id.trim() : '';
  const nome = typeof u.nome === 'string' ? u.nome.trim() : '';
  const login = typeof u.login === 'string' ? u.login.trim().toLowerCase() : '';
  const perfil = typeof u.perfil === 'string' ? u.perfil : '';
  if (!/^[A-Za-z0-9-]{8,64}$/.test(id)) throw new Error('Identificador inválido.');
  if (nome.length < 2 || nome.length > 120) throw new Error('Informe o nome.');
  if (!LOGIN.test(login)) throw new Error('Use ao menos 3 letras ou números no login, sem espaços.');
  if (!PERFIS.includes(perfil)) throw new Error('Perfil inválido.');
  const dados: Record<string, unknown> = {
    nome,
    criadoEm: typeof u.criadoEm === 'string' ? u.criadoEm : new Date().toISOString(),
  };
  if (typeof u.percentualRepasse === 'number' && u.percentualRepasse >= 0 && u.percentualRepasse <= 100)
    dados.percentualRepasse = u.percentualRepasse;
  if (Array.isArray(u.produtosAtendidos))
    dados.produtosAtendidos = u.produtosAtendidos.filter((p) => typeof p === 'string').slice(0, 50);
  return { id, login, perfil, dados };
}

function lerSenha(senha: unknown, padrao: boolean): string {
  if (senha == null && padrao) return SENHA_PADRAO;
  if (typeof senha !== 'string' || senha.length < SENHA_MINIMA)
    throw new Error(`A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`);
  return senha;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return erro('Método não permitido.', 405);

  const servico = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let corpo: Record<string, unknown>;
  try {
    corpo = await req.json();
  } catch {
    return erro('Pedido inválido.');
  }

  /** Quem chamou precisa ser administrador ativo, já com a senha própria. */
  async function exigirAdmin(): Promise<Response | null> {
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data, error } = token ? await servico.auth.getUser(token) : { data: null, error: true };
    if (error || !data?.user) return erro('Entre no sistema novamente.', 401);
    const { data: ator } = await servico
      .from('usuarios')
      .select('perfil, ativo, trocar_senha')
      .eq('auth_id', data.user.id)
      .maybeSingle();
    if (!ator || ator.perfil !== 'admin' || !ator.ativo || ator.trocar_senha)
      return erro('Só o administrador pode fazer isso.', 403);
    return null;
  }

  async function cadastrar(usuario: ReturnType<typeof lerUsuario>, senha: string, trocarSenha: boolean) {
    const { data: existe } = await servico
      .from('usuarios')
      .select('id')
      .eq('login', usuario.login)
      .maybeSingle();
    if (existe) return erro('Já existe um usuário com este login.', 409);

    const { data: criado, error: erroAuth } = await servico.auth.admin.createUser({
      email: emailDoLogin(usuario.login),
      password: senha,
      email_confirm: true,
      app_metadata: { usuario_id: usuario.id },
    });
    if (erroAuth || !criado.user) {
      const repetido = /already|registered|exists/i.test(erroAuth?.message ?? '');
      return erro(
        repetido ? 'Já existe um usuário com este login.' : 'Não foi possível criar o login.',
        repetido ? 409 : 400,
      );
    }
    const { error: erroBanco } = await servico.from('usuarios').insert({
      id: usuario.id,
      auth_id: criado.user.id,
      login: usuario.login,
      perfil: usuario.perfil,
      ativo: true,
      trocar_senha: trocarSenha,
      dados: usuario.dados,
    });
    if (erroBanco) {
      await servico.auth.admin.deleteUser(criado.user.id);
      return erro(
        erroBanco.code === '23505'
          ? 'Já existe um usuário com este login.'
          : 'Não foi possível salvar o usuário.',
        409,
      );
    }
    return resposta({ ok: true });
  }

  try {
    switch (corpo.acao) {
      case 'configurar': {
        const { count, error } = await servico.from('usuarios').select('id', { count: 'exact', head: true });
        if (error) return erro('Não foi possível verificar o sistema.', 500);
        if ((count ?? 0) > 0) return erro('O sistema já foi configurado.', 409);
        const usuario = lerUsuario({ ...(corpo.usuario as UsuarioEnviado), perfil: 'admin' });
        return await cadastrar(usuario, lerSenha(corpo.senha, false), false);
      }
      case 'criar': {
        const negado = await exigirAdmin();
        if (negado) return negado;
        const usuario = lerUsuario(corpo.usuario as UsuarioEnviado);
        const padrao = corpo.senha == null;
        return await cadastrar(usuario, lerSenha(corpo.senha, true), padrao);
      }
      case 'redefinir-senha': {
        const negado = await exigirAdmin();
        if (negado) return negado;
        if (typeof corpo.usuarioId !== 'string') return erro('Usuário não informado.');
        const { data: alvo } = await servico
          .from('usuarios')
          .select('auth_id')
          .eq('id', corpo.usuarioId)
          .maybeSingle();
        if (!alvo?.auth_id) return erro('Usuário não encontrado.', 404);
        const { error: erroAuth } = await servico.auth.admin.updateUserById(alvo.auth_id, {
          password: SENHA_PADRAO,
        });
        if (erroAuth) return erro('Não foi possível redefinir a senha.', 500);
        await servico.from('usuarios').update({ trocar_senha: true }).eq('id', corpo.usuarioId);
        return resposta({ ok: true });
      }
      default:
        return erro('Ação desconhecida.');
    }
  } catch (e) {
    return erro(e instanceof Error ? e.message : 'Pedido inválido.');
  }
});
