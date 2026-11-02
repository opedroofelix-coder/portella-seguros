import { ErroDominio, ErroPermissao, ErroValidacao } from '@portella/core';

interface ErroPostgrest {
  code?: string;
  message?: string;
}

/**
 * Traduz o erro do Supabase para os erros do CRM. As regras do banco (RLS e gatilhos) respondem com
 * o código 42501; os gatilhos já trazem a mensagem em português para mostrar na tela.
 */
export function traduzirErro(erro: ErroPostgrest | null | undefined): Error {
  if (!erro) return new Error('Erro desconhecido.');
  if (erro instanceof ErroDominio) return erro;
  const mensagem = erro.message ?? '';
  if (erro.code === '42501') {
    const doGatilho = mensagem && !/row-level security|permission denied/i.test(mensagem);
    return new ErroPermissao(doGatilho ? mensagem : undefined);
  }
  if (erro.code === '23505') return new ErroPermissao('Este registro já existe e você não pode alterá-lo.');
  if (erro.code === '23514' || erro.code === '22P02') return new ErroValidacao('Dados inválidos.');
  if (/fetch|network|Failed to fetch|NetworkError/i.test(mensagem))
    return new Error('Sem conexão com o servidor. Verifique a internet e tente de novo.');
  return new Error(mensagem || 'Não foi possível falar com o servidor.');
}
