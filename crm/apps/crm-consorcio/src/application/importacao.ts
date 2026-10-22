import type { Importacao } from '@portella/app-base';
import type { CotaImportada, Usuario } from '@portella/core';
import {
  idImportado,
  lerArquivoImportacao,
  normalizar,
  paraCentavos,
  prepararClientes,
  resolverResponsavel,
} from '@portella/core';
import type { Cota, StatusCota, TipoBem } from '../domain/cota';
import { validarCota } from '../domain/cota';
import type { ServicosConsorcio } from './servicos';

export function identificarTipoBem(texto = ''): TipoBem {
  const n = normalizar(texto);
  if (/imov|casa|apart|terreno|imobili/.test(n)) return 'imovel';
  if (/moto/.test(n)) return 'moto';
  if (/caminh|pesad|trator|onibus|maquin/.test(n)) return 'pesados';
  if (/auto|veic|carro/.test(n)) return 'automovel';
  if (/servic/.test(n)) return 'servicos';
  return 'outros';
}

export function identificarStatus(texto = '', temContemplacao = false): StatusCota {
  const n = normalizar(texto);
  if (/contempl/.test(n)) return 'contemplada';
  if (/quit/.test(n)) return 'quitada';
  if (/cancel|desist|exclu/.test(n)) return 'cancelada';
  return temContemplacao ? 'contemplada' : 'ativa';
}

export function criarImportacao(servicos: ServicosConsorcio): Importacao {
  return {
    descricao:
      'Clientes e cotas de consórcio separados da planilha da Portella. Reimportar o mesmo arquivo atualiza os registros.',
    async analisar(dados: unknown, ator: Usuario, equipe: Usuario[]) {
      const arquivo = lerArquivoImportacao(dados, 'consorcio');
      const agora = new Date().toISOString();
      const { resolver, naoEncontrados } = resolverResponsavel(equipe, ator);
      const { clientes, idPorChave } = prepararClientes(arquivo, ator, resolver, agora);
      const avisos: string[] = [];
      const cotas: Cota[] = [];

      for (const c of (arquivo.cotas as CotaImportada[] | undefined) ?? []) {
        const status = identificarStatus(c.status, Boolean(c.dataContemplacao));
        const item: Cota = {
          id: idImportado('cota', c.chave),
          clienteId: idPorChave.get(c.clienteChave) ?? '',
          administradora: c.administradora?.trim(),
          grupo: String(c.grupo ?? '').trim(),
          cota: String(c.cota ?? '').trim(),
          tipoBem: identificarTipoBem(c.tipoBem),
          valorCredito: paraCentavos(c.valorCredito) ?? 0,
          prazoMeses: Number(c.prazoMeses),
          valorParcela: c.valorParcela == null ? undefined : (paraCentavos(c.valorParcela) ?? undefined),
          dataAdesao: c.dataAdesao,
          parcelasPagas: c.parcelasPagas,
          status,
          contemplacao:
            status === 'contemplada' && c.dataContemplacao
              ? {
                  data: c.dataContemplacao,
                  forma: /lance/i.test(c.formaContemplacao ?? '') ? 'lance' : 'sorteio',
                }
              : undefined,
          observacoes: c.observacoes,
          responsavelId: resolver(c.responsavel),
          criadoEm: agora,
          atualizadoEm: agora,
        };
        try {
          validarCota(item);
          cotas.push(item);
        } catch (e) {
          const campos = Object.values((e as { campos?: Record<string, string> }).campos ?? {}).join(' ');
          avisos.push(`Cota ${c.grupo}/${c.cota} ignorada: ${campos || (e as Error).message}`);
        }
      }
      for (const nome of naoEncontrados)
        avisos.push(`Corretor "${nome}" não cadastrado: os registros ficaram com ${ator.nome}.`);

      return {
        resumo: [
          ['Clientes', clientes.length],
          ['Cotas', cotas.length],
        ],
        avisos,
        confirmar: async () => {
          await servicos.clientes.importar(ator, clientes);
          await servicos.cotas.importar(ator, cotas);
        },
      };
    },
  };
}
