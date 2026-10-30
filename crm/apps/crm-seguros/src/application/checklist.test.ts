import type { Cliente, Proposta } from '@portella/core';
import { describe, expect, it } from 'vitest';
import type { Apolice } from '../domain/apolice';
import { montarChecklist, propostaDaApolice, tituloPagamentos } from './checklist';

const base = { responsavelId: 'gisele', criadoEm: '', atualizadoEm: '' };
const apolice: Apolice = {
  ...base,
  id: 'a1',
  clienteId: 'c1',
  seguradora: 'porto',
  ramo: 'auto',
  tipo: 'renovacao',
  numero: '0531.123',
  numeroProposta: 'P-778',
  item: 'Onix 1.0 2022',
  placa: 'ABC1D23',
  inicioVigencia: '2026-10-01',
  fimVigencia: '2027-10-01',
  premioTotal: 300000,
  quantidadeParcelas: 3,
  parcelas: [
    { valor: 100000, vencimento: '2026-10-10', consulta: '2026-10-14', pago: true },
    { valor: 100000, vencimento: '2026-11-10' },
    { valor: 100000, vencimento: '2026-12-10' },
  ],
  ocorrencias: [{ data: '2026-10-20', descricao: 'Cliente pediu 2ª via do boleto', responsavel: 'Mary' }],
  renovacao: 'pendente',
};
const cliente: Cliente = {
  ...base,
  id: 'c1',
  nome: 'Maria da Silva Souza',
  tipoPessoa: 'PF',
  documento: '52998224725',
};
const proposta: Proposta = {
  ...base,
  id: 'p1',
  clienteId: 'c1',
  clienteNome: 'Maria',
  numero: 'p778',
  data: '2026-09-25',
  companhia: 'Porto Seguro',
  produto: 'Automóvel',
  formaPagamento: 'Cartão de crédito',
  comissaoReceber: 0,
  produtores: [{ produtorId: 'gisele', percentual: 50 }],
  recebimentos: [],
  status: 'aprovada',
};

describe('checklist da apólice', () => {
  it('liga a apólice à proposta pelo número e usa a forma de pagamento dela', () => {
    expect(propostaDaApolice(apolice, [proposta])).toBe(proposta);
    expect(propostaDaApolice({ ...apolice, numeroProposta: undefined, numero: undefined }, [proposta])).toBe(
      undefined,
    );
    expect(tituloPagamentos(apolice, 'Cartão de crédito')).toContain('Cartão Porto Seguro');
    expect(tituloPagamentos(apolice, 'Boleto')).toBe('Acompanhamento dos pagamentos');
  });

  it('monta o modelo da Portella: tipo marcado, dados, parcelas e ocorrências com linhas em branco', () => {
    const doc = montarChecklist(apolice, {
      cliente,
      proposta,
      nomeDe: (id) => (id === 'gisele' ? 'Gisele Costa' : id),
    });
    expect(doc.titulo).toBe('Check-list · Seguro Auto');
    // Muitos dados: no PDF o resumo vai em duas colunas na largura toda.
    expect(doc.resumoEmColunas).toBe(true);
    expect(doc.subtitulo).toContain('(x) Renovação');
    expect(doc.subtitulo).toContain('(  ) Seguro novo');
    const resumo = Object.fromEntries(doc.resumo!);
    expect(resumo).toMatchObject({
      Corretor: 'Gisele Costa',
      Segurado: 'Maria da Silva Souza',
      CPF: '529.982.247-25',
      Placa: 'ABC1D23',
      Proposta: 'P-778',
      'Forma de pagamento': 'Cartão de crédito',
      'Quantidade de parcelas': '3',
      'Valor total do seguro': { dinheiro: 300000 },
    });
    const [pagamentos, ocorrencias] = doc.secoes;
    expect(pagamentos!.titulo).toContain('Cartão Porto Seguro');
    expect(pagamentos!.linhas).toHaveLength(12);
    expect(pagamentos!.linhas[0]).toEqual(['1ª', { dinheiro: 100000 }, '10/10/2026', '14/10/2026', 'Pago']);
    expect(pagamentos!.linhas[11]![0]).toBe('12ª');
    expect(ocorrencias!.linhas[0]).toEqual(['20/10/2026', 'Cliente pediu 2ª via do boleto', '', '', 'Mary']);
    expect(ocorrencias!.linhas).toHaveLength(10);
  });
});
