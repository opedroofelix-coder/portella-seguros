import type { Usuario } from '../domain/usuario';

/** Credenciais e sessão. O backend escolhido (local, Supabase, Firebase…) implementa esta interface. */
export interface GatewayAutenticacao {
  /** Confere login e senha; devolve o id do usuário ou lança ErroAutenticacao. */
  verificarCredenciais(login: string, senha: string): Promise<string>;
  definirSenha(usuario: Pick<Usuario, 'id' | 'login'>, senha: string): Promise<void>;
  iniciarSessao(usuarioId: string): Promise<void>;
  encerrarSessao(): Promise<void>;
  usuarioIdDaSessao(): Promise<string | null>;
  /**
   * Backend com servidor (Supabase): o login e o cadastro do usuário são criados juntos no servidor.
   * `primeiroAcesso` cria o administrador inicial e já entra com ele. Sem senha, vale a senha padrão.
   * Quando existe, substitui a gravação do usuário no repositório.
   */
  cadastrarUsuario?(usuario: Usuario, senha: string | undefined, primeiroAcesso: boolean): Promise<void>;
  /** Backend com servidor: diz se já existe usuário, antes do login (as regras escondem a lista). */
  sistemaConfigurado?(): Promise<boolean>;
}
