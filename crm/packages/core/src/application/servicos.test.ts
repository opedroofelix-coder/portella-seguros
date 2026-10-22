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

  beforeEach(() => {
    repo = new RepositorioMemoria();
    auth = new AutenticacaoMemoria();
    usuarios = new ServicoUsuarios(repo, auth, ambiente);
    sessao = new ServicoAutenticacao(auth, repo);
  });

  it('configura o administrador só no primeiro acesso', async () => {
    const admin = await usuarios.configurarAdministrador({
      nome: 'Ana',
      email: 'ANA@x.com ',
      senha: '12345678',
    });
    expect(admin.perfil).toBe('admin');
    expect(admin.email).toBe('ana@x.com');
    await expect(
      usuarios.configurarAdministrador({ nome: 'B', email: 'b@x.com', senha: '12345678' }),
    ).rejects.toThrow(ErroValidacao);
  });

  it('entra, mantém a sessão e sai', async () => {
    await usuarios.configurarAdministrador({ nome: 'Ana', email: 'ana@x.com', senha: '12345678' });
    await expect(sessao.entrar('ana@x.com', 'errada!!')).rejects.toThrow(ErroAutenticacao);
    const u = await sessao.entrar(' Ana@X.com', '12345678');
    expect((await sessao.usuarioAtual())?.id).toBe(u.id);
    await sessao.sair();
    expect(await sessao.usuarioAtual()).toBeNull();
  });

  it('só administrador cria usuários; e-mail é único; senha curta é rejeitada', async () => {
    const admin = await usuarios.configurarAdministrador({
      nome: 'Ana',
      email: 'ana@x.com',
      senha: '12345678',
    });
    const gestor = await usuarios.criar(admin, {
      nome: 'Gil',
      email: 'gil@x.com',
      perfil: 'gestor',
      senha: '12345678',
    });
    await expect(
      usuarios.criar(gestor, { nome: 'Cid', email: 'cid@x.com', perfil: 'corretor', senha: '12345678' }),
    ).rejects.toThrow(ErroPermissao);
    await expect(
      usuarios.criar(admin, { nome: 'Gil 2', email: 'gil@x.com', perfil: 'corretor', senha: '12345678' }),
    ).rejects.toThrow(ErroValidacao);
    await expect(
      usuarios.criar(admin, { nome: 'Cid', email: 'cid@x.com', perfil: 'corretor', senha: '123' }),
    ).rejects.toThrow(ErroValidacao);
  });

  it('usuário desativado não entra e perde a sessão', async () => {
    const admin = await usuarios.configurarAdministrador({
      nome: 'Ana',
      email: 'ana@x.com',
      senha: '12345678',
    });
    const c = await usuarios.criar(admin, {
      nome: 'Cid',
      email: 'cid@x.com',
      perfil: 'corretor',
      senha: '12345678',
    });
    await sessao.entrar('cid@x.com', '12345678');
    await usuarios.atualizar(admin, c.id, { ativo: false });
    expect(await sessao.usuarioAtual()).toBeNull();
    await expect(sessao.entrar('cid@x.com', '12345678')).rejects.toThrow(/desativado/);
  });

  it('não permite ficar sem administrador ativo', async () => {
    const admin = await usuarios.configurarAdministrador({
      nome: 'Ana',
      email: 'ana@x.com',
      senha: '12345678',
    });
    await expect(usuarios.atualizar(admin, admin.id, { perfil: 'gestor' })).rejects.toThrow(/administrador/);
    await expect(usuarios.atualizar(admin, admin.id, { ativo: false })).rejects.toThrow(/administrador/);
  });

  it('cada um troca a própria senha; só admin troca a dos outros', async () => {
    const admin = await usuarios.configurarAdministrador({
      nome: 'Ana',
      email: 'ana@x.com',
      senha: '12345678',
    });
    const c = await usuarios.criar(admin, {
      nome: 'Cid',
      email: 'cid@x.com',
      perfil: 'corretor',
      senha: '12345678',
    });
    await usuarios.redefinirSenha(c, c.id, 'novasenha');
    await expect(sessao.entrar('cid@x.com', 'novasenha')).resolves.toBeTruthy();
    await expect(usuarios.redefinirSenha(c, admin.id, 'outrasenha')).rejects.toThrow(ErroPermissao);
  });

  it('troca a própria senha só com a senha atual correta', async () => {
    const admin = await usuarios.configurarAdministrador({
      nome: 'Ana',
      email: 'ana@x.com',
      senha: '12345678',
    });
    await expect(usuarios.alterarPropriaSenha(admin, 'errada', 'nova-senha')).rejects.toThrow(
      ErroAutenticacao,
    );
    await usuarios.alterarPropriaSenha(admin, '12345678', 'nova-senha');
    await expect(sessao.entrar('ana@x.com', 'nova-senha')).resolves.toBeTruthy();
  });
});

describe('carteira', () => {
  const admin: Usuario = { id: 'a', nome: 'Ana', email: 'a@x', perfil: 'admin', ativo: true, criadoEm: '' };
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

describe('comissões', () => {
  it('corretor consulta só as suas e não lança; gestor lança e dá baixa', async () => {
    const { ServicoComissoes } = await import('./comissoes');
    const servico = new ServicoComissoes(new RepositorioMemoria(), ambiente);
    const gestor: Usuario = { id: 'g', nome: 'G', email: 'g@x', perfil: 'gestor', ativo: true, criadoEm: '' };
    const carla: Usuario = { ...gestor, id: 'carla', perfil: 'corretor' };
    const dados = { clienteNome: 'Cliente', produto: 'Auto', companhia: 'Suhai', comissaoReceber: 1000, comissaoRecebida: 0, responsavelId: 'carla' };
    await expect(servico.salvar(carla, dados)).rejects.toThrow(ErroPermissao);
    const lanc = await servico.salvar(gestor, dados);
    await servico.salvar(gestor, { ...lanc, comissaoRecebida: 1000, dataRecebimento: '2026-10-22' });
    expect((await servico.listar(carla))[0]?.comissaoRecebida).toBe(1000);
    await servico.salvar(gestor, { ...dados, responsavelId: 'outro' });
    expect(await servico.listar(carla)).toHaveLength(1);
    await expect(servico.remover(carla, lanc.id)).rejects.toThrow(ErroPermissao);
  });
});
