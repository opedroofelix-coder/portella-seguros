import type { DocumentoRelatorio } from '@portella/app-base';
import { nomeArquivo } from '@portella/app-base';
import type { Cliente, DadosRegistro, Proposta } from '@portella/core';
import {
  formatarData,
  formatarDocumento,
  normalizar,
  ROTULO_TIPO_NEGOCIO,
  TIPOS_NEGOCIO,
} from '@portella/core';
import type { Apolice } from '../domain/apolice';
import { formatarPlaca } from '../domain/apolice';
import { nomeRamo, nomeSeguradora, RAMOS_VEICULO } from '../domain/catalogo';
import { identificarRamo, identificarSeguradora } from './importacao';

/** Linhas de parcela e de ocorrência no checklist impresso (como no modelo da Portella). */
const LINHAS_PARCELAS = 12;
const LINHAS_OCORRENCIAS = 10;

const chave = (numero?: string) => normalizar(numero ?? '').replace(/[^a-z0-9]/g, '');

/**
 * Proposta do CRM que originou a apólice: pelo nº da proposta (ou pelo nº da apólice, que muitas
 * propostas importadas usam), preferindo a do mesmo cliente.
 */
export function propostaDaApolice(a: Apolice, propostas: Proposta[]): Proposta | undefined {
  const numeros = [chave(a.numeroProposta), chave(a.numero)].filter(Boolean);
  if (!numeros.length) return undefined;
  const candidatas = propostas.filter((p) => p.numero && numeros.includes(chave(p.numero)));
  return candidatas.find((p) => p.clienteId === a.clienteId) ?? candidatas[0];
}

/** Apólice nova a partir da proposta aprovada: a equipe não precisa mais mandar a proposta por e-mail. */
export function apoliceDaProposta(p: Proposta): Partial<DadosRegistro<Apolice>> {
  return {
    clienteId: p.clienteId,
    seguradora: identificarSeguradora(p.companhia),
    ramo: identificarRamo(p.produto),
    tipo: p.tipoNegocio,
    numeroProposta: p.numero,
    placa: p.placa,
    quantidadeParcelas: p.quantidadeParcelas,
    inicioVigencia: p.data,
    responsavelId: p.responsavelId,
  };
}

/** Forma de pagamento da apólice: a lançada na proposta ou, nas apólices antigas, o texto salvo nela. */
export const formaPagamentoDaApolice = (a: Apolice, proposta?: Proposta) =>
  proposta?.formaPagamento ?? a.formaPagamento;

/** Título da seção de pagamentos: a Porto tem o acompanhamento próprio do Cartão Porto Seguro. */
export function tituloPagamentos(a: Apolice, formaPagamento?: string): string {
  const porto = a.seguradora === 'porto';
  const cartao = /cart[aã]o/i.test(formaPagamento ?? '');
  return porto && cartao
    ? 'Acompanhamento dos pagamentos · Cartão Porto Seguro'
    : 'Acompanhamento dos pagamentos';
}

const completar = <T>(linhas: T[], minimo: number, vazia: () => T): T[] =>
  linhas.length >= minimo ? linhas : [...linhas, ...Array.from({ length: minimo - linhas.length }, vazia)];

/** Checklist da apólice no modelo da Portella, pronto para o PDF (com linhas em branco para anotar). */
export function montarChecklist(
  a: Apolice,
  opcoes: { cliente?: Cliente; proposta?: Proposta; nomeDe: (id: string) => string },
): DocumentoRelatorio {
  const { cliente, proposta, nomeDe } = opcoes;
  const tipo = a.tipo ?? proposta?.tipoNegocio;
  const marcas = TIPOS_NEGOCIO.map((t) => `(${t === tipo ? 'x' : '  '}) ${ROTULO_TIPO_NEGOCIO[t]}`).join(
    '   ',
  );
  const corretor = proposta?.produtores.length
    ? proposta.produtores.map((x) => nomeDe(x.produtorId)).join(', ')
    : nomeDe(a.responsavelId);
  const forma = formaPagamentoDaApolice(a, proposta);
  const parcelas = a.quantidadeParcelas ?? proposta?.quantidadeParcelas ?? a.parcelas?.length;
  const vigencia = `${formatarData(a.inicioVigencia)} a ${a.fimVigencia ? formatarData(a.fimVigencia) : 'contínua'}`;
  const veiculo = RAMOS_VEICULO.has(a.ramo);

  const resumo: DocumentoRelatorio['resumo'] = [
    ['Corretor', corretor],
    ['Segurado', cliente?.nome ?? '—'],
    [
      cliente?.tipoPessoa === 'PJ' ? 'CNPJ' : 'CPF',
      cliente?.documento ? formatarDocumento(cliente.documento) : '—',
    ],
    ['Vigência', vigencia],
    ['Cia', nomeSeguradora(a.seguradora)],
    ['Produto', nomeRamo(a.ramo)],
    [veiculo ? 'Modelo do veículo' : 'Bem segurado', a.item ?? '—'],
    ...(veiculo
      ? ([['Placa', formatarPlaca(a.placa ?? proposta?.placa) || '—']] as Array<[string, string]>)
      : []),
    ['Proposta', a.numeroProposta ?? proposta?.numero ?? '—'],
    ['Apólice', a.numero ?? '—'],
    ['Valor total do seguro', a.premioTotal != null ? { dinheiro: a.premioTotal } : '—'],
    ['Forma de pagamento', forma ?? '—'],
    ['Quantidade de parcelas', parcelas != null ? String(parcelas) : '—'],
  ];
  if (a.cancelada)
    resumo.push([
      'Cancelada',
      `${formatarData(a.dataCancelamento)}${a.motivoCancelamento ? ` · ${a.motivoCancelamento}` : ''}`,
    ]);

  const linhasParcelas = completar(
    (a.parcelas ?? []).map((p, i) => [
      `${i + 1}ª`,
      p.valor != null ? { dinheiro: p.valor } : '',
      p.vencimento ? formatarData(p.vencimento) : '',
      p.consulta ? formatarData(p.consulta) : '',
      p.pago ? 'Pago' : '',
    ]),
    Math.max(LINHAS_PARCELAS, parcelas ?? 0),
    () => ['', '', '', '', ''],
  ).map((l, i) => (l[0] ? l : [`${i + 1}ª`, ...l.slice(1)]));

  const linhasOcorrencias = completar(
    (a.ocorrencias ?? []).map((o) => [
      formatarData(o.data),
      o.descricao,
      o.atuacao ?? '',
      o.dataComunicado ? formatarData(o.dataComunicado) : '',
      o.responsavel ?? '',
    ]),
    LINHAS_OCORRENCIAS,
    () => ['', '', '', '', ''],
  );

  return {
    titulo: `Check-list · Seguro ${nomeRamo(a.ramo)}`,
    subtitulo: marcas,
    arquivo: nomeArquivo('checklist', cliente?.nome ?? 'apolice', a.numero ?? a.numeroProposta ?? ''),
    resumo,
    secoes: [
      {
        titulo: tituloPagamentos(a, forma),
        colunas: ['Parc.', 'Valor da parcela', 'Data de vencimento', 'Data da consulta', 'Pgto.'],
        linhas: linhasParcelas,
        alturaLinha: 18,
      },
      {
        titulo: 'Ocorrências',
        colunas: ['Data', 'Descrição', 'Atuação', 'Data do comunicado', 'Responsável'],
        linhas: linhasOcorrencias,
        alturaLinha: 22,
      },
    ],
  };
}
