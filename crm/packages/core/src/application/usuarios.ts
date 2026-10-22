import { normalizar } from '../domain/cliente';
import { ErroNaoEncontrado, ErroValidacao } from '../domain/erros';
import type { Perfil } from '../domain/perfil';
import type { Usuario } from '../domain/usuario';
import { normalizarLogin, SENHA_PADRAO, sugerirLogin, validarSenha, validarUsuario } from '../domain/usuario';
import type { GatewayAutenticacao } from '../ports/autenticacao';
import type { Ambiente } from '../ports/relogio';
import { ambientePadrao } from '../ports/relogio';
import type { Repositorio } from '../ports/repositorio';
import { exigir } from './permissoes';

export interface NovoUsuario {
  nome: string;
  login: string;
  perfil: Perfil;
  /** Sem senha, o usuário recebe a senha padrão (1234) e troca no primeiro acesso. */
  senha?: string;
  percentualRepasse?: number;
}

export type AlteracaoUsuario = Partial<Pick<Usuario, 'nome' | 'perfil' | 'ativo' | 'percentualRepasse'>>;

export interface ProdutorInicial {
  nome: string;
  percentualRepasse?: number;
}

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

  /** Primeiro acesso: cria o administrador inicial (com senha própria) quando não há nenhum usuário. */
  async configurarAdministrador(dados: Omit<NovoUsuario, 'perfil'> & { senha: string }): Promise<Usuario> {
    if (await this.existeAlgum()) throw new ErroValidacao('O sistema já foi configurado.');
    return this.registrar({ ...dados, perfil: 'admin' });
  }

  async criar(ator: Usuario, dados: NovoUsuario): Promise<Usuario> {
    exigir(ator, 'usuarios:gerenciar');
    return this.registrar(dados);
  }

  /**
   * Cadastra a equipe inicial de produtores com senha 1234. Quem já existe (mesmo nome ou o
   * primeiro nome de quem está cadastrado, como a própria administradora) é pulado.
   */
  async criarProdutoresIniciais(ator: Usuario, produtores: ProdutorInicial[]): Promise<Usuario[]> {
    exigir(ator, 'usuarios:gerenciar');
    const criados: Usuario[] = [];
    for (const p of produtores) {
      const atuais = await this.repositorio.listar();
      const primeiro = (n: string) => normalizar(n).split(' ')[0];
      if (
        atuais.some((u) => normalizar(u.nome) === normalizar(p.nome) || primeiro(u.nome) === primeiro(p.nome))
      )
        continue;
      const login = sugerirLogin(
        p.nome,
        atuais.map((u) => u.login),
      );
      criados.push(
        await this.registrar({
          nome: p.nome,
          login,
          perfil: 'corretor',
          percentualRepasse: p.percentualRepasse,
        }),
      );
    }
    return criados;
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

  /** O administrador volta a senha de alguém para 1234; a pessoa troca no próximo acesso. */
  async redefinirSenhaPadrao(ator: Usuario, id: string): Promise<void> {
    exigir(ator, 'usuarios:gerenciar');
    const usuario = await this.repositorio.obter(id);
    if (!usuario) throw new ErroNaoEncontrado('Usuário não encontrado.');
    await this.auth.definirSenha(usuario, SENHA_PADRAO);
    await this.repositorio.salvar({ ...usuario, trocarSenha: true });
  }

  /** Troca da própria senha, conferindo a senha atual. Libera o acesso de quem estava com a senha 1234. */
  async alterarPropriaSenha(ator: Usuario, senhaAtual: string, novaSenha: string): Promise<Usuario> {
    await this.auth.verificarCredenciais(ator.login, senhaAtual);
    validarSenha(novaSenha);
    await this.auth.definirSenha(ator, novaSenha);
    const atual = (await this.repositorio.obter(ator.id)) ?? ator;
    const { trocarSenha: _trocar, ...semFlag } = atual;
    await this.repositorio.salvar(semFlag);
    return semFlag;
  }

  private async registrar(dados: NovoUsuario): Promise<Usuario> {
    const login = normalizarLogin(dados.login);
    validarUsuario({ ...dados, login });
    if (dados.senha != null) validarSenha(dados.senha);
    const usuarios = await this.repositorio.listar();
    if (usuarios.some((u) => u.login === login)) {
      throw new ErroValidacao('Já existe um usuário com este login.', { login: 'Login já cadastrado.' });
    }
    const usuario: Usuario = {
      id: this.ambiente.gerarId(),
      nome: dados.nome.trim(),
      login,
      perfil: dados.perfil,
      ativo: true,
      criadoEm: this.ambiente.agora().toISOString(),
      ...(dados.senha == null ? { trocarSenha: true } : {}),
      ...(dados.percentualRepasse != null ? { percentualRepasse: dados.percentualRepasse } : {}),
    };
    await this.repositorio.salvar(usuario);
    await this.auth.definirSenha(usuario, dados.senha ?? SENHA_PADRAO);
    return usuario;
  }
}
