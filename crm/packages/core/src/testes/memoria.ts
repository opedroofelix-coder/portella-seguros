import { ErroAutenticacao } from '../domain/erros';
import type { Usuario } from '../domain/usuario';
import type { GatewayAutenticacao } from '../ports/autenticacao';
import type { Repositorio } from '../ports/repositorio';

/** Implementações em memória dos ports, para testes e protótipos. */
export class RepositorioMemoria<T extends { id: string }> implements Repositorio<T> {
  private readonly itens = new Map<string, T>();

  constructor(iniciais: T[] = []) {
    for (const i of iniciais) this.itens.set(i.id, structuredClone(i));
  }

  async listar() {
    return [...this.itens.values()].map((i) => structuredClone(i));
  }
  async obter(id: string) {
    const item = this.itens.get(id);
    return item ? structuredClone(item) : null;
  }
  async salvar(item: T) {
    this.itens.set(item.id, structuredClone(item));
  }
  async salvarVarios(itens: T[]) {
    for (const i of itens) await this.salvar(i);
  }
  async remover(id: string) {
    this.itens.delete(id);
  }
}

export class AutenticacaoMemoria implements GatewayAutenticacao {
  private readonly senhas = new Map<string, { id: string; senha: string }>();
  private sessao: string | null = null;

  async verificarCredenciais(login: string, senha: string) {
    const c = this.senhas.get(login);
    if (!c || c.senha !== senha) throw new ErroAutenticacao();
    return c.id;
  }
  async definirSenha(usuario: Pick<Usuario, 'id' | 'login'>, senha: string) {
    for (const [login, c] of this.senhas) if (c.id === usuario.id) this.senhas.delete(login);
    this.senhas.set(usuario.login, { id: usuario.id, senha });
  }
  async iniciarSessao(id: string) {
    this.sessao = id;
  }
  async encerrarSessao() {
    this.sessao = null;
  }
  async usuarioIdDaSessao() {
    return this.sessao;
  }
}
