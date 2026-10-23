import { describe, expect, it } from 'vitest';
import { ErroPermissao, ErroValidacao } from '../domain/erros';
import type { Usuario } from '../domain/usuario';
import {
  lerArquivoImportacao,
  prepararClientes,
  prepararEstornos,
  prepararPagamentos,
  prepararPropostas,
  resolverResponsavel,
} from './importacao';

const u = (id: string, nome: string, perfil: Usuario['perfil'] = 'corretor'): Usuario => ({
  id,
  nome,
  login: id,
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

describe('importação de propostas, estornos e pagamentos', () => {
  it('liga produtores pelo nome, converte reais em centavos e mantém repasses fixos da planilha', () => {
    const equipe = [admin, u('c1', 'Carla Souza'), u('d1', 'Deliziane Portela')];
    const { resolver } = resolverResponsavel(equipe, admin);
    const [p] = prepararPropostas(
      [
        {
          chave: 'azul|3144210781',
          clienteChave: 'k1',
          clienteNome: 'Maria',
          numero: '3144210781',
          data: '2024-04-23',
          companhia: 'Azul',
          produto: 'Automovel',
          premioLiquido: 4194.49,
          comissaoReceber: 83.89,
          produtores: [
            { nome: 'Carla', percentual: 20 },
            { nome: 'Deliziane', percentual: 40 },
          ],
          recebimentos: [
            {
              chave: 'r1',
              data: '2024-12-18',
              valor: 83.89,
              parcela: '8/10',
              repasses: { Carla: 16.78, Deliziane: 33.56 },
            },
          ],
        },
      ],
      admin,
      resolver,
      new Map([['k1', 'cli1']]),
      '2026-10-22',
    );
    expect(p).toMatchObject({
      id: 'imp:proposta:azul|3144210781',
      responsavelId: 'c1',
      clienteId: 'cli1',
      status: 'aprovada',
      premioLiquido: 419449,
      comissaoReceber: 8389,
      produtores: [
        { produtorId: 'c1', percentual: 20 },
        { produtorId: 'd1', percentual: 40 },
      ],
    });
    expect(p?.recebimentos[0]).toMatchObject({
      id: 'imp:recebimento:r1',
      valor: 8389,
      parcela: '8/10',
      repasses: { c1: 1678, d1: 3356 },
    });
  });

  it('sem repasse na planilha, usa o % padrão do produtor', () => {
    const { resolver } = resolverResponsavel([admin, u('g1', 'Gisele')], admin);
    const [p] = prepararPropostas(
      [
        {
          chave: 'k',
          clienteChave: 'k1',
          clienteNome: 'Cliente Teste',
          data: '2024-12-01',
          companhia: 'GNDI',
          produto: 'Saúde',
          comissaoReceber: 50,
          produtores: [{ nome: 'Gisele', percentual: 0 }],
          recebimentos: [],
        },
      ],
      admin,
      resolver,
      new Map(),
      '2026-10-22',
      (id) => (id === 'g1' ? 50 : undefined),
    );
    expect(p?.produtores).toEqual([{ produtorId: 'g1', percentual: 50 }]);
  });

  it('estornos e pagamentos ficam com o produtor e exigem administrador', () => {
    const { resolver } = resolverResponsavel([admin, u('c1', 'Carla')], admin);
    const [e] = prepararEstornos(
      [
        {
          chave: 'e1',
          produtor: 'Carla',
          segurado: 'José',
          companhia: 'Azul',
          produto: 'Estorno',
          data: '2024-12-30',
          valor: 574.01,
          descontoProdutor: 114.8,
        },
      ],
      admin,
      resolver,
      '',
    );
    expect(e).toMatchObject({ responsavelId: 'c1', valor: 57401, descontoProdutor: 11480 });
    const [pg] = prepararPagamentos(
      [{ chave: 'p1', produtor: 'Carla', mes: '2024-12', data: '2024-12-30', valor: 3142.51 }],
      admin,
      resolver,
      '',
    );
    expect(pg).toMatchObject({ responsavelId: 'c1', mes: '2024-12', valor: 314251 });
    expect(() => prepararPagamentos([], u('c1', 'Carla'), resolver, '')).toThrow(ErroPermissao);
  });
});
