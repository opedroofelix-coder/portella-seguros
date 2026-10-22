import { describe, expect, it } from 'vitest';
import { ErroPermissao, ErroValidacao } from '../domain/erros';
import type { Usuario } from '../domain/usuario';
import { lerArquivoImportacao, prepararClientes, prepararComissoes, resolverResponsavel } from './importacao';

const u = (id: string, nome: string, perfil: Usuario['perfil'] = 'corretor'): Usuario => ({
  id,
  nome,
  email: `${id}@x.com`,
  perfil,
  ativo: true,
  criadoEm: '',
});
const admin = u('adm', 'Ana Admin', 'admin');

describe('importação', () => {
  it('rejeita arquivo desconhecido ou de outro sistema', () => {
    expect(() => lerArquivoImportacao({}, 'seguros')).toThrow(ErroValidacao);
    expect(() => lerArquivoImportacao({ versao: 1, sistema: 'consorcio', clientes: [] }, 'seguros')).toThrow(
      /consórcio/,
    );
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
      {
        versao: 1,
        sistema: 'seguros',
        origem: 'x',
        geradoEm: '',
        clientes: [{ chave: '52998224725', nome: 'Maria', responsavel: 'Ana Admin' }],
      },
      'seguros',
    );
    const { clientes, idPorChave } = prepararClientes(arquivo, admin, () => 'adm', '2026-10-22');
    expect(clientes[0]).toMatchObject({
      id: 'imp:cliente:52998224725',
      nome: 'Maria',
      tipoPessoa: 'PF',
      responsavelId: 'adm',
    });
    expect(clientes[0]).not.toHaveProperty('chave');
    expect(idPorChave.get('52998224725')).toBe('imp:cliente:52998224725');
    expect(() => prepararClientes(arquivo, u('c1', 'Carlos'), () => 'c1', '')).toThrow(ErroPermissao);
  });
});

describe('importação de comissões', () => {
  it('converte reais em centavos, liga cliente e venda e atribui vendas da corretora ao admin', () => {
    const [a, b] = prepararComissoes(
      [
        { chave: 'x1', clienteChave: 'k1', vendaChave: 'v1', clienteNome: 'Maria', produto: 'Auto', companhia: 'Suhai', comissaoReceber: 83.89, comissaoRecebida: 83.89, repasse: 16.78, responsavel: 'Carla' },
        { chave: 'x2', clienteChave: 'k2', clienteNome: 'João', produto: 'Vida', companhia: 'Porto', comissaoReceber: 29.42, comissaoRecebida: 0, vendaDaCorretora: true },
      ],
      admin,
      (nome) => (nome === 'Carla' ? 'c1' : 'adm'),
      new Map([['k1', 'cli1']]),
      new Map([['v1', 'ap1']]),
      '2026-10-22',
    );
    expect(a).toMatchObject({ id: 'imp:comissao:x1', clienteId: 'cli1', vendaId: 'ap1', comissaoReceber: 8389, repasse: 1678, responsavelId: 'c1' });
    expect(b).toMatchObject({ clienteId: undefined, comissaoRecebida: 0, responsavelId: 'adm', vendaDaCorretora: true });
  });
});
