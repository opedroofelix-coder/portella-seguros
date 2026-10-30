import { ErroValidacao } from './erros';
import type { Perfil } from './perfil';
import { PERFIS } from './perfil';
import type { DataISO } from './registro';

export interface Usuario {
  id: string;
  nome: string;
  /** Nome de usuário para entrar (ex.: "gisele") ou e-mail. Sempre em minúsculas. */
  login: string;
  perfil: Perfil;
  ativo: boolean;
  criadoEm: DataISO;
  /** Senha provisória: precisa trocar no próximo acesso. */
  trocarSenha?: boolean;
  /** % de repasse sugerido quando o usuário é produtor de uma proposta (ex.: 40 = 40%). */
  percentualRepasse?: number;
  /** Produtos cujas cotações novas vão direto para este usuário (ex.: Consórcio → Gabriel). */
  produtosAtendidos?: string[];
}

/** Senha provisória de todo usuário novo ou com senha redefinida; a troca é obrigatória no 1º acesso. */
export const SENHA_PADRAO = '1234';
export const SENHA_TAMANHO_MINIMO = 6;

const LOGIN = /^[a-z0-9._@-]{3,60}$/;

export function normalizarLogin(login: string): string {
  return login.trim().toLowerCase();
}

export function loginValido(login: string): boolean {
  return LOGIN.test(normalizarLogin(login));
}

/** Sugere um login a partir do primeiro nome ("Maria José" → "maria"), evitando os já usados. */
export function sugerirLogin(nome: string, usados: Iterable<string>): string {
  const base =
    nome
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .split(/\s+/)[0]
      ?.replace(/[^a-z0-9]/g, '') || 'usuario';
  const existentes = new Set(usados);
  let login = base.length >= 3 ? base : `${base}usr`;
  for (let n = 2; existentes.has(login); n++) login = `${base}${n}`;
  return login;
}

export function validarUsuario(
  dados: Pick<Usuario, 'nome' | 'login' | 'perfil' | 'percentualRepasse'>,
): void {
  const campos: Record<string, string> = {};
  if (dados.nome.trim().length < 2) campos.nome = 'Informe o nome.';
  if (!loginValido(dados.login)) campos.login = 'Use ao menos 3 letras ou números, sem espaços.';
  if (!PERFIS.includes(dados.perfil)) campos.perfil = 'Perfil inválido.';
  if (dados.percentualRepasse != null && (dados.percentualRepasse < 0 || dados.percentualRepasse > 100)) {
    campos.percentualRepasse = 'Entre 0 e 100%.';
  }
  if (Object.keys(campos).length) throw new ErroValidacao('Confira os dados do usuário.', campos);
}

export function validarSenha(senha: string): void {
  if (senha.length < SENHA_TAMANHO_MINIMO) {
    throw new ErroValidacao(`A senha precisa ter pelo menos ${SENHA_TAMANHO_MINIMO} caracteres.`, {
      senha: `Mínimo de ${SENHA_TAMANHO_MINIMO} caracteres.`,
    });
  }
  if (senha === SENHA_PADRAO) {
    throw new ErroValidacao('Escolha uma senha diferente da senha padrão.', { senha: 'Diferente de 1234.' });
  }
}
