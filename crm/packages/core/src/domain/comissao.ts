import type { Centavos } from './dinheiro';
import { ErroValidacao } from './erros';
import type { DataISO, Registro } from './registro';

/**
 * Uma parcela de comissão de uma venda (apólice, endosso ou cota de consórcio), como nas abas
 * "A Receber" e "Comissões <corretor>" da planilha. O responsável é o corretor (produtor);
 * vendas feitas pela própria corretora ficam com `vendaDaCorretora`.
 */
export interface LancamentoComissao extends Registro {
  clienteId?: string;
  /** Nome do cliente no momento da venda (as linhas da planilha não têm documento). */
  clienteNome: string;
  produto: string;
  /** Seguradora ou administradora. */
  companhia: string;
  numeroProposta?: string;
  dataProposta?: DataISO;
  /** Parcela da comissão, ex.: "8/10". */
  parcela?: string;
  dataRecebimento?: DataISO;
  /** Prêmio líquido (seguros) ou crédito (consórcio). */
  premio?: Centavos;
  /** Comissão que a seguradora deve à corretora por esta parcela (negativa em estorno). */
  comissaoReceber: Centavos;
  comissaoRecebida: Centavos;
  /** Percentual repassado ao corretor (ex.: 20 = 20%). */
  percentualRepasse?: number;
  repasse?: Centavos;
  repassePago?: Centavos;
  estorno?: boolean;
  vendaDaCorretora?: boolean;
  /** Apólice ou cota a que a parcela se refere. */
  vendaId?: string;
  observacoes?: string;
}

export type SituacaoComissao = 'a_receber' | 'recebida' | 'estorno';
export const ROTULO_SITUACAO_COMISSAO: Record<SituacaoComissao, string> = {
  a_receber: 'A receber',
  recebida: 'Recebida',
  estorno: 'Estorno',
};

export const saldoReceber = (c: Pick<LancamentoComissao, 'comissaoReceber' | 'comissaoRecebida'>) =>
  c.comissaoReceber - c.comissaoRecebida;

export const saldoRepasse = (c: Pick<LancamentoComissao, 'repasse' | 'repassePago'>) =>
  (c.repasse ?? 0) - (c.repassePago ?? 0);

export function situacaoComissao(c: LancamentoComissao): SituacaoComissao {
  if (c.estorno || c.comissaoReceber < 0) return 'estorno';
  return saldoReceber(c) > 0 ? 'a_receber' : 'recebida';
}

/** Valor de mês para parcelas sem nenhuma data (ex.: datas inválidas na planilha). */
export const SEM_DATA = 'sem-data';

/** Mês de competência (AAAA-MM): o do recebimento; sem recebimento, o da proposta. */
export function mesCompetencia(c: Pick<LancamentoComissao, 'dataRecebimento' | 'dataProposta'>): string {
  return (c.dataRecebimento ?? c.dataProposta)?.slice(0, 7) ?? SEM_DATA;
}

/** Mês a mostrar primeiro: o do recebimento mais recente; sem recebimentos, o mês mais recente. */
export function mesMaisRecente(
  lancamentos: Array<Pick<LancamentoComissao, 'dataRecebimento' | 'dataProposta'>>,
): string | undefined {
  const recebidos = lancamentos
    .map((c) => c.dataRecebimento)
    .filter(Boolean)
    .sort();
  const ultimo = recebidos[recebidos.length - 1];
  if (ultimo) return ultimo.slice(0, 7);
  return lancamentos
    .map(mesCompetencia)
    .filter((m) => m !== SEM_DATA)
    .sort()
    .reverse()[0];
}

/** "8.10", "8/10" ou 8 → "8/10" / "8". Mantém outros formatos como vieram ("1.2.3." → "1, 2, 3"). */
export function formatarParcela(valor: string | number | undefined): string | undefined {
  if (valor == null || valor === '') return undefined;
  const t = String(valor).trim();
  const par = t.match(/^(\d+)[./](\d+)$/);
  if (par) return `${par[1]}/${par[2]}`;
  if (/^(\d+\.)+\d*$/.test(t)) return t.split('.').filter(Boolean).join(', ');
  return t === '-' ? undefined : t;
}

export function validarComissao(c: Partial<LancamentoComissao>): void {
  const campos: Record<string, string> = {};
  if (!c.clienteNome?.trim()) campos.clienteNome = 'Informe o cliente.';
  if (!c.companhia?.trim()) campos.companhia = 'Informe a companhia.';
  if (c.comissaoReceber == null || Number.isNaN(c.comissaoReceber))
    campos.comissaoReceber = 'Informe a comissão.';
  if (c.percentualRepasse != null && (c.percentualRepasse < 0 || c.percentualRepasse > 100)) {
    campos.percentualRepasse = 'Entre 0 e 100%.';
  }
  if (Object.keys(campos).length) throw new ErroValidacao('Confira os dados da comissão.', campos);
}

export interface ResumoCorretor {
  responsavelId: string;
  recebido: Centavos;
  repasse: Centavos;
  repassePago: Centavos;
  saldo: Centavos;
}

export interface ResumoComissoes {
  aReceber: Centavos;
  recebido: Centavos;
  estornos: Centavos;
  repasse: Centavos;
  repassePago: Centavos;
  /** Recebido menos repasses: o que fica para a corretora. */
  liquidoCorretora: Centavos;
  porCorretor: ResumoCorretor[];
  porCompanhia: Array<{ companhia: string; recebido: Centavos }>;
}

export function resumirComissoes(lancamentos: LancamentoComissao[]): ResumoComissoes {
  const corretores = new Map<string, ResumoCorretor>();
  const companhias = new Map<string, Centavos>();
  const r = { aReceber: 0, recebido: 0, estornos: 0, repasse: 0, repassePago: 0 };

  for (const c of lancamentos) {
    if (situacaoComissao(c) === 'estorno') r.estornos += c.comissaoRecebida || c.comissaoReceber;
    else {
      r.aReceber += Math.max(0, saldoReceber(c));
      r.recebido += c.comissaoRecebida;
      companhias.set(c.companhia, (companhias.get(c.companhia) ?? 0) + c.comissaoRecebida);
    }
    r.repasse += c.repasse ?? 0;
    r.repassePago += c.repassePago ?? 0;
    if (!c.vendaDaCorretora) {
      const p = corretores.get(c.responsavelId) ?? {
        responsavelId: c.responsavelId,
        recebido: 0,
        repasse: 0,
        repassePago: 0,
        saldo: 0,
      };
      p.recebido += c.comissaoRecebida;
      p.repasse += c.repasse ?? 0;
      p.repassePago += c.repassePago ?? 0;
      p.saldo = p.repasse - p.repassePago;
      corretores.set(c.responsavelId, p);
    }
  }
  return {
    ...r,
    liquidoCorretora: r.recebido + r.estornos - r.repasse,
    porCorretor: [...corretores.values()].sort((a, b) => b.repasse - a.repasse),
    porCompanhia: [...companhias]
      .map(([companhia, recebido]) => ({ companhia, recebido }))
      .sort((a, b) => b.recebido - a.recebido),
  };
}
