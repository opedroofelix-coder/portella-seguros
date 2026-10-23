/** Valores monetários são guardados em centavos (inteiros) para evitar erros de arredondamento. */
export type Centavos = number;

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatarDinheiro(centavos: Centavos | null | undefined): string {
  if (centavos == null) return '—';
  return BRL.format(centavos / 100);
}

/** Converte "R$ 1.234,56", "1234,56" ou "1234.56" em centavos. Retorna null se não for número. */
export function paraCentavos(valor: string | number): Centavos | null {
  if (typeof valor === 'number') return Number.isFinite(valor) ? Math.round(valor * 100) : null;
  let texto = valor.replace(/[R$\s]/g, '');
  if (!texto) return null;
  if (texto.includes(',')) texto = texto.replace(/\./g, '').replace(',', '.');
  const numero = Number(texto);
  return Number.isFinite(numero) ? Math.round(numero * 100) : null;
}

/** Representação editável (ex.: 123456 → "1234,56"). */
export function centavosParaTexto(centavos: Centavos | null | undefined): string {
  if (centavos == null) return '';
  return (centavos / 100).toFixed(2).replace('.', ',');
}

export function porcentagem(base: Centavos, percentual: number): Centavos {
  return Math.round((base * percentual) / 100);
}

/**
 * Lê um valor digitado no padrão brasileiro. Sem vírgula, ponto seguido de grupos de três dígitos é
 * separador de milhar ("1.500" = R$ 1.500,00); com outra quantidade de dígitos é o decimal ("1.5").
 */
export function lerDinheiro(valor: string): Centavos | null {
  const texto = valor.replace(/[R$\s]/g, '');
  if (!texto.includes(',') && /^-?\d{1,3}(\.\d{3})+$/.test(texto)) {
    return paraCentavos(texto.replace(/\./g, ''));
  }
  return paraCentavos(texto);
}

/** Valor editável com separador de milhar (ex.: 150000 → "1.500,00"). */
export function textoDinheiro(centavos: Centavos | null | undefined): string {
  if (centavos == null) return '';
  return (centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
