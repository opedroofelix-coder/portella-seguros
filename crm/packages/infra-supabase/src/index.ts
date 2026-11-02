import { createClient } from '@supabase/supabase-js';

export * from './autenticacao';
export * from './erros';
export * from './repositorio';

/** Cliente do Supabase do navegador: usa só a chave publicável; o acesso é controlado pelas regras do banco. */
export function criarClienteSupabase(url: string, chavePublicavel: string, chaveSessao: string) {
  return createClient(url, chavePublicavel, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: chaveSessao },
  });
}
