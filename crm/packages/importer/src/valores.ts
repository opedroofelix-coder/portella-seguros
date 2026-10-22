/** Conversão dos valores de célula (texto livre, número, data do Excel) para o formato do CRM. */

export type Celula =
  | string
  | number
  | boolean
  | Date
  | null
  | undefined
  | { text?: string; result?: unknown; formula?: string; richText?: Array<{ text: string }> };

export function semAcento(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Cabeçalho normalizado: minúsculo, sem acento, sem pontuação, espaços simples. */
export function normalizarCabecalho(texto: string): string {
  return semAcento(texto)
    .toLowerCase()
    .replace(/[º°ª]/g, '')
    .replace(/[^a-z0-9%]+/g, ' ')
    .trim();
}

/** Extrai o valor "cru" de células do exceljs (fórmulas, links, rich text). */
export function valorCelula(c: Celula): string | number | boolean | Date | null {
  if (c == null) return null;
  if (c instanceof Date || typeof c !== 'object') return c;
  if ('result' in c && c.result !== undefined) return valorCelula(c.result as Celula);
  if ('richText' in c && c.richText) return c.richText.map((r) => r.text).join('');
  if ('text' in c && c.text !== undefined) return c.text;
  return null;
}

export function texto(c: Celula): string | undefined {
  const v = valorCelula(c);
  if (v == null) return undefined;
  if (v instanceof Date) return dataISO(v);
  const t = String(v).trim();
  return t && !/^(-|—|n\/?a|null|undefined)$/i.test(t) ? t : undefined;
}

const iso = (y: number, m: number, d: number) => {
  const data = new Date(Date.UTC(y, m - 1, d));
  if (data.getUTCFullYear() !== y || data.getUTCMonth() !== m - 1 || data.getUTCDate() !== d)
    return undefined;
  return data.toISOString().slice(0, 10);
};

const dataISO = (d: Date) => d.toISOString().slice(0, 10);

/** Aceita Date, número de série do Excel, "dd/mm/aaaa", "dd/mm/aa", "aaaa-mm-dd". */
export function data(c: Celula): string | undefined {
  const v = valorCelula(c);
  if (v == null || v === '') return undefined;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? undefined : dataISO(v);
  if (typeof v === 'number') {
    if (v < 20000 || v > 80000) return undefined; // fora de 1954–2119: não é data
    return dataISO(new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86_400_000));
  }
  const t = String(v).trim();
  let m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) {
    const ano = Number(m[3]!.length === 2 ? `20${m[3]}` : m[3]);
    return iso(ano, Number(m[2]), Number(m[1]));
  }
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return iso(Number(m[1]), Number(m[2]), Number(m[3]));
  return undefined;
}

/** "01/01/2026 a 01/01/2027" ou "01/01/2026 - 01/01/2027" → [início, fim]. */
export function periodo(c: Celula): [string | undefined, string | undefined] {
  const t = texto(c);
  if (!t) return [undefined, undefined];
  const partes = t.split(/\s+(?:a|até|ate|-|–|à)\s+/i);
  return partes.length === 2 ? [data(partes[0]), data(partes[1])] : [undefined, data(t)];
}

/** Valor em reais: número ou texto "R$ 1.234,56" / "1234.56". */
export function dinheiro(c: Celula): number | undefined {
  const v = valorCelula(c);
  if (v == null || v === '') return undefined;
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v * 100) / 100 : undefined;
  let t = String(v).replace(/[R$\s]/g, '');
  if (!t) return undefined;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

/** Percentual: "15%", "15", 15 ou 0,15 (fração vinda de célula formatada como %). */
export function percentual(c: Celula): number | undefined {
  const v = valorCelula(c);
  if (typeof v === 'number') return v > 0 && v < 1 ? Math.round(v * 10000) / 100 : v;
  const n = dinheiro(texto(c)?.replace('%', ''));
  return n;
}

export function inteiro(c: Celula): number | undefined {
  const n = dinheiro(c);
  return n == null ? undefined : Math.round(n);
}

export const digitos = (t?: string) => (t ?? '').replace(/\D/g, '');
