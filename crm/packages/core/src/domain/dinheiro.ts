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
