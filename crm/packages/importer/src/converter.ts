import type { ApoliceImportada, ArquivoImportacao, ClienteImportado, CotaImportada } from '@portella/core';
import type { Campo } from './mapeamento';
import { camposDistintos, mapearCabecalhos } from './mapeamento';
import type { Celula } from './valores';
import {
  data,
  digitos,
  dinheiro,
  inteiro,
  normalizarCabecalho,
  percentual,
  periodo,
  semAcento,
  texto,
} from './valores';

export interface Aba {
  nome: string;
  linhas: Celula[][];
}

export type TipoAba = 'seguros' | 'consorcio' | 'misto';

export interface RelatorioAba {
  nome: string;
  tipo: TipoAba;
  linhaCabecalho: number | null;
  colunas: Record<string, Campo>;
  naoReconhecidas: string[];
  linhas: number;
  seguros: number;
  consorcios: number;
  ignoradas: number;
}

export interface Resultado {
  seguros: ArquivoImportacao;
  consorcio: ArquivoImportacao;
  relatorio: { abas: RelatorioAba[]; avisos: string[] };
}

type Registro = Partial<Record<Campo, Celula>>;

const MIN_CAMPOS_CABECALHO = 3;

/** Procura, nas primeiras linhas, a que tem mais cabeçalhos reconhecidos. */
function acharCabecalho(linhas: Celula[][]): { indice: number; mapa: Map<number, Campo> } | null {
  let melhor: { indice: number; mapa: Map<number, Campo> } | null = null;
  linhas.slice(0, 20).forEach((linha, indice) => {
    const mapa = mapearCabecalhos(linha.map((c) => texto(c) ?? ''));
    const n = camposDistintos(mapa);
    if (n >= MIN_CAMPOS_CABECALHO && (!melhor || n > camposDistintos(melhor.mapa))) melhor = { indice, mapa };
  });
  return melhor;
}

export function tipoDaAba(nome: string): TipoAba {
  const n = semAcento(nome).toLowerCase();
  if (/consor/.test(n)) return 'consorcio';
  if (/segur|apolice|auto|vida|resid|renova/.test(n)) return 'seguros';
  return 'misto';
}

function ehConsorcio(r: Registro): boolean {
  const produto = semAcento(`${texto(r.ramo) ?? ''} ${texto(r.seguradora) ?? ''}`).toLowerCase();
  if (/consor/.test(produto)) return true;
  if (texto(r.grupo) && texto(r.cota)) return true;
  return (
    texto(r.administradora) != null &&
    texto(r.seguradora) == null &&
    !data(r.fimVigencia) &&
    !texto(r.vigencia)
  );
}

function chaveCliente(r: Registro): string | null {
  const nome = texto(r.nome);
  if (!nome) return null;
  const doc = digitos(texto(r.documento));
  if (doc.length === 11 || doc.length === 14) return doc;
  return `n:${normalizarCabecalho(nome)}|${digitos(texto(r.telefone))}`;
}

function cliente(r: Registro, chave: string): ClienteImportado {
  const doc = digitos(texto(r.documento));
  const endereco = {
    cep: texto(r.cep),
    logradouro: texto(r.logradouro),
    numero: texto(r.numeroEndereco),
    bairro: texto(r.bairro),
    cidade: texto(r.cidade),
    uf: texto(r.uf)?.slice(0, 2).toUpperCase(),
  };
  return limpar({
    chave,
    nome: texto(r.nome)!,
    tipoPessoa: doc.length === 14 ? 'PJ' : 'PF',
    documento: doc.length === 11 || doc.length === 14 ? doc : undefined,
    telefone: digitos(texto(r.telefone)) || undefined,
    email: texto(r.email)?.toLowerCase(),
    dataNascimento: data(r.dataNascimento),
    endereco: Object.values(endereco).some(Boolean) ? limpar(endereco) : undefined,
    responsavel: texto(r.responsavel),
  });
}

/** Junta dados do mesmo cliente que aparece em várias linhas (o primeiro valor preenchido vence). */
function mesclar(a: ClienteImportado, b: ClienteImportado): ClienteImportado {
  const resultado = { ...b, ...limpar(a) };
  if (a.endereco || b.endereco) resultado.endereco = { ...b.endereco, ...limpar(a.endereco ?? {}) };
  return resultado;
}

function limpar<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== '')) as T;
}

function apolice(
  r: Registro,
  clienteChave: string,
  aviso: (m: string) => void,
  onde: string,
): ApoliceImportada | null {
  let [inicio, fim] = [data(r.inicioVigencia), data(r.fimVigencia)];
  if ((!inicio || !fim) && r.vigencia != null) {
    const [i, f] = periodo(r.vigencia);
    inicio ??= i;
    fim ??= f;
  }
  // Sem início informado, assume vigência anual terminando no fim.
  if (!inicio && fim) inicio = `${Number(fim.slice(0, 4)) - 1}${fim.slice(4)}`;
  const seguradora = texto(r.seguradora);
  if (!fim || !seguradora) {
    aviso(
      `${onde}: apólice sem ${!seguradora ? 'seguradora' : 'fim de vigência'}; só o cliente foi importado.`,
    );
    return null;
  }
  const numero = texto(r.numeroApolice);
  return limpar({
    chave: numero
      ? `${normalizarCabecalho(seguradora)}|${numero}`
      : `${clienteChave}|${normalizarCabecalho(texto(r.ramo) ?? '')}|${fim}`,
    clienteChave,
    seguradora,
    ramo: texto(r.ramo) ?? 'Outros',
    numero,
    item: texto(r.item),
    inicioVigencia: inicio!,
    fimVigencia: fim,
    premioLiquido: dinheiro(r.premioLiquido),
    premioTotal: dinheiro(r.premioTotal),
    comissaoPercentual: percentual(r.comissao),
    formaPagamento: texto(r.formaPagamento),
    observacoes: texto(r.observacoes),
    responsavel: texto(r.responsavel),
  });
}

