import type { Centavos, DataISO, Registro } from '@portella/core';
import { dataValida, diasEntre, ErroValidacao } from '@portella/core';

export const CONTA_PRINCIPAL = 'Bradesco';

/** Movimento de uma conta (extrato bancário, poupança). Valores sempre positivos. */
export interface Movimento extends Registro {
  conta: string;
  data: DataISO;
  descricao: string;
  tipo: 'entrada' | 'saida' | 'saldo_inicial';
  valor: Centavos;
  documento?: string;
  /** Entradas: de quem veio o dinheiro (uma seguradora ou uma origem de Configurações, como o cliente). */
  origem?: string;
}

/** Texto do movimento no extrato: a origem da entrada e, se houver, o detalhe da descrição. */
export function textoMovimento(m: Pick<Movimento, 'descricao' | 'origem' | 'tipo'>): string {
  if (m.tipo === 'saldo_inicial') return `Saldo inicial · ${m.descricao}`;
  if (!m.origem || m.descricao === m.origem) return m.descricao;
  return `${m.origem} · ${m.descricao}`;
}

/** Conta a pagar da empresa (aba "Demonstrativo", seção Despesas). */
export interface Despesa extends Registro {
  descricao: string;
  vencimento?: DataISO;
  pagamento?: DataISO;
  valor: Centavos;
  pago: Centavos;
  categoria?: string;
}

/** Totais de um mês (aba "Faturamento"). O id é o próprio mês (AAAA-MM). */
export interface Fechamento extends Registro {
  mes: string;
  faturamento?: Centavos;
  creditoConsorcio?: Centavos;
}

export function validarMovimento(m: Partial<Movimento>): void {
  const campos: Record<string, string> = {};
  if (!m.conta?.trim()) campos.conta = 'Informe a conta.';
  if (!m.data || !dataValida(m.data)) campos.data = 'Data inválida.';
  if (!m.descricao?.trim()) campos.descricao = 'Informe a descrição.';
  if (m.valor == null || m.valor < 0) campos.valor = 'Informe um valor positivo.';
  if (Object.keys(campos).length) throw new ErroValidacao('Confira o movimento.', campos);
}

export function validarDespesa(d: Partial<Despesa>): void {
  const campos: Record<string, string> = {};
  if (!d.descricao?.trim()) campos.descricao = 'Informe a descrição.';
  if (d.valor == null || d.valor <= 0) campos.valor = 'Informe o valor.';
  if (d.vencimento && !dataValida(d.vencimento)) campos.vencimento = 'Data inválida.';
  if (Object.keys(campos).length) throw new ErroValidacao('Confira a despesa.', campos);
}

export function validarFechamento(f: Partial<Fechamento>): void {
  if (!f.mes || !/^\d{4}-(0[1-9]|1[0-2])$/.test(f.mes))
    throw new ErroValidacao('Mês inválido.', { mes: 'Use AAAA-MM.' });
}

/** Saldo de cada conta: saldos iniciais + entradas − saídas, até a data (inclusive). */
export function saldosPorConta(movimentos: Movimento[], ate?: DataISO): Map<string, Centavos> {
  const saldos = new Map<string, Centavos>();
  for (const m of movimentos) {
    if (ate && m.data > ate) continue;
    const sinal = m.tipo === 'saida' ? -1 : 1;
    saldos.set(m.conta, (saldos.get(m.conta) ?? 0) + sinal * m.valor);
  }
  return saldos;
}

/** Extrato de uma conta em ordem cronológica, com saldo acumulado em cada linha. */
export function extrato(movimentos: Movimento[], conta: string): Array<Movimento & { saldo: Centavos }> {
  let saldo = 0;
  return movimentos
    .filter((m) => m.conta === conta)
    .sort(
      (a, b) =>
        a.data.localeCompare(b.data) ||
        (a.tipo === 'saldo_inicial' ? -1 : 0) - (b.tipo === 'saldo_inicial' ? -1 : 0),
    )
    .map((m) => {
      saldo += m.tipo === 'saida' ? -m.valor : m.valor;
      return { ...m, saldo };
    });
}

export type SituacaoDespesa = 'paga' | 'aberta' | 'vencida';
export const ROTULO_DESPESA: Record<SituacaoDespesa, string> = {
  paga: 'Paga',
  aberta: 'Em aberto',
  vencida: 'Vencida',
};

export function situacaoDespesa(
  d: Pick<Despesa, 'valor' | 'pago' | 'vencimento'>,
  hoje: DataISO,
): SituacaoDespesa {
  if (d.pago >= d.valor) return 'paga';
  return d.vencimento && diasEntre(hoje, d.vencimento) < 0 ? 'vencida' : 'aberta';
}

export interface ResumoMes {
  entradas: Centavos;
  saidas: Centavos;
  despesas: Centavos;
  despesasPagas: Centavos;
  despesasAbertas: Centavos;
}

/** Movimento de caixa da conta principal e despesas (pelo vencimento) do mês AAAA-MM. */
export function resumirMes(
  movimentos: Movimento[],
  despesas: Despesa[],
  mes: string,
  conta = CONTA_PRINCIPAL,
): ResumoMes {
  const doMes = movimentos.filter((m) => m.conta === conta && m.data.startsWith(mes));
  const despesasMes = despesas.filter((d) => (d.vencimento ?? d.pagamento ?? d.criadoEm).startsWith(mes));
  const soma = (xs: Array<{ valor: Centavos }>) => xs.reduce((t, x) => t + x.valor, 0);
  return {
    entradas: soma(doMes.filter((m) => m.tipo === 'entrada')),
    saidas: soma(doMes.filter((m) => m.tipo === 'saida')),
    despesas: soma(despesasMes),
    despesasPagas: despesasMes.reduce((t, d) => t + Math.min(d.pago, d.valor), 0),
    despesasAbertas: despesasMes.reduce((t, d) => t + Math.max(0, d.valor - d.pago), 0),
  };
}
