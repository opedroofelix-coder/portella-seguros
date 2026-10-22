import { ErroDominio, ErroValidacao } from '@portella/core';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

export function mensagemErro(erro: unknown): string {
  if (erro instanceof ErroDominio) return erro.message;
  console.error(erro);
  return 'Algo deu errado. Tente novamente.';
}

/** Leva os erros de validação do domínio para os campos do formulário. */
export function aplicarErros<F extends FieldValues>(erro: unknown, setError: UseFormSetError<F>): void {
  if (erro instanceof ErroValidacao) {
    for (const [campo, mensagem] of Object.entries(erro.campos))
      setError(campo as Path<F>, { message: mensagem });
  }
}

/** Converte strings vazias de formulário em undefined (campos opcionais). */
export function limparVazios<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, typeof v === 'string' && !v.trim() ? undefined : v]),
  ) as T;
}
