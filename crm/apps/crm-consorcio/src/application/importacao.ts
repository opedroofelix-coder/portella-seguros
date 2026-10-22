import type { Importacao } from '@portella/app-base';
import type { ComissaoImportada, CotaImportada, Usuario } from '@portella/core';
import {
  idImportado,
  lerArquivoImportacao,
  normalizar,
  paraCentavos,
  prepararClientes,
  prepararComissoes,
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
      'Clientes, cotas e comissões de consórcio separados da planilha da Portella. Reimportar o mesmo arquivo atualiza os registros.',
    async analisar(dados: unknown, ator: Usuario, equipe: Usuario[]) {
      const arquivo = lerArquivoImportacao(dados, 'consorcio');
      const agora = new Date().toISOString();
      const { resolver, naoEncontrados } = resolverResponsavel(equipe, ator);
      const { clientes, idPorChave } = prepararClientes(arquivo, ator, resolver, agora);
      const avisos: string[] = [];
      const cotas: Cota[] = [];
      const idCota = new Map<string, string>();

      for (const c of (arquivo.cotas as CotaImportada[] | undefined) ?? []) {
        const status = identificarStatus(c.status, Boolean(c.dataContemplacao));
        const item: Cota = {
          id: idImportado('cota', c.chave),
          clienteId: idPorChave.get(c.clienteChave) ?? '',
          administradora: c.administradora?.trim(),
          numeroProposta: c.numeroProposta,
          grupo: c.grupo == null ? undefined : String(c.grupo).trim() || undefined,
          cota: c.cota == null ? undefined : String(c.cota).trim() || undefined,
          tipoBem: identificarTipoBem(c.tipoBem),
          valorCredito: paraCentavos(c.valorCredito) ?? 0,
          prazoMeses: c.prazoMeses ? Number(c.prazoMeses) : undefined,
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
          idCota.set(c.chave, item.id);
        } catch (e) {
          const campos = Object.values((e as { campos?: Record<string, string> }).campos ?? {}).join(' ');
          avisos.push(`Cota ${c.grupo ?? c.numeroProposta ?? c.chave}${c.cota ? `/${c.cota}` : ''} ignorada: ${campos || (e as Error).message}`);
        }
      }
      const comissoes = prepararComissoes(
        (arquivo.comissoes as ComissaoImportada[] | undefined) ?? [],
        ator,
        resolver,
        idPorChave,
        idCota,
        agora,
      );
      const pendentes = cotas.filter((c) => !c.grupo || !c.cota || !c.prazoMeses).length;
      if (pendentes) avisos.push(`${pendentes} cota(s) sem grupo, cota ou prazo: complete o cadastro na tela de cotas.`);
      for (const nome of naoEncontrados)
        avisos.push(`Corretor "${nome}" não cadastrado: os registros ficaram com ${ator.nome}.`);

      return {
        resumo: [
          ['Clientes', clientes.length],
          ['Cotas', cotas.length],
          ['Comissões', comissoes.length],
        ],
        avisos,
        confirmar: async () => {
          await servicos.clientes.importar(ator, clientes);
          await servicos.cotas.importar(ator, cotas);
          await servicos.comissoes.importar(ator, comissoes);
        },
      };
    },
  };
}