function cota(
  r: Registro,
  clienteChave: string,
  aviso: (m: string) => void,
  onde: string,
): CotaImportada | null {
  // Coluna única "Seguradora / Administradora" chega como seguradora.
  const [administradora, grupo, numeroCota] = [
    texto(r.administradora) ?? texto(r.seguradora),
    texto(r.grupo),
    texto(r.cota),
  ];
  const valorCredito = dinheiro(r.valorCredito);
  const prazoMeses = inteiro(r.prazoMeses);
  const dataAdesao = data(r.dataAdesao);
  const faltando = [
    !administradora && 'administradora',
    !grupo && 'grupo',
    !numeroCota && 'cota',
    !valorCredito && 'crédito',
    !prazoMeses && 'prazo',
    !dataAdesao && 'data de adesão',
  ].filter(Boolean);
  if (faltando.length) {
    aviso(`${onde}: cota sem ${faltando.join(', ')}; só o cliente foi importado.`);
    return null;
  }
  return limpar({
    chave: `${normalizarCabecalho(administradora!)}|${grupo}|${numeroCota}`,
    clienteChave,
    administradora: administradora!,
    grupo: grupo!,
    cota: numeroCota!,
    tipoBem: texto(r.tipoBem) ?? texto(r.ramo),
    valorCredito: valorCredito!,
    prazoMeses: prazoMeses!,
    valorParcela: dinheiro(r.valorParcela),
    dataAdesao: dataAdesao!,
    parcelasPagas: inteiro(r.parcelasPagas),
    status: texto(r.status),
    dataContemplacao: data(r.dataContemplacao),
    formaContemplacao: texto(r.formaContemplacao),
    observacoes: texto(r.observacoes),
    responsavel: texto(r.responsavel),
  });
}

/** Converte as abas da planilha nos dois arquivos de importação (seguros e consórcio). */
export function converter(abas: Aba[], origem: string, agora = new Date()): Resultado {
  const avisos: string[] = [];
  const relatorio: RelatorioAba[] = [];
  const clientes = {
    seguros: new Map<string, ClienteImportado>(),
    consorcio: new Map<string, ClienteImportado>(),
  };
  const apolices = new Map<string, ApoliceImportada>();
  const cotas = new Map<string, CotaImportada>();

  for (const aba of abas) {
    const tipo = tipoDaAba(aba.nome);
    const cabecalho = acharCabecalho(aba.linhas);
    const rel: RelatorioAba = {
      nome: aba.nome,
      tipo,
      linhaCabecalho: null,
      colunas: {},
      naoReconhecidas: [],
      linhas: 0,
      seguros: 0,
      consorcios: 0,
      ignoradas: 0,
    };
    relatorio.push(rel);
    if (!cabecalho) {
      avisos.push(`Aba "${aba.nome}": cabeçalho não reconhecido; aba ignorada.`);
      continue;
    }
    rel.linhaCabecalho = cabecalho.indice + 1;
    const titulos = aba.linhas[cabecalho.indice]!.map((c) => texto(c) ?? '');
    titulos.forEach((t, i) => {
      const campo = cabecalho.mapa.get(i);
      if (campo) rel.colunas[t] = campo;
      else if (t) rel.naoReconhecidas.push(t);
    });

    aba.linhas.slice(cabecalho.indice + 1).forEach((linha, i) => {
      const onde = `Aba "${aba.nome}", linha ${cabecalho.indice + i + 2}`;
      const r: Registro = {};
      for (const [col, campo] of cabecalho.mapa) if (texto(r[campo]) === undefined) r[campo] = linha[col];
      if (!linha.some((c) => texto(c))) return; // linha vazia
      rel.linhas++;
      const chave = chaveCliente(r);
      if (!chave) {
        rel.ignoradas++;
        avisos.push(`${onde}: sem nome do cliente; linha ignorada.`);
        return;
      }
      const consorcio = tipo === 'consorcio' || (tipo === 'misto' && ehConsorcio(r));
      const destino = consorcio ? clientes.consorcio : clientes.seguros;
      const novo = cliente(r, chave);
      destino.set(chave, destino.has(chave) ? mesclar(destino.get(chave)!, novo) : novo);
      const aviso = (m: string) => avisos.push(m);
      if (consorcio) {
        const c = cota(r, chave, aviso, onde);
        if (c) cotas.set(c.chave, c);
        rel.consorcios++;
      } else {
        const a = apolice(r, chave, aviso, onde);
        if (a) apolices.set(a.chave, a);
        rel.seguros++;
      }
    });
  }

  const base = { versao: 1 as const, origem, geradoEm: agora.toISOString() };
  return {
    seguros: {
      ...base,
      sistema: 'seguros',
      clientes: [...clientes.seguros.values()],
      apolices: [...apolices.values()],
    },
    consorcio: {
      ...base,
      sistema: 'consorcio',
      clientes: [...clientes.consorcio.values()],
      cotas: [...cotas.values()],
    },
    relatorio: { abas: relatorio, avisos },
  };
}
