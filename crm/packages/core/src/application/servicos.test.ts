import { beforeEach, describe, expect, it } from 'vitest';
import type { Cliente } from '../domain/cliente';
import { validarCliente } from '../domain/cliente';
import { ErroAutenticacao, ErroNaoEncontrado, ErroPermissao, ErroValidacao } from '../domain/erros';
import type { Usuario } from '../domain/usuario';
import { AutenticacaoMemoria, RepositorioMemoria } from '../testes/memoria';
import { ServicoAutenticacao } from './autenticacao';
import { ServicoCarteira } from './carteira';
import { ServicoUsuarios } from './usuarios';

let seq = 0;
const ambiente = { agora: () => new Date('2026-10-22T12:00:00Z'), gerarId: () => `id${++seq}` };

describe('usuários e autenticação', () => {
  let repo: RepositorioMemoria<Usuario>;
  let auth: AutenticacaoMemoria;
  let usuarios: ServicoUsuarios;
  let sessao: ServicoAutenticacao;
  const ADMIN = { nome: 'Ana', login: 'ana', senha: 'senha-admin' };

  beforeEach(() => {
    repo = new RepositorioMemoria();
    auth = new AutenticacaoMemoria();
    usuarios = new ServicoUsuarios(repo, auth, ambiente);
    sessao = new ServicoAutenticacao(auth, repo);
  });

  it('configura o administrador só no primeiro acesso; login sem maiúsculas nem espaços', async () => {
    const admin = await usuarios.configurarAdministrador({ ...ADMIN, login: ' ANA ' });
    expect(admin).toMatchObject({ perfil: 'admin', login: 'ana' });
    expect(admin.trocarSenha).toBeUndefined();
    await expect(
      usuarios.configurarAdministrador({ nome: 'B', login: 'b@x.com', senha: 'senha-b1' }),
    ).rejects.toThrow(ErroValidacao);
  });

  it('entra com login ou e-mail, mantém a sessão e sai', async () => {
    await usuarios.configurarAdministrador({ ...ADMIN, login: 'ana@x.com' });
    await expect(sessao.entrar('ana@x.com', 'errada')).rejects.toThrow(ErroAutenticacao);
    const u = await sessao.entrar(' Ana@X.com', 'senha-admin');
    expect((await sessao.usuarioAtual())?.id).toBe(u.id);
    await sessao.sair();
    expect(await sessao.usuarioAtual()).toBeNull();
  });

  it('usuário novo recebe a senha 1234 e precisa trocá-la; a nova não pode ser 1234 nem curta', async () => {
    const admin = await usuarios.configurarAdministrador(ADMIN);
    const gisele = await usuarios.criar(admin, {
      nome: 'Gisele',
      login: 'gisele',
      perfil: 'corretor',
      percentualRepasse: 50,
    });
    expect(gisele).toMatchObject({ trocarSenha: true, percentualRepasse: 50 });
    const logada = await sessao.entrar('gisele', '1234');
    await expect(usuarios.alterarPropriaSenha(logada, '1234', '1234')).rejects.toThrow(ErroValidacao);
    await expect(usuarios.alterarPropriaSenha(logada, '1234', '123')).rejects.toThrow(ErroValidacao);
    const atualizada = await usuarios.alterarPropriaSenha(logada, '1234', 'gisele-nova');
    expect(atualizada.trocarSenha).toBeUndefined();
    expect((await repo.obter(gisele.id))?.trocarSenha).toBeUndefined();
    await expect(sessao.entrar('gisele', '1234')).rejects.toThrow(ErroAutenticacao);
    await expect(sessao.entrar('gisele', 'gisele-nova')).resolves.toBeTruthy();
  });

  it('só administrador cria usuários e redefine senha para 1234; login é único', async () => {
    const admin = await usuarios.configurarAdministrador(ADMIN);
    const gestor = await usuarios.criar(admin, { nome: 'Gil', login: 'gil', perfil: 'gestor' });
    await expect(usuarios.criar(gestor, { nome: 'Cid', login: 'cid', perfil: 'corretor' })).rejects.toThrow(
      ErroPermissao,
    );
    await expect(usuarios.criar(admin, { nome: 'Gil 2', login: 'GIL', perfil: 'corretor' })).rejects.toThrow(
      ErroValidacao,
    );
    await expect(usuarios.criar(admin, { nome: 'Cid', login: 'c d', perfil: 'corretor' })).rejects.toThrow(
      ErroValidacao,
    );

    const cid = await usuarios.criar(admin, {
      nome: 'Cid',
      login: 'cid',
      perfil: 'corretor',
      senha: 'senha-cid',
    });
    await expect(usuarios.redefinirSenhaPadrao(gestor, cid.id)).rejects.toThrow(ErroPermissao);
    await usuarios.redefinirSenhaPadrao(admin, cid.id);
    expect((await repo.obter(cid.id))?.trocarSenha).toBe(true);
    await expect(sessao.entrar('cid', '1234')).resolves.toBeTruthy();
  });

  it('cria a equipe inicial com logins pelo primeiro nome, sem repetir a administradora', async () => {
    const admin = await usuarios.configurarAdministrador({
      nome: 'Deliziane Portela',
      login: 'deliziane',
      senha: 'senha-admin',
    });
    const criados = await usuarios.criarProdutoresIniciais(admin, [
      { nome: 'Deliziane', percentualRepasse: 40 },
      { nome: 'Mary', percentualRepasse: 15 },
      { nome: 'Luana', percentualRepasse: 50 },
      { nome: 'Lu' },
    ]);
    expect(criados.map((u) => [u.nome, u.login, u.percentualRepasse, u.trocarSenha])).toEqual([
      ['Mary', 'mary', 15, true],
      ['Luana', 'luana', 50, true],
      ['Lu', 'luusr', undefined, true],
    ]);
    expect(await usuarios.criarProdutoresIniciais(admin, [{ nome: 'Mary' }])).toEqual([]);
  });

  it('usuário desativado não entra e perde a sessão', async () => {
    const admin = await usuarios.configurarAdministrador(ADMIN);
    const c = await usuarios.criar(admin, {
      nome: 'Cid',
      login: 'cid',
      perfil: 'corretor',
      senha: 'senha-cid',
    });
    await sessao.entrar('cid', 'senha-cid');
    await usuarios.atualizar(admin, c.id, { ativo: false });
    expect(await sessao.usuarioAtual()).toBeNull();
    await expect(sessao.entrar('cid', 'senha-cid')).rejects.toThrow(/desativado/);
  });

  it('não permite ficar sem administrador ativo', async () => {
    const admin = await usuarios.configurarAdministrador(ADMIN);
    await expect(usuarios.atualizar(admin, admin.id, { perfil: 'gestor' })).rejects.toThrow(/administrador/);
    await expect(usuarios.atualizar(admin, admin.id, { ativo: false })).rejects.toThrow(/administrador/);
  });

  it('troca a própria senha só com a senha atual correta', async () => {
    const admin = await usuarios.configurarAdministrador(ADMIN);
    await expect(usuarios.alterarPropriaSenha(admin, 'errada', 'nova-senha')).rejects.toThrow(
      ErroAutenticacao,
    );
    await usuarios.alterarPropriaSenha(admin, 'senha-admin', 'nova-senha');
    await expect(sessao.entrar('ana', 'nova-senha')).resolves.toBeTruthy();
  });
});

