import { ErroNaoEncontrado, ErroValidacao } from '../domain/erros';
import type { Perfil } from '../domain/perfil';
import type { Usuario } from '../domain/usuario';
import { normalizarEmail, validarSenha, validarUsuario } from '../domain/usuario';
import type { GatewayAutenticacao } from '../ports/autenticacao';
import type { Ambiente } from '../ports/relogio';
import { ambientePadrao } from '../ports/relogio';
import type { Repositorio } from '../ports/repositorio';
import { exigir } from './permissoes';

export interface NovoUsuario {
  nome: string;
  email: string;
  perfil: Perfil;
  senha: string;
}

export type AlteracaoUsuario = Partial<Pick<Usuario, 'nome' | 'perfil' | 'ativo'>>;

export class ServicoUsuarios {
  constructor(
    private readonly repositorio: Repositorio<Usuario>,
    private readonly auth: GatewayAutenticacao,
    private readonly ambiente: Ambiente = ambientePadrao,
  ) {}

  /** Todos os perfis podem consultar a equipe (nomes dos responsáveis aparecem nas listas). */
  async listar(): Promise<Usuario[]> {
    const usuarios = await this.repositorio.listar();
    return usuarios.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  async existeAlgum(): Promise<boolean> {
    return (await this.repositorio.listar()).length > 0;
  }

  /** Primeiro acesso: cria o administrador inicial quando ainda não há nenhum usuário. */
  async configurarAdministrador(dados: Omit<NovoUsuario, 'perfil'>): Promise<Usuario> {
    if (await this.existeAlgum()) throw new ErroValidacao('O sistema já foi configurado.');
    return this.registrar({ ...dados, perfil: 'admin' });
  }

  async criar(ator: Usuario, dados: NovoUsuario): Promise<Usuario> {
    exigir(ator, 'usuarios:gerenciar');
    return this.registrar(dados);
  }

  async atualizar(ator: Usuario, id: string, alteracao: AlteracaoUsuario): Promise<Usuario> {
    exigir(ator, 'usuarios:gerenciar');
    const atual = await this.repositorio.obter(id);
    if (!atual) throw new ErroNaoEncontrado('Usuário não encontrado.');
    const novo: Usuario = { ...atual, ...alteracao };
    validarUsuario(novo);

    const deixaDeSerAdminAtivo =
      atual.perfil === 'admin' && atual.ativo && (novo.perfil !== 'admin' || !novo.ativo);
    if (deixaDeSerAdminAtivo) {
      const adminsAtivos = (await this.repositorio.listar()).filter((u) => u.perfil === 'admin' && u.ativo);
      if (adminsAtivos.length <= 1) {
        throw new ErroValidacao('O sistema precisa de pelo menos um administrador ativo.');
      }
    }
    await this.repositorio.salvar(novo);
    return novo;
  }

  async redefinirSenha(ator: Usuario, id: string, senha: string): Promise<void> {
    if (ator.id !== id) exigir(ator, 'usuarios:gerenciar');
    validarSenha(senha);
    const usuario = await this.repositorio.obter(id);
    if (!usuario) throw new ErroNaoEncontrado('Usuário não encontrado.');
    await this.auth.definirSenha(usuario, senha);
  }

  /** Troca da própria senha, conferindo a senha atual. */
  async alterarPropriaSenha(ator: Usuario, senhaAtual: string, novaSenha: string): Promise<void> {
    await this.auth.verificarCredenciais(ator.email, senhaAtual);
    validarSenha(novaSenha);
    await this.auth.definirSenha(ator, novaSenha);
  }

  private async registrar(dados: NovoUsuario): Promise<Usuario> {
    const email = normalizarEmail(dados.email);
    validarUsuario({ ...dados, email });
    validarSenha(dados.senha);
    const usuarios = await this.repositorio.listar();
    if (usuarios.some((u) => u.email === email)) {
      throw new ErroValidacao('Já existe um usuário com este e-mail.', { email: 'E-mail já cadastrado.' });
    }
    const usuario: Usuario = {
      id: this.ambiente.gerarId(),
      nome: dados.nome.trim(),
      email,
      perfil: dados.perfil,
      ativo: true,
      criadoEm: this.ambiente.agora().toISOString(),
    };
    await this.repositorio.salvar(usuario);
    await this.auth.definirSenha(usuario, dados.senha);
    return usuario;
  }
}
