import type { ProdutoDemo } from '@portella/app-base';
import { gerarDemo, isoData, somarMeses, sorteador } from '@portella/app-base';
import type { ArquivoImportacao, CotaImportada } from '@portella/core';

/** Consórcios da demonstração: "prêmio" é o crédito da cota; a comissão é um % do crédito. */
export const PRODUTOS_DEMO: ProdutoDemo[] = [
  { nome: 'Consórcio Imóvel', peso: 4, premio: [150_000, 600_000], comissao: [1, 1.5, 2], parcelas: [4, 6] },
  { nome: 'Consórcio Automóvel', peso: 6, premio: [50_000, 180_000], comissao: [2, 3], parcelas: [3, 4] },
  { nome: 'Consórcio Moto', peso: 2, premio: [15_000, 40_000], comissao: [3, 4], parcelas: [1, 3] },
  { nome: 'Consórcio Pesados', peso: 1, premio: [250_000, 700_000], comissao: [1, 1.5], parcelas: [4] },
];
export const ADMINISTRADORAS_DEMO = [
  'Administradora Teste Alfa',
  'Administradora Teste Beta',
  'Administradora Teste Gama',
];
const TIPO_BEM: Record<string, string> = {
  'Consórcio Imóvel': 'Imóvel',
  'Consórcio Automóvel': 'Automóvel',
  'Consórcio Moto': 'Moto',
  'Consórcio Pesados': 'Pesados',
};

/** Arquivo de importação fictício do CRM de Consórcio. */
export function arquivoDemoConsorcio(hoje: Date): ArquivoImportacao {
  const g = gerarDemo({
    hoje,
    meses: 14,
    quantidade: 70,
    produtos: PRODUTOS_DEMO,
    companhias: ADMINISTRADORAS_DEMO,
    semente: 4242,
  });
  const r = sorteador(99);
  const cotas: CotaImportada[] = g.vendas.map(({ proposta: p, responsavel }, i) => {
    const prazo = p.produto === 'Consórcio Imóvel' ? 200 : p.produto === 'Consórcio Moto' ? 60 : 80;
    const credito = p.premioLiquido ?? 0;
    const meses = Math.max(
      0,
      Math.round((hoje.getTime() - new Date(`${p.data}T00:00:00Z`).getTime()) / 2_629_800_000),
    );
    const contemplada = r.numero() < 0.18 && meses > 2;
    return {
      chave: p.vendaChave!,
      clienteChave: p.clienteChave,
      administradora: p.companhia,
      numeroProposta: p.numero,
      // Algumas cotas ainda sem grupo e cota, como acontece na planilha.
      grupo: i % 9 === 0 ? undefined : String(1000 + (i % 23) * 7),
      cota: i % 9 === 0 ? undefined : String(10 + ((i * 13) % 480)),
      tipoBem: TIPO_BEM[p.produto],
      valorCredito: credito,
      prazoMeses: i % 9 === 0 ? undefined : prazo,
      valorParcela: Math.round((credito * 1.18 * 100) / prazo) / 100,
      dataAdesao: p.data,
      parcelasPagas: meses,
      status: contemplada ? 'contemplada' : 'ativa',
      dataContemplacao: contemplada ? isoData(somarMeses(new Date(`${p.data}T00:00:00Z`), 2, 18)) : undefined,
      formaContemplacao: contemplada ? (r.numero() < 0.5 ? 'lance' : 'sorteio') : undefined,
      responsavel,
    };
  });
  return {
    versao: 1,
    sistema: 'consorcio',
    origem: 'demonstração (dados fictícios)',
    geradoEm: hoje.toISOString(),
    clientes: g.clientes,
    cotas,
    propostas: g.vendas.map((v) => v.proposta),
    estornos: g.estornos,
    pagamentos: g.pagamentos,
  };
}