describe('carteira', () => {
  const admin: Usuario = { id: 'a', nome: 'Ana', login: 'ana', perfil: 'admin', ativo: true, criadoEm: '' };
  const gestor: Usuario = { ...admin, id: 'g', perfil: 'gestor' };
  const c1: Usuario = { ...admin, id: 'c1', perfil: 'corretor' };
  const c2: Usuario = { ...admin, id: 'c2', perfil: 'corretor' };
  let servico: ServicoCarteira<Cliente>;

  beforeEach(() => {
    servico = new ServicoCarteira<Cliente>(new RepositorioMemoria(), validarCliente, ambiente);
  });

  it('corretor cria na própria carteira e só vê os próprios', async () => {
    const meu = await servico.salvar(c1, { nome: 'Maria', tipoPessoa: 'PF' });
    expect(meu.responsavelId).toBe('c1');
    await servico.salvar(c2, { nome: 'João', tipoPessoa: 'PF' });
    expect((await servico.listar(c1)).map((c) => c.nome)).toEqual(['Maria']);
    expect(await servico.listar(gestor)).toHaveLength(2);
    await expect(servico.obter(c2, meu.id)).rejects.toThrow(ErroNaoEncontrado);
  });

  it('corretor não edita, não transfere e não remove; gestor pode', async () => {
    const meu = await servico.salvar(c1, { nome: 'Maria', tipoPessoa: 'PF' });
    await expect(servico.salvar(c2, { ...meu, nome: 'Outra' })).rejects.toThrow(ErroPermissao);
    await expect(servico.salvar(c1, { ...meu, responsavelId: 'c2' })).rejects.toThrow(ErroPermissao);
    await expect(servico.salvar(c1, { nome: 'Novo', tipoPessoa: 'PF', responsavelId: 'c2' })).rejects.toThrow(
      ErroPermissao,
    );
    await expect(servico.remover(c1, meu.id)).rejects.toThrow(ErroPermissao);

    const editado = await servico.salvar(c1, { ...meu, nome: 'Maria Souza' });
    expect(editado.criadoEm).toBe(meu.criadoEm);
    const transferido = await servico.salvar(gestor, { ...editado, responsavelId: 'c2' });
    expect(transferido.responsavelId).toBe('c2');
    await servico.remover(gestor, meu.id);
    expect(await servico.listar(admin)).toHaveLength(0);
  });

  it('valida antes de salvar e só admin importa', async () => {
    await expect(servico.salvar(admin, { nome: '', tipoPessoa: 'PF' })).rejects.toThrow(ErroValidacao);
    const item: Cliente = {
      id: 'x',
      nome: 'Imp',
      tipoPessoa: 'PF',
      responsavelId: 'a',
      criadoEm: '',
      atualizadoEm: '',
    };
    await expect(servico.importar(gestor, [item])).rejects.toThrow(ErroPermissao);
    await expect(servico.importar(admin, [item])).resolves.toBe(1);
  });
});
