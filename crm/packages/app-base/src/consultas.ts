import type { Endereco } from '@portella/core';
import { somenteDigitos } from '@portella/core';

/**
 * Consultas públicas para preencher o cadastro: endereço pelo CEP (ViaCEP, com a BrasilAPI de
 * reserva) e dados da empresa pelo CNPJ (BrasilAPI, dados públicos da Receita). Não existe consulta
 * pública de endereço por CPF. Os serviços podem ficar fora do ar: quem chama trata o null.
 */

const TEMPO_LIMITE = 8000;

async function buscarJson(url: string): Promise<unknown> {
  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), TEMPO_LIMITE);
  try {
    const resposta = await fetch(url, { signal: controle.signal, headers: { Accept: 'application/json' } });
    if (!resposta.ok) return null;
    return await resposta.json();
  } catch {
    return null;
  } finally {
    clearTimeout(relogio);
  }
}

const texto = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

export async function consultarCep(cep: string): Promise<Endereco | null> {
  const digitos = somenteDigitos(cep);
  if (digitos.length !== 8) return null;
  const via = (await buscarJson(`https://viacep.com.br/ws/${digitos}/json/`)) as Record<
    string,
    unknown
  > | null;
  if (via && !via.erro) {
    return {
      cep: digitos,
      logradouro: texto(via.logradouro),
      bairro: texto(via.bairro),
      cidade: texto(via.localidade),
      uf: texto(via.uf),
    };
  }
  const br = (await buscarJson(`https://brasilapi.com.br/api/cep/v1/${digitos}`)) as Record<
    string,
    unknown
  > | null;
  if (!br || !texto(br.city)) return null;
  return {
    cep: digitos,
    logradouro: texto(br.street),
    bairro: texto(br.neighborhood),
    cidade: texto(br.city),
    uf: texto(br.state),
  };
}

export interface DadosEmpresa {
  razaoSocial?: string;
  email?: string;
  telefone?: string;
  endereco: Endereco;
}

export async function consultarCnpj(cnpj: string): Promise<DadosEmpresa | null> {
  const digitos = somenteDigitos(cnpj);
  if (digitos.length !== 14) return null;
  const r = (await buscarJson(`https://brasilapi.com.br/api/cnpj/v1/${digitos}`)) as Record<
    string,
    unknown
  > | null;
  if (!r || !texto(r.razao_social)) return null;
  const tipo = texto(r.descricao_tipo_de_logradouro);
  const rua = texto(r.logradouro);
  const cep = r.cep == null ? undefined : somenteDigitos(String(r.cep)).padStart(8, '0');
  return {
    razaoSocial: texto(r.razao_social),
    email: texto(r.email)?.toLowerCase(),
    telefone: texto(r.ddd_telefone_1) ? somenteDigitos(String(r.ddd_telefone_1)) : undefined,
    endereco: {
      cep: cep && cep !== '00000000' ? cep : undefined,
      logradouro: rua
        ? tipo && !rua.toUpperCase().startsWith(tipo.toUpperCase())
          ? `${tipo} ${rua}`
          : rua
        : undefined,
      numero: texto(r.numero),
      complemento: texto(r.complemento),
      bairro: texto(r.bairro),
      cidade: texto(r.municipio),
      uf: texto(r.uf),
    },
  };
}
