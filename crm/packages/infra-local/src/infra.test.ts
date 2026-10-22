import { ErroAutenticacao } from '@portella/core';
import { describe, expect, it } from 'vitest';
import { ArmazenamentoMemoria, AutenticacaoLocal } from './autenticacao';
import { BancoLocal, COLECAO_CREDENCIAIS } from './banco';

let n = 0;
const abrir = () => BancoLocal.abrir(`teste-${++n}`, ['clientes']);

describe('BancoLocal', () => {
  it('salva, lista, obtém, remove e limpa', async () => {
    const banco = await abrir();
    const repo = banco.repositorio<{ id: string; nome: string }>('clientes');
    await repo.salvar({ id: '1', nome: 'A' });
    await repo.salvarVarios([{ id: '2', nome: 'B' }, { id: '1', nome: 'A2' }]);
    expect((await repo.listar()).map((x) => x.nome).sort()).toEqual(['A2', 'B']);
    expect(await repo.obter('2')).toEqual({ id: '2', nome: 'B' });
    expect(await repo.obter('9')).toBeNull();
    await repo.remover('2');
    expect(await repo.listar()).toHaveLength(1);
    await banco.limpar(['clientes']);
    expect(await repo.listar()).toHaveLength(0);
    banco.fechar();
  });
});

describe('AutenticacaoLocal', () => {
  it('guarda hash (não a senha), confere credenciais e controla a sessão', async () => {
    const banco = await abrir();
    const credenciais = banco.repositorio<{ id: string; email: string; sal: string; hash: string }>(COLECAO_CREDENCIAIS);
    let agora = 1_000;
    const auth = new AutenticacaoLocal(credenciais, new ArmazenamentoMemoria(), 'sessao', () => agora);

    await auth.definirSenha({ id: 'u1', email: 'a@x.com' }, 'senha-forte');
    const [c] = await credenciais.listar();
    expect(c?.hash).toBeTruthy();
    expect(JSON.stringify(c)).not.toContain('senha-forte');

    await expect(auth.verificarCredenciais('a@x.com', 'errada')).rejects.toThrow(ErroAutenticacao);
    await expect(auth.verificarCredenciais('b@x.com', 'senha-forte')).rejects.toThrow(ErroAutenticacao);
    expect(await auth.verificarCredenciais('a@x.com', 'senha-forte')).toBe('u1');

    await auth.iniciarSessao('u1');
    expect(await auth.usuarioIdDaSessao()).toBe('u1');
    agora += 13 * 60 * 60 * 1000;
    expect(await auth.usuarioIdDaSessao()).toBeNull();
    banco.fechar();
  });
});
