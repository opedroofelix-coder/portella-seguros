import type { Cliente, Oportunidade, Usuario } from '@portella/core';
import { AutenticacaoMemoria, RepositorioMemoria } from '@portella/core';
import { describe, expect, it } from 'vitest';
import type { Apolice } from '../domain/apolice';
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
    apolices: new RepositorioMemoria<Apolice>(),
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
      ],
    };
    const imp = criarImportacao(s);
    const previa = await imp.analisar(arquivo, admin, [admin, carlos]);
    expect(previa.resumo).toEqual([
      ['Clientes', 2],
      ['Apólices', 1],
    ]);
    expect(previa.avisos.join('\n')).toMatch(/a2.*cliente/i);
    expect(previa.avisos.join('\n')).toMatch(/Pedro/);
    await previa.confirmar();
    await (await imp.analisar(arquivo, admin, [admin, carlos])).confirmar();

    const apolices = await s.apolices.listar(admin);
    expect(apolices).toHaveLength(1);
    expect(apolices[0]).toMatchObject({ premioLiquido: 150050, seguradora: 'porto', responsavelId: 'c1' });
    expect(await s.clientes.listar(admin)).toHaveLength(2);
    expect(await s.clientes.listar(carlos)).toHaveLength(1);
  });
});
