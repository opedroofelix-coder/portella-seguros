import type { Cliente, LancamentoComissao, Oportunidade, Usuario } from '@portella/core';
import { AutenticacaoMemoria, RepositorioMemoria } from '@portella/core';
import { describe, expect, it } from 'vitest';
import type { Apolice } from '../domain/apolice';
import type { Despesa, Fechamento, Movimento } from '../domain/financeiro';
import { criarImportacao, identificarRamo, identificarSeguradora } from './importacao';
import { renovarApolice, sugerirRenovacao } from './renovacao';
import { montarServicos } from './servicos';

const admin: Usuario = {
  id: 'adm',
  nome: 'Ana Admin',
  email: 'a@x.com',
  perfil: 'admin',
  ativo: true,
  criadoEm: '',
};
const carlos: Usuario = { ...admin, id: 'c1', nome: 'Carlos Souza', perfil: 'corretor' };

function servicos() {
  return montarServicos({
    auth: new AutenticacaoMemoria(),
    usuarios: new RepositorioMemoria<Usuario>([admin, carlos]),
    clientes: new RepositorioMemoria<Cliente>(),
    oportunidades: new RepositorioMemoria<Oportunidade>(),
    comissoes: new RepositorioMemoria<LancamentoComissao>(),
    apolices: new RepositorioMemoria<Apolice>(),
    movimentos: new RepositorioMemoria<Movimento>(),
    despesas: new RepositorioMemoria<Despesa>(),
    fechamentos: new RepositorioMemoria<Fechamento>(),
  });
}

describe('renovação', () => {
  it('cria a apólice nova com 12 meses e marca a anterior como renovada', async () => {
    const s = servicos();
    const anterior = await s.apolices.salvar(carlos, {
      clienteId: 'x',
      seguradora: 'porto',
      ramo: 'auto',
      inicioVigencia: '2025-11-10',
      fimVigencia: '2026-11-10',
      renovacao: 'em_contato',
      comissaoPercentual: 15,
    });
    const sugestao = sugerirRenovacao(anterior);
    expect(sugestao).toMatchObject({
      inicioVigencia: '2026-11-10',
      fimVigencia: '2027-11-10',
      comissaoPercentual: 15,
      responsavelId: 'c1',
    });
    const nova = await renovarApolice(s.apolices, carlos, anterior, { ...sugestao, seguradora: 'hdi' });
    const todas = await s.apolices.listar(carlos);
    expect(todas).toHaveLength(2);
    expect(todas.find((a) => a.id === anterior.id)?.renovacao).toBe('renovada');
    expect(nova.seguradora).toBe('hdi');
  });
});

