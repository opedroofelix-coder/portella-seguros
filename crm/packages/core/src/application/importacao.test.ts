import { describe, expect, it } from 'vitest';
import { ErroPermissao, ErroValidacao } from '../domain/erros';
import type { Usuario } from '../domain/usuario';
import { lerArquivoImportacao, prepararClientes, resolverResponsavel } from './importacao';

const u = (id: string, nome: string, perfil: Usuario['perfil'] = 'corretor'): Usuario => ({
  id, nome, email: `${id}@x.com`, perfil, ativo: true, criadoEm: '',
});
const admin = u('adm', 'Ana Admin', 'admin');

describe('importação', () => {
  it('rejeita arquivo desconhecido ou de outro sistema', () => {
    expect(() => lerArquivoImportacao({}, 'seguros')).toThrow(ErroValidacao);
    expect(() => lerArquivoImportacao({ versao: 1, sistema: 'consorcio', clientes: [] }, 'seguros')).toThrow(/consórcio/);
  });

  it('associa responsáveis pelo nome completo ou primeiro nome sem ambiguidade', () => {
    const equipe = [admin, u('c1', 'Carlos Souza'), u('c2', 'Bruna Lima'), u('c3', 'Bruna Alves')];
    const { resolver, naoEncontrados } = resolverResponsavel(equipe, admin);
    expect(resolver('CARLOS souza')).toBe('c1');
    expect(resolver('Carlos')).toBe('c1');
    expect(resolver('Bruna')).toBe('adm');
    expect(resolver('Zé')).toBe('adm');
    expect(resolver(undefined)).toBe('adm');
    expect([...naoEncontrados]).toEqual(['Bruna', 'Zé']);
  });

  it('gera ids estáveis e exige administrador', () => {
    const arquivo = lerArquivoImportacao(
      { versao: 1, sistema: 'seguros', origem: 'x', geradoEm: '', clientes: [{ chave: '52998224725', nome: 'Maria', responsavel: 'Ana Admin' }] },
      'seguros',
    );
    const { clientes, idPorChave } = prepararClientes(arquivo, admin, () => 'adm', '2026-10-22');
    expect(clientes[0]).toMatchObject({ id: 'imp:cliente:52998224725', nome: 'Maria', tipoPessoa: 'PF', responsavelId: 'adm' });
    expect(clientes[0]).not.toHaveProperty('chave');
    expect(idPorChave.get('52998224725')).toBe('imp:cliente:52998224725');
    expect(() => prepararClientes(arquivo, u('c1', 'Carlos'), () => 'c1', '')).toThrow(ErroPermissao);
  });
});
