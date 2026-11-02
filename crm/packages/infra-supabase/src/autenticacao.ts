import type { GatewayAutenticacao, Usuario } from '@portella/core';
import { ErroAutenticacao, ErroPermissao, ErroValidacao } from '@portella/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { traduzirErro } from './erros';
import { dadosDoUsuario } from './repositorio';

/** Mesmo domínio da função `usuarios` (supabase/functions/usuarios/index.ts). */
const DOMINIO_LOGIN = 'crm.portellacorretora.com.br';

/** O Auth do Supabase entra por e-mail; o login do CRM vira um e-mail interno (nenhum e-mail é enviado). */
export const emailDoLogin = (login: string) => (login.includes('@') ? login : `${login}@${DOMINIO_LOGIN}`);

/**
 * Login e sessão pelo Auth do Supabase. A sessão fica guardada pelo próprio supabase-js no navegador
 * e é renovada sozinha. Criar logins e redefinir senhas de outras pessoas exige a chave de serviço,
 * por isso passa pela função `usuarios`, que confere se quem pediu é administrador.
 */
export class AutenticacaoSupabase implements GatewayAutenticacao {
  constructor(private readonly cliente: SupabaseClient) {}

  async verificarCredenciais(login: string, senha: string): Promise<string> {
    const { data, error } = await this.cliente.auth.signInWithPassword({
      email: emailDoLogin(login),
      password: senha,
    });
    if (error || !data.user) {
      if (error && /fetch|network/i.test(error.message)) throw traduzirErro(error);
      throw new ErroAutenticacao();
    }
    const id = await this.idDoAuth(data.user.id);
    if (!id) throw new ErroAutenticacao();
    return id;
  }

  async definirSenha(usuario: Pick<Usuario, 'id' | 'login'>, senha: string): Promise<void> {
    if (usuario.id === (await this.usuarioIdDaSessao())) {
      const { error } = await this.cliente.auth.updateUser({ password: senha });
      if (error) {
        if (/same|different/i.test(error.message))
          throw new ErroValidacao('A nova senha precisa ser diferente da atual.', { nova: 'Igual à atual.' });
        if (/weak|short|length|characters/i.test(error.message))
          throw new ErroValidacao('Senha fraca: use mais caracteres.', { nova: 'Senha fraca.' });
        throw traduzirErro(error);
      }
      return;
    }
    // Outra pessoa: só a administração, sempre para a senha padrão (definida no servidor).
    await this.chamarFuncao({ acao: 'redefinir-senha', usuarioId: usuario.id });
  }

  async cadastrarUsuario(
    usuario: Usuario,
    senha: string | undefined,
    primeiroAcesso: boolean,
  ): Promise<void> {
    const dados = {
      ...dadosDoUsuario(usuario),
      id: usuario.id,
      login: usuario.login,
      perfil: usuario.perfil,
    };
    if (primeiroAcesso) {
      await this.chamarFuncao({ acao: 'configurar', usuario: dados, senha });
      // Já entra como administrador, para cadastrar a equipe inicial em seguida.
      await this.verificarCredenciais(usuario.login, senha ?? '');
      return;
    }
    await this.chamarFuncao({ acao: 'criar', usuario: dados, ...(senha != null ? { senha } : {}) });
  }

  async sistemaConfigurado(): Promise<boolean> {
    const { data, error } = await this.cliente.rpc('sistema_configurado');
    if (error) throw traduzirErro(error);
    return Boolean(data);
  }

  async iniciarSessao(): Promise<void> {
    // A sessão já começa no signInWithPassword.
  }

  async encerrarSessao(): Promise<void> {
    await this.cliente.auth.signOut({ scope: 'local' });
  }

  async usuarioIdDaSessao(): Promise<string | null> {
    const { data } = await this.cliente.auth.getSession();
    const authId = data.session?.user.id;
    return authId ? this.idDoAuth(authId) : null;
  }

  private async idDoAuth(authId: string): Promise<string | null> {
    const { data, error } = await this.cliente
      .from('usuarios')
      .select('id')
      .eq('auth_id', authId)
      .maybeSingle();
    if (error) throw traduzirErro(error);
    return (data?.id as string | undefined) ?? null;
  }

  private async chamarFuncao(corpo: Record<string, unknown>): Promise<void> {
    const { error } = await this.cliente.functions.invoke('usuarios', { body: corpo });
    if (!error) return;
    // Erros da função vêm com { erro: "mensagem" } e o status HTTP.
    const contexto = (error as { context?: Response }).context;
    let mensagem = 'Não foi possível concluir. Tente de novo.';
    let status = 0;
    if (contexto && typeof contexto.json === 'function') {
      status = contexto.status;
      try {
        mensagem = ((await contexto.json()) as { erro?: string }).erro ?? mensagem;
      } catch {
        // resposta sem JSON
      }
    }
    if (status === 401 || status === 403) throw new ErroPermissao(mensagem);
    if (status === 409 && /login/i.test(mensagem))
      throw new ErroValidacao(mensagem, { login: 'Login já cadastrado.' });
    throw new ErroValidacao(mensagem);
  }
}