describe('importação de seguros', () => {
  it('reconhece seguradoras e ramos escritos de formas diferentes', () => {
    expect(identificarSeguradora('PORTO SEGURO CIA DE SEGUROS')).toBe('porto');
    expect(identificarSeguradora('Sul America')).toBe('sulamerica');
    expect(identificarSeguradora('Tokio Marine Seguradora')).toBe('tokio');
    expect(identificarSeguradora('Youse')).toBe('Youse');
    expect(identificarRamo('AUTOMÓVEL')).toBe('auto');
    expect(identificarRamo('Seguro de Vida em Grupo')).toBe('vida');
    expect(identificarRamo('Residencial')).toBe('residencial');
    expect(identificarRamo('Fiança locatícia')).toBe('fianca');
    expect(identificarRamo('Xyz')).toBe('outros');
  });

  it('analisa o arquivo, avisa problemas e importa sem duplicar', async () => {
    const s = servicos();
    const arquivo = {
      versao: 1,
      sistema: 'seguros',
      origem: 'planilha.xlsx',
      geradoEm: '',
      clientes: [
        { chave: 'k1', nome: 'Maria', responsavel: 'Carlos' },
        { chave: 'k2', nome: 'João', responsavel: 'Pedro' },
      ],
      apolices: [
        {
          chave: 'a1',
          clienteChave: 'k1',
          seguradora: 'Porto Seguro',
          ramo: 'Auto',
          inicioVigencia: '2026-01-01',
          fimVigencia: '2027-01-01',
          premioLiquido: 1500.5,
          comissaoPercentual: 20,
          responsavel: 'Carlos',
        },
        {
          chave: 'a2',
          clienteChave: 'k9',
          seguradora: 'HDI',
          ramo: 'Auto',
          inicioVigencia: '2026-01-01',
          fimVigencia: '2025-01-01',
        },
        { chave: 'a3', clienteChave: 'k2', seguradora: 'GNDI', ramo: 'Saude', inicioVigencia: '2024-06-01' },
      ],
      comissoes: [
        {
          chave: 'x1',
          clienteChave: 'k1',
          vendaChave: 'a1',
          clienteNome: 'Maria',
          produto: 'Auto',
          companhia: 'Porto Seguro',
          comissaoReceber: 300,
          comissaoRecebida: 300,
          repasse: 60,
          responsavel: 'Carlos',
        },
        {
          chave: 'x2',
          clienteChave: 'k2',
          clienteNome: 'João',
          produto: 'Endosso',
          companhia: 'HDI',
          comissaoReceber: 40,
          comissaoRecebida: 0,
          vendaDaCorretora: true,
        },
      ],
      movimentos: [
        {
          chave: 'm1',
          conta: 'Bradesco',
          data: '2024-10-31',
          descricao: 'Saldo Anterior',
          tipo: 'saldo_inicial',
          valor: 16389.31,
        },
        {
          chave: 'm2',
          conta: 'Bradesco',
          data: '2024-12-02',
          descricao: 'Recebimento',
          tipo: 'entrada',
          valor: 31.43,
        },
      ],
      despesas: [{ chave: 'd1', descricao: 'Aluguel', vencimento: '2024-12-15', valor: 3327, pago: 3327 }],
      fechamentos: [{ mes: '2024-12', faturamento: 65341.09, creditoConsorcio: 498000 }],
    };
    const imp = criarImportacao(s);
    const previa = await imp.analisar(arquivo, admin, [admin, carlos]);
    expect(previa.resumo).toEqual([
      ['Clientes', 2],
      ['Apólices', 2],
      ['Comissões', 2],
      ['Movimentos de conta', 2],
      ['Despesas', 1],
      ['Meses de faturamento', 1],
    ]);
    expect(previa.avisos.join('\n')).toMatch(/a2.*cliente/i);
    expect(previa.avisos.join('\n')).toMatch(/Pedro/);
    await previa.confirmar();
    await (await imp.analisar(arquivo, admin, [admin, carlos])).confirmar();

    const apolices = await s.apolices.listar(admin);
    expect(apolices).toHaveLength(2);
    expect(apolices.find((a) => a.numero === undefined && a.ramo === 'auto')).toMatchObject({
      premioLiquido: 150050,
      seguradora: 'porto',
      responsavelId: 'c1',
    });
    expect(apolices.find((a) => a.ramo === 'saude')).toMatchObject({
      seguradora: 'GNDI',
      fimVigencia: undefined,
    });
    const comissoes = await s.comissoes.listar(admin);
    expect(comissoes).toHaveLength(2);
    expect(comissoes.find((c) => c.clienteNome === 'Maria')).toMatchObject({
      vendaId: 'imp:apolice:a1',
      comissaoRecebida: 30000,
      repasse: 6000,
      responsavelId: 'c1',
    });
    expect(await s.comissoes.listar(carlos)).toHaveLength(1);
    expect(await s.movimentos.listar(admin)).toHaveLength(2);
    await expect(s.movimentos.listar(carlos)).rejects.toThrow();
    expect((await s.fechamentos.listar(admin))[0]).toMatchObject({ id: '2024-12', faturamento: 6534109 });
    expect((await s.despesas.listar(admin))[0]).toMatchObject({ valor: 332700, pago: 332700 });
    expect(await s.clientes.listar(admin)).toHaveLength(2);
    expect(await s.clientes.listar(carlos)).toHaveLength(1);
  });
});
