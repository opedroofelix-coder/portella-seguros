import ExcelJS from 'exceljs';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import officeCrypto from 'officecrypto-tool';
import { describe, expect, it } from 'vitest';
import { converter, tipoDaAba } from './converter';
import { lerPlanilha } from './ler';
import { identificarCampo } from './mapeamento';
import { data, dinheiro, percentual, periodo } from './valores';

describe('valores', () => {
  it('converte datas em vários formatos', () => {
    expect(data('05/12/2026')).toBe('2026-12-05');
    expect(data('5/1/26')).toBe('2026-01-05');
    expect(data('2026-12-05')).toBe('2026-12-05');
    expect(data(46361)).toBe('2026-12-05'); // número de série do Excel
    expect(data(new Date(Date.UTC(2026, 11, 5)))).toBe('2026-12-05');
    expect(data('31/02/2026')).toBeUndefined();
    expect(data(12)).toBeUndefined();
    expect(periodo('01/01/2026 a 01/01/2027')).toEqual(['2026-01-01', '2027-01-01']);
  });

  it('converte dinheiro e percentual', () => {
    expect(dinheiro('R$ 1.234,56')).toBe(1234.56);
    expect(dinheiro(1234.567)).toBe(1234.57);
    expect(dinheiro('abc')).toBeUndefined();
    expect(percentual('15%')).toBe(15);
    expect(percentual(0.15)).toBe(15);
    expect(percentual(20)).toBe(20);
  });
});

describe('mapeamento de colunas', () => {
  it('reconhece sinônimos sem acento e com texto extra', () => {
    expect(identificarCampo('Segurado')).toBe('nome');
    expect(identificarCampo('CPF/CNPJ')).toBe('documento');
    expect(identificarCampo('Nº Apólice')).toBe('numeroApolice');
    expect(identificarCampo('Prêmio Líquido')).toBe('premioLiquido');
    expect(identificarCampo('Prêmio')).toBe('premioTotal');
    expect(identificarCampo('Fim da Vigência (dd/mm/aaaa)')).toBe('fimVigencia');
    expect(identificarCampo('Valor do Crédito')).toBe('valorCredito');
    expect(identificarCampo('Seguradora / Administradora')).toBe('seguradora');
    expect(identificarCampo('Coluna qualquer')).toBeUndefined();
  });

  it('classifica abas pelo nome', () => {
    expect(tipoDaAba('Consórcios')).toBe('consorcio');
    expect(tipoDaAba('Seguros Auto')).toBe('seguros');
    expect(tipoDaAba('Dezembro')).toBe('misto');
  });
});

