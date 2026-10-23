import type { ProdutoDemo } from '@portella/app-base';
import { gerarDemo, isoData, somarMeses } from '@portella/app-base';
import type {
  ApoliceImportada,
  ArquivoImportacao,
  DespesaImportada,
  FechamentoImportado,
  MovimentoImportado,
} from '@portella/core';

/** Produtos e seguradoras da demonstração (valores inventados, faixas plausíveis). */
export const PRODUTOS_DEMO: ProdutoDemo[] = [
  { nome: 'Automóvel', peso: 40, premio: [1800, 6500], comissao: [10, 15, 20], parcelas: [1, 4, 10] },
  { nome: 'Residencial', peso: 12, premio: [300, 1200], comissao: [25, 30, 35], parcelas: [1, 4] },
  { nome: 'Saúde', peso: 9, premio: [900, 3200], comissao: [100, 200, 300], parcelas: [1, 3] },
  { nome: 'Vida', peso: 10, premio: [600, 2400], comissao: [20, 25, 30], parcelas: [1, 12], vitalicio: 2 },
  { nome: 'Empresarial', peso: 8, premio: [2500, 9000], comissao: [15, 20], parcelas: [1, 4] },
  { nome: 'Dental', peso: 5, premio: [300, 900], comissao: [50, 100], parcelas: [1] },
  { nome: 'Celular', peso: 4, premio: [250, 700], comissao: [25], parcelas: [1] },
  { nome: 'Fiança Locatícia', peso: 5, premio: [1200, 3500], comissao: [20, 25], parcelas: [1] },
  { nome: 'RC Profissional', peso: 4, premio: [900, 2600], comissao: [20], parcelas: [1] },
];
export const SEGURADORAS_DEMO = [
  'Porto Seguro',
  'HDI',
  'Azul',
  'Tokio Marine',
  'Bradesco',
  'Allianz',
  'Mapfre',
  'Suhai',
  'Sul América',
  'Yelum',
];
const ANUAIS = new Set([
  'Automóvel',
  'Residencial',
  'Empresarial',
  'Celular',
  'Fiança Locatícia',
  'RC Profissional',
]);
const DESPESAS = [
  { descricao: 'Aluguel da sala', valor: 3200, dia: 10 },
  { descricao: 'Contabilidade', valor: 650, dia: 15 },
  { descricao: 'Internet e telefone', valor: 280, dia: 20 },
  { descricao: 'Sistema de cotação', valor: 390, dia: 25 },
];

const reais = (v: number) => Math.round(v * 100) / 100;

/** Arquivo de importação fictício do CRM de Seguros, no mesmo formato gerado a partir da planilha. */
export function arquivoDemoSeguros(hoje: Date): ArquivoImportacao {
  const meses = 14;
  const g = gerarDemo({
    hoje,
    meses,
    quantidade: 220,
    produtos: PRODUTOS_DEMO,
    companhias: SEGURADORAS_DEMO,
  });
  const apolices: ApoliceImportada[] = g.vendas.map(({ proposta: p, responsavel }) => ({
    chave: p.vendaChave!,
    clienteChave: p.clienteChave,
    seguradora: p.companhia,
    ramo: p.produto,
    numero: p.numero,
    inicioVigencia: p.data,
    fimVigencia: ANUAIS.has(p.produto) ? isoData(somarMeses(new Date(`${p.data}T00:00:00Z`), 12)) : undefined,
    premioLiquido: p.premioLiquido,
    comissaoPercentual: p.comissaoPercentual,
    responsavel,
  }));

  // Extrato, despesas e faturamento mês a mês.
  const hojeIso = isoData(hoje);
  const inicio = somarMeses(hoje, -(meses - 1), 1);
  const movimentos: MovimentoImportado[] = [
    {
      chave: 'demo:saldo',
      conta: 'Bradesco',
      data: isoData(somarMeses(inicio, 0, 1)),
      descricao: 'Saldo anterior',
      tipo: 'saldo_inicial',
      valor: 18500,
    },
  ];
  const despesas: DespesaImportada[] = [];
  const fechamentos: FechamentoImportado[] = [];
  for (let m = 0; m < meses; m++) {
    const mes = isoData(somarMeses(inicio, m, 1)).slice(0, 7);
    const recebido = reais(
      g.vendas
        .flatMap((v) => v.proposta.recebimentos)
        .filter((r) => r.data.startsWith(mes))
        .reduce((t, r) => t + r.valor, 0),
    );
    const repasse = reais(g.pagamentos.filter((p) => p.mes === mes).reduce((t, p) => t + p.valor, 0));
    if (recebido) {
      movimentos.push({
        chave: `demo:rec:${mes}`,
        conta: 'Bradesco',
        data: `${mes}-26`,
        descricao: 'Comissões recebidas das seguradoras',
        tipo: 'entrada',
        valor: recebido,
      });
      fechamentos.push({ mes, faturamento: recebido });
    }
    for (const d of DESPESAS) {
      const vencimento = `${mes}-${String(d.dia).padStart(2, '0')}`;
      const paga = vencimento < hojeIso;
      despesas.push({
        chave: `demo:desp:${mes}:${d.dia}`,
        descricao: d.descricao,
        vencimento,
        valor: d.valor,
        pago: paga ? d.valor : 0,
        pagamento: paga ? vencimento : undefined,
        categoria: 'Despesas fixas',
      });
      if (paga)
        movimentos.push({
          chave: `demo:mov:${mes}:${d.dia}`,
          conta: 'Bradesco',
          data: vencimento,
          descricao: d.descricao,
          tipo: 'saida',
          valor: d.valor,
        });
    }
    if (repasse) {
      const pago = g.pagamentos.find((p) => p.mes === mes)!.data;
      if (pago <= hojeIso)
        movimentos.push({
          chave: `demo:rep:${mes}`,
          conta: 'Bradesco',
          data: pago,
          descricao: 'Repasse aos produtores',
          tipo: 'saida',
          valor: repasse,
        });
    }
  }

  return {
    versao: 1,
    sistema: 'seguros',
    origem: 'demonstração (dados fictícios)',
    geradoEm: hoje.toISOString(),
    clientes: g.clientes,
    apolices,
    propostas: g.vendas.map((v) => v.proposta),
    estornos: g.estornos,
    pagamentos: g.pagamentos,
    movimentos: movimentos.filter((m) => m.data <= hojeIso),
    despesas,
    fechamentos,
  };
}
