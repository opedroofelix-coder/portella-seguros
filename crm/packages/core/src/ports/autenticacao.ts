import type { Usuario } from '../domain/usuario';

/** Credenciais e sessão. O backend escolhido (local, Supabase, Firebase…) implementa esta interface. */
export interface GatewayAutenticacao {
  /** Confere e-mail e senha; devolve o id do usuário ou lança ErroAutenticacao. */
  verificarCredenciais(email: string, senha: string): Promise<string>;
  definirSenha(usuario: Pick<Usuario, 'id' | 'email'>, senha: string): Promise<void>;
  iniciarSessao(usuarioId: string): Promise<void>;
  encerrarSessao(): Promise<void>;
  usuarioIdDaSessao(): Promise<string | null>;
}
