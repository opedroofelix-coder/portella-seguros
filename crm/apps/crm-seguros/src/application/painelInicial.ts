import type { Agrupado, Centavos, Painel, Proposta } from '@portella/core';
import { CORRETORA, fatiaProducao } from '@portella/core';

/** AAAA-MM somando `n` meses (negativo volta). */
export function somarMes(mes: string, n: number): string {
  const [a, m] = mes.split('-').map(Number) as [number, number];
  const total = a * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}

/** Produção (prêmio líquido) por mês das propostas aprovadas; `produtorId` usa só a fatia dele. */
export function producaoPorMes(propostas: Proposta[], produtorId?: string): Map<string, Centavos> {
  const meses = new Map<string, Centavos>();
  for (const p of propostas) {
    if (p.status !== 'aprovada') continue;
    const fatia = produtorId == null ? 1 : fatiaProducao(p, produtorId);
    if (!fatia) continue;
    const mes = p.data.slice(0, 7);
    meses.set(mes, (meses.get(mes) ?? 0) + Math.round((p.premioLiquido ?? 0) * fatia));
  }
  return meses;
}

/** Os `n` meses até `ate` (inclusive), com zero onde não houve produção. */
export function serieMensal(porMes: Map<string, Centavos>, ate: string, n = 12) {
  return Array.from({ length: n }, (_, i) => {
    const mes = somarMes(ate, i - (n - 1));
    return { mes, premio: porMes.get(mes) ?? 0 };
  });
}

const variacao = (atual: number, base: number) => (base > 0 ? (atual - base) / base : null);

export interface Crescimento {
  /** Mês sobre o mês anterior. */
  mes: number | null;
  /** Mês sobre o mesmo mês do ano anterior. */
  mesAnoAnterior: number | null;
  /** Ano até o mês sobre o mesmo trecho do ano anterior. */
  acumulado: number | null;
}

/** Variações em fração (0,1 = +10%); null quando falta a base de comparação. */
export function crescimento(porMes: Map<string, Centavos>, mes: string): Crescimento {
  const valor = (m: string) => porMes.get(m) ?? 0;
  const ano = Number(mes.slice(0, 4));
  const ateMes = Number(mes.slice(5, 7));
  let acumulado = 0;
  let acumuladoAnterior = 0;
  for (let m = 1; m <= ateMes; m++) {
    const sufixo = `-${String(m).padStart(2, '0')}`;
    acumulado += valor(`${ano}${sufixo}`);
    acumuladoAnterior += valor(`${ano - 1}${sufixo}`);
  }
  return {
    mes: variacao(valor(mes), valor(somarMes(mes, -1))),
    mesAnoAnterior: variacao(valor(mes), valor(somarMes(mes, -12))),
    acumulado: variacao(acumulado, acumuladoAnterior),
  };
}

export interface LinhaProdutor {
  produtorId: string;
  producao: Centavos;
  saldo: Centavos;
  repasse: Centavos;
}

/** Produção do período com o saldo e o repasse pendentes (sem filtro), um produtor por linha. */
export function linhasPorProdutor(painel: Painel): LinhaProdutor[] {
  const linhas = new Map<string, LinhaProdutor>();
  const linha = (id: string) => {
    const l = linhas.get(id) ?? { produtorId: id, producao: 0, saldo: 0, repasse: 0 };
    linhas.set(id, l);
    return l;
  };
  for (const g of painel.porProdutor) linha(g.chave).producao += g.premio;
  for (const g of painel.pendentes) {
    const l = linha(g.produtorId);
    l.saldo += g.saldo;
    if (g.produtorId !== CORRETORA) l.repasse += g.repasseProjetado;
  }
  return [...linhas.values()].sort(
    (a, b) =>
      Number(a.produtorId === CORRETORA) - Number(b.produtorId === CORRETORA) ||
      b.producao - a.producao ||
      b.saldo - a.saldo,
  );
}

/** Os `n` maiores e o resto somado numa linha "Outras N". */
export function maioresEOutros(grupos: Agrupado[], n: number, rotuloOutros: (qtd: number) => string) {
  if (grupos.length <= n + 1) return grupos.map((g) => ({ ...g, outros: false }));
  const resto = grupos.slice(n);
  return [
    ...grupos.slice(0, n).map((g) => ({ ...g, outros: false })),
    {
      chave: rotuloOutros(resto.length),
      premio: resto.reduce((t, g) => t + g.premio, 0),
      quantidade: resto.reduce((t, g) => t + g.quantidade, 0),
      outros: true,
    },
  ];
}
