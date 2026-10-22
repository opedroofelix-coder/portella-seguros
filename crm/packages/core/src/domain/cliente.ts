import { cnpjValido, cpfValido, somenteDigitos, telefoneValido } from './documento';
import { ErroValidacao } from './erros';
import type { DataISO, Registro } from './registro';
import { emailValido } from './usuario';

export type TipoPessoa = 'PF' | 'PJ';

export interface Endereco {
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
}

export interface Cliente extends Registro {
  nome: string;
  tipoPessoa: TipoPessoa;
  documento?: string;
  email?: string;
  telefone?: string;
  dataNascimento?: DataISO;
  endereco?: Endereco;
  observacoes?: string;
}

export function validarCliente(c: Pick<Cliente, 'nome' | 'tipoPessoa' | 'documento' | 'email' | 'telefone'>): void {
  const campos: Record<string, string> = {};
  if (c.nome.trim().length < 2) campos.nome = 'Informe o nome.';
  if (c.documento && somenteDigitos(c.documento)) {
    const ok = c.tipoPessoa === 'PF' ? cpfValido(c.documento) : cnpjValido(c.documento);
    if (!ok) campos.documento = c.tipoPessoa === 'PF' ? 'CPF inválido.' : 'CNPJ inválido.';
  }
  if (c.email && !emailValido(c.email)) campos.email = 'E-mail inválido.';
  if (c.telefone && !telefoneValido(c.telefone)) campos.telefone = 'Telefone inválido.';
  if (Object.keys(campos).length) throw new ErroValidacao('Confira os dados do cliente.', campos);
}

/** Texto normalizado para busca (sem acentos, minúsculo), incluindo documento e telefone só com dígitos. */
export function textoBusca(...partes: Array<string | undefined>): string {
  return partes
    .filter(Boolean)
    .map((p) => normalizar(p as string) + ' ' + somenteDigitos(p as string))
    .join(' ');
}

export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function corresponde(busca: string, ...partes: Array<string | undefined>): boolean {
  const termo = normalizar(busca);
  if (!termo) return true;
  const alvo = textoBusca(...partes);
  return termo.split(/\s+/).every((t) => alvo.includes(t));
}
