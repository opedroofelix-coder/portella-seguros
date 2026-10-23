/** Validação e formatação de CPF, CNPJ, CEP e telefone brasileiros. */

export const somenteDigitos = (valor: string): string => valor.replace(/\D/g, '');

function digitoVerificador(numeros: number[], pesos: number[]): number {
  const soma = numeros.reduce((acc, n, i) => acc + n * (pesos[i] ?? 0), 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function cpfValido(valor: string): boolean {
  const d = somenteDigitos(valor);
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  const n = [...d].map(Number);
  const d1 = digitoVerificador(n.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = digitoVerificador(n.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d1 === n[9] && d2 === n[10];
}

export function cnpjValido(valor: string): boolean {
  const d = somenteDigitos(valor);
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const n = [...d].map(Number);
  const d1 = digitoVerificador(n.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = digitoVerificador(n.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d1 === n[12] && d2 === n[13];
}

export function formatarCpf(valor: string): string {
  const d = somenteDigitos(valor);
  return d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : valor;
}

export function formatarCnpj(valor: string): string {
  const d = somenteDigitos(valor);
  return d.length === 14 ? d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : valor;
}

export function formatarDocumento(valor: string): string {
  const d = somenteDigitos(valor);
  if (d.length === 11) return formatarCpf(d);
  if (d.length === 14) return formatarCnpj(d);
  return valor;
}

export function telefoneValido(valor: string): boolean {
  const d = somenteDigitos(valor);
  return d.length === 10 || d.length === 11;
}

export function formatarTelefone(valor: string): string {
  const d = somenteDigitos(valor);
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return valor;
}

/** Link do WhatsApp para o número (assume DDI 55 quando não informado). */
export function linkWhatsApp(telefone: string): string | null {
  const d = somenteDigitos(telefone);
  if (d.length < 10) return null;
  return `https://wa.me/${d.length <= 11 ? `55${d}` : d}`;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailValido(email: string): boolean {
  return EMAIL.test(email.trim());
}

/** Máscaras aplicadas enquanto se digita (aceitam o número incompleto). */
export function mascararDocumento(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
  }
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})$/, '$1.$2.$3/$4-$5').replace(/-$/, '');
}

export function mascararTelefone(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  const meio = d.length === 11 ? 7 : 6;
  return `(${d.slice(0, 2)}) ${d.slice(2, meio)}-${d.slice(meio)}`;
}

export function mascararCep(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}