describe('converter', () => {
  const misto = {
    nome: 'Dezembro',
    linhas: [
      ['Relatório de produção — dezembro'],
      [],
      [
        'Cliente',
        'CPF/CNPJ',
        'Telefone',
        'Produto',
        'Seguradora / Administradora',
        'Seguradora',
        'Administradora',
        'Grupo',
        'Cota',
        'Crédito',
        'Prazo',
        'Adesão',
        'Vigência',
        'Prêmio',
        'Comissão',
        'Corretor',
        'Extra',
      ],
      [
        'Maria Teste',
        '529.982.247-25',
        '(11) 99999-0000',
        'Auto',
        '',
        'Porto Seguro',
        '',
        '',
        '',
        '',
        '',
        '',
        '01/12/2026 a 01/12/2027',
        'R$ 2.500,00',
        0.15,
        'Carlos',
        'x',
      ],
      [
        'Maria Teste',
        '52998224725',
        '',
        'Residencial',
        '',
        'HDI',
        '',
        '',
        '',
        '',
        '',
        '',
        '10/12/2026 a 10/12/2027',
        800,
        '20%',
        'Carlos',
        '',
      ],
      [
        'João Teste',
        '',
        '11988887777',
        'Consórcio Imóvel',
        '',
        '',
        'Adm Teste',
        '1020',
        '33',
        'R$ 250.000,00',
        180,
        '15/12/2026',
        '',
        '',
        '',
        'Bruna',
        '',
      ],
      ['', '', '', 'Auto', '', 'HDI', '', '', '', '', '', '', '', '', '', '', ''],
      ['Sem Vigência', '', '', 'Vida', '', 'Tokio Marine', '', '', '', '', '', '', '', '', '', '', ''],
    ],
  };

  it('separa seguros e consórcio, junta clientes repetidos e relata o que ficou de fora', () => {
    const { seguros, consorcio, relatorio } = converter(
      [misto],
      'teste.xlsx',
      new Date('2026-10-22T00:00:00Z'),
    );

    expect(seguros.clientes.map((c) => c.nome)).toEqual(['Maria Teste', 'Sem Vigência']);
    expect(seguros.clientes[0]).toMatchObject({
      chave: '52998224725',
      documento: '52998224725',
      telefone: '11999990000',
      tipoPessoa: 'PF',
      responsavel: 'Carlos',
    });
    const apolices = seguros.apolices as Array<Record<string, unknown>>;
    expect(apolices).toHaveLength(2);
    expect(apolices[0]).toMatchObject({
      seguradora: 'Porto Seguro',
      ramo: 'Auto',
      inicioVigencia: '2026-12-01',
      fimVigencia: '2027-12-01',
      premioTotal: 2500,
      comissaoPercentual: 15,
    });
    expect(apolices[1]).toMatchObject({ seguradora: 'HDI', premioTotal: 800, comissaoPercentual: 20 });

    expect(consorcio.clientes).toHaveLength(1);
    expect(consorcio.cotas).toEqual([
      expect.objectContaining({
        administradora: 'Adm Teste',
        grupo: '1020',
        cota: '33',
        valorCredito: 250000,
        prazoMeses: 180,
        dataAdesao: '2026-12-15',
        tipoBem: 'Consórcio Imóvel',
        responsavel: 'Bruna',
      }),
    ]);

    const aba = relatorio.abas[0]!;
    expect(aba).toMatchObject({ linhaCabecalho: 3, linhas: 5, seguros: 3, consorcios: 1, ignoradas: 1 });
    expect(aba.naoReconhecidas).toContain('Extra');
    expect(relatorio.avisos.join('\n')).toMatch(/linha 7: sem nome/);
    expect(relatorio.avisos.join('\n')).toMatch(/linha 8: apólice sem fim de vigência/);
  });

  it('ignora abas sem cabeçalho reconhecível', () => {
    const { relatorio } = converter([{ nome: 'Capa', linhas: [['Portella'], ['Dezembro']] }], 'x');
    expect(relatorio.avisos[0]).toMatch(/Capa/);
  });
});

describe('lerPlanilha', () => {
  async function criarPlanilha() {
    const livro = new ExcelJS.Workbook();
    const aba = livro.addWorksheet('Seguros');
    aba.addRow(['Segurado', 'Seguradora', 'Ramo', 'Fim da vigência']);
    aba.addRow(['Ana Teste', 'Allianz', 'Auto', new Date(Date.UTC(2027, 0, 15))]);
    livro.addWorksheet('Oculta', { state: 'hidden' }).addRow(['x']);
    return Buffer.from(await livro.xlsx.writeBuffer());
  }

  it('lê abas visíveis de uma planilha comum', async () => {
    const pasta = await mkdtemp(join(tmpdir(), 'planilha-'));
    const caminho = join(pasta, 'p.xlsx');
    await writeFile(caminho, await criarPlanilha());
    const abas = await lerPlanilha(caminho);
    expect(abas.map((a) => a.nome)).toEqual(['Seguros']);
    const { seguros } = converter(abas, 'p.xlsx');
    expect(seguros.apolices).toEqual([
      expect.objectContaining({
        seguradora: 'Allianz',
        fimVigencia: '2027-01-15',
        inicioVigencia: '2026-01-15',
      }),
    ]);
  });

  it('abre planilha protegida por senha e recusa senha errada', async () => {
    const pasta = await mkdtemp(join(tmpdir(), 'planilha-'));
    const caminho = join(pasta, 'protegida.xlsx');
    await writeFile(caminho, officeCrypto.encrypt(await criarPlanilha(), { password: 'segredo' }));
    await expect(lerPlanilha(caminho)).rejects.toThrow(/protegida por senha/);
    await expect(lerPlanilha(caminho, 'errada')).rejects.toThrow(/incorreta/);
    expect((await lerPlanilha(caminho, 'segredo'))[0]?.linhas[1]?.[0]).toBe('Ana Teste');
  });
});
