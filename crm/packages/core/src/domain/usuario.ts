import { ErroValidacao } from './erros';
import type { Perfil } from './perfil';
import { PERFIS } from './perfil';
import type { DataISO } from './registro';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  ativo: boolean;
  criadoEm: DataISO;
}

export const SENHA_TAMANHO_MINIMO = 8;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function emailValido(email: string): boolean {
  return EMAIL.test(email.trim());
}

export function validarUsuario(dados: Pick<Usuario, 'nome' | 'email' | 'perfil'>): void {
  const campos: Record<string, string> = {};
  if (dados.nome.trim().length < 2) campos.nome = 'Informe o nome.';
  if (!emailValido(dados.email)) campos.email = 'E-mail inválido.';
  if (!PERFIS.includes(dados.perfil)) campos.perfil = 'Perfil inválido.';
  if (Object.keys(campos).length) throw new ErroValidacao('Confira os dados do usuário.', campos);
}

export function validarSenha(senha: string): void {
  if (senha.length < SENHA_TAMANHO_MINIMO) {
    throw new ErroValidacao(`A senha precisa ter pelo menos ${SENHA_TAMANHO_MINIMO} caracteres.`, {
      senha: `Mínimo de ${SENHA_TAMANHO_MINIMO} caracteres.`,
    });
  }
}
