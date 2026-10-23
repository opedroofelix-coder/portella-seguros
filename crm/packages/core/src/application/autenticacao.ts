import { ErroAutenticacao } from '../domain/erros';
import type { Usuario } from '../domain/usuario';
import { normalizarLogin } from '../domain/usuario';
import type { GatewayAutenticacao } from '../ports/autenticacao';
import type { Repositorio } from '../ports/repositorio';

export class ServicoAutenticacao {
  constructor(
    private readonly auth: GatewayAutenticacao,
    private readonly usuarios: Repositorio<Usuario>,
  ) {}

  async entrar(login: string, senha: string): Promise<Usuario> {
    const id = await this.auth.verificarCredenciais(normalizarLogin(login), senha);
    const usuario = await this.usuarios.obter(id);
    if (!usuario) throw new ErroAutenticacao();
    if (!usuario.ativo) throw new ErroAutenticacao('Usuário desativado. Fale com o administrador.');
    await this.auth.iniciarSessao(usuario.id);
    return usuario;
  }

  async sair(): Promise<void> {
    await this.auth.encerrarSessao();
  }

  /** Usuário logado, ou null se não houver sessão válida (ou se ele foi desativado). */
  async usuarioAtual(): Promise<Usuario | null> {
    const id = await this.auth.usuarioIdDaSessao();
    if (!id) return null;
    const usuario = await this.usuarios.obter(id);
    if (!usuario?.ativo) {
      await this.auth.encerrarSessao();
      return null;
    }
    return usuario;
  }
}
